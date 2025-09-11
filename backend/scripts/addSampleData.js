const db = require('../firebase');
const admin = require('firebase-admin');

// Sample data for generating random issues
const departments = ['Water Supply', 'Road Maintenance', 'Waste Management', 'Electricity', 'Parks & Recreation'];
const municipalities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'];
const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal'];
const statuses = ['pending', 'assigned', 'ongoing', 'completed'];
const issueTypes = ['Pothole', 'Water Leak', 'Broken Streetlight', 'Garbage Collection', 'Park Maintenance', 'Road Damage', 'Drain Blockage'];

const userEmails = [
  'user1@example.com',
  'user2@example.com', 
  'user3@example.com',
  'user4@example.com',
  'user5@example.com'
];

const supervisorIds = [
  'supervisor-001',
  'supervisor-002', 
  'supervisor-003',
  'supervisor-004',
  'supervisor-005'
];

// Function to generate random date within last N days
function getRandomDate(daysBack) {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysBack);
  const randomDate = new Date(now.getTime() - (randomDays * 24 * 60 * 60 * 1000));
  return admin.firestore.Timestamp.fromDate(randomDate);
}

// Function to get random element from array
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Function to create a sample issue
function createSampleIssue(index) {
  const createdAt = getRandomDate(30); // Issues from last 30 days
  const status = getRandomElement(statuses);
  const department = getRandomElement(departments);
  const municipality = getRandomElement(municipalities);
  const state = getRandomElement(states);
  
  const issue = {
    userEmail: getRandomElement(userEmails),
    issue: getRandomElement(issueTypes),
    department: department,
    location: `${municipality}, ${state}`,
    municipality: municipality,
    state: state,
    floor: Math.floor(Math.random() * 10).toString(),
    sector: `Sector ${Math.floor(Math.random() * 20) + 1}`,
    instructions: `Sample issue #${index + 1} - ${getRandomElement(issueTypes)} reported by citizen`,
    status: status,
    created_at: createdAt, // Use Firestore Timestamp
    createdAt: createdAt.toDate().toISOString(),   // Keep ISO string for compatibility
    priority: getRandomElement(['low', 'medium', 'high']),
    assigned_supervisor: status !== 'pending' ? getRandomElement(supervisorIds) : null,
    report_images: [`sample-image-${index + 1}-report`],
    pictureIds: [`sample-image-${index + 1}-report`], // Legacy support
  };

  // Add status-specific fields
  if (status === 'ongoing' || status === 'completed') {
    const initiatedTimestamp = getRandomDate(7);
    issue.initiatedAt = initiatedTimestamp.toDate().toISOString();
    issue.initiation_images = [`sample-image-${index + 1}-initiation`];
  }

  if (status === 'completed') {
    const completedTimestamp = getRandomDate(3);
    issue.completedAt = completedTimestamp.toDate().toISOString();
    issue.finished_images = [`sample-image-${index + 1}-finished`];
    
    // 50% chance of having bill images
    if (Math.random() > 0.5) {
      issue.bill_images = [`sample-image-${index + 1}-bill`];
      issue.billsUploadedAt = getRandomDate(1).toDate().toISOString();
    }
  }

  return issue;
}

// Function to add sample supervisors
async function addSampleSupervisors() {
  console.log('Adding sample supervisors...');
  
  const supervisors = [
    {
      id: 'supervisor-001',
      name: 'Rajesh Kumar',
      department: 'Water Supply',
      phoneNumber: '+91-9876543210',
      email: 'rajesh.kumar@municipality.gov.in',
      municipality: 'Mumbai',
      state: 'Maharashtra'
    },
    {
      id: 'supervisor-002', 
      name: 'Priya Sharma',
      department: 'Road Maintenance',
      phoneNumber: '+91-9876543211',
      email: 'priya.sharma@municipality.gov.in',
      municipality: 'Delhi',
      state: 'Delhi'
    },
    {
      id: 'supervisor-003',
      name: 'Amit Patel',
      department: 'Waste Management', 
      phoneNumber: '+91-9876543212',
      email: 'amit.patel@municipality.gov.in',
      municipality: 'Bangalore',
      state: 'Karnataka'
    },
    {
      id: 'supervisor-004',
      name: 'Sunita Reddy',
      department: 'Electricity',
      phoneNumber: '+91-9876543213', 
      email: 'sunita.reddy@municipality.gov.in',
      municipality: 'Chennai',
      state: 'Tamil Nadu'
    },
    {
      id: 'supervisor-005',
      name: 'Vikram Singh',
      department: 'Parks & Recreation',
      phoneNumber: '+91-9876543214',
      email: 'vikram.singh@municipality.gov.in', 
      municipality: 'Kolkata',
      state: 'West Bengal'
    }
  ];

  for (const supervisor of supervisors) {
    const { id, ...supervisorData } = supervisor;
    await db.collection('supervisors').doc(id).set(supervisorData);
    console.log(`✅ Added supervisor: ${supervisor.name}`);
  }
}

// Main function to add sample data
async function addSampleData() {
  try {
    console.log('🚀 Starting to add sample data...');
    
    // Add supervisors first
    await addSampleSupervisors();
    
    // Add sample issues
    console.log('\nAdding sample issues...');
    const numberOfIssues = 25; // Create 25 sample issues
    
    for (let i = 0; i < numberOfIssues; i++) {
      const issue = createSampleIssue(i);
      const docRef = await db.collection('tasks').add(issue);
      console.log(`✅ Added issue ${i + 1}/${numberOfIssues}: ${issue.issue} (${issue.status}) - ID: ${docRef.id}`);
    }

    console.log('\n🎉 Sample data added successfully!');
    console.log(`📊 Created ${numberOfIssues} sample issues`);
    console.log('📈 Analytics dashboard should now show data');
    
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  }
}

// Run the script
if (require.main === module) {
  addSampleData().then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { addSampleData };
