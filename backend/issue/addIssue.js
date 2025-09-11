const { v4: uuidv4 } = require('uuid');
const db = require('../firebase');
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
      
      // Handle nested location structure from detectIssue
      let municipality = '';
      if (typeof location === 'object') {
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
      }
      
      // Ensure municipality is a string and validate
      if (typeof municipality !== 'string') {
        municipality = municipality ? String(municipality) : '';
      }
      
      // For now, make municipality optional with a default value
      if (!municipality || municipality.trim() === '') {
        municipality = 'Unknown'; // Default value instead of throwing error
        console.log('⚠️ No municipality provided, using default value');
      }
      
      // Debug logging
      console.log('🔍 DEBUG addIssue:');
      console.log('  Category:', category);
      console.log('  Location object:', JSON.stringify(location, null, 2));
      console.log('  Extracted municipality:', municipality);
      console.log('  Municipality type:', typeof municipality);
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
      console.log('  Department for query:', department);
      console.log('  Municipality is truthy:', !!municipality);
      
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

      const currentTime = new Date().toISOString();
      
      const task = {
        // Basic issue information (required fields)
        issueType: category.toLowerCase().trim(),
        department: department.toLowerCase().trim(),
        userLocation: userLocation.trim(),
        municipality: municipality.trim(),
        instructions: instructions ? instructions.trim() : '',
        userEmail: userEmail.trim(),
        createdAt: currentTime,
        
        // Optional location details
        floor: floor ? floor.trim() : '',
        sector: sector ? sector.trim() : '',
        
        // Status and assignment (only supervisor needed)
        status: issueStatus,
        priority: 'medium',
        assigned_supervisor: assignedSupervisor || '',
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

