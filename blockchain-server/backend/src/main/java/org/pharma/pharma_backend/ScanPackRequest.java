package org.pharma.pharma_backend;

public class ScanPackRequest {
    public String batchId;
    public int packIndex;
    /** V2.1: target supply-chain state. One of: "AT_SHOP", "SOLD", "REVOKED". Defaults to "SOLD". */
    public String newState = "SOLD";

    /** Forensic custody attribution fields */
    public String shopId;
    public String sellerId;
    public String operatorId;
    public String location;
    public String timestamp;
}
