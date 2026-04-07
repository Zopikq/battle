const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let board = {}; 
let history = {};
let bannedUsers = new Set();
let onlineCount = 0;

const ADMIN_DATA = { login: "gggol2q", pass: "wqrqwe241d" };

io.on('connection', (socket) => {
    onlineCount++;
    io.emit('stats_update', { online: onlineCount });

    socket.emit('init_board', board);

    socket.on('paint', (data) => {
        if (bannedUsers.has(data.user)) {
            socket.emit('error_msg', 'Вы забанены!');
            return;
        }
        const key = `${data.x},${data.y}`;
        board[key] = data.color;
        if (!history[key]) history[key] = [];
        history[key].unshift({ user: data.user, color: data.color, time: new Date().toLocaleTimeString() });
        if (history[key].length > 10) history[key].pop();
        io.emit('pixel_update', { x: data.x, y: data.y, color: data.color });
    });

    // ЛОГИКА АДМИНКИ
    socket.on('admin_login', (data) => {
        if (data.login === ADMIN_DATA.login && data.pass === ADMIN_DATA.pass) {
            socket.emit('admin_success', true);
        } else {
            socket.emit('admin_success', false);
        }
    });

    socket.on('admin_command', (command) => {
        // Здесь можно добавить проверку токена, но для простоты:
        if (command.type === 'clear_all') {
            board = {};
            history = {};
            io.emit('init_board', board);
            console.log('Админ очистил доску');
        }
        if (command.type === 'ban_user') {
            bannedUsers.add(command.user);
            console.log(`Пользователь ${command.user} забанен`);
        }
    });

    socket.on('disconnect', () => {
        onlineCount--;
        io.emit('stats_update', { online: onlineCount });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server on ${PORT}`));
