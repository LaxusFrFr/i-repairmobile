// Database Check and Fix Script
// Run this with: node check-database.js

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to download your service account key)
const serviceAccount = require('./path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "i-repair-laxusfrfr"
});

const db = admin.firestore();

async function checkUserAccount(email) {
  try {
    console.log(`🔍 Checking account for: ${email}`);
    
    // Get user by email from Firebase Auth
    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;
    
    console.log(`📧 User UID: ${uid}`);
    
    // Check if user exists in 'users' collection
    const userDoc = await db.collection('users').doc(uid).get();
    const userExists = userDoc.exists;
    
    // Check if user exists in 'technicians' collection  
    const techDoc = await db.collection('technicians').doc(uid).get();
    const techExists = techDoc.exists;
    
    console.log(`👤 Exists in 'users' collection: ${userExists}`);
    console.log(`🔧 Exists in 'technicians' collection: ${techExists}`);
    
    if (userExists && techExists) {
      console.log('❌ MISMATCH FOUND: User exists in both collections!');
      console.log('🔧 User data in technicians collection:', techDoc.data());
      console.log('👤 User data in users collection:', userDoc.data());
      
      // Ask what to do
      console.log('\n🛠️  To fix this, you have two options:');
      console.log('1. Remove from technicians collection (if you want to be a regular user)');
      console.log('2. Remove from users collection (if you want to be a technician)');
      
      return { userExists, techExists, uid, userData: userDoc.data(), techData: techDoc.data() };
    } else if (userExists) {
      console.log('✅ User account is correctly set up as regular user');
    } else if (techExists) {
      console.log('✅ User account is correctly set up as technician');
    } else {
      console.log('❌ User not found in any collection');
    }
    
    return { userExists, techExists, uid };
    
  } catch (error) {
    console.error('❌ Error checking account:', error.message);
    return null;
  }
}

async function fixAccountMismatch(uid, removeFrom = 'technicians') {
  try {
    if (removeFrom === 'technicians') {
      await db.collection('technicians').doc(uid).delete();
      console.log('✅ Removed user from technicians collection');
    } else if (removeFrom === 'users') {
      await db.collection('users').doc(uid).delete();
      console.log('✅ Removed user from users collection');
    }
    console.log('🎉 Account mismatch fixed!');
  } catch (error) {
    console.error('❌ Error fixing account:', error.message);
  }
}

// Usage example:
async function main() {
  const email = 'your-email@example.com'; // Replace with your email
  
  console.log('🔍 Checking Firebase Database...\n');
  
  const result = await checkUserAccount(email);
  
  if (result && result.userExists && result.techExists) {
    console.log('\n🛠️  To fix the mismatch, uncomment and run one of these:');
    console.log('// await fixAccountMismatch(result.uid, "technicians"); // Remove from technicians (be regular user)');
    console.log('// await fixAccountMismatch(result.uid, "users"); // Remove from users (be technician)');
  }
  
  process.exit(0);
}

main();


