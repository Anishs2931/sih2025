const db=require("../firebase");

async function login(email, password, role) {
  try {
    if (!email || !password || !role) {
      throw new Error("Missing required fields");
    }
    
    let user;
    let userId;
    
    if(role === "admin"){
        let admin = await db.collection("admins").where("email", "==", email.toLowerCase().trim()).get();
        if (admin.empty) {
          throw new Error("Admin not found");
        }
        user = admin.docs[0].data();
        userId = admin.docs[0].id;
    }
    else if(role === "supervisor"){
        let supervisor = await db.collection("supervisors").where("email", "==", email.toLowerCase().trim()).get();
        if (supervisor.empty) {
          throw new Error("Supervisor not found");
        }
        user = supervisor.docs[0].data();
        userId = supervisor.docs[0].id;
    }
    else if(role === "citizen"){
        let citizen = await db.collection("citizens").where("email", "==", email.toLowerCase().trim()).get();
        if (citizen.empty) {
          throw new Error("Citizen not found");
        }
        user = citizen.docs[0].data();
        userId = citizen.docs[0].id;
    }
    else {
        throw new Error("Invalid role specified");
    }

    // Check if user is active (default to true if field doesn't exist)
    if (user.isActive === false) {
      throw new Error("Account is deactivated. Please contact support.");
    }

    const isValid = password === user.password;
    if (!isValid) {
      throw new Error("Invalid password");
    }

    return { 
      success: true, 
      user: {
        id: userId, // Firebase document ID
        userId: user.userId || `LEGACY_${userId}`, // Custom unique user ID (fallback for existing users)
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address || '',
        role: user.role || role,
        createdAt: user.createdAt || new Date().toISOString()
      }
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports={login}