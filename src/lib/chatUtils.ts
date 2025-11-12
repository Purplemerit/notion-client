/**
 * Chat utility functions for message handling and offline support
 */

import { Message } from '@/contexts/ChatContext';

/**
 * Deduplicate messages based on ID and content
 */
export function deduplicateMessages(messages: Message[]): Message[] {
  const seen = new Set<string>();
  const result: Message[] = [];

  for (const msg of messages) {
    // Create a unique key based on MongoDB _id (preferred) or content+createdAt+sender
    // Using createdAt instead of time for precise deduplication
    let key: string;
    if (msg.id && !msg.id.startsWith('offline-') && msg.id.length === 24) {
      // MongoDB ObjectId is 24 characters - use as primary key
      key = msg.id;
    } else if (msg.createdAt) {
      // Use ISO timestamp for precise deduplication
      key = `${msg.sender}-${msg.content}-${msg.createdAt}`;
    } else {
      // Fallback to formatted time (less precise)
      key = `${msg.sender}-${msg.content}-${msg.time}`;
    }

    if (!seen.has(key)) {
      seen.add(key);
      result.push(msg);
    }
  }

  return result;
}

/**
 * Merge messages from different sources (localStorage, API, real-time)
 * Prioritizes server IDs over client-generated IDs
 */
export function mergeMessages(
  localMessages: Message[],
  serverMessages: Message[],
): Message[] {
  const merged = new Map<string, Message>();

  // Helper to generate consistent key
  const getMessageKey = (msg: Message): string => {
    if (msg.id && !msg.id.startsWith('offline-') && msg.id.length === 24) {
      return msg.id;
    } else if (msg.createdAt) {
      return `${msg.sender}-${msg.content}-${msg.createdAt}`;
    } else {
      return `${msg.sender}-${msg.content}-${msg.time}`;
    }
  };

  // Add local messages first
  for (const msg of localMessages) {
    const key = getMessageKey(msg);
    merged.set(key, msg);
  }

  // Add/update with server messages (they take priority)
  for (const msg of serverMessages) {
    const key = getMessageKey(msg);

    // Check if we have a local message with temp ID that matches this server message
    // If server message has proper ID, also try to find and replace temp ID version
    if (msg.id && msg.id.length === 24) {
      // Look for local messages with same content+sender+time
      const contentKey = msg.createdAt
        ? `${msg.sender}-${msg.content}-${msg.createdAt}`
        : `${msg.sender}-${msg.content}-${msg.time}`;

      // Remove potential duplicate with temp ID
      merged.delete(contentKey);
    }

    merged.set(key, msg);
  }

  // Convert to array and sort by createdAt timestamp
  const result = Array.from(merged.values());

  // Sort chronologically by createdAt timestamp
  result.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB; // Ascending order (oldest first)
  });

  return deduplicateMessages(result);
}

/**
 * Offline message queue item
 */
export interface QueuedMessage {
  id: string;
  chatName: string;
  message: {
    sender: string;
    receiver?: string;
    groupName?: string;
    text: string;
  };
  type: 'private' | 'group';
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'sending' | 'failed';
}

/**
 * Offline message queue manager
 */
export class OfflineMessageQueue {
  private static STORAGE_KEY = 'offline_message_queue';
  private static MAX_RETRIES = 3;

  /**
   * Add a message to the offline queue
   */
  static enqueue(
    chatName: string,
    message: { sender: string; receiver?: string; groupName?: string; text: string },
    type: 'private' | 'group',
  ): string {
    const queue = this.getQueue();
    const queuedMessage: QueuedMessage = {
      id: `offline-${Date.now()}-${Math.random()}`,
      chatName,
      message,
      type,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    queue.push(queuedMessage);
    this.saveQueue(queue);

    return queuedMessage.id;
  }

  /**
   * Get all pending messages from the queue
   */
  static getQueue(): QueuedMessage[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to read offline queue:', error);
      return [];
    }
  }

  /**
   * Save the queue to localStorage
   */
  static saveQueue(queue: QueuedMessage[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Remove a message from the queue
   */
  static dequeue(messageId: string): void {
    const queue = this.getQueue();
    const filtered = queue.filter((msg) => msg.id !== messageId);
    this.saveQueue(filtered);
  }

  /**
   * Mark a message as sending
   */
  static markAsSending(messageId: string): void {
    const queue = this.getQueue();
    const message = queue.find((msg) => msg.id === messageId);
    if (message) {
      message.status = 'sending';
      this.saveQueue(queue);
    }
  }

  /**
   * Mark a message as failed and increment retry count
   */
  static markAsFailed(messageId: string): void {
    const queue = this.getQueue();
    const message = queue.find((msg) => msg.id === messageId);
    if (message) {
      message.status = 'failed';
      message.retryCount++;

      // Remove if max retries reached
      if (message.retryCount >= this.MAX_RETRIES) {
        this.dequeue(messageId);
      } else {
        this.saveQueue(queue);
      }
    }
  }

  /**
   * Get pending messages that should be retried
   */
  static getPendingMessages(): QueuedMessage[] {
    const queue = this.getQueue();
    return queue.filter(
      (msg) => msg.status === 'pending' || msg.status === 'failed',
    );
  }

  /**
   * Clear the entire queue
   */
  static clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

/**
 * Check if user is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Store last connection timestamp for a user
 */
export function setLastConnectionTime(userEmail: string): void {
  const key = `last_connection_${userEmail}`;
  localStorage.setItem(key, new Date().toISOString());
}

/**
 * Get last connection timestamp for a user
 */
export function getLastConnectionTime(userEmail: string): Date | null {
  const key = `last_connection_${userEmail}`;
  const stored = localStorage.getItem(key);
  return stored ? new Date(stored) : null;
}
