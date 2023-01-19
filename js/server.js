const websocket = require('ws');
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const path = require('path');
const url = require('url');
const runner = require('child_process');
const Bull = require('bull');
require('dotenv').config();

var wsClients = [];
var currentRequests = 0;
const LIMIT_REQUESTS = 5;

const queue = new Bull('queue');

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
                // Trying to implement Task Queue
                // let job = await queue.add({data});

                // queue.process(async (job, done) => {
                //     runner.exec(`node ./js/parser.js ${job.data}`, function (err, response) {
                //         if (err) done(err);
                //         else done(response);
                //     });
                // });

                // queue.on('completed', (job, result) => {
                //     ws.send(result);
                // });

                // Execute parser passing through params user's input
                runner.exec(`node ./js/parser.js ${data}`, function (err, response) {
                    if (err) ws.send('Error: ' + err);
                    else ws.send(response);
                });
            }
        });
        // Increment current requests. Limit is five per token
        currentRequests++;
    });
});