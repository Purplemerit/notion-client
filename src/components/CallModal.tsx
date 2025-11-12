'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface CallModalProps {
  isOpen: boolean;
  callType: 'audio' | 'video';
  callState: 'incoming' | 'outgoing' | 'connected';
  caller?: string;
  callee?: string;
  callerAvatar?: string;
  calleeAvatar?: string;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  onAccept?: () => void;
  onReject?: () => void;
  onEnd?: () => void;
  isMuted?: boolean;
  isVideoOff?: boolean;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
}

export function CallModal({
  isOpen,
  callType,
  callState,
  caller,
  callee,
  callerAvatar,
  calleeAvatar,
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onEnd,
  isMuted = false,
  isVideoOff = false,
  onToggleMute,
  onToggleVideo,
}: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callDuration, setCallDuration] = useState(0);

  // Set up local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set up remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDisplayName = () => {
    if (callState === 'incoming') return caller;
    if (callState === 'outgoing' || callState === 'connected') return callee;
    return 'Unknown';
  };

  const getAvatarUrl = () => {
    if (callState === 'incoming') return callerAvatar;
    if (callState === 'outgoing' || callState === 'connected') return calleeAvatar;
    return undefined;
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-4xl h-[600px] p-0 overflow-hidden">
        <div className="relative w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900">
          {/* Remote Video / Avatar */}
          {callType === 'video' && remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <Avatar className="w-32 h-32 mb-6">
                <AvatarImage src={getAvatarUrl()} />
                <AvatarFallback className="text-4xl bg-purple-600 text-white">
                  {getDisplayName()?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-semibold text-white mb-2">{getDisplayName()}</h2>
              {callState === 'incoming' && (
                <p className="text-lg text-gray-200">
                  Incoming {callType} call...
                </p>
              )}
              {callState === 'outgoing' && (
                <p className="text-lg text-gray-200">Calling...</p>
              )}
              {callState === 'connected' && (
                <p className="text-lg text-gray-200">{formatDuration(callDuration)}</p>
              )}
            </div>
          )}

          {/* Local Video (Picture in Picture) */}
          {callType === 'video' && localStream && callState === 'connected' && (
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden shadow-xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-4">
              {/* Incoming Call Controls */}
              {callState === 'incoming' && (
                <>
                  <Button
                    size="lg"
                    className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600"
                    onClick={onReject}
                  >
                    <PhoneOff size={24} />
                  </Button>
                  <Button
                    size="lg"
                    className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
                    onClick={onAccept}
                  >
                    <Phone size={24} />
                  </Button>
                </>
              )}

              {/* Outgoing/Connected Call Controls */}
              {(callState === 'outgoing' || callState === 'connected') && (
                <>
                  {/* Mute/Unmute */}
                  <Button
                    size="lg"
                    variant="ghost"
                    className={`rounded-full w-14 h-14 ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}`}
                    onClick={onToggleMute}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </Button>

                  {/* Video Toggle (only for video calls) */}
                  {callType === 'video' && (
                    <Button
                      size="lg"
                      variant="ghost"
                      className={`rounded-full w-14 h-14 ${isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}`}
                      onClick={onToggleVideo}
                    >
                      {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </Button>
                  )}

                  {/* End Call */}
                  <Button
                    size="lg"
                    className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600"
                    onClick={onEnd}
                  >
                    <PhoneOff size={24} />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
