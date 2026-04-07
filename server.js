const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- ДОБАВЬ ЭТИ СТРОКИ ---
// Это заставит сервер "раздавать" статические файлы (html, js, mp3) из текущей папки
app.use(express.static(path.join(__dirname, '.')));

// Это скажет серверу при заходе на главную (/) отдавать index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
// -------------------------

let board = {}; 
let history = {}; 

io.on('connection', (socket) => {
    socket.emit('init_board', board);

    socket.on('paint', (data) => {
        const { x, y, color, user } = data;
        const key = `${x},${y}`;
        board[key] = color;
        if (!history[key]) history[key] = [];
        history[key].unshift({ user, color, time: new Date().toLocaleTimeString() });
        if (history[key].length > 10) history[key].pop();
        io.emit('pixel_update', { x, y, color });
    });

    socket.on('get_history', (key) => {
        socket.emit('history_data', { key, data: history[key] || [] });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
