const express = require('express');
const router = express.Router();
const {
    createSupervisor,
    getSupervisorsByMunicipalityAndDepartment,
    getAllSupervisors,
    updateSupervisorStatus,
    getSupervisorById
} = require('../supervisor/supervisorService');
const db = require('../firebase');

// Get supervisor tasks
router.get('/tasks/:supervisorId', async (req, res) => {
    try {
        const { supervisorId } = req.params;
        
        const tasksRef = db.collection('tasks');
        const snapshot = await tasksRef
            .where('assignedSupervisor', '==', supervisorId)
            .get();
        
        const tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort tasks by creation date in JavaScript since Firestore composite index isn't set up
        tasks.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA; // Newest first
        });
        
        res.json({
            success: true,
            tasks: tasks
        });
    } catch (error) {
        console.error('Error fetching supervisor tasks:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tasks',
            error: error.message
        });
    }
});

// Get supervisor profile
router.get('/profile/:supervisorId', async (req, res) => {
    try {
        const { supervisorId } = req.params;
        const supervisor = await getSupervisorById(supervisorId);
        
        if (!supervisor) {
            return res.status(404).json({
                success: false,
                message: 'Supervisor not found'
            });
        }
        
        res.json({
            success: true,
            supervisor: supervisor
        });
    } catch (error) {
        console.error('Error fetching supervisor profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile',
            error: error.message
        });
    }
});

// Get supervisor work statistics
router.get('/stats/:supervisorId', async (req, res) => {
    try {
        const { supervisorId } = req.params;
        
        const tasksRef = db.collection('tasks');
        const snapshot = await tasksRef
            .where('assignedSupervisor', '==', supervisorId)
            .get();
        
        const tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.status === 'resolved').length;
        const pendingTasks = tasks.filter(task => task.status === 'pending').length;
        const ongoingTasks = tasks.filter(task => task.status === 'ongoing').length;
        
        // Calculate monthly tasks
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyTasks = tasks.filter(task => {
            const taskDate = new Date(task.createdAt);
            return taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear;
        }).length;
        
        // Calculate completion rate
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        // Calculate weekly tasks
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const tasksThisWeek = tasks.filter(task => new Date(task.createdAt) >= oneWeekAgo).length;
        
        res.json({
            success: true,
            stats: {
                totalTasks,
                completedTasks,
                pendingTasks,
                ongoingTasks,
                monthlyTasks,
                completionRate,
                tasksThisWeek,
                averageResolutionTime: '2.5 days', // Placeholder
                teamRating: '4.5/5' // Placeholder
            }
        });
    } catch (error) {
        console.error('Error fetching supervisor stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
});

// Create a new supervisor
router.post('/create', async (req, res) => {
    try {
        const { name, municipality, department, password, phoneNumber, email, status } = req.body;

        if (!name || !municipality || !department || !password || !phoneNumber || !email) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: name, municipality, department, password, phoneNumber, email'
            });
        }

        const supervisorId = await createSupervisor({
            name,
            municipality,
            department,
            password,
            phoneNumber,
            email,
            status: status || 'active'
        });

        res.status(201).json({
            success: true,
            message: 'Supervisor created successfully',
            supervisorId: supervisorId
        });
    } catch (error) {
        console.error('Error creating supervisor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create supervisor',
            error: error.message
        });
    }
});

// Get all supervisors
router.get('/all', async (req, res) => {
    try {
        const supervisors = await getAllSupervisors();
        res.json({
            success: true,
            data: supervisors
        });
    } catch (error) {
        console.error('Error fetching supervisors:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch supervisors',
            error: error.message
        });
    }
});

// Get supervisors by municipality and department
router.get('/by-location-department', async (req, res) => {
    try {
        const { municipality, department } = req.query;

        if (!municipality || !department) {
            return res.status(400).json({
                success: false,
                message: 'Municipality and department are required'
            });
        }

        const supervisors = await getSupervisorsByMunicipalityAndDepartment(municipality, department);
        res.json({
            success: true,
            data: supervisors
        });
    } catch (error) {
        console.error('Error fetching supervisors by location and department:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch supervisors',
            error: error.message
        });
    }
});

// Update supervisor status
router.put('/status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Valid status is required (active, inactive, suspended)'
            });
        }

        await updateSupervisorStatus(id, status);
        res.json({
            success: true,
            message: 'Supervisor status updated successfully'
        });
    } catch (error) {
        console.error('Error updating supervisor status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update supervisor status',
            error: error.message
        });
    }
});

// Get supervisor by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const supervisor = await getSupervisorById(id);

        if (!supervisor) {
            return res.status(404).json({
                success: false,
                message: 'Supervisor not found'
            });
        }

        res.json({
            success: true,
            data: supervisor
        });
    } catch (error) {
        console.error('Error fetching supervisor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch supervisor',
            error: error.message
        });
    }
});

module.exports = router;
