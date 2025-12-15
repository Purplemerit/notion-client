"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Bell, MessageSquare, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { dashboardAPI } from "@/lib/api";

interface AdminHeaderProps {
  currentUser: any;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  searchValue?: string;
  showSearch?: boolean;
}

export default function AdminHeader({
  currentUser,
  searchPlaceholder = "Search...",
  onSearchChange,
  searchValue = "",
  showSearch = true,
}: AdminHeaderProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      const notificationsData = await dashboardAPI.getRecentActivities({ limit: 20 }).catch((err) => {
        console.error('Error loading notifications:', err);
        return [];
      });

      setNotifications(notificationsData || []);
      setUnreadCount((notificationsData || []).length);
    } catch (error: any) {
      console.error('Error loading notifications:', error);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Handle outside click for notifications dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <header
      style={{
        display: "flex",
        padding: "16px 26px",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid hsl(var(--border) / 0.7)",
        background: "hsl(var(--surface))",
        alignSelf: "stretch",
      }}
    >
      {/* Left Section - Search Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, maxWidth: 500 }}>
        {showSearch && (
          <div style={{ position: "relative", width: "100%", maxWidth: 400, minWidth: 200 }}>
            <Search
                style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "hsl(var(--muted-foreground))",
              }}
              size={20}
            />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              style={{
                paddingLeft: 40,
                background: "hsl(var(--secondary))",
                border: "none",
                borderRadius: 12,
                width: "100%",
              }}
            />
          </div>
        )}
      </div>

      {/* Right Section */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {/* Language Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div
            style={{
              width: 24,
              height: 16,
              borderRadius: 2,
              background: "linear-gradient(to bottom, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%)",
              border: "1px solid hsl(var(--border))",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 14 }}>English (US)</span>
          <ChevronDown size={16} />
        </div>

        {/* Message Icon */}
        <div
          style={{ position: "relative", cursor: "pointer" }}
          onClick={() => router.push("/chat")}
          title="Go to Messages"
        >
          <MessageSquare size={24} color="hsl(var(--muted-foreground))" />
          {/* Badge count can be added here if needed */}
        </div>

        {/* Notification Icon with Dropdown */}
        <div style={{ position: "relative" }} ref={notificationRef}>
          <div
            style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <Bell size={24} color="hsl(var(--muted-foreground))" />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  background: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  fontSize: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>

          {/* Notification Dropdown */}
          {showNotifications && (
            <Card
              style={{
                position: "absolute",
                top: 40,
                right: 0,
                width: 380,
                maxHeight: 500,
                overflowY: "auto",
                padding: 24,
                background: "hsl(var(--card))",
                borderRadius: 16,
                border: "1px solid hsl(var(--border))",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                zIndex: 1000,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Notifications</div>
              {notifications.length === 0 ? (
                <div style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", padding: "20px 0" }}>
                  No notifications
                </div>
              ) : (
                notifications.map((notification: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: 12,
                      marginBottom: 16,
                      paddingBottom: 16,
                      borderBottom: idx !== notifications.length - 1 ? "1px solid hsl(var(--border))" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: "hsl(var(--primary) / 0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "hsl(var(--primary-foreground))",
                        fontSize: 16,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {notification.user.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                        by {notification.user}
                      </div>
                      <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", wordWrap: "break-word" }}>
                        {notification.action}
                      </div>
                      <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>
                        {notification.time}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </Card>
          )}
        </div>

        {/* User Profile - Clickable to Settings */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          onClick={() => router.push("/admin/settings")}
          title="Go to Settings"
        >
          {currentUser?.avatar ? (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'hsl(var(--primary) / 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'hsl(var(--primary))',
                fontWeight: 600,
                fontSize: 16,
              }}
                background: "#D4CCFA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#8B7BE8",
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
            </div>
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{currentUser?.name || "User"}</div>
            <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
              {currentUser?.role === "admin" ? "Admin" : "User"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
