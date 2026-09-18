package org.hyperledger.fabric.samples.assettransfer;

import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.shim.ChaincodeStub;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

import java.util.HashMap;
import java.util.Map;

class PharmaContractTest {
    
    private PharmaContract contract;
    private Context ctx;
    private ChaincodeStub stub;
    private Map<String, String> mockLedger;
    private Map<String, byte[]> mockByteLedger;
    
    private static final String PACK = "pack123";
    private static final String BATCH = "batch456";
    
    @BeforeEach
    void setup() {
        contract = new PharmaContract();
        ctx = mock(Context.class);
        stub = mock(ChaincodeStub.class);
        when(ctx.getStub()).thenReturn(stub);
        
        mockLedger = new HashMap<>();
        mockByteLedger = new HashMap<>();
        
        doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            String value = invocation.getArgument(1);
            mockLedger.put(key, value);
            return null;
        }).when(stub).putStringState(anyString(), anyString());
        
        when(stub.getStringState(anyString())).thenAnswer(invocation -> {
            String key = invocation.getArgument(0);
            return mockLedger.get(key);
        });

        doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            byte[] value = invocation.getArgument(1);
            mockByteLedger.put(key, value);
            return null;
        }).when(stub).putState(anyString(), any(byte[].class));

        when(stub.getState(anyString())).thenAnswer(invocation -> {
            String key = invocation.getArgument(0);
            return mockByteLedger.get(key);
        });
    }

    @Test
    void writtenKeyIsReadableByGetPackStatus() {
        contract.recordTransition(ctx, PACK, "MINTED", "from", "to", "date", "time", "seller");
        String result = contract.getPackStatus(ctx, PACK, BATCH);
        assertTrue(result.contains("\"status\":\"Packaged\""));
    }

    @Test
    void soldPackDoesNotReportAtShop() {
        contract.recordTransition(ctx, PACK, "MINTED", "from1", "to1", "date", "time", "seller");
        contract.recordTransition(ctx, PACK, "INTAKE", "from2", "to2", "date", "time", "seller");
        contract.recordTransition(ctx, PACK, "SOLD",   "to2", "to3", "date", "time", "seller");
        String result = contract.getPackStatus(ctx, PACK, BATCH);
        assertTrue(result.contains("\"status\":\"Sold\""));
    }

    @Test
    void testV2BitmapInitAndScanLifecycle() {
        String batchId = "B1-F8X2";
        // 1. Initialize bitmap for 100 packs (ceil(100/8) = 13 bytes)
        String initResult = contract.initBatchScanMap(ctx, batchId, "100");
        assertTrue(initResult.contains("\"status\":\"success\""));
        assertTrue(initResult.contains("\"bitmapSizeBytes\":13"));

        // 2. Read-only check for pack 42 before scan
        String preCheck = contract.checkPackBit(ctx, batchId, "42");
        assertTrue(preCheck.contains("\"status\":\"OK\""));

        // 3. First scan for pack 42 -> returns "OK"
        String firstScan = contract.scanPack(ctx, batchId, "42");
        assertTrue(firstScan.equals("OK"));

        // 4. Second scan for pack 42 (counterfeit attempt) -> returns "DUPLICATE"
        String secondScan = contract.scanPack(ctx, batchId, "42");
        assertTrue(secondScan.equals("DUPLICATE"));

        // 5. Read-only check reflects scanned state
        String postCheck = contract.checkPackBit(ctx, batchId, "42");
        assertTrue(postCheck.contains("\"status\":\"DUPLICATE\""));

        // 6. Another pack in same byte (pack 43) is still unscanned
        String otherPackCheck = contract.checkPackBit(ctx, batchId, "43");
        assertTrue(otherPackCheck.contains("\"status\":\"OK\""));
    }
}

