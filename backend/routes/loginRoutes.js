const express = require("express");
const { login } = require("../auth/login");
const db = require("../firebase");
const crypto = require("crypto");

const router = express.Router();

// Function to generate unique user ID
function generateUniqueUserId() {
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(4).toString('hex');
  return `QT${timestamp}${randomBytes}`.toUpperCase();
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, address, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, and phone are required"
      });
    }

    // Only citizens can register through the app
    if (role && role !== 'citizen') {
      return res.status(400).json({
        success: false,
        message: "Only citizen accounts can be created through the app. Supervisor and admin accounts must be created by administrators."
      });
    }

    // Set role to citizen by default
    const userRole = 'citizen';

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

    // Check for existing email across ALL collections (citizens, supervisors, admins)
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
    
    // Check for existing phone across ALL collections (citizens, supervisors, admins)
    for (const collection of collections) {
      const existingUserPhone = await db.collection(collection).where('phone', '==', phoneWithCountryCode).get();
      if (!existingUserPhone.empty) {
        return res.status(400).json({
          success: false,
          message: "An account with this phone number already exists"
        });
      }
    }

    // Generate unique user ID
    const uniqueUserId = generateUniqueUserId();
    
    // Check if the generated ID already exists (very unlikely but good practice)
    let isUniqueId = false;
    let attempts = 0;
    let currentUserId = uniqueUserId;
    
    while (!isUniqueId && attempts < 5) {
      let idExists = false;
      for (const collection of collections) {
        const existingId = await db.collection(collection).where('userId', '==', currentUserId).get();
        if (!existingId.empty) {
          idExists = true;
          break;
        }
      }
      
      if (!idExists) {
        isUniqueId = true;
      } else {
        currentUserId = generateUniqueUserId();
        attempts++;
      }
    }

    const userData = {
      userId: currentUserId, // Custom unique ID for the user
      name: name.trim(),
      email: emailLower,
      password: password, // In production, hash this password
      phone: phoneWithCountryCode,
      address: address?.trim() || '',
      role: userRole, // Always 'citizen' for app registrations
      createdAt: new Date().toISOString(),
      isActive: true
    };

    // Store in citizens collection only
    const userRef = await db.collection('citizens').add(userData);

    res.json({
      success: true,
      message: "Registration successful! You can now login as a citizen.",
      userId: currentUserId, // Return the custom user ID
      firebaseId: userRef.id, // Also return Firebase document ID for internal use
      role: userRole
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again."
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and role are required"
      });
    }

    // Validate role
    const validRoles = ['citizen', 'supervisor', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be citizen, supervisor, or admin"
      });
    }

    const result = await login(email, password, role);
    
    if (result.success) {
      res.json({
        success: true,
        message: "Login successful",
        user: result.user
      });
    } else {
      res.status(401).json({ 
        success: false, 
        message: result.message 
      });
    }

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again."
    });
  }
});

module.exports = router;

