/*
 * SPDX-License-Identifier: Apache-2.0
 */

package org.hyperledger.fabric.samples.assettransfer;

import java.util.ArrayList;
import java.util.List;

import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.contract.ContractInterface;
import org.hyperledger.fabric.contract.annotation.Contact;
import org.hyperledger.fabric.contract.annotation.Contract;
import org.hyperledger.fabric.contract.annotation.Default;
import org.hyperledger.fabric.contract.annotation.Info;
import org.hyperledger.fabric.contract.annotation.License;
import org.hyperledger.fabric.contract.annotation.Transaction;
import org.hyperledger.fabric.shim.ChaincodeException;
import org.hyperledger.fabric.shim.ChaincodeStub;
import org.hyperledger.fabric.shim.ledger.KeyValue;
import org.hyperledger.fabric.shim.ledger.QueryResultsIterator;
import org.hyperledger.fabric.shim.ledger.KeyModification;

import com.owlike.genson.Genson;
import org.json.JSONArray;
import org.json.JSONObject;

@Contract(
        name = "pharmacc",
        info = @Info(
                title = "Pharma Transition Ledger",
                description = "Records manufacturer-distributor-shopkeeper-customer transitions for medicine units",
                version = "0.0.1-SNAPSHOT",
                license = @License(
                        name = "Apache 2.0 License",
                        url = "http://www.apache.org/licenses/LICENSE-2.0.html"),
                contact = @Contact(
                        email = "team@example.com",
                        name = "Pharma Hackathon Team",
                        url = "https://example.com")))
@Default
public final class PharmaContract implements ContractInterface {

    private final Genson genson = new Genson();

    private static String normalizeEventType(final String eventType) {
        if (eventType == null) {
            return null;
        }
        String normalized = eventType.trim().toUpperCase();
        if ("MFG".equals(normalized)) {
            return "MINTED";
        }
        if ("SALE".equals(normalized)) {
            return "SOLD";
        }
        return normalized;
    }

    private static String extractBatchId(final String batchState) {
        if (batchState == null || batchState.isEmpty()) {
            return "";
        }
        if (batchState.trim().startsWith("{")) {
            try {
                JSONObject obj = new JSONObject(batchState);
                return obj.optString("batchId", "");
            } catch (Exception e) {
                return batchState;
            }
        }
        return batchState;
    }

    private enum PharmaContractErrors {
        TRANSITION_NOT_FOUND,
        TRANSITION_ALREADY_EXISTS,
        INVALID_GENESIS,
        ALREADY_SOLD,
        BATCH_RECALLED,
        INVALID_TRANSITION,
        CUSTODY_CHAIN_VIOLATION,
        UNAUTHORIZED_SELLER
    }

    /**
     * Records a new transition on the ledger, keyed by event key and updating current state.
     *
     * @param ctx the transaction context
     * @param packId the unique packHash for this unit
     * @param eventType the type of event (MINTED | INTAKE | AT_SHOP | SOLD | RECALLED)
     * @param fromId the ID of the party transferring (e.g. shop ID)
     * @param toId the ID of the party receiving (e.g. customer/buyer ID)
     * @param sellingDate the date of sale, format ddmmyyyy
     * @param sellingTime the time of sale, format hh:mm:ss
     * @param sellerId the ID of the seller recording this transition
     * @return the created Transition
     */
    /**
     * Records a single transition with rich seller details, CDSCO license, GPS location, and timestamp.
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public Transition recordTransitionDetailed(final Context ctx, final String packId, final String eventType, final String fromId,
            final String toId, final String sellingDate, final String sellingTime, final String sellerId,
            final String shopName, final String licenseNumber, final String location, final String latitude,
            final String longitude, final String timestamp) {

        String normalizedEventType = normalizeEventType(eventType);

        String eventKey = packId + ":" + normalizedEventType;
        String currentKey = packId + ":CURRENT";
        // Check if parent batch has been recalled
        String batchState = ctx.getStub().getStringState(packId + ":BATCH");
        String batchId = extractBatchId(batchState);

        if (batchId != null && !batchId.isEmpty()) {
            String recallState = ctx.getStub().getStringState(batchId + ":RECALLED");
            if (recallState == null || recallState.isEmpty()) {
                recallState = ctx.getStub().getStringState(batchId + ":RECALL");
            }
            if (recallState != null && !recallState.isEmpty()) {
                throw new ChaincodeException("Pack belongs to a recalled batch", PharmaContractErrors.BATCH_RECALLED.toString());
            }
        }

        // Custody Chain Validation
        String currentJson = ctx.getStub().getStringState(currentKey);
        if (currentJson == null || currentJson.isEmpty()) {
            if (!"MINTED".equalsIgnoreCase(normalizedEventType)) {
                throw new ChaincodeException("A pack must originate with a MINTED event. Cannot start at " + normalizedEventType,
                        PharmaContractErrors.INVALID_GENESIS.toString());
            }
        } else {
            Transition current = genson.deserialize(currentJson, Transition.class);

            if ("SOLD".equalsIgnoreCase(current.getEventType())) {
                throw new ChaincodeException("Pack has already been SOLD. Double-spending / clone detected.",
                        PharmaContractErrors.ALREADY_SOLD.toString());
            }
            if ("RECALLED".equalsIgnoreCase(current.getEventType())) {
                throw new ChaincodeException("Pack belongs to a RECALLED batch.", PharmaContractErrors.BATCH_RECALLED.toString());
            }

            if ("INTAKE".equalsIgnoreCase(normalizedEventType) || "AT_SHOP".equalsIgnoreCase(normalizedEventType)) {
                if (!"MINTED".equalsIgnoreCase(current.getEventType()) && !"IN_TRANSIT".equalsIgnoreCase(current.getEventType())) {
                    throw new ChaincodeException("Cannot INTAKE pack from state " + current.getEventType(),
                            PharmaContractErrors.INVALID_TRANSITION.toString());
                }
            } else if ("SOLD".equalsIgnoreCase(normalizedEventType)) {
                if (!"AT_SHOP".equalsIgnoreCase(current.getEventType()) && !"INTAKE".equalsIgnoreCase(current.getEventType())) {
                    throw new ChaincodeException("Front-running violation: Cannot sell pack before official INTAKE by shop.",
                            PharmaContractErrors.CUSTODY_CHAIN_VIOLATION.toString());
                }
                if (!current.getToId().equalsIgnoreCase(fromId)) {
                    throw new ChaincodeException("Shop " + fromId + " does not own pack. Registered owner: " + current.getToId(),
                            PharmaContractErrors.UNAUTHORIZED_SELLER.toString());
                }
            }
        }

        Transition transition = new Transition(
                packId,
                batchId != null ? batchId : "",
                normalizedEventType,
                normalizedEventType,
                eventKey,
                fromId,
                toId,
                sellingDate,
                sellingTime,
                sellerId,
                shopName != null ? shopName : "",
                licenseNumber != null ? licenseNumber : "",
                location != null ? location : "",
                latitude != null ? latitude : "",
                longitude != null ? longitude : "",
                timestamp != null ? timestamp : ""
        );
        String sortedJson = genson.serialize(transition);
        ctx.getStub().putStringState(eventKey, sortedJson);
        ctx.getStub().putStringState(currentKey, sortedJson);

        return transition;
    }

    /**
     * Records a single transition (backwards compatible).
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public Transition recordTransition(final Context ctx, final String packId, final String eventType, final String fromId,
            final String toId, final String sellingDate, final String sellingTime, final String sellerId) {
        return recordTransitionDetailed(ctx, packId, eventType, fromId, toId, sellingDate, sellingTime, sellerId, "", "", "", "", "", "");
    }

    /**
     * Records multiple transitions in bulk with soft idempotency and batch mappings.
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String recordTransitionsBatch(final Context ctx, final String batchId, final String transitionsJson) {
        JSONArray jsonArray = new JSONArray(transitionsJson);
        List<String> recorded = new ArrayList<>();
        List<String> failures = new ArrayList<>();
        int total = jsonArray.length();

        for (int i = 0; i < total; i++) {
            JSONObject item = jsonArray.getJSONObject(i);
            String packId = item.optString("packId", "");
            String eventType = normalizeEventType(item.optString("eventType", "MINTED"));
            try {
                String eventKey = packId + ":" + eventType;
                String currentKey = packId + ":CURRENT";
                String batchKey = packId + ":BATCH";

                // Save mapping to batch as valid JSON document for CouchDB
                JSONObject batchDoc = new JSONObject();
                batchDoc.put("docType", "batch_mapping");
                batchDoc.put("packId", packId);
                batchDoc.put("batchId", batchId == null ? "" : batchId);
                batchDoc.put("status", eventType);
                ctx.getStub().putStringState(batchKey, batchDoc.toString());

                // Check idempotency
                String existing = ctx.getStub().getStringState(eventKey);
                if (existing != null && !existing.isEmpty()) {
                    recorded.add(packId);
                    continue;
                }

                Transition t = new Transition(
                    packId,
                    batchId == null ? "" : batchId,
                    eventType,
                    eventType, // status
                    eventKey,
                    item.optString("fromId", "GENESIS"),
                    item.optString("toId", ""),
                    item.optString("sellingDate", ""),
                    item.optString("sellingTime", ""),
                    item.optString("sellerId", ""),
                    item.optString("shopName", ""),
                    item.optString("licenseNumber", ""),
                    item.optString("location", ""),
                    item.optString("latitude", ""),
                    item.optString("longitude", ""),
                    item.optString("timestamp", "")
                );
                String tJson = genson.serialize(t);
                ctx.getStub().putStringState(eventKey, tJson);
                ctx.getStub().putStringState(currentKey, tJson);
                recorded.add(packId);
            } catch (Exception e) {
                failures.add(packId + ": " + e.getMessage());
            }
        }

        StringBuilder result = new StringBuilder();
        result.append("{\"status\":\"").append(failures.isEmpty() ? "success" : "partial").append("\",")
              .append("\"totalProcessed\":").append(total).append(",")
              .append("\"committedCount\":").append(recorded.size()).append(",")
              .append("\"failedCount\":").append(failures.size()).append(",")
              .append("\"recordedHashes\":").append(new JSONArray(recorded).toString()).append("}");
        return result.toString();
    }

    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String recordTransitionBatch(final Context ctx, final String batchId, final String transitionsJson) {
        return recordTransitionsBatch(ctx, batchId, transitionsJson);
    }

    /**
     * Issues a recall on an entire batch.
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String recallBatch(final Context ctx, final String systemBatchId, final String actorId,
            final String reason, final String recallDate, final String recallTime) {
        String key1 = systemBatchId + ":RECALLED";
        String key2 = systemBatchId + ":RECALL";

        Transition recallTransition = new Transition(
                systemBatchId,
                systemBatchId,
                "RECALLED",
                "RECALLED",
                key1,
                actorId,
                "RECALLED",
                recallDate,
                recallTime,
                reason
        );
        String json = genson.serialize(recallTransition);

        ctx.getStub().putStringState(key1, json);
        ctx.getStub().putStringState(key2, json);

        return json;
    }

    /**
     * Evaluates live status for a pack.
     */
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String getPackStatus(final Context ctx, final String packHash, final String batchId) {
        // Priority 1: Batch Recall
        String recallState = ctx.getStub().getStringState(batchId + ":RECALLED");
        if (recallState == null || recallState.isEmpty()) {
            recallState = ctx.getStub().getStringState(batchId + ":RECALL");
        }
        if (recallState != null && !recallState.isEmpty()) {
            return "{\"status\":\"Recalled\",\"detail\":" + recallState + "}";
        }

        // Priority 2: Pack Current State
        String currentKey = packHash + ":CURRENT";
        String currentJson = ctx.getStub().getStringState(currentKey);
        if (currentJson != null && !currentJson.isEmpty()) {
            Transition t = genson.deserialize(currentJson, Transition.class);
            String status = "UNKNOWN";
            if ("INTAKE".equalsIgnoreCase(t.getEventType()) || "AT_SHOP".equalsIgnoreCase(t.getEventType())) {
                status = "AtShop";
            } else if ("SOLD".equalsIgnoreCase(t.getEventType()) || "SALE".equalsIgnoreCase(t.getEventType())) {
                status = "Sold";
            } else if ("RECALLED".equalsIgnoreCase(t.getEventType())) {
                status = "Recalled";
            } else if ("MINTED".equalsIgnoreCase(t.getEventType())) {
                status = "Minted";
            }
            return "{\"status\":\"" + status + "\",\"detail\":" + currentJson + "}";
        }

        return "{\"status\":\"NOT_FOUND\"}";
    }

    /**
     * Retrieves the current state pointer for a pack.
     */
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public Transition getPackCurrentState(final Context ctx, final String packHash) {
        String currentKey = packHash + ":CURRENT";
        String json = ctx.getStub().getStringState(currentKey);
        if (json == null || json.isEmpty()) {
            throw new ChaincodeException(String.format("Transition current state for %s does not exist", packHash),
                    PharmaContractErrors.TRANSITION_NOT_FOUND.toString());
        }
        return genson.deserialize(json, Transition.class);
    }

    /**
     * Retrieves chronological lifecycle history for a pack.
     */
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String getPackHistory(final Context ctx, final String packHash) {
        String currentKey = packHash + ":CURRENT";
        QueryResultsIterator<KeyModification> results = ctx.getStub().getHistoryForKey(currentKey);
        List<Transition> history = new ArrayList<>();
        for (KeyModification result : results) {
            if (!result.isDeleted()) {
                Transition transition = genson.deserialize(result.getStringValue(), Transition.class);
                history.add(transition);
            }
        }
        return genson.serialize(history);
    }

    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public Transition getTransitionByHash(final Context ctx, final String hash) {
        String transitionJSON = ctx.getStub().getStringState(hash);

        if (transitionJSON == null || transitionJSON.isEmpty()) {
            String errorMessage = String.format("Transition with hash %s does not exist", hash);
            System.out.println(errorMessage);
            throw new ChaincodeException(errorMessage, PharmaContractErrors.TRANSITION_NOT_FOUND.toString());
        }

        return genson.deserialize(transitionJSON, Transition.class);
    }

    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public boolean TransitionExists(final Context ctx, final String hash) {
        String transitionJSON = ctx.getStub().getStringState(hash);

        return (transitionJSON != null && !transitionJSON.isEmpty());
    }

    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String queryTransition(final Context ctx, final String fromId, final String toId, final String hash) {
        ChaincodeStub stub = ctx.getStub();

        StringBuilder selector = new StringBuilder("{\"selector\":{\"docType\":\"transition\"");
        if (fromId != null && !fromId.isEmpty()) {
            selector.append(",\"fromId\":\"").append(fromId).append("\"");
        }
        if (toId != null && !toId.isEmpty()) {
            selector.append(",\"toId\":\"").append(toId).append("\"");
        }
        if (hash != null && !hash.isEmpty()) {
            selector.append(",\"hash\":\"").append(hash).append("\"");
        }
        selector.append("}}");

        List<Transition> queryResults = new ArrayList<>();
        QueryResultsIterator<KeyValue> results = stub.getQueryResult(selector.toString());

        for (KeyValue result : results) {
            Transition transition = genson.deserialize(result.getStringValue(), Transition.class);
            queryResults.add(transition);
        }

        return genson.serialize(queryResults);
    }

    // ── V2.1 Nibble Bitmap Constants ─────────────────────────────────────────────
    // Each pack occupies 4 bits (1 nibble). 2 packs share one byte.
    // Layout: byte[N/2] → bits[3:0] = pack(2k), bits[7:4] = pack(2k+1)
    private static final int STATE_CREATED = 0x0; // 0000 — manufactured, not yet confirmed minted
    private static final int STATE_MINTED  = 0x1; // 0001 — batch signed & initialized
    private static final int STATE_AT_SHOP = 0x2; // 0010 — registered in verified pharmacy
    private static final int STATE_SOLD    = 0x3; // 0011 — dispensed to legitimate patient
    private static final int STATE_REVOKED = 0x4; // 0100 — recalled / flagged dangerous

    private static final String[] STATE_NAMES = {
        "CREATED", "MINTED", "AT_SHOP", "SOLD", "REVOKED"
    };

    /**
     * Reads the 4-bit nibble for a given pack index from the nibble map buffer.
     * Pack 2k → bits[3:0] of byte[k]; Pack 2k+1 → bits[7:4] of byte[k].
     */
    private static int getNibble(final byte[] buf, final int packIndex) {
        int byteIndex = packIndex / 2;
        if ((packIndex % 2) == 0) {
            return buf[byteIndex] & 0x0F; // low nibble
        } else {
            return (buf[byteIndex] >> 4) & 0x0F; // high nibble
        }
    }

    /**
     * Writes a 4-bit nibble state for a given pack index into the nibble map buffer.
     */
    private static void setNibble(final byte[] buf, final int packIndex, final int state) {
        int byteIndex = packIndex / 2;
        if ((packIndex % 2) == 0) {
            buf[byteIndex] = (byte) ((buf[byteIndex] & 0xF0) | (state & 0x0F)); // low nibble
        } else {
            buf[byteIndex] = (byte) ((buf[byteIndex] & 0x0F) | ((state & 0x0F) << 4)); // high nibble
        }
    }

    private static String stateName(final int state) {
        if (state >= 0 && state < STATE_NAMES.length) {
            return STATE_NAMES[state];
        }
        return "UNKNOWN";
    }

    /**
     * Initializes the Fabric World State nibble bitmap for a batch (V2.1 4-State Architecture).
     * Allocates ceil(totalPacks / 2) bytes, writing STATE_MINTED (0x1) to every pack's nibble.
     * Key: &lt;batchId&gt;:SCANMAP. Capacity key: &lt;batchId&gt;:TOTAL_PACKS.
     *
     * @param ctx          the transaction context
     * @param batchId      the unique batch identifier (Feistel encoded, e.g. "B1-F8X2")
     * @param totalPacksStr total number of packs in the batch
     * @return status JSON with batchId, totalPacks, nibbleSizeBytes
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String initBatchScanMap(final Context ctx, final String batchId, final String totalPacksStr) {
        if (batchId == null || batchId.trim().isEmpty()) {
            throw new ChaincodeException("Batch ID cannot be empty", "INVALID_ARGUMENT");
        }
        int totalPacks;
        try {
            totalPacks = Integer.parseInt(totalPacksStr.trim());
        } catch (NumberFormatException e) {
            throw new ChaincodeException("Invalid totalPacks: " + totalPacksStr, "INVALID_ARGUMENT");
        }
        if (totalPacks <= 0) {
            throw new ChaincodeException("totalPacks must be greater than 0", "INVALID_ARGUMENT");
        }

        // 4 bits per pack → 2 packs per byte → ceil(N/2) bytes
        int numBytes = (int) Math.ceil((double) totalPacks / 2.0);
        byte[] nibbleMap = new byte[numBytes]; // Java zeroes all bytes (STATE_CREATED = 0x0)

        String scanMapKey    = batchId + ":SCANMAP";
        String totalPacksKey = batchId + ":TOTAL_PACKS";

        ctx.getStub().putState(scanMapKey, nibbleMap);
        ctx.getStub().putStringState(totalPacksKey, String.valueOf(totalPacks));

        ctx.getStub().setEvent("BATCH_INITIALIZED",
            (batchId + ":" + totalPacks).getBytes());

        return String.format(
            "{\"status\":\"success\",\"batchId\":\"%s\",\"totalPacks\":%d,\"nibbleSizeBytes\":%d,\"initialState\":\"CREATED\"}",
            batchId, totalPacks, numBytes);
    }

    /**
     * V2.1: Bulk transitions all packs in a batch from CREATED (0x0) to MINTED (0x1)
     * when the manufacturer approves and ships the batch for distribution.
     *
     * @param ctx     the transaction context
     * @param batchId the unique batch identifier
     * @return execution status JSON
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String mintBatch(final Context ctx, final String batchId) {
        if (batchId == null || batchId.trim().isEmpty()) {
            throw new ChaincodeException("Batch ID cannot be empty", "INVALID_ARGUMENT");
        }
        String scanMapKey = batchId + ":SCANMAP";
        byte[] nibbleMap = ctx.getStub().getState(scanMapKey);
        if (nibbleMap == null || nibbleMap.length == 0) {
            throw new ChaincodeException("ScanMap not initialized for batch: " + batchId, "NOT_INITIALIZED");
        }
        String totalPacksStr = ctx.getStub().getStringState(batchId + ":TOTAL_PACKS");
        int totalPacks = (totalPacksStr != null && !totalPacksStr.isEmpty())
            ? Integer.parseInt(totalPacksStr)
            : nibbleMap.length * 2;

        for (int i = 0; i < totalPacks; i++) {
            if (getNibble(nibbleMap, i) == STATE_CREATED) {
                setNibble(nibbleMap, i, STATE_MINTED);
            }
        }
        ctx.getStub().putState(scanMapKey, nibbleMap);
        ctx.getStub().setEvent("BATCH_MINTED", (batchId + ":" + totalPacks).getBytes());
        return String.format(
            "{\"status\":\"success\",\"batchId\":\"%s\",\"totalPacks\":%d,\"state\":\"MINTED\"}",
            batchId, totalPacks);
    }

    /**
     * Read-only evaluation of a pack's supply-chain state (V2.1 Nibble).
     * Does NOT mutate state. Used by consumer verification apps and regulatory audits.
     * Returns rich state JSON including human-readable state name and forensic custody history.
     *
     * States returned: CREATED, MINTED, AT_SHOP, SOLD, REVOKED, NOT_INITIALIZED, OUT_OF_BOUNDS
     *
     * @param ctx          the transaction context
     * @param batchId      the unique batch identifier
     * @param packIndexStr the pack index (0 to totalPacks - 1)
     * @return status JSON with custody history
     */
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String getPackState(final Context ctx, final String batchId, final String packIndexStr) {
        // 1. Batch-level recall check (O(1) key lookup, fastest possible path)
        byte[] recallData = ctx.getStub().getState(batchId + ":RECALLED");
        if (recallData == null || recallData.length == 0) {
            recallData = ctx.getStub().getState(batchId + ":RECALL");
        }
        if (recallData != null && recallData.length > 0) {
            return "{\"status\":\"REVOKED\",\"state\":" + STATE_REVOKED + ",\"batchId\":\"" + batchId + "\",\"reason\":\"BATCH_RECALLED\"}";
        }

        // 2. Read nibble map
        byte[] nibbleMap = ctx.getStub().getState(batchId + ":SCANMAP");
        if (nibbleMap == null || nibbleMap.length == 0) {
            return "{\"status\":\"NOT_INITIALIZED\",\"batchId\":\"" + batchId + "\"}";
        }

        int packIndex;
        try {
            packIndex = Integer.parseInt(packIndexStr.trim());
        } catch (NumberFormatException e) {
            return "{\"status\":\"INVALID_INDEX\",\"error\":\"" + packIndexStr + "\"}";
        }

        if (packIndex < 0 || (packIndex / 2) >= nibbleMap.length) {
            return "{\"status\":\"OUT_OF_BOUNDS\",\"packIndex\":" + packIndex + "}";
        }

        int state = getNibble(nibbleMap, packIndex);
        String name = stateName(state);

        JSONObject res = new JSONObject();
        res.put("status", name);
        res.put("state", state);
        res.put("packIndex", packIndex);
        res.put("batchId", batchId);

        // Attach forensic custody records if available
        String intakeKey = batchId + ":PACK:" + packIndex + ":INTAKE";
        byte[] intakeBytes = ctx.getStub().getState(intakeKey);
        if (intakeBytes != null && intakeBytes.length > 0) {
            try {
                res.put("intakeCustody", new JSONObject(new String(intakeBytes)));
            } catch (Exception ignored) { }
        }

        String soldKey = batchId + ":PACK:" + packIndex + ":SOLD";
        byte[] soldBytes = ctx.getStub().getState(soldKey);
        if (soldBytes != null && soldBytes.length > 0) {
            try {
                res.put("saleCustody", new JSONObject(new String(soldBytes)));
            } catch (Exception ignored) { }
        }

        return res.toString();
    }

    /**
     * Backward-compatible alias: checkPackBit delegates to getPackState and maps to old binary semantics.
     * Consumers who use the old "OK" / "DUPLICATE" / "RECALLED" response still work unchanged.
     */
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String checkPackBit(final Context ctx, final String batchId, final String packIndexStr) {
        String stateJson = getPackState(ctx, batchId, packIndexStr);
        // Map nibble states to legacy 1-bit semantics for backward compatibility
        if (stateJson.contains("\"status\":\"SOLD\"") || stateJson.contains("\"status\":\"AT_SHOP\"")) {
            return stateJson.replace("\"status\":\"AT_SHOP\"", "\"status\":\"AT_SHOP\"")
                            .replace("\"status\":\"SOLD\"", "\"status\":\"DUPLICATE\"");
        }
        if (stateJson.contains("\"status\":\"REVOKED\"")) {
            return stateJson.replace("\"status\":\"REVOKED\"", "\"status\":\"RECALLED\"");
        }
        if (stateJson.contains("\"status\":\"MINTED\"") || stateJson.contains("\"status\":\"CREATED\"")) {
            return stateJson.replace("\"status\":\"MINTED\"", "\"status\":\"OK\"")
                            .replace("\"status\":\"CREATED\"", "\"status\":\"OK\"");
        }
        return stateJson;
    }

    /**
     * Atomically advances a pack's nibble state on the supply-chain state machine (V2.1)
     * and records immutable forensic custody details (shopId, sellerId, operatorId, timestamp, txId).
     *
     * Valid transitions:
     *   MINTED  → AT_SHOP   (pharmacy intake scan — records shopId + intake timestamp)
     *   AT_SHOP → SOLD      (point-of-sale dispense — records sellerId + sell timestamp)
     *   ANY     → REVOKED   (regulatory recall override)
     *
     * @param ctx          the transaction context
     * @param batchId      the unique batch identifier
     * @param packIndexStr the pack index (0 to totalPacks - 1)
     * @param newStateStr  target state: "AT_SHOP", "SOLD", or "REVOKED"
     * @param actorId      shopId (on intake) or sellerId (on sale)
     * @param operatorId   individual employee/operator ID
     * @param location     GPS coordinates / pharmacy address
     * @return execution status JSON with custody attribution
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String setPackState(final Context ctx, final String batchId,
                               final String packIndexStr, final String newStateStr,
                               final String actorId, final String operatorId, final String location) {
        int packIndex;
        try {
            packIndex = Integer.parseInt(packIndexStr.trim());
        } catch (NumberFormatException e) {
            throw new ChaincodeException("Invalid packIndex: " + packIndexStr, "INVALID_ARGUMENT");
        }

        // 1. Batch-level recall check
        byte[] recallData = ctx.getStub().getState(batchId + ":RECALLED");
        if (recallData == null || recallData.length == 0) {
            recallData = ctx.getStub().getState(batchId + ":RECALL");
        }
        if (recallData != null && recallData.length > 0) {
            return "{\"status\":\"REVOKED\",\"packIndex\":" + packIndex + ",\"reason\":\"BATCH_RECALLED\"}";
        }

        // 2. Resolve requested new state
        int newState;
        switch (newStateStr.trim().toUpperCase()) {
            case "AT_SHOP":  newState = STATE_AT_SHOP; break;
            case "SOLD":     newState = STATE_SOLD;    break;
            case "REVOKED":  newState = STATE_REVOKED; break;
            default:
                throw new ChaincodeException("Invalid newState: " + newStateStr + ". Must be AT_SHOP, SOLD, or REVOKED.", "INVALID_ARGUMENT");
        }

        // 3. Read nibble map
        String scanMapKey = batchId + ":SCANMAP";
        byte[] nibbleMap = ctx.getStub().getState(scanMapKey);
        if (nibbleMap == null || nibbleMap.length == 0) {
            throw new ChaincodeException("ScanMap not initialized for batch: " + batchId, "NOT_INITIALIZED");
        }

        if (packIndex < 0 || (packIndex / 2) >= nibbleMap.length) {
            throw new ChaincodeException("packIndex " + packIndex + " is out of bounds for batch " + batchId, "OUT_OF_BOUNDS");
        }

        // 4. Read current nibble state
        int currentState = getNibble(nibbleMap, packIndex);

        // 5. State machine enforcement & forensic recording
        if (currentState == STATE_REVOKED) {
            return "{\"status\":\"REVOKED\",\"packIndex\":" + packIndex + ",\"currentState\":" + currentState + "}";
        }

        String txId = ctx.getStub().getTxId();
        String txTimestamp = "";
        try {
            java.time.Instant instant = ctx.getStub().getTxTimestamp();
            if (instant != null) {
                txTimestamp = instant.toString();
            }
        } catch (Exception e) {
            txTimestamp = java.time.Instant.now().toString();
        }

        if (newState == STATE_REVOKED) {
            // Regulatory override — allowed from any non-revoked state
            setNibble(nibbleMap, packIndex, STATE_REVOKED);
            ctx.getStub().putState(scanMapKey, nibbleMap);
            ctx.getStub().setEvent("PACK_REVOKED", (batchId + ":" + packIndex).getBytes());
            return "{\"status\":\"OK\",\"newState\":\"REVOKED\",\"packIndex\":" + packIndex + "}";
        }

        if (newState == STATE_AT_SHOP) {
            if (currentState == STATE_AT_SHOP) {
                // Idempotent duplicate intake scan — already registered
                return "{\"status\":\"ALREADY_AT_SHOP\",\"packIndex\":" + packIndex + ",\"currentState\":" + currentState + "}";
            }
            if (currentState == STATE_CREATED) {
                // Batch was created but not shipped yet
                return "{\"status\":\"INVALID_STATE_TRANSITION\",\"currentState\":\"CREATED\",\"requestedState\":\"AT_SHOP\",\"packIndex\":" + packIndex + ",\"alert\":\"BATCH_NOT_SHIPPED\"}";
            }
            if (currentState != STATE_MINTED) {
                // e.g. trying to re-intake a SOLD pack
                ctx.getStub().setEvent("INVALID_TRANSITION", (batchId + ":" + packIndex).getBytes());
                return "{\"status\":\"INVALID_STATE_TRANSITION\",\"currentState\":\"" + stateName(currentState) + "\",\"requestedState\":\"AT_SHOP\",\"packIndex\":" + packIndex + "}";
            }

            setNibble(nibbleMap, packIndex, STATE_AT_SHOP);
            ctx.getStub().putState(scanMapKey, nibbleMap);

            // Record immutable intake custody on Fabric ledger
            String intakeKey = batchId + ":PACK:" + packIndex + ":INTAKE";
            JSONObject intakeRecord = new JSONObject();
            intakeRecord.put("batchId", batchId);
            intakeRecord.put("packIndex", packIndex);
            intakeRecord.put("intakeShopId", actorId != null ? actorId : "");
            intakeRecord.put("intakeOperatorId", operatorId != null ? operatorId : "");
            intakeRecord.put("location", location != null ? location : "");
            intakeRecord.put("intakeTimestamp", txTimestamp);
            intakeRecord.put("intakeTxId", txId);

            ctx.getStub().putStringState(intakeKey, intakeRecord.toString());
            ctx.getStub().setEvent("PACK_AT_SHOP", intakeRecord.toString().getBytes());

            JSONObject res = new JSONObject();
            res.put("status", "OK");
            res.put("newState", "AT_SHOP");
            res.put("packIndex", packIndex);
            res.put("batchId", batchId);
            JSONObject custody = new JSONObject();
            custody.put("intakeShopId", actorId != null ? actorId : "");
            custody.put("intakeOperatorId", operatorId != null ? operatorId : "");
            custody.put("intakeTimestamp", txTimestamp);
            custody.put("blockchainTxId", txId);
            res.put("custody", custody);

            return res.toString();
        }

        if (newState == STATE_SOLD) {
            if (currentState == STATE_SOLD) {
                // Duplicate POS scan — counterfeit / photocopy attack
                ctx.getStub().setEvent("COUNTERFEIT_SCAN", (batchId + ":" + packIndex).getBytes());

                // Read existing sale custody if present to expose who legitimately sold the original
                String soldKey = batchId + ":PACK:" + packIndex + ":SOLD";
                byte[] prevSaleBytes = ctx.getStub().getState(soldKey);

                JSONObject res = new JSONObject();
                res.put("status", "ALREADY_SOLD");
                res.put("packIndex", packIndex);
                res.put("currentState", currentState);
                if (prevSaleBytes != null && prevSaleBytes.length > 0) {
                    try {
                        res.put("originalSaleCustody", new JSONObject(new String(prevSaleBytes)));
                    } catch (Exception ignored) { }
                }
                return res.toString();
            }
            if (currentState != STATE_AT_SHOP) {
                // Pack was never registered at a pharmacy — supply-chain diversion
                ctx.getStub().setEvent("DIVERSION_DETECTED", (batchId + ":" + packIndex).getBytes());
                return "{\"status\":\"INVALID_STATE_TRANSITION\",\"currentState\":\"" + stateName(currentState) + "\",\"requestedState\":\"SOLD\",\"packIndex\":" + packIndex + ",\"alert\":\"SUPPLY_CHAIN_DIVERSION\"}";
            }

            setNibble(nibbleMap, packIndex, STATE_SOLD);
            ctx.getStub().putState(scanMapKey, nibbleMap);

            // Record immutable sale custody on Fabric ledger
            String soldKey = batchId + ":PACK:" + packIndex + ":SOLD";
            JSONObject soldRecord = new JSONObject();
            soldRecord.put("batchId", batchId);
            soldRecord.put("packIndex", packIndex);
            soldRecord.put("sellerId", actorId != null ? actorId : "");
            soldRecord.put("soldByOperator", operatorId != null ? operatorId : "");
            soldRecord.put("location", location != null ? location : "");
            soldRecord.put("sellTimestamp", txTimestamp);
            soldRecord.put("sellTxId", txId);

            ctx.getStub().putStringState(soldKey, soldRecord.toString());
            ctx.getStub().setEvent("PACK_DISPENSED", soldRecord.toString().getBytes());

            JSONObject res = new JSONObject();
            res.put("status", "OK");
            res.put("newState", "SOLD");
            res.put("packIndex", packIndex);
            res.put("batchId", batchId);
            JSONObject custody = new JSONObject();
            custody.put("sellerId", actorId != null ? actorId : "");
            custody.put("soldByOperator", operatorId != null ? operatorId : "");
            custody.put("sellTimestamp", txTimestamp);
            custody.put("blockchainTxId", txId);
            res.put("custody", custody);

            return res.toString();
        }

        throw new ChaincodeException("Unhandled state transition", "INTERNAL_ERROR");
    }

    /**
     * Backward-compatible alias for POS sale scan (V2 compatibility).
     * Delegates to setPackState with newState = "SOLD".
     * Returns "OK", "DUPLICATE", or "RECALLED" to match old callers.
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String scanPack(final Context ctx, final String batchId, final String packIndexStr) {
        String result = setPackState(ctx, batchId, packIndexStr, "SOLD", "", "", "");
        if (result.contains("\"status\":\"OK\"")) return "OK";
        if (result.contains("\"status\":\"ALREADY_SOLD\"")) return "DUPLICATE";
        if (result.contains("\"status\":\"REVOKED\"")) return "RECALLED";
        if (result.contains("INVALID_STATE_TRANSITION")) return result; // pass through for V2.1 callers
        return result;
    }
}
