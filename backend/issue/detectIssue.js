const { assignTechnician } =require('../technician/assignTechnician')
const {vision} =require('../aiPipeline/vision')
const {addIssue}=require("../issue/addIssue")

async function detect(imageBuffer, location) {
    // If location is an object with a stringified location field, parse it
    if (location && typeof location.location === 'string') {
      try {
        location.location = JSON.parse(location.location);
      } catch (e) {
        // If not JSON, keep as string
      }
    }
    // Also handle top-level string location
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        // If not JSON, keep as string
      }
    }
    console.log(location)
    try {
      let category = await vision(imageBuffer);
      let taskId = await addIssue(category, location);
      let assignmentResult = await assignTechnician(taskId, category, location.location || location);

      // Get the created issue details from database
      const db = require('../firebase');
      const taskDoc = await db.collection('tasks').doc(taskId).get();
      const taskData = taskDoc.exists ? taskDoc.data() : null;

      // Format ETA for display
      const formatETA = (etaSeconds) => {
        if (!etaSeconds) return 'Unknown';
        const minutes = Math.round(etaSeconds / 60);
        if (minutes < 60) return `${minutes} minutes`;
        const hours = Math.round(minutes / 60);
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      };

      // Create comprehensive response
      const result = {
        success: true,
        taskId: taskId,
        issueDetails: {
          id: taskId,
          category: category,
          issueType: category,
          title: `${category.charAt(0).toUpperCase() + category.slice(1)} Issue`,
          description: taskData?.instructions || `${category} issue reported via image detection`,
          status: taskData?.status || 'Reported',
          location: taskData?.userLocation || 'Location captured',
          floor: taskData?.floor || '',
          sector: taskData?.sector || '',
          instructions: taskData?.instructions || '',
          dateReported: new Date().toISOString().split('T')[0],
          createdAt: taskData?.createdAt || new Date().toISOString(),
          priority: taskData?.priority || 'medium',
          userEmail: taskData?.userEmail || location.userEmail
        },
        assignment: {
          assigned: assignmentResult.assigned,
          technicianId: assignmentResult.technicianId || null,
          technicianDetails: assignmentResult.technicianDetails || null,
          eta: assignmentResult.assigned ? formatETA(assignmentResult.eta_seconds) : null,
          etaSeconds: assignmentResult.eta_seconds || null
        },
        message: assignmentResult.assigned
          ? `Issue detected as ${category}. Technician ${assignmentResult.technicianDetails?.name || 'assigned'} will arrive in ${formatETA(assignmentResult.eta_seconds)}.`
          : `Issue detected as ${category}. No technician available at the moment. Your request has been queued.`
      };

      return result;
    } catch (err) {
      console.log(err);
      return {
        success: false,
        error: err.message || err,
        message: 'Failed to process issue. Please try again.'
      };
    }
}
module.exports = { detect };
