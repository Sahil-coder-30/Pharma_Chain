import mongoose from 'mongoose';

// ── V2 ZERO-STORAGE ARCHITECTURE NOTICE ───────────────────────────────────────
// DEPRECATED: This collection is no longer populated in PharmaChain V2.
// Packs are validated cryptographically in O(1) via ephemeral ECDSA P-256 batch
// signatures and Hyperledger Fabric World State bitmaps. Zero per-pack MongoDB rows.
const PackSchema = new mongoose.Schema(
    {
        batchId:      { type: String, required: true, index: true },
        serialNumber: { type: String, required: true },
        packHash:     { type: String, required: true, unique: true },
        signedToken:  { type: String, required: true },
    },
    { timestamps: true },
);

// Compound unique: one serial per batch
PackSchema.index({ batchId: 1, serialNumber: 1 }, { unique: true });

const Pack = mongoose.model('Pack', PackSchema);
export default Pack;
