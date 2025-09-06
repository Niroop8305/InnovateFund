import express from 'express';
import { Chat, Message } from '../models/Chat.js';
import { validateRequest, schemas } from '../middleware/validation.js';
import { io } from '../server.js';
import { getMessagesFromFirestore, addMessageToFirestore } from '../utils/firebaseChat.js';
import { syncMessageToMongo } from '../services/chatSyncWorker.js';
import User from '../models/User.js';

const router = express.Router();

// Get all chats for current user
router.get('/', async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id
    })
      .populate('participants', 'name profilePicture lastActive')
      .populate('lastMessage')
      .sort({ lastActivity: -1 });

    res.json({ chats });

  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get or create chat between users
router.post('/create', async (req, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ message: 'Participant ID is required' });
    }

    if (participantId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot create chat with yourself' });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, participantId] },
      isGroupChat: false
    }).populate('participants', 'name profilePicture lastActive');

    if (!chat) {
      // Create new chat
      chat = new Chat({
        participants: [req.user._id, participantId],
        isGroupChat: false
      });

      await chat.save();
      await chat.populate('participants', 'name profilePicture lastActive');
    }

    res.json({ chat });

  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a specific chat
router.get('/:chatId/messages', async (req, res) => {
  try {
    const { limit = 50 } = req.query; // page ignored for Firestore simple fetch

    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Fetch from Firestore
    let rawMessages = [];
    try {
      rawMessages = await getMessagesFromFirestore(req.params.chatId, parseInt(limit));
    } catch (e) {
      console.error('[ChatRoute] Firestore fetch error:', e.message);
      return res.status(500).json({ message: 'Server error' });
    }

    // Collect unique senderIds and fetch user profiles from Mongo
    const senderIds = [...new Set(rawMessages.map(m => m.senderId))];
    const users = await User.find({ _id: { $in: senderIds } }).select('name profilePicture');
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const messages = rawMessages.map(m => ({
      _id: m._id,
      chat: m.chat,
      sender: userMap.get(m.senderId)?.toObject ? userMap.get(m.senderId) : { _id: m.senderId, name: 'Unknown User' },
      content: m.content,
      messageType: m.messageType,
      createdAt: m.createdAt,
      readBy: m.readBy || [],
      edited: m.edited,
      editedAt: m.editedAt
    }));

    res.json({
      messages,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: messages.length
      }
    });
  } catch (error) {
    console.error('Get messages (Firestore) error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
router.post('/:chatId/messages', validateRequest(schemas.sendMessage), async (req, res) => {
  try {
    const { content, messageType = 'text' } = req.body;
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Write to Firestore for real-time messaging
    let fbMessage;
    try {
      fbMessage = await addMessageToFirestore(chatId, {
        senderId: req.user._id.toString(),
        content,
        messageType
      });
    } catch (e) {
      if (e.message === 'FIREBASE_NOT_INITIALIZED') {
        return res.status(503).json({ message: 'Realtime messaging not configured' });
      }
      throw e;
    }

    // Populate sender object for response consistency
    const sender = await User.findById(req.user._id).select('name profilePicture');
    const apiMessage = {
      _id: fbMessage._id,
      chat: chatId,
      sender,
      content,
      messageType,
      createdAt: fbMessage.createdAt,
      readBy: fbMessage.readBy,
      edited: false,
      editedAt: null
    };

    // Fire-and-forget sync to Mongo for archival & lastMessage reference
    setImmediate(() => {
      syncMessageToMongo(fbMessage, chatId);
    });

    // Emit to other participants via Socket.IO
    const otherParticipants = chat.participants.filter(p => p.toString() !== req.user._id.toString());
    otherParticipants.forEach(participantId => {
      io.to(`user_${participantId}`).emit('new_message', { chatId, message: apiMessage });
    });
    // Also emit to chat room for participants currently viewing it
    io.to(`chat_${chatId}`).emit('new_message', { chatId, message: apiMessage });

    res.status(201).json({ message: apiMessage });
  } catch (error) {
    console.error('Send message (Firestore) error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark messages as read
router.post('/:chatId/read', async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is participant
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Message.updateMany(
      { 
        chat: chatId,
        'readBy.user': { $ne: req.user._id }
      },
      { 
        $push: { readBy: { user: req.user._id, readAt: new Date() } }
      }
    );

    res.json({ message: 'Messages marked as read' });

  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;