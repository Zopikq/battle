const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let board = {}; 
let history = {}; 

// Загрузка разрешенных пользователей
function getAllowedUsers() {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'allowed.txt'), 'utf8');
        return data.split('\n').filter(line => line.trim() !== '').reduce((acc, line) => {
            const [user, pass] = line.trim().split(':');
            acc[user] = pass;
            return acc;
        }, {});
    } catch (e) {
        console.error("Ошибка чтения allowed.txt. Создайте файл!");
        return {};
    }
}

io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('auth', ({ username, password }) => {
        const users = getAllowedUsers();
        if (users[username] && users[username] === password) {
            currentUser = username;
            const isAdmin = username.toLowerCase().includes('admin'); // Простая проверка на админа
            socket.emit('auth_success', { username, isAdmin });
            socket.emit('init_board', board);
        } else {
            socket.emit('auth_error', 'Неверный логин или пароль');
        }
    });

    socket.on('paint', (data) => {
        if (!currentUser) return;
        const { x, y, color } = data;
        const key = `${x},${y}`;
        board[key] = color;
        
        if (!history[key]) history[key] = [];
        history[key].unshift({ user: currentUser, color, time: new Date().toLocaleTimeString() });
        if (history[key].length > 5) history[key].pop();

        io.emit('pixel_update', { x, y, color });
    });

    socket.on('admin_clear', () => {
        if (currentUser && currentUser.toLowerCase().includes('admin')) {
            board = {};
            history = {};
            io.emit('init_board', board);
        }
    });

    socket.on('get_history', (key) => {
        socket.emit('history_data', { key, data: history[key] || [] });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server on port ${PORT}`));
