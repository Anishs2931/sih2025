const db = require('../firebase');

async function deleteSampleData() {
  try {
    console.log('🗑️  Deleting existing sample data...');
    
    // Delete all tasks that have sample data (contain "Sample issue" in instructions)
    const tasksSnapshot = await db.collection('tasks')
      .where('instructions', '>=', 'Sample issue')
      .where('instructions', '<', 'Sample issuf') // Range query for "Sample issue"
      .get();
    
    console.log(`Found ${tasksSnapshot.size} sample tasks to delete`);
    
    const batch = db.batch();
    tasksSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (tasksSnapshot.size > 0) {
      await batch.commit();
      console.log('✅ Deleted existing sample tasks');
    }
    
    // Delete sample supervisors
    const supervisorIds = ['supervisor-001', 'supervisor-002', 'supervisor-003', 'supervisor-004', 'supervisor-005'];
    const supervisorBatch = db.batch();
    
    for (const id of supervisorIds) {
      supervisorBatch.delete(db.collection('supervisors').doc(id));
    }
    
    await supervisorBatch.commit();
    console.log('✅ Deleted sample supervisors');
    
  } catch (error) {
    console.error('❌ Error deleting sample data:', error);
  }
}

// Run deletion if called directly
if (require.main === module) {
  deleteSampleData().then(() => {
    console.log('✅ Sample data deletion completed');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Deletion failed:', error);
    process.exit(1);
  });
}

module.exports = { deleteSampleData };
