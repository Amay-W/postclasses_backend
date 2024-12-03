const express = require('express');
const app = express();
const path = require("path");
const { MongoClient, ObjectID } = require('mongodb');

// Logger Middleware
function logger(req, res, next) {
    const method = req.method;
    const url = req.url;
    const timestamp = new Date();

    console.log(`[${timestamp}] ${method} request to ${url}`);

    res.on('finish', () => {
        console.log(`[${timestamp}] Response status: ${res.statusCode}`);
    });

    next();
}

// Use the logger middleware
app.use(logger);

// Serve static assets
// app.use('/assets', express.static(path.resolve(__dirname, "assets")));


app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});




var imagePath = path.resolve(__dirname, "assets");
app.use('/assets', express.static(imagePath));

app.use("/assets", express.static(imagePath));






// Middleware to handle missing image static files
app.get("/assets/:image", (req, res) => {
    res.status(404).send("Static file not found");
});

// Config Express.js
app.use(express.json());
app.set('port', 3000);
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

// Connect to MongoDB
let db;
MongoClient.connect(
    'mongodb+srv://amay0028:amay@cluster0.6ig57pb.mongodb.net/',
    { useNewUrlParser: true, useUnifiedTopology: true },
    (err, client) => {
        if (err) {
            console.error("Error connecting to MongoDB:", err);
            return;
        }
        db = client.db('webstore');
        console.log("Connected to MongoDB");
    }
);

// Parameter Middleware for collection name
app.param('collectionName', (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName);
    return next();
});

// Retrieve all objects from a collection
app.get('/collection/:collectionName', (req, res, next) => {
    req.collection.find({}).toArray((e, results) => {
        if (e) return next(e);
        res.send(results);
    });
});

app.get('/', (req, res) => {
    res.send('Select a collection, e.g., /collection/lessons');
});



// Add a document to a collection
app.post('/collection/:collectionName', (req, res, next) => {
    req.collection.insertOne(req.body, (e, result) => {
        if (e) return next(e);
        res.send(result.ops[0]);
    });
});

// return with object id
// const ObjectID = require('mongodb').ObjectID;
app.get('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.findOne({ _id: ObjectID(req.params.id) }, (e, result) => {
        if (e) return next(e)
        res.send(result)
    })
})

// Update a document by ID
app.put('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.updateOne(
        { _id: new ObjectID(req.params.id) },
        { $set: req.body },
        { safe: true, multi: false },
        (e, result) => {
            if (e) return next(e);
            res.send(result.matchedCount === 1 ? { msg: 'success' } : { msg: 'error' });
        }
    );
});


app.get('/search/:collectionName', (req, res, next) => {
    const searchTerm = req.query.q || ""; // Get the search term from the query string
    const searchRegex = new RegExp(searchTerm, "i"); // Case-insensitive regex for substring matching

    // Build the search query
    const query = {
        $or: [
            { title: searchRegex },
            { location: searchRegex },
        ],
    };

    // Execute the search on the collection
    req.collection.find(query).toArray((err, results) => {
        if (err) {
            console.error("Error executing search query:", err);
            return next(err); // Handle errors
        }
        res.send(results); // Send the filtered results
    });
});







const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log("Express.js server running at localhost:${port}");
});
