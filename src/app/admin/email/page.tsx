"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminSidebar from "@/components/adminSidebar";
import AdminHeader from "@/components/AdminHeader";
import {
  Plus,
  Inbox,
  Send,
  Star,
  Edit,
  Bookmark,
  Trash2,
  X,
  Loader2,
  Archive,
  Mail,
  MailOpen,
  Reply,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { gmailAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload?: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string; size?: number };
    parts?: Array<{ mimeType: string; body?: { data?: string }; filename?: string }>;
  };
  labelIds?: string[];
  internalDate?: string;
}

export default function EmailPage() {
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);
  const [activeCategory, setActiveCategory] = useState("Inbox");
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const { toast } = useToast();

  // Compose form state
  const [composeData, setComposeData] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
  });

  // Reply form state
  const [replyBody, setReplyBody] = useState("");

  const loadEmails = useCallback(async () => {
    try {
      setLoading(true);
      const categoryMap: Record<string, string> = {
        "Inbox": "inbox",
        "Sent": "sent",
        "Draft": "drafts",
        "Favorite": "starred",
        "Important": "important",
        "Scheduled": "inbox",
      };

      const category = categoryMap[activeCategory] as any;
      const result = await gmailAPI.getEmails({
        category,
        maxResults: 50,
        q: searchQuery || undefined,
      });

      setEmails(result.messages || []);
      if (result.messages && result.messages.length > 0 && !selectedEmail) {
        setSelectedEmail(result.messages[0]);
      }
    } catch (error: any) {
      console.error("Error loading emails:", error);
      toast({
        title: "Error Loading Emails",
        description: error.message || "Failed to load emails from Gmail",
        variant: "destructive",
      });
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchQuery, selectedEmail, toast]);

  useEffect(() => {
    checkGmailAuth();
  }, []);

  useEffect(() => {
    if (gmailConnected) {
      loadEmails();
    }
  }, [gmailConnected, loadEmails]);

  const checkGmailAuth = async () => {
    try {
      const status = await gmailAPI.getAuthStatus();
      setGmailConnected(status.connected || false);
      if (!status.connected) {
        setLoading(false);
      }
    } catch (error) {
      console.error("Gmail auth check failed:", error);
      setGmailConnected(false);
      setLoading(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      await gmailAPI.connectGmail();
    } catch (error: any) {
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect Gmail account",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = async () => {
    if (!composeData.to || !composeData.subject) {
      toast({
        title: "Validation Error",
        description: "Please provide recipient and subject",
        variant: "destructive",
      });
      return;
    }

    try {
      await gmailAPI.sendEmail({
        to: composeData.to.split(",").map(e => e.trim()),
        cc: composeData.cc ? composeData.cc.split(",").map(e => e.trim()) : undefined,
        bcc: composeData.bcc ? composeData.bcc.split(",").map(e => e.trim()) : undefined,
        subject: composeData.subject,
        body: composeData.body,
        isHtml: false,
      });

      toast({
        title: "Success",
        description: "Email sent successfully",
      });

      setComposeOpen(false);
      setComposeData({ to: "", cc: "", bcc: "", subject: "", body: "" });
      loadEmails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    }
  };

  const handleReplyEmail = async () => {
    if (!selectedEmail || !replyBody) {
      toast({
        title: "Validation Error",
        description: "Please enter a reply message",
        variant: "destructive",
      });
      return;
    }

    try {
      await gmailAPI.replyToEmail(selectedEmail.id, {
        body: replyBody,
        isHtml: false,
      });

      toast({
        title: "Success",
        description: "Reply sent successfully",
      });

      setReplyOpen(false);
      setReplyBody("");
      loadEmails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    try {
      await gmailAPI.moveToTrash(emailId);
      toast({
        title: "Success",
        description: "Email moved to trash",
      });
      loadEmails();
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete email",
        variant: "destructive",
      });
    }
  };

  const handleStarEmail = async (emailId: string, isStarred: boolean) => {
    try {
      if (isStarred) {
        await gmailAPI.unstarEmail(emailId);
      } else {
        await gmailAPI.starEmail(emailId);
      }
      loadEmails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update email",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsImportant = async (emailId: string, isImportant: boolean) => {
    try {
      if (isImportant) {
        await gmailAPI.unmarkAsImportant(emailId);
      } else {
        await gmailAPI.markAsImportant(emailId);
      }
      toast({
        title: "Success",
        description: isImportant ? "Removed from important" : "Marked as important",
      });
      loadEmails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update email",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsRead = async (emailId: string, isUnread: boolean) => {
    try {
      if (isUnread) {
        await gmailAPI.markAsRead(emailId);
      } else {
        await gmailAPI.markAsUnread(emailId);
      }
      loadEmails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update email",
        variant: "destructive",
      });
    }
  };

  const handleArchiveEmail = async (emailId: string) => {
    try {
      await gmailAPI.archiveEmail(emailId);
      toast({
        title: "Success",
        description: "Email archived",
      });
      loadEmails();
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to archive email",
        variant: "destructive",
      });
    }
  };

  const getEmailHeader = (email: GmailMessage, headerName: string): string => {
    const header = email.payload?.headers?.find(
      h => h.name.toLowerCase() === headerName.toLowerCase()
    );
    return header?.value || "";
  };

  const getEmailBody = (email: GmailMessage): string => {
    if (!email.payload) return email.snippet || "";

    // Try to get body from payload
    if (email.payload.body?.data) {
      try {
        return atob(email.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      } catch {
        return email.snippet || "";
      }
    }

    // Try to get from parts
    if (email.payload.parts) {
      for (const part of email.payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          try {
            return atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
          } catch {
            continue;
          }
        }
      }
    }

    return email.snippet || "";
  };

  const formatDate = (timestamp?: string): string => {
    if (!timestamp) return "";
    const date = new Date(parseInt(timestamp));
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      return `${hours}h`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d`;
    }
  };

  const isStarred = (email: GmailMessage): boolean => {
    return email.labelIds?.includes("STARRED") || false;
  };

  const isImportant = (email: GmailMessage): boolean => {
    return email.labelIds?.includes("IMPORTANT") || false;
  };

  const isUnread = (email: GmailMessage): boolean => {
    return email.labelIds?.includes("UNREAD") || false;
  };

  const getUnreadCount = (): number => {
    return emails.filter(e => isUnread(e)).length;
  };

  if (!gmailConnected) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#F7F5FD" }}>
        <div style={{ flexShrink: 0, height: "100vh" }}>
          <AdminSidebar />
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", padding: "40px" }}>
          <Mail size={64} color="#8B7BE8" style={{ marginBottom: 24 }} />
          <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 16, color: "#252525" }}>
            Connect Your Gmail Account
          </h1>
          <p style={{ fontSize: 16, color: "#999", marginBottom: 32, textAlign: "center", maxWidth: 500 }}>
            To use the email functionality, you need to connect your Gmail account. This will allow you to view, send, and manage your emails directly from this interface.
          </p>
          <Button
            onClick={handleConnectGmail}
            style={{
              background: "#8B7BE8",
              color: "#FFF",
              padding: "12px 32px",
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Mail size={20} />
            Connect Gmail Account
          </Button>
          <p style={{ fontSize: 12, color: "#BBB", marginTop: 16 }}>
            You&apos;ll be redirected to Google to authorize access
          </p>
        </div>
      </div>
    );
  }

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
          currentUser={{ name: "Admin", role: "admin" }}
          searchPlaceholder="Search emails..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Main Email Content */}
        <main style={{ display: "flex", flex: 1, overflow: "hidden", background: "#F7F5FD" }}>
          {/* Left Email Sidebar */}
          <aside
            style={{
              width: 280,
              background: "#FFF",
              borderRight: "1px solid #E5E5E5",
              display: "flex",
              flexDirection: "column",
              padding: "24px 16px",
              gap: 24,
            }}
          >
            {/* New Mail Button */}
            <Button
              onClick={() => setComposeOpen(true)}
              style={{
                background: "#8B7BE8",
                color: "#FFF",
                borderRadius: 12,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Plus size={20} />
              New Mail
            </Button>

            {/* Email Categories */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                onClick={() => setActiveCategory("Inbox")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  cursor: "pointer",
                  background: activeCategory === "Inbox" ? "#F5F3FF" : "transparent",
                }}
              >
                <Inbox size={20} color="#8B7BE8" />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>Inbox</span>
                {getUnreadCount() > 0 && (
                  <span
                    style={{
                      background: "#FF4D4F",
                      color: "#FFF",
                      borderRadius: 12,
                      padding: "2px 8px",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {getUnreadCount()}
                  </span>
                )}
              </div>

              <div
                onClick={() => setActiveCategory("Sent")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  cursor: "pointer",
                  background: activeCategory === "Sent" ? "#F5F3FF" : "transparent",
                }}
              >
                <Send size={20} color={activeCategory === "Sent" ? "#8B7BE8" : "#999"} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: activeCategory === "Sent" ? "#000" : "#999" }}>Sent</span>
              </div>

              <div
                onClick={() => setActiveCategory("Favorite")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  cursor: "pointer",
                  background: activeCategory === "Favorite" ? "#F5F3FF" : "transparent",
                }}
              >
                <Star size={20} color={activeCategory === "Favorite" ? "#8B7BE8" : "#999"} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: activeCategory === "Favorite" ? "#000" : "#999" }}>Favorite</span>
              </div>

              <div
                onClick={() => setActiveCategory("Draft")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  cursor: "pointer",
                  background: activeCategory === "Draft" ? "#F5F3FF" : "transparent",
                }}
              >
                <Edit size={20} color={activeCategory === "Draft" ? "#8B7BE8" : "#999"} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: activeCategory === "Draft" ? "#000" : "#999" }}>Draft</span>
              </div>

              <div
                onClick={() => setActiveCategory("Important")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  cursor: "pointer",
                  background: activeCategory === "Important" ? "#F5F3FF" : "transparent",
                }}
              >
                <Bookmark size={20} color={activeCategory === "Important" ? "#8B7BE8" : "#999"} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: activeCategory === "Important" ? "#000" : "#999" }}>Important</span>
              </div>
            </div>
          </aside>

          {/* Email List */}
          <section
            style={{
              width: 400,
              background: "#FFF",
              borderRight: "1px solid #E5E5E5",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Email List Header */}
            <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #E5E5E5" }}>
              <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, color: "#252525" }}>
                {activeCategory} ({emails.length})
              </div>
            </div>

            {/* Email Items */}
            <div style={{ flex: 1, overflow: "auto" }}>
              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
                  <Loader2 className="animate-spin" size={32} color="#8B7BE8" />
                </div>
              ) : emails.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <Mail size={48} color="#CCC" style={{ marginBottom: 16 }} />
                  <p style={{ fontSize: 16, color: "#999" }}>No emails found</p>
                </div>
              ) : (
                emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "16px 20px",
                      borderBottom: "1px solid #E5E5E5",
                      cursor: "pointer",
                      background: selectedEmail?.id === email.id ? "#F5F3FF" : isUnread(email) ? "#FAFAFA" : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStarEmail(email.id, isStarred(email));
                        }}
                        style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        <Star
                          size={16}
                          color={isStarred(email) ? "#FFB547" : "#999"}
                          fill={isStarred(email) ? "#FFB547" : "none"}
                        />
                      </button>
                    </div>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: "#AEA1E4",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#FFF",
                      }}
                    >
                      {getEmailHeader(email, "From").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: isUnread(email) ? 600 : 500,
                          color: "#252525",
                          marginBottom: 4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getEmailHeader(email, "Subject") || "(No Subject)"}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#999",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {email.snippet}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#999" }}>{formatDate(email.internalDate)}</span>
                      {isImportant(email) && <Bookmark size={14} color="#8B7BE8" fill="#8B7BE8" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Email Preview */}
          <section
            style={{
              flex: 1,
              background: "#FFF",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {selectedEmail ? (
              <>
                {/* Preview Header */}
                <div
                  style={{
                    padding: "24px",
                    borderBottom: "1px solid #E5E5E5",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "#252525" }}>
                      {getEmailHeader(selectedEmail, "Subject") || "(No Subject)"}
                    </div>
                    <div style={{ fontSize: 14, color: "#999", marginTop: 4 }}>
                      From: {getEmailHeader(selectedEmail, "From")}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <Button
                      onClick={() => handleMarkAsImportant(selectedEmail.id, isImportant(selectedEmail))}
                      style={{
                        background: isImportant(selectedEmail) ? "#8B7BE8" : "#F5F5FF",
                        color: isImportant(selectedEmail) ? "#FFF" : "#8B7BE8",
                        borderRadius: 20,
                        padding: "8px 16px",
                        fontSize: 14,
                        fontWeight: 500,
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Bookmark size={16} fill={isImportant(selectedEmail) ? "#FFF" : "none"} />
                      {isImportant(selectedEmail) ? "Important" : "Mark Important"}
                    </Button>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button
                        onClick={() => setReplyOpen(true)}
                        style={{ background: "transparent", border: "none", cursor: "pointer" }}
                        title="Reply"
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            border: "1px solid #E5E5E5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Reply size={16} color="#999" />
                        </div>
                      </button>
                      <button
                        onClick={() => handleArchiveEmail(selectedEmail.id)}
                        style={{ background: "transparent", border: "none", cursor: "pointer" }}
                        title="Archive"
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            border: "1px solid #E5E5E5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Archive size={16} color="#999" />
                        </div>
                      </button>
                      <button
                        onClick={() => handleDeleteEmail(selectedEmail.id)}
                        style={{ background: "transparent", border: "none", cursor: "pointer" }}
                        title="Delete"
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            border: "1px solid #E5E5E5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trash2 size={16} color="#FF6B6B" />
                        </div>
                      </button>
                      <button
                        onClick={() => handleMarkAsRead(selectedEmail.id, isUnread(selectedEmail))}
                        style={{ background: "transparent", border: "none", cursor: "pointer" }}
                        title={isUnread(selectedEmail) ? "Mark as Read" : "Mark as Unread"}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            border: "1px solid #E5E5E5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isUnread(selectedEmail) ? <MailOpen size={16} color="#999" /> : <Mail size={16} color="#999" />}
                        </div>
                      </button>
                      <button
                        onClick={() => handleStarEmail(selectedEmail.id, isStarred(selectedEmail))}
                        style={{ background: "transparent", border: "none", cursor: "pointer" }}
                        title={isStarred(selectedEmail) ? "Unstar" : "Star"}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            border: "1px solid #E5E5E5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Star size={16} color={isStarred(selectedEmail) ? "#FFB547" : "#999"} fill={isStarred(selectedEmail) ? "#FFB547" : "none"} />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Email Content */}
                <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
                  {/* Sender Info */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: "#AEA1E4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        fontWeight: 600,
                        color: "#FFF",
                      }}
                    >
                      {getEmailHeader(selectedEmail, "From").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#252525" }}>
                        {getEmailHeader(selectedEmail, "From")}
                      </div>
                      <div style={{ fontSize: 14, color: "#999" }}>
                        {new Date(parseInt(selectedEmail.internalDate || "0")).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div
                    style={{
                      fontSize: 14,
                      color: "#666",
                      lineHeight: 1.8,
                      marginBottom: 24,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {getEmailBody(selectedEmail)}
                  </div>

                  {/* Reply Box (if open) */}
                  {replyOpen && (
                    <div
                      style={{
                        border: "1px solid #E5E5E5",
                        borderRadius: 16,
                        overflow: "hidden",
                        marginTop: 24,
                      }}
                    >
                      <div style={{ padding: "12px 16px", background: "#F5F5FF", borderBottom: "1px solid #E5E5E5" }}>
                        <strong>Reply to: </strong>{getEmailHeader(selectedEmail, "From")}
                      </div>
                      <Textarea
                        placeholder="Write your reply here..."
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        style={{
                          width: "100%",
                          minHeight: 150,
                          padding: "16px",
                          border: "none",
                          outline: "none",
                          fontSize: 14,
                          resize: "vertical",
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          padding: "12px 16px",
                          background: "#FAFAFA",
                          borderTop: "1px solid #E5E5E5",
                          gap: 12,
                        }}
                      >
                        <Button
                          onClick={() => {
                            setReplyOpen(false);
                            setReplyBody("");
                          }}
                          style={{
                            background: "#F5F5F5",
                            color: "#666",
                            borderRadius: 20,
                            padding: "8px 24px",
                            fontSize: 14,
                            fontWeight: 600,
                            border: "none",
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleReplyEmail}
                          style={{
                            background: "#8B7BE8",
                            color: "#FFF",
                            borderRadius: 20,
                            padding: "8px 24px",
                            fontSize: 14,
                            fontWeight: 600,
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Send size={16} />
                          Send Reply
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                <div style={{ textAlign: "center" }}>
                  <Mail size={64} color="#CCC" style={{ marginBottom: 16 }} />
                  <p style={{ fontSize: 18, color: "#999" }}>Select an email to view</p>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Compose Email Dialog */}
      {composeOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 24,
          }}
          onClick={() => setComposeOpen(false)}
        >
          <div
            style={{
              background: "#FFF",
              borderRadius: 16,
              padding: 0,
              maxWidth: 700,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px 24px",
                borderBottom: "1px solid #E5E5E5",
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#252525" }}>New Message</h2>
              <Button
                onClick={() => setComposeOpen(false)}
                style={{ background: "transparent", padding: 0, border: "none" }}
              >
                <X size={24} color="#666" />
              </Button>
            </div>

            <div style={{ padding: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block", color: "#252525" }}>
                    To
                  </label>
                  <Input
                    value={composeData.to}
                    onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                    placeholder="recipient@example.com (separate multiple with commas)"
                    style={{ borderRadius: 8, border: "1px solid #E1DEF6" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block", color: "#252525" }}>
                    CC (Optional)
                  </label>
                  <Input
                    value={composeData.cc}
                    onChange={(e) => setComposeData({ ...composeData, cc: e.target.value })}
                    placeholder="cc@example.com"
                    style={{ borderRadius: 8, border: "1px solid #E1DEF6" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block", color: "#252525" }}>
                    Subject
                  </label>
                  <Input
                    value={composeData.subject}
                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                    placeholder="Email subject"
                    style={{ borderRadius: 8, border: "1px solid #E1DEF6" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block", color: "#252525" }}>
                    Message
                  </label>
                  <Textarea
                    value={composeData.body}
                    onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                    placeholder="Write your message here..."
                    rows={10}
                    style={{ borderRadius: 8, border: "1px solid #E1DEF6" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                  <Button
                    onClick={() => {
                      setComposeOpen(false);
                      setComposeData({ to: "", cc: "", bcc: "", subject: "", body: "" });
                    }}
                    style={{
                      flex: 1,
                      background: "#F5F5F5",
                      color: "#666",
                      padding: "12px",
                      borderRadius: 8,
                      border: "none",
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendEmail}
                    style={{
                      flex: 1,
                      background: "#8B7BE8",
                      color: "white",
                      padding: "12px",
                      borderRadius: 8,
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Send size={16} />
                    Send Email
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
