import mongoose from 'mongoose';

const DEFAULT_MONGO_URI =
    'mongodb+srv://sahilsharma3043_db_user:ztH8xdKhwycWwD3o@cluster0.wv6khhi.mongodb.net/consumer';

export const connectToDb = async () => {
    try {
        const uri =
            process.env.MONGO_URI ||
            process.env.CONSUMER_MONGO_URI ||
            DEFAULT_MONGO_URI;

        mongoose.connection.on('connected', () => {
            console.log('[consumer-service DB] Connected to MongoDB Atlas successfully');
        });

        mongoose.connection.on('error', (err) => {
            console.error('[consumer-service DB] MongoDB connection error:', err.message);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('[consumer-service DB] MongoDB disconnected. Reconnecting...');
        });

        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
        });
    } catch (error) {
        console.error('[consumer-service DB] Initial connection error:', error.message);
        // Do not immediately exit so Kubernetes liveness probes can report status
        throw error;
    }
};
