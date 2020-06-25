const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const chatSchema = new Schema({
    chatID: { type: String, required: true, },
    message: { type: String, required: true, },
    from: { type:/*Schema.Types.ObjectId*/ Number, ref: 'User', required: true },
    to: { type: /*Schema.Types.ObjectId*/ Number, ref: 'User' },
    chatType: { type: String, required: true },
    toUserOnlineStatus: { type: Boolean, required: true },
});

module.exports = mongoose.model('Chat', chatSchema);

// module.exports = { Chat };