"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/adminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { ShoppingBag, FileText, Rocket, Users, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { dashboardAPI, userAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function AdminHomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Activity");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const selectedYear = new Date().getFullYear();
  const [stats, setStats] = useState({
    projects: 0,
    documents: 0,
    tasks: 0,
    teams: 0,
    totalUsers: 0,
    newUsers: 0,
    growthPercentage: 0,
  });
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>(
    // Initialize with 12 months of data
    Array.from({ length: 12 }, (_, i) => ({
      month: new Date(new Date().getFullYear(), i).toLocaleString('default', { month: 'short' }),
      value: 10,
      rawValue: 0,
    }))
  );
  const { toast } = useToast();

  const loadMonthSpecificData = useCallback(async () => {
    try {
      // Fetch stats and activities for the selected month
      const [statsData, activitiesData] = await Promise.all([
        dashboardAPI.getStats({ month: selectedMonth, year: selectedYear }).catch((err) => {
          console.error('Error loading stats:', err);
          return null;
        }),
        dashboardAPI.getRecentActivities({ limit: 10, month: selectedMonth, year: selectedYear }).catch((err) => {
          console.error('Error loading activities:', err);
          return [];
        }),
      ]);

      if (statsData) {
        setStats({
          projects: statsData.monthly?.projects || 0,
          documents: statsData.monthly?.documents || 0,
          tasks: statsData.monthly?.tasks || 0,
          teams: statsData.monthly?.teams || 0,
          totalUsers: statsData.total?.users || 0,
          newUsers: statsData.users?.newThisMonth || 0,
          growthPercentage: statsData.users?.growthPercentage || 0,
        });
      } else {
        // Keep existing stats or set to 0
        setStats({
          projects: 0,
          documents: 0,
          tasks: 0,
          teams: 0,
          totalUsers: 0,
          newUsers: 0,
          growthPercentage: 0,
        });
      }

      setRecentActivities(activitiesData || []);
    } catch (error: any) {
      console.error('Error loading month-specific data:', error);
    }
  }, [selectedMonth, selectedYear]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch initial data in parallel
      const [userData, monthlyActivity] = await Promise.all([
        userAPI.getProfile().catch((err) => {
          console.error('Error loading user profile:', err);
          return null;
        }),
        dashboardAPI.getMonthlyActivity(selectedYear).catch((err) => {
          console.error('Error loading monthly activity:', err);
          // Return empty array with month names as fallback
          return Array.from({ length: 12 }, (_, i) => ({
            month: i,
            monthName: new Date(selectedYear, i).toLocaleString('default', { month: 'short' }),
            total: 0,
          }));
        }),
      ]);

      // Fetch real users from admin endpoint
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const response = await fetch(`${API_URL}/users/admin/all`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const users = await response.json();
          if (Array.isArray(users)) {
            // Map users to a consistent format
            const formattedUsers = users.slice(0, 10).map((user: any) => ({
              _id: user._id || user.id,
              name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
              email: user.email,
              avatar: user.avatar || user.avatarUrl,
            }));
            setTeamMembers(formattedUsers);
          } else {
            setTeamMembers([]);
          }
        } else {
          console.error('Failed to fetch users:', response.statusText);
          setTeamMembers([]);
        }
      } catch (err) {
        console.error('Error loading users:', err);
        setTeamMembers([]);
      }

      setCurrentUser(userData);

      // Process monthly activity data and normalize to percentage
      if (monthlyActivity && Array.isArray(monthlyActivity) && monthlyActivity.length > 0) {
        const maxValue = Math.max(...monthlyActivity.map((item: any) => item.total || 0), 1);
        
        const processedMonthlyData = monthlyActivity.map((item: any) => {
          const rawValue = item.total || 0;
          // Calculate percentage relative to max value
          let displayValue;
          if (rawValue === 0) {
            displayValue = 10; // Minimum for empty months
          } else if (rawValue === maxValue) {
            displayValue = 100; // Maximum height for highest value
          } else {
            // Scale between 20% and 100% based on the ratio
            displayValue = Math.max(20, Math.round((rawValue / maxValue) * 100));
          }
          
          return {
            month: item.monthName || new Date(selectedYear, item.month).toLocaleString('default', { month: 'short' }),
            value: displayValue,
            rawValue: rawValue,
          };
        });
        
        setMonthlyData(processedMonthlyData);
      } else {
        // Fallback: Create empty data for all months
        const fallbackData = Array.from({ length: 12 }, (_, i) => ({
          month: new Date(selectedYear, i).toLocaleString('default', { month: 'short' }),
          value: 10, // Minimum visible height for empty state
          rawValue: 0,
        }));
        setMonthlyData(fallbackData);
      }

      // Load month-specific data
      await loadMonthSpecificData();

    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error Loading Dashboard",
        description: error.response?.data?.message || error.message || "Failed to load dashboard data. Please check your connection and try again.",
        variant: "destructive",
      });

      // Set fallback data
      setMonthlyData(Array.from({ length: 12 }, (_, i) => ({
        month: new Date(selectedYear, i).toLocaleString('default', { month: 'short' }),
        value: 10,
        rawValue: 0,
      })));
    } finally {
      setLoading(false);
    }
  }, [selectedYear, toast, loadMonthSpecificData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    // Reload data when month changes
    loadMonthSpecificData();
  }, [loadMonthSpecificData]);

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const statsData = [
    { icon: ShoppingBag, label: "Projects", value: stats.projects.toString(), color: "#8B7BE8" },
    { icon: FileText, label: "Research", value: stats.documents.toString(), color: "#FFB547" },
    { icon: Rocket, label: "Deploy", value: stats.tasks.toString(), color: "#FF6B6B" },
    { icon: Users, label: "Employees", value: stats.totalUsers.toString(), color: "#4ECDC4" },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#FFFFFF" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#8B7BE8" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#FAFAFA" }}>
      {/* Sidebar */}
      <div style={{ flexShrink: 0, height: "100vh" }}>
        <AdminSidebar />
      </div>

      {/* Main Content */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
        {/* Header */}
        <AdminHeader
          currentUser={currentUser}
          searchPlaceholder="Search here..."
        />

        {/* Main Scrollable Content */}
        <main
          style={{
            display: "flex",
            flex: 1,
            overflow: "auto",
            scrollBehavior: "smooth",
            background: "#FAFAFA",
            padding: "32px 40px",
            gap: 32,
          }}
        >
          {/* Main Section */}
          <section
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              gap: 24,
            }}
          >
            <h1 style={{ fontSize: 48, fontWeight: 700, color: "#000", marginBottom: 0, letterSpacing: "-0.02em" }}>Dashboard</h1>

            {/* Dashboard Content Grid - Left Stats + Right Chart */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 600px", gap: 24 }}>
              {/* Left Side - Stats Cards (2x2 Grid) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, alignContent: "start" }}>
                {statsData.map((stat, idx) => (
                  <Card key={idx} style={{ 
                    padding: "28px 32px", 
                    background: "#FFF", 
                    borderRadius: 20, 
                    border: "1px solid #E8E8E8",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    minHeight: "120px",
                    display: "flex",
                    alignItems: "center"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 18, width: "100%" }}>
                      <div style={{ 
                        width: 52, 
                        height: 52, 
                        borderRadius: 12, 
                        background: `${stat.color}15`, 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <stat.icon size={28} color={stat.color} strokeWidth={2} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, color: "#666", marginBottom: 8, fontWeight: 500 }}>{stat.label}</div>
                        <div style={{ fontSize: 36, fontWeight: 700, color: "#000", lineHeight: 1 }}>{stat.value}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Right Side - Monthly Active Users Chart */}
              <Card style={{ 
                padding: "32px 36px", 
                background: "#FFF", 
                borderRadius: 20, 
                border: "1px solid #E8E8E8",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                display: "flex",
                flexDirection: "column"
              }}> 
                {/* Title and Number at the top */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 20, color: "#8B8B8B", fontWeight: 500 }}>Monthly Active Users</div>
                  <div style={{ fontSize: 42, fontWeight: 700, color: "#000", lineHeight: 1 }}>
                    {stats.totalUsers.toLocaleString()}
                  </div>
                </div>
                
                {/* Graph below - Dynamic based on monthly data */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="100%" height="140" viewBox="0 0 520 140" preserveAspectRatio="none" style={{ display: "block" }}>
                    <defs>
                      {/* Gradient for the fill area */}
                      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#C7BBFF", stopOpacity: 0.4 }} />
                        <stop offset="100%" style={{ stopColor: "#E8E3FF", stopOpacity: 0.1 }} />
                      </linearGradient>
                    </defs>
                    
                    {(() => {
                      // Generate dynamic path based on monthly data
                      const maxValue = Math.max(...monthlyData.map(d => d.rawValue), 1);
                      const width = 520;
                      const height = 140;
                      const segmentWidth = width / (monthlyData.length - 1);
                      
                      // Calculate Y positions (inverted because SVG Y increases downward)
                      const points = monthlyData.map((item, idx) => {
                        const x = idx * segmentWidth;
                        const normalizedValue = item.rawValue / maxValue;
                        const y = height - (normalizedValue * (height * 0.7)) - 20; // Scale to 70% of height, offset from bottom
                        return { x, y };
                      });
                      
                      // Create smooth curve path using quadratic bezier curves
                      let pathD = `M ${points[0].x} ${points[0].y}`;
                      for (let i = 0; i < points.length - 1; i++) {
                        const currentPoint = points[i];
                        const nextPoint = points[i + 1];
                        const controlX = (currentPoint.x + nextPoint.x) / 2;
                        pathD += ` Q ${controlX} ${currentPoint.y}, ${nextPoint.x} ${nextPoint.y}`;
                      }
                      
                      // Create filled area path
                      const filledPathD = pathD + ` L ${points[points.length - 1].x} ${height} L 0 ${height} Z`;
                      
                      // Find the highest point for the highlight dot
                      const highestPointIndex = monthlyData.reduce((maxIdx, item, idx, arr) => 
                        item.rawValue > arr[maxIdx].rawValue ? idx : maxIdx, 0
                      );
                      const highlightPoint = points[highestPointIndex];
                      
                      return (
                        <>
                          {/* Filled area under the curve */}
                          <path d={filledPathD} fill="url(#areaGradient)" />
                          
                          {/* Wave line */}
                          <path 
                            d={pathD}
                            stroke="#7B68EE" 
                            strokeWidth="3" 
                            fill="none" 
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* Highlight dot at highest point */}
                          <circle 
                            cx={highlightPoint.x} 
                            cy={highlightPoint.y} 
                            r="6" 
                            fill="#7B68EE" 
                            stroke="#FFF" 
                            strokeWidth="2" 
                          />
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </Card>
            </div>

            {/* Account Stats and Bar Chart - Full Width Below */}
            <Card style={{ 
              padding: "32px", 
              background: "#FFF", 
              borderRadius: 20, 
              border: "1px solid #E8E8E8",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
            }}>
              {/* Stats Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, marginBottom: 32 }}>
                <div>
                  <div style={{ fontSize: 14, color: "#999", marginBottom: 8, fontWeight: 500 }}>Account&apos;s</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#000" }}>{stats.totalUsers.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, color: "#999", marginBottom: 8, fontWeight: 500 }}>New User</div>
                  <div style={{ fontSize: 32, fontWeight: 700, display: "flex", alignItems: "center", gap: 12, color: "#000" }}>
                    {stats.newUsers}
                    {stats.growthPercentage !== 0 && (
                      <span style={{ width: 32, height: 32, borderRadius: "50%", background: stats.growthPercentage > 0 ? "#4ECDC4" : "#FF6B6B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "white", fontWeight: 700 }}>
                        {stats.growthPercentage > 0 ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 14, color: "#999", marginBottom: 8, fontWeight: 500 }}>Growth</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: stats.growthPercentage >= 0 ? "#4ECDC4" : "#FF6B6B" }}>
                    {stats.growthPercentage > 0 ? '+' : ''}{stats.growthPercentage}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 14, color: "#999", marginBottom: 8, fontWeight: 500 }}>Period</div>
                  <div style={{ fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, color: "#000", cursor: "pointer" }}>
                    Month <ChevronDown size={22} color="#666" />
                  </div>
                </div>
              </div>

              {/* Bar Chart */}
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8, height: 220, paddingBottom: 10 }}>
                {monthlyData.map((item, idx) => {
                  return (
                    <div 
                      key={idx} 
                      style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%", cursor: "pointer" }}
                      onClick={() => setSelectedMonth(idx)}
                      title={`${item.month}: ${item.rawValue} activities`}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: `${item.value}%`,
                          background: idx === selectedMonth ? "#4A3F8F" : "#E3DEFF",
                          borderRadius: "12px 12px 0 0",
                          transition: "all 0.3s ease",
                          marginBottom: "8px",
                          minHeight: "10px"
                        }}
                        onMouseEnter={(e) => {
                          if (idx !== selectedMonth) {
                            e.currentTarget.style.opacity = "0.8";
                            e.currentTarget.style.transform = "translateY(-4px)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      />
                      <div style={{ fontSize: 14, color: idx === selectedMonth ? "#4A3F8F" : "#666", fontWeight: idx === selectedMonth ? 600 : 500 }}>{item.month}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Bottom Section */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* User Profile */}
              <Card style={{ padding: 24, background: "#FFF", borderRadius: 16, border: "1px solid #E1DEF6" }}>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>User Profile</div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <svg width="200" height="200" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" fill="#E8E4FF" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#8B7BE8" strokeWidth="20" strokeDasharray="251 502" transform="rotate(-90 100 100)" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#B8A8F5" strokeWidth="20" strokeDasharray="157 502" transform="rotate(90 100 100)" />
                    <circle cx="100" cy="100" r="50" fill="#FFF" />
                  </svg>
                </div>
              </Card>

              {/* Statistics */}
              <Card style={{ padding: 24, background: "#FFF", borderRadius: 16, border: "1px solid #E1DEF6" }}>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>Statistic</div>
                <svg width="100%" height="200" viewBox="0 0 400 200">
                  <path d="M 0 150 L 50 120 L 100 140 L 150 100 L 200 110 L 250 80 L 300 90 L 350 60 L 400 50" stroke="#4ECDC4" strokeWidth="2" fill="none" />
                  <path d="M 0 160 L 50 140 L 100 150 L 150 130 L 200 140 L 250 110 L 300 120 L 350 100 L 400 90" stroke="#FFB547" strokeWidth="2" fill="none" />
                  <circle cx="400" cy="50" r="4" fill="#4ECDC4" />
                  <circle cx="50" cy="180" r="4" fill="#FFB547" />
                  <circle cx="150" cy="160" r="4" fill="#FFB547" />
                </svg>
              </Card>
            </div>
          </section>

          {/* Right Sidebar */}
          <aside
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              width: 320,
              flexShrink: 0,
            }}
          >
            {/* Contacts */}
            <Card style={{ padding: 24, background: "#FFF", borderRadius: 16, border: "1px solid #E1DEF6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>Contacts</div>
                <Button variant="link" style={{ color: "#8B7BE8", padding: 0 }} onClick={() => router.push('/admin/contact')}>View All</Button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
                {teamMembers.slice(0, 4).map((contact: any, idx: number) => (
                  <div key={contact._id || idx} style={{ textAlign: "center" }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", background: contact.avatar ? `url(${contact.avatar})` : "#D4CCFA", backgroundSize: "cover", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: 20, fontWeight: 600 }}>
                      {!contact.avatar && (contact.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 12 }}>{contact.name}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {teamMembers.slice(4, 8).map((contact: any, idx: number) => (
                  <div key={contact._id || idx} style={{ textAlign: "center" }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", background: contact.avatar ? `url(${contact.avatar})` : "#D4CCFA", backgroundSize: "cover", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: 20, fontWeight: 600 }}>
                      {!contact.avatar && (contact.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 12 }}>{contact.name}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Messages */}
            <Card style={{ padding: 24, background: "#FFF", borderRadius: 16, border: "1px solid #E1DEF6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>Messages</div>
                <Button variant="link" style={{ color: "#8B7BE8", padding: 0 }} onClick={() => router.push('/chat')}>View All</Button>
              </div>
              {teamMembers.slice(0, 3).map((member: any, idx: number) => (
                <div key={member._id || idx} style={{ display: "flex", gap: 12, marginBottom: 16, cursor: "pointer" }} onClick={() => router.push(`/chat?user=${member.email}`)}>
                  <div style={{ width: 48, height: 48, borderRadius: 8, background: member.avatar ? `url(${member.avatar})` : "#D4CCFA", backgroundSize: "cover", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontWeight: 600 }}>
                    {!member.avatar && (member.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{member.name}</div>
                    <div style={{ fontSize: 12, color: "#999" }}>Click to start a conversation</div>
                  </div>
                </div>
              ))}
            </Card>

            {/* Recent Activity */}
            <Card style={{ padding: 24, background: "#FFF", borderRadius: 16, border: "1px solid #E1DEF6" }}>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Recent Activity</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 20, background: "#F5F5FF", borderRadius: 12, padding: 4 }}>
                <Button
                  onClick={() => setActiveTab("Activity")}
                  style={{
                    flex: 1,
                    background: activeTab === "Activity" ? "#8B7BE8" : "transparent",
                    color: activeTab === "Activity" ? "#FFF" : "#666",
                    border: "none",
                    borderRadius: 8,
                  }}
                >
                  Activity
                </Button>
                <Button
                  onClick={() => setActiveTab("Update")}
                  style={{
                    flex: 1,
                    background: activeTab === "Update" ? "#8B7BE8" : "transparent",
                    color: activeTab === "Update" ? "#FFF" : "#666",
                    border: "none",
                    borderRadius: 8,
                  }}
                >
                  Update
                </Button>
              </div>
              {recentActivities.map((activity: any, idx: number) => (
                <div key={idx} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: "#D4CCFA", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: 16, fontWeight: 600 }}>
                    {activity.user.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>by {activity.user}</div>
                    <div style={{ fontSize: 12, color: "#999" }}>{activity.action}</div>
                    <div style={{ fontSize: 11, color: "#BBB", marginTop: 4 }}>{activity.time}</div>
                  </div>
                </div>
              ))}
            </Card>
          </aside>
        </main>
      </div>
    </div>
  );
}
