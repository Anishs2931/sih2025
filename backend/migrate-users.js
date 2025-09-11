const db = require("./firebase");
const crypto = require("crypto");

// Function to generate unique user ID (same as in loginRoutes.js)
function generateUniqueUserId() {
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(4).toString('hex');
  return `QT${timestamp}${randomBytes}`.toUpperCase();
}

async function migrateUsersWithUniqueIds() {
  console.log("Starting user migration to add unique IDs...");
  
  const collections = ['citizens', 'supervisors', 'admins'];
  let totalMigrated = 0;
  
  for (const collectionName of collections) {
    console.log(`\nMigrating ${collectionName} collection...`);
    
    try {
      // Get all users in this collection without userId field
      const usersSnapshot = await db.collection(collectionName).get();
      
      if (usersSnapshot.empty) {
        console.log(`No users found in ${collectionName} collection.`);
        continue;
      }
      
      const usersToUpdate = [];
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (!userData.userId) {
          usersToUpdate.push({
            docId: doc.id,
            data: userData
          });
        }
      });
      
      console.log(`Found ${usersToUpdate.length} users without unique ID in ${collectionName}`);
      
      // Update each user with a unique ID
      for (const userDoc of usersToUpdate) {
        const uniqueUserId = generateUniqueUserId();
        
        // Check if this ID already exists (very unlikely)
        let isUnique = false;
        let attempts = 0;
        let currentUserId = uniqueUserId;
        
        while (!isUnique && attempts < 5) {
          let idExists = false;
          
          for (const checkCollection of collections) {
            const existingId = await db.collection(checkCollection)
              .where('userId', '==', currentUserId).get();
            if (!existingId.empty) {
              idExists = true;
              break;
            }
          }
          
          if (!idExists) {
            isUnique = true;
          } else {
            currentUserId = generateUniqueUserId();
            attempts++;
          }
        }
        
        // Update the user document
        await db.collection(collectionName).doc(userDoc.docId).update({
          userId: currentUserId,
          // Ensure other required fields exist
          isActive: userDoc.data.isActive !== undefined ? userDoc.data.isActive : true,
          createdAt: userDoc.data.createdAt || new Date().toISOString(),
          address: userDoc.data.address || ''
        });
        
        console.log(`✅ Updated ${userDoc.data.name} (${userDoc.data.email}) with ID: ${currentUserId}`);
        totalMigrated++;
      }
      
    } catch (error) {
      console.error(`❌ Error migrating ${collectionName}:`, error);
    }
  }
  
  console.log(`\n🎉 Migration completed! Total users migrated: ${totalMigrated}`);
}

// Run the migration
migrateUsersWithUniqueIds()
  .then(() => {
    console.log("Migration script finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
