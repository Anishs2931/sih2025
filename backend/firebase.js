const admin = require("firebase-admin");
require('dotenv').config();

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


// // Initialize Firebase Admin SDK
// let app;

// if (process.env.FIREBASE_PROJECT_ID && (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY_BASE64) && process.env.FIREBASE_CLIENT_EMAIL) {
//   console.log('Initializing Firebase with environment variables');

//   // Handle private key - either direct or base64 encoded
//   let privateKey;
//   try {
//     if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
//       console.log('Using base64 encoded private key');
//       privateKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
//     } else {
//       console.log('Using direct private key');
//       privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
//     }

//     // Validate private key format
//     if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
//       throw new Error('Invalid private key format');
//     }
//   } catch (error) {
//     console.error('Error processing Firebase private key:', error.message);
//     throw new Error('Firebase private key configuration error');
//   }

//   const serviceAccount = {
//     type: "service_account",
//     project_id: process.env.FIREBASE_PROJECT_ID,
//     private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
//     private_key: privateKey,
//     client_email: process.env.FIREBASE_CLIENT_EMAIL,
//     client_id: process.env.FIREBASE_CLIENT_ID,
//     auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
//     token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
//     auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
//     client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
//   };

//   app = admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
//   });
// } else {
//   // Fallback to serviceAccountKey.json (for local development only)
//   console.log('Initializing Firebase with serviceAccountKey.json');

//   try {
//     const serviceAccount = require("./serviceAccountKey.json");
//     app = admin.initializeApp({
//       credential: admin.credential.cert(serviceAccount)
//     });
//   } catch (error) {
//     console.error('Error: Firebase configuration not found!');
//     console.error('Please either:');
//     console.error('1. Set Firebase environment variables in .env file, OR');
//     console.error('2. Place serviceAccountKey.json in the backend directory');
//     process.exit(1);
//   }
// }

const db = admin.firestore();
module.exports = db;
