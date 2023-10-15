const http = require('http');
const express = require('express');
const cors = require('cors');

const roomManager = require('./components/Room.js');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: ['http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
    perMessagesDeflate: false,
});

const PORT = process.env.PORT || 8000;

// TODO: tmp - For testing purposes, rooms is pre-populated with one room.
roomManager.createRoom(
    1234,
    (error, message) => socket.emit('errorMessage', { error, message }),
    (newMatrix) => io.to(1234).emit('matrixChanged', newMatrix),
    (soundsToPlay) => io.to(1234).emit('playSounds', soundsToPlay)
);

io.on('connection', socket => {
    socket.on('joinRoom', ({ roomCode }) => {
        roomCode = 1234; // TODO: tmp
        if (!roomManager.rooms.has(roomCode)) {
            socket.emit('errorMessage', { error: 'roomCode', message: 'Room does not exist!' });
            return;
        }
        const room = roomManager.rooms.get(roomCode);
        socket.join(roomCode);
        socket.emit('debugMessage', 'You have successfully joined a room with code ' + roomCode + '!');
        room.addPlayer(socket.id);
        io.to(roomCode).emit('matrixChanged', room.matrix);
    });

    socket.on('requestMatrixChange', ({ roomCode, row, column, value }) => {
        roomCode = 1234; // TODO: tmp
        if (!roomManager.rooms.has(roomCode)) {
            socket.emit('errorMessage', { error: 'roomCode', message: 'Room does not exist!' });
            return;
        }
        const room = roomManager.rooms.get(roomCode);
        room.requestCellChange(row, column, value);
        io.to(roomCode).emit('matrixChanged', room.matrix);
    });

    socket.on('disconnecting', () => {
        for (let roomCode of socket.rooms) {
            if (!roomManager.rooms.has(roomCode)) {
                continue;
            }
            const room = roomManager.rooms.get(roomCode);
            room.removePlayer(socket.id);
            socket.leave(roomCode);
        }
    });
});

server.listen(PORT, () => console.log(`Echolocation Server listening at port ${PORT}.`));