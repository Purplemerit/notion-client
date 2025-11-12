'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Video,
  Phone,
  Search,
  Plus,
  Loader2,
  Menu,
} from "lucide-react";
import { getChatSocket, setAuthErrorCallback, resetChatSocket, sendPrivateMessage, sendGroupMessage, sendMediaFile, initiateCall, answerCall, sendCallICECandidate, rejectCall, endCall, type ChatMessage } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { CallModal } from "@/components/CallModal";
import { useChatContext, type Chat, type Message } from "@/contexts/ChatContext";
import { usersAPI, chatAPI } from "@/lib/api";
import { OfflineMessageQueue, isOnline } from "@/lib/chatUtils";

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Constants
const CHAT_BACKGROUND = 'url("/img.png")';
const DEFAULT_GROUP = "Roboto UX Project";

// Components
const ChatListItem = ({ chat, onClick }: { chat: Chat; onClick: () => void }) => (
  <div
    className="flex items-start space-x-3 p-2 hover:bg-muted cursor-pointer"
    style={{
      borderRadius: '8px',
      border: '1px solid rgba(204, 204, 204, 0.80)',
      background: '#FFF',
    }}
    onClick={onClick}
  >
    <div className="relative flex-shrink-0">
      <Avatar className="w-10 h-10">
        <AvatarImage src={chat.avatar} />
        <AvatarFallback>{chat.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
      </Avatar>
      {chat.type && (
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-muted rounded-md flex items-center justify-center text-xs font-bold text-foreground border-2 border-background">
          {chat.type}
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground truncate">{chat.name}</p>
        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{chat.time}</span>
      </div>
      <p className="text-xs text-muted-foreground">{chat.role}</p>
      <p className="text-xs text-muted-foreground truncate">{chat.status}</p>
    </div>
  </div>
);

const MessageBubble = ({ message }: { message: Message }) => {
  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
  <div className={`flex items-end gap-3 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
    {!message.isOwn && (
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={message.avatar} />
        <AvatarFallback>{getInitials(message.sender)}</AvatarFallback>
      </Avatar>
    )}
    <div className={`max-w-[70%] p-3 rounded-xl shadow-sm ${message.isOwn ? 'bg-purple-100' : 'bg-white'}`}>
      <span className={`text-sm font-semibold mb-1 block ${message.isOwn ? 'text-purple-700' : 'text-foreground'}`}>
        {message.sender}
      </span>
      {message.isMedia && message.mediaUrl ? (
        <div className="space-y-2">
          {message.mimetype?.startsWith('image/') ? (
            <img src={message.mediaUrl} alt={message.filename} className="rounded max-w-full" />
          ) : message.mimetype?.startsWith('video/') ? (
            <video src={message.mediaUrl} controls className="rounded max-w-full" />
          ) : message.mimetype?.startsWith('audio/') ? (
            <audio src={message.mediaUrl} controls className="w-full" />
          ) : (
            <a href={message.mediaUrl} download={message.filename} className="text-primary hover:underline">
              📎 {message.filename}
            </a>
          )}
          {message.content && <p className="text-sm text-muted-foreground">{message.content}</p>}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground whitespace-pre-line">{message.content}</p>
      )}
      <div className="flex justify-end items-center mt-1">
        <span className="text-xs text-muted-foreground/80">{message.time}</span>
        {message.isOwn && <span className="text-xs text-green-500 ml-2">✓✓</span>}
      </div>
    </div>
    {message.isOwn && (
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={message.avatar} />
        <AvatarFallback>{getInitials(message.sender)}</AvatarFallback>
      </Avatar>
    )}
  </div>
  );
};

const ChatSidebar = ({
  chats,
  onSelectChat,
  showAddChatForm,
  setShowAddChatForm,
  showAddTeamForm,
  setShowAddTeamForm,
  newChatEmail,
  setNewChatEmail,
  newTeamName,
  setNewTeamName,
  handleAddDirectChat,
  handleAddTeamChat,
  userSearchResults,
  isSearchingUsers,
  handleUserSearch,
  handleSelectUserFromSearch,
  teamSearchQuery,
  setTeamSearchQuery,
  chitchatSearchQuery,
  setChitchatSearchQuery,
  isOpen,
  onClose,
}: {
  chats: { team: Chat[]; chitchat: Chat[] };
  onSelectChat: (chat: Chat) => void;
  showAddChatForm: boolean;
  setShowAddChatForm: (show: boolean) => void;
  showAddTeamForm: boolean;
  setShowAddTeamForm: (show: boolean) => void;
  newChatEmail: string;
  setNewChatEmail: (email: string) => void;
  newTeamName: string;
  setNewTeamName: (name: string) => void;
  handleAddDirectChat: () => void;
  handleAddTeamChat: () => void;
  userSearchResults: User[];
  isSearchingUsers: boolean;
  handleUserSearch: (query: string) => void;
  handleSelectUserFromSearch: (user: User) => void;
  teamSearchQuery: string;
  setTeamSearchQuery: (query: string) => void;
  chitchatSearchQuery: string;
  setChitchatSearchQuery: (query: string) => void;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .filter(n => n.length > 0)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter chats based on search query
  const filteredTeamChats = chats.team.filter(chat =>
    chat.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
    chat.role.toLowerCase().includes(teamSearchQuery.toLowerCase())
  );

  const filteredChitchats = chats.chitchat.filter(chat =>
    chat.name.toLowerCase().includes(chitchatSearchQuery.toLowerCase()) ||
    chat.role.toLowerCase().includes(chitchatSearchQuery.toLowerCase())
  );

  return (
  <div
    className={`fixed lg:relative inset-y-0 right-0 z-50 border-l bg-white flex lg:flex-shrink-0 h-full overflow-y-auto w-full sm:w-96 xl:w-[400px] flex-col gap-6 p-4 sm:p-6 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
  >
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px', alignSelf: 'stretch', flex: 1, minHeight: 0 }}>
      <h3 className="text-lg font-semibold text-foreground flex-shrink-0">Messages</h3>
      <Tabs defaultValue="chitchat" className="w-full flex flex-col flex-1" style={{ minHeight: 0 }}>
        <style jsx>{`
          :global(button[data-state="active"]) {
            background-color: #846BD2 !important;
            color: white !important;
          }
        `}</style>
        <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="chitchat">ChitChat</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px', flexShrink: 0, alignSelf: 'stretch', flex: 1, minHeight: 0 }}>
          <div className="relative w-full flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              placeholder="Search inbox" 
              className="pl-9" 
              value={teamSearchQuery}
              onChange={(e) => setTeamSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-full flex-1 overflow-y-auto">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-sm font-medium text-foreground">Teams</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-primary/10"
                onClick={() => setShowAddTeamForm(!showAddTeamForm)}
              >
                <Plus size={16} className={showAddTeamForm ? "text-primary" : "text-muted-foreground"} />
              </Button>
            </div>

            {showAddTeamForm && (
              <div className="mx-2 mb-3 p-3 bg-white border border-gray-300 rounded-lg shadow-sm">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Enter team name..."
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTeamChat();
                      }
                    }}
                    className="flex-1 h-9 text-sm bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddTeamChat}
                    className="h-9 px-4 text-sm bg-primary text-white hover:bg-primary/90"
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {filteredTeamChats.length > 0 ? (
                filteredTeamChats.map((chat, index) => (
                  <ChatListItem key={index} chat={chat} onClick={() => {
                    onSelectChat(chat);
                    onClose();
                  }} />
                ))
              ) : teamSearchQuery ? (
                <p className="text-xs text-muted-foreground text-center py-4">No teams found matching &quot;{teamSearchQuery}&quot;</p>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No team chats yet. Click + to add one.</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chitchat" className="mt-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px', flexShrink: 0, alignSelf: 'stretch', flex: 1, minHeight: 0 }}>
          <div className="relative w-full flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              placeholder="Search inbox" 
              className="pl-9"
              value={chitchatSearchQuery}
              onChange={(e) => setChitchatSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-full flex-1 overflow-y-auto">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-sm font-medium text-foreground">Chit Chat</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-primary/10"
                onClick={() => setShowAddChatForm(!showAddChatForm)}
              >
                <Plus size={16} className={showAddChatForm ? "text-primary" : "text-muted-foreground"} />
              </Button>
            </div>

            {showAddChatForm && (
              <div className="mx-2 mb-3 p-3 bg-white border border-gray-300 rounded-lg shadow-sm">
                <div className="mb-2">
                  <Input
                    placeholder="Search users by name or email..."
                    value={newChatEmail}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    className="flex-1 h-9 text-sm bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                {/* Search Results */}
                {isSearchingUsers ? (
                  <div className="text-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-gray-500" />
                  </div>
                ) : userSearchResults.length > 0 ? (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {userSearchResults.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={() => handleSelectUserFromSearch(user)}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm flex-1 min-w-0">
                          <div className="font-medium truncate">{user.name}</div>
                          <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : newChatEmail ? (
                  <div className="text-center py-3 text-xs text-gray-500">No users found</div>
                ) : (
                  <div className="text-center py-3 text-xs text-gray-500">
                    Start typing to search users
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              {filteredChitchats.length > 0 ? (
                filteredChitchats.map((chat, index) => (
                  <ChatListItem key={index} chat={chat} onClick={() => {
                    onSelectChat(chat);
                    onClose();
                  }} />
                ))
              ) : chitchatSearchQuery ? (
                <p className="text-xs text-muted-foreground text-center py-4">No chats found matching &quot;{chitchatSearchQuery}&quot;</p>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No chats yet. Click + to add one.</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </div>
  );
};

// Main Component
export default function Chat() {
  const router = useRouter();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use ChatContext
  const { chitChatChats, teamChats, addChitChat, addTeamChat, messages: contextMessages, addMessage: addMessageToContext, setMessagesForChat, markChatAsRead } = useChatContext();

  const [currentView, setCurrentView] = useState("chat");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [showAddChatForm, setShowAddChatForm] = useState(false);
  const [showAddTeamForm, setShowAddTeamForm] = useState(false);
  const [newChatEmail, setNewChatEmail] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [chitchatSearchQuery, setChitchatSearchQuery] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Call state
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callState, setCallState] = useState<'incoming' | 'outgoing' | 'connected'>('outgoing');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [caller, setCaller] = useState<string>('');
  const [callee, setCallee] = useState<string>('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [pendingIceCandidates, setPendingIceCandidates] = useState<RTCIceCandidate[]>([]);
  const [callTimeout, setCallTimeout] = useState<NodeJS.Timeout | null>(null);

  // ICE candidate cleanup ref to prevent memory leaks
  const iceCandidateCleanupRef = useRef<NodeJS.Timeout | null>(null);

  // Helpers
  const createMessage = (data: ChatMessage, isOwn: boolean = false): Message => ({
    id: `${Date.now()}-${Math.random()}`,
    sender: data.sender,
    content: data.text || data.filename || 'Media file',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    avatar: `https://i.pravatar.cc/150?u=${data.sender}`,
    isOwn,
    mediaUrl: data.mediaUrl,
    filename: data.filename,
    mimetype: data.mimetype,
    isMedia: data.isMedia || !!data.mediaUrl,
  });

  const processPendingIceCandidates = async (pc: RTCPeerConnection) => {
    if (pendingIceCandidates.length > 0 && pc.remoteDescription) {
      console.log(`Processing ${pendingIceCandidates.length} pending ICE candidates`);
      const candidatesToProcess = [...pendingIceCandidates]; // Create copy to avoid race conditions
      setPendingIceCandidates([]); // Clear immediately to prevent accumulation

      for (const candidate of candidatesToProcess) {
        try {
          if (pc.signalingState !== 'closed' && 
              pc.connectionState !== 'closed' &&
              pc.connectionState !== 'failed') {
            await pc.addIceCandidate(candidate);
          }
        } catch (error) {
          console.error('Error adding pending ICE candidate:', error);
        }
      }
    }
  };

  // Cleanup old ICE candidates to prevent memory leaks
  const cleanupOldIceCandidates = useCallback(() => {
    if (iceCandidateCleanupRef.current) {
      clearTimeout(iceCandidateCleanupRef.current);
    }
    
    iceCandidateCleanupRef.current = setTimeout(() => {
      setPendingIceCandidates(prev => {
        if (prev.length > 50) { // Limit to 50 candidates max
          console.warn(`Cleaning up ${prev.length - 50} old ICE candidates to prevent memory leak`);
          return prev.slice(-50); // Keep only the latest 50
        }
        return prev;
      });
    }, 10000); // Clean up every 10 seconds
  }, []);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

  const addMessage = (msg: Message) => {
    // Don't add to local state - let context handle it and the useEffect will update local state
    // This prevents duplicate messages
    if (selectedChat) {
      const chatKey = selectedChat.name;
      addMessageToContext(chatKey, msg);
    }
  };

  // Process offline queue
  useEffect(() => {
    const processOfflineQueue = async () => {
      if (!isOnline() || !currentUser) return;

      const pendingMessages = OfflineMessageQueue.getPendingMessages();
      if (pendingMessages.length === 0) return;

      console.log(`Processing ${pendingMessages.length} offline messages`);

      for (const queuedMsg of pendingMessages) {
        try {
          OfflineMessageQueue.markAsSending(queuedMsg.id);

          if (queuedMsg.type === 'group') {
            await sendGroupMessage(
              queuedMsg.message.sender,
              queuedMsg.message.groupName!,
              queuedMsg.message.text,
            );
          } else {
            await sendPrivateMessage(
              queuedMsg.message.sender,
              queuedMsg.message.receiver!,
              queuedMsg.message.text,
            );
          }

          // Remove from queue on success
          OfflineMessageQueue.dequeue(queuedMsg.id);
        } catch (error) {
          console.error('Failed to send offline message:', error);
          OfflineMessageQueue.markAsFailed(queuedMsg.id);
        }
      }
    };

    // Process queue on mount and when coming online
    processOfflineQueue();

    // Listen for online events
    window.addEventListener('online', processOfflineQueue);
    return () => window.removeEventListener('online', processOfflineQueue);
  }, [currentUser]);

  // Socket Effects
  useEffect(() => {
    // Fetch the actual user email
    import('@/lib/api').then(({ usersAPI }) => {
      usersAPI.getMe().then((user: any) => {
        setCurrentUser(user.email);
      }).catch((error) => {
        console.error('Failed to get user:', error);
      });
    });
  }, []);

  // Separate effect for socket setup with better cleanup to prevent memory leaks
  useEffect(() => {
    if (!currentUser) return;

    const socket = getChatSocket();
    
    // Create scoped handlers to ensure proper cleanup
    const handleConnect = () => {
      console.log('Chat socket connected successfully');
    };

    const handleDisconnect = () => {
      console.log('Chat socket disconnected');
    };

    const handleConnectError = (error: any) => {
      console.error('Chat socket connection error:', error);
    };

    const handleCallIncoming = async (data: { caller: string; offer: any; callType: 'audio' | 'video' }) => {
      try {
        console.log(`Incoming ${data.callType} call from ${data.caller}`);
        setCaller(data.caller);
        setCallee(currentUser);
        setCallType(data.callType);
        setCallState('incoming');
        setIsCallModalOpen(true);

        // Create peer connection for incoming call
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        });

        pc.onicecandidate = (event) => {
          if (event.candidate && pc.signalingState !== 'closed') {
            sendCallICECandidate(currentUser, data.caller, event.candidate);
          }
        };

        pc.ontrack = (event) => {
          const remoteStream = event.streams[0];
          setRemoteStream(remoteStream);
          trackMediaStream(remoteStream); // Track for cleanup
        };

        pc.onconnectionstatechange = () => {
          console.log('Peer connection state changed:', pc.connectionState);
          if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            cleanupCall();
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        setPeerConnection(pc);
        // Process any pending ICE candidates
        await processPendingIceCandidates(pc);
      } catch (error) {
        console.error('Error handling incoming call:', error);
        toast({
          title: "Call Error",
          description: "Failed to setup incoming call",
          variant: "destructive",
        });
        cleanupCall();
      }
    };

    const handleCallAnswered = async (data: { callee: string; answer: any }) => {
      try {
        if (peerConnection && peerConnection.signalingState !== 'closed') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          setCallState('connected');
          // Process any pending ICE candidates
          await processPendingIceCandidates(peerConnection);
        }
      } catch (error) {
        console.error('Error handling call answer:', error);
        toast({
          title: "Call Error",
          description: "Failed to establish connection",
          variant: "destructive",
        });
        cleanupCall();
      }
    };

    const handleIceCandidate = async (data: { sender: string; candidate: any }) => {
      if (data.candidate) {
        const candidate = new RTCIceCandidate(data.candidate);
        
        if (peerConnection && 
            peerConnection.signalingState !== 'closed' && 
            peerConnection.connectionState !== 'closed' &&
            peerConnection.connectionState !== 'failed' &&
            peerConnection.remoteDescription) {
          try {
            await peerConnection.addIceCandidate(candidate);
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        } else {
          // Queue the candidate but limit queue size and trigger cleanup
          setPendingIceCandidates(prev => {
            const newCandidates = [...prev, candidate];
            if (newCandidates.length > 20) { // Immediate limit to prevent runaway growth
              console.warn('ICE candidate queue getting large, keeping only latest 20');
              return newCandidates.slice(-20);
            }
            return newCandidates;
          });
          cleanupOldIceCandidates(); // Trigger cleanup timer
        }
      }
    };

    const handleCallRejected = (data: { callee: string; reason: string }) => {
      toast({
        title: "Call Rejected",
        description: data.reason,
        variant: "destructive",
      });
      cleanupCall();
    };

    const handleCallEnded = () => {
      toast({
        title: "Call Ended",
        description: "The call has been ended.",
      });
      cleanupCall();
    };

    const handleCallError = (data: { message: string }) => {
      toast({
        title: "Call Error",
        description: data.message,
        variant: "destructive",
      });
      cleanupCall();
    };

    // Add connection debugging
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    // Call event listeners with scoped handlers
    socket.on('call:incoming', handleCallIncoming);
    socket.on('call:answered', handleCallAnswered);
    socket.on('call:iceCandidate', handleIceCandidate);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:error', handleCallError);

    // Cleanup ALL listeners on unmount or currentUser change to prevent duplicates
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('call:incoming', handleCallIncoming);
      socket.off('call:answered', handleCallAnswered);
      socket.off('call:iceCandidate', handleIceCandidate);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:error', handleCallError);
    };
  }, [currentUser, toast, peerConnection, cleanupOldIceCandidates, processPendingIceCandidates]);

  // Update local messages when context messages change for selected chat
  useEffect(() => {
    if (selectedChat) {
      const chatKey = selectedChat.name;
      const contextMsgs = contextMessages[chatKey] || [];
      setMessages(contextMsgs);
      scrollToBottom();
    }
  }, [contextMessages, selectedChat]);

  // Cleanup on unmount and proper stream management
  useEffect(() => {
    return () => {
      cleanupCall();
      // Clean up ICE candidate cleanup timer
      if (iceCandidateCleanupRef.current) {
        clearTimeout(iceCandidateCleanupRef.current);
        iceCandidateCleanupRef.current = null;
      }
    };
  }, []);

  // Stream cleanup ref to prevent hanging tracks
  const streamCleanupRef = useRef<Set<MediaStream>>(new Set());

  // Track all streams for proper cleanup
  const trackMediaStream = useCallback((stream: MediaStream | null) => {
    if (stream) {
      streamCleanupRef.current.add(stream);
    }
  }, []);

  // Enhanced cleanup function with better stream management
  const cleanupCall = useCallback(() => {
    try {
      console.log('Starting call cleanup...');
      
      // Stop and clean up all tracked streams
      streamCleanupRef.current.forEach(stream => {
        stream.getTracks().forEach(track => {
          if (track.readyState !== 'ended') {
            track.stop();
            console.log(`Stopped ${track.kind} track`);
          }
        });
      });
      streamCleanupRef.current.clear();

      // Clean up current local stream
      if (localStream) {
        localStream.getTracks().forEach(track => {
          if (track.readyState !== 'ended') {
            track.stop();
            console.log(`Stopped local ${track.kind} track`);
          }
        });
      }

      // Clean up peer connection
      if (peerConnection) {
        // Check if connection is not already closed
        if (peerConnection.signalingState !== 'closed') {
          // Remove event listeners to prevent memory leaks
          peerConnection.onicecandidate = null;
          peerConnection.ontrack = null;
          peerConnection.onconnectionstatechange = null;
          peerConnection.close();
          console.log('Peer connection closed');
        }
      }

      // Clear call timeout
      if (callTimeout) {
        clearTimeout(callTimeout);
      }

      // Clear ICE candidate cleanup timer
      if (iceCandidateCleanupRef.current) {
        clearTimeout(iceCandidateCleanupRef.current);
        iceCandidateCleanupRef.current = null;
      }
    } catch (error) {
      console.error('Error during call cleanup:', error);
    } finally {
      // Reset all call-related state
      setIsCallModalOpen(false);
      setLocalStream(null);
      setRemoteStream(null);
      setPeerConnection(null);
      setIsMuted(false);
      setIsVideoOff(false);
      setPendingIceCandidates([]);
      setCallTimeout(null);
      console.log('Call cleanup completed');
    }
  }, [localStream, peerConnection, callTimeout]);

  // Handlers
  const handleSendMessage = () => {
    if (!message.trim() || !selectedChat) return;

    const chatKey = selectedChat.name;
    const isGroup = selectedChat.type === 'TEAM' || teamChats.some(t => t.name === selectedChat.name);

    // Create message for immediate display (optimistic UI)
    const newMsg = createMessage(
      { sender: currentUser, text: message, receiver: chatKey } as ChatMessage,
      true,
    );
    addMessage(newMsg);

    // Check if online
    if (isOnline()) {
      // Send immediately
      if (isGroup) {
        sendGroupMessage(currentUser, chatKey, message);
      } else {
        sendPrivateMessage(currentUser, chatKey, message);
      }
    } else {
      // Queue for later when online
      const messageData = {
        sender: currentUser,
        text: message,
        ...(isGroup ? { groupName: chatKey } : { receiver: chatKey }),
      };

      OfflineMessageQueue.enqueue(
        chatKey,
        messageData,
        isGroup ? 'group' : 'private',
      );

      toast({
        title: 'Offline',
        description: 'Message will be sent when you\'re back online',
        variant: 'default',
      });
    }

    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      const params: [string, string | undefined, string | undefined, string, string, string, 'private' | 'group'] = selectedChat
        ? [currentUser, selectedChat.name, undefined, file.name, file.type, base64Data, 'private']
        : [currentUser, undefined, DEFAULT_GROUP, file.name, file.type, base64Data, 'group'];

      sendMediaFile(...params);
      toast({ title: "File Sent", description: `${file.name} has been sent.` });
    };

    reader.onerror = () => {
      toast({ title: "Upload Error", description: "Failed to read file.", variant: "destructive" });
    };

    reader.readAsDataURL(file);
  };

  const handleVideoCall = async () => {
    if (!selectedChat) return;
    await startCall('video');
  };

  const handleVideoCallRoom = () => {
    if (!selectedChat) return;
    const roomName = `room-${currentUser}-${selectedChat.name}`.replace(/[^a-zA-Z0-9-]/g, '');
    router.push(`/video/${roomName}`);
  };

  const handleAudioCall = async () => {
    if (!selectedChat) return;
    await startCall('audio');
  };

  // Debug function to test socket connection
  const testSocketConnection = () => {
    const socket = getChatSocket();
    console.log('Testing socket connection...');
    console.log('Socket connected:', socket.connected);
    console.log('Socket ID:', socket.id);
    console.log('Current user:', currentUser);
    console.log('Selected chat:', selectedChat?.name);
  };

  const startCall = async (type: 'audio' | 'video') => {
    try {
      console.log(`Starting ${type} call to ${selectedChat?.name}`);
      setCallType(type);
      setCallState('outgoing');
      setCaller(currentUser);
      setCallee(selectedChat!.name);
      setIsCallModalOpen(true);

      // Set timeout for call
      const timeout = setTimeout(() => {
        toast({
          title: "Call Timeout",
          description: "The call could not be connected. Please try again.",
          variant: "destructive",
        });
        cleanupCall();
      }, 30000); // 30 second timeout
      setCallTimeout(timeout);

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video', // Enable video for video calls
      });
      setLocalStream(stream);
      trackMediaStream(stream); // Track for cleanup

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && pc.signalingState !== 'closed') {
          sendCallICECandidate(currentUser, selectedChat!.name, event.candidate);
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Peer connection state changed:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          // Clear timeout when connected
          if (callTimeout) {
            clearTimeout(callTimeout);
            setCallTimeout(null);
          }
        } else if (pc.connectionState === 'failed') {
          toast({
            title: "Connection Failed",
            description: "The call connection failed",
            variant: "destructive",
          });
          cleanupCall();
        } else if (pc.connectionState === 'closed') {
          cleanupCall();
        }
      };

      setPeerConnection(pc);

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log(`Sending ${type} call offer to ${selectedChat!.name}`);
      initiateCall(currentUser, selectedChat!.name, offer, type);
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Call Failed",
        description: "Could not start the call. Please check your permissions.",
        variant: "destructive",
      });
      cleanupCall();
    }
  };

  const handleAcceptCall = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      setLocalStream(stream);
      trackMediaStream(stream); // Track for cleanup

      // Peer connection should already exist from incoming call setup
      if (peerConnection && peerConnection.signalingState !== 'closed') {
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        answerCall(caller, currentUser, answer);
        setCallState('connected');
      } else {
        throw new Error('Peer connection not available or already closed');
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      toast({
        title: "Call Failed",
        description: "Could not accept the call.",
        variant: "destructive",
      });
      cleanupCall();
    }
  };

  const handleRejectCall = () => {
    rejectCall(caller, currentUser, 'User declined the call');
    cleanupCall();
  };

  const handleEndCall = () => {
    endCall(currentUser, callState === 'incoming' ? caller : callee);
    cleanupCall();
  };

  const handleToggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleSelectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    setIsLoadingHistory(true);

    // Use the chat name as the key (which is the email for direct chats)
    const chatKey = chat.name;

    // Mark chat as read
    markChatAsRead(chatKey);

    // Load messages from context first (for immediate display)
    // Don't replace - this will be updated by the useEffect that watches contextMessages
    // Just let the context messages flow through

    // Then fetch message history from backend
    try {
      // Check if it's a team/group chat
      const isGroup = chat.type === 'TEAM' || teamChats.some(t => t.name === chat.name);

      let response;
      if (isGroup) {
        response = await chatAPI.getGroupConversation(chat.name, 100);
      } else {
        // For direct chats, chat.name is the other user's email
        response = await chatAPI.getPrivateConversation(chat.name, 100);
      }

      if (response.success && response.messages) {
        // Convert backend messages to frontend format
        const loadedMessages: Message[] = response.messages.map((msg: any) => ({
          id: msg._id || `${Date.now()}-${Math.random()}`,
          sender: msg.sender,
          content: msg.text || msg.filename || 'Media file',
          time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: `https://i.pravatar.cc/150?u=${msg.sender}`,
          isOwn: msg.sender === currentUser,
          mediaUrl: msg.mediaUrl,
          filename: msg.filename,
          mimetype: msg.mimetype,
          isMedia: msg.isMedia || !!msg.mediaUrl,
        }));

        // Update context with loaded messages (this uses merge now!)
        setMessagesForChat(chatKey, loadedMessages);
        // The useEffect below will update local messages from context
        // No need to call setMessages directly - prevents race condition
      }
    } catch (error) {
      console.error('Failed to load message history:', error);
      // Don't show error toast, just continue with local messages
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Search users
  const handleUserSearch = async (query: string) => {
    setNewChatEmail(query);
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const users = await usersAPI.search(query);
      setUserSearchResults(users);
    } catch (error) {
      console.error('Failed to search users:', error);
      toast({
        title: "Search Failed",
        description: "Failed to search users",
        variant: "destructive",
      });
    } finally {
      setIsSearchingUsers(false);
    }
  };

  // Select user from search results
  const handleSelectUserFromSearch = (user: User) => {
    const newChat: Chat = {
      name: user.email,
      role: user.name,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "Start a conversation...",
      avatar: user.avatar || `https://i.pravatar.cc/150?u=${user.email}`,
    };

    addChitChat(newChat);
    setSelectedChat(newChat);
    setMessages([]);
    setNewChatEmail("");
    setUserSearchResults([]);
    setShowAddChatForm(false);
    toast({
      title: "Chat Added",
      description: `You can now chat with ${user.name}`,
    });
  };

  const handleAddDirectChat = () => {
    if (!newChatEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    const newChat: Chat = {
      name: newChatEmail,
      role: "Direct Message",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "Start a conversation...",
      avatar: `https://i.pravatar.cc/150?u=${newChatEmail}`,
    };

    addChitChat(newChat);
    setSelectedChat(newChat);
    setMessages([]);
    setNewChatEmail("");
    setShowAddChatForm(false);
    toast({
      title: "Chat Added",
      description: `You can now chat with ${newChatEmail}`,
    });
  };

  const handleAddTeamChat = () => {
    if (!newTeamName.trim()) {
      toast({
        title: "Team Name Required",
        description: "Please enter a team name.",
        variant: "destructive",
      });
      return;
    }

    const newTeam: Chat = {
      name: newTeamName,
      role: "Team Chat",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "Team chat created...",
      avatar: `https://i.pravatar.cc/150?u=${newTeamName}`,
      type: "TEAM",
    };

    addTeamChat(newTeam);
    setSelectedChat(newTeam);
    setMessages([]);
    setNewTeamName("");
    setShowAddTeamForm(false);
    toast({
      title: "Team Chat Created",
      description: `Team "${newTeamName}" has been created.`,
    });
  };

  return (
    <div className="flex h-screen w-full bg-[#F9F9F9] overflow-hidden">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex-1 flex border-l h-full">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-white z-10 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              {/* Mobile Sidebar Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-muted-foreground h-8 w-8 flex-shrink-0"
                onClick={() => setIsChatSidebarOpen(!isChatSidebarOpen)}
              >
                <Menu size={20} />
              </Button>
              
              {selectedChat ? (
                <>
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                    <AvatarImage src={selectedChat.avatar} />
                    <AvatarFallback>{selectedChat.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{selectedChat.name}</h3>
                    {selectedChat.role && <p className="text-xs text-muted-foreground truncate">{selectedChat.role}</p>}
                  </div>
                </>
              ) : (
                <>
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                    <AvatarFallback>?</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-muted-foreground text-sm sm:text-base truncate">Select a chat to start messaging</h3>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Debug button - remove in production */}
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground rounded-lg bg-white shadow-sm h-8 w-8 sm:h-10 sm:w-10"
                onClick={testSocketConnection}
                title="Test Socket Connection"
              >
                🔧
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground rounded-lg bg-white shadow-sm h-8 w-8 sm:h-10 sm:w-10"
                disabled={!selectedChat}
                onClick={handleAudioCall}
              >
                <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground rounded-lg bg-white shadow-sm h-8 w-8 sm:h-10 sm:w-10"
                onClick={handleVideoCall}
                disabled={!selectedChat}
              >
                <Video className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6"
            style={{
              backgroundImage: CHAT_BACKGROUND,
              backgroundRepeat: 'repeat',
              backgroundPosition: 'center',
            }}
          >
            {selectedChat ? (
              isLoadingHistory ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Avatar className="w-16 h-16 mx-auto mb-4">
                      <AvatarImage src={selectedChat.avatar} />
                      <AvatarFallback>{selectedChat.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{selectedChat.name}</h3>
                    <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Plus size={32} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No chat selected</h3>
                  <p className="text-sm text-muted-foreground">Select a chat from the sidebar or create a new one</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 sm:p-4 border-t bg-white flex-shrink-0 flex justify-center">
            <div className="flex flex-col justify-center items-center gap-2 rounded-2xl border border-gray-300 bg-white p-3 sm:p-4 w-full max-w-4xl">
              <div className="flex items-center w-full gap-1 sm:gap-2">
                <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0" disabled={!selectedChat}>
                  {/* Custom Smile SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="none">
                    <path d="M8 14.5C8 14.5 9.5 16.5 12 16.5C14.5 16.5 16 14.5 16 14.5M9 9.5H9.01M15 9.5H15.01M22 12.5C22 18.0228 17.5228 22.5 12 22.5C6.47715 22.5 2 18.0228 2 12.5C2 6.97715 6.47715 2.5 12 2.5C17.5228 2.5 22 6.97715 22 12.5Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!selectedChat}
                >
                  {/* Custom Paperclip SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25" fill="none" style={{ width: '25px', height: '25px', aspectRatio: '1/1' }}>
                    <path d="M7.81266 17.1868H14.1147C13.896 17.6764 13.7293 18.1973 13.6356 18.7493H7.81266C4.646 18.7493 2.0835 16.1868 2.0835 13.0202C2.0835 9.85352 4.646 7.29102 7.81266 7.29102H18.7502C21.0522 7.29102 22.9168 9.1556 22.9168 11.4577C22.9168 12.4056 22.5939 13.2702 22.0522 13.9681C21.4897 13.7493 20.8856 13.6139 20.2606 13.5723C20.7108 13.2529 21.0476 12.7986 21.2223 12.275C21.397 11.7514 21.4004 11.1858 21.2322 10.6602C21.0639 10.1345 20.7326 9.67605 20.2864 9.35123C19.8402 9.0264 19.3021 8.85208 18.7502 8.85352H7.81266C5.51058 8.85352 3.646 10.7181 3.646 13.0202C3.646 15.3223 5.51058 17.1868 7.81266 17.1868ZM9.896 14.0618C9.32308 14.0618 8.85433 13.5931 8.85433 13.0202C8.85433 12.4473 9.32308 11.9785 9.896 11.9785H17.7085V10.416H9.896C9.20533 10.416 8.54295 10.6904 8.05457 11.1788C7.5662 11.6671 7.29183 12.3295 7.29183 13.0202C7.29183 13.7108 7.5662 14.3732 8.05457 14.8616C8.54295 15.35 9.20533 15.6243 9.896 15.6243H15.146C15.7442 14.9547 16.4796 14.4217 17.3022 14.0618H9.896ZM20.8335 18.7493V15.6243H18.7502V18.7493H15.6252V20.8327H18.7502V23.9577H20.8335V20.8327H23.9585V18.7493H20.8335Z" fill="black"/>
                  </svg>
                </Button>
                <Input
                  placeholder={selectedChat ? "Type Message.." : "Select a chat to start messaging"}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!selectedChat}
                  className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                  onClick={handleSendMessage}
                  disabled={!selectedChat}
                >
                  {/* Custom Send SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25" fill="none" style={{ width: '25px', height: '25px', aspectRatio: '1/1' }}>
                    <g clipPath="url(#clip0_2570_9833)">
                      <path fillRule="evenodd" clipRule="evenodd" d="M18.7087 8.68281C18.8017 9.36861 19.3832 9.89167 20.0577 9.89167C20.7438 9.89167 21.3136 9.36861 21.4066 8.67119C21.5578 7.42747 22.5463 6.43946 23.7906 6.28836C24.4767 6.19537 25 5.62581 25 4.94002C25 4.25423 24.4767 3.68468 23.779 3.59169C23.173 3.5162 22.6096 3.24088 22.1778 2.80929C21.746 2.37771 21.4705 1.81452 21.395 1.20885C21.302 0.523061 20.7322 0 20.0461 0C19.3599 0 18.7901 0.523061 18.6971 1.22048C18.6196 1.82539 18.3436 2.38751 17.9121 2.81873C17.4807 3.24996 16.9183 3.5259 16.3131 3.60331C15.627 3.6963 15.1037 4.26585 15.1037 4.95165C15.1037 5.63744 15.627 6.20699 16.3248 6.29998C17.5691 6.45109 18.5575 7.43909 18.7087 8.68281ZM20.0577 7.11363C19.6155 6.15975 18.849 5.39364 17.8947 4.95165C18.8483 4.50995 19.6158 3.74279 20.0577 2.78966C20.4996 3.74279 21.2671 4.50995 22.2207 4.95165C21.2671 5.39334 20.4996 6.1605 20.0577 7.11363ZM11.9197 25C17.0365 25 19.6181 25 21.4904 23.3959C21.7578 23.1635 22.002 22.9194 22.2346 22.652C23.8394 20.7806 23.8394 18.2118 23.8394 13.0858C23.8394 12.6093 23.444 12.2141 22.9673 12.2141C22.4905 12.2141 22.0951 12.6093 22.0951 13.0858C22.0951 17.7818 22.0951 20.1413 20.9089 21.5245C20.7461 21.7221 20.5601 21.9081 20.3624 22.0709C18.9785 23.2565 16.6178 23.2565 11.9197 23.2565C7.2216 23.2565 4.86092 23.2565 3.47707 22.0709C3.27937 21.9081 3.09331 21.7221 2.93051 21.5245C1.74435 20.1413 1.74435 17.7818 1.74435 13.0858C1.74435 8.3899 1.74435 6.03031 2.93051 4.64711C3.09331 4.44951 3.27937 4.26353 3.47707 4.1008C4.86092 2.91519 7.2216 2.91519 11.9197 2.91519C12.3965 2.91519 12.7919 2.51999 12.7919 2.04343C12.7919 1.56686 12.3965 1.17166 11.9197 1.17166C6.80296 1.17166 4.22132 1.17166 2.34906 2.77571C2.08159 3.00818 1.83738 3.25228 1.6048 3.51962C1.38628e-07 5.39102 0 7.97145 0 13.0858C0 18.2002 1.38628e-07 20.7806 1.6048 22.652C1.83738 22.9194 2.08159 23.1751 2.34906 23.3959C4.22132 25 6.79133 25 11.9197 25ZM8.14146 14.8294C8.14146 15.3059 8.53684 15.7011 9.01363 15.7011C9.49042 15.7011 9.8858 15.3059 9.8858 14.8294V11.3423C9.8858 10.8657 9.49042 10.4705 9.01363 10.4705C8.53684 10.4705 8.14146 10.8657 8.14146 11.3423V14.8294ZM12.5023 19.1882C12.0255 19.1882 11.6302 18.793 11.6302 18.3164V7.85522C11.6302 7.37865 12.0255 6.98345 12.5023 6.98345C12.9791 6.98345 13.3745 7.37865 13.3745 7.85522V18.3164C13.3745 18.793 12.9791 19.1882 12.5023 19.1882ZM15.1188 15.9917C15.1188 16.4683 15.5142 16.8635 15.991 16.8635C16.4678 16.8635 16.8632 16.4683 16.8632 15.9917V10.1799C16.8632 9.70337 16.4678 9.30816 15.991 9.30816C15.5142 9.30816 15.1188 9.70337 15.1188 10.1799V15.9917ZM5.52377 14.5388C5.04698 14.5388 4.6516 14.1436 4.6516 13.667V12.5046C4.6516 12.0281 5.04698 11.6329 5.52377 11.6329C6.00056 11.6329 6.39594 12.0281 6.39594 12.5046V13.667C6.39594 14.1436 6.00056 14.5388 5.52377 14.5388Z" fill="black"/>
                    </g>
                    <defs>
                      <clipPath id="clip0_2570_9833">
                        <rect width="25" height="25" fill="white"/>
                      </clipPath>
                    </defs>
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <ChatSidebar
          chats={{ team: teamChats, chitchat: chitChatChats }}
          onSelectChat={handleSelectChat}
          showAddChatForm={showAddChatForm}
          setShowAddChatForm={setShowAddChatForm}
          showAddTeamForm={showAddTeamForm}
          setShowAddTeamForm={setShowAddTeamForm}
          newChatEmail={newChatEmail}
          setNewChatEmail={setNewChatEmail}
          newTeamName={newTeamName}
          setNewTeamName={setNewTeamName}
          handleAddDirectChat={handleAddDirectChat}
          handleAddTeamChat={handleAddTeamChat}
          userSearchResults={userSearchResults}
          isSearchingUsers={isSearchingUsers}
          handleUserSearch={handleUserSearch}
          handleSelectUserFromSearch={handleSelectUserFromSearch}
          isOpen={isChatSidebarOpen}
          onClose={() => setIsChatSidebarOpen(false)}
          teamSearchQuery={teamSearchQuery}
          setTeamSearchQuery={setTeamSearchQuery}
          chitchatSearchQuery={chitchatSearchQuery}
          setChitchatSearchQuery={setChitchatSearchQuery}
        />
      </div>

      {/* Call Modal */}
      <CallModal
        isOpen={isCallModalOpen}
        callType={callType}
        callState={callState}
        caller={caller}
        callee={callee}
        callerAvatar={`https://i.pravatar.cc/150?u=${caller}`}
        calleeAvatar={`https://i.pravatar.cc/150?u=${callee}`}
        localStream={localStream}
        remoteStream={remoteStream}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onEnd={handleEndCall}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
      />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
