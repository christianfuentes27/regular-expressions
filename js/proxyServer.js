const express = require('express');
const app = express();
const { createProxyMiddleware } = require('http-proxy-middleware');

// Redirecting request to api rest server
app.use('/login', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true
}));

app.listen(8000, () => {
    console.log("Server running on port 8000");
});