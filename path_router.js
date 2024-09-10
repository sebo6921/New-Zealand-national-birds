const express = require('express');
const router = express.Router();
const pool = require('./db');
const multer = require('multer');
const path = require('path');



// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

router.get('/', async (req, res) => {
    res.redirect('/birds');
});

router.get('/birds/create', async (req, res) => {
    try {
        const db = pool.promise();
        const [statuses] = await db.query('SELECT * FROM ConservationStatus');
        res.render('create_bird', { 
            title: 'Create New Bird',
            status: statuses  // Pass statuses for the sidebar
        });
    } catch (err) {
        console.error("Error fetching conservation statuses:", err);
        res.status(500).send("Internal Server Error");
    }
});

router.post('/birds/create', upload.single('bird_image'), async (req, res) => {
    const db = pool.promise();
    try {
        const { primary_name, english_name, scientific_name, order_name, family, weight, length, status_id } = req.body;

        const [birdResult] = await db.query(
            'INSERT INTO Bird (primary_name, english_name, scientific_name, order_name, family, weight, length, status_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [primary_name, english_name, scientific_name, order_name, family, weight, length, status_id]
        );

        if (req.file) {// if the request has a file then insert
            await db.query(
                'INSERT INTO Photos (bird_id, filename, photographer) VALUES (?, ?, ?)',
                [birdResult.insertId, req.file.filename, req.body.photographer]
            );
        }

        res.redirect('/birds');
    } catch (err) {
        console.error("Error creating new bird:", err);
        res.status(500).send("Error creating new bird");
    }
});




router.get('/birds/:id/update', async (req, res) => {
    const bird_id = Number(req.params.id);
    const db = pool.promise();
    try {
        const [bird] = await db.query(`
            SELECT b.*, c.status_name, c.status_colour, p.filename, p.photographer
            FROM Bird b
            LEFT JOIN ConservationStatus c ON b.status_id = c.status_id
            LEFT JOIN Photos p ON b.bird_id = p.bird_id
            WHERE b.bird_id = ?
        `, [bird_id]);

        const [statuses] = await db.query('SELECT * FROM ConservationStatus');

        if (bird.length === 0) {
            res.status(404).send("Bird not found");
        } else {
            res.render('update_bird', { 
                title: `Update ${bird[0].english_name}`,
                bird: bird[0],
                status: statuses  // Pass statuses for the sidebar
            });
        }
    } catch (err) {
        console.error("Error fetching bird for update:", err);
        res.status(500).send("Internal Server Error");
    }
});

router.post('/birds/:id/update', upload.single('bird_image'), async (req, res) => {
    const bird_id = Number(req.params.id);
    const db = pool.promise();
    try {
        const { primary_name, english_name, scientific_name, order_name, family, weight, length, status_id } = req.body;

        await db.query(
            'UPDATE Bird SET primary_name = ?, english_name = ?, scientific_name = ?, order_name = ?, family = ?, weight = ?, length = ?, status_id = ? WHERE bird_id = ?',
            [primary_name, english_name, scientific_name, order_name, family, weight, length, status_id, bird_id]
        );

        if (req.file) {
            await db.query('DELETE FROM Photos WHERE bird_id = ?', [bird_id]);
            await db.query(
                'INSERT INTO Photos (bird_id, filename, photographer) VALUES (?, ?, ?)',
                [bird_id, req.file.filename, req.body.photographer]
            );
        }

        res.redirect(`/birds`);
    } catch (err) {
        console.error("Error updating bird:", err);
        res.status(500).send("Error updating bird");
    }
});

router.get('/birds', async (req, res) => {
    let conservation_status_data = [];
    let birds_data = [];

    const db = pool.promise();

    // Fetch conservation status from MySQL
    const status_query = `SELECT * FROM ConservationStatus;`;
    try {
        const [rows] = await db.query(status_query);
        conservation_status_data = rows;
    } catch (err) {
        console.error("Error fetching conservation status:", err);
        return res.status(500).send("Internal Server Error");
    }
    
    // Fetch birds data with status information from MySQL
    const birds_query = `
        SELECT b.*, c.status_name, c.status_colour, p.filename, p.photographer
        FROM Bird b
        LEFT JOIN ConservationStatus c ON b.status_id = c.status_id
        LEFT JOIN Photos p ON b.bird_id = p.bird_id;
    `;
    try {
        const [rows] = await db.query(birds_query);
        birds_data = rows;
    } catch (err) {
        console.error("Error fetching birds data:", err);
        return res.status(500).send("Internal Server Error");
    }

    // Render the view with fetched data
    res.render('index', {
        title: 'Birds of Aotearoa',
        birds: birds_data,
        status: conservation_status_data
    });
});

// Search functionality
router.get('/birds/search', async (req, res) => {
    const searchTerm = req.query.bird_identifier; // Capture the search term

 
    try {
        const db = pool.promise();
        const [statuses] = await db.query(`
            SELECT status_id, status_name, status_colour
            FROM ConservationStatus
        `);
        // Query the database for the bird by name or ID
        const [birds] = await db.query(`
            SELECT b.*, c.status_name, c.status_colour, p.filename, p.photographer
            FROM Bird b
            LEFT JOIN ConservationStatus c ON b.status_id = c.status_id
            LEFT JOIN Photos p ON b.bird_id = p.bird_id
            WHERE b.primary_name LIKE ? OR b.english_name LIKE ? OR b.scientific_name LIKE ? OR b.bird_id = ?
        `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, searchTerm]);

        if (birds.length > 0) {
            // Redirect to the edit page if only one result is found
            if (birds.length === 1) {
                res.redirect(`/birds/${birds[0].bird_id}/update`);
            } else {
                // Otherwise, render a search results page
                res.render('partials/search_results', {
                    title: 'Search Results',
                    birds: birds,
                    status:statuses
                });
            }
        } else {
            res.status(404).send('No birds found matching the search term.');
        }
    } catch (err) {
        console.error("Error searching birds:", err);
        res.status(500).send("Internal Server Error");
    }
});

router.post('/birds/:id/delete', async (req, res) => {
    const db = pool.promise();

    const birdId = req.params.id;

    try {
        const result = await db.query("DELETE FROM Bird WHERE bird_id = ?;", [birdId]);
        console.log(result); // Log the result to ensure the query was successful
        res.redirect('/birds'); // Redirect to the list of birds or an appropriate page
    } catch (err) {
        console.error("Error deleting bird:", err.message); // Log the actual error message
        res.status(500).send("Internal Server Error: " + err.message); // Include error message in the response
    }
});




router.get('/birds/:id', async (req, res) => {
    const bird_id = Number(req.params.id);
    const db = pool.promise();
    
    try {
        const [bird] = await db.query(`
            SELECT b.*, c.status_name, c.status_colour, p.filename, p.photographer
            FROM Bird b
            LEFT JOIN ConservationStatus c ON b.status_id = c.status_id
            LEFT JOIN Photos p ON b.bird_id = p.bird_id
            WHERE b.bird_id = ?
        `, [bird_id]);
        const [statuses] = await db.query('SELECT * FROM ConservationStatus');

        if (bird.length === 0) {
            res.status(404).send("Bird not found");
        } else {
            res.render('bird_page', { 
                title: bird[0].english_name,
                bird: bird[0],
                status: statuses  // Or pass statuses if needed
            });
        }
    } catch (err) {
        console.error("Error fetching bird:", err);
        res.status(500).send("Internal Server Error");
    }
});
router.get('*', (req, res) => {
    res.status(404).render('partials/404page', { 
        title: '404 - Page Not Found' ,
        status: null,
        birds:[]
    });


   
});

module.exports = router;