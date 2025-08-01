const express = require("express");
const { assignTechnician } = require("./assignTechnician");

const router = express.Router();

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
module.exports = router;