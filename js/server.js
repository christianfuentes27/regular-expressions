const websocket = require('ws');
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const path = require('path');
const url = require('url');
const runner = require('child_process');
require('dotenv').config();

var currentRequests = 0;
var wsClients = [];
const LIMIT_REQUESTS = 5;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const server = app.listen(3000, () => {
    console.log("Server running on port 3000");
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

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

const wss = new websocket.Server({ server: server, path: '/ws' });

wss.on('connection', (ws, req) => {
    var token = url.parse(req.url, true).query.token;
    jwt.verify(token, process.env.TOKEN_SECRET, (err) => {
        if (err) {
            ws.close();
        } else {
            wsClients[token] = ws;
        }
    });
    ws.on('message', (data) => {
        jwt.verify(token, process.env.TOKEN_SECRET, (err) => {
            if (err || currentRequests == LIMIT_REQUESTS) {
                ws.send("Error: Your token is no longer valid.");
                ws.close();
            } else {
                runner.exec(`php ${path.join(__dirname, '..', 'reguex.php')} ${data}`, function(err, phpRespopnse) {
                    if(err) ws.send('Error: ' + err);
                    else ws.send(phpRespopnse);
                });
            }
        });
        currentRequests++;
    });
});