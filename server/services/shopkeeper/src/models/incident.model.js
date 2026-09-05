import mongoose from 'mongoose';

const IncidentSchema = new mongoose.Schema(
    {
        incidentId:    { type: String, required: true, unique: true },
        shopkeeperId:  { type: String, required: true, index: true },
        packHash:      { type: String, required: true },
        detectedIssue: {
            type: String,
            enum: ['COUNTERFEIT_SIGNATURE', 'CLONED_QR', 'ALREADY_SOLD', 'RECALLED_BATCH', 'EXPIRED_DRUG', 'SUSPICIOUS_PATTERN'],
            default: 'CLONED_QR',
        },
        medicineName:  { type: String, default: 'Prescription Medicine' },
        batchId:       { type: String, default: null },
        notes:         { type: String, default: null },
        reportedToCDSCO: { type: Boolean, default: true },
        status:        {
            type: String,
            enum: ['FLAGGED', 'UNDER_INVESTIGATION', 'RESOLVED', 'CLOSED'],
            default: 'FLAGGED',
        },
    },
    { timestamps: true },
);

IncidentSchema.index({ shopkeeperId: 1, createdAt: -1 });

const Incident = mongoose.model('Incident', IncidentSchema);
export default Incident;
