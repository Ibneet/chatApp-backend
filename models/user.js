const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    ID: { type: String, required: true },
    socketID: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

module.exports = { User };
