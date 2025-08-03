const express = require("express");
const { assignTechnician } = require("../technician/assignTechnician");
const db = require('../firebase');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();



// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize Gemini AI
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Technician routes working!' });
});

// Get technician profile by email
router.get('/profile/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const technicianSnap = await db.collection('technicians').where('email', '==', email).get();

    if (technicianSnap.empty) {
      return res.status(404).json({ error: 'Technician profile not found' });
    }

    const technicianDoc = technicianSnap.docs[0];
    const technician = {
      id: technicianDoc.id,
      ...technicianDoc.data()
    };

    res.json({ technician });
  } catch (error) {
    console.error('Error fetching technician profile:', error);
    res.status(500).json({ error: 'Failed to fetch technician profile' });
  }
});

router.post("/assign", async (req, res) => {
  try {
    const { taskId, issueType, userLocation } = req.body;
    const result = await assignTechnician(taskId, issueType, userLocation);
    res.json(result);
  } catch (error) {
    console.error("Assignment error:", error);
    res.status(500).json({ error: "Assignment failed" });
  }
});

router.post('/update-task-status', async (req, res) => {
  try {
    const { taskId, newStatus } = req.body;

    if (!taskId || !newStatus) {
      return res.status(400).json({ error: 'taskId and newStatus are required.' });
    }

    // Update task document
    await db.collection('tasks').doc(taskId).update({
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({ message: `Task ${taskId} status updated to ${newStatus}` });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get tasks assigned to a technician
router.get('/tasks/:technicianId', async (req, res) => {
  try {
    const technicianId = req.params.technicianId;
    console.log('Fetching tasks for technician:', technicianId);

    // First, let's get all tasks to see what's available
    const allTasksSnap = await db.collection('tasks').get();
    console.log('Total tasks in database:', allTasksSnap.size);

    // Get tasks assigned to this technician
    const tasksSnap = await db.collection('tasks').where('assigned_technician', '==', technicianId).get();
    console.log('Tasks assigned to technician:', tasksSnap.size);

    const tasks = tasksSnap.docs.map(doc => {
      const data = doc.data();
      console.log('Task data:', data);
      return {
        id: doc.id,
        ...data
      };
    });

    // Sort by priority and urgency
    const sortedTasks = tasks.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const statusOrder = { 'assigned': 3, 'ongoing': 2, 'pending': 1, 'completed': 0 };

      // First sort by status
      const statusDiff = (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
      if (statusDiff !== 0) return statusDiff;

      // Then by priority
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;

      // Finally by creation time
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    console.log('Returning sorted tasks:', sortedTasks.length);
    res.json({ tasks: sortedTasks });
  } catch (error) {
    console.error('Error fetching technician tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Initiate a task
router.post('/task/:taskId/initiate', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const { technicianId } = req.body;

    await db.collection('tasks').doc(taskId).update({
      status: 'ongoing',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Task initiated successfully' });
  } catch (error) {
    console.error('Error initiating task:', error);
    res.status(500).json({ error: 'Failed to initiate task' });
  }
});

// Update task status
router.put('/task/:taskId/status', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const { status, technicianId, completedAt } = req.body;

    const updateData = {
      status: status,
      updatedAt: new Date().toISOString()
    };

    if (completedAt) {
      updateData.completedAt = completedAt;
    }

    await db.collection('tasks').doc(taskId).update(updateData);

    res.json({ success: true, message: `Task ${status} successfully` });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// AI photo verification (temporarily disabled)
/*
router.post('/verify-photo', upload.single('image'), async (req, res) => {
  try {
    const { taskId, photoType, description } = req.body;
    const imageBuffer = req.file.buffer;

    // Get task details
    const taskDoc = await db.collection('tasks').doc(taskId).get();
    if (!taskDoc.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const taskData = taskDoc.data();

    // Convert image to base64 for Gemini
    const base64Image = imageBuffer.toString('base64');

    // Create AI prompt based on photo type and task
    let prompt = '';
    if (photoType === 'before') {
      prompt = `Analyze this "before" photo for a ${taskData.issueType} repair task.
      Task description: ${taskData.instructions}

      Please verify:
      1. Is this photo showing the issue/problem area clearly?
      2. Does the photo match the reported issue type (${taskData.issueType})?
      3. Is the photo quality sufficient for documentation?

      Respond with JSON: {"verified": true/false, "analysis": "detailed analysis", "confidence": 0-100}`;
    } else if (photoType === 'after') {
      prompt = `Analyze this "after" photo for a completed ${taskData.issueType} repair task.
      Task description: ${taskData.instructions}

      Please verify:
      1. Does the photo show the issue has been resolved?
      2. Is the repair work visible and appears complete?
      3. Does the area look properly fixed/cleaned?

      Respond with JSON: {"verified": true/false, "analysis": "detailed analysis", "confidence": 0-100}`;
    } else {
      prompt = `Analyze this progress photo for a ${taskData.issueType} repair task.
      Task description: ${taskData.instructions}

      Please verify:
      1. Does the photo show work in progress?
      2. Is the repair work proceeding appropriately?
      3. Are proper tools/materials visible?

      Respond with JSON: {"verified": true/false, "analysis": "detailed analysis", "confidence": 0-100}`;
    }

    // Call Gemini AI
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: base64Image
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse AI response
    let aiAnalysis;
    try {
      aiAnalysis = JSON.parse(text);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      aiAnalysis = {
        verified: text.toLowerCase().includes('verified') || text.toLowerCase().includes('complete'),
        analysis: text,
        confidence: 75
      };
    }

    // Store photo data in task
    const photoData = {
      id: Date.now().toString(),
      type: photoType,
      description: description,
      timestamp: new Date().toISOString(),
      verified: aiAnalysis.verified,
      aiAnalysis: aiAnalysis.analysis,
      confidence: aiAnalysis.confidence
    };

    // Update task with photo
    await db.collection('tasks').doc(taskId).update({
      [`photos.${photoData.id}`]: photoData,
      updatedAt: new Date().toISOString()
    });

    // Auto-update task status based on verification
    if (photoType === 'before' && aiAnalysis.verified) {
      await db.collection('tasks').doc(taskId).update({
        status: 'ongoing',
        startedAt: new Date().toISOString()
      });
    } else if (photoType === 'after' && aiAnalysis.verified && aiAnalysis.confidence > 70) {
      await db.collection('tasks').doc(taskId).update({
        status: 'completed',
        completedAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      verified: aiAnalysis.verified,
      analysis: aiAnalysis.analysis,
      confidence: aiAnalysis.confidence,
      message: aiAnalysis.verified
        ? `Photo verified successfully! ${photoType === 'after' ? 'Task marked as completed.' : ''}`
        : 'Photo verification failed. Please retake the photo with better clarity.'
    });

  } catch (error) {
    console.error('Error verifying photo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify photo',
      message: 'AI verification service is currently unavailable. Please try again later.'
    });
  }
});
*/

module.exports = router;