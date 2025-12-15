"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/contexts/ThemeContext";
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
  const { actualTheme } = useTheme();
  return (
    <div
      className={`inline-flex rounded-full p-1 ${
        actualTheme === 'dark' ? 'bg-gray-900' : 'bg-[#FDFDFD]'}`}
      style={{
        border: '1px solid hsl(var(--border))',
      }}
    >
      {views.map((view) => (
  <button
    key={view}
    onClick={() => onViewChange(view)}
    className={`
      px-6 py-2 rounded-full text-sm font-medium transition-all
      ${selectedView === view
        ? `${actualTheme === 'dark' ? 'bg-purple-600 text-white shadow-sm' : 'bg-black text-white shadow-sm'}`
        : `${actualTheme === 'dark' ? 'bg-transparent text-gray-400 hover:text-gray-100' : 'bg-transparent text-gray-600 hover:text-gray-900'}`
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
const { actualTheme } = useTheme();
  return (
    <div
  className={`flex-shrink-0 flex flex-col w-full max-w-[1400px] mx-auto rounded-[24px] border p-6 flex-grow h-full
    ${actualTheme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
>
  {/* Header */}
  <div className="flex items-center justify-between mb-6">
    <h2 className={`text-xl font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      Project Lists
    </h2>
    <div className="flex items-center space-x-4">
      <TimeViewSelector selectedView={selectedTimeView} onViewChange={onTimeViewChange} />
    </div>
  </div>

  {/* Loading / Empty States */}
  {isLoading ? (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
    </div>
  ) : projects.length === 0 ? (
    <div className={`flex-1 flex flex-col items-center justify-center ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
      <p className="text-lg mb-4">No projects yet</p>
    </div>
  ) : (
    <div
      className="flex-1 space-y-4 overflow-y-auto"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', minWidth: 0 }}
    >
      {projects.map((project) => (
        <div
          key={project._id}
          onClick={() => onProjectSelect(project._id)}
          className="cursor-pointer"
          style={{ height: '104px', flexShrink: 0, alignSelf: 'stretch' }}
        >
          <Card
            className={`border rounded-lg h-full transition-shadow hover:shadow-md
              ${actualTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
          >
            <CardContent className="p-4 h-full flex items-center">
              <div className="flex items-center justify-between w-full">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`${actualTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'} font-semibold`}>
                      {project.name}
                    </h3>
                    <Badge
                      variant="outline"
                      className={
                        project.status === 'active'
                          ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700'
                          : project.status === 'completed'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700'
                          : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                      }
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <p className={`${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm mb-2`}>
                    {project.description || 'No description'}
                  </p>
                  <p className={`${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'} text-xs`}>
                    Created {format(new Date(project.createdAt), 'dd MMM, yyyy')} by {project.createdBy.name}
                  </p>
                </div>
               <div className="flex items-center">
  {project.members.slice(0, 4).map((member, index) => (
    <div
      key={member._id}
      className={`
        relative
        ${index !== 0 ? "-ml-3" : ""}
        rounded-full
        border-2
        ${
          actualTheme === "dark"
            ? "border-gray-600 bg-gray-900"
            : "border-black bg-white"
        }
      `}
      style={{ zIndex: 10 - index }}
    >
      <Avatar className="w-8 h-8">
        <AvatarImage src={member.avatar} alt={member.name} />
        <AvatarFallback>
          {getInitials(member.name)}
        </AvatarFallback>
      </Avatar>
    </div>
  ))}

  {project.members.length > 4 && (
    <div
      className={`
        -ml-3 w-8 h-8 flex items-center justify-center text-xs font-medium rounded-full
        border-2
        ${
          actualTheme === "dark"
            ? "border-gray-600 bg-gray-800 text-gray-300"
            : "border-black bg-gray-200 text-gray-800"
        }
      `}
    >
      +{project.members.length - 4}
    </div>
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
  // Show all projects - time view is just for display purposes
  const filteredProjects = projects;
   const { actualTheme } = useTheme();
  return (
    <div className="p-8 flex-1">
  {/* Dashboard Header */}
  <header className="flex items-center justify-between mb-8">
    <div className="flex items-center">
      <h1 className={`text-3xl font-bold ${actualTheme === 'dark' ? 'text-white-100' : 'text-black-800'}`}>
        Dashboard
      </h1>
    </div>

    <div
      className="relative flex-shrink-0"
      style={{
        width: '457px',
        height: '40px',
      }}
    >
      <Search
        className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5
          ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
      />
      <Input
        placeholder="Search"
        className={`pl-11 h-full w-full border rounded-full
          ${actualTheme === 'dark' 
            ? 'bg-gray-800 text-gray-100 border-gray-700' 
            : 'bg-white text-gray-900 border-gray-200'}`}
        style={{
          borderRadius: '24px',
          boxShadow: '0 4px 4px 0 rgba(0, 0, 0, 0.05)',
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
    actualTheme={actualTheme} // Pass theme to ProjectListView
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
  const { actualTheme } = useTheme();
  return (
   <div
  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  onClick={onClose}
>
  <div
    className={`rounded-xl p-6 w-96 shadow-lg 
      ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
    onClick={(e) => e.stopPropagation()}
  >
    {/* Header */}
    <div className="flex justify-between items-center mb-4">
      <h3 className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
        Add Reminder
      </h3>
      <Button variant="ghost" size="icon" onClick={onClose}>
        <X className={`w-4 h-4 ${actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`} />
      </Button>
    </div>

    {/* Form */}
    <div className="space-y-4">
      <div>
        <Label className={`${actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Reminder title"
          className={`mt-1 ${actualTheme === 'dark' ? 'bg-gray-700 text-gray-100 border-gray-600' : 'bg-white text-gray-900 border-gray-200'}`}
        />
      </div>

      <div>
        <Label className={`${actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Date</Label>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={`mt-1 ${actualTheme === 'dark' ? 'bg-gray-700 text-gray-100 border-gray-600' : 'bg-white text-gray-900 border-gray-200'}`}
        />
      </div>

      <div>
        <Label className={`${actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Time</Label>
        <Input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className={`mt-1 ${actualTheme === 'dark' ? 'bg-gray-700 text-gray-100 border-gray-600' : 'bg-white text-gray-900 border-gray-200'}`}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={onClose}
          className={`flex-1 ${actualTheme === 'dark' ? 'border-gray-600 text-gray-100 hover:bg-gray-700' : ''}`}
        >
          Cancel
        </Button>
        <Button className={`flex-1 ${actualTheme === 'dark' ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}`} onClick={handleSubmit}>
          Add Reminder
        </Button>
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
const { actualTheme } = useTheme();
  return (
   <div
  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  onClick={onClose}
>
  <div
    className={`rounded-xl p-6 w-[500px] max-h-[600px] shadow-lg overflow-y-auto
      ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
    onClick={(e) => e.stopPropagation()}
  >
    {/* Header */}
    <div className="flex justify-between items-center mb-4">
      <h3 className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
        Manage Reminders
      </h3>
      <Button variant="ghost" size="icon" onClick={onClose}>
        <X className={`w-4 h-4 ${actualTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`} />
      </Button>
    </div>

    {/* Empty state */}
    {reminders.length === 0 ? (
      <p className={`text-sm text-center py-8 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        No reminders yet
      </p>
    ) : (
      <div className="space-y-2">
        {reminders.map((reminder) => (
          <div
            key={reminder._id}
            className={`flex justify-between items-center p-3 border rounded-lg transition-colors
              ${actualTheme === 'dark'
                ? 'border-gray-700 hover:bg-gray-700 text-gray-300'
                : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
          >
            <div className="flex-1">
              <p className="font-medium text-sm">{reminder.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className={`w-3 h-3 ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                <p className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{reminder.time}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(reminder._id)}
              className={`text-red-500 hover:text-red-700 hover:bg-red-50`}
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
  onManageClick,
  actualTheme
}: {
  reminders: Reminder[];
  onAddClick: () => void;
  onManageClick: () => void;
  actualTheme: "light" | "dark";
}) => (
  <aside
    className={`w-80 flex-shrink-0 p-6 border-l ${
      actualTheme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
    }`}
  >
    {/* Header */}
    <div className="flex justify-between items-center mb-6">
      <h2
        className={`font-semibold text-lg ${
          actualTheme === "dark" ? "text-gray-100" : "text-gray-900"
        }`}
      >
        Reminders
      </h2>
      <Button
        variant="link"
        className={`p-0 h-auto ${
          actualTheme === "dark"
            ? "text-gray-400 hover:text-white"
            : "text-gray-600 hover:text-black"
        }`}
        onClick={onManageClick}
      >
        Manage &gt;
      </Button>
    </div>

    {/* Reminder List */}
    <div className="space-y-4">
      {reminders.length === 0 ? (
        <p
          className={`text-sm text-center py-4 ${
            actualTheme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}
        >
          No reminders
        </p>
      ) : (
        reminders.slice(0, 5).map((r) => (
          <div
            key={r._id}
            className={`flex justify-between items-center p-3 border rounded-lg transition-colors ${
              actualTheme === "dark"
                ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                : "bg-slate-50/50 border-gray-200 text-gray-700 hover:bg-slate-100"
            }`}
          >
            <p className="font-medium text-sm">{r.title}</p>
            <p className="text-xs">{r.time}</p>
          </div>
        ))
      )}
    </div>

    {/* Add Reminder Button */}
    <Button
      variant="outline"
      className={`w-full mt-6 border-dashed transition-colors ${
        actualTheme === "dark"
          ? "border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800"
          : "border-gray-300 text-gray-500 hover:text-black hover:bg-slate-50"
      }`}
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
    const [selectedTimeView, setSelectedTimeView] = useState<TimeView>('Month');
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
    const ProjectTaskDetailView = ({ onBack, onNavigateToList, onNavigateToKanban }: { onBack: () => void; onNavigateToList: () => void; onNavigateToKanban: () => void; }) => { return ( <div className="flex-1 p-6 bg-white dark:bg-gray-800 w-full"> <header className="flex items-center justify-between mb-8"> <div className="flex items-center gap-4"> <Button variant="ghost" onClick={onBack} className="p-0 h-auto text-muted-foreground hover:text-foreground"> <ChevronLeft className="w-4 h-4" /> </Button> <div className="flex items-center gap-3"> <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Swiggy - UX Design</h1> <Pencil className="w-5 h-5 text-gray-500 dark:text-gray-400 cursor-pointer" /> </div> <Button variant="secondary" className="font-semibold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" onClick={onNavigateToKanban}> Task Board </Button> </div> <div className="flex items-center gap-4"> <Avatar className="w-9 h-9"> <AvatarImage src="https://i.pravatar.cc/150?u=currentUser" /> <AvatarFallback>U</AvatarFallback> </Avatar> <Button variant="outline" className="bg-white dark:bg-gray-700 font-semibold text-gray-900 dark:text-white"> <Share className="w-4 h-4 mr-2" />Share </Button> <Button className="bg-gray-900 dark:bg-purple-600 text-white font-semibold hover:bg-gray-800 dark:hover:bg-purple-700" onClick={onNavigateToList}> List View <Menu className="w-4 h-4 ml-2" /> </Button> </div> </header> <div className="w-full border border-gray-200 dark:border-gray-700 rounded-lg"> <div className="grid grid-cols-[50px_2fr_1.5fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm font-semibold text-gray-500 dark:text-gray-400"> <span>No.</span><span>Tasks</span><span>Assigned by</span><span>Created on</span><span>Priority</span><span>Time Tracker</span><span>Status</span> </div> <div> <div key={detailTask.id} className="grid grid-cols-[50px_2fr_1.5fr_1fr_1fr_1fr_1fr] items-center gap-4 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"> <div className="font-medium text-gray-700 dark:text-gray-300">{detailTask.id}</div> <div className="font-semibold text-gray-800 dark:text-gray-200">{detailTask.taskName}</div> <div className="flex items-center gap-2"> <Avatar className="w-7 h-7"><AvatarImage src={detailTask.assignee.avatar} /><AvatarFallback>A</AvatarFallback></Avatar> <span className="text-gray-900 dark:text-gray-100">{detailTask.assignee.name}</span> </div> <div className="text-gray-600 dark:text-gray-400">{detailTask.createdOn}</div> <div className="text-gray-600 dark:text-gray-400">{detailTask.priority}</div> <div className="text-gray-600 dark:text-gray-400">{detailTask.timeTracker}</div> <div> <Badge variant={detailTask.status === 'Completed' ? 'default' : 'secondary'} className={detailTask.status === 'Completed' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}>{detailTask.status}</Badge> </div> </div> </div> </div> </div> ); };
    const ProjectTaskListView = ({ onBack, onNavigateToKanban }: { onBack: () => void; onNavigateToKanban: () => void; }) => ( <div className="flex-1 p-6 bg-white dark:bg-gray-800 w-full"> <header className="flex items-center justify-between mb-8"> <div className="flex items-center gap-4"> <Button variant="ghost" onClick={onBack} className="p-0 h-auto text-muted-foreground hover:text-foreground"> <ChevronLeft className="w-4 h-4" /> </Button> <div className="flex items-center gap-3"> <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Swiggy - UX Design</h1> <Pencil className="w-5 h-5 text-gray-500 dark:text-gray-400 cursor-pointer" /> </div> <Button variant="secondary" className="font-semibold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" onClick={onNavigateToKanban}> Task Board </Button> </div> <div className="flex items-center gap-4"> <Avatar className="w-9 h-9"><AvatarImage src="https://i.pravatar.cc/150?u=currentUser" /><AvatarFallback>U</AvatarFallback></Avatar> <Button variant="outline" className="bg-white dark:bg-gray-700 font-semibold text-gray-900 dark:text-white"><Share className="w-4 h-4 mr-2" />Share</Button> <Button className="bg-gray-900 dark:bg-purple-600 text-white font-semibold hover:bg-gray-800 dark:hover:bg-purple-700"> List View <Menu className="w-4 h-4 ml-2" /> </Button> </div> </header> <div className="w-full border border-gray-200 dark:border-gray-700 rounded-lg"> <div className="grid grid-cols-[50px_2fr_1.5fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm font-semibold text-gray-500 dark:text-gray-400"> <span>No.</span><span>Tasks</span><span>Assigned by</span><span>Created on</span><span>Priority</span><span>Time Tracker</span><span>Status</span> </div> <div className="divide-y divide-gray-200 dark:divide-gray-700"> {listTasks.map((task) => ( <div key={task.id} className="grid grid-cols-[50px_2fr_1.5fr_1fr_1fr_1fr_1fr] items-center gap-4 p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"> <div className="font-medium text-gray-700 dark:text-gray-300">{task.id}</div> <div className="font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between"> {task.taskName} <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" /> </div> <div className="flex items-center gap-2"> <Avatar className="w-7 h-7"><AvatarImage src={task.assignee.avatar} /><AvatarFallback>A</AvatarFallback></Avatar> <span className="text-gray-900 dark:text-gray-100">{task.assignee.name}</span> </div> <div className="text-gray-600 dark:text-gray-400">{task.createdOn}</div> <div className="text-gray-600 dark:text-gray-400">{task.priority}</div> <div className="text-gray-600 dark:text-gray-400">{task.timeTracker}</div> <div> <Badge variant={task.status === 'Completed' ? 'default' : 'secondary'} className={task.status === 'Completed' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}>{task.status}</Badge> </div> </div> ))} </div> </div> </div> );
    const StatusBadge = ({ status }: { status: string }) => { const base = "font-semibold border-none px-2.5 py-1 text-xs rounded-md"; const styles: { [key: string]: string } = { "In Progress": "bg-yellow-100 text-yellow-800", "Completed": "bg-green-100 text-green-800", "Overdue": "bg-red-100 text-red-800" }; if (!status || !styles[status]) return null; return <Badge className={`${base} ${styles[status]}`}>{status}</Badge>; };
    const TaskCard = ({ task }: { task: (typeof boardData)[0]['tasks'][0] }) => ( <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"> <CardContent className="p-4"> <div className="flex justify-between items-start mb-2"><p className="font-semibold text-sm text-gray-900 dark:text-white">{task.title}</p><Avatar className="w-6 h-6"><AvatarImage src={task.assignee.avatar} /><AvatarFallback>{task.assignee.avatar?.charAt(0)}</AvatarFallback></Avatar></div> <StatusBadge status={task.status} /> <div className="flex items-center space-x-4 mt-4 text-gray-500 dark:text-gray-400 text-xs"> <div className="flex items-center space-x-1"><MessageSquare size={14} /><span>{task.comments}</span></div> <div className="flex items-center space-x-1"><Paperclip size={14} /><span>{task.attachments}</span></div> <div className="flex items-center space-x-1"><CheckSquare size={14} /><span>{`${task.checklists.completed}/${task.checklists.total}`}</span></div> </div> </CardContent> </Card> );
    const TaskColumn = ({ column }: { column: (typeof boardData)[0] }) => ( <div className="flex flex-col w-[350px] flex-shrink-0"> <div className="flex items-center justify-between mb-4"> <div className="flex items-center space-x-3"><Avatar className="w-8 h-8"><AvatarImage src={`https://i.pravatar.cc/150?u=${column.id}`} /><AvatarFallback>T</AvatarFallback></Avatar><div><h3 className="font-bold">{column.title}</h3><p className="text-sm text-gray-500">{column.subtitle}</p></div></div> <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-gray-500"><MoreHorizontal size={20} /></Button> </div> <p className="text-xs text-gray-400 mb-4 ml-1">Created on {column.createdAt}</p> <div className="space-y-4 flex-1">{column.tasks.map((task) => (<TaskCard key={task.id} task={task} />))}</div> </div> );
    const MyTaskBoard = ({ onBack }: { onBack: () => void; }) => ( <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-800"> <header className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0"> <div className="flex items-center gap-4"><Button variant="outline" onClick={onBack} className="font-semibold text-gray-900 dark:text-white"><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button><h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Task Board</h1></div> <div className="flex items-center gap-3"><div className="flex -space-x-2"><Avatar className="w-9 h-9 border-2 border-white dark:border-gray-800"><AvatarImage src="https://i.pravatar.cc/150?u=x" /></Avatar><Avatar className="w-9 h-9 border-2 border-white dark:border-gray-800"><AvatarImage src="https://i.pravatar.cc/150?u=y" /></Avatar></div><Button className="font-semibold bg-primary text-primary-foreground hover:bg-primary/90"><Share className="w-4 h-4 mr-2" /> Share</Button></div> </header> <div className="flex-1 overflow-x-auto p-6"><div className="flex space-x-6 h-full">{boardData.map((column) => (<TaskColumn key={column.id} column={column} />))}</div></div> </main> );

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
const { actualTheme } = useTheme();
    return (
        <div
  className={`flex w-full h-screen ${
    actualTheme === "dark" ? "bg-gray-900" : "bg-white"
  }`}
>
  {/* Main Content Area */}
  <main
    className="flex-1 flex flex-col overflow-y-auto"
    style={{
      scrollbarWidth: "none",
      msOverflowStyle: "none",
    }}
  >
    <style jsx>{`
      main::-webkit-scrollbar {
        display: none;
      }
    `}</style>

    {renderCurrentView()}
  </main>

  {/* Sidebar */}
  {currentView === "project-list" && (
    <RemindersSidebar
      reminders={reminders}
      onAddClick={() => setShowAddReminderModal(true)}
      onManageClick={() => setShowManageRemindersModal(true)}
      actualTheme={actualTheme}
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
