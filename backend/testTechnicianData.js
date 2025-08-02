const db = require('./firebase');

async function createTestTechnicianData() {
  try {
    console.log('Creating test technician data...');

    // Create test technicians
    const technicians = [
      {
        id: 'tech_001',
        name: 'Raj Kumar',
        email: 'raj@example.com',
        password: 'password123', // Simple password for testing
        phone: '+91 9876543210',
        skills: ['electrical', 'hvac', 'appliances'],
        location: { lat: 17.4371, lng: 78.4485 },
        status: 'available',
        rating: 4.6,
        totalTasks: 127,
        completedTasks: 120,
        joinedAt: '2024-03-15T10:32:00Z'
      },
      {
        id: 'tech_002',
        name: 'Priya Sharma',
        email: 'priya@example.com',
        password: 'password123', // Simple password for testing
        phone: '+91 9876543211',
        skills: ['plumbing', 'cleaning'],
        location: { lat: 17.4475, lng: 78.4585 },
        status: 'available',
        rating: 4.8,
        totalTasks: 89,
        completedTasks: 85,
        joinedAt: '2024-04-20T14:22:00Z'
      },
      {
        id: 'tech_003',
        name: 'Amit Patel',
        email: 'amit@example.com',
        password: 'password123', // Simple password for testing
        phone: '+91 9876543212',
        skills: ['electrical', 'security'],
        location: { lat: 17.4271, lng: 78.4385 },
        status: 'busy',
        rating: 4.5,
        totalTasks: 156,
        completedTasks: 148,
        joinedAt: '2024-02-10T09:15:00Z'
      }
    ];

    // Add technicians to database
    for (const tech of technicians) {
      await db.collection('technicians').doc(tech.id).set(tech);
      console.log(`Added technician: ${tech.name}`);
    }

    // Create test tasks assigned to technicians
    const tasks = [
      {
        id: 'task_tech_001',
        issueType: 'electrical',
        title: 'Electrical Issue',
        description: 'Light not working in hallway',
        instructions: 'Check wiring and replace bulb if needed',
        priority: 'high',
        status: 'assigned',
        userEmail: 'niveditha@gmail.com',
        userLocation: '17.4375,78.4483',
        floor: '2nd Floor',
        sector: 'A-Block',
        assigned_technician: 'tech_001',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        assignedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        photos: {}
      },
      {
        id: 'task_tech_002',
        issueType: 'hvac',
        title: 'AC Not Cooling',
        description: 'Air conditioner not providing adequate cooling',
        instructions: 'Check refrigerant levels and clean filters',
        priority: 'high',
        status: 'ongoing',
        userEmail: 'test@example.com',
        userLocation: '17.4275,78.4383',
        floor: '3rd Floor',
        sector: 'B-Block',
        assigned_technician: 'tech_001',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        assignedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        photos: {}
      },
      {
        id: 'task_tech_003',
        issueType: 'plumbing',
        title: 'Water Leak',
        description: 'Pipe leaking in bathroom',
        instructions: 'Fix the leaking pipe and check for water damage',
        priority: 'medium',
        status: 'assigned',
        userEmail: 'niveditha@gmail.com',
        userLocation: '17.4375,78.4483',
        floor: '1st Floor',
        sector: 'C-Block',
        assigned_technician: 'tech_002',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        assignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        photos: {}
      },
      {
        id: 'task_tech_004',
        issueType: 'electrical',
        title: 'Power Outlet Issue',
        description: 'Power outlet not working in kitchen',
        instructions: 'Check circuit breaker and outlet wiring',
        priority: 'low',
        status: 'completed',
        userEmail: 'test@example.com',
        userLocation: '17.4275,78.4383',
        floor: '1st Floor',
        sector: 'A-Block',
        assigned_technician: 'tech_001',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        assignedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), // 23 hours ago
        startedAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(), // 22 hours ago
        completedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), // 20 hours ago
        photos: {}
      },
      {
        id: 'task_tech_005',
        issueType: 'cleaning',
        title: 'Deep Cleaning Required',
        description: 'Common area needs deep cleaning',
        instructions: 'Clean and sanitize the common area thoroughly',
        priority: 'medium',
        status: 'assigned',
        userEmail: 'niveditha@gmail.com',
        userLocation: '17.4375,78.4483',
        floor: 'Ground Floor',
        sector: 'Common Area',
        assigned_technician: 'tech_002',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        assignedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        photos: {}
      }
    ];

    // Add tasks to database
    for (const task of tasks) {
      await db.collection('tasks').doc(task.id).set(task);
      console.log(`Added task: ${task.title} (${task.status})`);
    }

    console.log('✅ Test technician data created successfully!');
    console.log('\nTechnicians created:');
    technicians.forEach(tech => {
      console.log(`- ${tech.name} (${tech.id}) - ${tech.skills.join(', ')}`);
    });
    
    console.log('\nTasks created:');
    tasks.forEach(task => {
      console.log(`- ${task.title} (${task.status}) - Assigned to ${task.assigned_technician}`);
    });

  } catch (error) {
    console.error('Error creating test data:', error);
  }
}

// Run the function
createTestTechnicianData();
