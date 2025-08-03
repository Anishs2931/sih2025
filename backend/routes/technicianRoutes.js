const express = require("express");
const { assignTechnician } = require("../technician/assignTechnician");
const db = require('../firebase');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } 
});

router.get('/test', (req, res) => {
  res.json({ message: 'Technician routes working!' });
});

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

router.get('/tasks/:technicianId', async (req, res) => {
  try {
    const technicianId = req.params.technicianId;
    console.log('Fetching tasks for technician:', technicianId);

    const allTasksSnap = await db.collection('tasks').get();
    console.log('Total tasks in database:', allTasksSnap.size);

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

    const sortedTasks = tasks.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const statusOrder = { 'assigned': 3, 'ongoing': 2, 'pending': 1, 'completed': 0 };

      const statusDiff = (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
      if (statusDiff !== 0) return statusDiff;

      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    console.log('Returning sorted tasks:', sortedTasks.length);
    res.json({ tasks: sortedTasks });
  } catch (error) {
    console.error('Error fetching technician tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

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

module.exports = router;