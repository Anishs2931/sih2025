const db = require('./firebase');

async function checkAllTasks() {
  try {
    console.log('Checking all tasks in database...');
    
    const tasksSnap = await db.collection('tasks').get();
    console.log(`Total tasks found: ${tasksSnap.size}`);
    
    tasksSnap.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\nTask ${index + 1}:`);
      console.log(`ID: ${doc.id}`);
      console.log(`Title: ${data.title || data.issueType || 'No title'}`);
      console.log(`Status: ${data.status}`);
      console.log(`Priority: ${data.priority}`);
      console.log(`User Email: ${data.userEmail}`);
      console.log(`Assigned Technician: ${data.assigned_technician || 'Not assigned'}`);
      console.log(`Created: ${data.createdAt}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error checking tasks:', error);
  }
}

checkAllTasks();
