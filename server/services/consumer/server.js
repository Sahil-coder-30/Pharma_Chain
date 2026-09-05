import dotenv from 'dotenv';
import { initIST } from './src/utils/time.js';
import app from './src/app/app.js';
import { connectToDb } from './src/config/db.js';

dotenv.config();
initIST();

const PORT = process.env.PORT || 3003;

connectToDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`[consumer-service] Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('[consumer-service] Database initialization warning:', err.message);
        // Start server anyway so readiness/health probes can report status
        app.listen(PORT, () => {
            console.log(`[consumer-service] Server running in degraded mode on port ${PORT}`);
        });
    });
