package org.pharma.pharma_backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.hyperledger.fabric.client.Contract;
import org.hyperledger.fabric.client.Network;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transition")
public class TransitionController {

    private static final Logger log = LoggerFactory.getLogger(TransitionController.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    private Contract getContract() throws Exception {
        Network network = FabricConfig.getNetwork();
        return network.getContract("pharmacc");
    }

    private static String normalizeEventType(String eventType) {
        if (eventType == null) {
            return null;
        }
        String e = eventType.trim().toUpperCase();
        if ("MFG".equals(e)) {
            return "MINTED";
        }
        if ("SALE".equals(e)) {
            return "SOLD";
        }
        return e;
    }

    private static String[] resolvePackAndEvent(TransitionRequest req) {
        String packId = req.packId;
        String eventType = req.eventType;

        if ((packId == null || packId.isBlank() || eventType == null || eventType.isBlank())
                && req.hash != null && !req.hash.isBlank()) {
            int idx = req.hash.lastIndexOf('~');
            if (idx < 0) {
                idx = req.hash.lastIndexOf(':');
            }
            if (idx > 0 && idx < req.hash.length() - 1) {
                packId = req.hash.substring(0, idx);
                eventType = req.hash.substring(idx + 1);
            }
        }

        return new String[]{packId, normalizeEventType(eventType)};
    }

    @PostMapping
    public String recordTransition(@RequestBody TransitionRequest req) throws Exception {
        String[] resolved = resolvePackAndEvent(req);
        req.packId = resolved[0];
        req.eventType = resolved[1];
        log.info("⛓️ [BLOCKCHAIN-GATEWAY] Recording single transition: packId='{}', event='{}', from='{}', to='{}', shop='{}', loc='{}'",
                resolved[0], resolved[1], req.fromId, req.toId, req.shopName, req.location);
        
        java.util.List<TransitionRequest> list = java.util.Collections.singletonList(req);
        String transitionsJson = objectMapper.writeValueAsString(list);
        byte[] result = getContract().submitTransaction(
            "recordTransitionBatch",
            req.packId != null ? req.packId : "",
            transitionsJson
        );
        String resStr = new String(result);
        log.info("✅ [BLOCKCHAIN-GATEWAY] Single transition committed successfully: {}", resStr);
        return resStr;
    }

    @PostMapping("/batch")
    public String recordTransitionsBatch(@RequestBody BatchTransitionRequest req) throws Exception {
        int count = req.transitions != null ? req.transitions.size() : 0;
        log.info("⛓️ [BLOCKCHAIN-GATEWAY] 🚀 Received batch transition request for batchId='{}' ({} transitions)",
                req.batchId, count);
        String transitionsJson = objectMapper.writeValueAsString(req.transitions);
        byte[] result = getContract().submitTransaction(
            "recordTransitionBatch",
            req.batchId == null ? "" : req.batchId,
            transitionsJson
        );
        String resStr = new String(result);
        log.info("✅ [BLOCKCHAIN-GATEWAY] Batch transitions committed to Hyperledger Fabric for batchId='{}': {}",
                req.batchId, resStr);
        return resStr;
    }

    @PostMapping("/recall")
    public String recallBatchFromBody(@RequestBody RecallRequest req) throws Exception {
        log.warn("⚠️ [BLOCKCHAIN-GATEWAY] Received recall request for batchId='{}', reason='{}'",
                req.systemBatchId, req.reason);
        byte[] result = getContract().submitTransaction(
            "recallBatch",
            req.systemBatchId, req.actorId, req.reason, req.recallDate, req.recallTime
        );
        String resStr = new String(result);
        log.info("🚨 [BLOCKCHAIN-GATEWAY] Batch recall committed on blockchain for batchId='{}'", req.systemBatchId);
        return resStr;
    }

    @GetMapping("/pack/{hash}/current")
    public String getPackCurrentState(@PathVariable String hash) throws Exception {
        log.info("🔍 [BLOCKCHAIN-GATEWAY] Query pack current state for hash='{}'", hash);
        byte[] result = getContract().evaluateTransaction("getPackCurrentState", hash);
        return new String(result);
    }

    @GetMapping("/pack/{hash}/history")
    public String getPackHistory(@PathVariable String hash) throws Exception {
        log.info("📜 [BLOCKCHAIN-GATEWAY] Query pack provenance history for hash='{}'", hash);
        byte[] result = getContract().evaluateTransaction("getPackHistory", hash);
        return new String(result);
    }

    @GetMapping("/status")
    public String getPackStatus(@RequestParam String packHash, @RequestParam String batchId) throws Exception {
        log.info("🔍 [BLOCKCHAIN-GATEWAY] Query pack status: packHash='{}', batchId='{}'", packHash, batchId);
        byte[] result = getContract().evaluateTransaction("getPackStatus", packHash, batchId);
        return new String(result);
    }

    @GetMapping("/{hash}")
    public String getByHash(@PathVariable String hash) throws Exception {
        byte[] result = getContract().evaluateTransaction("getTransitionByHash", hash);
        return new String(result);
    }

    @GetMapping
    public String query(@RequestParam(required = false, defaultValue = "") String fromId,
                         @RequestParam(required = false, defaultValue = "") String toId,
                         @RequestParam(required = false, defaultValue = "") String hash) throws Exception {
        byte[] result = getContract().evaluateTransaction("queryTransition", fromId, toId, hash);
        return new String(result);
    }

    @PostMapping("/init-scanmap")
    public String initBatchScanMap(@RequestBody ScanMapInitRequest req) throws Exception {
        log.info("🗺️ [BLOCKCHAIN-GATEWAY] Initializing Fabric NibbleMap (V2.1): batchId='{}', totalPacks={}",
                req.batchId, req.totalPacks);
        byte[] result = getContract().submitTransaction(
            "initBatchScanMap",
            req.batchId,
            String.valueOf(req.totalPacks)
        );
        String resStr = new String(result);
        log.info("✅ [BLOCKCHAIN-GATEWAY] NibbleMap initialized on blockchain for batchId='{}': {}", req.batchId, resStr);
        return resStr;
    }

    /**
     * V2.1: Set a pack's supply-chain nibble state with forensic custody attribution.
     * newState ∈ { "AT_SHOP", "SOLD", "REVOKED" }
     * Enforces the state machine: MINTED → AT_SHOP → SOLD; ANY → REVOKED.
     * Records shopId/sellerId, operatorId, and consensus timestamp on ledger.
     */
    @PostMapping("/set-pack-state")
    public String setPackState(@RequestBody ScanPackRequest req) throws Exception {
        String newState = req.newState != null ? req.newState.toUpperCase() : "SOLD";
        String actorId = req.shopId != null ? req.shopId : (req.sellerId != null ? req.sellerId : "");
        String operatorId = req.operatorId != null ? req.operatorId : "";
        String location = req.location != null ? req.location : "";

        log.info("⚡ [BLOCKCHAIN-GATEWAY] V2.1 setPackState: batchId='{}', packIndex={}, newState={}, actorId='{}', operatorId='{}'",
                req.batchId, req.packIndex, newState, actorId, operatorId);
        byte[] result = getContract().submitTransaction(
            "setPackState",
            req.batchId,
            String.valueOf(req.packIndex),
            newState,
            actorId,
            operatorId,
            location
        );
        String resStr = new String(result);
        log.info("✅ [BLOCKCHAIN-GATEWAY] setPackState result for batchId='{}', packIndex={}: {}",
                req.batchId, req.packIndex, resStr);
        return resStr;
    }

    /**
     * V2.1: Bulk transition all packs in a batch from CREATED (0x0) to MINTED (0x1)
     * when the manufacturer approves and ships the batch.
     */
    @PostMapping("/mint-batch")
    public String mintBatch(@RequestBody java.util.Map<String, Object> req) throws Exception {
        String batchId = (String) req.get("batchId");
        log.info("⚡ [BLOCKCHAIN-GATEWAY] V2.1 mintBatch (CREATED → MINTED): batchId='{}'", batchId);
        byte[] result = getContract().submitTransaction("mintBatch", batchId);
        String resStr = new String(result);
        log.info("✅ [BLOCKCHAIN-GATEWAY] mintBatch result for batchId='{}': {}", batchId, resStr);
        return resStr;
    }

    /**
     * V2.1: Read-only nibble state query.
     * Returns full state JSON: { status, state (0–4), packIndex, batchId }
     */
    @GetMapping("/pack-state")
    public String getPackState(@RequestParam String batchId, @RequestParam int packIndex) throws Exception {
        log.info("🔍 [BLOCKCHAIN-GATEWAY] V2.1 getPackState (read-only): batchId='{}', packIndex={}",
                batchId, packIndex);
        byte[] result = getContract().evaluateTransaction(
            "getPackState",
            batchId,
            String.valueOf(packIndex)
        );
        return new String(result);
    }

    /** Backward-compatible alias: scan-pack delegates to setPackState with newState=SOLD */
    @PostMapping("/scan-pack")
    public String scanPack(@RequestBody ScanPackRequest req) throws Exception {
        req.newState = "SOLD";
        log.info("⚡ [BLOCKCHAIN-GATEWAY] (compat) scan-pack → setPackState SOLD: batchId='{}', packIndex={}",
                req.batchId, req.packIndex);
        String result = setPackState(req);
        // Wrap in legacy envelope for old callers
        if (result.contains("\"status\":\"OK\"")) {
            return "{\"status\":\"OK\",\"batchId\":\"" + req.batchId + "\",\"packIndex\":" + req.packIndex + "}";
        }
        return result;
    }

    /** Backward-compatible alias: pack-bit delegates to getPackState */
    @GetMapping("/pack-bit")
    public String checkPackBit(@RequestParam String batchId, @RequestParam int packIndex) throws Exception {
        log.info("🔍 [BLOCKCHAIN-GATEWAY] (compat) pack-bit → getPackState: batchId='{}', packIndex={}",
                batchId, packIndex);
        byte[] result = getContract().evaluateTransaction(
            "checkPackBit",
            batchId,
            String.valueOf(packIndex)
        );
        return new String(result);
    }
}
