"use client";

import { useState, useEffect } from "react";
import { usersAPI, userAPI } from "@/lib/api";
import AdminSidebar from "@/components/adminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EditProfileModal } from "@/components/EditProfileModal";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { ChangeEmailModal } from "@/components/ChangeEmailModal";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Custom SVG Switch Component
const SvgSwitch = ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void }) => {
  const [isChecked, setIsChecked] = useState(checked || false);

  const handleClick = () => {
    const newValue = !isChecked;
    setIsChecked(newValue);
    onCheckedChange?.(newValue);
  };

  return (
    <button
      onClick={handleClick}
      className="cursor-pointer transition-all duration-200 hover:opacity-80"
      type="button"
    >
      {isChecked ? (
        <svg width="45" height="20" viewBox="0 0 45 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="45" height="20" rx="10" fill="#846BD2"/>
          <rect x="25" y="1" width="18" height="18" rx="9" fill="white"/>
        </svg>
      ) : (
        <svg width="45" height="20" viewBox="0 0 45 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="45" height="20" rx="10" fill="#BDBDBD"/>
          <rect x="2" y="1" width="18" height="18" rx="9" fill="white"/>
        </svg>
      )}
    </button>
  );
};

export default function AdminSettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load user and preferences
    const loadData = async () => {
      try {
        const [userData, prefsData] = await Promise.all([
          usersAPI.getMe().catch(() => null),
          userAPI.getPreferences().catch(() => null)
        ]);
        setUser(userData);
        setPreferences(prefsData);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSaveProfile = async (updates: any) => {
    if (!user) return;

    try {
      const updatedUser = await usersAPI.update(user._id || user.id, updates);
      setUser(updatedUser);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePreference = async (key: string, value: any) => {
    try {
      const updates = { [key]: value };
      const updatedPreferences = await userAPI.updatePreferences(updates);
      setPreferences(updatedPreferences);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update preference",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#FFFFFF" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#8B7BE8" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#FAFAFA" }}>
      <div style={{ flexShrink: 0, height: "100vh" }}>
        <AdminSidebar />
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
        {/* Header */}
        <AdminHeader
          currentUser={user}
          searchPlaceholder="Search settings..."
        />

        {/* Main Content */}
        <main style={{ flex: 1, overflow: "auto", padding: "32px 40px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, color: "#1A1A1A" }}>Settings</h1>
            <p style={{ fontSize: 14, color: "#666", marginBottom: 32 }}>Manage your admin account settings and preferences</p>

            {/* Tab Navigation */}
            <div style={{ display: "flex", gap: 24, borderBottom: "2px solid #E5E5E5", marginBottom: 32 }}>
              {["profile", "security", "accessibility", "notifications", "ai"].map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  style={{
                    padding: "12px 0",
                    fontSize: 14,
                    fontWeight: activeSection === section ? 600 : 400,
                    color: activeSection === section ? "#8B7BE8" : "#666",
                    borderBottom: activeSection === section ? "2px solid #8B7BE8" : "none",
                    marginBottom: "-2px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {section}
                </button>
              ))}
            </div>

            {/* Profile Section */}
            {activeSection === "profile" && (
              <div style={{ background: "#FFF", borderRadius: 16, padding: 24, border: "1px solid #E1DEF6" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Profile Information</h2>
                    <p style={{ fontSize: 14, color: "#666" }}>Update your admin account profile</p>
                  </div>
                  <Button onClick={() => setShowEditProfile(true)} variant="outline" style={{ borderColor: "#8B7BE8", color: "#8B7BE8" }}>
                    Edit Profile
                  </Button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 24 }}>
                  <Avatar style={{ width: 80, height: 80 }}>
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback style={{ background: "#D4CCFA", color: "#8B7BE8", fontSize: 32 }}>
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600 }}>{user?.name || "Admin User"}</h3>
                    <p style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>{user?.email}</p>
                    <Badge style={{ background: "#E8E4FF", color: "#8B7BE8" }}>{user?.role === 'admin' ? 'Administrator' : 'User'}</Badge>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <Label style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>First Name</Label>
                    <Input value={user?.firstName || ""} disabled style={{ background: "#F5F5FF" }} />
                  </div>
                  <div>
                    <Label style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>Last Name</Label>
                    <Input value={user?.lastName || ""} disabled style={{ background: "#F5F5FF" }} />
                  </div>
                  <div>
                    <Label style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>Phone</Label>
                    <Input value={user?.phone || ""} disabled style={{ background: "#F5F5FF" }} />
                  </div>
                  <div>
                    <Label style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>Bio</Label>
                    <Input value={user?.bio || ""} disabled style={{ background: "#F5F5FF" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === "security" && (
              <div style={{ background: "#FFF", borderRadius: 16, padding: 24, border: "1px solid #E1DEF6" }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Security Settings</h2>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, background: "#F5F5FF", borderRadius: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Email Address</h3>
                      <p style={{ fontSize: 14, color: "#666" }}>{user?.email}</p>
                    </div>
                    <Button onClick={() => setShowChangeEmail(true)} variant="outline" size="sm">Change Email</Button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, background: "#F5F5FF", borderRadius: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Password</h3>
                      <p style={{ fontSize: 14, color: "#666" }}>••••••••</p>
                    </div>
                    <Button onClick={() => setShowChangePassword(true)} variant="outline" size="sm">Change Password</Button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, background: "#F5F5FF", borderRadius: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Two-Factor Authentication</h3>
                      <p style={{ fontSize: 14, color: "#666" }}>
                        {user?.twoFactorEnabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                    <Badge style={{ background: user?.twoFactorEnabled ? "#C3F5CE" : "#FFE5E5", color: user?.twoFactorEnabled ? "#0A6C24" : "#D32F2F" }}>
                      {user?.twoFactorEnabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Accessibility Section */}
            {activeSection === "accessibility" && (
              <div style={{ background: "#FFF", borderRadius: 16, padding: 24, border: "1px solid #E1DEF6" }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Accessibility</h2>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Language</h3>
                      <p style={{ fontSize: 14, color: "#666" }}>Choose your preferred language</p>
                    </div>
                    <Select
                      value={preferences?.language || "en"}
                      onValueChange={(value) => handleUpdatePreference("language", value)}
                    >
                      <SelectTrigger style={{ width: 200 }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Font Size</h3>
                      <p style={{ fontSize: 14, color: "#666" }}>Adjust text size for better readability</p>
                    </div>
                    <Select
                      value={preferences?.fontSize || "medium"}
                      onValueChange={(value) => handleUpdatePreference("fontSize", value)}
                    >
                      <SelectTrigger style={{ width: 200 }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Theme</h3>
                      <p style={{ fontSize: 14, color: "#666" }}>Choose your preferred theme</p>
                    </div>
                    <Select
                      value={preferences?.theme || "light"}
                      onValueChange={(value) => handleUpdatePreference("theme", value)}
                    >
                      <SelectTrigger style={{ width: 200 }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Enable Captions</h3>
                      <p style={{ fontSize: 14, color: "#666" }}>Show captions in meetings</p>
                    </div>
                    <SvgSwitch
                      checked={preferences?.enableCaptions || false}
                      onCheckedChange={(value) => handleUpdatePreference("enableCaptions", value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === "notifications" && (
              <div style={{ background: "#FFF", borderRadius: 16, padding: 24, border: "1px solid #E1DEF6" }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Notification Preferences</h2>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Notification Types</h3>
                    {["chatNotifications", "meetingInvites", "taskUpdates", "calendarChanges"].map((type) => (
                      <div key={type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12 }}>
                        <span style={{ fontSize: 14, textTransform: "capitalize" }}>
                          {type.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <SvgSwitch
                          checked={preferences?.notificationTypes?.[type] || false}
                          onCheckedChange={(value) =>
                            handleUpdatePreference("notificationTypes", {
                              ...preferences?.notificationTypes,
                              [type]: value
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Notification Channels</h3>
                    {["email", "inApp", "push"].map((channel) => (
                      <div key={channel} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12 }}>
                        <span style={{ fontSize: 14, textTransform: "capitalize" }}>
                          {channel.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <SvgSwitch
                          checked={preferences?.notificationChannels?.[channel] || false}
                          onCheckedChange={(value) =>
                            handleUpdatePreference("notificationChannels", {
                              ...preferences?.notificationChannels,
                              [channel]: value
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AI Settings Section */}
            {activeSection === "ai" && (
              <div style={{ background: "#FFF", borderRadius: 16, padding: 24, border: "1px solid #E1DEF6" }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>AI Features</h2>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {[
                    { key: "enableAutoSummaries", label: "Automatic Summaries", desc: "AI-generated meeting summaries" },
                    { key: "enableSmartSuggestions", label: "Smart Suggestions", desc: "Get AI-powered suggestions in chat" },
                    { key: "enableVoiceDetection", label: "Voice Detection", desc: "Auto-detect language for translation" },
                    { key: "enableLanguageTranslation", label: "Language Translation", desc: "Real-time translation in meetings" },
                    { key: "enableTaskPrioritization", label: "Task Prioritization", desc: "AI helps prioritize your tasks" },
                  ].map((setting) => (
                    <div key={setting.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{setting.label}</h3>
                        <p style={{ fontSize: 14, color: "#666" }}>{setting.desc}</p>
                      </div>
                      <SvgSwitch
                        checked={preferences?.[setting.key] || false}
                        onCheckedChange={(value) => handleUpdatePreference(setting.key, value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        user={user}
        onSave={handleSaveProfile}
      />

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSave={async (currentPassword: string, newPassword: string) => {
          try {
            await userAPI.changePassword(currentPassword, newPassword);
            setShowChangePassword(false);
            toast({
              title: "Password Changed",
              description: "Your password has been changed successfully",
            });
          } catch (error: any) {
            toast({
              title: "Error",
              description: error.message || "Failed to change password",
              variant: "destructive",
            });
            throw error;
          }
        }}
      />

      <ChangeEmailModal
        isOpen={showChangeEmail}
        onClose={() => setShowChangeEmail(false)}
        currentEmail={user?.email}
        onSave={async (newEmail: string, password: string) => {
          try {
            await userAPI.changeEmail(newEmail, password);
            setShowChangeEmail(false);
            setUser({ ...user, email: newEmail });
            toast({
              title: "Email Changed",
              description: "Your email has been changed successfully",
            });
          } catch (error: any) {
            toast({
              title: "Error",
              description: error.message || "Failed to change email",
              variant: "destructive",
            });
            throw error;
          }
        }}
      />
    </div>
  );
}
