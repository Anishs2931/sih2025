const db = require('./firebase');

async function assignToTestTechnicians() {
  try {
    console.log('Assigning some tasks to test technicians...');
    
    // Specific tasks to assign to our test technicians
    const assignments = [
      {
        taskId: 'u9ro00IZDQ0zByiquXaM', // Electrical task from niveditha@gmail.com
        technicianId: 'tech_001' // Raj Kumar (electrical skills)
      },
      {
        taskId: 'zsFzR99vMQHYhjGYi7P1', // Plumbing task from niveditha@gmail.com
        technicianId: 'tech_002' // Priya Sharma (plumbing skills)
      },
      {
        taskId: 'Irj9V1U9DlCIfiUnNvr2', // Electrical task from test@example.com
        technicianId: 'tech_001' // Raj Kumar (electrical skills)
      },
      {
        taskId: 'qY3i2CZ2RFQybJWzjzyk', // Plumbing task from test@example.com
        technicianId: 'tech_002' // Priya Sharma (plumbing skills)
      }
    ];
    
    for (const assignment of assignments) {
      try {
        // Check if task exists
        const taskDoc = await db.collection('tasks').doc(assignment.taskId).get();
        if (!taskDoc.exists) {
          console.log(`❌ Task ${assignment.taskId} not found`);
          continue;
        }
        
        const taskData = taskDoc.data();
        console.log(`\nAssigning task: ${taskData.title || taskData.issueType} (${assignment.taskId})`);
        console.log(`From user: ${taskData.userEmail}`);
        console.log(`To technician: ${assignment.technicianId}`);
        
        // Update the task
        await db.collection('tasks').doc(assignment.taskId).update({
          status: 'assigned',
          assigned_technician: assignment.technicianId,
          assignedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        console.log(`✅ Successfully assigned!`);
        
      } catch (error) {
        console.error(`❌ Error assigning task ${assignment.taskId}:`, error);
      }
    }
    
    console.log('\n✅ Test technician assignments completed!');
    
    // Show summary
    console.log('\n📋 Summary of assignments:');
    console.log('tech_001 (Raj Kumar - Electrical):');
    console.log('  - u9ro00IZDQ0zByiquXaM (Electrical from niveditha@gmail.com)');
    console.log('  - Irj9V1U9DlCIfiUnNvr2 (Electrical from test@example.com)');
    console.log('  - Plus existing test tasks');
    
    console.log('\ntech_002 (Priya Sharma - Plumbing):');
    console.log('  - zsFzR99vMQHYhjGYi7P1 (Plumbing from niveditha@gmail.com)');
    console.log('  - qY3i2CZ2RFQybJWzjzyk (Plumbing from test@example.com)');
    console.log('  - Plus existing test tasks');
    
  } catch (error) {
    console.error('Error in assignment process:', error);
  }
}

assignToTestTechnicians();
