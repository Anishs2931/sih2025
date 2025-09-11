const { Storage } = require('@google-cloud/storage');

function createStorageClient() {
  // Prefer application default credentials if available
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log('[gcs] Using GOOGLE_APPLICATION_CREDENTIALS for auth');
    return new Storage();
  }

  // Support providing service account JSON directly via env
  let projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || undefined;
  let credentials = undefined;

  const svcJson = process.env.GCS_CONFIG || process.env.GCP_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_CONFID || process.env.FIREBASE_CONFIG || null;
  if (svcJson) {
    try {
      let raw = svcJson;
      // If value looks like a file path, try loading it
      if (typeof raw === 'string' && !raw.trim().startsWith('{') && raw.trim().endsWith('.json')) {
        try {
          const fs = require('fs');
          if (fs.existsSync(raw)) {
            raw = fs.readFileSync(raw, 'utf8');
          }
        } catch {}
      }
      // If looks like base64, try decoding
      if (typeof raw === 'string' && !raw.trim().startsWith('{') && /^[A-Za-z0-9+/=\n\r]+$/.test(raw.trim())) {
        try {
          const decoded = Buffer.from(raw.trim(), 'base64').toString('utf8');
          if (decoded.trim().startsWith('{')) raw = decoded;
        } catch {}
      }
      const parsed = JSON.parse(raw);
      projectId = projectId || parsed.project_id;
      if (parsed.client_email && parsed.private_key) {
        credentials = {
          client_email: parsed.client_email,
          private_key: parsed.private_key.replace(/\\n/g, '\n')
        };
      }
      console.log(`[gcs] Using inline service account JSON for auth (project: ${projectId || 'unknown'})`);
    } catch (e) {
      console.warn('[gcs] Failed to parse service account JSON from env:', e?.message);
    }
  }

  return new Storage({ projectId, credentials });
}

const storage = createStorageClient();
let cachedBucket = null;
let cachedBucketName = null;

function getBucket(bucketName) {
  const fromEnv = [process.env.GCS_BUCKET, process.env.GOOGLE_CLOUD_STORAGE_BUCKET]
    .find(v => typeof v === 'string' && v.trim().length > 0);
  const name = (bucketName && bucketName.trim()) || fromEnv;
  if (!name) {
    throw new Error('[gcs] No bucket configured. Set GCS_BUCKET or GOOGLE_CLOUD_STORAGE_BUCKET.');
  }
  if (cachedBucket && cachedBucketName === name) return cachedBucket;
  cachedBucket = storage.bucket(name);
  cachedBucketName = name;
  console.log(`[gcs] Using bucket: ${name}`);
  return cachedBucket;
}

module.exports = { storage, getBucket };
