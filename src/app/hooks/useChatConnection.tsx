'use client';

import { useEffect, useCallback } from 'react';
import { socket } from './socket';

export const useChatConnection = (
  peerConnection: RTCPeerConnection | null,
  roomName: string
) => {
  // 2️⃣ Handle incoming offer from another peer
  const handleReceiveOffer = useCallback(
    async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      if (!peerConnection) return;
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('send_answer', { answer, roomName });
    },
    [peerConnection, roomName]
  );

  // 2.5️⃣ Handle incoming answer from another peer
  const handleReceiveAnswer = useCallback(
    async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      if (!peerConnection) return;
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    },
    [peerConnection]
  );

  // 3️⃣ Handle ICE candidate from another peer
  const handleReceiveCandidate = useCallback(
    ({ candidate }: { candidate: RTCIceCandidate }) => {
      if (!peerConnection) return;
      peerConnection.addIceCandidate(candidate);
    },
    [peerConnection]
  );

  // 4️⃣ Join room when peerConnection is ready
  useEffect(() => {
    if (!peerConnection) return;

    // Join the room first
    socket.emit('join_room', roomName);
    console.log(`🚪 Joining room: ${roomName}`);

    socket.on('send_connection_offer', handleReceiveOffer);
    socket.on('send_answer', handleReceiveAnswer);
    socket.on('send_candidate', handleReceiveCandidate);

    return () => {
      socket.off('send_connection_offer', handleReceiveOffer);
      socket.off('send_answer', handleReceiveAnswer);
      socket.off('send_candidate', handleReceiveCandidate);
    };
  }, [peerConnection, roomName, handleReceiveOffer, handleReceiveAnswer, handleReceiveCandidate]);

  // 5️⃣ Function to send your own offer
  const sendOffer = useCallback(async () => {
    if (!peerConnection) return;
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('send_connection_offer', { offer, roomName });
  }, [peerConnection, roomName]);

  return { sendOffer };
};
