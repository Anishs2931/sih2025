const { v4: uuidv4 } = require('uuid');
const db = require('../firebase');
const admin = require('firebase-admin');
const { getIssueDepartment } = require('../utils/departmentMapper');
const { getSupervisorsByMunicipalityAndDepartment } = require('../supervisor/supervisorService');

async function addIssue(category, location, reportImages = []){
    const normalizedCategory = category.toString().trim().toLowerCase();
    if(normalizedCategory === 'none' || normalizedCategory.includes('none') || normalizedCategory.includes('no issue')){
      throw new Error('Cannot create issue for "none" category');
    }

    let taskId = uuidv4();
    try{
      let userLocation = typeof location === 'object' ? location.location : location;
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
      
      // Validate required fields
      if (!userLocation || userLocation.trim() === '') {
        throw new Error('User location is required');
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
      let coordinates = null;
      
      if (typeof location === 'object') {
        // Extract municipality
        if (location.municipality) {
          municipality = typeof location.municipality === 'string' 
            ? location.municipality 
            : String(location.municipality);
        } else if (location.location && typeof location.location === 'object' && location.location.municipality) {
          municipality = typeof location.location.municipality === 'string' 
            ? location.location.municipality 
            : String(location.location.municipality);
          // Also update other fields from nested structure
          userLocation = location.location.location || userLocation;
          instructions = location.location.instructions || instructions;
        }

        // Extract state
        if (location.state) {
          state = typeof location.state === 'string' 
            ? location.state 
            : String(location.state);
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
      }

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
      return taskId
    }
    catch(err){
      console.error('Error creating issue:', err);
      throw err; 
    }
}

module.exports={addIssue}

