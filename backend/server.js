const express = require("express");
const cors = require("cors");
const technicianRoutes = require("./routes/technicianRoutes.js");
const issueRoutes = require('./routes/issueRoutes.js');
const loginRoutes = require("./routes/loginRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const userDataRoutes = require("./routes/userDataRoutes.js");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/technician", technicianRoutes);
app.use("/api/issue", issueRoutes);
app.use("/api/user", userRoutes);
app.use("/api/auth", loginRoutes);
app.use("/api/userData", userDataRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
