const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

// Настройки подключения к MySQL
const db = mysql.createConnection({
    host: 'mysql.joinserver.xyz',
    port: 3306,
    user: 'u476473_0exyYrK35l',
    password: 'e=n==^4lj1SetGNMHOs.Kcua',
    database: 's476473_passwords'
});

let board = {}; 
let history = {}; 

// --- ЛОГИКА БАЗЫ ДАННЫХ ---

// Загрузка доски при старте сервера
db.connect(err => {
    if (err) return console.error("Ошибка подключения к БД:", err);
    console.log("Успешное подключение к MySQL!");
    
    db.query('SELECT board_data FROM pixel_battle WHERE id = 1', (err, results) => {
        if (err) console.error(err);
        if (results.length > 0) {
            try {
                board = JSON.parse(results[0].board_data);
                console.log("Доска успешно загружена из БД.");
            } catch (e) {
                console.error("Ошибка парсинга JSON из БД:", e);
                board = {};
            }
        }
    });
});

// Функция сохранения доски в БД
function saveBoardToDB() {
    const data = JSON.stringify(board);
    db.query('UPDATE pixel_battle SET board_data = ? WHERE id = 1', [data], (err) => {
        if (err) console.error("Ошибка сохранения в БД:", err);
        else console.log("Прогресс сохранен в MySQL.");
    });
}

// Авто-сохранение каждые 30 секунд
setInterval(saveBoardToDB, 30000);

// --- КОНЕЦ ЛОГИКИ БД ---

function getAllowedUsers() {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'allowed.txt'), 'utf8');
        return data.split('\n').filter(line => line.trim() !== '').reduce((acc, line) => {
            const [user, pass] = line.trim().split(':');
            if (user && pass) acc[user] = pass;
            return acc;
        }, {});
    } catch (e) {
        return {};
    }
}

io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('auth', ({ username, password }) => {
        const users = getAllowedUsers();
        if (users[username] && users[username] === password) {
            currentUser = username;
            const isAdmin = username === 'Zopik_qq' || username.toLowerCase().includes('admin');
            socket.emit('auth_success', { username, isAdmin });
            socket.emit('init_board', board);
        } else {
            socket.emit('auth_error', 'Неверный логин или пароль');
        }
    });

    socket.on('paint', (data) => {
        if (!currentUser) return;
        const { x, y, color } = data;
        if (x < 0 || x >= 400 || y < 0 || y >= 400) return;

        const key = `${x},${y}`;
        if (color === 'erase' || color === '#ffffff') {
            delete board[key];
        } else {
            board[key] = color;
        }
        
        io.emit('pixel_update', { x, y, color: (color === 'erase' ? '#ffffff' : color) });
    });

    socket.on('admin_clear', () => {
        if (currentUser === 'Zopik_qq' || currentUser.toLowerCase().includes('admin')) {
            board = {};
            io.emit('init_board', board);
            saveBoardToDB();
        }
    });

    socket.on('admin_fill', (color) => {
        if (currentUser === 'Zopik_qq' || currentUser.toLowerCase().includes('admin')) {
            board = {};
            for(let x=0; x<400; x++) {
                for(let y=0; y<400; y++) board[`${x},${y}`] = color;
            }
            io.emit('init_board', board);
            saveBoardToDB();
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server started on port ${PORT}`));
