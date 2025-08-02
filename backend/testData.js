const db = require('./firebase');

async function addTestIssues() {
  try {
    // Add some test issues for testing
    const testIssues = [
      {
        issueType: 'Electrical',
        userLocation: '17.4375,78.4483',
        floor: '2nd Floor',
        sector: 'Block A',
        instructions: 'Light not working in hallway',
        status: 'Reported',
        assigned_technician: null,
        userEmail: 'niveditha@gmail.com',
        createdAt: new Date().toISOString(),
        priority: 'high',
        estimatedTime: null
      },
      {
        issueType: 'Plumbing',
        userLocation: '17.4375,78.4483',
        floor: '1st Floor',
        sector: 'Block B',
        instructions: 'Water leakage in bathroom',
        status: 'Reported',
        assigned_technician: null,
        userEmail: 'niveditha@gmail.com',
        createdAt: new Date().toISOString(),
        priority: 'medium',
        estimatedTime: null
      }
    ];

    for (let i = 0; i < testIssues.length; i++) {
      const docRef = db.collection('tasks').doc();
      await docRef.set(testIssues[i]);
      console.log(`Added test issue ${i + 1} with ID: ${docRef.id}`);
    }

    console.log('Test data added successfully!');
  } catch (error) {
    console.error('Error adding test data:', error);
  }
}

// Run the function
addTestIssues();
