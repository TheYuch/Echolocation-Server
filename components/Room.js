const constants = require('../utils/constants.js');

const rooms = new Map();

class Room {
    initializeMatrix() {
        this.matrix = [];
        for (let r = 0; r < constants.MATRIX_LENGTH; r++) {
            this.matrix[r] = [];
            for (let c = 0; c < constants.MATRIX_LENGTH; c++) {
                this.matrix[r][c] = {
                    type: '',
                    val: {},
                    signals: [],
                };
            }
        }
    };

    constructor(roomCode, emitMatrixChanged, emitPlaySounds) {
        this.roomCode = roomCode;
        this.emitMatrixChanged = emitMatrixChanged;
        this.emitPlaySounds = emitPlaySounds;
        this.ticks = 0;
        this.delay = constants.MS_PER_TICK.DEFAULT;
        this.players = [];
        this.initializeMatrix();
        this.interval = null;
    }

    addPlayer(socketId) {
        this.players.push(socketId);
        if (!this.interval) {
            this.beginUpdate();
        }
    }

    removePlayer(socketId) {
        this.players = this.players.filter(player => player !== socketId);
        if (this.players.length === 0) {
            this.endUpdate();
        }
    }

    beginUpdate() {
        this.interval = setInterval(() => {
            const soundsToPlay = this.handleMatrixUpdate();
            this.emitMatrixChanged(this.matrix);
            this.emitPlaySounds(soundsToPlay);
            this.ticks++;
        }, this.delay); // TODO: add variable delay
    }

    endUpdate() {
        clearInterval(this.interval);
        this.interval = null;
    }

    handleMetronome(r, c) {
        if (this.ticks % this.matrix[r][c].val.ticksPerBeat === 0) {
            this.matrix[r][c].signals.push({
                type: 'metronome',
                direction: 'e', // TODO - use val.direction later
            });
        }
    };

    handleNoteAdjuster(r, c) {
        if (this.ticks % this.matrix[r][c].val.ticksPerBeat === 0) {
            this.matrix[r][c].signals.push({
                type: 'noteAdjuster',
                direction: 's', // TODO - use val.direction later
            });
        }
    }

    setNextSignals(todoSignals, r, c) {
        for (let i = 0; i < this.matrix[r][c].signals.length; i++) {
            const currSignal = this.matrix[r][c].signals[i];
            switch (currSignal.direction) {
            case 'e':
                if (c + 1 < constants.MATRIX_LENGTH) {
                    todoSignals.push([r, c + 1, currSignal]);
                }
                break;
            case 'w':
                if (c - 1 >= 0) {
                    todoSignals.push([r, c - 1, currSignal]);
                }
                break;
            case 'n':
                if (r - 1 >= 0) {
                    todoSignals.push([r - 1, c, currSignal]);
                }
                break;
            case 's':
                if (r + 1 < constants.MATRIX_LENGTH) {
                    todoSignals.push([r + 1, c, currSignal]);
                }
                break;
            }
        }
        this.matrix[r][c].signals = [];
    }

    initializeSoundsToPlay() {
        return {
            amsynth: {
                notes: [],
                lengths: [],
            },
            duosynth: {
                notes: [],
                lengths: [],
            },
            fmsynth: {
                notes: [],
                lengths: [],
            },
            membranesynth: {
                notes: [],
                lengths: [],
            },
            metalsynth: {
                notes: [],
                lengths: [],
            },
            monosynth: {
                notes: [],
                lengths: [],
            },
            noisesynth: {
                notes: [],
                lengths: [],
            },
            plucksynth: {
                notes: [],
                lengths: [],
            },
            synth: {
                notes: [],
                lengths: [],
            },
        };
    }

    handleMatrixUpdate() {
        let todoSignals = [];
    
        // Update matrix
        for (let r = 0; r < constants.MATRIX_LENGTH; r++) {
            for (let c = 0; c < constants.MATRIX_LENGTH; c++) {
                this.setNextSignals(todoSignals, r, c);
                
                switch (this.matrix[r][c].type) {
                case 'metronome':
                    this.handleMetronome(r, c);
                    break;
                case 'noteAdjuster':
                    this.handleNoteAdjuster(r, c)
                    break;
                }
            }
        }
    
        // Propagating signals
        let soundsToPlay = this.initializeSoundsToPlay();
        for (let i = 0; i < todoSignals.length; i++) {
            const [r, c, signal] = todoSignals[i];
            this.matrix[r][c].signals.push(signal);
        
            // Handle signal types
            if (this.matrix[r][c].type === 'note') {
                if (signal.type === 'metronome') {
                    const val = this.matrix[r][c].val;
                    if (val.instrument in soundsToPlay) {
                        soundsToPlay[val.instrument]['notes'].push(val.note.toUpperCase() + val.accidental + val.octave);
                        soundsToPlay[val.instrument]['lengths'].push(0.25); // TODO: need variable note lengths
                    }
                } else if (signal.type === 'noteAdjuster') {
                    let noteWithAccidental = this.matrix[r][c].val.note.toUpperCase() + this.matrix[r][c].val.accidental;
                    let index = -1;
                    if (constants.SCALES.SHARPS.includes(noteWithAccidental)) {
                        index = constants.SCALES.SHARPS.indexOf(noteWithAccidental);
                        index = (index + 1) % constants.SCALES.SHARPS.length;
                        noteWithAccidental = constants.SCALES.SHARPS[index];
                    } else {
                        index = constants.SCALES.FLATS.indexOf(noteWithAccidental);
                        index = (index + 1) % constants.SCALES.FLATS.length;
                        noteWithAccidental = constants.SCALES.FLATS[index];
                    }
                    this.matrix[r][c].val.note = noteWithAccidental.charAt(0).toLowerCase();
                    this.matrix[r][c].val.accidental = noteWithAccidental.charAt(1);
                }
            }
        }

        return soundsToPlay;
    };

    requestCellChange(row, column, value) {
        // TODO: later, add checks (e.g. flats and sharps on certain notes only, restrict range of ticksperbeat, etc.) -- user can easily hack and update false matrices
        this.matrix[row][column] = value;
        return true;
    }

    requestDelayChange(newDelay) {
        if (newDelay < constants.MS_PER_TICK.MIN || newDelay > constants.MS_PER_TICK.MAX) {
            return false;
        }
        this.endUpdate();
        this.delay = newDelay;
        this.beginUpdate();
        return true;
    }
}

const createRoom = (roomCode, emitError, emitMatrixChanged, emitPlaySounds) => {
    if (rooms.get(roomCode) !== undefined) {
        emitError('roomCodeExists', 'Invalid room creation. The room code already exists.');
        return;
    }
    const newRoom = new Room(roomCode, emitMatrixChanged, emitPlaySounds);
    rooms.set(roomCode, newRoom);
}

const deleteRoom = (roomCode) => {
    rooms.delete(roomCode);
}

module.exports = {
    rooms,
    createRoom,
    deleteRoom
};