"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pencil,
  Share,
  Equal,
  MoreHorizontal,
  MessageSquare,
  Paperclip,
  CheckSquare,
  ChevronLeft,
  Menu,
  Search,
  ChevronDown,
  Loader2,
  Plus,
  X,
  Trash2,
  Clock,
} from "lucide-react";
import { projectsAPI, tasksAPI } from "@/lib/api";
import { toast } from "react-hot-toast";
import { format, isToday, isThisWeek, isThisMonth, isThisYear, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isFuture, addHours } from "date-fns";

interface Project {
  _id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  members: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  }[];
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
}

interface Reminder {
  _id: string;
  title: string;
  time: string;
  dueDate: Date;
  taskId?: string;
}

type TimeView = 'Today' | 'Week' | 'Month' | 'Year';

// --- Time View Selector Component ---
const TimeViewSelector = ({ 
  selectedView, 
  onViewChange 
}: { 
  selectedView: TimeView; 
  onViewChange: (view: TimeView) => void;
}) => {
  const views: TimeView[] = ['Today', 'Week', 'Month', 'Year'];
  
  return (
    <div 
      className="inline-flex rounded-full p-1 bg-gray-100"
      style={{
        border: '1px solid #E6E6E6',
      }}
    >
      {views.map((view) => (
        <button
          key={view}
          onClick={() => onViewChange(view)}
          className={`
            px-6 py-2 rounded-full text-sm font-medium transition-all
            ${selectedView === view 
              ? 'bg-black text-white shadow-sm' 
              : 'bg-transparent text-gray-600 hover:text-gray-900'
            }
          `}
        >
          {view}
        </button>
      ))}
    </div>
  );
};

// --- VIEW 1: Project List (Child Component) [MODIFIED] ---
// Padding is removed from this component; it's now handled by DashboardView
const ProjectListView = ({
  projects,
  isLoading,
  onProjectSelect,
  selectedTimeView,
  onTimeViewChange
}: {
  projects: Project[];
  isLoading: boolean;
  onProjectSelect: (id: string) => void;
  selectedTimeView: TimeView;
  onTimeViewChange: (view: TimeView) => void;
}) => {
  const router = useRouter();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
        className="flex-shrink-0 flex flex-col"
        style={{
            minWidth: 0,
            width: '100%',
            maxWidth: '1400px',
            margin: '0 auto',
            borderRadius: '24px',
            border: '1px solid #DDD',
            background: '#FFF',
            padding: '24px',
            flexGrow: 1,
            height: '100%',
        }}
    >
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Project Lists</h2>
            <div className="flex items-center space-x-4">
                <TimeViewSelector 
                  selectedView={selectedTimeView}
                  onViewChange={onTimeViewChange}
                />
            </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <p className="text-lg mb-4">No projects yet</p>
          </div>
        ) : (
          <div
              className="flex-1 space-y-4 overflow-y-auto"
              style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  minWidth: 0,
              }}
          >
              {projects.map((project) => (
                  <div
                      key={project._id}
                      onClick={() => onProjectSelect(project._id)}
                      className="cursor-pointer"
                      style={{
                          height: '104px',
                          flexShrink: 0,
                          alignSelf: 'stretch',
                      }}
                  >
                      <Card className="bg-white border hover:shadow-md transition-shadow rounded-lg h-full">
                          <CardContent className="p-4 h-full flex items-center">
                              <div className="flex items-center justify-between w-full">
                                  <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-800">{project.name}</h3>
                                        <Badge
                                          variant="outline"
                                          className={
                                            project.status === 'active'
                                              ? 'bg-green-50 text-green-700 border-green-200'
                                              : project.status === 'completed'
                                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                                              : 'bg-gray-50 text-gray-700 border-gray-200'
                                          }
                                        >
                                          {project.status}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-gray-500 mb-2">
                                        {project.description || 'No description'}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        Created {format(new Date(project.createdAt), 'dd MMM, yyyy')} by {project.createdBy.name}
                                      </p>
                                  </div>
                                  <div className="flex -space-x-2">
                                      {project.members && project.members.length > 0 ? (
                                        <>
                                          {project.members.slice(0, 4).map((member) => (
                                              <Avatar key={member._id} className="w-8 h-8 border-2 border-white">
                                                  <AvatarImage src={member.avatar} alt={member.name} />
                                                  <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                              </Avatar>
                                          ))}
                                          {project.members.length > 4 && (
                                            <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium">
                                              +{project.members.length - 4}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <div className="text-xs text-gray-400">No members</div>
                                      )}
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                  </div>
              ))}
          </div>
        )}
    </div>
  );
};


// --- Dashboard View (Main View Wrapper) [MODIFIED] ---
// This component now controls the overall padding and header layout to match the image.
const DashboardView = ({
  projects,
  isLoading,
  onProjectSelect,
  selectedTimeView,
  onTimeViewChange
}: {
  projects: Project[];
  isLoading: boolean;
  onProjectSelect: (id: string) => void;
  selectedTimeView: TimeView;
  onTimeViewChange: (view: TimeView) => void;
}) => {
  // Filter projects based on selected time view
  const filteredProjects = projects.filter((project) => {
    const projectDate = new Date(project.createdAt);
    
    switch (selectedTimeView) {
      case 'Today':
        return isToday(projectDate);
      case 'Week':
        return isThisWeek(projectDate, { weekStartsOn: 0 }); // Sunday as start of week
      case 'Month':
        return isThisMonth(projectDate);
      case 'Year':
        return isThisYear(projectDate);
      default:
        return true;
    }
  });

  return (
    <div className="p-8 flex-1">
      {/* Dashboard Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        </div>
        <div
          className="relative flex-shrink-0"
          style={{
            width: '457px',
            height: '40px',
          }}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search"
            className="pl-11 bg-white h-full w-full"
            style={{
              borderRadius: '24px',
              border: '1px solid #E6E6E6',
              background: '#FFF',
              boxShadow: '0 4px 4px 0 rgba(221, 221, 221, 0.25)',
            }}
          />
        </div>
      </header>
      {/* Project List Content */}
      <ProjectListView
        projects={filteredProjects}
        isLoading={isLoading}
        onProjectSelect={onProjectSelect}
        selectedTimeView={selectedTimeView}
        onTimeViewChange={onTimeViewChange}
      />
    </div>
  );
};

// --- Add Reminder Modal ---
const AddReminderModal = ({
  isOpen,
  onClose,
  onAdd
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string, dueDate: string, time: string) => void;
}) => {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = () => {
    if (!title || !dueDate || !time) {
      toast.error('Please fill all fields');
      return;
    }
    onAdd(title, dueDate, time);
    setTitle('');
    setDueDate('');
    setTime('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-96 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add Reminder</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Reminder title"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Time</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} className="flex-1">Add Reminder</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Manage Reminders Modal ---
const ManageRemindersModal = ({
  isOpen,
  onClose,
  reminders,
  onDelete
}: {
  isOpen: boolean;
  onClose: () => void;
  reminders: Reminder[];
  onDelete: (id: string) => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-[500px] max-h-[600px] shadow-lg overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Manage Reminders</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        {reminders.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No reminders yet</p>
        ) : (
          <div className="space-y-2">
            {reminders.map((reminder) => (
              <div key={reminder._id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-700">{reminder.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-500">{reminder.time}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(reminder._id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Reminders Sidebar ---
const RemindersSidebar = ({
  reminders,
  onAddClick,
  onManageClick
}: {
  reminders: Reminder[];
  onAddClick: () => void;
  onManageClick: () => void;
}) => (
    <aside className="w-80 flex-shrink-0 bg-white border-l p-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-lg">Reminders</h2>
            <Button
              variant="link"
              className="p-0 h-auto text-gray-600 hover:text-black"
              onClick={onManageClick}
            >
              Manage &gt;
            </Button>
        </div>
        <div className="space-y-4">
            {reminders.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No reminders</p>
            ) : (
              reminders.slice(0, 5).map(r => (
                  <div key={r._id} className="flex justify-between items-center p-3 border rounded-lg bg-slate-50/50">
                      <p className="font-medium text-sm text-gray-700">{r.title}</p>
                      <p className="text-xs text-gray-500">{r.time}</p>
                  </div>
              ))
            )}
        </div>
        <Button
          variant="outline"
          className="w-full mt-6 border-dashed border-gray-300 text-gray-500 hover:text-black hover:bg-slate-50"
          onClick={onAddClick}
        >
          Add reminders
        </Button>
    </aside>
);


// --- PARENT COMPONENT ---
export const ProjectList = () => {
    const router = useRouter();
    const [currentView, setCurrentView] = useState('project-list');
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [selectedTimeView, setSelectedTimeView] = useState<TimeView>('Today');
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [showAddReminderModal, setShowAddReminderModal] = useState(false);
    const [showManageRemindersModal, setShowManageRemindersModal] = useState(false);

    // Fetch projects and reminders on mount
    useEffect(() => {
      loadProjects();
      loadReminders();
    }, []);

    const loadProjects = async () => {
      setIsLoading(true);
      try {
        const data = await projectsAPI.getAll();
        setProjects(data);
      } catch (error: any) {
        console.error('Failed to load projects:', error);
        toast.error('Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    };

    const loadReminders = async () => {
      try {
        // Fetch all tasks and filter for upcoming ones
        const allTasks = await tasksAPI.getAll();

        // Convert tasks with due dates/times to reminders
        const taskReminders: Reminder[] = allTasks
          .filter((task: any) => {
            // Filter for tasks that have both dueDate and startTime
            if (!task.dueDate || task.startTime === undefined) return false;

            // Only show tasks that are not completed
            if (task.status === 'completed') return false;

            return true;
          })
          .map((task: any) => {
            const dueDate = task.dueDate ? parseISO(task.dueDate) : new Date();

            // startTime is a decimal number (e.g., 9.5 for 9:30 AM)
            const startTimeDecimal = typeof task.startTime === 'number' ? task.startTime : 9;
            const hours = Math.floor(startTimeDecimal);
            const minutes = Math.round((startTimeDecimal - hours) * 60);

            const reminderDate = new Date(dueDate);
            reminderDate.setHours(hours, minutes);

            return {
              _id: task._id,
              title: task.title,
              time: format(reminderDate, 'h:mm a'),
              dueDate: reminderDate,
              taskId: task._id
            };
          })
          .filter((reminder: Reminder) => {
            const now = new Date();
            // Show reminders that are today or in the future
            return reminder.dueDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
          })
          .sort((a: Reminder, b: Reminder) => a.dueDate.getTime() - b.dueDate.getTime());

        setReminders(taskReminders);
      } catch (error: any) {
        console.error('Failed to load reminders:', error);
      }
    };

    const handleAddReminder = async (title: string, dueDate: string, time: string) => {
      try {
        // Create a new task that will act as a reminder
        const [hours, minutes] = time.split(":");
        const startTimeDecimal = parseInt(hours) + parseInt(minutes) / 60;
        const duration = 1; // Default 1 hour duration

        const task = await tasksAPI.create({
          title,
          dueDate,
          startTime: startTimeDecimal,
          duration,
          status: "todo",
          description: "Reminder",
        });

        // Optimistically update reminders state
        const reminderDate = new Date(dueDate);
        reminderDate.setHours(parseInt(hours), parseInt(minutes));
        const newReminder = {
          _id: task._id,
          title,
          time: time.match(/^\d{1,2}:[0-5][0-9]$/) ?
            new Date(reminderDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : time,
          dueDate: reminderDate,
          taskId: task._id,
        };
        setReminders((prev) =>
          [...prev, newReminder]
            .filter((reminder) => {
              const now = new Date();
              return reminder.dueDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
            })
            .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        );

        toast.success("Reminder added successfully");
        // Optionally, sync with backend in background
        // loadReminders();
      } catch (error: any) {
        console.error("Failed to add reminder:", error);
        toast.error(error.message || "Failed to add reminder");
      }
    };

    const handleDeleteReminder = async (id: string) => {
      try {
        await tasksAPI.delete(id);
        toast.success('Reminder deleted');
        loadReminders(); // Reload reminders
      } catch (error: any) {
        console.error('Failed to delete reminder:', error);
        toast.error('Failed to delete reminder');
      }
    };

    const handleProjectSelect = (projectId: string) => {
  setSelectedProjectId(projectId);
  router.push(`/project-detail/${projectId}/tasks`);
    };

    // NOTE: The components for other views are not included here for brevity,
    // but they would be the same as in your original code.
    // --- Assume ProjectTaskDetailView, ProjectTaskListView, and MyTaskBoard components exist ---
    const detailTask = { id: 1, taskName: "Research and Userflow", assignee: { name: "Assignee name", avatar: "https://i.pravatar.cc/150?u=assignee" }, createdOn: "29 Aug, 2025", priority: "eg: High", timeTracker: "eg: 00:00", status: "eg: Completed"};
    const listTaskTemplate = { taskName: "Research and Userflow", assignee: { name: "Assignee name", avatar: "https://i.pravatar.cc/150?u=assignee" }, createdOn: "29 Aug, 2025", priority: "Medium", timeTracker: "", status: "Completed", };
    const listTasks = Array.from({ length: 20 }, (_, i) => ({ ...listTaskTemplate, id: i + 1 }));
    const boardData = [ { id: "col-1", title: "Team Tasks", subtitle: "Need to do ASAP", createdAt: "3 June 2025 at 9:00 AM", tasks: [ { id: "task-1", title: "Create backup strategy for backend.", status: "In Progress", comments: 1, attachments: 6, checklists: { total: 8, completed: 2 }, assignee: { avatar: "https://i.pravatar.cc/150?u=a" } }, { id: "task-2", title: "Fix login button alignment.", status: "Completed", comments: 3, attachments: 2, checklists: { total: 5, completed: 5 }, assignee: { avatar: "https://i.pravatar.cc/150?u=b" } }, { id: "task-3", title: "API documentation for user endpoints.", status: "Overdue", comments: 0, attachments: 1, checklists: { total: 10, completed: 4 }, assignee: { avatar: "https://i.pravatar.cc/150?u=c" } }, ], }, { id: "col-2", title: "Ideas to vote on", subtitle: "Upcoming", createdAt: "3 June 2025 at 9:00 AM", tasks: [ { id: "task-5", title: "Add a task-specific announcement feature.", status: "", comments: 8, attachments: 2, checklists: { total: 3, completed: 0 }, assignee: { avatar: "https://i.pravatar.cc/150?u=e" } }, { id: "task-6", title: "Add the ability to duplicate and replace tasks.", status: "", comments: 5, attachments: 1, checklists: { total: 1, completed: 0 }, assignee: { avatar: "https://i.pravatar.cc/150?u=f" } }, ], }, { id: "col-3", title: "Normal Tasks", subtitle: "Have more time", createdAt: "3 June 2025 at 9:00 AM", tasks: [ { id: "task-9", title: "Create backup strategy for backend.", status: "Completed", comments: 1, attachments: 6, checklists: { total: 8, completed: 2 }, assignee: { avatar: "https://i.pravatar.cc/150?u=i" } }, { id: "task-10", title: "Create backup strategy for backend.", status: "Overdue", comments: 1, attachments: 6, checklists: { total: 8, completed: 2 }, assignee: { avatar: "https://i.pravatar.cc/150?u=j" } }, ], }, ];
    const ProjectTaskDetailView = ({ onBack, onNavigateToList, onNavigateToKanban }: { onBack: () => void; onNavigateToList: () => void; onNavigateToKanban: () => void; }) => { return ( <div className="flex-1 p-6 bg-white w-full"> <header className="flex items-center justify-between mb-8"> <div className="flex items-center gap-4"> <Button variant="ghost" onClick={onBack} className="p-0 h-auto text-muted-foreground hover:text-foreground"> <ChevronLeft className="w-4 h-4" /> </Button> <div className="flex items-center gap-3"> <h1 className="text-2xl font-bold text-gray-800">Swiggy - UX Design</h1> <Pencil className="w-5 h-5 text-gray-500 cursor-pointer" /> </div> <Button variant="secondary" className="font-semibold bg-gray-100 text-black" onClick={onNavigateToKanban}> Task Board </Button> </div> <div className="flex items-center gap-4"> <Avatar className="w-9 h-9"> <AvatarImage src="https://i.pravatar.cc/150?u=currentUser" /> <AvatarFallback>U</AvatarFallback> </Avatar> <Button variant="outline" className="bg-white font-semibold"> <Share className="w-4 h-4 mr-2" />Share </Button> <Button className="bg-black text-white font-semibold hover:bg-gray-800" onClick={onNavigateToList}> List View <Menu className="w-4 h-4 ml-2" /> </Button> </div> </header> <div className="w-full border rounded-lg"> <div className="grid grid-cols-[50px_2fr_1.5fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b bg-gray-50/50 text-sm font-semibold text-gray-500"> <span>No.</span><span>Tasks</span><span>Assigned by</span><span>Created on</span><span>Priority</span><span>Time Tracker</span><span>Status</span> </div> <div> <div key={detailTask.id} className="grid grid-cols-[50px_2fr_1.5fr_1fr_1fr_1fr_1fr] items-center gap-4 p-4 bg-white"> <div className="font-medium text-gray-700">{detailTask.id}</div> <div className="font-semibold text-gray-800">{detailTask.taskName}</div> <div className="flex items-center gap-2"> <Avatar className="w-7 h-7"><AvatarImage src={detailTask.assignee.avatar} /><AvatarFallback>A</AvatarFallback></Avatar> <span>{detailTask.assignee.name}</span> </div> <div className="text-gray-600">{detailTask.createdOn}</div> <div className="text-gray-600">{detailTask.priority}</div> <div className="text-gray-600">{detailTask.timeTracker}</div> <div> <Badge variant={detailTask.status === 'Completed' ? 'default' : 'secondary'} className={detailTask.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>{detailTask.status}</Badge> </div> </div> </div> </div> </div> ); };
    const ProjectTaskListView = ({ onBack, onNavigateToKanban }: { onBack: () => void; onNavigateToKanban: () => void; }) => ( <div className="flex-1 p-6 bg-white w-full"> <header className="flex items-center justify-between mb-8"> <div className="flex items-center gap-4"> <Button variant="ghost" onClick={onBack} className="p-0 h-auto text-muted-foreground hover:text-foreground"> <ChevronLeft className="w-4 h-4" /> </Button> <div className="flex items-center gap-3"> <h1 className="text-2xl font-bold text-gray-800">Swiggy - UX Design</h1> <Pencil className="w-5 h-5 text-gray-500 cursor-pointer" /> </div> <Button variant="secondary" className="font-semibold bg-gray-100 text-black" onClick={onNavigateToKanban}> Task Board </Button> </div> <div className="flex items-center gap-4"> <Avatar className="w-9 h-9"><AvatarImage src="https://i.pravatar.cc/150?u=currentUser" /><AvatarFallback>U</AvatarFallback></Avatar> <Button variant="outline" className="bg-white font-semibold"><Share className="w-4 h-4 mr-2" />Share</Button> <Button className="bg-black text-white font-semibold hover:bg-gray-800"> List View <Menu className="w-4 h-4 ml-2" /> </Button> </div> </header> <div className="w-full border rounded-lg"> <div className="grid grid-cols-[50px_2fr_1.5fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b bg-gray-50/50 text-sm font-semibold text-gray-500"> <span>No.</span><span>Tasks</span><span>Assigned by</span><span>Created on</span><span>Priority</span><span>Time Tracker</span><span>Status</span> </div> <div className="divide-y divide-gray-100"> {listTasks.map((task) => ( <div key={task.id} className="grid grid-cols-[50px_2fr_1.5fr_1fr_1fr_1fr_1fr] items-center gap-4 p-4 bg-white"> <div className="font-medium text-gray-700">{task.id}</div> <div className="font-semibold text-gray-800 flex items-center justify-between"> {task.taskName} <ChevronDown className="w-4 h-4 text-gray-400" /> </div> <div className="flex items-center gap-2"> <Avatar className="w-7 h-7"><AvatarImage src={task.assignee.avatar} /><AvatarFallback>A</AvatarFallback></Avatar> <span>{task.assignee.name}</span> </div> <div className="text-gray-600">{task.createdOn}</div> <div className="text-gray-600">{task.priority}</div> <div className="text-gray-600">{task.timeTracker}</div> <div> <Badge variant={task.status === 'Completed' ? 'default' : 'secondary'} className={task.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>{task.status}</Badge> </div> </div> ))} </div> </div> </div> );
    const StatusBadge = ({ status }: { status: string }) => { const base = "font-semibold border-none px-2.5 py-1 text-xs rounded-md"; const styles: { [key: string]: string } = { "In Progress": "bg-yellow-100 text-yellow-800", "Completed": "bg-green-100 text-green-800", "Overdue": "bg-red-100 text-red-800" }; if (!status || !styles[status]) return null; return <Badge className={`${base} ${styles[status]}`}>{status}</Badge>; };
    const TaskCard = ({ task }: { task: (typeof boardData)[0]['tasks'][0] }) => ( <Card className="bg-white rounded-lg shadow-sm border"> <CardContent className="p-4"> <div className="flex justify-between items-start mb-2"><p className="font-semibold text-sm">{task.title}</p><Avatar className="w-6 h-6"><AvatarImage src={task.assignee.avatar} /><AvatarFallback>{task.assignee.avatar?.charAt(0)}</AvatarFallback></Avatar></div> <StatusBadge status={task.status} /> <div className="flex items-center space-x-4 mt-4 text-gray-500 text-xs"> <div className="flex items-center space-x-1"><MessageSquare size={14} /><span>{task.comments}</span></div> <div className="flex items-center space-x-1"><Paperclip size={14} /><span>{task.attachments}</span></div> <div className="flex items-center space-x-1"><CheckSquare size={14} /><span>{`${task.checklists.completed}/${task.checklists.total}`}</span></div> </div> </CardContent> </Card> );
    const TaskColumn = ({ column }: { column: (typeof boardData)[0] }) => ( <div className="flex flex-col w-[350px] flex-shrink-0"> <div className="flex items-center justify-between mb-4"> <div className="flex items-center space-x-3"><Avatar className="w-8 h-8"><AvatarImage src={`https://i.pravatar.cc/150?u=${column.id}`} /><AvatarFallback>T</AvatarFallback></Avatar><div><h3 className="font-bold">{column.title}</h3><p className="text-sm text-gray-500">{column.subtitle}</p></div></div> <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-gray-500"><MoreHorizontal size={20} /></Button> </div> <p className="text-xs text-gray-400 mb-4 ml-1">Created on {column.createdAt}</p> <div className="space-y-4 flex-1">{column.tasks.map((task) => (<TaskCard key={task.id} task={task} />))}</div> </div> );
    const MyTaskBoard = ({ onBack }: { onBack: () => void; }) => ( <main className="flex-1 flex flex-col overflow-hidden bg-white"> <header className="flex items-center justify-between p-6 border-b shrink-0"> <div className="flex items-center gap-4"><Button variant="outline" onClick={onBack} className="font-semibold"><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button><h1 className="text-2xl font-bold">My Task Board</h1></div> <div className="flex items-center gap-3"><div className="flex -space-x-2"><Avatar className="w-9 h-9 border-2 border-white"><AvatarImage src="https://i.pravatar.cc/150?u=x" /></Avatar><Avatar className="w-9 h-9 border-2 border-white"><AvatarImage src="https://i.pravatar.cc/150?u=y" /></Avatar></div><Button className="font-semibold bg-primary text-primary-foreground"><Share className="w-4 h-4 mr-2" /> Share</Button></div> </header> <div className="flex-1 overflow-x-auto p-6"><div className="flex space-x-6 h-full">{boardData.map((column) => (<TaskColumn key={column.id} column={column} />))}</div></div> </main> );

    const renderCurrentView = () => {
        switch (currentView) {
            case 'task-detail':
                return <ProjectTaskDetailView
                            onBack={() => setCurrentView('project-list')}
                            onNavigateToList={() => setCurrentView('task-list')}
                            onNavigateToKanban={() => setCurrentView('kanban')}
                        />;
            case 'task-list':
                return <ProjectTaskListView
                            onBack={() => setCurrentView('project-list')}
                            onNavigateToKanban={() => setCurrentView('kanban')}
                        />;
            case 'kanban':
                return <MyTaskBoard onBack={() => setCurrentView('task-detail')} />;
            case 'project-list':
            default:
                // Use the new DashboardView for the main project list
                return <DashboardView
                  projects={projects}
                  isLoading={isLoading}
                  onProjectSelect={handleProjectSelect}
                  selectedTimeView={selectedTimeView}
                  onTimeViewChange={setSelectedTimeView}
                />;
        }
    };

    return (
        <div className="flex w-full h-screen bg-slate-50">
            {/* Main Content Area */}
            <main
                className="flex-1 flex flex-col overflow-y-auto"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
            >
                <style jsx>{`
                    main::-webkit-scrollbar {
                        display: none;
                    }
                    div::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
                {renderCurrentView()}
            </main>

            {/* Conditionally render the sidebar only for the main dashboard view */}
            {currentView === 'project-list' && (
              <RemindersSidebar
                reminders={reminders}
                onAddClick={() => setShowAddReminderModal(true)}
                onManageClick={() => setShowManageRemindersModal(true)}
              />
            )}

            {/* Modals */}
            <AddReminderModal
              isOpen={showAddReminderModal}
              onClose={() => setShowAddReminderModal(false)}
              onAdd={handleAddReminder}
            />
            <ManageRemindersModal
              isOpen={showManageRemindersModal}
              onClose={() => setShowManageRemindersModal(false)}
              reminders={reminders}
              onDelete={handleDeleteReminder}
            />
        </div>
    );
}
