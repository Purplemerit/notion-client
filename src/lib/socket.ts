import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Chat Socket
let chatSocket: Socket | null = null;

// Auth error callback that components can set
let authErrorCallback: ((error: { message: string; code: string; requiresLogin: boolean }) => void) | null = null;

export const setAuthErrorCallback = (callback: (error: { message: string; code: string; requiresLogin: boolean }) => void) => {
  authErrorCallback = callback;
};

export const getChatSocket = (): Socket => {
  if (!chatSocket) {
    chatSocket = io(`${WS_URL}/chat`, {
      withCredentials: true, // Send cookies with WebSocket connection
      transports: ['websocket'],
      reconnection: false, // Disable auto-reconnection for auth errors
      autoConnect: true,
    });

    chatSocket.on('connect', () => {
      console.log('✅ Connected to chat socket');
    });

    chatSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from chat socket:', reason);
    });

    chatSocket.on('connect_error', (error) => {
      console.error('❌ Chat socket connection error:', error);
      if (authErrorCallback) {
        authErrorCallback({
          message: 'Failed to connect to chat server',
          code: 'CONNECTION_ERROR',
          requiresLogin: true,
        });
      }
    });

    chatSocket.on('error', (error: string | { message: string; code: string; requiresLogin: boolean }) => {
      console.error('Chat socket error:', error);

      // Handle structured error object
      if (typeof error === 'object' && error.requiresLogin) {
        if (authErrorCallback) {
          authErrorCallback(error);
        } else {
          // Fallback if callback not set yet
          console.error('Auth error but no callback set:', error);
          setTimeout(() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }, 1000);
        }
      }
    });
  }

  return chatSocket;
};

export const disconnectChatSocket = () => {
  if (chatSocket) {
    chatSocket.removeAllListeners();
    chatSocket.disconnect();
    chatSocket = null;
  }
};

export const resetChatSocket = () => {
  disconnectChatSocket();
  authErrorCallback = null;
};

// Video Socket
let videoSocket: Socket | null = null;

export const getVideoSocket = (): Socket => {
  if (!videoSocket) {
    videoSocket = io(`${WS_URL}/video`, {
      transports: ['websocket'],
    });

    videoSocket.on('connect', () => {
      console.log('✅ Connected to video socket');
    });

    videoSocket.on('disconnect', () => {
      console.log('❌ Disconnected from video socket');
    });
  }

  return videoSocket;
};

export const disconnectVideoSocket = () => {
  if (videoSocket) {
    videoSocket.disconnect();
    videoSocket = null;
  }
};

// Chat message types
export interface ChatMessage {
  _id?: string; // MongoDB document ID when message comes from server
  sender: string;
  receiver?: string;
  groupName?: string;
  text?: string;
  mediaUrl?: string;
  filename?: string;
  mimetype?: string;
  mode: 'private' | 'group';
  isMedia?: boolean;
  createdAt?: Date | string; // Timestamp from server
}

// Chat helpers
export const sendPrivateMessage = (sender: string, receiver: string, text: string) => {
  const socket = getChatSocket();
  socket.emit('message', { sender, receiver, text });
};

export const sendGroupMessage = (sender: string, groupName: string, text: string) => {
  const socket = getChatSocket();
  socket.emit('groupMessage', { sender, groupName, text });
};

export const createGroup = (groupName: string) => {
  const socket = getChatSocket();
  socket.emit('createGroup', { groupName });
};

export const joinGroup = (groupName: string) => {
  const socket = getChatSocket();
  socket.emit('joinGroup', { groupName });
};

export const leaveGroup = (groupName: string) => {
  const socket = getChatSocket();
  socket.emit('leaveGroup', { groupName });
};

export const sendMediaFile = (
  sender: string,
  receiver: string | undefined,
  groupName: string | undefined,
  fileName: string,
  fileType: string,
  fileBase64: string,
  mode: 'private' | 'group'
) => {
  const socket = getChatSocket();
  socket.emit('sendMedia', {
    sender,
    receiver,
    groupName,
    fileName,
    fileType,
    fileBase64,
    mode,
  });
};

// Video helpers for group calls
export const joinVideoRoom = (roomName: string, userId?: string) => {
  const socket = getVideoSocket();
  socket.emit('join_room', { roomName, userId });
};

export const sendOffer = (offer: RTCSessionDescriptionInit, roomName: string, targetSocketId: string) => {
  const socket = getVideoSocket();
  socket.emit('send_connection_offer', { offer, roomName, targetSocketId });
};

export const sendAnswer = (answer: RTCSessionDescriptionInit, roomName: string, targetSocketId: string) => {
  const socket = getVideoSocket();
  socket.emit('send_answer', { answer, roomName, targetSocketId });
};

export const sendICECandidate = (candidate: RTCIceCandidate, roomName: string, targetSocketId: string) => {
  const socket = getVideoSocket();
  socket.emit('send_candidate', { candidate, roomName, targetSocketId });
};

export const leaveVideoRoom = (roomName: string) => {
  const socket = getVideoSocket();
  socket.emit('leave_room', roomName);
};

// Call helpers (WebRTC Signaling via Chat Socket)
export const initiateCall = (
  caller: string,
  callee: string,
  offer: RTCSessionDescriptionInit,
  callType: 'audio' | 'video'
) => {
  const socket = getChatSocket();
  socket.emit('call:initiate', { caller, callee, offer, callType });
};

export const answerCall = (
  caller: string,
  callee: string,
  answer: RTCSessionDescriptionInit
) => {
  const socket = getChatSocket();
  socket.emit('call:answer', { caller, callee, answer });
};

export const sendCallICECandidate = (
  sender: string,
  receiver: string,
  candidate: RTCIceCandidate
) => {
  const socket = getChatSocket();
  socket.emit('call:iceCandidate', { sender, receiver, candidate });
};

export const rejectCall = (caller: string, callee: string, reason?: string) => {
  const socket = getChatSocket();
  socket.emit('call:reject', { caller, callee, reason });
};

export const endCall = (caller: string, callee: string) => {
  const socket = getChatSocket();
  socket.emit('call:end', { caller, callee });
};

// Messaging Socket (for new messaging system)
let messagingSocket: Socket | null = null;

export const getMessagingSocket = (userId: string): Socket => {
  if (!messagingSocket) {
    messagingSocket = io(`${WS_URL}/messaging`, {
      withCredentials: true,
      transports: ['websocket'],
      auth: {
        userId: userId,
      },
    });

    messagingSocket.on('connect', () => {
      console.log('✅ Connected to messaging socket');
    });

    messagingSocket.on('disconnect', () => {
      console.log('❌ Disconnected from messaging socket');
    });

    messagingSocket.on('connect_error', (error) => {
      console.error('❌ Messaging socket connection error:', error);
    });
  }

  return messagingSocket;
};

export const disconnectMessagingSocket = () => {
  if (messagingSocket) {
    messagingSocket.removeAllListeners();
    messagingSocket.disconnect();
    messagingSocket = null;
  }
};

// Messaging helpers
export interface DirectMessage {
  senderEmail: string;
  receiverId: string;
  content: string;
  messageType?: 'text' | 'file' | 'image';
  fileUrl?: string;
  fileName?: string;
}

export const sendDirectMessage = (messageData: DirectMessage) => {
  if (!messagingSocket) {
    console.error('Messaging socket not connected');
    return;
  }
  messagingSocket.emit('sendMessage', messageData);
};

export const sendTypingIndicator = (senderId: string, receiverId: string, isTyping: boolean) => {
  if (!messagingSocket) return;
  messagingSocket.emit('typing', { senderId, receiverId, isTyping });
};

export const markMessageAsRead = (userEmail: string, messageId: string) => {
  if (!messagingSocket) return;
  messagingSocket.emit('markAsRead', { userEmail, messageId });
};

export const checkUserOnlineStatus = (userId: string) => {
  if (!messagingSocket) return;
  messagingSocket.emit('checkOnlineStatus', { userId });
};
