const db = require('../firebase');

async function checkSupervisorAssignments() {
    console.log('Checking supervisor task assignments...');
    
    try {
        // Get all tasks with assigned supervisors
        const tasksSnapshot = await db.collection('tasks')
            .where('assignedSupervisor', '!=', null)
            .get();
        
        console.log(`Found ${tasksSnapshot.size} tasks with assigned supervisors:`);
        
        const supervisorTaskCount = {};
        
        tasksSnapshot.forEach(doc => {
            const task = doc.data();
            const supervisorId = task.assignedSupervisor;
            
            if (!supervisorTaskCount[supervisorId]) {
                supervisorTaskCount[supervisorId] = {
                    count: 0,
                    supervisorName: task.supervisorDetails?.name || 'Unknown',
                    department: task.supervisorDetails?.department || 'Unknown'
                };
            }
            supervisorTaskCount[supervisorId].count++;
            
            console.log(`Task ${doc.id}: assigned to ${task.supervisorDetails?.name || supervisorId}`);
        });
        
        console.log('\nSupervisor Task Counts:');
        Object.entries(supervisorTaskCount).forEach(([supervisorId, data]) => {
            console.log(`${data.supervisorName} (${data.department}): ${data.count} tasks - ID: ${supervisorId}`);
        });
        
    } catch (error) {
        console.error('Error checking assignments:', error);
    }
}

// Run the check
checkSupervisorAssignments()
    .then(() => {
        console.log('\nCheck completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Check failed:', error);
        process.exit(1);
    });
