'use client'

import React, { useRef, useEffect } from 'react';

interface VideoFeedProps {
  mediaStream: MediaStream;
  isMuted?: boolean;
  userName?: string;
}

export const VideoFeed: React.FC<VideoFeedProps> = ({ mediaStream, isMuted, userName }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        muted={isMuted}
        playsInline
        className="w-full h-full object-cover"
      />
      {userName && (
        <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-md">
          <span className="text-white text-sm font-medium">{userName}</span>
        </div>
      )}
    </div>
  );
};
