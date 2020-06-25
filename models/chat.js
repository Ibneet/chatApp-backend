const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatSchema = mongoose.Schema({
    chatID: { type: String, required: true, },
    message: { type: String, required: true, },
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    chatType: { type: String, required: true },
    toUserOnlineStatus: { type: Boolean, required: true },
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = { Chat }