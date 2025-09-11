// Test coordinate processing fix
const testLocationData = {
  location: {
    lat: '17.5031504',
    lng: '78.4800627'
  },
  userEmail: 'citizen@gmail.com'
};

console.log('Testing coordinate processing...');
console.log('Input:', JSON.stringify(testLocationData, null, 2));

// Simulate the fixed logic
let userLocation = '';
let coordinates = null;

if (typeof testLocationData.location === 'object' && testLocationData.location.lat && testLocationData.location.lng) {
  coordinates = { lat: testLocationData.location.lat, lng: testLocationData.location.lng };
  userLocation = ''; // Will be filled by geocoding
  console.log('✅ Coordinates extracted for geocoding:', coordinates);
} else {
  console.log('❌ No coordinates found');
}

console.log('Final coordinates variable:', coordinates);
console.log('Initial userLocation:', userLocation);

// Simulate municipality extraction from geocoding (mock result)
const municipality = 'Hyderabad';
const state = 'Telangana';

if (municipality && state && (!userLocation || userLocation.trim() === '')) {
  userLocation = `${municipality}, ${state}`;
  console.log('✅ Updated userLocation from geocoding:', userLocation);
}
