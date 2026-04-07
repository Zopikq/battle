const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Настройка CORS для безопасности
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Раздаем статику (html, mp3, css)
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let board = {}; 
let history = {}; 

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Сразу шлем текущую доску
    socket.emit('init_board', board);

    socket.on('paint', (data) => {
        const { x, y, color, user } = data;
        const key = `${x},${y}`;
        
        board[key] = color;
        
        if (!history[key]) history[key] = [];
        history[key].unshift({ user, color, time: new Date().toLocaleTimeString() });
        if (history[key].length > 10) history[key].pop();

        // Шлем всем, включая отправителя, чтобы подтвердить отрисовку
        io.emit('pixel_update', { x, y, color });
    });

    socket.on('get_history', (key) => {
        socket.emit('history_data', { key, data: history[key] || [] });
    });
});

// Render сам назначит порт через process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
