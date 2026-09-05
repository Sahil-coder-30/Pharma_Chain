import mongoose from 'mongoose';

const consumerUserSchema = new mongoose.Schema(
    {
        googleId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        picture: {
            type: String,
            default: '',
        },
        phone: {
            type: String,
            trim: true,
            default: '',
        },
        address: {
            type: String,
            trim: true,
            default: '',
        },
        kycStatus: {
            type: String,
            enum: ['VERIFIED', 'PENDING', 'UNVERIFIED'],
            default: 'VERIFIED',
        },
        fabricNodeId: {
            type: String,
            default: () => `PC-${Math.floor(100000 + Math.random() * 900000)}`,
        },
        role: {
            type: String,
            default: 'CONSUMER',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLoginAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Method to format a safe JSON output for responses
consumerUserSchema.methods.toSafeObject = function () {
    return {
        id: this._id,
        googleId: this.googleId,
        email: this.email,
        name: this.name,
        picture: this.picture,
        phone: this.phone,
        address: this.address,
        kycStatus: this.kycStatus,
        fabricNodeId: this.fabricNodeId,
        role: this.role,
        lastLoginAt: this.lastLoginAt,
        createdAt: this.createdAt,
    };
};

export const ConsumerUser = mongoose.model('ConsumerUser', consumerUserSchema);
export default ConsumerUser;
