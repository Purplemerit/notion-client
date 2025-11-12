'use client';

import { useMemo, useState, useEffect } from 'react';
import { socket } from './socket';

export function usePeerConnection(localStream: MediaStream | null, roomName: string) {
  const [guestStream, setGuestStream] = useState<MediaStream | null>(null);

  // ✅ Create connection only once (after localStream is available)
  const peerConnection = useMemo(() => {
    if (!localStream) return null;

    const connection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun2.1.google.com:19302' }],
    });

    // When remote stream tracks are received
    connection.addEventListener('track', ({ streams }) => {
      setGuestStream(streams[0]);
    });

    // Add all local media tracks
    localStream.getTracks().forEach((track) => {
      connection.addTrack(track, localStream);
    });

    // When local ICE candidates are discovered, send to signaling server
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('send_candidate', {
          candidate: event.candidate,
          roomName,
        });
      }
    };

    console.log(`✅ PeerConnection created for room: ${roomName}`);
    return connection;
  }, [localStream, roomName]); // 👈 depends on localStream and roomName

  // Optional cleanup on unmount only
  useEffect(() => {
    return () => {
      if (peerConnection) {
        peerConnection.close();
        console.log(`❌ PeerConnection closed for room: ${roomName}`);
      }
    };
  }, []); // 👈 empty deps - only run on unmount

  return { peerConnection, guestStream };
}
