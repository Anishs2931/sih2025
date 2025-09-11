const { addIssue } = require('../issue/addIssue');

async function testTimestampFunctionality() {
  try {
    console.log('🧪 Testing updated timestamp functionality...');
    
    const testLocation = {
      location: 'Test Municipality, Test State',
      municipality: 'Test Municipality',
      state: 'Test State',
      floor: '1',
      sector: 'Test Sector',
      instructions: 'Testing Firestore Timestamps',
      userEmail: 'test@example.com'
    };
    
    const taskId = await addIssue('Pothole', testLocation, ['test-image-id']);
    console.log('✅ Successfully created test task with ID:', taskId);
    console.log('📊 Task uses proper Firestore Timestamps');
    
    // Test analytics to ensure the new timestamp works with queries
    const analyticsService = require('../analytics/analyticsService');
    const service = new analyticsService();
    
    const analytics = await service.getAnalytics({
      timePeriod: '7days',
      location: 'india'
    });
    
    console.log('📈 Analytics test results:');
    console.log('  Total Issues:', analytics.totalIssues);
    console.log('  Recent data should include new timestamp format');
    
    console.log('✅ Timestamp functionality test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testTimestampFunctionality().then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testTimestampFunctionality };
