const db = require('../firebase');

async function assignTasksToSupervisors() {
    console.log('Assigning existing tasks to supervisors...');
    
    try {
        // Get all tasks
        const tasksSnapshot = await db.collection('tasks').get();
        const supervisorsSnapshot = await db.collection('supervisors').get();
        
        const supervisors = [];
        supervisorsSnapshot.forEach(doc => {
            supervisors.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`Found ${supervisors.length} supervisors`);
        
        let assignedCount = 0;
        
        for (const taskDoc of tasksSnapshot.docs) {
            const taskData = taskDoc.data();
            
            // Skip if already assigned to supervisor
            if (taskData.assignedSupervisor) {
                continue;
            }
            
            // Find a supervisor in the same municipality and department
            let matchingSupervisor = supervisors.find(supervisor => 
                supervisor.municipality === taskData.municipality &&
                supervisor.department === taskData.department
            );
            
            // If no exact match, find any supervisor in same municipality
            if (!matchingSupervisor) {
                matchingSupervisor = supervisors.find(supervisor => 
                    supervisor.municipality === taskData.municipality
                );
            }
            
            // If still no match, assign to a general supervisor
            if (!matchingSupervisor) {
                matchingSupervisor = supervisors.find(supervisor => 
                    supervisor.department === 'general'
                );
            }
            
            // If still no match, assign to any supervisor
            if (!matchingSupervisor && supervisors.length > 0) {
                matchingSupervisor = supervisors[0];
            }
            
            if (matchingSupervisor) {
                await db.collection('tasks').doc(taskDoc.id).update({
                    assignedSupervisor: matchingSupervisor.id,
                    supervisorDetails: {
                        name: matchingSupervisor.name,
                        department: matchingSupervisor.department,
                        phoneNumber: matchingSupervisor.phoneNumber
                    },
                    updatedAt: new Date().toISOString()
                });
                
                assignedCount++;
                console.log(`✅ Assigned task ${taskDoc.id} to supervisor ${matchingSupervisor.name} (${matchingSupervisor.department}, ${matchingSupervisor.municipality})`);
            }
        }
        
        console.log(`\nAssignment completed! Assigned ${assignedCount} tasks to supervisors.`);
        
    } catch (error) {
        console.error('Error assigning tasks to supervisors:', error);
    }
}

// Run the assignment
assignTasksToSupervisors()
    .then(() => {
        console.log('Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
