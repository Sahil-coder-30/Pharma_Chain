import mongoose from 'mongoose';
import axios from 'axios';
import { getISTDateString } from './time.js';

const MONGO_URI = 'mongodb+srv://sahilsharma3043_db_user:ztH8xdKhwycWwD3o@cluster0.wv6khhi.mongodb.net/manufacturer';
const PHARMA_CORE_URL = process.env.PHARMA_CORE_URL || 'http://pharma-core-service:80';
const SERVICE_TOKEN = '1d230ff87628d00c450d7bb7f5f5245ad30ad7d1b57be42253e66de27738d11a7351a2a4a7dbc451fb1445e658f382c9';

async function mintAllPending() {
  await mongoose.connect(MONGO_URI);
  const batchesCol = mongoose.connection.db.collection('batches');
  const pending = await batchesCol.find({ mintStatus: { $in: ['PENDING', 'MINTING'] } }).toArray();
  console.log(`Found ${pending.length} pending/minting batches in total:`);

  // Ensure key is generated for manufacturer
  try {
    const keyRes = await axios.post(`${PHARMA_CORE_URL}/core/keys/generate`, {
      manufacturerId: 'MFR_VKJWVNJD26563266_9424B1'
    }, {
      headers: {
        Authorization: `Bearer ${SERVICE_TOKEN}`,
        'X-Service-Token': SERVICE_TOKEN,
        'Content-Type': 'application/json',
      }
    });
    console.log('Key generated for MFR_VKJWVNJD26563266_9424B1:', keyRes.data?.keyId || 'OK');
  } catch (keyErr) {
    console.log('Key check status:', keyErr.response?.data?.message || keyErr.message);
  }

  for (const b of pending) {
    console.log(`\nStarting minting for ${b.batchId} (${b.medicineName}, Qty: ${b.totalQuantity})...`);
    try {
      // Also ensure key exists for this manufacturer
      try {
        await axios.post(`${PHARMA_CORE_URL}/core/keys/generate`, {
          manufacturerId: b.manufacturerId
        }, {
          headers: {
            Authorization: `Bearer ${SERVICE_TOKEN}`,
            'X-Service-Token': SERVICE_TOKEN,
            'Content-Type': 'application/json',
          }
        });
      } catch (kErr) {}

      const expiryStr = getISTDateString(b.expiryDate || new Date());
      const qtyToMint = Math.min(b.totalQuantity || 200, 1000);
      const res = await axios.post(`${PHARMA_CORE_URL}/core/batch/mint`, {
        batchId: b.batchId,
        manufacturerId: b.manufacturerId,
        expiryDate: expiryStr,
        quantity: qtyToMint,
        medicineName: b.medicineName || '',
      }, {
        headers: {
          Authorization: `Bearer ${SERVICE_TOKEN}`,
          'X-Service-Token': SERVICE_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 180000,
      });

      console.log(`pharma-core response: S3 key = ${res.data?.s3FileKey || 'OK'}`);

      await batchesCol.updateOne({ batchId: b.batchId }, {
        $set: {
          mintStatus: 'MINTED',
          s3FileKey: res.data?.s3FileKey,
          s3DownloadUrl: res.data?.s3DownloadUrl,
          s3UrlExpiresAt: res.data?.s3UrlExpiresAt || null,
          s3Mode: res.data?.s3Mode || 'local',
          merkleRoot: res.data?.merkleRoot || null,
          txHash: res.data?.txHash || null,
          blockNumber: res.data?.blockNumber || 18430,
        },
      });
      console.log(`[SUCCESS] ${b.batchId} is now MINTED!`);
    } catch (err) {
      console.error(`[ERROR] Failed to mint ${b.batchId}:`, err.response?.data || err.message);
    }
  }

  console.log('\nAll pending batches have been processed.');
  process.exit(0);
}

mintAllPending();
