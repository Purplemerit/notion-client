"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AdminSidebar from "@/components/adminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { CallModal } from "@/components/CallModal";
import {
  Star,
  MoreVertical,
  Mail,
  Phone,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { userAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getMessagingSocket, initiateCall, answerCall, rejectCall, endCall, sendCallICECandidate } from "@/lib/socket";

interface Contact {
  _id: string;
  name: string;
  email: string;
  position?: string;
  role?: string;
  avatarUrl?: string;
}

interface ContactCardProps {
  contact: Contact;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onEmail: (contact: Contact) => void;
  onCall: (contact: Contact) => void;
  onMessage: (contact: Contact) => void;
}

const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  isFavorite,
  onToggleFavorite,
  onEmail,
  onCall,
  onMessage,
}) => {
  const [imageError, setImageError] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      style={{
        background: "#FFF",
        borderRadius: 16,
        padding: "24px",
        border: "1px solid #E1DEF6",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* Star Icon */}
      <button
        onClick={() => onToggleFavorite(contact._id)}
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <Star
          size={20}
          color={isFavorite ? "#FFB547" : "#999"}
          fill={isFavorite ? "#FFB547" : "none"}
        />
      </button>

      {/* More Options Icon */}
      <button
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <MoreVertical size={20} color="#999" />
      </button>

      {/* Avatar */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 16,
          marginBottom: 16,
          position: "relative",
          overflow: "hidden",
          background: "#D4CCFA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {contact.avatarUrl && !imageError ? (
          <Image
            src={contact.avatarUrl}
            alt={contact.name}
            width={80}
            height={80}
            style={{
              objectFit: "cover",
              borderRadius: 16,
            }}
            onError={() => setImageError(true)}
            unoptimized
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkbHB0eH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/2gAMAwEAAhEDEQA/AKrQjF2p0t2vlhJFfgHd34/bM="
          />
        ) : (
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "#8B7BE8",
            }}
          >
            {getInitials(contact.name)}
          </div>
        )}
      </div>

      {/* Contact Info */}
      <div style={{ textAlign: "center", marginBottom: 20, width: "100%" }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#252525", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {contact.name}
        </div>
        <div style={{ fontSize: 14, color: "#999", marginBottom: 8 }}>
          {contact.position}
        </div>
        {contact.email && (
          <div style={{ fontSize: 12, color: "#BBB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {contact.email}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, width: "100%" }}>
        <button
          onClick={() => onEmail(contact)}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px",
            background: "#F5F3FF",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
          title={`Email ${contact.name}`}
        >
          <Mail size={20} color="#4A3F8F" />
        </button>
        <button
          onClick={() => onCall(contact)}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px",
            background: "#F5F3FF",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
          title={`Call ${contact.name}`}
        >
          <Phone size={20} color="#4A3F8F" />
        </button>
        <button
          onClick={() => onMessage(contact)}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px",
            background: "#F5F3FF",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
          title={`Message ${contact.name}`}
        >
          <MessageSquare size={20} color="#4A3F8F" />
        </button>
      </div>
    </div>
  );
};

export default function ContactPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  // Call state management
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callState, setCallState] = useState<'incoming' | 'outgoing' | 'connected'>('outgoing');
  const [callee, setCallee] = useState<string>('');
  const [calleeAvatar, setCalleeAvatar] = useState<string>('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);

      // Get current user's profile first to check role
      const currentUserProfile = await userAPI.getProfile();
      
      if (currentUserProfile.role !== 'admin') {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to view contacts",
          variant: "destructive",
        });
        setContacts([]);
        setFilteredContacts([]);
        setLoading(false);
        return;
      }

      // Try to get all users from the admin endpoint
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/users/admin/all`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
      }

      const users = await response.json();

      if (!Array.isArray(users)) {
        throw new Error('Invalid response format: expected array of users');
      }

      // Map users to contacts
      const contactList: Contact[] = users.map((user: any) => ({
        _id: user._id || user.id,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        position: user.role === 'admin' ? 'Administrator' : 'Team Member',
        role: user.role || 'user',
        avatarUrl: user.avatar || user.avatarUrl,
      }));

      setContacts(contactList);
      setFilteredContacts(contactList);

      if (contactList.length === 0) {
        toast({
          title: "No Contacts",
          description: "No users found in the system",
        });
      }
    } catch (error: any) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Error Loading Contacts",
        description: error.message || "Failed to load contacts. Please check your connection and try again.",
        variant: "destructive",
      });
      setContacts([]);
      setFilteredContacts([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const filterContacts = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = contacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query) ||
      (contact.position && contact.position.toLowerCase().includes(query))
    );
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);

  const loadCurrentUser = async () => {
    try {
      const user = await userAPI.getProfile();
      setCurrentUser(user);

      // Initialize messaging socket
      if (user?._id) {
        getMessagingSocket(user._id);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  useEffect(() => {
    loadCurrentUser();
    loadContacts();
    loadFavorites();
  }, [loadContacts]);

  useEffect(() => {
    filterContacts();
  }, [filterContacts]);

  const loadFavorites = () => {
    const savedFavorites = localStorage.getItem('adminContactFavorites');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
  };

  const saveFavorites = (newFavorites: Set<string>) => {
    localStorage.setItem('adminContactFavorites', JSON.stringify(Array.from(newFavorites)));
  };

  const toggleFavorite = (contactId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(contactId)) {
      newFavorites.delete(contactId);
    } else {
      newFavorites.add(contactId);
    }
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleEmailContact = (contact: Contact) => {
    if (contact.email) {
      window.location.href = `mailto:${contact.email}`;
    }
  };

  const handleCallContact = async (contact: Contact, type: 'audio' | 'video' = 'audio') => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Please log in to make calls",
        variant: "destructive",
      });
      return;
    }

    try {
      setCallType(type);
      setCallee(contact.name);
      setCalleeAvatar(contact.avatarUrl || '');
      setCallState('outgoing');
      setIsCallModalOpen(true);

      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });

      setLocalStream(stream);

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      peerConnectionRef.current = pc;

      // Add local stream tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        setCallState('connected');
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && currentUser?.email) {
          sendCallICECandidate(currentUser.email, contact.email, event.candidate);
        }
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send call initiation via socket
      initiateCall(currentUser.email, contact.email, offer, type);

      toast({
        title: "Calling",
        description: `Calling ${contact.name}...`,
      });
    } catch (error: any) {
      console.error('Error initiating call:', error);
      toast({
        title: "Call Failed",
        description: error.message || "Failed to initiate call",
        variant: "destructive",
      });
      handleEndCall();
    }
  };

  const handleEndCall = () => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Notify other party
    if (currentUser?.email && callee) {
      const calleeContact = contacts.find(c => c.name === callee);
      if (calleeContact) {
        endCall(currentUser.email, calleeContact.email);
      }
    }

    setIsCallModalOpen(false);
    setCallState('outgoing');
  };

  const handleToggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleToggleVideo = () => {
    if (localStream && callType === 'video') {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleMessageContact = (contact: Contact) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Please log in to send messages",
        variant: "destructive",
      });
      return;
    }

    // Navigate to chat page with user email
    router.push(`/chat?user=${contact.email}`);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F7F5FD" }}>
      {/* Sidebar */}
      <div style={{ flexShrink: 0, height: "100vh" }}>
        <AdminSidebar />
      </div>

      {/* Main Content */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
        {/* Header */}
        <AdminHeader
          currentUser={currentUser}
          searchPlaceholder="Search contacts..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: "24px 32px",
          }}
        >
          {/* Page Title */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 600, color: "#252525" }}>
              Contact ({filteredContacts.length})
            </h1>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#8B7BE8" }} />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ fontSize: 18, color: "#999", marginBottom: 16 }}>
                {searchQuery ? "No contacts found matching your search" : "No contacts available"}
              </p>
              <p style={{ fontSize: 14, color: "#BBB" }}>
                {searchQuery ? "Try a different search term" : "Add team members to see them here"}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 24,
              }}
            >
              {filteredContacts.map((contact) => (
                <ContactCard
                  key={contact._id}
                  contact={contact}
                  isFavorite={favorites.has(contact._id)}
                  onToggleFavorite={toggleFavorite}
                  onEmail={handleEmailContact}
                  onCall={handleCallContact}
                  onMessage={handleMessageContact}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Call Modal */}
      <CallModal
        isOpen={isCallModalOpen}
        callType={callType}
        callState={callState}
        caller={currentUser?.name || currentUser?.email || ''}
        callee={callee}
        calleeAvatar={calleeAvatar}
        localStream={localStream}
        remoteStream={remoteStream}
        onEnd={handleEndCall}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
      />
    </div>
  );
}
