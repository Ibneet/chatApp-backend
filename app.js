const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);
const io = socketio(server);

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

server.listen(PORT);

const userMap = new Map();

io.sockets.on(ON_CONNECTION, function (socket) {
    onEachUserConnection(socket);
});

function onEachUserConnection(socket) {
    console.log('Connected => Socket Id: ' + socket.id + ', User: ' + stringifyToJson(socket.handshake.query));
    var from_user_id = socket.handshake.query.from;
    let userMapVal = {socket_id: socket.id};
    addUserToMap(from_user_id, userMapVal);
    console.log(userMap);
    printOnlineUsers();

    onMessage(socket);
    checkOnline(socket);

    onDisconnect(socket);
}

function onMessage(socket){
    socket.on(EVENT_SINGLE_CHAT_MESSAGE, function(chat_message){
        singleChatHandler(socket, chat_message);
    });
}

function checkOnline(socket) {
    socket.on(EVENT_IS_USER_ONLINE, function(chat_user_details){
        onlineCheckHandler(socket, chat_user_details);
    });
}

function onlineCheckHandler(socket, chat_user_details){
    let to_user_id = chat_user_details.to;
    console.log('Checking online user: ' + to_user_id);
    let to_user_socket_id = getSocketIDFromMapForThisUser(to_user_id);
    let isOnline = to_user_socket_id != undefined;
    chat_user_details.to_user_online_status = isOnline;
    sendBackToClient(socket, SUB_EVENT_IS_USER_CONNECTED, chat_user_details);
}

function singleChatHandler(socket, chat_message){
    console.log('onMessage: ' + stringifyToJson(chat_message));
    let to_user_id = chat_message.to;
    let from_user_id = chat_message.from;
    console.log(from_user_id + '=> ' + to_user_id);
    let to_user_socket_id = getSocketIDFromMapForThisUser(to_user_id);

    if(to_user_socket_id == undefined) {
        console.log('Chat user not connected.');
        chat_message.to_user_online_status = false;
        return;
    }

    chat_message.to_user_online_status = true;
    sendToConnectedSocket(socket, to_user_socket_id, SUB_EVENT_RECEIVE_MESSAGE, chat_message);
}

function sendBackToClient(socket, event, chat_message){
    socket.emit(event, stringifyToJson(chat_message));
}

function sendToConnectedSocket(socket, to_user_socket_id, event, chat_message) {
    socket.to(`${to_user_socket_id}`).emit(event, stringifyToJson(chat_message));
}

function getSocketIDFromMapForThisUser(to_user_id) {
    let userMapVal = userMap.get(`${to_user_id}`);
    if(userMapVal == undefined){
        return undefined;
    }
    return userMapVal.socket_id;
}

function removeUserWithSocketIdFromMap(socket_id){
    console.log('Deleting user: ' + socket_id);
    let toDeleteUser;

    for(let key of userMap){
        let userMapValue = key[1];
        if(userMapValue.socket_id == socket_id){
            toDeleteUser = key[0];
        }
    }
    console.log('Deleting user: ' + toDeleteUser);
    if(toDeleteUser != undefined){
        userMap.delete(toDeleteUser);
    }
    console.log(userMap);
    printOnlineUsers();
}

function onDisconnect(socket) {
    socket.on(ON_DISCONNECT, function(){
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

function stringifyToJson(data){
    return JSON.stringify(data);
}