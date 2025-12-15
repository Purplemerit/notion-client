"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usersAPI, userAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EditProfileModal } from "@/components/EditProfileModal";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { ChangeEmailModal } from "@/components/ChangeEmailModal";
import { useToast } from "@/hooks/use-toast";
import {
  Edit3,
  User,
  Shield,
  Accessibility as AccessibilityIcon,
  Bell,
  Bot,
  Settings,
} from "lucide-react";

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
      className="cursor-pointer transition-all duration-200 hover:opacity-80 dark:hover:opacity-80"
      type="button"
    >
      {isChecked ? (
        <svg width="45" height="20" viewBox="0 0 45 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="45" height="20" rx="10" fill="hsl(var(--primary))"/>
          <rect x="25" y="1" width="18" height="18" rx="9" fill="white"/>
        </svg>
      ) : (
        <svg width="45" height="20" viewBox="0 0 45 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="45" height="20" rx="10" fill="hsl(var(--muted-foreground))"/>
          <rect x="2" y="1" width="18" height="18" rx="9" fill="white"/>
        </svg>
      )}
    </button>
  );
};

export default function SettingsPage() {
  const router = useRouter();
  const { theme, actualTheme, setTheme } = useTheme();
  const [currentView, setCurrentView] = useState("settings");
  const [activeSection, setActiveSection] = useState("profile");
  const [user, setUser] = useState<any>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load user and preferences
    usersAPI.getMe().then(setUser).catch(() => setUser(null));
    userAPI.getPreferences().then(setPreferences).catch(() => setPreferences(null));
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
      // Handle theme preference separately using ThemeContext
      if (key === 'theme') {
        await setTheme(value);
        toast({
          title: "Theme Updated",
          description: "Your theme preference has been saved",
        });
        return;
      }

      // Handle other preferences normally
      const updates = { [key]: value };
      const updatedPreferences = await userAPI.updatePreferences(updates);
      setPreferences(updatedPreferences);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await userAPI.changePassword(currentPassword, newPassword);
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleChangeEmail = async (newEmail: string, password: string) => {
    try {
      await userAPI.changeEmail(newEmail, password);
      // Refresh user data to show new email
      const updatedUser = await usersAPI.getMe();
      setUser(updatedUser);
      toast({
        title: "Success",
        description: "Email changed successfully. Please log in with your new email next time.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change email",
        variant: "destructive",
      });
      throw error;
    }
  };

  const settingsMenu = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "accessibility", label: "Accessibility", icon: AccessibilityIcon },
    { id: "notification", label: "Notification", icon: Bell },
    { id: "ai", label: "AI Settings", icon: Bot },
    // Admin panel button - only show for admin users
    ...(user?.role === 'admin' ? [{ id: "admin", label: "Admin Panel", icon: Settings }] : [])
  ];

  const handleViewChange = (view: string) => {
    setCurrentView(view);
  };

  const handleAdminPanelClick = () => {
    toast({
      title: "Redirecting to Admin Panel",
      description: "Taking you to the admin dashboard...",
    });
    router.push('/admin/home');
  };

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return (
          <div className="space-y-6">
            <div
              style={{ borderRadius: '12px', background: 'hsl(var(--card))' }}
              className={`p-6 border ${
                actualTheme === 'dark' 
                  ? 'bg-gray-900 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{user ? (user.name || user.email || "U").split(' ').map((n: string) => n[0]).join('') : "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className={`text-xl font-semibold ${
                      actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                    }`}>{user?.name || "-"}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={`text-sm ${
                        actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>{user?.role || "-"}</p>
                      {user?.role === 'admin' && (
                        <div className="flex items-center gap-1">
                          <span className={`w-1 h-1 rounded-full ${
                            actualTheme === 'dark' ? 'bg-gray-400' : 'bg-gray-500'
                          }`}></span>
                          <button
                            onClick={handleAdminPanelClick}
                            className={`text-xs bg-gradient-to-r from-primary to-purple-500 text-white px-2 py-1 rounded-full hover:opacity-90 transition-all duration-200 flex items-center gap-1 ${
                              actualTheme === 'dark' ? 'dark:from-primary dark:to-purple-600 dark:hover:opacity-80' : ''
                            }`}
                          >
                            <Settings size={10} />
                            Go to Admin Panel
                          </button>
                        </div>
                      )}
                    </div>
                    <p className={`text-sm ${
                      actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>{user?.location || "-"}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowEditProfile(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>

            <div
              style={{ borderRadius: '12px', background: 'hsl(var(--card))' }}
              className={`p-6 border ${
                actualTheme === 'dark' 
                  ? 'bg-gray-900 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${
                  actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>Personal Information</h2>
                <Button variant="outline" size="sm" onClick={() => setShowEditProfile(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label className={`text-sm font-medium ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>First name</Label>
                  <Input value={user?.firstName || "-"} className="mt-2" readOnly />
                </div>
                <div>
                  <Label className={`text-sm font-medium ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>Last name</Label>
                  <Input value={user?.lastName || "-"} className="mt-2" readOnly />
                </div>
                <div>
                  <Label className={`text-sm font-medium ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>Email Address</Label>
                  <Input value={user?.email || "-"} className="mt-2" readOnly />
                </div>
                <div>
                  <Label className={`text-sm font-medium ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>Phone</Label>
                  <Input value={user?.phone || "-"} className="mt-2" readOnly />
                </div>
                <div className="sm:col-span-2">
                  <Label className={`text-sm font-medium ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>Bio</Label>
                  <Input value={user?.bio || "-"} className="mt-2" readOnly />
                </div>
              </div>
            </div>

            <div
              style={{ borderRadius: '12px', background: 'hsl(var(--card))' }}
              className={`p-6 border ${
                actualTheme === 'dark' 
                  ? 'bg-gray-900 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${
                  actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>Location Details</h2>
                <Button variant="outline" size="sm" onClick={() => setShowEditProfile(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label className={`text-sm font-medium ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>Country</Label>
                  <p className={`text-sm mt-2 ${
                    actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>{user?.country || "-"}</p>
                </div>
                <div>
                  <Label className={`text-sm font-medium ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>City, State</Label>
                  <p className={`text-sm mt-2 ${
                    actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>{user?.cityState || user?.location || "-"}</p>
                </div>
                <div>
                  <Label className={`text-sm font-medium ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>Postal Code</Label>
                  <p className={`text-sm mt-2 ${
                    actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>{user?.postalCode || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <div
              style={{ borderRadius: '12px', background: 'hsl(var(--card))' }}
              className={`p-6 border ${
                actualTheme === 'dark' 
                  ? 'bg-gray-900 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <h2 className={`text-xl font-semibold mb-2 ${
                actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}>Account Security</h2>
              <p className={`text-sm mb-6 ${
                actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Set up security measures for better protection</p>

              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium ${
                      actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                    }`}>Email</h3>
                    <p className={`text-sm truncate ${
                      actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>{user?.email || "-"}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowChangeEmail(true)} className="w-full sm:w-auto">
                    Change email
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <h3 className={`font-medium ${
                      actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                    }`}>Password</h3>
                    <p className={`text-sm ${
                      actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>Change your password to keep your account secure</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowChangePassword(true)} className="w-full sm:w-auto">
                    Change password
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <h3 className={`font-medium ${
                      actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                    }`}>2-Step verification</h3>
                    <p className={`text-sm ${
                      actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>An extra layer of protection to your account during log in</p>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    <Badge variant="secondary">Enabled</Badge>
                    <Button variant="outline" size="sm">Change Method</Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <h3 className={`font-medium ${
                      actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                    }`}>Recovery codes</h3>
                    <p className={`text-sm ${
                      actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>Generated Oct 10, 2025</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    Regenerate Codes
                  </Button>
                </div>
              </div>
            </div>

            <div
              style={{ borderRadius: '12px', background: 'hsl(var(--card))' }}
              className={`p-6 border ${
                actualTheme === 'dark' 
                  ? 'bg-gray-900 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <h2 className={`text-xl font-semibold mb-2 ${
                actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}>Recovery Settings</h2>
              <p className={`text-sm mb-6 ${
                actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Keep your recovery methods ready</p>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-medium ${
                      actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                    }`}>Recovery Email</h3>
                    <p className={`text-sm ${
                      actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>Setup Recovery Email To Secure Your Account</p>
                  </div>
                  <Button size="sm">Save</Button>
                </div>

                <div>
                  <Label className={`text-sm font-medium ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>Another Email Address</Label>
                  <Input placeholder="recovery@example.com" className="mt-2" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-medium ${
                      actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                    }`}>Recovery Phone Number</h3>
                    <p className={`text-sm ${
                      actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>Add Phone Number To Setup SMS Recovery For Your Account</p>
                  </div>
                  <Button variant="outline" size="sm">Setup</Button>
                </div>
              </div>
            </div>
          </div>
        );

      case "accessibility":
        return (
          <div className="space-y-6">
            <div
              style={{ borderRadius: '12px', background: 'hsl(var(--card))' }}
              className={`p-6 border ${
                actualTheme === 'dark' 
                  ? 'bg-gray-900 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <h2 className={`text-xl font-semibold mb-2 ${
                actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}>Language</h2>
              <p className={`text-sm mb-6 ${
                actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Make The Platform Easy And Comfortable To Use For Everyone</p>

              <div className="space-y-6">
                <div>
                  <Label className={`text-sm font-medium ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>Interface Language</Label>
                  <Select
                    value={preferences?.language || "english"}
                    onValueChange={(value) => handleUpdatePreference('language', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className={`text-sm font-medium ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>Font Size</Label>
                  <Select
                    value={preferences?.fontSize || "medium"}
                    onValueChange={(value) => handleUpdatePreference('fontSize', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className={`text-sm font-medium ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>Theme</Label>
                  <Select
                    value={theme}
                    onValueChange={(value) => handleUpdatePreference('theme', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
                      <SelectItem value="light">Light Mode</SelectItem>
                      <SelectItem value="dark">Dark Mode</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h3 className={`font-medium mb-4 ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>Caption Preferences</h3>
                  <div>
                    <Label className={`text-sm font-medium ${
                      actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                    }`}>Caption Language</Label>
                    <Select
                      value={preferences?.captionLanguage || "english"}
                      onValueChange={(value) => handleUpdatePreference('captionLanguage', value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="spanish">Spanish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 mt-4">
                    <Checkbox
                      id="captions"
                      checked={preferences?.enableCaptions || false}
                      onCheckedChange={(checked) => handleUpdatePreference('enableCaptions', checked)}
                    />
                    <Label htmlFor="captions" className={`text-sm ${
                      actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      Enable AI Live Captions (For Calls / Meetings)
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "notification":
        return (
          <div className="space-y-6">
            <div
              style={{ borderRadius: '12px', background: 'hsl(var(--card))' }}
              className={`p-6 border ${
                actualTheme === 'dark' 
                  ? 'bg-gray-900 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <h2 className={`text-xl font-semibold mb-2 ${
                actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}>Notifications</h2>
              <p className={`text-sm mb-6 ${
                actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Customize How You Can Stay Informed Across TaskHub</p>

              <div className="space-y-6">
                <div>
                  <h3 className={`font-medium mb-4 ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>Notification Types</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>Chat Notifications</span>
                      <SvgSwitch
                        checked={preferences?.notificationTypes?.chatNotifications ?? true}
                        onCheckedChange={(checked) => handleUpdatePreference('notificationTypes', {
                          ...preferences?.notificationTypes,
                          chatNotifications: checked
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>Meeting Invites</span>
                      <SvgSwitch
                        checked={preferences?.notificationTypes?.meetingInvites ?? true}
                        onCheckedChange={(checked) => handleUpdatePreference('notificationTypes', {
                          ...preferences?.notificationTypes,
                          meetingInvites: checked
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>Task Updates</span>
                      <SvgSwitch
                        checked={preferences?.notificationTypes?.taskUpdates ?? true}
                        onCheckedChange={(checked) => handleUpdatePreference('notificationTypes', {
                          ...preferences?.notificationTypes,
                          taskUpdates: checked
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>Calendar Changes</span>
                      <SvgSwitch
                        checked={preferences?.notificationTypes?.calendarChanges ?? false}
                        onCheckedChange={(checked) => handleUpdatePreference('notificationTypes', {
                          ...preferences?.notificationTypes,
                          calendarChanges: checked
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className={`font-medium mb-4 ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>Notification Channels</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>Email</span>
                      <SvgSwitch
                        checked={preferences?.notificationChannels?.email ?? true}
                        onCheckedChange={(checked) => handleUpdatePreference('notificationChannels', {
                          ...preferences?.notificationChannels,
                          email: checked
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>In-App</span>
                      <SvgSwitch
                        checked={preferences?.notificationChannels?.inApp ?? true}
                        onCheckedChange={(checked) => handleUpdatePreference('notificationChannels', {
                          ...preferences?.notificationChannels,
                          inApp: checked
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>Push Notifications</span>
                      <SvgSwitch
                        checked={preferences?.notificationChannels?.push ?? false}
                        onCheckedChange={(checked) => handleUpdatePreference('notificationChannels', {
                          ...preferences?.notificationChannels,
                          push: checked
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className={`font-medium mb-4 ${
                    actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>Frequency</h3>
                  <Select
                    value={preferences?.notificationFrequency || "realtime"}
                    onValueChange={(value) => handleUpdatePreference('notificationFrequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
                      <SelectItem value="realtime">Real-Time</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case "ai":
        return (
          <div className="space-y-6 h-full flex flex-col">
            <div
              style={{ borderRadius: '12px', background: 'hsl(var(--card))' }}
              className={`p-6 flex-1 border ${
                actualTheme === 'dark' 
                  ? 'bg-gray-900 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <h2 className={`text-xl font-semibold mb-6 ${
                actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}>AI Settings</h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className={actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>Enable Automatic Summaries</span>
                  <SvgSwitch
                    checked={preferences?.enableAutoSummaries ?? true}
                    onCheckedChange={(checked) => handleUpdatePreference('enableAutoSummaries', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>Smart Suggestions In Chat</span>
                  <SvgSwitch
                    checked={preferences?.enableSmartSuggestions ?? true}
                    onCheckedChange={(checked) => handleUpdatePreference('enableSmartSuggestions', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>AI Voice Detection For Translations</span>
                  <SvgSwitch
                    checked={preferences?.enableVoiceDetection ?? true}
                    onCheckedChange={(checked) => handleUpdatePreference('enableVoiceDetection', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>Language For Captions/Translation</span>
                  <SvgSwitch
                    checked={preferences?.enableLanguageTranslation ?? true}
                    onCheckedChange={(checked) => handleUpdatePreference('enableLanguageTranslation', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>AI Task Prioritization</span>
                  <SvgSwitch
                    checked={preferences?.enableTaskPrioritization ?? true}
                    onCheckedChange={(checked) => handleUpdatePreference('enableTaskPrioritization', checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`flex min-h-screen w-full ${
      actualTheme === 'dark' ? 'bg-gray-950' : 'bg-white'
    }`}>
      <Sidebar currentView={currentView} onViewChange={handleViewChange} />

      <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8">
        {/* Main Heading Section */}
        <div className="flex flex-col items-start gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className={`text-2xl sm:text-3xl font-semibold ${
            actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
          }`}>
            {activeSection === "profile" && "Account Settings"}
            {activeSection === "security" && "Security"}
            {activeSection === "accessibility" && "Accessibility"}
            {activeSection === "notification" && "Notifications"}
            {activeSection === "ai" && "AI Settings"}
          </h1>
          <p className={`text-sm sm:text-base ${
            actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {activeSection === "profile" && "Manage your personal details and preferences."}
            {activeSection === "security" && "Protect your account with advanced security options."}
            {activeSection === "accessibility" && "Customize language and accessibility for your needs."}
            {activeSection === "notification" && "Control how and when you get updates."}
            {activeSection === "ai" && "Personalize your AI experience and features."}
          </p>
        </div>

        {/* Body Section - Responsive flex layout */}
        <div className="flex flex-col lg:flex-row items-stretch gap-4 sm:gap-6 lg:gap-8 flex-1">
          {/* Settings Sidebar */}
          <div className={`w-full lg:w-64 lg:flex-shrink-0 h-full p-4 sm:p-6 rounded-xl border flex flex-col ${
            actualTheme === 'dark' 
              ? 'bg-gray-900 border-gray-700' 
              : 'bg-white border-gray-300'
          }`}>
            <div className="space-y-2">
              {settingsMenu.map((item) => (
                <Button
                  key={item.id}
                  variant={activeSection === item.id ? "default" : "ghost"}
                  className={`w-full justify-start h-12 ${
                    activeSection === item.id
                      ? actualTheme === 'dark'
                        ? "bg-[#3E3B5C] text-[#C4B5FD] hover:bg-[#3E3B5C]"
                        : "bg-[#E8E3FF] text-[#7C3AED] hover:bg-[#E8E3FF]"
                      : actualTheme === 'dark'
                        ? "text-gray-100 hover:bg-gray-800"
                        : "text-gray-900 hover:bg-gray-100"
                  } ${item.id === "admin" ? `border border-primary bg-gradient-to-r from-primary to-purple-500 text-white hover:opacity-90 ${actualTheme === 'dark' ? 'dark:from-primary dark:to-purple-600 dark:hover:opacity-80' : ''}` : ""}`}
                  onClick={() => {
                    if (item.id === "admin") {
                      handleAdminPanelClick();
                    } else {
                      setActiveSection(item.id);
                    }
                  }}
                >
                  <item.icon size={18} className="mr-3" />
                  <span>{item.label}</span>
                  {item.id === "admin" && (
                    <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded-full">
                      Admin
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        user={user}
        onSave={handleSaveProfile}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSave={handleChangePassword}
      />

      {/* Change Email Modal */}
      <ChangeEmailModal
        isOpen={showChangeEmail}
        onClose={() => setShowChangeEmail(false)}
        onSave={handleChangeEmail}
        currentEmail={user?.email}
      />
    </div>
  );
}
