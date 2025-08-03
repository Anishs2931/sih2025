const express = require("express");
const { login } = require("../auth/login");
const db = require("../firebase");
const bcrypt = require("bcrypt");

const router = express.Router();

// User Registration
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    // Validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, and phone are required"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address"
      });
    }

    // Validate phone number (should be 10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit phone number"
      });
    }

    // Check if user already exists
    const existingUserEmail = await db.collection('users').where('email', '==', email).get();
    if (!existingUserEmail.empty) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Check if phone number already exists
    const phoneWithCountryCode = '91' + phone; // Add India country code
    const existingUserPhone = await db.collection('users').where('phone', '==', phoneWithCountryCode).get();
    if (!existingUserPhone.empty) {
      return res.status(400).json({
        success: false,
        message: "User with this phone number already exists"
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user document
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phoneWithCountryCode, // Store with country code for WhatsApp
      address: address?.trim() || '',
      role: 'user',
      createdAt: new Date().toISOString(),
      isActive: true
    };

    // Save to database
    const userRef = await db.collection('users').add(userData);



    res.json({
      success: true,
      message: "Registration successful! You can now login.",
      userId: userRef.id
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again."
    });
  }
});

// User Login
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // For user login, use our custom logic instead of the generic login function
    if (role === 'user') {
      // Find user by email
      const userSnapshot = await db.collection('users').where('email', '==', email.toLowerCase().trim()).get();

      if (userSnapshot.empty) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
      }

      const userData = userSnapshot.docs[0].data();

      // Check if user is active
      if (!userData.isActive) {
        return res.status(401).json({
          success: false,
          message: "Account is deactivated. Please contact support."
        });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, userData.password);

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
      }

      // Login successful

      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: userSnapshot.docs[0].id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          address: userData.address,
          role: userData.role
        }
      });

    } else {
      // For other roles (technician, admin), use existing login function
      let result = await login(email, password, role);
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(401).json({ success: false, message: result.message });
      }
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

