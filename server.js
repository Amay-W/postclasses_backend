// Import necessary modules
const express = require('express'); // Framework for building web applications
const app = express(); // Initialize the Express application
const path = require("path"); // Module for working with file paths
const { MongoClient, ObjectID } = require('mongodb'); // MongoDB client for database operations and ObjectID for document identification

// Logger Middleware: Logs request details and response status
function logger(req, res, next) {
    const method = req.method; // HTTP method (e.g., GET, POST)
    const url = req.url; // Request URL
    const timestamp = new Date(); // Current timestamp

    console.log(`[${timestamp}] ${method} request to ${url}`); // Log the request details

    // Log response status after the request is processed
    res.on('finish', () => {
        console.log(`[${timestamp}] Response status: ${res.statusCode}`);
    });

    next(); // Pass control to the next middleware or route handler
}

// Use the logger middleware for all requests
app.use(logger);

// Middleware for CORS (Cross-Origin Resource Sharing)
// Allows requests from any origin with specified methods and headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.setHeader("Access-Control-Allow-Credentials", "true"); // Allow credentials (e.g., cookies)
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT"); // Allowed HTTP methods
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept"); // Allowed headers
    next(); // Pass control to the next middleware or route handler
});

// Path to the assets folder
var imagePath = path.resolve(__dirname, "assets"); // Resolve the absolute path to the "assets" directory
app.use('/assets', express.static(imagePath)); // Serve static files from the "assets" directory

// Middleware to handle missing image static files
app.get("/assets/:image", (req, res) => {
    res.status(404).send("Static file not found"); // Return a 404 error if the file is not found
});

// Configuring Express.js application
app.use(express.json()); // Middleware to parse incoming JSON requests, taking data in json format
app.set('port', 3000); // Set the default port for the application

// Connect to MongoDB Atlas
let db; // Variable to hold the database connection
MongoClient.connect(
    'mongodb+srv://amay0028:amay@cluster0.6ig57pb.mongodb.net/', // Connection string to MongoDB Atlas
    { useNewUrlParser: true, useUnifiedTopology: true }, // Options for the connection
    (err, client) => {
        if (err) {
            console.error("Error connecting to MongoDB:", err); // Log the error if connection fails
            return;
        }
        db = client.db('webstore'); // Use the "webstore" database
        console.log("Connected to MongoDB"); // Log success message
    }
);

// Parameter Middleware: Attach the collection name to the request object
app.param('collectionName', (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName); // Set the collection from the database
    return next(); // Pass control to the next middleware or route handler
});

// Route to retrieve all documents from a specified collection
app.get('/collection/:collectionName', (req, res, next) => {
    req.collection.find({}).toArray((e, results) => { // Fetch all documents
        if (e) return next(e); // Handle errors
        res.send(results); // Send the results to the client
    });
});

// Default route: Provide guidance for using the API
app.get('/', (req, res) => {
    res.send('Select a collection, e.g., /collection/lessons'); // Send a message to the client
});

// Route to add a new document to a collection
app.post('/collection/:collectionName', (req, res, next) => {
    req.collection.insertOne(req.body, (e, result) => { // Insert the document into the collection
        if (e) return next(e); // Handle errors
        res.send(result.ops[0]); // Send the inserted document back to the client
    });
});

// Route to retrieve a document by its ID
app.get('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.findOne({ _id: ObjectID(req.params.id) }, (e, result) => { // Find the document by its ObjectID
        if (e) return next(e); // Handle errors
        res.send(result); // Send the document back to the client
    });
});

// Route to update a document by its ID
app.put('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.updateOne(
        { _id: new ObjectID(req.params.id) }, // Find the document by its ObjectID
        { $set: req.body }, // Update the document with the new data
        { safe: true, multi: false }, // Ensure safe update
        (e, result) => {
            if (e) return next(e); // Handle errors
            res.send(result.matchedCount === 1 ? { msg: 'success' } : { msg: 'error' }); // Send success or error message
        }
    );
});

// Route to search within a collection using a query string
app.get('/search/:collectionName', (req, res, next) => {
    const searchTerm = req.query.q || ""; // Extract the search term from the query string
    const searchRegex = new RegExp(searchTerm, "i"); // Create a case-insensitive regex for matching

    // Build the query object
    const query = {
        $or: [ // Search in multiple fields
            { title: searchRegex },
            { location: searchRegex },
            { price: { $regex: searchRegex } }, // Match price using regex
            { availableSeats: { $regex: searchRegex } }, // Match available seats using regex
            { description: searchRegex },
        ],
    };

    req.collection.find(query).toArray((err, results) => { // Execute the search
        if (err) {
            console.error("Error executing search query:", err); // Log the error
            return next(err); // Handle errors
        }
        res.send(results); // Send the matching results to the client
    });
});

// Start the server and listen on the configured port
const port = process.env.PORT || 3000; // Use the environment's port or default to 3000
app.listen(port, () => {
    console.log("Express.js server running at localhost:${port}"); // Log the server's address
});
