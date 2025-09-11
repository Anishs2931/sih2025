// Quick test to verify our fixes
const testMessages = [
  'hi',
  'hello',
  'Hyderabad, Telangana',
  'Mumbai, Maharashtra',
  'Bangalore',
  'Delhi'
];

console.log('Testing location validation...\n');

testMessages.forEach(message => {
  const municipalityStatePattern = /^([a-zA-Z\s]+)(?:,\s*([a-zA-Z\s]+))?$/;
  const municipalityStateMatch = message.match(municipalityStatePattern);
  
  if (municipalityStateMatch && message.length <= 50) {
    const parts = message.split(',').map(p => p.trim());
    let municipality = parts[0];
    let state = parts[1] || '';
    
    const municipalityLower = municipality.toLowerCase();
    const stateLower = state.toLowerCase();
    
    const isMunicipality = municipality.length >= 4 && /^[a-zA-Z\s]+$/.test(municipality);
    const isState = !state || /^[a-zA-Z\s]+$/.test(state);
    
    if (isMunicipality && isState && municipality.length >= 3) {
      console.log(`✅ "${message}" -> Valid location: ${municipality}, ${state}`);
    } else {
      console.log(`❌ "${message}" -> Invalid location (too short or invalid format)`);
    }
  } else {
    console.log(`❌ "${message}" -> Doesn't match location pattern`);
  }
});

console.log('\nTesting greeting detection...\n');

testMessages.forEach(message => {
  const commonGreetings = ['hi', 'hello', 'hey', 'hii', 'helo', 'hlw', 'good morning', 'good evening', 'namaste'];
  const isGreeting = commonGreetings.some(greeting => 
    message.toLowerCase().trim() === greeting || 
    message.toLowerCase().includes(greeting) && message.length <= 15
  );
  
  if (isGreeting) {
    console.log(`👋 "${message}" -> Detected as greeting`);
  } else {
    console.log(`📍 "${message}" -> Not a greeting, could be location`);
  }
});
