'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Mic,
  Video,
  PhoneOff,
  MoreHorizontal,
  Users,
  Share2,
  ScreenShare,
  Send,
  Copy,
  MicOff,
  VideoOff,
  MessageSquare,
  Hand,
  Upload,
  Ellipsis,
  Circle,
  CheckCircle2,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { getVideoSocket, joinVideoRoom, sendOffer, sendAnswer, sendICECandidate, leaveVideoRoom } from "@/lib/socket";
import { meetingsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Participant {
  socketId: string;
  userId?: string;
  stream?: MediaStream;
}

interface PeerConnection {
  connection: RTCPeerConnection;
  participant: Participant;
}

export default function MeetingRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;
  const { toast } = useToast();

  const [currentView, setCurrentView] = useState("meeting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [meetingInfo, setMeetingInfo] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<'common' | 'internal'>('common');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [newDiscussionItem, setNewDiscussionItem] = useState('');
  const [discussionItems, setDiscussionItems] = useState([
    { id: 1, text: 'Show the Visual Hierarchy', completed: true },
    { id: 2, text: 'Present Layout and Structure', completed: false },
    { id: 3, text: 'Explain Color and Typography', completed: false },
    { id: 4, text: 'Discuss Components', completed: false },
    { id: 5, text: 'Request Specific Feedback', completed: false },
  ]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement | null>>(new Map());

  useEffect(() => {
    initializeMeeting();

    // Start timer
    const timer = setInterval(() => {
      setMeetingDuration(prev => prev + 1);
    }, 1000);

    return () => {
      cleanup();
      clearInterval(timer);
    };
  }, [roomId]);

  const initializeMeeting = async () => {
    try {
      // Fetch meeting info
      try {
        const meeting = await meetingsAPI.getByRoomId(roomId);
        setMeetingInfo(meeting);
      } catch (error) {
        console.log("Meeting not found in database, continuing anyway");
      }

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Join video room
      const socket = getVideoSocket();
      joinVideoRoom(roomId);

      // Set up socket event listeners
      setupSocketListeners(socket);

    } catch (error: any) {
      toast({
        title: "Media Error",
        description: error.message || "Failed to access camera/microphone",
        variant: "destructive",
      });
    }
  };

  const setupSocketListeners = (socket: any) => {
    // When we receive the list of existing participants
    socket.on('existing_participants', async (data: { participants: Participant[] }) => {
      console.log('Existing participants:', data.participants);

      // Create peer connections for all existing participants
      for (const participant of data.participants) {
        await createPeerConnection(participant, true); // true = we are the initiator
      }
    });

    // When a new user joins
    socket.on('user_joined', async (data: { socketId: string; userId?: string }) => {
      console.log('User joined:', data);
      const participant: Participant = {
        socketId: data.socketId,
        userId: data.userId,
      };

      setParticipants(prev => [...prev, participant]);
      // Don't create connection here, wait for their offer
    });

    // When we receive an offer
    socket.on('connection_offer', async (data: { offer: RTCSessionDescriptionInit; senderSocketId: string }) => {
      console.log('Received offer from:', data.senderSocketId);

      const participant: Participant = {
        socketId: data.senderSocketId,
      };

      const peerConnection = await createPeerConnection(participant, false);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      sendAnswer(answer, roomId, data.senderSocketId);
    });

    // When we receive an answer
    socket.on('answer', async (data: { answer: RTCSessionDescriptionInit; senderSocketId: string }) => {
      console.log('Received answer from:', data.senderSocketId);

      const peerConnectionData = peerConnectionsRef.current.get(data.senderSocketId);
      if (peerConnectionData) {
        await peerConnectionData.connection.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    // When we receive an ICE candidate
    socket.on('candidate', async (data: { candidate: RTCIceCandidateInit; senderSocketId: string }) => {
      console.log('Received ICE candidate from:', data.senderSocketId);

      const peerConnectionData = peerConnectionsRef.current.get(data.senderSocketId);
      if (peerConnectionData) {
        await peerConnectionData.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    // When a user leaves
    socket.on('user_left', (data: { socketId: string }) => {
      console.log('User left:', data.socketId);

      setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));

      const peerConnectionData = peerConnectionsRef.current.get(data.socketId);
      if (peerConnectionData) {
        peerConnectionData.connection.close();
        peerConnectionsRef.current.delete(data.socketId);
      }

      remoteVideoRefs.current.delete(data.socketId);
    });
  };

  const createPeerConnection = async (participant: Participant, isInitiator: boolean): Promise<RTCPeerConnection> => {
    const configuration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    const peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote track from:', participant.socketId);

      const remoteStream = event.streams[0];
      participant.stream = remoteStream;

      // Update participant with stream
      setParticipants(prev =>
        prev.map(p => p.socketId === participant.socketId ? { ...p, stream: remoteStream } : p)
      );

      // Assign stream to video element
      const videoElement = remoteVideoRefs.current.get(participant.socketId);
      if (videoElement) {
        videoElement.srcObject = remoteStream;
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendICECandidate(event.candidate, roomId, participant.socketId);
      }
    };

    // Store peer connection
    peerConnectionsRef.current.set(participant.socketId, {
      connection: peerConnection,
      participant,
    });

    // If we are the initiator, create and send offer
    if (isInitiator) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      sendOffer(offer, roomId, participant.socketId);
    }

    setParticipants(prev => {
      const exists = prev.some(p => p.socketId === participant.socketId);
      return exists ? prev : [...prev, participant];
    });

    return peerConnection;
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track for all peer connections
        peerConnectionsRef.current.forEach(({ connection }) => {
          const sender = connection.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } else {
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
          // Restore original video track
          peerConnectionsRef.current.forEach(({ connection }) => {
            const sender = connection.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
          });
        }
        setIsScreenSharing(false);
      }
    } catch (error: any) {
      toast({
        title: "Screen Share Error",
        description: error.message || "Failed to share screen",
        variant: "destructive",
      });
    }
  };

  const copyMeetingLink = () => {
    const link = `${window.location.origin}/meeting-room/${roomId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied!",
      description: "Meeting link has been copied to clipboard",
    });
  };

  const endCall = () => {
    cleanup();
    router.push('/meetings');
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    peerConnectionsRef.current.forEach(({ connection }) => {
      connection.close();
    });
    peerConnectionsRef.current.clear();

    leaveVideoRoom(roomId);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const toggleDiscussionItem = (id: number) => {
    setDiscussionItems(items =>
      items.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const addDiscussionItem = () => {
    if (!newDiscussionItem.trim()) return;

    const newItem = {
      id: Date.now(),
      text: newDiscussionItem,
      completed: false,
    };

    setDiscussionItems([...discussionItems, newItem]);
    setNewDiscussionItem('');
  };

  const removeDiscussionItem = (id: number) => {
    setDiscussionItems(items => items.filter(item => item.id !== id));
  };

  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Main Content - Video Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-white px-3 sm:px-6 py-3 sm:py-4 border-b">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <h1 className="text-base sm:text-lg font-semibold text-gray-800 line-clamp-1 flex-1">
              {meetingInfo?.title || 'Meeting Room'}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
            <Button
              variant="outline"
              className="rounded-full px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 bg-black text-white hover:bg-gray-800 text-xs sm:text-sm"
            >
              <Circle className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-red-500 text-red-500" />
              {formatDuration(meetingDuration)}
            </Button>
            <Button variant="outline" className="rounded-full px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 text-xs sm:text-sm">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">{participants.length + 1} Participants</span>
              <span className="sm:hidden">{participants.length + 1}</span>
            </Button>
            <Button variant="outline" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10" onClick={copyMeetingLink}>
              <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-8 w-8 sm:h-10 sm:w-10 lg:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
          </div>
        </header>

        {/* Video Area */}
        <div className="flex-1 flex flex-col p-2 sm:p-4 gap-2 sm:gap-4 overflow-hidden">
          {/* Main Video - Large */}
          <div className="flex-1 bg-gray-900 rounded-2xl sm:rounded-3xl overflow-hidden relative border-2 sm:border-4 border-blue-500">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <Avatar className="w-20 h-20 sm:w-32 sm:h-32">
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=main" />
                  <AvatarFallback>You</AvatarFallback>
                </Avatar>
              </div>
            )}
            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 flex items-center gap-2">
              {isMuted && (
                <div className="bg-red-500 rounded-full p-1.5 sm:p-2">
                  <MicOff className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Participant Thumbnails */}
          <div className="flex gap-2 sm:gap-3 justify-center overflow-x-auto">
            {[...Array(Math.min(participants.length, 3))].map((_, idx) => (
              <div
                key={idx}
                className="w-32 h-24 sm:w-48 md:w-64 sm:h-36 md:h-48 bg-gray-900 rounded-xl sm:rounded-2xl overflow-hidden relative flex-shrink-0"
              >
                <video
                  ref={(el) => {
                    const participant = participants[idx];
                    if (participant) {
                      remoteVideoRefs.current.set(participant.socketId, el);
                      if (el && participant.stream) {
                        el.srcObject = participant.stream;
                      }
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!participants[idx]?.stream && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <Avatar className="w-10 h-10 sm:w-16 sm:h-16">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${idx + 10}`} />
                      <AvatarFallback>P{idx + 1}</AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <div className="absolute top-1 sm:top-2 left-1 sm:left-2 flex gap-1">
                  <div className="bg-white/10 backdrop-blur-sm rounded-full p-0.5 sm:p-1">
                    <Mic className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                  </div>
                </div>
              </div>
            ))}
            {participants.length === 0 && (
              <div className="text-gray-400 text-sm">No other participants yet</div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 pb-2 sm:pb-4 flex-wrap">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 sm:h-12 md:h-14 sm:w-12 md:w-14 rounded-full bg-white hover:bg-gray-100"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-4 w-4 sm:h-5 md:h-6 sm:w-5 md:w-6 text-gray-700" /> : <Mic className="h-4 w-4 sm:h-5 md:h-6 sm:w-5 md:w-6 text-gray-700" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 sm:h-12 md:h-14 sm:w-12 md:w-14 rounded-full bg-white hover:bg-gray-100"
              onClick={toggleVideo}
            >
              {isVideoOff ? <VideoOff className="h-4 w-4 sm:h-5 md:h-6 sm:w-5 md:w-6 text-gray-700" /> : <Video className="h-4 w-4 sm:h-5 md:h-6 sm:w-5 md:w-6 text-gray-700" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 sm:h-12 md:h-14 sm:w-12 md:w-14 rounded-full bg-white hover:bg-gray-100 hidden sm:flex"
            >
              <MessageSquare className="h-5 md:h-6 w-5 md:w-6 text-gray-700" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 sm:h-12 md:h-14 sm:w-12 md:w-14 rounded-full bg-white hover:bg-gray-100"
              onClick={toggleScreenShare}
            >
              <ScreenShare className="h-4 w-4 sm:h-5 md:h-6 sm:w-5 md:w-6 text-gray-700" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 sm:h-12 md:h-14 sm:w-12 md:w-14 rounded-full bg-white hover:bg-gray-100 hidden md:flex"
            >
              <Upload className="h-6 w-6 text-gray-700" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 sm:h-12 md:h-14 sm:w-12 md:w-14 rounded-full bg-white hover:bg-gray-100 hidden md:flex"
            >
              <Ellipsis className="h-6 w-6 text-gray-700" />
            </Button>
            <Button
              onClick={endCall}
              className="h-10 w-10 sm:h-12 md:h-14 sm:w-12 md:w-14 rounded-full bg-red-500 hover:bg-red-600 text-white"
            >
              <PhoneOff className="h-4 w-4 sm:h-5 md:h-6 sm:w-5 md:w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <aside className={`${isSidebarOpen ? 'flex' : 'hidden'} lg:flex w-full lg:w-[400px] flex-shrink-0 bg-white border-l flex-col absolute lg:relative inset-0 lg:inset-auto z-20 lg:z-auto`}>
        {/* Close button for mobile/tablet */}
        <div className="lg:hidden flex justify-end p-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Things to Discuss */}
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Things to Discuss</h2>
          <div className="space-y-2 sm:space-y-3">
            {discussionItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-2 sm:gap-3 flex-1">
                  <button
                    onClick={() => toggleDiscussionItem(item.id)}
                    className="flex-shrink-0"
                  >
                    {item.completed ? (
                      <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 fill-purple-100" />
                    ) : (
                      <Circle className="h-5 w-5 sm:h-6 sm:w-6 text-gray-300" />
                    )}
                  </button>
                  <span className={`text-xs sm:text-sm ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {item.text}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 opacity-0 group-hover:opacity-100"
                  onClick={() => removeDiscussionItem(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-400" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add new discussion item */}
          <div className="mt-3 sm:mt-4 flex items-center gap-2">
            <Input
              placeholder="Add item to discuss..."
              className="flex-1 text-xs sm:text-sm"
              value={newDiscussionItem}
              onChange={(e) => setNewDiscussionItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDiscussionItem()}
            />
            <Button
              onClick={addDiscussionItem}
              size="icon"
              variant="ghost"
              className="h-9 w-9 flex-shrink-0"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Comments Section */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 border-b">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Comments</h2>
              <div className="flex gap-1">
                <Button
                  variant={activeTab === 'common' ? 'default' : 'ghost'}
                  size="sm"
                  className={`rounded-full text-xs sm:text-sm px-2 sm:px-3 ${activeTab === 'common' ? 'bg-purple-500 hover:bg-purple-600 text-white' : 'text-gray-600'}`}
                  onClick={() => setActiveTab('common')}
                >
                  Common
                </Button>
                <Button
                  variant={activeTab === 'internal' ? 'default' : 'ghost'}
                  size="sm"
                  className={`rounded-full text-xs sm:text-sm px-2 sm:px-3 ${activeTab === 'internal' ? 'bg-purple-500 hover:bg-purple-600 text-white' : 'text-gray-600'}`}
                  onClick={() => setActiveTab('internal')}
                >
                  Internal
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="flex items-start gap-2 sm:gap-3">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                    <AvatarFallback>{msg.user?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">{msg.user}</p>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-none p-2 sm:p-3">
                      <p className="text-xs sm:text-sm text-gray-700 break-words">{msg.text}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <div className="p-3 sm:p-4 border-t">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full flex-shrink-0 hidden sm:flex">
                <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              </Button>
              <Input
                placeholder="Message"
                className="flex-1 rounded-full border-gray-300 text-xs sm:text-sm"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && messageInput.trim()) {
                    setMessages([...messages, { user: 'You', text: messageInput }]);
                    setMessageInput('');
                  }
                }}
              />
              <Button
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-purple-500 hover:bg-purple-600 flex-shrink-0"
                onClick={() => {
                  if (messageInput.trim()) {
                    setMessages([...messages, { user: 'You', text: messageInput }]);
                    setMessageInput('');
                  }
                }}
              >
                <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
