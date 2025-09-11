const { createSupervisor } = require('../supervisor/supervisorService');

// Temporary supervisor records for testing
const tempSupervisors = [
    // Hyderabad Supervisors
    {
        name: "Rajesh Kumar",
        municipality: "Hyderabad",
        department: "electrical",
        password: "password123",
        phoneNumber: "+91-9876543210",
        email: "rajesh.electrical@hyderabad.gov.in",
        status: "active"
    },
    {
        name: "Priya Sharma",
        municipality: "Hyderabad",
        department: "water",
        password: "password123",
        phoneNumber: "+91-9876543211",
        email: "priya.water@hyderabad.gov.in",
        status: "active"
    },
    {
        name: "Anil Reddy",
        municipality: "Hyderabad",
        department: "infrastructure",
        password: "password123",
        phoneNumber: "+91-9876543212",
        email: "anil.infrastructure@hyderabad.gov.in",
        status: "active"
    },
    {
        name: "Sunita Devi",
        municipality: "Hyderabad",
        department: "sanitation",
        password: "password123",
        phoneNumber: "+91-9876543213",
        email: "sunita.sanitation@hyderabad.gov.in",
        status: "active"
    },
    
    // Mumbai Supervisors
    {
        name: "Vikram Patil",
        municipality: "Mumbai",
        department: "electrical",
        password: "password123",
        phoneNumber: "+91-9876543214",
        email: "vikram.electrical@mumbai.gov.in",
        status: "active"
    },
    {
        name: "Meera Joshi",
        municipality: "Mumbai",
        department: "water",
        password: "password123",
        phoneNumber: "+91-9876543215",
        email: "meera.water@mumbai.gov.in",
        status: "active"
    },
    {
        name: "Ravi Shah",
        municipality: "Mumbai",
        department: "infrastructure",
        password: "password123",
        phoneNumber: "+91-9876543216",
        email: "ravi.infrastructure@mumbai.gov.in",
        status: "active"
    },
    
    // Delhi Supervisors
    {
        name: "Amit Singh",
        municipality: "New Delhi",
        department: "electrical",
        password: "password123",
        phoneNumber: "+91-9876543217",
        email: "amit.electrical@delhi.gov.in",
        status: "active"
    },
    {
        name: "Kavita Agarwal",
        municipality: "New Delhi",
        department: "water",
        password: "password123",
        phoneNumber: "+91-9876543218",
        email: "kavita.water@delhi.gov.in",
        status: "active"
    },
    {
        name: "Rohit Gupta",
        municipality: "New Delhi",
        department: "infrastructure",
        password: "password123",
        phoneNumber: "+91-9876543219",
        email: "rohit.infrastructure@delhi.gov.in",
        status: "active"
    },
    
    // Bangalore Supervisors
    {
        name: "Deepak Nair",
        municipality: "Bangalore",
        department: "electrical",
        password: "password123",
        phoneNumber: "+91-9876543220",
        email: "deepak.electrical@bangalore.gov.in",
        status: "active"
    },
    {
        name: "Lakshmi Rao",
        municipality: "Bangalore",
        department: "sanitation",
        password: "password123",
        phoneNumber: "+91-9876543221",
        email: "lakshmi.sanitation@bangalore.gov.in",
        status: "active"
    },
    
    // General departments for various cities
    {
        name: "Suresh Verma",
        municipality: "Hyderabad",
        department: "general",
        password: "password123",
        phoneNumber: "+91-9876543222",
        email: "suresh.general@hyderabad.gov.in",
        status: "active"
    },
    {
        name: "Anita Kumari",
        municipality: "Mumbai",
        department: "environment",
        password: "password123",
        phoneNumber: "+91-9876543223",
        email: "anita.environment@mumbai.gov.in",
        status: "active"
    },
    {
        name: "Manish Tiwari",
        municipality: "New Delhi",
        department: "security",
        password: "password123",
        phoneNumber: "+91-9876543224",
        email: "manish.security@delhi.gov.in",
        status: "active"
    }
];

async function createTempSupervisors() {
    console.log('Creating temporary supervisor records...');
    
    for (const supervisor of tempSupervisors) {
        try {
            const supervisorId = await createSupervisor(supervisor);
            console.log(`✅ Created supervisor: ${supervisor.name} (${supervisor.department}, ${supervisor.municipality}) - ID: ${supervisorId}`);
        } catch (error) {
            console.error(`❌ Failed to create supervisor ${supervisor.name}:`, error.message);
        }
    }
    
    console.log('Temporary supervisor creation completed!');
}

// Export for use in other modules
module.exports = {
    createTempSupervisors,
    tempSupervisors
};

// Run directly if this file is executed
if (require.main === module) {
    createTempSupervisors().then(() => {
        console.log('Script completed successfully');
        process.exit(0);
    }).catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}
