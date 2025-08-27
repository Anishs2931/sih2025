const express = require("express");
const { login } = require("../auth/login");
const db = require("../firebase");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, and phone are required"
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
    const existingUserEmail = await db.collection('users').where('email', '==', email).get();
    if (!existingUserEmail.empty) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    const phoneWithCountryCode = '91' + phone; 
    const existingUserPhone = await db.collection('users').where('phone', '==', phoneWithCountryCode).get();
    if (!existingUserPhone.empty) {
      return res.status(400).json({
        success: false,
        message: "User with this phone number already exists"
      });
    }


    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password, // Plain text (not secure)
      phone: phoneWithCountryCode,
      address: address?.trim() || '',
      role: 'user',
      createdAt: new Date().toISOString(),
      isActive: true
    };

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

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    if (role === 'user') {
      const userSnapshot = await db.collection('users').where('email', '==', email.toLowerCase().trim()).get();

      if (userSnapshot.empty) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
      }

      const userData = userSnapshot.docs[0].data();

      // Check if user is active (default to true if field doesn't exist)
      if (userData.isActive === false) {
        return res.status(401).json({
          success: false,
          message: "Account is deactivated. Please contact support."
        });
      }

      if (userData.password !== password) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
      }

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

