// API Configuration and Service Layer
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Track if we're currently refreshing to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Token storage keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Token management
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearTokens = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Auth helpers
export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};

// Get auth token for backward compatibility
const getAuthToken = (): string => {
  return getAccessToken() || '';
};

// Try to refresh access token using refresh token
async function tryRefreshToken(): Promise<boolean> {
  // If already refreshing, wait for that refresh to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          // Update access token in localStorage
          const currentRefreshToken = getRefreshToken();
          if (currentRefreshToken) {
            setTokens(data.accessToken, currentRefreshToken);
          }
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// API request helper with automatic token handling
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const headers: { [key: string]: string } = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add Authorization header if token exists
  const accessToken = getAccessToken();
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Send cookies with requests
  });

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/')) {
      // Only try to refresh if this is not an auth endpoint
      // and we're not already on the login page
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          // Update headers with new token
          const newAccessToken = getAccessToken();
          if (newAccessToken) {
            headers['Authorization'] = `Bearer ${newAccessToken}`;
          }

          // Retry the original request
          const retryResponse = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
          });
          if (retryResponse.ok) {
            return retryResponse.json();
          }
        }
      }
    }

    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Send/receive cookies
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();

    // Check if 2FA is required
    if (data.requires2FA) {
      return { requires2FA: true, tempToken: data.tempToken };
    }

    // Store tokens
    if (data.accessToken && data.refreshToken) {
      setTokens(data.accessToken, data.refreshToken);
    }

    return { success: true };
  },

  signup: async (name: string, email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
      credentials: 'include', // Send/receive cookies
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Signup failed' }));
      throw new Error(error.message || 'Signup failed');
    }

    const data = await response.json();

    // Store tokens
    if (data.accessToken && data.refreshToken) {
      setTokens(data.accessToken, data.refreshToken);
    }

    return data;
  },

  logout: async () => {
    try {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if (accessToken && refreshToken) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken }),
          credentials: 'include', // Send cookies
        });
      }

      clearTokens();
    } catch (error) {
      console.error('Logout error:', error);
      clearTokens();
    } finally {
      window.location.href = '/login';
    }
  },

  googleLogin: () => {
    window.location.href = `${API_URL}/auth/google`;
  },

  verify2FA: async (email: string, token: string) => {
    const response = await fetch(`${API_URL}/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token }),
      credentials: 'include', // Send/receive cookies
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '2FA verification failed' }));
      throw new Error(error.message || '2FA verification failed');
    }

    const data = await response.json();

    // Store tokens
    if (data.accessToken && data.refreshToken) {
      setTokens(data.accessToken, data.refreshToken);
    }

    return data;
  },

  checkStatus: async () => {
    try {
      const accessToken = getAccessToken();
      if (!accessToken) return false;

      const response = await fetch(`${API_URL}/auth/status`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include', // Send cookies
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  },
};

// Teams API
export const teamsAPI = {
  getAll: () => apiRequest('/teams'),

  getById: (id: string) => apiRequest(`/teams/${id}`),

  getByTaskId: (taskId: string) => apiRequest(`/teams/task/${taskId}`),

  getByProjectId: (projectId: string) => apiRequest(`/teams/project/${projectId}`),

  // Note: Manual team creation is disabled - teams are auto-created from tasks/projects
  // create: (name: string, description: string) =>
  //   apiRequest('/teams', {
  //     method: 'POST',
  //     body: JSON.stringify({ name, description }),
  //   }),

  changeAdmin: (teamId: string, newAdminId: string) =>
    apiRequest(`/teams/${teamId}/admin`, {
      method: 'PATCH',
      body: JSON.stringify({ newAdminId }),
    }),

  addMember: (teamId: string, userId: string, role?: string) =>
    apiRequest(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }),

  removeMember: (teamId: string, userId: string) =>
    apiRequest(`/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    }),
};

// Calendar API
export const calendarAPI = {
  getEvents: () => apiRequest('/calendar/events'),

  getUpcoming: (days: number = 7) =>
    apiRequest(`/calendar/events/upcoming?days=${days}`),

  getEventsByRange: (start: string, end: string) =>
    apiRequest(`/calendar/events/range?start=${start}&end=${end}`),

  create: (event: any) =>
    apiRequest('/calendar/events', {
      method: 'POST',
      body: JSON.stringify(event),
    }),

  update: (id: string, event: any) =>
    apiRequest(`/calendar/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(event),
    }),

  delete: (id: string) =>
    apiRequest(`/calendar/events/${id}`, {
      method: 'DELETE',
    }),
};

// Blog API (used by /community page)
export const blogAPI = {
  getAll: (status?: string) =>
    apiRequest(`/blog${status ? `?status=${status}` : ''}`),

  getBySlug: (slug: string) => apiRequest(`/blog/${slug}`),

  search: (query: string) => apiRequest(`/blog/search?q=${encodeURIComponent(query)}`),

  create: (blog: any) =>
    apiRequest('/blog', {
      method: 'POST',
      body: JSON.stringify(blog),
    }),

  update: (id: string, blog: any) =>
    apiRequest(`/blog/${id}`, {
      method: 'PUT',
      body: JSON.stringify(blog),
    }),

  delete: (id: string) =>
    apiRequest(`/blog/${id}`, {
      method: 'DELETE',
    }),

  toggleLike: (id: string) =>
    apiRequest(`/blog/${id}/like`, {
      method: 'POST',
    }),

  getComments: (postId: string) => apiRequest(`/blog/${postId}/comments`),

  addComment: (postId: string, content: string, parentComment?: string) =>
    apiRequest(`/blog/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentComment }),
    }),

  deleteComment: (commentId: string) =>
    apiRequest(`/blog/comments/${commentId}`, {
      method: 'DELETE',
    }),

  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    const accessToken = getAccessToken();
    const headers: { [key: string]: string } = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_URL}/blog/upload-image`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include', // Send cookies
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    return response.json();
  },
};

// Users API
export const usersAPI = {
  getMe: () => apiRequest('/users/me'),

  getById: (id: string) => apiRequest(`/users/${id}`),

  search: (query: string) => apiRequest(`/users/search?query=${encodeURIComponent(query)}`),

  update: (id: string, updates: any) =>
    apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
};

// User API (legacy, kept for backward compatibility)
export const userAPI = {
  getProfile: () => apiRequest('/user/profile'),

  updateProfile: (updates: any) =>
    apiRequest('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest('/user/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  changeEmail: (newEmail: string, password: string) =>
    apiRequest('/user/change-email', {
      method: 'POST',
      body: JSON.stringify({ newEmail, password }),
    }),

  getPreferences: () => apiRequest('/user/preferences'),

  updatePreferences: (updates: any) =>
    apiRequest('/user/preferences', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const accessToken = getAccessToken();
    const headers: { [key: string]: string } = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_URL}/user/avatar`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include', // Send cookies
    });

    if (!response.ok) {
      throw new Error('Failed to upload avatar');
    }

    return response.json();
  },
};

// Community API
export const communityAPI = {
  // Learnings
  getLearnings: (filters?: { category?: string; isPublished?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.isPublished !== undefined) params.append('isPublished', String(filters.isPublished));
    const query = params.toString();
    return apiRequest(`/community/learnings${query ? `?${query}` : ''}`);
  },

  getLearningById: (id: string) => apiRequest(`/community/learnings/${id}`),

  createLearning: (learning: any) =>
    apiRequest('/community/learnings', {
      method: 'POST',
      body: JSON.stringify(learning),
    }),

  updateLearning: (id: string, learning: any) =>
    apiRequest(`/community/learnings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(learning),
    }),

  deleteLearning: (id: string) =>
    apiRequest(`/community/learnings/${id}`, {
      method: 'DELETE',
    }),

  // References
  getReferences: (filters?: { category?: string; isPublished?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.isPublished !== undefined) params.append('isPublished', String(filters.isPublished));
    const query = params.toString();
    return apiRequest(`/community/references${query ? `?${query}` : ''}`);
  },

  getReferenceById: (id: string) => apiRequest(`/community/references/${id}`),

  createReference: (reference: any) =>
    apiRequest('/community/references', {
      method: 'POST',
      body: JSON.stringify(reference),
    }),

  updateReference: (id: string, reference: any) =>
    apiRequest(`/community/references/${id}`, {
      method: 'PUT',
      body: JSON.stringify(reference),
    }),

  deleteReference: (id: string) =>
    apiRequest(`/community/references/${id}`, {
      method: 'DELETE',
    }),
};

// Tasks API
export const tasksAPI = {
  getAll: (status?: string) =>
    apiRequest(`/tasks${status ? `?status=${status}` : ''}`),

  getUpcoming: (days: number = 7) =>
    apiRequest(`/tasks/upcoming?days=${days}`),

  getById: (id: string) => apiRequest(`/tasks/${id}`),

  create: (task: any) =>
    apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    }),

  update: (id: string, task: any) =>
    apiRequest(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    }),

  markComplete: (id: string) =>
    apiRequest(`/tasks/${id}/complete`, {
      method: 'PATCH',
    }),

  // Legacy method name (kept for backward compatibility)
  markAsCompleted: (id: string) =>
    apiRequest(`/tasks/${id}/complete`, {
      method: 'PATCH',
    }),

  delete: (id: string) =>
    apiRequest(`/tasks/${id}`, {
      method: 'DELETE',
    }),
};

// Meetings API
export const meetingsAPI = {
  getAll: () => apiRequest('/meetings'),

  getUpcoming: (days: number = 7) =>
    apiRequest(`/meetings/upcoming?days=${days}`),

  getById: (id: string) => apiRequest(`/meetings/${id}`),

  getByRoomId: (roomId: string) => apiRequest(`/meetings/room/${roomId}`),

  create: (meeting: any) =>
    apiRequest('/meetings', {
      method: 'POST',
      body: JSON.stringify(meeting),
    }),

  update: (id: string, meeting: any) =>
    apiRequest(`/meetings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(meeting),
    }),

  delete: (id: string) =>
    apiRequest(`/meetings/${id}`, {
      method: 'DELETE',
    }),

  join: (roomId: string) =>
    apiRequest(`/meetings/join/${roomId}`, {
      method: 'POST',
    }),
};

// Documents API
export const documentsAPI = {
  getAll: (teamId?: string) => {
    const query = teamId ? `?teamId=${teamId}` : '';
    return apiRequest(`/documents${query}`);
  },

  getById: (id: string) => apiRequest(`/documents/${id}`),

  getByTeam: (teamId: string) => apiRequest(`/documents/team/${teamId}`),

  create: (document: any) =>
    apiRequest('/documents', {
      method: 'POST',
      body: JSON.stringify(document),
    }),

  update: (id: string, document: any) =>
    apiRequest(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(document),
    }),

  delete: (id: string) =>
    apiRequest(`/documents/${id}`, {
      method: 'DELETE',
    }),

  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const accessToken = getAccessToken();
    const headers: { [key: string]: string } = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include', // Send cookies
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    return response.json();
  },
};

// Projects API
export const projectsAPI = {
  getAll: (status?: string, teamId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (teamId) params.append('teamId', teamId);
    const query = params.toString();
    return apiRequest(`/projects${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => apiRequest(`/projects/${id}`),

  getByTeam: (teamId: string) => apiRequest(`/projects/team/${teamId}`),

  create: (project: any) =>
    apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    }),

  update: (id: string, project: any) =>
    apiRequest(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    }),

  delete: (id: string) =>
    apiRequest(`/projects/${id}`, {
      method: 'DELETE',
    }),

  addMember: (id: string, userId: string) =>
    apiRequest(`/projects/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  removeMember: (id: string, userId: string) =>
    apiRequest(`/projects/${id}/members/${userId}`, {
      method: 'DELETE',
    }),

  // Project Tasks
  createTask: (projectId: string, task: any) =>
    apiRequest(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    }),

  getProjectTasks: (projectId: string) =>
    apiRequest(`/projects/${projectId}/tasks`),

  updateTask: (projectId: string, taskId: string, task: any) =>
    apiRequest(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    }),

  deleteTask: (projectId: string, taskId: string) =>
    apiRequest(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
    }),
};

// Media API
export const mediaAPI = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const accessToken = getAccessToken();
    const headers: { [key: string]: string } = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_URL}/media/upload`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include', // Send cookies
    });

    if (!response.ok) {
      throw new Error('Failed to upload media');
    }

    return response.json();
  },
};

// Messaging API
export const messagingAPI = {
  // Send a message
  sendMessage: (data: {
    receiverId: string;
    content: string;
    messageType?: string;
    fileUrl?: string;
    fileName?: string;
  }) =>
    apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Get all conversations
  getConversations: () => apiRequest('/messages/conversations'),

  // Get conversation with a specific user
  getConversation: (userId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest(`/messages/conversation/${userId}${query}`);
  },

  // Mark message as read
  markAsRead: (messageId: string) =>
    apiRequest(`/messages/${messageId}/read`, {
      method: 'POST',
    }),

  // Mark all messages from a user as read
  markConversationAsRead: (userId: string) =>
    apiRequest(`/messages/conversation/${userId}/read`, {
      method: 'POST',
    }),

  // Delete a message
  deleteMessage: (messageId: string) =>
    apiRequest(`/messages/${messageId}`, {
      method: 'DELETE',
    }),

  // Get unread message count
  getUnreadCount: () => apiRequest('/messages/unread/count'),

  // Search messages
  searchMessages: (query: string) =>
    apiRequest(`/messages/search?q=${encodeURIComponent(query)}`),
};

// Chat API (for /chat namespace - different from messaging)
export const chatAPI = {
  // Get private conversation history
  getPrivateConversation: (userEmail: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest(`/chat/conversation/${userEmail}${query}`);
  },

  // Get group conversation history
  getGroupConversation: (groupName: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest(`/chat/group/${groupName}${query}`);
  },

  // Get all conversations
  getConversations: () => apiRequest('/chat/conversations'),

  // Get user's groups
  getGroups: () => apiRequest('/chat/groups'),

  // Get unread message count
  getUnreadCount: () => apiRequest('/chat/unread-count'),
};

// Dashboard API
export const dashboardAPI = {
  // Get comprehensive dashboard statistics
  getStats: (params?: { month?: number; year?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.month !== undefined) queryParams.append('month', String(params.month));
    if (params?.year !== undefined) queryParams.append('year', String(params.year));
    const query = queryParams.toString();
    return apiRequest(`/dashboard/stats${query ? `?${query}` : ''}`);
  },

  // Get monthly activity data for the year
  getMonthlyActivity: (year?: number) => {
    const query = year ? `?year=${year}` : '';
    return apiRequest(`/dashboard/monthly-activity${query}`);
  },

  // Get recent activities
  getRecentActivities: (params?: { limit?: number; month?: number; year?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit !== undefined) queryParams.append('limit', String(params.limit));
    if (params?.month !== undefined) queryParams.append('month', String(params.month));
    if (params?.year !== undefined) queryParams.append('year', String(params.year));
    const query = queryParams.toString();
    return apiRequest(`/dashboard/recent-activities${query ? `?${query}` : ''}`);
  },

  // Get active team members
  getActiveMembers: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest(`/dashboard/active-members${query}`);
  },

  // Get user statistics
  getUserStats: () => apiRequest('/dashboard/user-stats'),

  // Get project statistics
  getProjectStats: () => apiRequest('/dashboard/project-stats'),

  // Get task statistics
  getTaskStats: () => apiRequest('/dashboard/task-stats'),
};

// Gmail API
export const gmailAPI = {
  // Gmail OAuth Authentication
  connectGmail: async () => {
    try {
      // Get auth URL via authenticated API call
      const response = await apiRequest('/gmail/auth-url');
      if (response.authUrl) {
        window.location.href = response.authUrl;
      }
    } catch (error) {
      console.error('Failed to get Gmail auth URL:', error);
      throw error;
    }
  },

  disconnectGmail: () => apiRequest('/gmail/disconnect', { method: 'POST' }),

  getAuthStatus: () => apiRequest('/gmail/auth/status'),

  // List emails
  getEmails: (params?: {
    category?: 'inbox' | 'sent' | 'drafts' | 'starred' | 'important' | 'trash' | 'spam';
    maxResults?: number;
    pageToken?: string;
    q?: string; // Gmail search query
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.maxResults) queryParams.append('maxResults', String(params.maxResults));
    if (params?.pageToken) queryParams.append('pageToken', params.pageToken);
    if (params?.q) queryParams.append('q', params.q);

    const query = queryParams.toString();
    return apiRequest(`/gmail/messages${query ? `?${query}` : ''}`);
  },

  // Get single email by ID
  getEmailById: (id: string) => apiRequest(`/gmail/messages/${id}`),

  // Send email
  sendEmail: (email: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    body: string;
    isHtml?: boolean;
    attachments?: Array<{
      filename: string;
      content: string; // base64 encoded
      mimeType: string;
    }>;
  }) =>
    apiRequest('/gmail/messages/send', {
      method: 'POST',
      body: JSON.stringify(email),
    }),

  // Reply to email
  replyToEmail: (messageId: string, reply: {
    body: string;
    isHtml?: boolean;
    attachments?: Array<{
      filename: string;
      content: string;
      mimeType: string;
    }>;
  }) =>
    apiRequest(`/gmail/messages/${messageId}/reply`, {
      method: 'POST',
      body: JSON.stringify(reply),
    }),

  // Forward email
  forwardEmail: (messageId: string, forward: {
    to: string | string[];
    cc?: string | string[];
    body?: string;
    isHtml?: boolean;
  }) =>
    apiRequest(`/gmail/messages/${messageId}/forward`, {
      method: 'POST',
      body: JSON.stringify(forward),
    }),

  // Save draft
  saveDraft: (draft: {
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject?: string;
    body?: string;
    isHtml?: boolean;
  }) =>
    apiRequest('/gmail/drafts', {
      method: 'POST',
      body: JSON.stringify(draft),
    }),

  // Update draft
  updateDraft: (draftId: string, draft: {
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject?: string;
    body?: string;
    isHtml?: boolean;
  }) =>
    apiRequest(`/gmail/drafts/${draftId}`, {
      method: 'PUT',
      body: JSON.stringify(draft),
    }),

  // Delete draft
  deleteDraft: (draftId: string) =>
    apiRequest(`/gmail/drafts/${draftId}`, {
      method: 'DELETE',
    }),

  // Send draft
  sendDraft: (draftId: string) =>
    apiRequest(`/gmail/drafts/${draftId}/send`, {
      method: 'POST',
    }),

  // Modify email labels/actions
  modifyEmail: (messageId: string, actions: {
    addLabels?: string[]; // e.g., ['STARRED', 'IMPORTANT']
    removeLabels?: string[]; // e.g., ['UNREAD', 'INBOX']
  }) =>
    apiRequest(`/gmail/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify(actions),
    }),

  // Mark as read
  markAsRead: (messageId: string) =>
    apiRequest(`/gmail/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ removeLabels: ['UNREAD'] }),
    }),

  // Mark as unread
  markAsUnread: (messageId: string) =>
    apiRequest(`/gmail/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ addLabels: ['UNREAD'] }),
    }),

  // Star email
  starEmail: (messageId: string) =>
    apiRequest(`/gmail/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ addLabels: ['STARRED'] }),
    }),

  // Unstar email
  unstarEmail: (messageId: string) =>
    apiRequest(`/gmail/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ removeLabels: ['STARRED'] }),
    }),

  // Mark as important
  markAsImportant: (messageId: string) =>
    apiRequest(`/gmail/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ addLabels: ['IMPORTANT'] }),
    }),

  // Unmark as important
  unmarkAsImportant: (messageId: string) =>
    apiRequest(`/gmail/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ removeLabels: ['IMPORTANT'] }),
    }),

  // Move to trash
  moveToTrash: (messageId: string) =>
    apiRequest(`/gmail/messages/${messageId}/trash`, {
      method: 'POST',
    }),

  // Remove from trash
  removeFromTrash: (messageId: string) =>
    apiRequest(`/gmail/messages/${messageId}/untrash`, {
      method: 'POST',
    }),

  // Permanently delete
  permanentlyDelete: (messageId: string) =>
    apiRequest(`/gmail/messages/${messageId}`, {
      method: 'DELETE',
    }),

  // Archive email (remove from inbox)
  archiveEmail: (messageId: string) =>
    apiRequest(`/gmail/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ removeLabels: ['INBOX'] }),
    }),

  // Move to inbox (unarchive)
  moveToInbox: (messageId: string) =>
    apiRequest(`/gmail/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ addLabels: ['INBOX'] }),
    }),

  // Search emails
  searchEmails: (query: string, maxResults: number = 50) => {
    return apiRequest(`/gmail/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`);
  },

  // Get labels
  getLabels: () => apiRequest('/gmail/labels'),

  // Get profile (email address, etc.)
  getProfile: () => apiRequest('/gmail/profile'),

  // Batch operations
  batchModify: (messageIds: string[], actions: {
    addLabels?: string[];
    removeLabels?: string[];
  }) =>
    apiRequest('/gmail/messages/batch-modify', {
      method: 'POST',
      body: JSON.stringify({ messageIds, ...actions }),
    }),

  // Batch delete
  batchDelete: (messageIds: string[]) =>
    apiRequest('/gmail/messages/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ messageIds }),
    }),

  // Batch trash
  batchTrash: (messageIds: string[]) =>
    apiRequest('/gmail/messages/batch-trash', {
      method: 'POST',
      body: JSON.stringify({ messageIds }),
    }),
};

// Collections API
export const collectionsAPI = {
  // Create a new collection
  create: (data: {
    name: string;
    rows: number;
    cols: number;
    cells: any;
    projectId?: string;
    status?: 'draft' | 'published';
    thumbnail?: string;
  }) =>
    apiRequest('/collections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Get all collections
  getAll: (status?: 'draft' | 'published') => {
    const query = status ? `?status=${status}` : '';
    return apiRequest(`/collections${query}`);
  },

  // Get recent drafts
  getRecentDrafts: (limit: number = 10) =>
    apiRequest(`/collections/drafts/recent?limit=${limit}`),

  // Get published collections
  getPublished: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest(`/collections/published${query}`);
  },

  // Get collections by project
  getByProject: (projectId: string, status?: 'draft' | 'published') => {
    const query = status ? `?status=${status}` : '';
    return apiRequest(`/collections/project/${projectId}${query}`);
  },

  // Get a single collection
  getById: (id: string) => apiRequest(`/collections/${id}`),

  // Update a collection
  update: (id: string, data: {
    name?: string;
    rows?: number;
    cols?: number;
    cells?: any;
    status?: 'draft' | 'published';
    thumbnail?: string;
    projectId?: string;
  }) =>
    apiRequest(`/collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete a collection
  delete: (id: string) =>
    apiRequest(`/collections/${id}`, {
      method: 'DELETE',
    }),

  // Share a collection
  share: (id: string, userIds: string[]) =>
    apiRequest(`/collections/${id}/share`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    }),
};

// Kanban API
export const kanbanAPI = {
  // Get board by project (or default board if no projectId)
  getBoard: (projectId?: string) => {
    const query = projectId ? `?projectId=${projectId}` : '';
    return apiRequest(`/kanban/boards${query}`);
  },

  // Create or update board
  createOrUpdateBoard: (data: {
    projectId?: string;
    name?: string;
    columns?: Array<{
      title: string;
      status: string[];
      color: string;
      order: number;
    }>;
    isDefault?: boolean;
  }) =>
    apiRequest('/kanban/boards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update existing board
  updateBoard: (boardId: string, data: {
    name?: string;
    columns?: Array<{
      title: string;
      status: string[];
      color: string;
      order: number;
    }>;
    isDefault?: boolean;
  }) =>
    apiRequest(`/kanban/boards/${boardId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Get all user boards
  getAllBoards: () => apiRequest('/kanban/boards/all'),

  // Delete board
  deleteBoard: (boardId: string) =>
    apiRequest(`/kanban/boards/${boardId}`, {
      method: 'DELETE',
    }),
};

export default {
  auth: authAPI,
  teams: teamsAPI,
  calendar: calendarAPI,
  blog: blogAPI,
  user: userAPI,
  users: usersAPI,
  community: communityAPI,
  tasks: tasksAPI,
  meetings: meetingsAPI,
  documents: documentsAPI,
  projects: projectsAPI,
  media: mediaAPI,
  messaging: messagingAPI,
  chat: chatAPI,
  dashboard: dashboardAPI,
  gmail: gmailAPI,
  collections: collectionsAPI,
  kanban: kanbanAPI,
};
