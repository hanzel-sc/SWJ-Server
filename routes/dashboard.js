const express = require("express");
const router = express.Router();
const db = require("../config/db");
const util = require("util");

// Convert db.query to return Promises
const query = util.promisify(db.query).bind(db);

// Get Dashboard Statistics
router.get("/", async (req, res) => {
    try {
        const projectCount = await query("SELECT COUNT(*) AS count FROM Projects");
        const lyricFileCount = await query("SELECT COUNT(*) AS count FROM Files WHERE File_type = 'text/plain'");
        const audioFileCount = await query("SELECT COUNT(*) AS count FROM Files WHERE File_type = 'Audio'");

        console.log("Project Count:", projectCount[0].count);
        console.log("Lyric File Count:", lyricFileCount[0].count);
        console.log("Audio File Count:", audioFileCount[0].count);  // Log the result

        res.json({
            projects: projectCount[0].count,
            lyricFiles: lyricFileCount[0].count,
            audioFiles: audioFileCount[0].count,
        });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).send("Error fetching dashboard data.");
    }
});


module.exports = router;
