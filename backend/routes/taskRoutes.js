const express = require('express');
const router = express.Router();
const db = require('../firebase');
const { assignTechnician } = require('../technician/assignTechnician');
const axios = require('axios');

// Get task by ID
router.get('/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        
        const taskDoc = await db.collection('tasks').doc(taskId).get();
        
        if (!taskDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        
        const taskData = { id: taskDoc.id, ...taskDoc.data() };
        
        // Get technician details if assigned
        if (taskData.assigned_technician) {
            try {
                const techDoc = await db.collection('technicians').doc(taskData.assigned_technician).get();
                if (techDoc.exists) {
                    const techData = techDoc.data();
                    taskData.technicianName = techData.name;
                    taskData.technicianPhone = techData.phone;
                }
            } catch (techError) {
                console.log('Could not fetch technician details:', techError);
            }
        }
        
        res.json({
            success: true,
            task: taskData
        });
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch task',
            error: error.message
        });
    }
});

// Update task status with workflow validation and photo handling
router.put('/:taskId/status', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status, supervisorId, imageId, imageType } = req.body;
        
        if (!status || !supervisorId) {
            return res.status(400).json({
                success: false,
                message: 'Status and supervisorId are required'
            });
        }
        
        const validStatuses = ['pending', 'ongoing', 'resolved'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: pending, ongoing, or resolved'
            });
        }

        // Get current task data
        const taskDoc = await db.collection('tasks').doc(taskId).get();
        if (!taskDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const currentTask = taskDoc.data();
        const currentStatus = (currentTask.status || 'pending').toLowerCase();
        const newStatus = status.toLowerCase();

        // Validate workflow progression (only allow forward movement)
        const statusProgression = {
            'pending': ['ongoing'],
            'assigned': ['ongoing'],
            'ongoing': ['resolved'],
            'resolved': []
        };

        if (currentStatus !== newStatus && !statusProgression[currentStatus]?.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: `Cannot change status from ${currentStatus} to ${newStatus}. Only forward progression is allowed.`
            });
        }

        // Check photo requirements for status changes
        const requiresPhoto = (
            (currentStatus === 'pending' && newStatus === 'ongoing') ||
            (currentStatus === 'assigned' && newStatus === 'ongoing') ||
            (currentStatus === 'ongoing' && newStatus === 'resolved')
        );

        if (requiresPhoto && !imageId) {
            return res.status(400).json({
                success: false,
                message: `A photo is required when changing status from ${currentStatus} to ${newStatus}`
            });
        }
        
        const updateData = {
            status: status,
            updatedAt: new Date().toISOString(),
            lastUpdatedBy: supervisorId
        };

        // Handle image storage based on type
        if (imageId) {
            if (imageType === 'initiation' || newStatus === 'ongoing') {
                // Add to initiation images
                const initiationImages = currentTask.initiation_images || [];
                initiationImages.push(imageId);
                updateData.initiation_images = initiationImages;
                updateData.workStartedAt = new Date().toISOString();
            } else if (imageType === 'completion' || newStatus === 'resolved') {
                // Add to finished images
                const finishedImages = currentTask.finished_images || [];
                finishedImages.push(imageId);
                updateData.finished_images = finishedImages;
                updateData.resolvedAt = new Date().toISOString();
            }
        }

        // Add completion timestamp if resolving
        if (status === 'resolved') {
            updateData.resolvedAt = new Date().toISOString();
        }

        // Add work start timestamp if starting work
        if (status === 'ongoing' && !currentTask.workStartedAt) {
            updateData.workStartedAt = new Date().toISOString();
        }

        await db.collection('tasks').doc(taskId).update(updateData);
        
        // Send WhatsApp notifications based on status change
        try {
            await sendStatusChangeNotifications(taskId, currentStatus, newStatus, currentTask);
        } catch (notificationError) {
            console.log('Failed to send WhatsApp notifications:', notificationError.message);
            // Don't fail the request if notifications fail
        }
        
        res.json({
            success: true,
            message: `Task status updated to ${status}`,
            photoUploaded: !!imageId
        });
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update task status',
            error: error.message
        });
    }
});

// Add supervisor note to task
router.post('/:taskId/notes', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { note, supervisorId, supervisorName } = req.body;
        
        if (!note || !supervisorId || !supervisorName) {
            return res.status(400).json({
                success: false,
                message: 'Note, supervisorId, and supervisorName are required'
            });
        }
        
        const taskRef = db.collection('tasks').doc(taskId);
        const taskDoc = await taskRef.get();
        
        if (!taskDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        
        const currentData = taskDoc.data();
        const existingNotes = currentData.supervisorNotes || [];
        
        const newNote = {
            note: note,
            addedBy: supervisorName,
            addedById: supervisorId,
            addedAt: new Date().toISOString()
        };
        
        await taskRef.update({
            supervisorNotes: [...existingNotes, newNote],
            updatedAt: new Date().toISOString()
        });
        
        res.json({
            success: true,
            message: 'Note added successfully'
        });
    } catch (error) {
        console.error('Error adding supervisor note:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add note',
            error: error.message
        });
    }
});

// Assign technician to task
router.post('/:taskId/assign-technician', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { supervisorId } = req.body;
        
        if (!supervisorId) {
            return res.status(400).json({
                success: false,
                message: 'SupervisorId is required'
            });
        }
        
        // Get task details
        const taskDoc = await db.collection('tasks').doc(taskId).get();
        
        if (!taskDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        
        const taskData = taskDoc.data();
        
        // Check if technician is already assigned
        if (taskData.assigned_technician) {
            return res.status(400).json({
                success: false,
                message: 'Technician is already assigned to this task'
            });
        }
        
        // Use existing assignTechnician function
        const assignmentResult = await assignTechnician(
            taskId,
            taskData.issueType || taskData.category || 'general',
            taskData.location
        );
        
        if (assignmentResult.assigned) {
            // Update task with assignment info
            await db.collection('tasks').doc(taskId).update({
                status: 'ongoing',
                updatedAt: new Date().toISOString(),
                assignedBy: supervisorId
            });
            
            res.json({
                success: true,
                message: 'Technician assigned successfully',
                assignment: assignmentResult
            });
        } else {
            res.json({
                success: false,
                message: 'No available technician found for this task'
            });
        }
    } catch (error) {
        console.error('Error assigning technician:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign technician',
            error: error.message
        });
    }
});

// Get all tasks with filtering options
router.get('/', async (req, res) => {
    try {
        const { status, supervisorId, municipality, department } = req.query;
        
        let query = db.collection('tasks');
        
        // Apply one filter at a time to avoid composite index requirements
        if (supervisorId) {
            query = query.where('assignedSupervisor', '==', supervisorId);
        } else if (status) {
            query = query.where('status', '==', status);
        } else if (municipality) {
            query = query.where('municipality', '==', municipality);
        } else if (department) {
            query = query.where('department', '==', department);
        }
        
        const snapshot = await query.get();
        
        let tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        
        // Apply additional filters in JavaScript if needed
        if (supervisorId && status) {
            tasks = tasks.filter(task => task.status === status);
        }
        if (supervisorId && municipality) {
            tasks = tasks.filter(task => task.municipality === municipality);
        }
        if (supervisorId && department) {
            tasks = tasks.filter(task => task.department === department);
        }
        
        // Sort by creation date in JavaScript
        tasks.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA; // Newest first
        });
        
        res.json({
            success: true,
            tasks: tasks,
            count: tasks.length
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tasks',
            error: error.message
        });
    }
});

// =====================
// WhatsApp Notification Functions
// =====================

async function sendStatusChangeNotifications(taskId, oldStatus, newStatus, taskData) {
    try {
        const baseURL = process.env.NODE_ENV === 'production' 
            ? 'https://your-api-domain.com' 
            : 'http://localhost:3000';

        // Get technician details
        let technicianData = null;
        if (taskData.assigned_technician) {
            const techDoc = await db.collection('technicians').doc(taskData.assigned_technician).get();
            if (techDoc.exists) {
                technicianData = techDoc.data();
            }
        }

        // Get supervisor details
        let supervisorData = null;
        if (taskData.supervisorId) {
            const supDoc = await db.collection('users').doc(taskData.supervisorId).get();
            if (supDoc.exists) {
                supervisorData = supDoc.data();
            }
        }

        // Notify based on status transition
        if (oldStatus === 'pending' && newStatus === 'ongoing') {
            // Work started - notify supervisor
            if (supervisorData?.email) {
                await axios.post(`${baseURL}/api/whatsapp/notify-supervisor-task`, {
                    supervisorEmail: supervisorData.email,
                    taskId: taskId,
                    technicianName: technicianData?.name || 'Unknown',
                    issueCount: taskData.issueIds?.length || 0,
                    area: taskData.area || 'Unknown',
                    action: 'started'
                });
            }

            // Notify users in the task's issues (if any)
            if (taskData.issueIds?.length > 0) {
                for (const issueId of taskData.issueIds) {
                    try {
                        const issueDoc = await db.collection('issues').doc(issueId).get();
                        if (issueDoc.exists) {
                            const issueData = issueDoc.data();
                            await axios.post(`${baseURL}/api/whatsapp/notify-work-started`, {
                                userEmail: issueData.userEmail,
                                issueId: issueId,
                                technicianName: technicianData?.name || 'Unknown',
                                technicianPhone: technicianData?.phone || 'Contact via app'
                            });
                        }
                    } catch (error) {
                        console.log(`Failed to notify user for issue ${issueId}:`, error.message);
                    }
                }
            }
        }

        if (oldStatus === 'ongoing' && newStatus === 'resolved') {
            // Work completed - notify supervisor for approval
            if (supervisorData?.email) {
                await axios.post(`${baseURL}/api/whatsapp/notify-supervisor-task`, {
                    supervisorEmail: supervisorData.email,
                    taskId: taskId,
                    technicianName: technicianData?.name || 'Unknown',
                    issueCount: taskData.issueIds?.length || 0,
                    area: taskData.area || 'Unknown',
                    action: 'completed'
                });
            }

            // Notify users about completion
            if (taskData.issueIds?.length > 0) {
                for (const issueId of taskData.issueIds) {
                    try {
                        const issueDoc = await db.collection('issues').doc(issueId).get();
                        if (issueDoc.exists) {
                            const issueData = issueDoc.data();
                            const completionPhotoUrl = taskData.finished_images?.length > 0 
                                ? `${baseURL}/api/images/${taskData.finished_images[0]}`
                                : null;
                            
                            await axios.post(`${baseURL}/api/whatsapp/notify-work-completed`, {
                                userEmail: issueData.userEmail,
                                issueId: issueId,
                                technicianName: technicianData?.name || 'Unknown',
                                completionPhotoUrl: completionPhotoUrl,
                                workSummary: `${taskData.category || 'General'} work completed successfully.`
                            });
                        }
                    } catch (error) {
                        console.log(`Failed to notify user for issue ${issueId}:`, error.message);
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error in sendStatusChangeNotifications:', error);
        throw error;
    }
}

// Add bill image to task
router.post('/:taskId/bill-image', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { imageId, supervisorEmail } = req.body;

        if (!imageId) {
            return res.status(400).json({
                success: false,
                message: 'ImageId is required'
            });
        }

        // Get current task data
        const taskDoc = await db.collection('tasks').doc(taskId).get();
        
        if (!taskDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const taskData = taskDoc.data();
        const currentBillImages = taskData.bill_images || [];
        
        // Add new image ID to bill_images array
        const updatedBillImages = [...currentBillImages, imageId];

        // Update task with new bill image
        await db.collection('tasks').doc(taskId).update({
            bill_images: updatedBillImages,
            lastUpdated: new Date().toISOString(),
            billUploadedBy: supervisorEmail || 'supervisor'
        });

        console.log(`💰 Added bill image ${imageId} to task ${taskId}`);

        res.json({
            success: true,
            message: 'Bill image added successfully',
            imageId: imageId,
            totalBillImages: updatedBillImages.length
        });

    } catch (error) {
        console.error('Error adding bill image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add bill image',
            error: error.message
        });
    }
});

module.exports = router;
