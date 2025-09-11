// Test bill image upload endpoint
const axios = require('axios');

async function testBillImageUpload() {
  console.log('🧪 Testing bill image upload functionality...\n');

  const testData = {
    imageId: 'test-bill-image-id-12345',
    supervisorEmail: 'supervisor@test.com'
  };

  const taskId = 'test-task-id-67890';

  try {
    console.log('📤 Sending bill image upload request...');
    console.log('  Task ID:', taskId);
    console.log('  Image ID:', testData.imageId);
    console.log('  Supervisor:', testData.supervisorEmail);

    const response = await axios.post(`http://127.0.0.1:3000/api/tasks/${taskId}/bill-image`, testData);

    console.log('\n✅ Success Response:');
    console.log('  Status:', response.status);
    console.log('  Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    if (error.response) {
      console.log('\n❌ Error Response:');
      console.log('  Status:', error.response.status);
      console.log('  Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('\n❌ Network Error:', error.message);
    }
  }
}

console.log('🎯 Expected Behavior:');
console.log('  1. Endpoint should accept POST to /api/tasks/:taskId/bill-image');
console.log('  2. Should add imageId to task.bill_images array');
console.log('  3. Should update lastUpdated timestamp');
console.log('  4. Should return success response with image count\n');

// Uncomment to test (requires server running)
// testBillImageUpload();
