const express = require("express");
const cors = require("cors");
const technician = require("./technician/routes");

const app = express();
app.use(cors());
app.use(express.json());  

app.use("/technician",technician);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
