const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const Chat = require('../models/chat');

const getChats = async (req, res, next) => {
    const chatFrom = req.params.cfrom;
    const chatTo = req.params.cto;
    
    let chat;
    try{
        chat = await Chat.find({ from: chatFrom, to: chatTo });
    }catch(err){
        const error = new HttpError(
            'Something went wrong, could not find the chat.',
            500
        );
        return next(error);
    }
    
    if(!chat || chat.length === 0){
        const error = new HttpError(
            'No chat yet.', 
            404
        );
        return next(error);
    }

    res.json({chat: chat});
}

exports.getChats = getChats;