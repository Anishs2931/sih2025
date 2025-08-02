const db = require('./firebase');

async function checkTechnicians() {
  try {
    console.log('Checking all technicians in database...');
    
    const techsSnap = await db.collection('technicians').get();
    console.log(`Total technicians found: ${techsSnap.size}`);
    
    techsSnap.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\nTechnician ${index + 1}:`);
      console.log(`ID: ${doc.id}`);
      console.log(`Name: ${data.name}`);
      console.log(`Email: ${data.email}`);
      console.log(`Status: ${data.status}`);
      console.log(`Skills: ${JSON.stringify(data.skills)}`);
      console.log(`Job: ${data.job || 'Not set'}`);
      console.log(`Location: ${JSON.stringify(data.location)}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error checking technicians:', error);
  }
}

checkTechnicians();
