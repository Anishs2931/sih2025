const express = require('express');
const router = express.Router();
const { addIssue } = require('../issue/addIssue');

// Test route for issue assignment
router.post('/test-assignment', async (req, res) => {
    try {
        const { issueType, municipality } = req.body;
        
        const testLocation = {
            location: "Test Address, Test Street",
            municipality: municipality || "Hyderabad",
            instructions: "Test issue for supervisor assignment",
            email: "test@example.com"
        };
        
        const taskId = await addIssue(issueType || "electrical", testLocation);
        
        res.json({
            success: true,
            message: "Test issue created successfully",
            taskId: taskId
        });
    } catch (error) {
        console.error('Test assignment error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get task details by ID
router.get('/task/:taskId', async (req, res) => {
    try {
        const db = require('../firebase');
        const { taskId } = req.params;
        
        const taskDoc = await db.collection('tasks').doc(taskId).get();
        
        if (!taskDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        
        const taskData = taskDoc.data();
        
        // If supervisor is assigned, get supervisor details
        if (taskData.assigned_supervisor) {
            const { getSupervisorById } = require('../supervisor/supervisorService');
            const supervisor = await getSupervisorById(taskData.assigned_supervisor);
            taskData.supervisor_details = supervisor;
        }
        
        res.json({
            success: true,
            data: {
                id: taskId,
                ...taskData
            }
        });
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
