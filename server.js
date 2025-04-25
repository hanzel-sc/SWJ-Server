const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const db = require("./config/db");
const app = express();
require("dotenv").config();

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use(express.static("uploads"));

// Routes
const projectRoutes = require("./routes/projects");
app.use("/api/projects", projectRoutes);

const dashboardRoutes = require("./routes/dashboard");
app.use("/api/dashboard", dashboardRoutes);


// Start Server
const PORT = process.env.PORT || 5004;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
