const express = require('express');
const router = express.Router();
const  db = require('../firebase');

// Get community by user email
router.get('/community/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const userSnap = await db.collection('users').where('email', '==', email).get();
    if (userSnap.empty) return res.json({ community: null });
    const userData = userSnap.docs[0].data();
    if (!userData.communityId) return res.json({ community: null });
    const commSnap = await db.collection('community').doc(userData.communityId).get();
    res.json({ community: commSnap.exists ? commSnap.data() : null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch community.' });
  }
});

// Get issues by user email
router.get('/issues/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const issuesSnap = await db.collection('tasks').where('userEmail', '==', email).get();
    const tasks = issuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Transform database task data to match frontend expectations
    const issues = tasks.map(task => ({
      id: task.id,
      title: task.issueType || 'Maintenance Issue',
      description: task.instructions || `${task.issueType} reported`,
      category: mapIssueTypeToCategory(task.issueType),
      priority: 'medium', // Default priority, could be enhanced later
      status: mapStatusToFrontend(task.status),
      location: task.userLocation || 'Location not specified',
      dateReported: formatDate(task.createdAt || new Date().toISOString()),
      technician: task.assigned_technician,
      estimatedTime: task.estimatedTime || null,
      images: [], // Default empty array, could be enhanced later
      floor: task.floor || '',
      sector: task.sector || '',
      instructions: task.instructions || ''
    }));

    res.json({ issues });
  } catch (err) {
    console.error('Error fetching issues:', err);
    res.status(500).json({ error: 'Failed to fetch issues.' });
  }
});

// Helper function to map issue types to categories
function mapIssueTypeToCategory(issueType) {
  if (!issueType) return 'general';
  const type = issueType.toLowerCase();
  if (type.includes('electrical') || type.includes('light') || type.includes('power')) return 'electrical';
  if (type.includes('plumb') || type.includes('water') || type.includes('leak')) return 'plumbing';
  if (type.includes('ac') || type.includes('hvac') || type.includes('air')) return 'hvac';
  if (type.includes('garden') || type.includes('landscape')) return 'landscaping';
  if (type.includes('clean')) return 'cleaning';
  return 'general';
}

// Helper function to map backend status to frontend status
function mapStatusToFrontend(status) {
  if (!status) return 'pending';
  const statusLower = status.toLowerCase();
  if (statusLower.includes('report')) return 'pending';
  if (statusLower.includes('assign') || statusLower.includes('progress')) return 'in-progress';
  if (statusLower.includes('complet') || statusLower.includes('resolv')) return 'completed';
  return 'pending';
}

// Helper function to format date
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  } catch (err) {
    return new Date().toISOString().split('T')[0];
  }
}

// Get notifications by user email
router.get('/notifications/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const notifSnap = await db.collection('notifications').where('userEmail', '==', email).get();
    const notifications = notifSnap.docs.map(doc => doc.data());
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

module.exports = router;
