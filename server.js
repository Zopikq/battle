const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Указываем серверу, где лежат файлы
const publicPath = path.join(__dirname, '.');
app.use(express.static(publicPath));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

let board = {}; 
let history = {};
let bannedUsers = new Set();
const ADMIN_DATA = { login: "gggol2q", pass: "wqrqwe241d" };

io.on('connection', (socket) => {
    socket.emit('init_board', board);

    socket.on('paint', (data) => {
        if (bannedUsers.has(data.user)) return;
        const key = `${data.x},${data.y}`;
        board[key] = data.color;
        io.emit('pixel_update', { x: data.x, y: data.y, color: data.color });
    });

    socket.on('admin_login', (data) => {
        if (data.login === ADMIN_DATA.login && data.pass === ADMIN_DATA.pass) {
            socket.emit('admin_success', true);
        } else {
            socket.emit('admin_success', false);
        }
    });

    socket.on('admin_command', (command) => {
        if (command.type === 'clear_all') {
            board = {};
            io.emit('init_board', board);
        }
        if (command.type === 'ban_user') {
            bannedUsers.add(command.user);
        }
    });
});

const PORT = process.env.PORT || 3000;
// Важно: слушаем на 0.0.0.0
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
