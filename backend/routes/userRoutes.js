// Get user by email

const express = require("express");
const db=require('../firebase');
const router = express.Router();

router.get('/email/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const userSnap = await db.collection('users').where('email', '==', email.toLowerCase()).get();

    if (userSnap.empty) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        user: null
      });
    }

    const userData = userSnap.docs[0].data();
    const userId = userSnap.docs[0].id;

    res.json({
      success: true,
      user: {
        id: userId,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        address: userData.address,
        role: userData.role,
        isActive: userData.isActive !== false,
        createdAt: userData.createdAt
      }
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user.'
    });
  }
});

// Update user phone number
router.post('/update-phone', async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email || !phone) {
      return res.status(400).json({ error: 'Email and phone are required' });
    }

    // Find user by email
    const userSnap = await db.collection('users').where('email', '==', email).get();

    if (userSnap.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update phone number
    const userDoc = userSnap.docs[0];
    await userDoc.ref.update({ phone: phone });

    res.json({ success: true, message: 'Phone number updated successfully' });
  } catch (err) {
    console.error('Error updating phone:', err);
    res.status(500).json({ error: 'Failed to update phone number' });
  }
});

router.post("/check-community", async (req, res) => {
  try {
    const { email } = req.body;
    const userSnap = await db.collection('users').where('email', '==', email).get();
    if (userSnap.empty) {
      return res.json({ inCommunity: false });
    }
    const user = userSnap.docs[0].data();
    if (user && user.community) {
      res.json({ inCommunity: true, communityId: user.community });
    } else {
      res.json({ inCommunity: false });
    }
  } catch (error) {
    console.error("Assignment error:", error);
    res.status(500).json({ error: "Assignment failed" });
  }
});

router.post("/create-community", async (req, res) => {
  try {    
    const { communityName, address, userName, userEmail, userPhone } = req.body;

    if (!communityName || !address || !userName || !userEmail || !userPhone) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const communityRef = db.collection('communities').doc();
    await communityRef.set({
      name: communityName,
      address: address,
      createdBy: {
        name: userName,
        email: userEmail,
        phone: userPhone
      },
      status:'requested',
      residents:1,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ message: 'Community created successfully', communityId: communityRef.id });
  } catch (error) {     
    console.error('Error creating community:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports=router