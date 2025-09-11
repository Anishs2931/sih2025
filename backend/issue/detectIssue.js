const {vision} =require('../aiPipeline/vision')
const {addIssue}=require("../issue/addIssue")

async function detect(imageBuffer, location) {
    console.log('🔍 DEBUG detectIssue:');
    console.log('  Input location:', JSON.stringify(location, null, 2));
    
    if (location && typeof location.location === 'string') {
      try {
        location.location = JSON.parse(location.location);
        console.log('  Parsed location.location from string');
      } catch (e) {
        console.log('  Failed to parse location.location:', e.message);
      }
    }
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
        console.log('  Parsed entire location from string');
      } catch (e) {
        console.log('  Failed to parse location:', e.message);
      }
    }
    
    console.log('  Final location object:', JSON.stringify(location, null, 2));
    try {
      let category = await vision(imageBuffer);

      const normalizedCategory = category.toString().trim().toLowerCase();

      if(normalizedCategory === 'none' || normalizedCategory.includes('none') || normalizedCategory.includes('no issue')){
        return {
          success: false,
          noIssueDetected: true,
          message: 'No maintenance problem detected. Please capture an image showing clear signs of damage, malfunction, or issues that need repair.',
          category: 'none'
        };
      }


      let taskId = await addIssue(category, location, []); // Pass empty array for report_images initially

      const db = require('../firebase');
      const taskDoc = await db.collection('tasks').doc(taskId).get();
      const taskData = taskDoc.exists ? taskDoc.data() : null;

      const result = {
        success: true,
        taskId: taskId,
        issueDetails: {
          id: taskId,
          category: category,
          issueType: category,
          title: `${category.charAt(0).toUpperCase() + category.slice(1)} Issue`,
          description: taskData?.instructions || `${category} issue reported via image detection`,
          status: taskData?.status || 'pending',
          location: taskData?.userLocation || 'Location captured',
          floor: taskData?.floor || '',
          sector: taskData?.sector || '',
          instructions: taskData?.instructions || '',
          dateReported: new Date().toISOString().split('T')[0],
          createdAt: taskData?.createdAt || new Date().toISOString(),
          priority: taskData?.priority || 'medium',
          userEmail: taskData?.userEmail || location.userEmail,
          assigned_supervisor: taskData?.assigned_supervisor || null
        },
        message: `${category.charAt(0).toUpperCase() + category.slice(1)} issue detected and reported successfully! ${taskData?.assigned_supervisor ? 'Supervisor has been assigned.' : 'Issue is pending supervisor assignment.'}`
      };

      return result;
    } catch (err) {
      console.error('Error in detectIssue:', err);
      return {
        success: false,
        error: err.message || err,
        message: 'Failed to process issue. Please try again.'
      };
    }
}
module.exports = { detect };
