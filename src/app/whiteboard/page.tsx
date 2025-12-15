'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Share, Download, Trash2, Users, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usersAPI } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import '@excalidraw/excalidraw/index.css';
import io, { Socket } from 'socket.io-client';

// Type definitions to avoid import errors
type ExcalidrawImperativeAPI = any;
type ExcalidrawElement = any;
type AppState = any;

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw');
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full w-full bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-gray-600 dark:text-gray-400">Loading whiteboard...</p>
        </div>
      </div>
    ),
  }
);

interface CollaboratorInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
}

function WhiteboardContent() {
  const searchParams = useSearchParams();
  const { actualTheme } = useTheme();
  const [currentView, setCurrentView] = useState("whiteboard");
  const [mounted, setMounted] = useState(false);
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Get room ID from URL or create a new one
  const [roomId] = useState(() => {
    const urlRoomId = searchParams.get('room');
    const newRoomId = urlRoomId || `whiteboard-${Date.now()}`;
    console.log('Room ID:', newRoomId);
    return newRoomId;
  });

  const socketRef = useRef<Socket | null>(null);
  const { toast } = useToast();
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<{ elements: readonly ExcalidrawElement[]; appState: AppState } | null>(null);
  const isReceivingUpdateRef = useRef(false);
  const lastSentElementsRef = useRef<readonly ExcalidrawElement[]>([]);
  const localElementIdsRef = useRef<Set<string>>(new Set());

  // Update URL with room ID if not present
  useEffect(() => {
    if (typeof window !== 'undefined' && !searchParams.get('room')) {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [roomId, searchParams]);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await usersAPI.getMe();
        setCurrentUser(userData);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  // Initialize Socket.IO for real-time collaboration
  useEffect(() => {
    if (!mounted || !currentUser) {
      console.log('Waiting for mount and user...', { mounted, currentUser: !!currentUser });
      return;
    }

    console.log('Initializing Socket.IO connection...');
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      console.log('Joining room:', roomId);
      socket.emit('join-whiteboard', {
        roomId,
        user: {
          id: currentUser._id || currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          avatar: currentUser.avatar,
        },
      });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    socket.on('user-joined', (data: CollaboratorInfo) => {
      console.log('User joined:', data);
      setCollaborators((prev) => {
        if (prev.some((c) => c.id === data.id)) return prev;
        return [...prev, data];
      });
      toast({
        title: 'User Joined',
        description: `${data.name} joined the whiteboard`,
      });
    });

    socket.on('user-left', (userId: string) => {
      setCollaborators((prev) => prev.filter((c) => c.id !== userId));
    });

    socket.on('whiteboard-update', (data: { elements: ExcalidrawElement[]; appState: Partial<AppState> }) => {
      console.log('Received whiteboard update:', data.elements?.length, 'elements');
      if (excalidrawAPI) {
        // Set flag to prevent echoing back the received update
        isReceivingUpdateRef.current = true;

        // Get current elements from the canvas
        const currentElements = excalidrawAPI.getSceneElements();

        // Merge incoming elements with local elements
        const mergedElements = [...data.elements];

        // Add any local elements that aren't in the update (elements being drawn right now)
        currentElements.forEach((localEl: any) => {
          if (localElementIdsRef.current.has(localEl.id)) {
            // This is a local element we're currently drawing
            const incomingEl = data.elements.find((el: any) => el.id === localEl.id);
            if (!incomingEl || localEl.version > incomingEl.version) {
              // Keep the local version if it's newer or not in incoming data
              const index = mergedElements.findIndex((el: any) => el.id === localEl.id);
              if (index >= 0) {
                mergedElements[index] = localEl;
              } else {
                mergedElements.push(localEl);
              }
            }
          }
        });

        excalidrawAPI.updateScene({
          elements: mergedElements,
          appState: data.appState,
        });

        // Reset flag after a short delay
        setTimeout(() => {
          isReceivingUpdateRef.current = false;
        }, 100);
      }
    });

    socket.on('collaborators-list', (list: CollaboratorInfo[]) => {
      console.log('Received collaborators list:', list);
      setCollaborators(list.filter((c) => c.id !== (currentUser._id || currentUser.id)));
    });

    return () => {
      // Clean up throttle timeout
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }
      socket.emit('leave-whiteboard', roomId);
      socket.disconnect();
    };
  }, [mounted, currentUser, roomId, toast, excalidrawAPI]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle canvas changes with throttling for smooth drawing
  const handleChange = useCallback((elements: readonly ExcalidrawElement[], appState: AppState) => {
    // Don't send updates if we're currently receiving an update from another user
    if (isReceivingUpdateRef.current) {
      return;
    }

    // Track new local elements (elements that were just created or modified)
    const lastSentElements = lastSentElementsRef.current;
    elements.forEach((element: any) => {
      // Check if this element is new or was modified
      const wasInLastSent = lastSentElements.find((el: any) => el.id === element.id);
      if (!wasInLastSent || wasInLastSent.version !== element.version) {
        // This is a new or modified element by the current user
        localElementIdsRef.current.add(element.id);
      }
    });

    // Clean up old local element IDs that are no longer in the scene
    const currentElementIds = new Set(elements.map((el: any) => el.id));
    localElementIdsRef.current.forEach(id => {
      if (!currentElementIds.has(id)) {
        localElementIdsRef.current.delete(id);
      }
    });

    // Store the latest update
    pendingUpdateRef.current = { elements, appState };

    // If there's already a pending throttle, don't create another one
    if (throttleTimeoutRef.current) {
      return;
    }

    // Send update immediately for the first change
    if (socketRef.current && socketRef.current.connected) {
      lastSentElementsRef.current = elements;
      socketRef.current.emit('whiteboard-change', {
        roomId,
        elements: elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
        },
      });
    }

    // Throttle subsequent updates to every 100ms
    throttleTimeoutRef.current = setTimeout(() => {
      if (pendingUpdateRef.current && socketRef.current && socketRef.current.connected) {
        const { elements: pendingElements, appState: pendingAppState } = pendingUpdateRef.current;
        lastSentElementsRef.current = pendingElements;
        socketRef.current.emit('whiteboard-change', {
          roomId,
          elements: pendingElements,
          appState: {
            viewBackgroundColor: pendingAppState.viewBackgroundColor,
            currentItemFontFamily: pendingAppState.currentItemFontFamily,
          },
        });
        pendingUpdateRef.current = null;

        // After sending, clear local element tracking for finished strokes
        setTimeout(() => {
          localElementIdsRef.current.clear();
        }, 500);
      }
      throttleTimeoutRef.current = null;
    }, 100);
  }, [roomId]);

  // Save whiteboard
  const handleSave = useCallback(async () => {
    if (!excalidrawAPI) return;

    try {
      setIsSaving(true);
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();

      // Save to localStorage for now (can be extended to save to backend)
      const whiteboardData = {
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
        },
        timestamp: Date.now(),
      };

      localStorage.setItem(`whiteboard-${roomId}`, JSON.stringify(whiteboardData));

      toast({
        title: 'Whiteboard Saved',
        description: 'Your whiteboard has been saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save whiteboard',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [excalidrawAPI, roomId, toast]);

  // Export whiteboard
  const handleExport = useCallback(async () => {
    if (!excalidrawAPI) return;

    try {
      const blob = await excalidrawAPI.exportToBlob({
        mimeType: 'image/png',
        quality: 1,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `whiteboard-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Exported Successfully',
        description: 'Whiteboard exported as PNG',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export whiteboard',
        variant: 'destructive',
      });
    }
  }, [excalidrawAPI, toast]);

  // Clear whiteboard
  const handleClear = useCallback(() => {
    if (!excalidrawAPI) return;

    if (confirm('Are you sure you want to clear the whiteboard? This cannot be undone.')) {
      excalidrawAPI.updateScene({
        elements: [],
      });

      toast({
        title: 'Whiteboard Cleared',
        description: 'All elements have been removed',
      });
    }
  }, [excalidrawAPI, toast]);

  // Share whiteboard
  const handleShare = useCallback(() => {
    const shareUrl = `${window.location.origin}/whiteboard?room=${roomId}`;
    navigator.clipboard.writeText(shareUrl);

    console.log('Share URL generated:', shareUrl);
    console.log('Room ID:', roomId);

    toast({
      title: 'Link Copied',
      description: `Share this link: ${shareUrl.substring(0, 50)}...`,
    });
  }, [roomId, toast]);

  if (!mounted) {
    return (
      <div className={`flex h-screen w-full overflow-hidden items-center justify-center ${
        actualTheme === 'dark' ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className={actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full overflow-hidden ${
      actualTheme === 'dark' ? 'bg-gray-900' : 'bg-white'
    }`}>
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className={`flex items-center justify-between p-4 border-b z-10 flex-shrink-0 ${
          actualTheme === 'dark' 
            ? 'border-gray-700 bg-gray-800' 
            : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-4">
            <div>
              <h1 className={`text-xl font-semibold ${
                actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}>Collaborative Whiteboard</h1>
              <p className={`text-xs ${
                actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Room: {roomId}</p>
            </div>
            <span className={`text-sm flex items-center gap-2 ${
              actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <Users className="w-4 h-4" />
              {collaborators.length + 1} online
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Collaborator Avatars */}
            <div className="flex -space-x-2">
              {currentUser && (
                <Avatar className={`w-8 h-8 border-2 ${
                  actualTheme === 'dark' ? 'border-gray-800' : 'border-white'
                }`}>
                  <AvatarImage src={currentUser.avatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {currentUser.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              {collaborators.slice(0, 3).map((collaborator) => (
                <Avatar key={collaborator.id} className={`w-8 h-8 border-2 ${
                  actualTheme === 'dark' ? 'border-gray-800' : 'border-white'
                }`}>
                  <AvatarImage src={collaborator.avatar} />
                  <AvatarFallback className="text-xs" style={{ backgroundColor: collaborator.color }}>
                    {collaborator.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {collaborators.length > 3 && (
                <Avatar className={`w-8 h-8 border-2 ${
                  actualTheme === 'dark' ? 'border-gray-800' : 'border-white'
                }`}>
                  <AvatarFallback className={`text-xs ${
                    actualTheme === 'dark' 
                      ? 'bg-gray-700 text-gray-300' 
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    +{collaborators.length - 3}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>

            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>

            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleShare}>
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </header>

        {/* Excalidraw Canvas */}
        <div className={`flex-1 min-h-0 ${
          actualTheme === 'dark' ? 'bg-gray-900' : 'bg-white'
        }`} style={{ height: 'calc(100vh - 80px)' }}>
          <Excalidraw
            excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
            onChange={handleChange}
            initialData={{
              appState: {
                viewBackgroundColor: actualTheme === 'dark' ? '#111827' : '#ffffff',
                currentItemFontFamily: 1,
              },
            }}
            theme={actualTheme === 'dark' ? 'dark' : 'light'}
          />
        </div>
      </div>
    </div>
  );
}

export default function WhiteboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full bg-white dark:bg-gray-900 overflow-hidden items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-gray-600 dark:text-gray-400">Loading whiteboard...</p>
        </div>
      </div>
    }>
      <WhiteboardContent />
    </Suspense>
  );
}
