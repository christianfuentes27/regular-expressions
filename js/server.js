const websocket = require('ws');
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const path = require('path');
const url = require('url');
const runner = require('child_process');
require('dotenv').config();

var wsClients = [];
var currentRequests = 0;
const LIMIT_REQUESTS = 5;

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
        jwt.verify(token, process.env.TOKEN_SECRET, (err) => {
            if (err || currentRequests == LIMIT_REQUESTS) {
                ws.send("Error: Your token is no longer valid.");
                ws.close();
            } else {
                // If the token is valid, it runs a php script passing client's regular expression
                runner.exec(`php ${path.join(__dirname, '..', 'reguex.php')} ${data}`, function(err, phpRespopnse) {
                    // The response could be an error or tells the user if it matches or not
                    if(err) ws.send('Error: ' + err);
                    else ws.send(phpRespopnse);
                });
            }
        });
        // Increment current requests. Limit is five per token
        currentRequests++;
    });
});