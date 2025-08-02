const db=require("../firebase");

async function login(email, password, role) {
  try {
    if (!email || !password || !role) {
      throw new Error("Missing required fields");
    }
    let user;
    if(role==="admin"){
        let admin=await db.collection("admins").where("email", "==", email).get();
        if (admin.empty) {
          throw new Error("Admin not found");
        }
        user = admin.docs[0].data();
    }
    else{
    user=await db.collection("users").where("email", "==", email).get();
    if (user.empty) {
      throw new Error("User not found");
    }
    user = user.docs[0].data();

    }
    const isValid = password === user.password;
    if (!isValid) {
      throw new Error("Invalid password");
    }
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports={login}