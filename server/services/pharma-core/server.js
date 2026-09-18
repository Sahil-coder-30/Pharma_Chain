import dotenv from 'dotenv';
import { initIST } from './src/utils/time.js';
import app from './src/app/app.js';
import { initKeystore } from './src/config/keystore.js';
import { initKeys } from './src/config/keys.js';

dotenv.config();
initIST();

const PORT = process.env.PORT || 4000;

// ── Crypto Bootstrap ─────────────────────────────────────────────────────────
// Initialize RSA identity keypair and manufacturer EC keystore before accepting
// any requests. A failure here is fatal — exit cleanly so Kubernetes restarts.
(async () => {
    try {
        // Load RSA-4096 identity keypair first (needed by all subsequent ops)
        await initKeys();

        // Initialize JSON keystore (manufacturer EC keys)
        await initKeystore();

        app.listen(PORT, () => {
            console.log(`[pharma-core] 🔐 Server ready on port ${PORT}`);
            console.log(`[pharma-core]    JWKS: http://localhost:${PORT}/.well-known/jwks.json`);
        });
    } catch (err) {
        console.error(`[pharma-core] FATAL: Crypto initialization failed — ${err.message}`);
        process.exit(1);
    }
})();
