const admin = require('firebase-admin');
const db = require('../firebase');

async function testStatusUpdateTimestamps() {
  try {
    console.log('🧪 Testing status update timestamps...');
    
    // Find a pending task to test with
    const tasksSnapshot = await db.collection('tasks')
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    
    if (tasksSnapshot.empty) {
      console.log('❌ No pending tasks found for testing');
      return;
    }
    
    const testTask = tasksSnapshot.docs[0];
    const taskId = testTask.id;
    const taskData = testTask.data();
    
    console.log('📝 Testing with task:', {
      id: taskId,
      issue: taskData.issueType,
      status: taskData.status,
      created_at: taskData.created_at
    });
    
    // Test updating to ongoing status (simulate initiation)
    const initiatedTimestamp = admin.firestore.Timestamp.now();
    await db.collection('tasks').doc(taskId).update({
      status: 'ongoing',
      initiated_at: initiatedTimestamp,
      initiatedAt: initiatedTimestamp.toDate().toISOString(),
      initiation_images: ['test-initiation-image']
    });
    
    console.log('✅ Successfully updated task to ongoing with Firestore Timestamp');
    
    // Verify the update
    const updatedDoc = await db.collection('tasks').doc(taskId).get();
    const updatedData = updatedDoc.data();
    
    console.log('📊 Updated task data:');
    console.log('  Status:', updatedData.status);
    console.log('  Initiated at (Timestamp):', updatedData.initiated_at);
    console.log('  Initiated at (ISO):', updatedData.initiatedAt);
    
    // Test analytics to ensure the updated timestamp works with queries
    console.log('📈 Testing analytics with updated timestamps...');
    
    const response = await fetch('http://localhost:3000/api/issue/analytics?timePeriod=7days&location=india');
    const analyticsData = await response.json();
    
    console.log('📊 Analytics results:');
    console.log('  Total Issues:', analyticsData.analytics.totalIssues);
    console.log('  Ongoing Issues:', analyticsData.analytics.ongoingIssues);
    
    console.log('✅ Status update timestamp test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testStatusUpdateTimestamps().then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testStatusUpdateTimestamps };
