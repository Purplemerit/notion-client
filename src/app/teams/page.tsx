'use client';

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Sidebar } from "@/components/Sidebar";
import {
  Search,
  Share,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AllTasksPage from "@/app/components/alltask";
import { useTasks } from "@/contexts/TaskContext";
import { MemberSelectionModal } from "@/components/MemberSelectionModal";
import { EditTaskModal } from "@/components/EditTaskModal";
import { ChangeAdminModal } from "@/components/ChangeAdminModal";
import { usersAPI, projectsAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

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

// This component is not used, but keeping for reference
// The month header is now inline in the main component with dynamic dates

export default function Page() {
  const [currentView, setCurrentView] = useState("calendar");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAllTask, setShowAllTask] = useState(false);
  const [showTeamInfo, setShowTeamInfo] = useState(false);
  const [showMemberSelection, setShowMemberSelection] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [showChangeAdmin, setShowChangeAdmin] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any>(null);
  const [taskToChangeAdmin, setTaskToChangeAdmin] = useState<any>(null);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [taskToShare, setTaskToShare] = useState<any>(null);
  const [allTaskMembers, setAllTaskMembers] = useState<any[]>([]);

  // Current date information
  const today = new Date();

  // Main calendar view state - tracks the currently displayed date
  const [viewDate, setViewDate] = useState(new Date());
  const currentMonth = viewDate.toLocaleString('default', { month: 'long' });
  const currentYear = viewDate.getFullYear();
  const currentDay = viewDate.getDate();

  // Calendar popup state
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Main calendar navigation functions (by week)
  const goToPreviousWeek = () => {
    setViewDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setViewDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  // Calendar popup navigation functions (by month)
  const goToPreviousMonth = () => {
    setCalendarDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCalendarDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  // Generate calendar days for the selected month
  const generateCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Previous month's last days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDays = firstDayOfWeek;

    const days = [];

    // Add previous month's trailing days
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false
      });
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true
      });
    }

    // Add next month's leading days to fill the grid (35 total cells = 5 rows)
    const remainingCells = 35 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        isCurrentMonth: false
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const calendarMonth = calendarDate.toLocaleString('default', { month: 'long' });
  const calendarYear = calendarDate.getFullYear();

  // Format for "Today is Monday, May 26th 2025" - always shows actual today
  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  const todayActual = {
    day: today.getDate(),
    month: today.toLocaleString('default', { month: 'long' }),
    year: today.getFullYear(),
    dayName: daysOfWeek[today.getDay()]
  };
  const todayFormatted = `Today is ${todayActual.dayName}, ${todayActual.month} ${todayActual.day}${getOrdinalSuffix(todayActual.day)} ${todayActual.year}`;
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    day: 'Monday',
    label: 'Medium' as 'High' | 'Medium' | 'Low' | 'Stand-by',
    members: [] as string[],
    projectId: '' // Add project ID
  });
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const { toast } = useToast();

  // Projects state
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [selectedProjectForTask, setSelectedProjectForTask] = useState<string>('');

  // Use shared task context
  const { tasks, loading, addTask, deleteTask, updateTask, changeAdmin } = useTasks();

  // Get current user from auth context
  const { user } = useAuth();
  const currentUserId = user?._id;

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

  const uniqueMemberIds = useMemo(() => getAllTaskMembers(), [tasks]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openMenuTaskId) return;
    const handleClick = () => setOpenMenuTaskId(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [openMenuTaskId]);

  // Reset calendar to current month when popup is opened
  useEffect(() => {
    if (showCalendarPopup) {
      setCalendarDate(new Date());
    }
  }, [showCalendarPopup]);

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
  }, [tasks, uniqueMemberIds]);

  // Fetch all projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsData = await projectsAPI.getAll();
        setAllProjects(projectsData);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      }
    };
    fetchProjects();
  }, []);

  // Fetch member details when member IDs change
  useEffect(() => {
    const fetchMemberDetails = async () => {
      if (newTask.members.length === 0) {
        setSelectedMembers([]);
        return;
      }

      try {
        const memberDetails = await Promise.all(
          newTask.members.map(async (userId) => {
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
  }, [newTask.members]);

  // Handle member selection from modal
  const handleSelectMembers = (memberIds: string[]) => {
    setNewTask({ ...newTask, members: memberIds });
  };

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

  // Handle Share button click
  const handleShareClick = () => {
    if (selectedEvent) {
      setTaskToShare(selectedEvent);
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
      toast({
        title: "Task Shared",
        description: `Task "${taskToShare.title}" shared with ${memberIds.length} member(s)`,
      });
      setShowShareModal(false);
      setTaskToShare(null);
    }
  };

  // Handle task edit save
  const handleEditTaskSave = async (taskId: string, updates: any) => {
    await updateTask(taskId, updates);
    setShowEditTask(false);
    setTaskToEdit(null);
  };

  // Convert task to calendar display format
  const convertTaskToCalendar = (task: any, index: number) => {
    return {
      id: task._id,
      day: task.day,
      startTime: task.startTime,
      duration: task.duration,
      title: task.title,
      description: task.description,
      members: task.members || [],
      label: task.label,
      backgroundColor: LABEL_BG_COLORS[task.label] || '#D8D5F0',
      color: EVENT_COLORS[index % EVENT_COLORS.length],
      fullEvent: task,
    };
  };

  // Helper function to calculate grid position for each task
  const getGridPosition = (task: any) => {
    const colStart = daysOfWeek.indexOf(task.day) + 2; // +2 to account for time column
    const rowStart = Math.floor((task.startTime - 6) + 1); // Each hour is now 1 row
    const rowSpan = Math.ceil(task.duration); // Duration in hours = number of rows
    return {
        gridColumn: `${colStart} / span 1`,
        gridRow: `${rowStart} / span ${rowSpan}`,
    };
  };

  const calendarTasks = tasks.map((task, idx) => convertTaskToCalendar(task, idx)).filter((task: any) => {
    // Only show events that fall within our visible time range (6 AM - 11 PM)
    return task.startTime >= 6 && task.startTime < 23;
  });

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      <Sidebar currentView={"calendar"} onViewChange={setCurrentView} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 border-b shrink-0 min-w-0">
            <div className="relative flex-1 w-full max-w-md min-w-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                    placeholder="Find Something"
                    className="pl-11 bg-white h-10 w-full"
                    style={{
                      borderRadius: '24px',
                      border: '1px solid #E6E6E6',
                      background: '#FFF',
                      boxShadow: '0 4px 4px 0 rgba(221, 221, 221, 0.25)',
                    }}
                />
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <span className="text-sm text-gray-500">{getLastEditedTime()}</span>
                <div className="flex -space-x-2">
                    {allTaskMembers.length === 0 ? (
                      user && (
                        <Avatar className="w-8 h-8 border-2 border-white">
                          <AvatarImage src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name || user.email}`} />
                        </Avatar>
                      )
                    ) : (
                      allTaskMembers.map((member) => (
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
                    className="rounded-xl border-gray-300 bg-white px-2 sm:px-3 py-2"
                >
                    <Share className="w-4 h-4 sm:mr-2"/>
                    <span className="hidden sm:inline">Share</span>
                </Button>
            </div>
        </header>
        <div className="flex-1 flex overflow-hidden">
            <main className="flex-1 flex flex-col p-6 overflow-hidden bg-[#F8F7FF]">
                {/* Sub Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 mb-6 shrink-0">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Scheduled Task</h1>
                        <p className="text-xs sm:text-sm text-gray-500">{todayFormatted}</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            className="font-semibold rounded-lg border-gray-300 bg-white flex-1 sm:flex-none"
                            onClick={() => setShowAllTask(true)}
                        >
                            All Task
                        </Button>
                        <Button
                            className="font-semibold text-white rounded-xl bg-[#846bd2] hover:bg-purple-500 border-gray-300 flex-1 sm:flex-none"
                            onClick={() => setShowCreateTask(true)}
                        >
                            <Plus className="w-4 h-4 mr-2"/>
                            <span className="hidden sm:inline">Create Task</span>
                            <span className="sm:hidden">Create</span>
                        </Button>
                    </div>
                </div>
                <div className="flex items-center justify-between mb-6 shrink-0 border-y py-3 overflow-x-auto">
          <div className="inline-flex items-center min-w-max"
            style={{
              paddingLeft: '70px',
              background: '#F8F7FF', // match main content
              height: '40px',
              fontWeight: 700,
              fontSize: '1.25rem',
              color: '#846BD2',
              letterSpacing: '0.02em',
            }}
          >
            {currentMonth} {currentYear}
          </div>
                     <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 font-semibold text-gray-600">
                            <span style={{ display: 'inline-flex', cursor: 'pointer' }} onClick={() => setShowCalendarPopup(true)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path d="M22 6.66667V4M10 6.66667V4M4.33333 10.6667H27.6667M4 13.392C4 10.572 4 9.16133 4.58133 8.084C5.10699 7.12307 5.92266 6.35267 6.912 5.88267C8.05333 5.33333 9.54667 5.33333 12.5333 5.33333H19.4667C22.4533 5.33333 23.9467 5.33333 25.088 5.88267C26.092 6.36533 26.9067 7.136 27.4187 8.08267C28 9.16267 28 10.5733 28 13.3933V19.9427C28 22.7627 28 24.1733 27.4187 25.2507C26.893 26.2116 26.0773 26.982 25.088 27.452C23.9467 28 22.4533 28 19.4667 28H12.5333C9.54667 28 8.05333 28 6.912 27.4507C5.92286 26.981 5.10722 26.2111 4.58133 25.2507C4 24.1707 4 22.76 4 19.94V13.392Z" stroke="#846BD2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            </span>
                            <span className="text-sm">{currentMonth} {currentYear}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={goToPreviousWeek}><ChevronLeft className="w-5 h-5"/></Button>
                            <Button variant="outline" className="bg-white text-sm h-9" onClick={() => setViewDate(new Date())}>{currentDay} {currentMonth} {currentYear}</Button>
                            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={goToNextWeek}><ChevronRight className="w-5 h-5"/></Button>
                        </div>
                     </div>
                </div>

                                {/* Weekdays header matching grid columns */}
                <div className="flex items-center mb-2 shrink-0" style={{ paddingLeft: '70px' }}>
                    {daysOfWeek.map((day) => (
                        <div key={day} className="text-center font-semibold" style={{ 
                            flex: 1,
                            color: '#846BD2',
                            fontSize: '1rem',
                            fontWeight: 500,
                            letterSpacing: '0.01em',
                        }}>
                            {day}
                        </div>
                    ))}
                </div>                {/* Calendar Grid */}
                <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
                    <div className="grid min-w-[800px]" style={{ 
                        gridTemplateColumns: '70px repeat(7, minmax(100px, 1fr))', 
                        gridTemplateRows: `repeat(${timeSlots.length}, minmax(60px, 0.8fr))`,
                        minHeight: '100%'
                    }}>
            {/* ...existing code... */}

                        {/* Time Gutter & Grid Lines */}
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
                                    <div key={dayIndex} className="border-t border-l border-gray-200" style={{ 
                                        gridColumn: dayIndex + 2, 
                                        gridRow: index + 1,
                                        aspectRatio: '5/4'
                                    }}></div>
                                ))}
                            </div>
                        ))}

                        {/* Task Events */}
                        {loading ? (
                          <div className="col-span-8 row-span-18 flex items-center justify-center text-muted-foreground">
                            Loading events...
                          </div>
                        ) : calendarTasks.length === 0 ? (
                          <div className="col-span-8 row-span-18 flex items-center justify-center text-muted-foreground">
                            No events scheduled. Create one to get started!
                          </div>
                        ) : (
                          calendarTasks.map((task: any) => {
                            const startHour = Math.floor(task.startTime);
                            const startMin = Math.round((task.startTime - startHour) * 60);
                            const endTime = task.startTime + task.duration;
                            const endHour = Math.floor(endTime);
                            const endMin = Math.round((endTime - endHour) * 60);
                            
                            // Dropdown menu logic
                            const isMenuOpen = openMenuTaskId === task.id;
                            
                            return (
                              <div
                                key={task.id}
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
                                onClick={() => {
                                  setSelectedEvent(task.fullEvent);
                                  setShowTeamInfo(true);
                                }}
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
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: -4 }}>
                                      {task.members && task.members.slice(0, 3).map((member: string, idx: number) => (
                                        <Image
                                          key={idx}
                                          src={member} 
                                          alt="member"
                                          title="Team member"
                                          width={28}
                                          height={28}
                                          style={{ 
                                            borderRadius: '50%', 
                                            border: `2px solid ${task.backgroundColor || '#D8D5F0'}`,
                                            marginLeft: idx > 0 ? -8 : 0
                                          }} 
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
                                    {task.fullEvent?.owner === currentUserId && (
                                      <span style={{ fontSize: 10, color: '#7C3AED', fontWeight: 600 }}>
                                        Owner
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div style={{ position: 'relative' }}>
                                    <button
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                      onClick={e => {
                                        e.stopPropagation();
                                        setOpenMenuTaskId(isMenuOpen ? null : task.id);
                                      }}
                                    >
                                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <circle cx="10" cy="5" r="1.5" fill="#4A4A4A"/>
                                        <circle cx="10" cy="10" r="1.5" fill="#4A4A4A"/>
                                        <circle cx="10" cy="15" r="1.5" fill="#4A4A4A"/>
                                      </svg>
                                    </button>
                                    {isMenuOpen && (
                                      <div
                                        style={{
                                          position: 'absolute',
                                          top: 28,
                                          right: 0,
                                          minWidth: 150,
                                          background: '#FFF',
                                          borderRadius: 10,
                                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                          border: '1px solid #E0E0E0',
                                          zIndex: 10,
                                          padding: '8px 0',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 2
                                        }}
                                      >
                                        <button
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#222',
                                            fontWeight: 500,
                                            fontSize: 15,
                                            padding: '8px 16px',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            borderRadius: 8,
                                            transition: 'background 0.2s',
                                          }}
                                          onClick={e => {
                                            e.stopPropagation();
                                            setOpenMenuTaskId(null);
                                            setSelectedEvent(task.fullEvent);
                                            setShowTeamInfo(true);
                                          }}
                                        >View Team Info</button>
                                        <button
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#222',
                                            fontWeight: 500,
                                            fontSize: 15,
                                            padding: '8px 16px',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            borderRadius: 8,
                                            transition: 'background 0.2s',
                                          }}
                                          onClick={e => {
                                            e.stopPropagation();
                                            setOpenMenuTaskId(null);
                                            setTaskToEdit(task.fullEvent);
                                            setShowEditTask(true);
                                          }}
                                        >Edit Task</button>
                                        {task.fullEvent?.owner === currentUserId && (
                                          <button
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              color: '#7C3AED',
                                              fontWeight: 500,
                                              fontSize: 15,
                                              padding: '8px 16px',
                                              textAlign: 'left',
                                              cursor: 'pointer',
                                              borderRadius: 8,
                                              transition: 'background 0.2s',
                                            }}
                                            onClick={e => {
                                              e.stopPropagation();
                                              setOpenMenuTaskId(null);
                                              setTaskToChangeAdmin(task.fullEvent);
                                              setShowChangeAdmin(true);
                                            }}
                                          >Change Admin</button>
                                        )}
                                        <button
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#F44336',
                                            fontWeight: 500,
                                            fontSize: 15,
                                            padding: '8px 16px',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            borderRadius: 8,
                                            transition: 'background 0.2s',
                                          }}
                                          onClick={e => {
                                            e.stopPropagation();
                                            setOpenMenuTaskId(null);
                                            deleteTask(task.id);
                                          }}
                                        >Delete Task</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                    </div>
                </div>
            </main>
        </div>
      </div>

      {/* Calendar Popup */}
      {showCalendarPopup && (
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
                        zIndex: 1000,
                        background: 'rgba(0,0,0,0.04)',
                    }}
                >
                    <div
                        style={{
                            borderRadius: 24,
                            background: '#FFF',
                            boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.20), 35px 45px 73px 0 rgba(32, 32, 35, 0.07)',
                            width: 375,
                            padding: '16px 34px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 16,
                            position: 'relative',
                        }}
                    >
                        {/* Maximise icon above header */}
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                            <button style={{ background: '#FFF', border: 'none', cursor: 'pointer', padding: 0, borderRadius: '50%' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="49" height="33" viewBox="0 0 49 33" fill="none">
                                  <g filter="url(#filter0_d_3313_7451)">
                                    <path d="M30.3333 16.3333L37 23M37 23V17.4444M37 23H31.4444M30.3333 9.66667L37 3M37 3V8.55556M37 3H31.4444M17 17.4444V23M17 23H22.5556M17 23L23.6667 16.3333M17 8.55556V3M17 3H22.5556M17 3L23.6667 9.66667" stroke="black" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" shape-rendering="crispEdges"/>
                                  </g>
                                  <defs>
                                    <filter id="filter0_d_3313_7451" x="0.200012" y="-11.8008" width="53.6" height="53.6016" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                      <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                                      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                                      <feOffset dy="2"/>
                                      <feGaussianBlur stdDeviation="8"/>
                                      <feComposite in2="hardAlpha" operator="out"/>
                                      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.24 0"/>
                                      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_3313_7451"/>
                                      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_3313_7451" result="shape"/>
                                    </filter>
                                  </defs>
                                </svg>
                            </button>
                        </div>
                        {/* Calendar header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 8 }}>
                            <button onClick={goToPreviousMonth} style={{ background: 'none', border: 'none', color: '#846BD2', fontSize: 24, cursor: 'pointer', marginRight: 24 }}>&lt;</button>
                            <span style={{ fontWeight: 700, fontSize: 22, color: '#222', flex: 1, textAlign: 'center' }}>{calendarMonth} {calendarYear}</span>
                            <button onClick={goToNextMonth} style={{ background: 'none', border: 'none', color: '#846BD2', fontSize: 24, cursor: 'pointer', marginLeft: 24 }}>&gt;</button>
                        </div>
                        {/* Weekday row */}
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                            {['S','M','T','W','T','F','S'].map((d, i) => (
                                <span key={i} style={{ color: '#846BD2', fontWeight: 500, fontSize: 16, width: 32, textAlign: 'center' }}>{d}</span>
                            ))}
                        </div>
                        {/* Calendar grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, width: '100%', marginBottom: 16 }}>
                            {calendarDays.map((dayInfo, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    color: dayInfo.isCurrentMonth ? '#222' : '#C7C7C7',
                                    fontWeight: 500,
                                    fontSize: 16,
                                    width: 32,
                                    height: 32,
                                    textAlign: 'center',
                                    lineHeight: '32px',
                                    marginBottom: 2,
                                    cursor: 'pointer',
                                    borderRadius: '50%',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (dayInfo.isCurrentMonth) {
                                      e.currentTarget.style.background = '#EFEDFA';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  {dayInfo.day}
                                </span>
                            ))}
                        </div>
                        {/* Footer buttons */}
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <button onClick={() => setShowCalendarPopup(false)} style={{ background: 'none', border: 'none', color: '#222', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={() => setShowCalendarPopup(false)} style={{ background: '#846BD2', color: '#FFF', fontWeight: 600, fontSize: 16, border: 'none', borderRadius: 20, padding: '8px 32px', cursor: 'pointer' }}>Done</button>
                        </div>
                    </div>
                </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
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
                        style={{
                            borderRadius: 24,
                            background: '#FFF',
                            boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.20), 35px 45px 73px 0 rgba(32, 32, 35, 0.07)',
                            width: 480,
                            padding: '32px 32px 24px 32px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: 18,
                            position: 'relative',
                        }}
                    >
                        {/* Close icon */}
                        <button onClick={() => setShowCreateTask(false)} style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', fontSize: 22, color: '#222', cursor: 'pointer' }}>&times;</button>
                        <div style={{ fontWeight: 600, fontSize: 18, color: '#7B8794', marginBottom: 8 }}>Create Task</div>
                        <input 
                          type="text"
                          placeholder="Task Title"
                          value={newTask.title}
                          onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                          style={{ width: '100%', fontWeight: 700, fontSize: 22, color: '#222', border: 'none', outline: 'none', marginBottom: 8 }}
                        />
                        
                        {/* Project Selection */}
                        <div style={{ width: '100%', marginBottom: 8 }}>
                          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#7B8794', marginBottom: 4 }}>
                            Select Project
                          </label>
                          <select
                            value={selectedProjectForTask}
                            onChange={(e) => setSelectedProjectForTask(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #E0E0E0',
                              borderRadius: 8,
                              fontSize: 15,
                              fontWeight: 500,
                              color: '#222',
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">No Project (Optional)</option>
                            {allProjects.map((project) => (
                              <option key={project._id} value={project._id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
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
                                <select value={newTask.day} onChange={(e) => setNewTask({...newTask, day: e.target.value})} style={{ border: 'none', outline: 'none', fontSize: 15, fontWeight: 500 }}>
                                  {daysOfWeek.map(day => <option key={day} value={day}>{day}</option>)}
                                </select>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, fontSize: 15, color: '#222' }}>
                                <input
                                  type="time"
                                  value={newTask.startTime}
                                  onChange={(e) => setNewTask({...newTask, startTime: e.target.value})}
                                  style={{ border: 'none', outline: 'none', fontSize: 15, fontWeight: 500 }}
                                />
                                <span>-</span>
                                <input
                                  type="time"
                                  value={newTask.endTime}
                                  onChange={(e) => setNewTask({...newTask, endTime: e.target.value})}
                                  style={{ border: 'none', outline: 'none', fontSize: 15, fontWeight: 500 }}
                                />
                            </label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 12, marginBottom: 8 }}>
                            <span style={{ fontWeight: 500, fontSize: 15, color: '#222', marginRight: 8 }}>Label</span>
                            <span 
                              onClick={() => setNewTask({...newTask, label: 'High'})}
                              style={{ 
                                background: '#D9B4C7', 
                                color: '#000', 
                                fontWeight: 600, 
                                fontSize: 13, 
                                borderRadius: '21.913px', 
                                padding: '5px 14px', 
                                cursor: 'pointer',
                                border: newTask.label === 'High' ? '3.652px solid #E893BF' : '3.652px solid transparent'
                              }}
                            >High</span>
                            <span 
                              onClick={() => setNewTask({...newTask, label: 'Medium'})}
                              style={{ 
                                background: '#FFD3B5', 
                                color: '#000', 
                                fontWeight: 600, 
                                fontSize: 13, 
                                borderRadius: '21.913px', 
                                padding: '5px 14px', 
                                cursor: 'pointer',
                                border: newTask.label === 'Medium' ? '3.652px solid #F8B689' : '3.652px solid transparent'
                              }}
                            >Medium</span>
                            <span 
                              onClick={() => setNewTask({...newTask, label: 'Low'})}
                              style={{ 
                                background: '#FFF9C4', 
                                color: '#000', 
                                fontWeight: 600, 
                                fontSize: 13, 
                                borderRadius: '21.913px', 
                                padding: '5px 14px', 
                                cursor: 'pointer',
                                border: newTask.label === 'Low' ? '3.652px solid #FDEE72' : '3.652px solid transparent'
                              }}
                            >Low</span>
                            <span 
                              onClick={() => setNewTask({...newTask, label: 'Stand-by'})}
                              style={{ 
                                background: '#A8DADC', 
                                color: '#000', 
                                fontWeight: 600, 
                                fontSize: 13, 
                                borderRadius: '21.913px', 
                                padding: '5px 14px', 
                                cursor: 'pointer',
                                border: newTask.label === 'Stand-by' ? '3.652px solid #8DE7EA' : '3.652px solid transparent'
                              }}
                            >Stand-by</span>
                        </div>
                        <textarea 
                          placeholder="Description" 
                          value={newTask.description}
                          onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                          style={{ width: '100%', minHeight: 160, borderRadius: 12, border: '1px solid #E0E0E0', padding: 12, fontSize: 14, fontWeight: 500, color: '#222', marginBottom: 12, resize: 'none', outline: 'none' }} 
                        />
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <button onClick={() => {
                              setShowCreateTask(false);
                              setNewTask({ title: '', description: '', date: '', startTime: '', endTime: '', day: 'Monday', label: 'Medium', members: [], projectId: '' });
                              setSelectedProjectForTask('');
                            }} style={{ background: '#FFF', color: '#222', fontWeight: 600, fontSize: 15, border: '1.5px solid #B39DDB', borderRadius: 12, padding: '10px 24px', cursor: 'pointer' }}>Discard</button>
                            <button onClick={async () => {
                              if (newTask.title && newTask.startTime && newTask.endTime) {
                                const [startHour, startMin] = newTask.startTime.split(':').map(Number);
                                const [endHour, endMin] = newTask.endTime.split(':').map(Number);
                                const startTimeDecimal = startHour + startMin / 60;
                                const endTimeDecimal = endHour + endMin / 60;
                                const duration = endTimeDecimal - startTimeDecimal;
                                
                                const taskData = {
                                  title: newTask.title,
                                  description: newTask.description,
                                  day: newTask.day,
                                  startTime: startTimeDecimal,
                                  duration: duration,
                                  label: newTask.label,
                                  members: newTask.members
                                };
                                
                                addTask(taskData);
                                
                                // If project is selected, create task via API
                                if (selectedProjectForTask) {
                                  try {
                                    await projectsAPI.createTask(selectedProjectForTask, {
                                      title: newTask.title,
                                      description: newTask.description,
                                      taskStatus: 'To Be Done',
                                      priority: newTask.label || 'Medium',
                                      timeTracker: 'Start',
                                      startDate: newTask.date,
                                      day: newTask.day,
                                      startTime: startTimeDecimal,
                                      duration: duration,
                                    });
                                    toast({ title: "Success", description: `Task added to project and calendar` });
                                  } catch (error) {
                                    console.error('Failed to create project task:', error);
                                    toast({ title: "Warning", description: "Task added to calendar but failed to add to project", variant: "destructive" });
                                  }
                                } else {
                                  toast({ title: "Success", description: "Task added to calendar" });
                                }
                                
                                setShowCreateTask(false);
                                setNewTask({ title: '', description: '', date: '', startTime: '', endTime: '', day: 'Monday', label: 'Medium', members: [], projectId: '' });
                                setSelectedProjectForTask('');
                              } else {
                                toast({ title: "Missing Information", description: "Please fill in title and time", variant: "destructive" });
                              }
                            }} style={{ background: '#846BD2', color: '#FFF', fontWeight: 600, fontSize: 15, border: 'none', borderRadius: 12, padding: '10px 24px', cursor: 'pointer' }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

      {/* Team Info Modal */}
      {showTeamInfo && selectedEvent && (
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
            zIndex: 1003,
            background: 'rgba(0,0,0,0.3)',
          }}
          onClick={() => setShowTeamInfo(false)}
        >
          <div
            style={{
              borderRadius: 24,
              background: '#FFF',
              boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.20)',
              width: 480,
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowTeamInfo(false)}
              style={{
                position: 'absolute',
                top: 24,
                right: 24,
                background: 'none',
                border: 'none',
                fontSize: 24,
                color: '#222',
                cursor: 'pointer',
                fontWeight: 300,
              }}
            >
              &times;
            </button>

            {/* Task Info */}
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#222', marginBottom: 8 }}>
                {selectedEvent.title}
              </h2>
              <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
                {selectedEvent.description || 'No description'}
              </p>
              <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 16, background: LABEL_BG_COLORS[selectedEvent.label] || '#D8D5F0', fontSize: 13, fontWeight: 600 }}>
                {selectedEvent.label || 'Medium'}
              </div>
            </div>

            {/* Team Info */}
            <div style={{ borderTop: '1px solid #E0E0E0', paddingTop: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#222', marginBottom: 16 }}>
                Team Information
              </h3>
              
              {/* Owner & Admin */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: '#666', fontWeight: 500 }}>Owner:</span>
                  <span style={{ fontSize: 14, color: '#222', fontWeight: 600 }}>
                    {selectedEvent.owner === currentUserId ? 'You' : 'User ID: ' + selectedEvent.owner}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: '#666', fontWeight: 500 }}>Admin:</span>
                  <span style={{ fontSize: 14, color: '#222', fontWeight: 600 }}>
                    {selectedEvent.admin === currentUserId ? 'You' : 'User ID: ' + selectedEvent.admin}
                  </span>
                </div>
              </div>

              {/* Team Members */}
              <div>
                <div style={{ fontSize: 14, color: '#666', fontWeight: 500, marginBottom: 12 }}>
                  Team Members ({selectedEvent.members?.length || 0}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {selectedEvent.members && selectedEvent.members.map((member: string, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        background: '#F5F5F5',
                        borderRadius: 8,
                      }}
                    >
                      <Image
                        src={member}
                        alt="member"
                        width={32}
                        height={32}
                        style={{
                          borderRadius: '50%',
                        }}
                      />
                      <span style={{ fontSize: 13, color: '#222', fontWeight: 500 }}>
                        Member {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Change Admin button (only for owner) */}
              {selectedEvent.owner === currentUserId && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #E0E0E0' }}>
                  <Button
                    onClick={() => {
                      setTaskToChangeAdmin(selectedEvent);
                      setShowChangeAdmin(true);
                    }}
                    style={{
                      width: '100%',
                      background: '#7C3AED',
                      color: '#FFF',
                      fontWeight: 600,
                      padding: '12px',
                      borderRadius: 12,
                    }}
                  >
                    Change Team Admin
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All Task View */}
      {showAllTask && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 1002,
            background: '#FFF',
          }}
        >
          <AllTasksPage onClose={() => setShowAllTask(false)} />
        </div>
      )}

      {/* Member Selection Modal for Create Task */}
      <MemberSelectionModal
        isOpen={showMemberSelection}
        onClose={() => setShowMemberSelection(false)}
        selectedMembers={newTask.members}
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

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={showEditTask}
        onClose={() => {
          setShowEditTask(false);
          setTaskToEdit(null);
        }}
        task={taskToEdit}
        onSave={handleEditTaskSave}
      />

      {/* Change Admin Modal */}
      <ChangeAdminModal
        isOpen={showChangeAdmin}
        onClose={() => {
          setShowChangeAdmin(false);
          setTaskToChangeAdmin(null);
        }}
        task={taskToChangeAdmin}
        currentUserId={currentUserId}
        onChangeAdmin={changeAdmin}
      />
    </div>
  );
}
