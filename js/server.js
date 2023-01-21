const websocket = require('ws');
const express = require("express");
const jwt = require("jsonwebtoken");
const path = require('path');
const url = require('url');
const runner = require('child_process');
var mongodb = require('mongodb');
var mongoDbQueue = require('mongodb-queue-up');
require('dotenv').config();

// Uri connection to mongodb
const uri = "mongodb://mongoadmin:secret@localhost:1888/?authMechanism=DEFAULT";
// Mongodb Client
const client = new mongodb.MongoClient(uri);

var wsClients = [];
var currentRequests = 0;
const LIMIT_REQUESTS = 5;

const app = express();
app.use(express.json());
// Make html's dependencies working correctly
app.use(express.static(path.join(__dirname, '..')));

// Server listening on port 3000
const server = app.listen(3000, () => {
    console.log("Server running on port 3000");
});

// Send html file to '/' server path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Receiving client's credentials and response with a token with a time no longer 
// than 10 minutes
app.post("/login", async (req, res) => {
    // create token
    const token = jwt.sign({
        email: req.body.email,
        password: req.body.password
    }, process.env.TOKEN_SECRET, {
        expiresIn: '10m'
    });

    res.header('auth-token', token).json({
        error: null,
        data: { token }
    });
});

// Set WebSocketServer in express server on path '/ws'
const wss = new websocket.Server({ server: server, path: '/ws' });

wss.on('connection', (ws, req) => {
    // Get token from the url and verifies it
    var token = url.parse(req.url, true).query.token;
    // If it is not valid, websocket connection is closed
    // Otherwise, client's websocket is saved with his correspondant token
    jwt.verify(token, process.env.TOKEN_SECRET, (err) => {
        if (err) {
            ws.close();
        } else {
            wsClients[token] = ws;
        }
    });
    // On message, if there is an error or current requests have reached the limit, websocket 
    // connection is closed
    ws.on('message', (data) => {
        jwt.verify(token, process.env.TOKEN_SECRET, async (err) => {
            if (err || currentRequests == LIMIT_REQUESTS) {
                ws.send("Error: Your token is no longer valid.<br>");
                ws.close();
            } else {
                await client.connect();
                // Get 'test' db
                const db = client.db('test');
                // Create task queue on 'test' db
                const queue = mongoDbQueue(db, 'my-queue');
                // Add job to queue
                addJobToQueue(queue, data.toString()).then(() => {
                    // If job has been correctly added, process it
                    queue.get((err, job) => {
                        // Execute the parser passing through params the input arithmetic operation checking 
                        // if it is correct or not
                        runner.exec(`node ./js/parser.js ${job.payload}`, function (err, response) {
                            if (err) ws.send('Error: ' + err);
                            else ws.send(response);
                        });
                        // After processing job, remove it from the queue
                        queue.ack(job.ack, (err, id) => {
                            console.log('Job removed from the queue');
                        });
                    });
                });
            }
        });
        // Increment current requests. Limit is five per token
        currentRequests++;
    });
});

// Adding job to task queue
async function addJobToQueue(queue, data) {
    await queue.add(data, function (err, id) {
        console.log('Added to queue');
    });
}