const db = require('./firebase');

async function assignUnassignedTasks() {
  try {
    console.log('Finding unassigned tasks...');
    
    // Get all unassigned tasks
    const unassignedTasksSnap = await db.collection('tasks')
      .where('status', 'in', ['Reported', 'Pending'])
      .get();
    
    console.log(`Found ${unassignedTasksSnap.size} unassigned tasks`);
    
    // Get available technicians
    const techsSnap = await db.collection('technicians')
      .where('status', '==', 'available')
      .get();
    
    console.log(`Found ${techsSnap.size} available technicians`);
    
    const technicians = techsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Assign tasks to technicians
    for (const taskDoc of unassignedTasksSnap.docs) {
      const task = taskDoc.data();
      const taskId = taskDoc.id;
      
      console.log(`\nAssigning task: ${task.title || task.issueType} (${taskId})`);
      
      // Find suitable technician based on issue type
      let assignedTech = null;
      const issueType = (task.title || task.issueType || '').toLowerCase();
      
      for (const tech of technicians) {
        let canHandle = false;
        
        // Check old format (job field)
        if (tech.job) {
          if (issueType.includes('electrical') && tech.job === 'Electrician') canHandle = true;
          if (issueType.includes('plumbing') && tech.job === 'Plumber') canHandle = true;
          if (issueType.includes('civil') && tech.job === 'Mason') canHandle = true;
        }
        
        // Check new format (skills array)
        if (tech.skills && Array.isArray(tech.skills)) {
          const skillsLower = tech.skills.map(skill => skill.toLowerCase());
          if (issueType.includes('electrical') && skillsLower.includes('electrical')) canHandle = true;
          if (issueType.includes('plumbing') && skillsLower.includes('plumbing')) canHandle = true;
          if (issueType.includes('hvac') && skillsLower.includes('hvac')) canHandle = true;
          if (issueType.includes('cleaning') && skillsLower.includes('cleaning')) canHandle = true;
          if (skillsLower.includes('general maintenance')) canHandle = true;
        }
        
        if (canHandle) {
          assignedTech = tech;
          break;
        }
      }
      
      // If no specific match, assign to first available technician
      if (!assignedTech && technicians.length > 0) {
        assignedTech = technicians[0];
      }
      
      if (assignedTech) {
        await db.collection('tasks').doc(taskId).update({
          status: 'assigned',
          assigned_technician: assignedTech.id,
          assignedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        console.log(`✅ Assigned to ${assignedTech.name} (${assignedTech.id})`);
      } else {
        console.log(`❌ No technician available for assignment`);
      }
    }
    
    console.log('\n✅ Task assignment completed!');
    
  } catch (error) {
    console.error('Error assigning tasks:', error);
  }
}

assignUnassignedTasks();
