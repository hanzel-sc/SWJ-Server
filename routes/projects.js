const express = require("express");
const router = express.Router();
const db = require("../config/db");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const util = require("util");

// Convert db.query to return Promises
const query = util.promisify(db.query).bind(db);

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });


// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Get All Projects with Files
router.get("/", (req, res) => {
    const sql = `
        SELECT p.*, f.File_path, f.File_type, f.File_size 
        FROM Projects p
        LEFT JOIN Files f ON p.Project_ID = f.Project_ID
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Database error occurred.");
        }
        // Fix file path to be accessible from frontend
        results.forEach(project => {
            if (project.File_path) {
                project.File_path = project.File_path ? `${req.protocol}://${req.get("host")}${project.File_path}` : null;
            }
        });
        console.log("API Response:", results);
        res.json(results);
    });
});

// Create New Project with Optional File
router.post("/", (req, res) => {
    const { Project_name, Project_desc, User_ID } = req.body;

    if (!Project_name || !Project_desc || !User_ID) {
        return res.status(400).send("Missing required fields.");
    }

        if (req.files && req.files.file) {
            // If a file is uploaded
            const file = req.files.file;
            const fileName = Date.now() + "_" + file.name;
            const uploadPath = path.join(uploadDir, fileName);
            const relativePath = `/uploads/${fileName}`;
            const fullPath = `${req.protocol}://${req.get("host")}${relativePath}`;

            file.mv(uploadPath, (err) => {
                if (err) {
                    console.error("File upload error:", err);
                    return res.status(500).send("Error uploading file.");
                }

              const sql = "INSERT INTO Projects (Project_name, Project_desc, User_ID) VALUES (?, ?, ?)";
              db.query(sql, [Project_name, Project_desc, User_ID], (err, result) => {
              if (err) return res.status(500).send(err);

                const projectId = result.insertId;
                const fileSql = "INSERT INTO Files (Project_ID, File_desc, File_type, File_path, File_size) VALUES (?, ?, ?, ?, ?)";
                db.query(fileSql, [projectId, "Uploaded file", "Audio", uploadPath, file.size], (err) => {
                if (err) return res.status(500).send(err);
                res.json({ message: "Project and file added!", projectId });
    });
});

        });
    }
});

// Delete Project and Associated Files
router.delete("/:id", (req, res) => {
    const projectId = req.params.id;

    // Find and delete associated files first
    const fileSql = "SELECT File_path FROM Files WHERE Project_ID = ?";
    db.query(fileSql, [projectId], (err, files) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Error fetching files.");
        }

        files.forEach(file => {
            const filePath = path.join(__dirname, "..", "uploads", path.basename(file.File_path));
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Delete file from server
            }
        });

        // Delete file records from DB
        db.query("DELETE FROM Files WHERE Project_ID = ?", [projectId], (err) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).send("Error deleting file records.");
            }

            // Delete project record from DB
            db.query("DELETE FROM Projects WHERE Project_ID = ?", [projectId], (err) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).send("Error deleting project.");
                }
                res.json({ message: "Project and files deleted!" });
            });
        });
    });
});

//Rename Project
router.put("/:id", (req, res) => {
    const projectId = req.params.id;
    const { Project_name } = req.body;

    if (!Project_name.trim()) {
        return res.status(400).send("Project name cannot be empty.");
    }

    const query = "UPDATE Projects SET Project_name = ? WHERE Project_ID = ?";
    db.query(query, [Project_name, projectId], (err) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Error renaming project.");
        }
        res.send("Project renamed successfully.");
    });
});

// Upload new file to existing project
router.post("/:id/files", upload.single("file"), async (req, res) => {
    const projectId = req.params.id;
    if (!req.file) return res.status(400).send("No file uploaded.");

    try {
        const filePath = "/uploads/" + req.file.filename;

        await query(
            "INSERT INTO Files (Project_ID, File_desc, File_type, File_path, File_size) VALUES (?, ?, ?, ?, ?)",
            [projectId, "Additional file", req.file.mimetype, filePath, req.file.size]
        );

        res.send("File uploaded successfully.");
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).send("Error uploading file.");
    }
});



module.exports = router;
