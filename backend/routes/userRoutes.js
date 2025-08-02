// Get user by email

const express = require("express");
const db=require('../firebase');
const router = express.Router();

router.get('/email/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const userSnap = await db.collection('users').where('email', '==', email).get();
    if (userSnap.empty) return res.json({ user: null });
    const userData = userSnap.docs[0].data();
    res.json({ user: userData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user.' });
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