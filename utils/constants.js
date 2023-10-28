const MATRIX_LENGTH = 16;

const MS_PER_TICK = {
    DEFAULT: 500,
    DEFAULT_MIN: 200,
    DEFAULT_MAX: 1000,
};

const SCALES = {
    SHARPS: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
    FLATS: ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"],
    NOTES_WITH_SHARPS: ["C", "D", "F", "G", "A"],
    NOTES_WITH_FLATS: ["D", "E", "G", "A", "B"],
};

const CELL = {
    NOTE: {
        DEFAULT_OCTAVE: 4,
        DEFAULT_INSTRUMENT: 'synth',
        INSTRUMENTS: ['amsynth', 'duosynth', 'fmsynth', 'membranesynth', 'metalsynth', 'monosynth', 'noisesynth', 'plucksynth', 'synth']
    },
    METRONOME: {
        DEFAULT_TICKS_PER_BEAT: 4,
    },
    NOTEADJUSTER: {
        DEFAULT_TICKS_PER_BEAT: 4,
    },
};

module.exports = {
    MATRIX_LENGTH,
    MS_PER_TICK,
    SCALES,
    CELL,
};