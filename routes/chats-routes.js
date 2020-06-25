const express = require('express');

const chatsControllers = require('../controllers/chats-controllers');

const router = express.Router();

router.get('/:cfrom/:cto', chatsControllers.getChats);

module.exports = router;