// Background sync of Firestore messages into MongoDB for history/analytics.
// This keeps the existing Mongo Message & Chat models updated without blocking the realtime API.

import { Message, Chat } from '../models/Chat.js';

/**
 * Persist a Firestore-originated message into Mongo for archival/analytics.
 * This function is intentionally fire-and-forget; errors are logged only.
 * @param {object} message - Normalized message object from Firestore add (contains senderId, content, etc.)
 * @param {string} chatId
 */
export async function syncMessageToMongo(message, chatId) {
  try {
    // Create Mongo message (id will differ from Firestore doc id)
    const mongoMessage = new Message({
      chat: chatId,
      sender: message.senderId,
      content: message.content,
      messageType: message.messageType || 'text',
      readBy: [{ user: message.senderId }],
    });
    await mongoMessage.save();

    // Update chat's lastMessage reference & activity timestamp
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: mongoMessage._id,
      lastActivity: new Date(),
    });
  } catch (err) {
    console.error('[ChatSyncWorker] Failed to sync message to Mongo:', err.message);
  }
}
