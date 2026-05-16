// @ts-nocheck
const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const { WebSocketServer } = require('ws');
const { COOKIE_SECRET } = require('./state');
const { registerRoutes } = require('./routes');
const { attachWebSocket } = require('./ws');
require('./db');
require('./conversation');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));

registerRoutes(app);
attachWebSocket(wss);

server.listen(3001, () => console.log('running on localhost:3001'));
