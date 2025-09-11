const express = require('express');
const router = express.Router();
const {
    createSupervisor,
    getSupervisorsByMunicipalityAndDepartment,
    getAllSupervisors,
    updateSupervisorStatus,
    getSupervisorById
} = require('../supervisor/supervisorService');

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
