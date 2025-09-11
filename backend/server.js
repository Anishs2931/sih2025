const express = require("express");
const cors = require("cors");
require('dotenv').config(); // Load environment variables first
const issueRoutes = require('./routes/issueRoutes.js');
const loginRoutes = require("./routes/loginRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const userDataRoutes = require("./routes/userDataRoutes.js");
const twilioRoutes = require("./routes/twilioRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");
const locationRoutes = require("./routes/locationRoutes.js");
const supervisorRoutes = require("./routes/supervisorRoutes.js");
const taskRoutes = require("./routes/taskRoutes.js");
const testRoutes = require("./routes/testRoutes.js");
const imageRoutes = require("./routes/imageRoutes.js");
const uploadRoutes = require("./routes/uploadRoutes.js");
const whatsappRoutes = require("./routes/whatsappRoutes.js");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/issue", issueRoutes);
app.use("/api/user", userRoutes);
app.use("/api/auth", loginRoutes);
app.use("/api/userData", userDataRoutes);
app.use("/api/twilio", twilioRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/supervisor", supervisorRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/test", testRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/whatsapp", whatsappRoutes);

app.get('/ping', (req, res) => {
  res.json({ message: 'Backend is alive!' });
});


const PORT = 3000;
const HOST = '0.0.0.0'; // Listen on all interfaces
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
