const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Хранилище: состояние доски и история
let board = {}; // "x,y": "color"
let history = {}; // "x,y": [{user, color, time}]

io.on('connection', (socket) => {
    console.log('Игрок подключился:', socket.id);

    // Отправляем текущую доску новому игроку
    socket.emit('init_board', board);

    // Обработка клика
    socket.on('paint', (data) => {
        const { x, y, color, user } = data;
        const key = `${x},${y}`;

        // Обновляем доску
        board[key] = color;

        // Обновляем историю
        if (!history[key]) history[key] = [];
        history[key].unshift({ user, color, time: new Date().toLocaleTimeString() });
        if (history[key].length > 10) history[key].pop();

        // Рассылаем всем остальным
        io.emit('pixel_update', { x, y, color });
    });

    // Запрос истории пикселя
    socket.on('get_history', (key) => {
        socket.emit('history_data', { key, data: history[key] || [] });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Сервер на порту ${PORT}`));