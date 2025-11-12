"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminSidebar from "@/components/adminSidebar";
import AdminHeader from "@/components/AdminHeader";
import {
  User,
  Crown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { userAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface UserData {
  _id: string;
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: string;
  provider: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const loadCurrentUser = useCallback(async () => {
    try {
      const user = await userAPI.getProfile();
      setCurrentUser(user);

      // Check if current user is admin
      if (user.role !== 'admin') {
        toast({
          title: "Access Denied",
          description: "You must be an admin to access this page",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = '/admin/home';
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error loading current user:', error);
      toast({
        title: "Authentication Error",
        description: "Please log in again",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadAllUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/admin/all`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const usersData = await response.json();
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Error Loading Users",
        description: error.message || "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const filterUsers = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user =>
      user.email.toLowerCase().includes(query) ||
      user.name?.toLowerCase().includes(query) ||
      user.firstName?.toLowerCase().includes(query) ||
      user.lastName?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  useEffect(() => {
    loadCurrentUser();
    loadAllUsers();
  }, [loadCurrentUser, loadAllUsers]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const handleAssignAdmin = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to make ${userName} an admin?`)) {
      return;
    }

    try {
      setActionLoading(userId);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/admin/assign/${userId}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to assign admin role');
      }

      toast({
        title: "Success",
        description: `${userName} is now an admin`,
      });

      // Refresh users list
      await loadAllUsers();
    } catch (error: any) {
      console.error('Error assigning admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign admin role",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAdmin = async (userId: string, userName: string) => {
    // Prevent revoking own admin
    if (currentUser?._id === userId) {
      toast({
        title: "Cannot Revoke",
        description: "You cannot revoke your own admin privileges",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to revoke admin privileges from ${userName}?`)) {
      return;
    }

    try {
      setActionLoading(userId);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/admin/revoke/${userId}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke admin role');
      }

      toast({
        title: "Success",
        description: `Admin privileges revoked from ${userName}`,
      });

      // Refresh users list
      await loadAllUsers();
    } catch (error: any) {
      console.error('Error revoking admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to revoke admin role",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getUserDisplayName = (user: UserData) => {
    if (user.name) return user.name;
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email.split('@')[0];
  };

  const getInitials = (user: UserData) => {
    const name = getUserDisplayName(user);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const adminCount = users.filter(u => u.role === 'admin').length;
  const regularUserCount = users.filter(u => u.role === 'user').length;

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#FFFFFF" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#8B7BE8" }} />
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
          currentUser={currentUser}
          searchPlaceholder="Search users..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: "32px",
          }}
        >
          {/* Page Title & Stats */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 600, color: "#000", marginBottom: 16 }}>
              User Management
            </h1>

            {/* Statistics Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 24 }}>
              <div
                style={{
                  background: "#FFF",
                  borderRadius: 12,
                  padding: "20px",
                  border: "1px solid #E5E5E5",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: "#E8E4FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User size={24} color="#8B7BE8" />
                  </div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>{users.length}</div>
                    <div style={{ fontSize: 14, color: "#999" }}>Total Users</div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#FFF",
                  borderRadius: 12,
                  padding: "20px",
                  border: "1px solid #E5E5E5",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: "#FFE8D9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Crown size={24} color="#FFB547" />
                  </div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>{adminCount}</div>
                    <div style={{ fontSize: 14, color: "#999" }}>Admins</div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#FFF",
                  borderRadius: 12,
                  padding: "20px",
                  border: "1px solid #E5E5E5",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: "#D9FFE8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User size={24} color="#4ECDC4" />
                  </div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>{regularUserCount}</div>
                    <div style={{ fontSize: 14, color: "#999" }}>Regular Users</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div
            style={{
              background: "#FFF",
              borderRadius: 16,
              padding: "24px",
              border: "1px solid #E5E5E5",
            }}
          >
            <div style={{ marginBottom: 20, fontSize: 18, fontWeight: 600, color: "#000" }}>
              All Users ({filteredUsers.length})
            </div>

            {filteredUsers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <AlertCircle size={48} color="#999" style={{ marginBottom: 16 }} />
                <p style={{ fontSize: 16, color: "#999" }}>
                  {searchQuery ? "No users found matching your search" : "No users available"}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #E5E5E5" }}>
                      <th style={{ textAlign: "left", padding: "12px", fontSize: 14, fontWeight: 600, color: "#666" }}>User</th>
                      <th style={{ textAlign: "left", padding: "12px", fontSize: 14, fontWeight: 600, color: "#666" }}>Email</th>
                      <th style={{ textAlign: "left", padding: "12px", fontSize: 14, fontWeight: 600, color: "#666" }}>Role</th>
                      <th style={{ textAlign: "left", padding: "12px", fontSize: 14, fontWeight: 600, color: "#666" }}>Provider</th>
                      <th style={{ textAlign: "left", padding: "12px", fontSize: 14, fontWeight: 600, color: "#666" }}>Joined</th>
                      <th style={{ textAlign: "center", padding: "12px", fontSize: 14, fontWeight: 600, color: "#666" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user._id} style={{ borderBottom: "1px solid #F0F0F0" }}>
                        {/* User */}
                        <td style={{ padding: "16px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {user.avatar ? (
                              <Image src={user.avatar} alt={getUserDisplayName(user)} width={40} height={40} style={{ borderRadius: 8 }} />
                            ) : (
                              <div style={{ width: 40, height: 40, borderRadius: 8, background: "#D4CCFA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#8B7BE8" }}>
                                {getInitials(user)}
                              </div>
                            )}
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: "#000" }}>
                                {getUserDisplayName(user)}
                                {currentUser?._id === user._id && (
                                  <span style={{ marginLeft: 8, fontSize: 12, color: "#8B7BE8" }}>(You)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td style={{ padding: "16px 12px" }}>
                          <div style={{ fontSize: 14, color: "#666" }}>{user.email}</div>
                        </td>

                        {/* Role */}
                        <td style={{ padding: "16px 12px" }}>
                          {user.role === 'admin' ? (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 6, background: "#FFE8D9", color: "#FFB547", fontSize: 12, fontWeight: 600 }}>
                              <Crown size={14} />
                              Admin
                            </div>
                          ) : (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 6, background: "#F0F0F0", color: "#666", fontSize: 12, fontWeight: 600 }}>
                              <User size={14} />
                              User
                            </div>
                          )}
                        </td>

                        {/* Provider */}
                        <td style={{ padding: "16px 12px" }}>
                          <div style={{ fontSize: 14, color: "#666", textTransform: "capitalize" }}>{user.provider}</div>
                        </td>

                        {/* Joined */}
                        <td style={{ padding: "16px 12px" }}>
                          <div style={{ fontSize: 14, color: "#666" }}>{formatDate(user.createdAt)}</div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "16px 12px", textAlign: "center" }}>
                          {actionLoading === user._id ? (
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#8B7BE8", margin: "0 auto" }} />
                          ) : user.role === 'admin' ? (
                            <button
                              onClick={() => handleRevokeAdmin(user._id, getUserDisplayName(user))}
                              disabled={currentUser?._id === user._id}
                              style={{
                                padding: "8px 16px",
                                borderRadius: 8,
                                border: "1px solid #FF6B6B",
                                background: "#FFF",
                                color: "#FF6B6B",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: currentUser?._id === user._id ? "not-allowed" : "pointer",
                                opacity: currentUser?._id === user._id ? 0.5 : 1,
                              }}
                            >
                              Revoke Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAssignAdmin(user._id, getUserDisplayName(user))}
                              style={{
                                padding: "8px 16px",
                                borderRadius: 8,
                                border: "none",
                                background: "#8B7BE8",
                                color: "#FFF",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Make Admin
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
