import { firebaseAdmin } from '../config/firebase.js';

// Firestore reference (guard if admin not initialized)
let db = null;
try {
  if (firebaseAdmin?.apps?.length) {
    db = firebaseAdmin.firestore();
  }
} catch (e) {
  console.warn('[firebaseChat] Firestore not initialized:', e.message);
}

const CHATS_COLLECTION = 'chats'; // parent collection for chat metadata (messages are subcollections)

/**
 * Add a message to Firestore under chats/{chatId}/messages/{autoId}
 * @param {string} chatId
 * @param {{ senderId: string, content: string, messageType?: string }} data
 * @returns {Promise<object>} normalized message object (matching existing API shape)
 */
export async function addMessageToFirestore(chatId, data) {
  if (!db) {
    throw new Error('FIREBASE_NOT_INITIALIZED');
  }
  const { senderId, content, messageType = 'text' } = data;
  const FieldValue = firebaseAdmin.firestore.FieldValue;
  const createdAt = FieldValue.serverTimestamp();
  const messageRef = db
    .collection(CHATS_COLLECTION)
    .doc(chatId)
    .collection('messages')
    .doc(); // auto id

  // Initial payload without read receipts (Firestore disallows serverTimestamp inside array elements directly on create)
  const payload = {
    senderId,
    content,
    messageType,
    createdAt,
    readBy: [],
    edited: false,
    editedAt: null,
  };

  await messageRef.set(payload);
  // Add initial read receipt with client timestamp (acceptable precision for immediate sender read state)
  const initialRead = { userId: senderId, readAt: new Date().toISOString() };
  await messageRef.update({ readBy: FieldValue.arrayUnion(initialRead) });

  return {
    _id: messageRef.id,
    chat: chatId,
    senderId,
    content,
    messageType,
    createdAt: new Date().toISOString(),
    readBy: [initialRead],
    edited: false,
    editedAt: null,
  };
}

/**
 * Fetch latest messages from Firestore for a chat (ascending by createdAt)
 * @param {string} chatId
 * @param {number} limit
 * @returns {Promise<Array<object>>}
 */
export async function getMessagesFromFirestore(chatId, limit = 50) {
  if (!db) {
    // Return empty result if Firestore not ready (prevents 500 for chat UI)
    return [];
  }
  const snapshot = await db
    .collection(CHATS_COLLECTION)
    .doc(chatId)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  const messages = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    messages.push({
      _id: doc.id,
      chat: chatId,
      senderId: data.senderId,
      content: data.content,
      messageType: data.messageType || 'text',
      createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      readBy: data.readBy || [],
      edited: !!data.edited,
      editedAt: data.editedAt ? data.editedAt.toDate().toISOString() : null,
    });
  });

  return messages.reverse();
}
