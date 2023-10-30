const http = require('http');
const express = require('express');
const cors = require('cors');

const roomManager = require('./components/Room.js');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: ['https://echolocation.vercel.app', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
    perMessagesDeflate: false,
});

const PORT = parseInt(process.env.PORT) || 8000;

// TODO: tmp - For testing purposes, rooms is pre-populated with one room.
roomManager.createRoom(
    1234,
    (error, message) => socket.emit('errorMessage', { error, message }),
    (newMatrix) => io.to(1234).emit('matrixChanged', newMatrix),
    (soundsToPlay) => io.to(1234).emit('playSounds', soundsToPlay)
);

io.on('connection', socket => {
    socket.on('joinRoom', ({ roomCode }) => {
        if (!roomManager.rooms.has(roomCode)) {
            socket.emit('errorMessage', { error: 'roomCode', message: 'Room does not exist!' });
            return;
        }
        const room = roomManager.rooms.get(roomCode);
        socket.join(roomCode);
        room.addPlayer(socket.id);
        socket.emit('debugMessage', 'You have successfully joined a room with code ' + roomCode + '!');
        socket.emit('delayChanged', { newDelay: room.delay, newMinDelay: room.minDelay, newMaxDelay: room.maxDelay });
    });

    socket.on('requestCellChange', ({ roomCode, row, column, c }) => {
        if (!roomManager.rooms.has(roomCode)) {
            socket.emit('errorMessage', { error: 'roomCode', message: 'Room does not exist!' });
            return;
        }
        const room = roomManager.rooms.get(roomCode);
        const success = room.requestCellChange(row, column, c);
        if (success) {
            io.to(roomCode).emit('matrixChanged', room.matrix); // TODO prevent too many calls from happening, consider deleting or timing out
        } else {
            socket.emit('errorMessage', { error: 'requestCellChange', message: 'Failed to change cell.'});
        }
    });

    socket.on('requestDelayChange', ({ roomCode, newDelay }) => {
        if (!roomManager.rooms.has(roomCode)) {
            socket.emit('errorMessage', { error: 'roomCode', message: 'Room does not exist!' });
            return;
        }
        const room = roomManager.rooms.get(roomCode);
        const success = room.requestDelayChange(newDelay);
        if (success) {
            io.to(roomCode).emit('delayChanged', { newDelay: room.delay, newMinDelay: room.minDelay, newMaxDelay: room.maxDelay }); // TODO prevent too many calls from happening, consider deleting or timing out
        } else {
            socket.emit('errorMessage', { error: 'requestDelayChange', message: 'Failed to change delay.'});
        }
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