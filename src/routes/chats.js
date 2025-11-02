const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { participants, text } = req.body;
    let chat = await Chat.findOne({ participants: { $all: participants } });
    if (!chat) chat = new Chat({ participants, messages: [] });
    if (text) chat.messages.push({ sender: req.user._id, text });
    await chat.save();
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id).populate('messages.sender', 'name email');
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
