const { v4: uuidv4 } = require('uuid');
const db = require('../firebase');
const admin = require('firebase-admin');
const axios = require('axios');
const { getIssueDepartment } = require('../utils/departmentMapper');
const { getSupervisorsByMunicipalityAndDepartment } = require('../supervisor/supervisorService');

async function addIssue(category, location, reportImages = []){
    const normalizedCategory = category.toString().trim().toLowerCase();
    if(normalizedCategory === 'none' || normalizedCategory.includes('none') || normalizedCategory.includes('no issue')){
      throw new Error('Cannot create issue for "none" category');
    }

    let taskId = uuidv4();
    try{
      // Handle userLocation extraction more carefully
      let userLocation = '';
      let coordinates = null; // Store coordinates for reverse geocoding
      if (typeof location === 'string') {
        userLocation = location;
      } else if (typeof location === 'object') {
        if (typeof location.location === 'string') {
          userLocation = location.location;
        } else if (typeof location.userLocation === 'string') {
          userLocation = location.userLocation;
        } else if (location.location && typeof location.location === 'object' && (location.location.lat && location.location.lng)) {
          // Handle coordinate objects - don't convert to string yet, keep coordinates for geocoding
          coordinates = { lat: location.location.lat, lng: location.location.lng };
          userLocation = ''; // Will be filled by geocoding
          console.log('🗺️ Found coordinates, will use reverse geocoding:', coordinates);
        } else {
          userLocation = ''; // Will be filled by geocoding or fallback
        }
      }
      
      let floor = typeof location === 'object' ? (location.floor || '') : '';
      let sector = typeof location === 'object' ? (location.sector || '') : '';
      let instructions = typeof location === 'object' ? (location.instructions || '') : '';
      let userEmail = '';
      
      // Extract userEmail from different possible locations - be very thorough
      if (location.email) {
        userEmail = location.email;
        console.log('📧 Found email at location.email:', userEmail);
      } else if (location.userEmail) {
        userEmail = location.userEmail;
        console.log('📧 Found email at location.userEmail:', userEmail);
      } else if (location.location && typeof location.location === 'object') {
        if (location.location.userEmail) {
          userEmail = location.location.userEmail;
          console.log('📧 Found email at location.location.userEmail:', userEmail);
        } else if (location.location.email) {
          userEmail = location.location.email;
          console.log('📧 Found email at location.location.email:', userEmail);
        }
      }
      
      // Debug: log all possible email fields
      console.log('🔍 Email extraction debug:');
      console.log('  location.email:', location.email);
      console.log('  location.userEmail:', location.userEmail);
      console.log('  location.location?.userEmail:', location.location?.userEmail);
      console.log('  location.location?.email:', location.location?.email);
      console.log('  Final extracted email:', userEmail);
      
      // Also extract instructions from nested structure if available
      if (location.location && typeof location.location === 'object' && location.location.instructions) {
        instructions = location.location.instructions;
      }
      
      // Ensure userLocation is a string
      if (typeof userLocation !== 'string') {
        userLocation = userLocation ? String(userLocation) : '';
      }
      
      // Ensure userEmail is a string
      if (typeof userEmail !== 'string') {
        userEmail = userEmail ? String(userEmail) : '';
      }
      
      // Validate required fields - userLocation can be empty if we have coordinates for geocoding
      if (!userLocation || userLocation.trim() === '') {
        console.log('⚠️ No userLocation string provided, will rely on geocoding for address');
      }
      
      // Make email optional for testing, use default if not provided
      if (!userEmail || userEmail.trim() === '') {
        userEmail = 'anonymous@example.com'; // Default email for testing
        console.log('⚠️ No user email provided, using default value');
      } else {
        console.log('✅ User email found:', userEmail);
      }
      
      // Handle nested location structure from detectIssue and extract location data
      let municipality = '';
      let state = '';
      // coordinates variable already declared above
      
      if (typeof location === 'object') {
        // Extract municipality - prioritize direct municipality field
        if (location.municipality) {
          municipality = typeof location.municipality === 'string' 
            ? location.municipality 
            : String(location.municipality);
          console.log('📍 Using direct municipality from location.municipality:', municipality);
        } else if (location.location && typeof location.location === 'object' && location.location.municipality) {
          municipality = typeof location.location.municipality === 'string' 
            ? location.location.municipality 
            : String(location.location.municipality);
          // Only update userLocation if it's a string (not coordinates object)
          if (location.location.location && typeof location.location.location === 'string') {
            userLocation = location.location.location;
          }
          if (location.location.instructions && typeof location.location.instructions === 'string') {
            instructions = location.location.instructions;
          }
        }

        // Extract state - prioritize direct state field
        if (location.state) {
          state = typeof location.state === 'string' 
            ? location.state 
            : String(location.state);
          console.log('🏛️ Using direct state from location.state:', state);
        } else if (location.location && typeof location.location === 'object' && location.location.state) {
          state = typeof location.location.state === 'string' 
            ? location.location.state 
            : String(location.location.state);
        }

        // Extract coordinates for fallback location lookup
        if (location.coordinates) {
          coordinates = location.coordinates;
        } else if (location.location && location.location.coordinates) {
          coordinates = location.location.coordinates;
        } else if (location.location && location.location.lat && location.location.lng) {
          // Handle lat/lng format
          coordinates = { lat: location.location.lat, lng: location.location.lng };
        }
      }

      // Ensure municipality and state are strings
      if (typeof municipality !== 'string') {
        municipality = municipality ? String(municipality) : '';
      }
      if (typeof state !== 'string') {
        state = state ? String(state) : '';
      }

      // If municipality or state is missing, try to extract from userLocation string
      if ((!municipality || municipality.trim() === '' || !state || state.trim() === '') && userLocation) {
        if (typeof userLocation === 'string') {
          console.log('🌍 Attempting to extract location data from userLocation string:', userLocation);
          
          // Parse userLocation string to extract municipality and state
        const locationParts = userLocation.split(',').map(part => part.trim());
        
        if (!municipality || municipality.trim() === '') {
          // Look for municipality in the location string (usually the larger city name)
          for (let i = 0; i < Math.min(locationParts.length, 4); i++) {
            const part = locationParts[i];
            if (part && part.length > 2 && !part.match(/^\d+$/) && 
                !part.toLowerCase().includes('nagar') && 
                !part.toLowerCase().includes('road') &&
                !part.toLowerCase().includes('street')) {
              municipality = part;
              console.log('📍 Extracted municipality from location string:', municipality);
              break;
            }
          }
        }

        if (!state || state.trim() === '') {
          // Look for Indian state names in the location string
          const indianStates = [
            'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
            'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
            'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
            'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
            'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
            'West Bengal', 'Delhi'
          ];
          
          for (const stateName of indianStates) {
            if (userLocation.toLowerCase().includes(stateName.toLowerCase())) {
              state = stateName;
              console.log('🏛️ Extracted state from location string:', state);
              break;
            }
          }
        }
        } else {
          console.log('🚫 userLocation is not a string, skipping string parsing. Type:', typeof userLocation, 'Value:', userLocation);
        }
      }

      // If municipality or state is still missing and we have coordinates, try reverse geocoding
      if ((!municipality || municipality.trim() === '' || !state || state.trim() === '') && 
          ((location && location.location && location.location.lat && location.location.lng) || 
           (coordinates && coordinates.lat && coordinates.lng))) {
        
        const coordsToUse = coordinates || location.location;
        console.log('🌍 Attempting reverse geocoding for coordinates:', coordsToUse);
        
        try {
          const axios = require('axios');
          const lat = parseFloat(coordsToUse.lat);
          const lng = parseFloat(coordsToUse.lng);
          
          // Use OpenStreetMap Nominatim API for reverse geocoding (free alternative to Google)
          const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
            params: {
              format: 'json',
              lat: lat,
              lon: lng,
              addressdetails: 1,
              zoom: 10
            },
            headers: {
              'User-Agent': 'Fixify-Infrastructure-App/1.0'
            }
          });
          
          if (response.data && response.data.address) {
            const address = response.data.address;
            console.log('🗺️ Reverse geocoding result:', JSON.stringify(address, null, 2));
            
            // Extract municipality (city, town, or village)
            if (!municipality || municipality.trim() === '') {
              const municipalityValue = address.city || address.town || address.village || 
                           address.suburb || address.neighbourhood || '';
              console.log('🔍 Geocoding municipality extraction:');
              console.log('  Raw municipalityValue:', municipalityValue, 'Type:', typeof municipalityValue);
              municipality = typeof municipalityValue === 'string' ? municipalityValue : String(municipalityValue || '');
              console.log('  Final municipality after conversion:', municipality, 'Type:', typeof municipality);
              if (municipality) {
                console.log('📍 Extracted municipality from geocoding:', municipality);
              }
            }
            
            // Extract state
            if (!state || state.trim() === '') {
              const stateValue = address.state || address.state_district || '';
              state = typeof stateValue === 'string' ? stateValue : String(stateValue || '');
              if (state) {
                console.log('🏛️ Extracted state from geocoding:', state);
              }
            }
            
            // If we still don't have municipality, use the city from display_name
            if ((!municipality || municipality.trim() === '') && response.data.display_name) {
              const displayParts = response.data.display_name.split(',').map(p => p.trim());
              // Try to find a city-like name in the display name
              for (const part of displayParts.slice(1, 4)) { // Skip first part (usually street)
                if (part && part.length > 2 && !part.match(/^\d+$/)) {
                  municipality = part;
                  console.log('📍 Extracted municipality from display_name:', municipality);
                  break;
                }
              }
            }
          }
        } catch (geocodeError) {
          console.error('❌ Reverse geocoding failed:', geocodeError.message);
          // Continue with fallback values
        }
      }

      // Update userLocation if we got municipality and state from geocoding
      if (municipality && state && (!userLocation || userLocation.trim() === '')) {
        userLocation = `${municipality}, ${state}`;
        console.log('📍 Updated userLocation from geocoding:', userLocation);
      }

      // If we still don't have municipality or state, use fallback values based on coordinates
      if ((!municipality || municipality.trim() === '' || !state || state.trim() === '') && 
          location && location.location && 
          location.location.lat && location.location.lng) {
        
        const lat = parseFloat(location.location.lat);
        const lng = parseFloat(location.location.lng);
        
        // Basic fallback based on coordinate ranges for major Indian cities
        if (!municipality || municipality.trim() === '') {
          if (lat >= 17.3 && lat <= 17.6 && lng >= 78.2 && lng <= 78.7) {
            municipality = 'Hyderabad';
            if (!state || state.trim() === '') state = 'Telangana';
          } else if (lat >= 28.4 && lat <= 28.8 && lng >= 76.8 && lng <= 77.4) {
            municipality = 'New Delhi';
            if (!state || state.trim() === '') state = 'Delhi';
          } else if (lat >= 19.0 && lat <= 19.3 && lng >= 72.7 && lng <= 73.1) {
            municipality = 'Mumbai';
            if (!state || state.trim() === '') state = 'Maharashtra';
          } else if (lat >= 12.8 && lat <= 13.2 && lng >= 77.4 && lng <= 77.8) {
            municipality = 'Bangalore';
            if (!state || state.trim() === '') state = 'Karnataka';
          } else if (lat >= 13.0 && lat <= 13.2 && lng >= 80.1 && lng <= 80.4) {
            municipality = 'Chennai';
            if (!state || state.trim() === '') state = 'Tamil Nadu';
          } else {
            // Generic fallback
            municipality = 'Unknown City';
            if (!state || state.trim() === '') state = 'Unknown State';
          }
          console.log('🎯 Used coordinate-based fallback - Municipality:', municipality, 'State:', state);
        }
      }

      // Debug municipality value before string conversion
      console.log('🔍 Pre-conversion check - Municipality:', municipality, 'Type:', typeof municipality);
      console.log('🔍 Pre-conversion check - State:', state, 'Type:', typeof state);

      // Ensure municipality and state are proper strings before final validation
      municipality = typeof municipality === 'string' ? municipality : String(municipality || '');
      state = typeof state === 'string' ? state : String(state || '');
      
      console.log('🔍 Final type check - Municipality type:', typeof municipality, 'Value:', municipality);
      console.log('🔍 Final type check - State type:', typeof state, 'Value:', state);

      // Final validation - municipality and state are now mandatory
      if (!municipality || municipality.trim() === '') {
        throw new Error('Municipality is required. Please provide a valid location.');
      }
      
      if (!state || state.trim() === '') {
        throw new Error('State is required. Please provide a valid location with state information.');
      }

      // Clean up municipality and state values
      municipality = municipality.trim();
      state = state.trim();
      
      // Debug logging
      console.log('🔍 DEBUG addIssue:');
      console.log('  Category:', category);
      console.log('  Location object:', JSON.stringify(location, null, 2));
      console.log('  Extracted municipality:', municipality);
      console.log('  Extracted state:', state);
      console.log('  Municipality type:', typeof municipality);
      console.log('  State type:', typeof state);
      console.log('  User location:', userLocation);
      console.log('  Instructions:', instructions);
      console.log('  User email:', userEmail);
      console.log('  Report images count:', reportImages.length);
      
      // Determine the department based on issue type
      const department = getIssueDepartment(category);
      console.log('  Mapped to department:', department);
      
      // Find available supervisors for this municipality and department
      let assignedSupervisor = null;
      let issueStatus = "pending"; // Default status when no supervisor available
      
      console.log('🔍 Supervisor assignment check:');
      console.log('  Municipality for query:', municipality);
      console.log('  State for query:', state);
      console.log('  Department for query:', department);
      console.log('  Municipality is truthy:', !!municipality);
      console.log('  State is truthy:', !!state);
      
      if (municipality) {
        try {
          console.log('  Querying supervisors...');
          const availableSupervisors = await getSupervisorsByMunicipalityAndDepartment(municipality, department);
          console.log('  Found supervisors:', availableSupervisors.length);
          
          if (availableSupervisors.length > 0) {
            // Assign to the first available supervisor (you can implement load balancing here)
            assignedSupervisor = availableSupervisors[0].id;
            issueStatus = "assigned"; // Use lowercase for consistency
            console.log(`✅ Issue assigned to supervisor: ${availableSupervisors[0].name} (${department} dept, ${municipality})`);
          } else {
            console.log(`❌ No active supervisors found for ${department} department in ${municipality}. Issue marked as pending.`);
          }
        } catch (supervisorError) {
          console.error('💥 Error finding supervisors:', supervisorError);
          // Continue with pending status if supervisor lookup fails
        }
      } else {
        console.log('❌ No municipality provided, cannot assign supervisor');
      }

      const currentTimestamp = admin.firestore.Timestamp.now();
      const currentTime = currentTimestamp.toDate().toISOString(); // Keep ISO string for legacy support
      
      const task = {
        // Basic issue information (required fields)
        issueType: category.toLowerCase().trim(),
        department: department.toLowerCase().trim(),
        userLocation: userLocation.trim(),
        municipality: municipality.trim(),
        state: state.trim(),
        instructions: instructions ? instructions.trim() : '',
        userEmail: userEmail.trim(),
        created_at: currentTimestamp, // Firestore Timestamp for queries
        createdAt: currentTime,       // ISO string for legacy support
        
        // Optional location details
        floor: floor ? floor.trim() : '',
        sector: sector ? sector.trim() : '',
        
        // Status and assignment (only supervisor needed)
        status: issueStatus,
        priority: 'medium',
        assigned_supervisor: assignedSupervisor || '',
        assigned_at: assignedSupervisor ? currentTimestamp : null,
        assignedAt: assignedSupervisor ? currentTime : '',
        estimatedTime: '',
        
        // Image tracking for different stages (all start as empty arrays)
        report_images: reportImages || [],
        initiation_images: [],
        finished_images: [],
        bill_images: [],
        
        // Legacy support (deprecated, use specific image arrays above)
        pictureIds: reportImages || []
      };
      
      // Validate all required fields are not empty
      const requiredFields = ['issueType', 'department', 'userLocation', 'municipality', 'userEmail', 'createdAt', 'status', 'priority'];
      for (const field of requiredFields) {
        if (!task[field] || task[field].toString().trim() === '') {
          throw new Error(`Required field '${field}' is missing or empty`);
        }
      }
      
      console.log('✅ Creating task with schema:', {
        taskId,
        issueType: task.issueType,
        department: task.department,
        municipality: task.municipality,
        state: task.state,
        userEmail: task.userEmail,
        status: task.status,
        assigned_supervisor: task.assigned_supervisor,
        reportImagesCount: task.report_images.length
      });

      await db.collection("tasks").doc(taskId).set(task);
      
      // Send WhatsApp notifications after successful task creation
      try {
        await sendIssueCreatedNotifications(taskId, task);
      } catch (notificationError) {
        console.log('Failed to send WhatsApp notifications:', notificationError.message);
        // Don't fail the issue creation if notifications fail
      }
      
      return taskId
    }
    catch(err){
      console.error('Error creating issue:', err);
      throw err; 
    }
}

// =====================
// WhatsApp Notification Function
// =====================

async function sendIssueCreatedNotifications(taskId, taskData) {
  try {
    const baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://your-api-domain.com' 
      : 'http://localhost:3000';

    // Notify user about issue registration
    if (taskData.userEmail && taskData.userEmail !== 'anonymous@example.com') {
      try {
        // Get technician name if assigned
        let technicianName = 'To be assigned';
        let eta = 'TBD';
        
        if (taskData.assigned_technician) {
          const techDoc = await db.collection('technicians').doc(taskData.assigned_technician).get();
          if (techDoc.exists) {
            const techData = techDoc.data();
            technicianName = techData.name || 'Assigned';
            eta = 'Within 2-4 hours'; // Default ETA
          }
        }

        await axios.post(`${baseURL}/api/whatsapp/notify-issue-created`, {
          userEmail: taskData.userEmail,
          issueId: taskId,
          category: taskData.category,
          description: taskData.instructions || `${taskData.category} issue detected`,
          technicianName: technicianName,
          eta: eta
        });

        console.log(`✅ WhatsApp notification sent to user: ${taskData.userEmail}`);
      } catch (error) {
        console.log(`Failed to notify user ${taskData.userEmail}:`, error.message);
      }
    }

    // Notify assigned technician
    if (taskData.assigned_technician) {
      try {
        const techDoc = await db.collection('technicians').doc(taskData.assigned_technician).get();
        if (techDoc.exists) {
          const techData = techDoc.data();
          
          await axios.post(`${baseURL}/api/whatsapp/notify-technician-assignment`, {
            technicianEmail: techData.email,
            issueId: taskId,
            category: taskData.category,
            description: taskData.instructions || `${taskData.category} issue reported`,
            userPhone: 'Contact via app', // For privacy, don't share user phone directly
            address: taskData.userLocation,
            priority: taskData.priority || 'normal'
          });

          console.log(`✅ WhatsApp notification sent to technician: ${techData.email}`);
        }
      } catch (error) {
        console.log(`Failed to notify technician:`, error.message);
      }
    }

    // Notify assigned supervisor
    if (taskData.assigned_supervisor) {
      try {
        const supDoc = await db.collection('users').doc(taskData.assigned_supervisor).get();
        if (supDoc.exists) {
          const supData = supDoc.data();
          
          await axios.post(`${baseURL}/api/whatsapp/notify-supervisor-task`, {
            supervisorEmail: supData.email,
            taskId: taskId,
            technicianName: 'To be assigned',
            issueCount: 1,
            area: taskData.userLocation,
            action: 'created'
          });

          console.log(`✅ WhatsApp notification sent to supervisor: ${supData.email}`);
        }
      } catch (error) {
        console.log(`Failed to notify supervisor:`, error.message);
      }
    }

  } catch (error) {
    console.error('Error in sendIssueCreatedNotifications:', error);
    throw error;
  }
}

module.exports={addIssue}

