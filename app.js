const express = require('express');
const bodyParser = require("body-parser");
const http = require('http');
const socketio = require('socket.io');
const mongoose = require('mongoose');

const Chat = require("./models/chat");
const HttpError = require('./models/http-error');
const chatsRoutes = require('./routes/chats-routes');

const PORT = process.env.PORT || 5000;

const app = express();
app.use(bodyParser.json());
const server = http.createServer(app);
const io = socketio(server);

app.use('/api/chats', chatsRoutes);

app.use((req, res, next) => {
    const error = new HttpError('Could not find the specified route', 404);
    throw error;
})

app.use((error, req, res, next) => {
    if(res.headerSent){
        return next(error);
    }
    res.status(error.code || 500);
    res.json({message: error.message || "An unknown error occurred"});
});

//Reserved events
let ON_CONNECTION = 'connection';
let ON_DISCONNECT = 'disconnect';

//Main events
let EVENT_IS_USER_ONLINE = 'check_online';
let EVENT_SINGLE_CHAT_MESSAGE = 'single_chat_message';

//Sub events
let SUB_EVENT_RECEIVE_MESSAGE = 'receive_message';
let SUB_EVENT_IS_USER_CONNECTED = 'is_user_connected';

//Status
let STATUS_MESSAGE_NOT_SENT = 10001;
let STATUS_MESSAGE_SENT = 10002;



mongoose.connect('mongodb+srv://ikshitjalan:Ikshit@17@cluster0-atrss.mongodb.net/Chat?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true }).then(() => { console.log('MongoDB Connected...') })
    .catch(err => { console.log(err) });


server.listen(PORT, () => {
    console.log(`Server Running at ${PORT}`);
});

const userMap = new Map();

io.sockets.on(ON_CONNECTION, function (socket) {
    onEachUserConnection(socket);
});

function onEachUserConnection(socket) {
    console.log('Connected => Socket Id: ' + socket.id + ', User: ' + stringifyToJson(socket.handshake.query));
    var from_user_id = socket.handshake.query.from;
    let userMapVal = { socket_id: socket.id };
    addUserToMap(from_user_id, userMapVal);
    console.log(userMap);
    printOnlineUsers();

    onMessage(socket);
    checkOnline(socket);

    onDisconnect(socket);
}

function onMessage(socket) {
    socket.on(EVENT_SINGLE_CHAT_MESSAGE, function (chat_message) {
        singleChatHandler(socket, chat_message);
    });
}

function checkOnline(socket) {
    socket.on(EVENT_IS_USER_ONLINE, function (chat_user_details) {
        onlineCheckHandler(socket, chat_user_details);
    });
}

function onlineCheckHandler(socket, chat_user_details) {
    let to_user_id = chat_user_details.to;
    console.log('Checking online user: ' + to_user_id);
    let to_user_socket_id = getSocketIDFromMapForThisUser(to_user_id);
    let isOnline = to_user_socket_id != undefined;
    chat_user_details.to_user_online_status = isOnline;
    sendBackToClient(socket, SUB_EVENT_IS_USER_CONNECTED, chat_user_details);
}

function singleChatHandler(socket, chat_message) {
    console.log('onMessage: ' + stringifyToJson(chat_message));

    Chat.collection.insertOne({
        chatID: chat_message.from < chat_message.to? chat_message.from+chat_message.to: chat_message.to+chat_message.from,
        message: chat_message.message,
        from: chat_message.from,
        to: chat_message.to,
        chatType: chat_message.chatType,
        toUserOnlineStatus: chat_message.toUserOnlineStatus,
    }).then(console.log('Chat Saved')).catch(err => console.log);

    let to_user_id = chat_message.to;
    let from_user_id = chat_message.from;
    console.log(from_user_id + '=> ' + to_user_id);
    let to_user_socket_id = getSocketIDFromMapForThisUser(to_user_id);

    if (to_user_socket_id == undefined) {
        console.log('Chat user not connected.');
        chat_message.to_user_online_status = false;
        return;
    }

    chat_message.to_user_online_status = true;
    sendToConnectedSocket(socket, to_user_socket_id, SUB_EVENT_RECEIVE_MESSAGE, chat_message);
}

function sendBackToClient(socket, event, chat_message) {
    socket.emit(event, stringifyToJson(chat_message));
}

function sendToConnectedSocket(socket, to_user_socket_id, event, chat_message) {
    socket.to(`${to_user_socket_id}`).emit(event, stringifyToJson(chat_message));
}

function getSocketIDFromMapForThisUser(to_user_id) {
    let userMapVal = userMap.get(`${to_user_id}`);
    if (userMapVal == undefined) {
        return undefined;
    }
    return userMapVal.socket_id;
}

function removeUserWithSocketIdFromMap(socket_id) {
    console.log('Deleting user: ' + socket_id);
    let toDeleteUser;

    for (let key of userMap) {
        let userMapValue = key[1];
        if (userMapValue.socket_id == socket_id) {
            toDeleteUser = key[0];
        }
    }
    console.log('Deleting user: ' + toDeleteUser);
    if (toDeleteUser != undefined) {
        userMap.delete(toDeleteUser);
    }
    console.log(userMap);
    printOnlineUsers();
}

function onDisconnect(socket) {
    socket.on(ON_DISCONNECT, function () {
        console.log('Disconnected ' + socket.id);
        removeUserWithSocketIdFromMap(socket.id);
        socket.removeAllListeners(SUB_EVENT_RECEIVE_MESSAGE);
        socket.removeAllListeners(SUB_EVENT_IS_USER_CONNECTED);
        socket.removeAllListeners(ON_DISCONNECT);
    })
}

function addUserToMap(key_user_id, socket_id) {
    userMap.set(key_user_id, socket_id);
}

function printOnlineUsers() {
    console.log('Online Users: ' + userMap.size);
}

function stringifyToJson(data) {
    return JSON.stringify(data);
}

