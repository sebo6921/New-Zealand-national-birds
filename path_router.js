const express = require('express');
const router = express.Router();
const pool = require('./db'); // Import the pool from db.js


router.get('/', async (req, res) => {
    res.redirect('/birds');
});

router.get('/birds', async (req, res) => {
    let conservation_status_data = [];
    let birds_data = [];

    // Fetch conservation status from MySQL
    const db = pool.promise();
    //shows the side bar conservation
    const status_query = `SELECT * FROM ConservationStatus;`;
    try {
        const [rows] = await db.query(status_query);
        conservation_status_data = rows;
    } catch (err) {
        console.error("Error fetching conservation status:", err);
        return res.status(500).send("Internal Server Error");
    }
    
    // Fetch birds data from MySQL
    const birds_query = `SELECT * FROM Bird;`;
    try {
        const [rows] = await db.query(birds_query);
        birds_data = rows;
    } catch (err) {
        console.error("Error fetching birds data:", err);
        return res.status(500).send("Internal Server Error");
    }

    const photo_query = `SELECT * FROM photos;`;
    try {
        const [rows] = await db.query(photo_query);
        birds_photo = rows;
    } catch (err) {
        console.error("Error fetching birds data:", err);
        return res.status(500).send("Internal Server Error");
    }


    // Render the view with fetched data
    res.render('index', {
        title: 'Birds of Aotearoa',
        birds: birds_data, // Passing bird data
        birds_img: birds_photo, // Passing bird photos
        status: conservation_status_data // Passing conservation status data
    });
});

module.exports = router;
