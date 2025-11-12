import { useState, useEffect, useRef, useCallback } from 'react';
import { getChatSocket, sendCallICECandidate, initiateCall, answerCall, rejectCall, endCall } from '@/lib/socket';
import { useToast } from '@/hooks/use-toast';

export interface UseWebRTCCallConfig {
  currentUser: string;
  onCallStateChange?: (state: 'incoming' | 'outgoing' | 'connected' | 'idle') => void;
}

export interface CallData {
  caller: string;
  callee: string;
  callType: 'audio' | 'video';
  callState: 'incoming' | 'outgoing' | 'connected' | 'idle';
  isCallModalOpen: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
}

export const useWebRTCCall = ({ currentUser, onCallStateChange }: UseWebRTCCallConfig) => {
  const { toast } = useToast();
  
  // Call state
  const [callData, setCallData] = useState<CallData>({
    caller: '',
    callee: '',
    callType: 'audio',
    callState: 'idle',
    isCallModalOpen: false,
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isVideoOff: false,
  });

  // WebRTC refs for efficient cleanup
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamCleanupRef = useRef<Set<MediaStream>>(new Set());
  const iceCandidateCleanupRef = useRef<NodeJS.Timeout | null>(null);

  // ICE candidate cleanup to prevent memory leaks
  const cleanupOldIceCandidates = useCallback(() => {
    if (iceCandidateCleanupRef.current) {
      clearTimeout(iceCandidateCleanupRef.current);
    }
    
    iceCandidateCleanupRef.current = setTimeout(() => {
      if (pendingIceCandidatesRef.current.length > 50) {
        console.warn(`Cleaning up ${pendingIceCandidatesRef.current.length - 50} old ICE candidates`);
        pendingIceCandidatesRef.current = pendingIceCandidatesRef.current.slice(-50);
      }
    }, 10000);
  }, []);

  // Track media streams for cleanup
  const trackMediaStream = useCallback((stream: MediaStream | null) => {
    if (stream) {
      streamCleanupRef.current.add(stream);
    }
  }, []);

  // Process pending ICE candidates
  const processPendingIceCandidates = useCallback(async (pc: RTCPeerConnection) => {
    if (pendingIceCandidatesRef.current.length > 0 && pc.remoteDescription) {
      console.log(`Processing ${pendingIceCandidatesRef.current.length} pending ICE candidates`);
      const candidatesToProcess = [...pendingIceCandidatesRef.current];
      pendingIceCandidatesRef.current = [];

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
  }, []);

  // Enhanced cleanup function
  const cleanupCall = useCallback(() => {
    try {
      console.log('Starting call cleanup...');
      
      // Stop all tracked streams
      streamCleanupRef.current.forEach(stream => {
        stream.getTracks().forEach(track => {
          if (track.readyState !== 'ended') {
            track.stop();
            console.log(`Stopped ${track.kind} track`);
          }
        });
      });
      streamCleanupRef.current.clear();

      // Stop current local stream
      if (callData.localStream) {
        callData.localStream.getTracks().forEach(track => {
          if (track.readyState !== 'ended') {
            track.stop();
          }
        });
      }

      // Clean up peer connection
      if (peerConnectionRef.current) {
        if (peerConnectionRef.current.signalingState !== 'closed') {
          peerConnectionRef.current.onicecandidate = null;
          peerConnectionRef.current.ontrack = null;
          peerConnectionRef.current.onconnectionstatechange = null;
          peerConnectionRef.current.close();
          console.log('Peer connection closed');
        }
        peerConnectionRef.current = null;
      }

      // Clear timeouts
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }

      if (iceCandidateCleanupRef.current) {
        clearTimeout(iceCandidateCleanupRef.current);
        iceCandidateCleanupRef.current = null;
      }

      // Clear pending ICE candidates
      pendingIceCandidatesRef.current = [];

    } catch (error) {
      console.error('Error during call cleanup:', error);
    } finally {
      // Reset call state
      setCallData({
        caller: '',
        callee: '',
        callType: 'audio',
        callState: 'idle',
        isCallModalOpen: false,
        localStream: null,
        remoteStream: null,
        isMuted: false,
        isVideoOff: false,
      });
      onCallStateChange?.('idle');
      console.log('Call cleanup completed');
    }
  }, [callData.localStream, onCallStateChange]);

  // Socket event handlers
  useEffect(() => {
    if (!currentUser) return;

    const socket = getChatSocket();

    const handleCallIncoming = async (data: { caller: string; offer: any; callType: 'audio' | 'video' }) => {
      try {
        console.log(`Incoming ${data.callType} call from ${data.caller}`);
        
        // Create peer connection
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
          trackMediaStream(remoteStream);
          setCallData(prev => ({ ...prev, remoteStream }));
        };

        pc.onconnectionstatechange = () => {
          console.log('Peer connection state changed:', pc.connectionState);
          if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            cleanupCall();
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        peerConnectionRef.current = pc;
        
        // Update call state
        setCallData(prev => ({
          ...prev,
          caller: data.caller,
          callee: currentUser,
          callType: data.callType,
          callState: 'incoming',
          isCallModalOpen: true,
        }));
        onCallStateChange?.('incoming');

        // Process pending ICE candidates
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
        if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          setCallData(prev => ({ ...prev, callState: 'connected' }));
          onCallStateChange?.('connected');
          await processPendingIceCandidates(peerConnectionRef.current);
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
        
        if (peerConnectionRef.current && 
            peerConnectionRef.current.signalingState !== 'closed' && 
            peerConnectionRef.current.connectionState !== 'closed' &&
            peerConnectionRef.current.connectionState !== 'failed' &&
            peerConnectionRef.current.remoteDescription) {
          try {
            await peerConnectionRef.current.addIceCandidate(candidate);
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        } else {
          // Queue candidate with size limit
          if (pendingIceCandidatesRef.current.length < 20) {
            pendingIceCandidatesRef.current.push(candidate);
          } else {
            console.warn('ICE candidate queue full, dropping old candidates');
            pendingIceCandidatesRef.current = [...pendingIceCandidatesRef.current.slice(-19), candidate];
          }
          cleanupOldIceCandidates();
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

    // Register event listeners
    socket.on('call:incoming', handleCallIncoming);
    socket.on('call:answered', handleCallAnswered);
    socket.on('call:iceCandidate', handleIceCandidate);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:error', handleCallError);

    return () => {
      socket.off('call:incoming', handleCallIncoming);
      socket.off('call:answered', handleCallAnswered);
      socket.off('call:iceCandidate', handleIceCandidate);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:error', handleCallError);
    };
  }, [currentUser, cleanupCall, processPendingIceCandidates, cleanupOldIceCandidates, trackMediaStream, toast, onCallStateChange]);

  // Start call function
  const startCall = useCallback(async (callee: string, type: 'audio' | 'video') => {
    try {
      console.log(`Starting ${type} call to ${callee}`);
      
      // Set timeout for call
      const timeout = setTimeout(() => {
        toast({
          title: "Call Timeout",
          description: "The call could not be connected. Please try again.",
          variant: "destructive",
        });
        cleanupCall();
      }, 30000);
      callTimeoutRef.current = timeout;

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      trackMediaStream(stream);

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && pc.signalingState !== 'closed') {
          sendCallICECandidate(currentUser, callee, event.candidate);
        }
      };

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        trackMediaStream(remoteStream);
        setCallData(prev => ({ ...prev, remoteStream }));
      };

      pc.onconnectionstatechange = () => {
        console.log('Peer connection state changed:', pc.connectionState);
        if (pc.connectionState === 'connected' && callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
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

      peerConnectionRef.current = pc;

      // Update call state
      setCallData(prev => ({
        ...prev,
        caller: currentUser,
        callee,
        callType: type,
        callState: 'outgoing',
        isCallModalOpen: true,
        localStream: stream,
      }));
      onCallStateChange?.('outgoing');

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      initiateCall(currentUser, callee, offer, type);
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Call Failed",
        description: "Could not start the call. Please check your permissions.",
        variant: "destructive",
      });
      cleanupCall();
    }
  }, [currentUser, cleanupCall, trackMediaStream, toast, onCallStateChange]);

  // Accept call function
  const acceptCall = useCallback(async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callData.callType === 'video',
      });
      trackMediaStream(stream);

      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
        stream.getTracks().forEach(track => {
          peerConnectionRef.current!.addTrack(track, stream);
        });

        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        answerCall(callData.caller, currentUser, answer);
        
        setCallData(prev => ({ ...prev, callState: 'connected', localStream: stream }));
        onCallStateChange?.('connected');
      } else {
        throw new Error('Peer connection not available');
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
  }, [callData.callType, callData.caller, currentUser, trackMediaStream, toast, cleanupCall, onCallStateChange]);

  // Reject call function
  const rejectCallHandler = useCallback(() => {
    rejectCall(callData.caller, currentUser, 'User declined the call');
    cleanupCall();
  }, [callData.caller, currentUser, cleanupCall]);

  // End call function
  const endCallHandler = useCallback(() => {
    const otherUser = callData.callState === 'incoming' ? callData.caller : callData.callee;
    endCall(currentUser, otherUser);
    cleanupCall();
  }, [callData.callState, callData.caller, callData.callee, currentUser, cleanupCall]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (callData.localStream) {
      const audioTrack = callData.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallData(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, [callData.localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (callData.localStream) {
      const videoTrack = callData.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallData(prev => ({ ...prev, isVideoOff: !videoTrack.enabled }));
      }
    }
  }, [callData.localStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  return {
    callData,
    startCall,
    acceptCall,
    rejectCall: rejectCallHandler,
    endCall: endCallHandler,
    toggleMute,
    toggleVideo,
    cleanupCall,
  };
};