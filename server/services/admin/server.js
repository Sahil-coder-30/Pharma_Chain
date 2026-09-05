import 'dotenv/config';
import { initIST } from './src/utils/time.js';
import app from './src/app/app.js';
import { connectDB } from './src/config/db.js';

initIST();

const PORT = process.env.PORT || 3005;

// Connect to MongoDB and start HTTP listener
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`[admin-service] Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
}).catch((err) => {
    console.error('[admin-service] Failed to start server:', err.message);
    process.exit(1);
});
