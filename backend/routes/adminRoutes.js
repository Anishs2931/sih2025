const express = require("express");
const db = require("../firebase");

const router = express.Router();

// Admin route to create supervisor/admin accounts
router.post("/create-privileged-account", async (req, res) => {
  try {
    const { name, email, password, phone, address, role, adminKey } = req.body;

    // Simple admin key check (in production, use proper authentication)
    if (adminKey !== "admin123") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Invalid admin key."
      });
    }

    if (!name || !email || !password || !phone || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, phone, and role are required"
      });
    }

    // Validate role
    const validRoles = ['supervisor', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be supervisor or admin"
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address"
      });
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit phone number"
      });
    }

    // Check for existing email across ALL collections
    const collections = ['citizens', 'supervisors', 'admins'];
    const emailLower = email.toLowerCase().trim();
    
    for (const collection of collections) {
      const existingUserEmail = await db.collection(collection).where('email', '==', emailLower).get();
      if (!existingUserEmail.empty) {
        return res.status(400).json({
          success: false,
          message: "An account with this email already exists"
        });
      }
    }

    const phoneWithCountryCode = '91' + phone; 
    
    // Check for existing phone across ALL collections
    for (const collection of collections) {
      const existingUserPhone = await db.collection(collection).where('phone', '==', phoneWithCountryCode).get();
      if (!existingUserPhone.empty) {
        return res.status(400).json({
          success: false,
          message: "An account with this phone number already exists"
        });
      }
    }

    const userData = {
      name: name.trim(),
      email: emailLower,
      password: password, // In production, hash this password
      phone: phoneWithCountryCode,
      address: address?.trim() || '',
      role: role,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    // Store in appropriate collection
    const collectionName = role === 'supervisor' ? 'supervisors' : 'admins';
    const userRef = await db.collection(collectionName).add(userData);

    res.json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully!`,
      userId: userRef.id,
      role: role
    });

  } catch (error) {
    console.error("Privileged account creation error:", error);
    res.status(500).json({
      success: false,
      message: "Account creation failed. Please try again."
    });
  }
});

module.exports = router;
