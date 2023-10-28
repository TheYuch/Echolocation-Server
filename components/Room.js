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
        this.minDelay = constants.MS_PER_TICK.DEFAULT_MIN;
        this.maxDelay = constants.MS_PER_TICK.DEFAULT_MAX;
        this.players = [];
        this.initializeMatrix();
        this.interval = null;
    }

    addPlayer(socketId) {
        if (!this.players.includes(socketId)) {
            this.players.push(socketId);
        }
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
        }, this.delay);
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
            let currSignal = this.matrix[r][c].signals[i];
            const direction = this.matrix[r][c].type === 'redirector' ? this.matrix[r][c].val.direction : currSignal.direction;
            currSignal.direction = direction;
            switch (direction) {
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

    requestCellChange(row, column, c) {
        if (row < 0 || row >= constants.MATRIX_LENGTH ||
            column < 0 || column >= constants.MATRIX_LENGTH) {
            return false;
        }

        let newCell = this.matrix[row][column];

        c = c.toLowerCase();
        if (c === 'backspace') { // Backspace for deletion
            newCell.type = '';
            newCell.val = {};
        } else if (c === 'arrowleft') { // Arrows for redirectors
            newCell.type = 'redirector';
            newCell.val = { direction: 'w' };
        } else if (c === 'arrowright') {
            newCell.type = 'redirector';
            newCell.val = { direction: 'e' };
        } else if (c === 'arrowup') {
            newCell.type = 'redirector';
            newCell.val = { direction: 'n' };
        } else if (c === 'arrowdown') {
            newCell.type = 'redirector';
            newCell.val = { direction: 's' };
        } else if (c.length === 1) {
            if (!isNaN(c)) { // Single-char number
                if (newCell.type === 'note') {
                    newCell.val.octave = parseInt(c);
                } else if (newCell.type === 'metronome' || newCell.type === 'noteAdjuster') {
                    newCell.val.ticksPerBeat = parseInt(c);
                }
            } else if (c.match(/[a-z]/i)) { // Single-char alphabet
                if (c.match(/[a-g]/i)) {
                    newCell.type = 'note';
                    newCell.val = {
                        note: c,
                        octave: constants.CELL.NOTE.DEFAULT_OCTAVE,
                        accidental: '',
                        instrument: constants.CELL.NOTE.DEFAULT_INSTRUMENT,
                    };
                } else if (c === 'm') {
                    newCell.type = 'metronome';
                    newCell.val = {
                        ticksPerBeat: constants.CELL.METRONOME.DEFAULT_TICKS_PER_BEAT,
                    };
                } else if (c === 'n') {
                    newCell.type = 'noteAdjuster';
                    newCell.val = {
                        ticksPerBeat: constants.CELL.NOTEADJUSTER.DEFAULT_TICKS_PER_BEAT,
                    };
                }
            } else { // Accidentals, etc.
                if (newCell.type === 'note') {
                    if (c === '+' && constants.SCALES.NOTES_WITH_SHARPS.includes(newCell.val.note.toUpperCase())) {
                        newCell.val.accidental = '#';
                    } else if (c === '-' && constants.SCALES.NOTES_WITH_FLATS.includes(newCell.val.note.toUpperCase())) {
                        newCell.val.accidental = 'b';
                    } else { // Instruments setting: !@#$%^&*(
                        if (c === '!') newCell.val.instrument = constants.CELL.NOTE.INSTRUMENTS[0];
                        else if (c === '@') newCell.val.instrument = constants.CELL.NOTE.INSTRUMENTS[1];
                        else if (c === '#') newCell.val.instrument = constants.CELL.NOTE.INSTRUMENTS[2];
                        else if (c === '$') newCell.val.instrument = constants.CELL.NOTE.INSTRUMENTS[3];
                        else if (c === '%') newCell.val.instrument = constants.CELL.NOTE.INSTRUMENTS[4];
                        else if (c === '^') newCell.val.instrument = constants.CELL.NOTE.INSTRUMENTS[5];
                        else if (c === '&') newCell.val.instrument = constants.CELL.NOTE.INSTRUMENTS[6];
                        else if (c === '*') newCell.val.instrument = constants.CELL.NOTE.INSTRUMENTS[7];
                        else if (c === '(') newCell.val.instrument = constants.CELL.NOTE.INSTRUMENTS[8];
                    }
                }
            }
        }

        this.matrix[row][column] = newCell;

        return true; // this doesn't track whether the cell actually changed to a new value
    }

    requestDelayChange(newDelay) {
        if (newDelay < this.minDelay || newDelay > this.maxDelay) {
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