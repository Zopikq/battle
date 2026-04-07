const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Настройка статических файлов
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let board = {}; 
let history = {};
let bannedUsers = new Set();
const ADMIN_DATA = { login: "gggol2q", pass: "wqrqwe241d" };

io.on('connection', (socket) => {
    console.log('Новое подключение:', socket.id);
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
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
