const { v4: uuidv4 } = require('uuid');
const db=require('../firebase')

async function addIssue(category,location){
    const normalizedCategory = category.toString().trim().toLowerCase();
    if(normalizedCategory === 'none' || normalizedCategory.includes('none') || normalizedCategory.includes('no issue')){
      throw new Error('Cannot create issue for "none" category');
    }

    let taskId=uuidv4();
    try{
      let userLocation = typeof location === 'object' ? location.location : location;
      let floor = typeof location === 'object' ? (location.floor || '') : '';
      let sector = typeof location === 'object' ? (location.sector || '') : '';
      let instructions = typeof location === 'object' ? (location.instructions || '') : '';
      const task = {
        issueType: category,
        userLocation,
        floor,
        sector,
        instructions,
        status: "Reported",
        assigned_technician: null,
        userEmail: location.email || location.userEmail || null,
        createdAt: new Date().toISOString(),
        priority: 'medium', // Default priority
        estimatedTime: null
      };
      await db.collection("tasks").doc(taskId).set(task);
      return taskId
    }
    catch(err){
      console.error('Error creating issue:', err);
      throw err; 
    }
}

module.exports={addIssue}

