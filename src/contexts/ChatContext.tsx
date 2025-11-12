'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getChatSocket, setAuthErrorCallback, resetChatSocket, type ChatMessage } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { usersAPI, chatAPI } from "@/lib/api";
import { deduplicateMessages, mergeMessages, setLastConnectionTime } from "@/lib/chatUtils";

export interface Chat {
  name: string;
  role: string;
  time: string;
  status: string;
  avatar: string;
  type?: string;
}

export interface Message {
  id: string;
  sender: string;
  content: string;
  time: string;
  avatar: string;
  isOwn: boolean;
  createdAt?: string; // Server timestamp for proper ordering
  mediaUrl?: string;
  filename?: string;
  mimetype?: string;
  isMedia?: boolean;
}

interface ChatContextType {
  chitChatChats: Chat[];
  teamChats: Chat[];
  messages: { [chatName: string]: Message[] };
  addChitChat: (chat: Chat) => void;
  addTeamChat: (chat: Chat) => void;
  addMessage: (chatName: string, message: Message) => void;
  setMessagesForChat: (chatName: string, messages: Message[]) => void;
  unreadCounts: { [chatName: string]: number };
  markChatAsRead: (chatName: string) => void;
  getTotalUnreadCount: () => number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [chitChatChats, setChitChatChats] = useState<Chat[]>([]);
  const [teamChats, setTeamChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<{ [chatName: string]: Message[] }>({});
  const [unreadCounts, setUnreadCounts] = useState<{ [chatName: string]: number }>({});
  const { toast } = useToast();
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  // Cache for user avatars to avoid repeated API calls
  const [userAvatarCache, setUserAvatarCache] = useState<{ [email: string]: string }>({});

  // Helper function to get user avatar from cache or fetch from API
  const getUserAvatar = useCallback(async (email: string): Promise<string> => {
    // Check cache first
    if (userAvatarCache[email]) {
      return userAvatarCache[email];
    }

    // Fetch from API
    try {
      const users = await usersAPI.search(email);
      if (users && users.length > 0) {
        const user = users.find((u: any) => u.email === email);
        if (user && user.avatar) {
          // Update cache
          setUserAvatarCache(prev => ({ ...prev, [email]: user.avatar }));
          return user.avatar;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch avatar for ${email}`, error);
    }

    // Return empty string if not found (will use fallback initials)
    return '';
  }, [userAvatarCache]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedChitChats = localStorage.getItem('chitChatChats');
    const savedTeamChats = localStorage.getItem('teamChats');
    const savedMessages = localStorage.getItem('chatMessages');
    const savedUnreadCounts = localStorage.getItem('unreadCounts');

    if (savedChitChats) {
      setChitChatChats(JSON.parse(savedChitChats));
    }
    if (savedTeamChats) {
      setTeamChats(JSON.parse(savedTeamChats));
    }
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
    if (savedUnreadCounts) {
      setUnreadCounts(JSON.parse(savedUnreadCounts));
    }

    usersAPI.getMe().then((user: any) => {
      setCurrentUserEmail(user.email);
    }).catch(err => {
      console.error("Failed to get current user", err);
    })
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('chitChatChats', JSON.stringify(chitChatChats));
  }, [chitChatChats]);

  useEffect(() => {
    localStorage.setItem('teamChats', JSON.stringify(teamChats));
  }, [teamChats]);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts));
  }, [unreadCounts]);

  const addChitChat = useCallback((chat: Chat) => {
    setChitChatChats(prev => {
      // Check if chat already exists
      if (prev.some(c => c.name === chat.name)) {
        return prev;
      }
      return [...prev, chat];
    });
  }, []);

  const addMessage = useCallback((chatName: string, message: Message) => {
    setMessages(prev => {
      const existingMessages = prev[chatName] || [];
      const newMessages = [...existingMessages, message];
      // Deduplicate to prevent duplicate messages
      const deduplicated = deduplicateMessages(newMessages);
      return {
        ...prev,
        [chatName]: deduplicated,
      };
    });
  }, []);

  useEffect(() => {
    if (!currentUserEmail) return;

    const fetchConversations = async () => {
      try {
        const response = await chatAPI.getConversations();
        if (response.success) {
          // Fetch avatars for all conversation partners
          const conversationPromises = response.conversations.map(async (conv: any) => {
            const avatar = await getUserAvatar(conv.partner);
            return {
              name: conv.partner,
              role: 'User',
              time: new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'offline', // You might want to manage online status separately
              avatar: avatar || '',
            };
          });

          const conversations = await Promise.all(conversationPromises);

          // Merge with existing chats instead of replacing
          setChitChatChats(prev => {
            const existingMap = new Map(prev.map(chat => [chat.name, chat]));
            conversations.forEach(conv => {
              existingMap.set(conv.name, conv);
            });
            return Array.from(existingMap.values());
          });

          // Merge messages instead of replacing
          setMessages(prev => {
            const merged = { ...prev };

            response.conversations.forEach(async (conv: any) => {
              const senderAvatar = await getUserAvatar(conv.lastMessage.sender);
              const serverMessage: Message = {
                id: conv.lastMessage._id,
                sender: conv.lastMessage.sender,
                content: conv.lastMessage.text,
                time: new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                avatar: senderAvatar || '',
                isOwn: conv.lastMessage.sender === currentUserEmail,
              };

              // Merge with existing messages for this chat
              const existingMessages = prev[conv.partner] || [];
              merged[conv.partner] = mergeMessages(existingMessages, [serverMessage]);
            });

            return merged;
          });
        }
      } catch (error) {
        console.error("Failed to fetch conversations", error);
        toast({
          title: "Error",
          description: "Failed to load your conversations.",
          variant: "destructive",
        });
      }
    };

    fetchConversations();

    resetChatSocket();

    setAuthErrorCallback((error) => {
      console.error('Authentication error:', error);
      toast({
        title: "Authentication Failed",
        description: error.message + " Please login again.",
        variant: "destructive",
        duration: 5000,
      });

      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    });

    const socket = getChatSocket();

    const createMessage = (data: ChatMessage, isOwn: boolean = false): Message => {
      // Use server's createdAt timestamp if available, otherwise use current time
      const timestamp = data.createdAt ? new Date(data.createdAt) : new Date();
      const createdAtStr = data.createdAt 
        ? (typeof data.createdAt === 'string' ? data.createdAt : data.createdAt.toISOString())
        : timestamp.toISOString();

      return {
        id: data._id || `${Date.now()}-${Math.random()}`,
        sender: data.sender,
        content: data.text || data.filename || 'Media file',
        time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: createdAtStr,
        avatar: '', // Will be populated asynchronously
        isOwn,
        mediaUrl: data.mediaUrl,
        filename: data.filename,
        mimetype: data.mimetype,
        isMedia: data.isMedia || !!data.mediaUrl,
      };
    };

    // Helper function to ensure chat exists in the list
    const ensureChatExists = async (chatName: string, data: ChatMessage) => {
      console.log(`ensureChatExists called - chatName: ${chatName}, sender: ${data.sender}, currentUser: ${currentUserEmail}, mode: ${data.mode}`);
      
      // Only create chat for incoming messages (not from current user)
      if (data.mode === 'private' && data.sender !== currentUserEmail) {
        const avatar = await getUserAvatar(chatName);
        setChitChatChats(prev => {
          const chatExists = prev.some(chat => chat.name === chatName);
          console.log(`Chat exists check: ${chatExists} for ${chatName}`);
          if (!chatExists) {
            console.log(`✅ Creating new chat card for: ${chatName}`);
            return [...prev, {
              name: chatName,
              role: 'New Chat',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'online',
              avatar: avatar || '',
            }];
          }
          return prev;
        });
      } else {
        console.log(`❌ Not creating chat - mode: ${data.mode}, isFromCurrentUser: ${data.sender === currentUserEmail}`);
      }
    };

    const handleIncomingMessage = async (data: ChatMessage) => {
        const chatName = data.groupName || (data.sender === currentUserEmail ? data.receiver : data.sender);
        
        if (chatName) {
            const message = createMessage(data, data.sender === currentUserEmail);

            // Fetch avatar for the sender
            const senderAvatar = await getUserAvatar(data.sender);
            message.avatar = senderAvatar || '';

            // Ensure chat exists before adding message
            await ensureChatExists(chatName, data);

            // Add message to state and sort by createdAt
            setMessages(prev => {
              const existingMessages = prev[chatName] || [];
              const newMessages = [...existingMessages, message];

              // Sort messages by createdAt timestamp
              newMessages.sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeA - timeB;
              });

              return {
                ...prev,
                [chatName]: deduplicateMessages(newMessages),
              };
            });

            // Increment unread count if message is not from current user
            if (data.sender !== currentUserEmail) {
                setUnreadCounts(prev => ({
                    ...prev,
                    [chatName]: (prev[chatName] || 0) + 1,
                }));
            }
        }
    };

    socket.on('message', handleIncomingMessage);
    socket.on('groupMessage', handleIncomingMessage);
    socket.on('mediaMessage', async (data: ChatMessage) => {
        const chatName = data.groupName || (data.sender === currentUserEmail ? data.receiver : data.sender);
        
        if (chatName) {
            const message = createMessage({ ...data, isMedia: true }, data.sender === currentUserEmail);

            // Fetch avatar for the sender
            const senderAvatar = await getUserAvatar(data.sender);
            message.avatar = senderAvatar || '';

            // Ensure chat exists before adding message (important for new users sending media)
            await ensureChatExists(chatName, data);

            // Add message to state with sorting and deduplication
            setMessages(prev => {
              const existingMessages = prev[chatName] || [];
              const newMessages = [...existingMessages, message];

              // Sort messages by createdAt timestamp
              newMessages.sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeA - timeB;
              });

              return {
                ...prev,
                [chatName]: deduplicateMessages(newMessages),
              };
            });

            // Increment unread count if message is not from current user
            if (data.sender !== currentUserEmail) {
                setUnreadCounts(prev => ({
                    ...prev,
                    [chatName]: (prev[chatName] || 0) + 1,
                }));
            }
        }
    });

    // Handle message confirmation from server
    socket.on('message:sent', (data: ChatMessage & { _id?: string; delivered?: boolean }) => {
      console.log('Message sent confirmation:', data);
      // Message was saved successfully on server
      // Update the local message with server ID and createdAt if needed
      const chatName = data.receiver || '';
      if (chatName && data._id) {
        setMessages(prev => {
          const messages = prev[chatName] || [];
          // Find and update the optimistic message with server data
          const updated = messages.map(msg => {
            // Match by content and time if no server ID yet
            if (!msg.id.startsWith('offline-') && msg.content === data.text && msg.sender === data.sender) {
              return {
                ...msg,
                id: data._id as string,
                createdAt: data.createdAt ? (typeof data.createdAt === 'string' ? data.createdAt : data.createdAt.toString()) : msg.createdAt
              };
            }
            return msg;
          });

          // Sort messages after update
          updated.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeA - timeB;
          });

          return { ...prev, [chatName]: deduplicateMessages(updated) };
        });
      }
    });

    socket.on('groupMessage:sent', (data: ChatMessage) => {
      console.log('Group message sent confirmation:', data);
      // Similar handling for group messages
    });

    socket.on('mediaMessage:sent', (data: ChatMessage & { _id?: string; delivered?: boolean }) => {
      console.log('Media message sent confirmation:', data);
      // Handle media message confirmation
    });

    socket.on('error', (error: string | { message: string; code: string; requiresLogin?: boolean }) => {
      if (typeof error === 'string') {
        toast({ title: "Chat Error", description: error, variant: "destructive" });
      } else if (error.requiresLogin) {
        toast({
          title: "Authentication Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Chat Error", description: error.message, variant: "destructive" });
      }
    });

    // Store last connection timestamp for offline sync
    setLastConnectionTime(currentUserEmail);

    return () => {
      socket.off('message');
      socket.off('groupMessage');
      socket.off('mediaMessage');
      socket.off('message:sent');
      socket.off('groupMessage:sent');
      socket.off('mediaMessage:sent');
      socket.off('error');
    };
  }, [currentUserEmail, toast]);

  const addTeamChat = (chat: Chat) => {
    setTeamChats(prev => {
      // Check if chat already exists
      if (prev.some(c => c.name === chat.name)) {
        return prev;
      }
      return [...prev, chat];
    });
  };

  const setMessagesForChat = (chatName: string, msgs: Message[]) => {
    setMessages(prev => {
      const existingMessages = prev[chatName] || [];
      // Merge new messages with existing ones
      const merged = mergeMessages(existingMessages, msgs);
      return {
        ...prev,
        [chatName]: merged,
      };
    });
  };

  const markChatAsRead = (chatName: string) => {
    setUnreadCounts(prev => ({
      ...prev,
      [chatName]: 0,
    }));
  };

  const getTotalUnreadCount = (): number => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  };

  return (
    <ChatContext.Provider
      value={{
        chitChatChats,
        teamChats,
        messages,
        addChitChat,
        addTeamChat,
        addMessage,
        setMessagesForChat,
        unreadCounts,
        markChatAsRead,
        getTotalUnreadCount,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
