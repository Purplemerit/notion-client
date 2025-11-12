'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Sidebar } from "@/components/Sidebar";
import { Search, Share, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useTasks } from "@/contexts/TaskContext";
import { MemberSelectionModal } from "@/components/MemberSelectionModal";
import { useAuth } from "@/contexts/AuthContext";
import { usersAPI, projectsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import AllTaskSidebar from "@/components/AllTaskSidebar";

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM

const EVENT_COLORS = [
  'border-orange-400 bg-orange-50 text-orange-700',
  'border-cyan-400 bg-cyan-50 text-cyan-700',
  'border-purple-400 bg-purple-50 text-purple-700',
  'border-green-400 bg-green-50 text-green-700',
  'border-pink-400 bg-pink-50 text-pink-700',
];

const LABEL_BG_COLORS: Record<string, string> = {
  'High': '#D9B4C7',
  'Medium': '#FFD3B5',
  'Low': '#FFF9C4',
  'Stand-by': '#A8DADC',
};

interface AllTasksPageProps {
  onClose?: () => void;
}

export default function AllTasksPage({ onClose }: AllTasksPageProps = {}) {
  const router = useRouter();
  const [currentView, setCurrentView] = useState("calendar");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showMemberSelection, setShowMemberSelection] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [taskToShare, setTaskToShare] = useState<any>(null);
  const [allTaskMembers, setAllTaskMembers] = useState<any[]>([]);

  // Use shared task context
  const { tasks, loading, addTask, updateTask, refreshTasks } = useTasks();

  // Get current user from auth context
  const { user } = useAuth();
  const { toast } = useToast();

  // State for modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    day: 'Monday',
    label: 'Medium' as 'High' | 'Medium' | 'Low' | 'Stand-by',
    members: [] as string[]
  });

  // Fetch member details when member IDs change
  useEffect(() => {
    const fetchMemberDetails = async () => {
      if (form.members.length === 0) {
        setSelectedMembers([]);
        return;
      }

      try {
        const memberDetails = await Promise.all(
          form.members.map(async (userId) => {
            try {
              return await usersAPI.getById(userId);
            } catch (error) {
              console.error(`Failed to fetch user ${userId}:`, error);
              return null;
            }
          })
        );
        setSelectedMembers(memberDetails.filter(Boolean));
      } catch (error) {
        console.error('Failed to fetch member details:', error);
      }
    };

    fetchMemberDetails();
  }, [form.members]);

  // Fetch all task members for header avatars
  useEffect(() => {
    const fetchAllTaskMembers = async () => {
      if (uniqueMemberIds.length === 0) {
        setAllTaskMembers([]);
        return;
      }

      try {
        const memberDetails = await Promise.all(
          uniqueMemberIds.map(async (userId) => {
            try {
              return await usersAPI.getById(userId);
            } catch (error) {
              console.error(`Failed to fetch user ${userId}:`, error);
              return null;
            }
          })
        );
        setAllTaskMembers(memberDetails.filter(Boolean));
      } catch (error) {
        console.error('Failed to fetch all task members:', error);
      }
    };

    fetchAllTaskMembers();
  }, [tasks]);

  // Handle member selection from modal
  const handleSelectMembers = (memberIds: string[]) => {
    setForm({ ...form, members: memberIds });
  };

  const getGridPosition = (task: any) => {
    const colStart = daysOfWeek.indexOf(task.day) + 2;
    const rowStart = Math.floor((task.startTime - 6) + 1);
    const rowSpan = Math.ceil(task.duration);
    return {
      gridColumn: `${colStart} / span 1`,
      gridRow: `${rowStart} / span ${rowSpan}`,
    };
  };

  // Convert tasks to calendar display format
  const calendarTasks = tasks
    .filter((task: any) => task.startTime >= 6 && task.startTime < 23)
    .map((task: any, idx: number) => ({
      ...task,
      backgroundColor: LABEL_BG_COLORS[task.label] || '#D8D5F0',
      color: EVENT_COLORS[idx % EVENT_COLORS.length],
    }));

  // Categorize tasks for list view
  const today = new Date();
  const todayDay = daysOfWeek[today.getDay()];

  // Format current month and year
  const currentMonth = today.toLocaleString('default', { month: 'long' });
  const currentYear = today.getFullYear();
  
  const ongoingTasks = tasks.filter((task: any) => {
    // Tasks for today or earlier days this week
    const taskDayIndex = daysOfWeek.indexOf(task.day);
    const todayIndex = today.getDay();
    return taskDayIndex <= todayIndex;
  });

  const upcomingTasks = tasks.filter((task: any) => {
    // Tasks for future days this week
    const taskDayIndex = daysOfWeek.indexOf(task.day);
    const todayIndex = today.getDay();
    return taskDayIndex > todayIndex;
  });

  // Calculate last edited time
  const getLastEditedTime = () => {
    if (tasks.length === 0) return "No recent edits";

    const sortedTasks = [...tasks].sort((a: any, b: any) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

    const lastEditedTask = sortedTasks[0];
    const lastEditDate = new Date(lastEditedTask.updatedAt || lastEditedTask.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - lastEditDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Edited just now";
    if (diffMins < 60) return `Edited ${diffMins}m ago`;
    if (diffHours < 24) return `Edited ${diffHours}h ago`;
    return `Edited ${diffDays}d ago`;
  };

  // Get unique members from all tasks
  const getAllTaskMembers = () => {
    const memberIds = new Set<string>();
    tasks.forEach((task: any) => {
      if (task.members && Array.isArray(task.members)) {
        task.members.forEach((memberId: string) => {
          // Only add valid user IDs (not URLs or other invalid data)
          if (memberId && typeof memberId === 'string' && !memberId.startsWith('http') && memberId.length === 24) {
            memberIds.add(memberId);
          }
        });
      }
    });
    return Array.from(memberIds).slice(0, 4); // Show max 4 avatars
  };

  const uniqueMemberIds = getAllTaskMembers();

  // Handle Share button click
  const handleShareClick = () => {
    if (selectedTask) {
      setTaskToShare(selectedTask);
      setShowShareModal(true);
    } else {
      toast({
        title: "No Task Selected",
        description: "Please select a task to share",
        variant: "destructive"
      });
    }
  };

  // Handle share with members
  const handleShareWithMembers = (memberIds: string[]) => {
    if (taskToShare) {
      // Here you would implement the actual sharing logic
      // For now, we'll just show a success message
      toast({
        title: "Task Shared",
        description: `Task "${taskToShare.title}" shared with ${memberIds.length} member(s)`,
      });
      setShowShareModal(false);
      setTaskToShare(null);
    }
  };

  // Handle marking task as complete
  const handleMarkComplete = async (task: any, checked: boolean) => {
    try {
      const newStatus = checked ? 'completed' : 'todo';
      
      // Update in calendar/teams task system
      await updateTask(task._id, { status: newStatus });
      
      // Refresh tasks to ensure UI is in sync
      await refreshTasks();
      
      // If task has projectId, also update in project tasks
      if (task.projectId) {
        try {
          await projectsAPI.updateTask(task.projectId, task._id, {
            taskStatus: checked ? 'Completed' : 'To Be Done',
          });
          toast({
            title: "Success",
            description: checked ? "Task marked as completed" : "Task marked as incomplete",
          });
        } catch (error) {
          console.error('Failed to update project task:', error);
          toast({
            title: "Partial Success",
            description: "Task updated in calendar but failed to sync with project",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: checked ? "Task marked as completed" : "Task marked as incomplete",
        });
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      <Sidebar currentView={"calendar"} onViewChange={setCurrentView} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 border-b shrink-0 min-w-0">
          <div className="relative flex-1 w-full max-w-md sm:max-w-lg min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input 
              placeholder="Find Something" 
              className="pl-11 border-0 w-full" 
              style={{
                display: 'flex',
                padding: '12px 16px',
                alignItems: 'center',
                gap: '10px',
                borderRadius: '20px',
                border: '1px solid #F7F5FD',
                background: '#EFEDFA'
              }}
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <span className="text-sm text-gray-500">{getLastEditedTime()}</span>
            <div className="flex -space-x-2">
              {allTaskMembers.length === 0 ? (
                user && (
                  <Avatar className="w-8 h-8 border-2 border-white">
                    <AvatarImage src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name || user.email}`} />
                  </Avatar>
                )
              ) : (
                allTaskMembers.map((member, idx) => (
                  <Avatar key={member._id} className="w-8 h-8 border-2 border-white">
                    <AvatarImage
                      src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name || member.email}`}
                      title={member.name || member.email}
                    />
                  </Avatar>
                ))
              )}
            </div>
            <Button
              onClick={handleShareClick}
              variant="outline"
              className="px-3 sm:px-4"
              style={{
                display: 'flex',
                padding: '8px 16px',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '12px',
                border: '1px solid #C7C7C7',
                background: '#FFF'
              }}
            >
              <Share className="w-4 h-4"/>
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 flex flex-col overflow-hidden bg-[#F8F7FF]">
            {/* Header Rows */}
            <div style={{ padding: '24px 32px 20px 32px', display: 'flex', flexDirection: 'column', gap: 20, borderBottom: '1px solid #E0E0E0' }}>
              {/* Top Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 
                  onClick={() => {
                    if (onClose) {
                      onClose();
                    } else {
                      router.push('/teams');
                    }
                  }}
                  style={{ 
                    fontSize: '28px', 
                    fontWeight: 700, 
                    color: '#6B66D0',
                    cursor: 'pointer'
                  }}
                >
                  Scheduled Task
                </h1>
                <Button
                  style={{
                    background: '#6B66D0',
                    color: '#FFF',
                    borderRadius: 12,
                    padding: '10px 20px',
                    fontSize: 15,
                    fontWeight: 600,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                  onClick={() => setShowModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  Create Task
                </Button>
              </div>

              {/* Middle Row */}
              {user && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>Viewing tasks for:</span>
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name || user.email}`} />
                    </Avatar>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#222', fontStyle: 'italic' }}>
                      {user.name || user.email}
                    </span>
                  </div>
                </div>
              )}

              {/* Bottom Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 min-w-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>{currentMonth}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>{currentYear}</span>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Today</span>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button 
                    onClick={() => {
                      setViewMode("calendar");
                    }}
                    style={{
                      background: viewMode === "calendar" ? '#6B66D0' : '#FFF',
                      color: viewMode === "calendar" ? '#FFF' : '#222',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      border: viewMode === "calendar" ? 'none' : '1px solid #C7C7C7',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="3" width="12" height="10" rx="1" stroke={viewMode === "calendar" ? "white" : "#222"} strokeWidth="1.5"/>
                      <path d="M5 1V3M11 1V3" stroke={viewMode === "calendar" ? "white" : "#222"} strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Calendar
                  </Button>
                  <Button 
                    onClick={() => {
                      setViewMode("list");
                      setSelectedTask(null); // Close sidebar when switching to list view
                    }}
                    style={{
                      background: viewMode === "list" ? '#6B66D0' : '#FFF',
                      color: viewMode === "list" ? '#FFF' : '#222',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      border: viewMode === "list" ? 'none' : '1px solid #C7C7C7',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="3" width="12" height="2" rx="0.5" fill={viewMode === "list" ? "white" : "#222"}/>
                      <rect x="2" y="7" width="12" height="2" rx="0.5" fill={viewMode === "list" ? "white" : "#222"}/>
                      <rect x="2" y="11" width="12" height="2" rx="0.5" fill={viewMode === "list" ? "white" : "#222"}/>
                    </svg>
                    List
                  </Button>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    background: '#FFF',
                    border: '1px solid #E0E0E0',
                    borderRadius: 8
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Category:</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>All</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 4 }}>
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {viewMode === "calendar" ? (
              <>
                {/* Weekdays header */}
                <div className="flex items-center mb-2 shrink-0 overflow-x-auto min-w-0">
                  <div className="flex items-center min-w-max" style={{ paddingLeft: '70px' }}>
                  {daysOfWeek.map((day) => (
                    <div key={day} className="text-center font-semibold" style={{
                      flex: 1,
                      minWidth: '100px',
                      color: '#846BD2',
                      fontSize: '1rem',
                      fontWeight: 500,
                      letterSpacing: '0.01em',
                    }}>
                      {day}
                    </div>
                  ))}
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
              <div className="grid min-w-[800px]" style={{
                gridTemplateColumns: '70px repeat(7, minmax(100px, 1fr))',
                gridTemplateRows: `repeat(${timeSlots.length}, minmax(0, 0.8fr))`,
                minHeight: '100%'
              }}>
                {/* Time labels and grid lines */}
                {timeSlots.map((hour, index) => (
                  <div key={hour} className="contents">
                    <div className="text-right pr-4 text-xs font-semibold text-gray-400" style={{
                      gridColumn: 1,
                      gridRow: index + 1,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-end',
                      paddingTop: 8
                    }}>
                      {`${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'am' : 'pm'}`}
                    </div>
                    {Array.from({ length: 7 }).map((_, dayIndex) => (
                      <div
                        key={dayIndex}
                        className="border-t border-l border-gray-200"
                        style={{
                          gridColumn: dayIndex + 2,
                          gridRow: index + 1,
                          aspectRatio: '5/4'
                        }}
                      ></div>
                    ))}
                  </div>
                ))}

                {/* Task Events */}
                {loading ? (
                  <div className="col-span-8 row-span-18 flex items-center justify-center text-muted-foreground">
                    Loading tasks...
                  </div>
                ) : calendarTasks.length === 0 ? (
                  <div className="col-span-8 row-span-18 flex items-center justify-center text-muted-foreground">
                    No tasks scheduled. Create one to get started!
                  </div>
                ) : (
                  calendarTasks.map((task: any) => {
                    const startHour = Math.floor(task.startTime);
                    const startMin = Math.round((task.startTime - startHour) * 60);
                    const endTime = task.startTime + task.duration;
                    const endHour = Math.floor(endTime);
                    const endMin = Math.round((endTime - endHour) * 60);

                    return (
                      <div
                        key={task._id}
                        style={{
                          ...getGridPosition(task),
                          margin: 6,
                          background: task.backgroundColor || '#D8D5F0',
                          borderRadius: 16,
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          position: 'relative'
                        }}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div style={{ fontWeight: 600, fontSize: 15, color: '#2C2C2C', lineHeight: 1.3 }}>
                          {task.title}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4A4A4A' }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M7 3.5V7L9 9" stroke="#4A4A4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="7" cy="7" r="5.5" stroke="#4A4A4A" strokeWidth="1.5"/>
                          </svg>
                          <span style={{ fontWeight: 500 }}>
                            {String(startHour).padStart(2, '0')}:{String(startMin).padStart(2, '0')} - {String(endHour).padStart(2, '0')}:{String(endMin).padStart(2, '0')}
                          </span>
                        </div>

                        {task.description && (
                          <div style={{ fontSize: 12, color: '#5A5A5A', lineHeight: 1.4, marginTop: -4, maxHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {task.description}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginLeft: -4 }}>
                            {task.members && task.members.slice(0, 3).map((member: string, idx: number) => (
                              <img
                                key={idx}
                                src={member}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  border: `2px solid ${task.backgroundColor || '#D8D5F0'}`,
                                  marginLeft: idx > 0 ? -8 : 0
                                }}
                                alt="member"
                                title="Team member"
                              />
                            ))}
                            {task.members && task.members.length > 3 && (
                              <span style={{
                                fontSize: 11,
                                color: '#4A4A4A',
                                marginLeft: 4,
                                fontWeight: 500
                              }}>
                                +{task.members.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
              </>
            ) : (
              /* List View */
              <div className="flex-1 overflow-auto" style={{ padding: '24px 32px' }}>
                {loading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Loading tasks...
                  </div>
                ) : (
                  <>
                    {/* Ongoing Tasks Section */}
                    <div style={{ marginBottom: 40 }}>
                      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#222', marginBottom: 24 }}>
                        Ongoing Tasks ({ongoingTasks.length})
                      </h2>
                      
                      {ongoingTasks.length === 0 ? (
                        <p style={{ fontSize: 14, color: '#666', fontStyle: 'italic' }}>No ongoing tasks</p>
                      ) : (
                        ongoingTasks.map((task: any) => {
                          const startHour = Math.floor(task.startTime);
                          const startMin = Math.round((task.startTime - startHour) * 60);
                          const endTime = task.startTime + task.duration;
                          const endHour = Math.floor(endTime);
                          const endMin = Math.round((endTime - endHour) * 60);
                          const isCompleted = task.status === 'completed';
                          
                          return (
                            <div 
                              key={task._id}
                              style={{ 
                                background: task.backgroundColor || '#F8F7FF', 
                                borderRadius: 12, 
                                padding: '20px 24px',
                                marginBottom: 16,
                                border: '1px solid #E8E6F9',
                                cursor: 'pointer',
                                opacity: isCompleted ? 0.7 : 1,
                              }}
                              onClick={() => setSelectedTask(task)}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <Checkbox 
                                    checked={isCompleted}
                                    onCheckedChange={(checked) => handleMarkComplete(task, checked as boolean)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div>
                                    <span style={{ 
                                      fontSize: 16, 
                                      fontWeight: 600, 
                                      color: '#222',
                                      textDecoration: isCompleted ? 'line-through' : 'none',
                                    }}>{task.title}</span>
                                    {task.label && (
                                      <span style={{
                                        marginLeft: 8,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: 6,
                                        background: task.label === 'High' ? '#FFCDD2' : 
                                                   task.label === 'Medium' ? '#FFE0B2' : 
                                                   task.label === 'Low' ? '#FFF9C4' : '#B2EBF2',
                                        color: task.label === 'High' ? '#F44336' : 
                                               task.label === 'Medium' ? '#FF9800' : 
                                               task.label === 'Low' ? '#222' : '#00BCD4'
                                      }}>
                                        {task.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 500, color: '#888' }}>
                                  {task.day} - {String(startHour).padStart(2, '0')}:{String(startMin).padStart(2, '0')} - {String(endHour).padStart(2, '0')}:{String(endMin).padStart(2, '0')}
                                </span>
                              </div>
                              
                              {task.assignee && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 36, marginBottom: 12 }}>
                                  <Avatar className="w-10 h-10">
                                    <AvatarImage src={task.assignee} />
                                  </Avatar>
                                  <span style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>Assigned</span>
                                </div>
                              )}
                              
                              {task.description && (
                                <p style={{ 
                                  fontSize: 14, 
                                  color: '#666', 
                                  lineHeight: 1.6,
                                  marginLeft: 36 
                                }}>
                                  {task.description}
                                </p>
                              )}
                              
                              {task.members && task.members.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 36, marginTop: 12 }}>
                                  <span style={{ fontSize: 13, color: '#888', marginRight: 4 }}>Team:</span>
                                  {task.members.slice(0, 5).map((member: string, idx: number) => (
                                    <Avatar key={idx} className="w-7 h-7">
                                      <AvatarImage src={member} />
                                    </Avatar>
                                  ))}
                                  {task.members.length > 5 && (
                                    <span style={{ fontSize: 12, color: '#666' }}>+{task.members.length - 5}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Upcoming Task Section */}
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#222', marginBottom: 24 }}>
                        Upcoming Tasks ({upcomingTasks.length})
                      </h2>
                      
                      {upcomingTasks.length === 0 ? (
                        <p style={{ fontSize: 14, color: '#666', fontStyle: 'italic' }}>No upcoming tasks</p>
                      ) : (
                        upcomingTasks.map((task: any) => {
                          const startHour = Math.floor(task.startTime);
                          const startMin = Math.round((task.startTime - startHour) * 60);
                          const endTime = task.startTime + task.duration;
                          const endHour = Math.floor(endTime);
                          const endMin = Math.round((endTime - endHour) * 60);
                          const isCompleted = task.status === 'completed';
                          
                          return (
                            <div 
                              key={task._id}
                              style={{ 
                                background: task.backgroundColor || '#F8F7FF', 
                                borderRadius: 12, 
                                padding: '20px 24px',
                                marginBottom: 16,
                                border: '1px solid #E8E6F9',
                                cursor: 'pointer',
                                opacity: isCompleted ? 0.7 : 1,
                              }}
                              onClick={() => setSelectedTask(task)}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <Checkbox 
                                    checked={isCompleted}
                                    onCheckedChange={(checked) => handleMarkComplete(task, checked as boolean)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div>
                                    <span style={{ 
                                      fontSize: 16, 
                                      fontWeight: 600, 
                                      color: '#222',
                                      textDecoration: isCompleted ? 'line-through' : 'none',
                                    }}>{task.title}</span>
                                    {task.label && (
                                      <span style={{
                                        marginLeft: 8,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: 6,
                                        background: task.label === 'High' ? '#FFCDD2' : 
                                                   task.label === 'Medium' ? '#FFE0B2' : 
                                                   task.label === 'Low' ? '#FFF9C4' : '#B2EBF2',
                                        color: task.label === 'High' ? '#F44336' : 
                                               task.label === 'Medium' ? '#FF9800' : 
                                               task.label === 'Low' ? '#222' : '#00BCD4'
                                      }}>
                                        {task.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 500, color: '#888' }}>
                                  {task.day} - {String(startHour).padStart(2, '0')}:{String(startMin).padStart(2, '0')} - {String(endHour).padStart(2, '0')}:{String(endMin).padStart(2, '0')}
                                </span>
                              </div>
                              
                              {task.assignee && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 36, marginBottom: 12 }}>
                                  <Avatar className="w-10 h-10">
                                    <AvatarImage src={task.assignee} />
                                  </Avatar>
                                  <span style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>Assigned</span>
                                </div>
                              )}
                              
                              {task.description && (
                                <p style={{ 
                                  fontSize: 14, 
                                  color: '#666', 
                                  lineHeight: 1.6,
                                  marginLeft: 36 
                                }}>
                                  {task.description}
                                </p>
                              )}
                              
                              {task.members && task.members.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 36, marginTop: 12 }}>
                                  <span style={{ fontSize: 13, color: '#888', marginRight: 4 }}>Team:</span>
                                  {task.members.slice(0, 5).map((member: string, idx: number) => (
                                    <Avatar key={idx} className="w-7 h-7">
                                      <AvatarImage src={member} />
                                    </Avatar>
                                  ))}
                                  {task.members.length > 5 && (
                                    <span style={{ fontSize: 12, color: '#666' }}>+{task.members.length - 5}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </main>

          {/* Right Sidebar - Task Details - Using AllTaskSidebar component */}
          {viewMode === "calendar" && selectedTask && (
            <AllTaskSidebar
              open={true}
              onClose={() => setSelectedTask(null)}
              task={selectedTask}
              onUpdate={() => {
                // Refresh tasks or do any necessary updates
                // The task context will handle the refresh automatically
              }}
            />
          )}
        </div>
      </div>
    {/* Create Task Modal - teams/page.tsx style */}
    {showModal && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          background: 'rgba(0,0,0,0.04)',
        }}
      >
        <div
          className="w-full max-w-md mx-4"
          style={{
            borderRadius: 24,
            background: '#FFF',
            boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.20), 35px 45px 73px 0 rgba(32, 32, 35, 0.07)',
            padding: '32px 32px 24px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 18,
            position: 'relative',
          }}
        >
          {/* Close icon */}
          <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', fontSize: 22, color: '#222', cursor: 'pointer' }}>&times;</button>
          <div style={{ fontWeight: 600, fontSize: 18, color: '#7B8794', marginBottom: 8 }}>Create Task</div>
          <input 
            type="text"
            placeholder="Task Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            style={{ width: '100%', fontWeight: 700, fontSize: 22, color: '#222', border: 'none', outline: 'none', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: 8 }}>
            <span style={{ fontWeight: 500, fontSize: 15, color: '#222', marginRight: 8 }}>Invite Member&apos;s</span>
            <button
              onClick={() => setShowMemberSelection(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#222',
                fontSize: 18,
                cursor: 'pointer',
                marginRight: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: '50%',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >+</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              {selectedMembers.length === 0 ? (
                <span style={{ fontSize: 13, color: '#7B8794', fontStyle: 'italic' }}>No members selected</span>
              ) : (
                selectedMembers.slice(0, 5).map((member, idx) => (
                  <div
                    key={member._id}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: member.avatar ? `url(${member.avatar}) center/cover` : '#7B8794',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      fontSize: 12,
                      fontWeight: 600,
                      border: '2px solid #FFF',
                      marginLeft: idx > 0 ? -8 : 0,
                    }}
                    title={member.name || member.email}
                  >
                    {!member.avatar && (member.name || member.email).charAt(0).toUpperCase()}
                  </div>
                ))
              )}
              {selectedMembers.length > 5 && (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#7B8794',
                    marginLeft: -8,
                  }}
                >
                  +{selectedMembers.length - 5}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 24, marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize: 15, color: '#222' }}>
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none"><rect x="3" y="6" width="16" height="12" rx="2" stroke="#222" strokeWidth="2"/><path d="M7 3V6" stroke="#222" strokeWidth="2" strokeLinecap="round"/><path d="M15 3V6" stroke="#222" strokeWidth="2" strokeLinecap="round"/></svg>
              <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))} style={{ border: 'none', outline: 'none', fontSize: 15, fontWeight: 500 }}>
                {daysOfWeek.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, fontSize: 15, color: '#222' }}>
              <input
                type="time"
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                style={{ border: 'none', outline: 'none', fontSize: 15, fontWeight: 500 }}
              />
              <span>-</span>
              <input
                type="time"
                value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                style={{ border: 'none', outline: 'none', fontSize: 15, fontWeight: 500 }}
              />
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 12, marginBottom: 8 }}>
            <span style={{ fontWeight: 500, fontSize: 15, color: '#222', marginRight: 8 }}>Label</span>
            <span
              onClick={() => setForm(f => ({ ...f, label: 'High' }))}
              style={{
                background: '#D9B4C7',
                color: '#000',
                fontWeight: 600,
                fontSize: 13,
                borderRadius: '21.913px',
                padding: '5px 14px',
                cursor: 'pointer',
                border: form.label === 'High' ? '3.652px solid #E893BF' : '3.652px solid transparent'
              }}
            >High</span>
            <span
              onClick={() => setForm(f => ({ ...f, label: 'Medium' }))}
              style={{
                background: '#FFD3B5',
                color: '#000',
                fontWeight: 600,
                fontSize: 13,
                borderRadius: '21.913px',
                padding: '5px 14px',
                cursor: 'pointer',
                border: form.label === 'Medium' ? '3.652px solid #F8B689' : '3.652px solid transparent'
              }}
            >Medium</span>
            <span
              onClick={() => setForm(f => ({ ...f, label: 'Low' }))}
              style={{
                background: '#FFF9C4',
                color: '#000',
                fontWeight: 600,
                fontSize: 13,
                borderRadius: '21.913px',
                padding: '5px 14px',
                cursor: 'pointer',
                border: form.label === 'Low' ? '3.652px solid #FDEE72' : '3.652px solid transparent'
              }}
            >Low</span>
            <span
              onClick={() => setForm(f => ({ ...f, label: 'Stand-by' }))}
              style={{
                background: '#A8DADC',
                color: '#000',
                fontWeight: 600,
                fontSize: 13,
                borderRadius: '21.913px',
                padding: '5px 14px',
                cursor: 'pointer',
                border: form.label === 'Stand-by' ? '3.652px solid #8DE7EA' : '3.652px solid transparent'
              }}
            >Stand-by</span>
          </div>
          <textarea 
            placeholder="Description" 
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            style={{ width: '100%', minHeight: 160, borderRadius: 12, border: '1px solid #E0E0E0', padding: 12, fontSize: 14, fontWeight: 500, color: '#222', marginBottom: 12, resize: 'none', outline: 'none' }} 
          />
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <button onClick={() => {
              setShowModal(false);
              setForm({
                title: '',
                description: '',
                startTime: '',
                endTime: '',
                day: 'Monday',
                label: 'Medium',
                members: []
              });
              setSelectedMembers([]);
            }} style={{ background: '#FFF', color: '#222', fontWeight: 600, fontSize: 15, border: '1.5px solid #B39DDB', borderRadius: 12, padding: '10px 24px', cursor: 'pointer' }}>Discard</button>
            <button onClick={() => {
              if (form.title && form.startTime && form.endTime) {
                const [startHour, startMin] = form.startTime.split(':').map(Number);
                const [endHour, endMin] = form.endTime.split(':').map(Number);
                const startTimeDecimal = startHour + startMin / 60;
                const endTimeDecimal = endHour + endMin / 60;
                const duration = endTimeDecimal - startTimeDecimal;

                addTask({
                  title: form.title,
                  description: form.description,
                  day: form.day,
                  startTime: startTimeDecimal,
                  duration: duration,
                  label: form.label,
                  members: form.members
                });

                setShowModal(false);
                setForm({
                  title: '',
                  description: '',
                  startTime: '',
                  endTime: '',
                  day: 'Monday',
                  label: 'Medium',
                  members: []
                });
                setSelectedMembers([]);
              } else {
                toast({ title: "Missing Information", description: "Please fill in title and time", variant: "destructive" });
              }
            }} style={{ background: '#846BD2', color: '#FFF', fontWeight: 600, fontSize: 15, border: 'none', borderRadius: 12, padding: '10px 24px', cursor: 'pointer' }}>Confirm</button>
          </div>
        </div>
      </div>
    )}

    {/* Member Selection Modal for Create Task */}
    <MemberSelectionModal
      isOpen={showMemberSelection}
      onClose={() => setShowMemberSelection(false)}
      selectedMembers={form.members}
      onSelectMembers={handleSelectMembers}
      title="Select Team Members"
    />

    {/* Member Selection Modal for Sharing */}
    <MemberSelectionModal
      isOpen={showShareModal}
      onClose={() => {
        setShowShareModal(false);
        setTaskToShare(null);
      }}
      selectedMembers={[]}
      onSelectMembers={handleShareWithMembers}
      title={`Share Task: ${taskToShare?.title || ''}`}
    />
    </div>
  );
}
