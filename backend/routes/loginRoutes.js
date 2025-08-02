const express = require("express");
const { login } = require("../auth/login");


const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    let result=await login(email, password, role);
    if(result.success){
      res.json({ success: true });
    }else{
      res.status(401).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

module.exports=router

