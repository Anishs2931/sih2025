const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testIssueCreation() {
  try {
    // Create a simple test image buffer (you can replace this with an actual image)
    const testImageBuffer = Buffer.from('fake-image-data');
    
    const formData = new FormData();
    formData.append('image', testImageBuffer, 'test.jpg');
    formData.append('location', JSON.stringify({
      location: { lat: 17.4375, lng: 78.4483 },
      userEmail: 'niveditha@gmail.com'
    }));
    formData.append('floor', '2nd Floor');
    formData.append('sector', 'Block A');
    formData.append('instructions', 'Test issue creation');

    console.log('Testing issue creation API...');
    const response = await fetch('http://localhost:3000/api/issue/detect', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error testing issue creation:', error);
  }
}

testIssueCreation();
