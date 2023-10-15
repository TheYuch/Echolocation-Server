const MATRIX_LENGTH = 16;

const MS_PER_TICK = {
    MIN: 200,
    DEFAULT: 500,
    MAX: 1000,
};

const SCALES = {
    SHARPS: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
    FLATS: ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"],
};

module.exports = {
    MATRIX_LENGTH,
    MS_PER_TICK,
    SCALES,
};