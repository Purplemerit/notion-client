"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminSidebar from "@/components/adminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Phone,
  SquareCheckBig,
  Plus,
  MoreHorizontal,
  Loader2,
  Calendar,
  X,
  Settings,
  Download,
  RefreshCw,
  Edit,
  Archive,
  Trash2,
} from "lucide-react";
import { tasksAPI, projectsAPI, userAPI, kanbanAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assignedTo?: any;
  createdBy?: any;
  dueDate?: string;
  projectId?: string;
}

interface KanbanColumn {
  title: string;
  status: string[];
  cards: Task[];
  color: string;
}

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [project, setProject] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState<string | null>(null);
  const [showEditColumnModal, setShowEditColumnModal] = useState(false);
  const [showClearColumnModal, setShowClearColumnModal] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [clearingColumn, setClearingColumn] = useState<KanbanColumn | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>('todo');
  const [currentBoard, setCurrentBoard] = useState<any>(null);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    priority: 'medium',
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [columns, setColumns] = useState<KanbanColumn[]>([
    {
      title: "To-do",
      status: ["todo"],
      cards: [],
      color: "#E8E4FF",
    },
    {
      title: "In progress",
      status: ["in-progress"],
      cards: [],
      color: "#FFE8D9",
    },
    {
      title: "Review",
      status: ["review"],
      cards: [],
      color: "#FFF4D9",
    },
    {
      title: "Completed",
      status: ["completed"],
      cards: [],
      color: "#D9FFE8",
    },
  ]);
  const { toast } = useToast();

  const loadKanbanData = useCallback(async () => {
    try {
      setLoading(true);

      // Load user profile
      const userData = await userAPI.getProfile().catch(() => null);
      setCurrentUser(userData);

      const tasksData = await tasksAPI.getAll().catch(() => []);
      setTasks(tasksData);

      // Try to load project data (optional)
      try {
        const projectsData = await projectsAPI.getAll();
        console.log('Projects loaded:', projectsData);
        setProjects(projectsData || []);
        if (projectsData && projectsData.length > 0) {
          setProject(projectsData[0]);

          // Load project members
          if (projectsData[0].members && Array.isArray(projectsData[0].members)) {
            setProjectMembers(projectsData[0].members);
          }
        }
      } catch (error) {
        console.error("Failed to load projects:", error);
        setProjects([]);
      }

      // Load kanban board configuration
      try {
        const boardData = await kanbanAPI.getBoard(project?._id);
        if (boardData && boardData.columns) {
          setCurrentBoard(boardData);
          setColumns(boardData.columns.map((col: any) => ({
            title: col.title,
            status: col.status,
            color: col.color,
            cards: [], // Cards are populated from tasks
          })));
        }
      } catch (error) {
        console.log("Could not load kanban board configuration, using defaults");
      }
    } catch (error: any) {
      console.error('Error loading kanban data:', error);
      toast({
        title: "Error Loading Tasks",
        description: error.message || "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadKanbanData();
  }, [loadKanbanData]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Close board menu if clicking outside
      if (showBoardMenu && !target.closest('[data-board-menu]')) {
        setShowBoardMenu(false);
      }
      
      // Close column menu if clicking outside
      if (showColumnMenu && !target.closest('[data-column-menu]')) {
        setShowColumnMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBoardMenu, showColumnMenu]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Find the task to preserve its data
    const task = tasks.find(t => t._id === taskId);
    if (!task) return;

    try {
      // Set updating state for visual feedback
      setUpdating(taskId);

      // Optimistically update UI
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t._id === taskId ? { ...t, status: newStatus } : t
        )
      );

      // Send minimal update with only changed field
      await tasksAPI.update(taskId, { 
        status: newStatus,
        title: task.title, // Required field
        description: task.description || '',
      });
      
      toast({
        title: "Success",
        description: "Task status updated",
      });
    } catch (error: any) {
      // Revert on error
      loadKanbanData();
      console.error('Task update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
    // Add a slight delay to ensure the drag state is set
    setTimeout(() => {
      setDraggedOverColumn(null);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDraggedOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set drag over if we have a dragged task
    if (draggedTask) {
      setDraggedOverColumn(columnStatus);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only clear drag over if we're leaving the column container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDraggedOverColumn(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, columnStatuses: string[]) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTask) return;

    const newStatus = columnStatuses[0]; // Use the first status in the array
    
    // Only update if status actually changed
    if (draggedTask.status !== newStatus) {
      await handleStatusChange(draggedTask._id, newStatus);
      
      toast({
        title: "Task Moved",
        description: `Task moved to ${newStatus}`,
      });
    }
    
    setDraggedTask(null);
    setDraggedOverColumn(null);
  };

  const getTasksForColumn = (columnStatuses: string[]) => {
    let filteredTasks = tasks.filter(task =>
      columnStatuses.includes(task.status?.toLowerCase() || 'todo')
    );

    // Filter by project if a specific project is selected
    if (project && project._id) {
      filteredTasks = filteredTasks.filter(task => task.projectId === project._id);
    }

    return filteredTasks;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return '#FF6B6B';
      case 'medium':
        return '#FFB547';
      case 'low':
        return '#4ECDC4';
      default:
        return '#999';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleOpenAddCard = (columnStatus: string) => {
    setSelectedColumn(columnStatus);
    setShowAddCardModal(true);
  };

  const handleCloseAddCard = () => {
    setShowAddCardModal(false);
    setNewTaskData({ title: '', description: '', priority: 'medium' });
  };

  const handleCreateTask = async () => {
    if (!newTaskData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    try {
      const taskData = {
        title: newTaskData.title,
        description: newTaskData.description,
        status: selectedColumn,
        priority: newTaskData.priority,
        // Include project ID if a project is selected
        ...(project && project._id && { projectId: project._id }),
      };

      const newTask = await tasksAPI.create(taskData);

      setTasks(prevTasks => [...prevTasks, newTask]);

      toast({
        title: "Success",
        description: `Task created successfully${project ? ` in ${project.name}` : ''}`,
      });

      handleCloseAddCard();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    }
  };

  // Handler for Email icon - Navigate to email page
  const handleEmailProject = () => {
    window.location.href = `/admin/email${project ? `?project=${project._id}` : ''}`;
  };

  // Handler for Phone icon - Call project members
  const handleCallProject = () => {
    if (projectMembers.length === 0) {
      toast({
        title: "No Members",
        description: "No project members to call",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Call Feature",
      description: `Initiating group call with ${projectMembers.length} member(s)...`,
    });
    // Could integrate with call functionality later
  };

  // Handler for Check icon - Mark all tasks as complete
  const handleCompleteAllTasks = async () => {
    const incompleteTasks = tasks.filter(t => t.status !== 'completed');

    if (incompleteTasks.length === 0) {
      toast({
        title: "All Done",
        description: "All tasks are already completed!",
      });
      return;
    }

    try {
      await Promise.all(
        incompleteTasks.map(task =>
          tasksAPI.update(task._id, {
            status: 'completed',
            title: task.title,
            description: task.description || ''
          })
        )
      );

      loadKanbanData();
      toast({
        title: "Success",
        description: `Marked ${incompleteTasks.length} task(s) as complete`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete tasks",
        variant: "destructive",
      });
    }
  };

  // Handler for Project Selection
  const handleSelectProject = async (selectedProject: any) => {
    try {
      setProject(selectedProject);
      setProjectMembers(selectedProject.members || []);
      setShowProjectSelector(false);

      // Load board configuration for the selected project
      const boardData = await kanbanAPI.getBoard(selectedProject._id);
      if (boardData && boardData.columns) {
        setCurrentBoard(boardData);
        setColumns(boardData.columns.map((col: any) => ({
          title: col.title,
          status: col.status,
          color: col.color,
          cards: [], // Cards are populated from tasks
        })));
      } else {
        // Reset to default columns if no board configuration exists
        setCurrentBoard(null);
        setColumns([
          { title: "To-do", status: ["todo"], cards: [], color: "#E8E4FF" },
          { title: "In progress", status: ["in-progress"], cards: [], color: "#FFE8D9" },
          { title: "Review", status: ["review"], cards: [], color: "#FFF4D9" },
          { title: "Completed", status: ["completed"], cards: [], color: "#D9FFE8" },
        ]);
      }

      toast({
        title: "Project Selected",
        description: `Switched to ${selectedProject.name}`,
      });
    } catch (error: any) {
      console.error('Error loading board for project:', error);
      toast({
        title: "Error",
        description: "Failed to load board configuration for this project",
        variant: "destructive",
      });
    }
  };

  // Handler for Edit Column
  const handleEditColumn = (column: KanbanColumn) => {
    setEditingColumn({ ...column });
    setShowColumnMenu(null);
    setShowEditColumnModal(true);
  };

  // Handler for Save Column Edit
  const handleSaveColumnEdit = async () => {
    if (!editingColumn) return;

    try {
      // Update local state
      const updatedColumns = columns.map(col =>
        col.status[0] === editingColumn.status[0]
          ? { ...editingColumn }
          : col
      );
      setColumns(updatedColumns);

      // Persist to backend
      const boardData = {
        projectId: project?._id,
        name: currentBoard?.name || (project ? `${project.name} Board` : 'Default Board'),
        columns: updatedColumns.map((col, index) => ({
          title: col.title,
          status: col.status,
          color: col.color,
          order: index,
        })),
      };

      if (currentBoard?._id) {
        await kanbanAPI.updateBoard(currentBoard._id, boardData);
      } else {
        const newBoard = await kanbanAPI.createOrUpdateBoard(boardData);
        setCurrentBoard(newBoard);
      }

      setShowEditColumnModal(false);
      setEditingColumn(null);

      toast({
        title: "Column Updated",
        description: `Column "${editingColumn.title}" has been updated and saved`,
      });
    } catch (error: any) {
      console.error('Error saving column changes:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save column changes",
        variant: "destructive",
      });
    }
  };

  // Handler for Clear Column
  const handleClearColumn = (column: KanbanColumn) => {
    setClearingColumn(column);
    setShowColumnMenu(null);
    setShowClearColumnModal(true);
  };

  // Handler for Confirm Clear Column
  const handleConfirmClearColumn = async () => {
    if (!clearingColumn) return;

    try {
      const columnTasks = getTasksForColumn(clearingColumn.status);
      
      if (columnTasks.length === 0) {
        toast({
          title: "Column Already Empty",
          description: "There are no tasks to clear in this column",
        });
        setShowClearColumnModal(false);
        setClearingColumn(null);
        return;
      }

      // Delete all tasks in the column
      await Promise.all(
        columnTasks.map(task => tasksAPI.delete(task._id))
      );

      // Reload tasks
      await loadKanbanData();

      toast({
        title: "Column Cleared",
        description: `Cleared ${columnTasks.length} task(s) from "${clearingColumn.title}"`,
      });
    } catch (error: any) {
      console.error('Error clearing column:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to clear column",
        variant: "destructive",
      });
    } finally {
      setShowClearColumnModal(false);
      setClearingColumn(null);
    }
  };

  // Handler for Export Board
  const handleExportBoard = () => {
    setShowBoardMenu(false);

    try {
      const exportData = {
        project: project ? {
          name: project.name,
          description: project.description,
          members: projectMembers.length,
        } : null,
        columns: columns.map(column => ({
          title: column.title,
          status: column.status,
          tasks: getTasksForColumn(column.status).map(task => ({
            title: task.title,
            description: task.description,
            priority: task.priority,
            assignedTo: task.assignedTo?.name || task.assignedTo?.email,
            dueDate: task.dueDate,
          }))
        })),
        exportDate: new Date().toISOString(),
        totalTasks: tasks.length,
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `kanban-board-${project ? project.name.replace(/\s+/g, '-').toLowerCase() : 'all-tasks'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Board Exported",
        description: "Kanban board data has been exported as JSON file",
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export board data",
        variant: "destructive",
      });
    }
  };

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
          searchPlaceholder="Search tasks..."
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
          {/* Page Title */}
          <h1 style={{ fontSize: 32, fontWeight: 600, color: "#000", marginBottom: 24 }}>Kanban Board</h1>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#8B7BE8" }} />
            </div>
          ) : (
            <>
              {/* Project Board Header */}
              <div
                style={{
                  background: "#FFF",
                  borderRadius: 16,
                  padding: "20px 24px",
                  marginBottom: 24,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "1px solid #E5E5E5",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: "#000" }}>
                    {project ? project.name : "All Tasks"} Board
                  </span>
              <button
                onClick={handleEmailProject}
                style={{
                  background: "#F5F5F5",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Email project members"
              >
                <Mail size={20} color="#666" />
              </button>
              <button
                onClick={handleCallProject}
                style={{
                  background: "#F5F5F5",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Call project members"
              >
                <Phone size={20} color="#666" />
              </button>
              <button
                onClick={handleCompleteAllTasks}
                style={{
                  background: "#F5F5F5",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Mark all tasks as complete"
              >
                <SquareCheckBig size={20} color="#666" />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Avatar Group - Real Project Members */}
              <div style={{ display: "flex", alignItems: "center" }}>
                {projectMembers.length > 0 ? (
                  <>
                    {projectMembers.slice(0, 3).map((member, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: member.avatar ? `url(${member.avatar})` : "#8B7BE8",
                          backgroundSize: "cover",
                          marginLeft: idx > 0 ? -8 : 0,
                          border: "2px solid #FFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#FFF",
                        }}
                        title={member.name || member.email}
                      >
                        {!member.avatar && getInitials(member.name || member.email)}
                      </div>
                    ))}
                    {projectMembers.length > 3 && (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#8B7BE8",
                          marginLeft: -8,
                          border: "2px solid #FFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#FFF",
                        }}
                        title={`${projectMembers.length - 3} more members`}
                      >
                        +{projectMembers.length - 3}
                      </div>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: "#999" }}>No members</span>
                )}
              </div>
              <button
                onClick={() => setShowProjectSelector(true)}
                style={{
                  background: "#8B7BE8",
                  color: "#FFF",
                  border: "none",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 600,
                }}
                title="Select project"
              >
                <Plus size={20} />
              </button>
              <div style={{ position: "relative" }} data-board-menu>
                <button
                  onClick={() => setShowBoardMenu(!showBoardMenu)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  title="Board menu"
                >
                  <MoreHorizontal size={24} color="#999" />
                </button>
                {showBoardMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: 30,
                      right: 0,
                      background: "#FFF",
                      borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      padding: "8px 0",
                      minWidth: 180,
                      zIndex: 10,
                    }}
                  >
                    <button
                      onClick={() => {
                        setShowBoardMenu(false);
                        toast({ title: "View Settings", description: "Board settings coming soon" });
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#F5F5F5"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                    >
                      <Settings size={16} />
                      Board Settings
                    </button>
                    <button
                      onClick={() => {
                        handleExportBoard();
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#F5F5F5"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                    >
                      <Download size={16} />
                      Export Board
                    </button>
                    <button
                      onClick={() => {
                        setShowBoardMenu(false);
                        loadKanbanData();
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#F5F5F5"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                    >
                      <RefreshCw size={16} />
                      Refresh Board
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

              {/* Kanban Columns */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 20,
                }}
              >
                {columns.map((column, columnIndex) => {
                  const columnTasks = getTasksForColumn(column.status);
                  const filteredTasks = searchQuery ? columnTasks.filter(task =>
                    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
                  ) : columnTasks;

                  return (
              <div
                key={columnIndex}
                style={{
                  background: draggedOverColumn === column.status[0] ? "#D4CCFA" : column.color,
                  borderRadius: 16,
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  transition: "background 0.2s, border 0.2s",
                  minHeight: "400px",
                  border: draggedOverColumn === column.status[0] ? "2px dashed #8B7BE8" : "2px solid transparent",
                }}
                onDragOver={(e) => handleDragOver(e, column.status[0])}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.status)}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {/* Column Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: "#000", margin: 0 }}>{column.title}</h3>
                    <span
                      style={{
                        background: "#FFF",
                        color: "#666",
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "4px 8px",
                        borderRadius: 12,
                        minWidth: 20,
                        textAlign: "center",
                      }}
                    >
                      {filteredTasks.length}
                    </span>
                  </div>
                  <div style={{ position: "relative" }} data-column-menu>
                    <button
                      onClick={() => setShowColumnMenu(showColumnMenu === column.status[0] ? null : column.status[0])}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        borderRadius: "4px",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.1)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <MoreHorizontal size={20} color="#999" />
                    </button>
                    {showColumnMenu === column.status[0] && (
                      <div
                        style={{
                          position: "absolute",
                          top: 30,
                          right: 0,
                          background: "#FFF",
                          borderRadius: 8,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          padding: "8px 0",
                          minWidth: 160,
                          zIndex: 20,
                        }}
                      >
                        <button
                          onClick={() => {
                            setShowColumnMenu(null);
                            handleOpenAddCard(column.status[0]);
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 16px",
                            background: "none",
                            border: "none",
                            textAlign: "left",
                            cursor: "pointer",
                            fontSize: 14,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#F5F5F5"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                        >
                          <Plus size={16} />
                          Add Card
                        </button>
                        <button
                          onClick={() => {
                            handleEditColumn(column);
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 16px",
                            background: "none",
                            border: "none",
                            textAlign: "left",
                            cursor: "pointer",
                            fontSize: 14,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#F5F5F5"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                        >
                          <Edit size={16} />
                          Edit Column
                        </button>
                        <button
                          onClick={() => {
                            handleClearColumn(column);
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 16px",
                            background: "none",
                            border: "none",
                            textAlign: "left",
                            cursor: "pointer",
                            fontSize: 14,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#F5F5F5"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                        >
                          <Archive size={16} />
                          Clear Column
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Card Button */}
                <button
                  onClick={() => handleOpenAddCard(column.status[0])}
                  style={{
                    background: "#8B7BE8",
                    color: "#FFF",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <Plus size={18} />
                  Add Card
                </button>

                {/* Cards */}
                {filteredTasks.map((task) => (
                  <div
                    key={task._id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    onDragEnd={handleDragEnd}
                    style={{
                      background: "#FFF",
                      borderRadius: 12,
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      cursor: draggedTask?._id === task._id ? "grabbing" : "grab",
                      transition: "box-shadow 0.2s, opacity 0.2s, transform 0.2s",
                      opacity: draggedTask?._id === task._id ? 0.6 : updating === task._id ? 0.8 : 1,
                      transform: draggedTask?._id === task._id ? "rotate(5deg) scale(1.02)" : "none",
                      border: draggedTask?._id === task._id ? "2px dashed #8B7BE8" : updating === task._id ? "2px solid #8B7BE8" : "1px solid transparent",
                      boxShadow: draggedTask?._id === task._id ? "0 8px 24px rgba(139, 123, 232, 0.3)" : "none",
                      userSelect: "none",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      if (draggedTask?._id !== task._id) {
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (draggedTask?._id !== task._id) {
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "none";
                      }
                    }}
                  >
                    {/* Updating Indicator */}
                    {updating === task._id && (
                      <div
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          background: "#8B7BE8",
                          borderRadius: "50%",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Loader2 size={12} color="#FFF" className="animate-spin" />
                      </div>
                    )}

                    {/* Card Title */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: getPriorityColor(task.priority),
                          }}
                        />
                        <span style={{ fontSize: 15, fontWeight: 600, color: "#000", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {task.title}
                        </span>
                      </div>
                    </div>

                    {/* Card Description */}
                    {task.description && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#999",
                          margin: 0,
                          lineHeight: 1.5,
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {task.description}
                      </p>
                    )}

                    {/* Priority Badge */}
                    {task.priority && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "4px 8px",
                            borderRadius: 6,
                            background: `${getPriorityColor(task.priority)}20`,
                            color: getPriorityColor(task.priority),
                            textTransform: "capitalize",
                          }}
                        >
                          {task.priority}
                        </span>
                      </div>
                    )}

                    {/* Card Footer */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                      {/* Assignee Avatar */}
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {task.assignedTo ? (
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 6,
                              background: "#AEA1E4",
                              border: "1px solid #FFF",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              fontWeight: 600,
                              color: "#FFF",
                            }}
                            title={task.assignedTo.name || task.assignedTo.email}
                          >
                            {getInitials(task.assignedTo.name || task.assignedTo.email)}
                          </div>
                        ) : (
                          <div style={{ width: 24, height: 24 }} />
                        )}
                      </div>

                      {/* Due Date */}
                      {task.dueDate && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            color: "#999",
                          }}
                        >
                          <Calendar size={12} />
                          {formatDate(task.dueDate)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                  </div>
                );
                })}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={handleCloseAddCard}
        >
          <div
            style={{
              background: "#FFF",
              borderRadius: 16,
              padding: "32px",
              width: "90%",
              maxWidth: "500px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#000", marginBottom: 24 }}>
              Add New Task
              {project && (
                <span style={{ fontSize: 14, fontWeight: 400, color: "#666", display: "block", marginTop: 4 }}>
                  to {project.name}
                </span>
              )}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Title Input */}
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, color: "#666", display: "block", marginBottom: 8 }}>
                  Task Title *
                </label>
                <Input
                  placeholder="Enter task title..."
                  value={newTaskData.title}
                  onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: 14,
                    borderRadius: 8,
                    border: "1px solid #E5E5E5",
                  }}
                />
              </div>

              {/* Description Input */}
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, color: "#666", display: "block", marginBottom: 8 }}>
                  Description
                </label>
                <textarea
                  placeholder="Enter task description..."
                  value={newTaskData.description}
                  onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: 14,
                    borderRadius: 8,
                    border: "1px solid #E5E5E5",
                    minHeight: "100px",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Priority Select */}
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, color: "#666", display: "block", marginBottom: 8 }}>
                  Priority
                </label>
                <select
                  value={newTaskData.priority}
                  onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: 14,
                    borderRadius: 8,
                    border: "1px solid #E5E5E5",
                    background: "#FFF",
                    cursor: "pointer",
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Status Info */}
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, color: "#666", display: "block", marginBottom: 8 }}>
                  Status
                </label>
                <div
                  style={{
                    padding: "12px",
                    borderRadius: 8,
                    background: "#F5F5F5",
                    fontSize: 14,
                    color: "#666",
                    textTransform: "capitalize",
                  }}
                >
                  {selectedColumn}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button
                  onClick={handleCloseAddCard}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    borderRadius: 8,
                    border: "1px solid #E5E5E5",
                    background: "#FFF",
                    color: "#666",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    borderRadius: 8,
                    border: "none",
                    background: "#8B7BE8",
                    color: "#FFF",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Selection Modal */}
      {showProjectSelector && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowProjectSelector(false)}
        >
          <div
            style={{
              background: "#FFF",
              borderRadius: 16,
              padding: "32px",
              width: "90%",
              maxWidth: "600px",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 600, color: "#000", margin: 0 }}>
                Select Project
              </h2>
              <button
                onClick={() => setShowProjectSelector(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#F5F5F5"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <X size={24} color="#666" />
              </button>
            </div>

            {/* All Tasks Option */}
            <div
              onClick={async () => {
                try {
                  setProject(null);
                  setProjectMembers([]);
                  setShowProjectSelector(false);

                  // Load default board configuration
                  const boardData = await kanbanAPI.getBoard(); // No project ID = default board
                  if (boardData && boardData.columns) {
                    setCurrentBoard(boardData);
                    setColumns(boardData.columns.map((col: any) => ({
                      title: col.title,
                      status: col.status,
                      color: col.color,
                      cards: [], // Cards are populated from tasks
                    })));
                  } else {
                    // Reset to default columns
                    setCurrentBoard(null);
                    setColumns([
                      { title: "To-do", status: ["todo"], cards: [], color: "#E8E4FF" },
                      { title: "In progress", status: ["in-progress"], cards: [], color: "#FFE8D9" },
                      { title: "Review", status: ["review"], cards: [], color: "#FFF4D9" },
                      { title: "Completed", status: ["completed"], cards: [], color: "#D9FFE8" },
                    ]);
                  }

                  toast({
                    title: "View Changed",
                    description: "Now showing all tasks",
                  });
                } catch (error: any) {
                  console.error('Error loading default board:', error);
                  toast({
                    title: "Error",
                    description: "Failed to load default board configuration",
                    variant: "destructive",
                  });
                }
              }}
              style={{
                padding: "16px",
                borderRadius: 12,
                border: !project ? "2px solid #8B7BE8" : "1px solid #E5E5E5",
                background: !project ? "#F7F5FD" : "#FFF",
                cursor: "pointer",
                marginBottom: 16,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (project) {
                  e.currentTarget.style.background = "#F9F9F9";
                  e.currentTarget.style.borderColor = "#D1D1D1";
                }
              }}
              onMouseLeave={(e) => {
                if (project) {
                  e.currentTarget.style.background = "#FFF";
                  e.currentTarget.style.borderColor = "#E5E5E5";
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #8B7BE8 0%, #A8A1E8 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#FFF",
                  }}
                >
                  All
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: "#000", margin: 0, marginBottom: 4 }}>
                    All Tasks
                  </h4>
                  <p style={{ fontSize: 14, color: "#666", margin: 0 }}>
                    View all tasks across all projects
                  </p>
                </div>
                {!project && (
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#8B7BE8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#FFF",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Projects List */}
            {projects.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#000", margin: 0, marginBottom: 8 }}>
                  Your Projects ({projects.length})
                </h3>
                {projects.map((proj) => (
                  <div
                    key={proj._id}
                    onClick={() => handleSelectProject(proj)}
                    style={{
                      padding: "16px",
                      borderRadius: 12,
                      border: project?._id === proj._id ? "2px solid #8B7BE8" : "1px solid #E5E5E5",
                      background: project?._id === proj._id ? "#F7F5FD" : "#FFF",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (project?._id !== proj._id) {
                        e.currentTarget.style.background = "#F9F9F9";
                        e.currentTarget.style.borderColor = "#D1D1D1";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (project?._id !== proj._id) {
                        e.currentTarget.style.background = "#FFF";
                        e.currentTarget.style.borderColor = "#E5E5E5";
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          background: proj.color || "#8B7BE8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          fontWeight: 600,
                          color: "#FFF",
                        }}
                      >
                        {proj.name?.substring(0, 2).toUpperCase() || "PR"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: 16, fontWeight: 600, color: "#000", margin: 0, marginBottom: 4 }}>
                          {proj.name || "Untitled Project"}
                        </h4>
                        <p style={{ fontSize: 14, color: "#666", margin: 0 }}>
                          {proj.description || "No description available"}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                          <span style={{ fontSize: 12, color: "#999" }}>
                            {proj.members?.length || 0} member(s)
                          </span>
                          <span style={{ fontSize: 12, color: "#999" }}>
                            Status: {proj.status || "active"}
                          </span>
                        </div>
                      </div>
                      {project?._id === proj._id && (
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: "#8B7BE8",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "#FFF",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "#999",
                }}
              >
                <p style={{ fontSize: 16, marginBottom: 8 }}>No projects found</p>
                <p style={{ fontSize: 14 }}>Create a new project to get started</p>
                <button
                  onClick={() => {
                    setShowProjectSelector(false);
                    // Navigate to new project page
                    window.location.href = '/admin/new-project';
                  }}
                  style={{
                    marginTop: 16,
                    padding: "10px 20px",
                    borderRadius: 8,
                    border: "none",
                    background: "#8B7BE8",
                    color: "#FFF",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Create New Project
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Column Modal */}
      {showEditColumnModal && editingColumn && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowEditColumnModal(false)}
        >
          <div
            style={{
              background: "#FFF",
              borderRadius: 16,
              padding: "32px",
              width: "90%",
              maxWidth: "500px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#000", marginBottom: 24 }}>
              Edit Column
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Column Title */}
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, color: "#666", display: "block", marginBottom: 8 }}>
                  Column Title *
                </label>
                <Input
                  placeholder="Enter column title..."
                  value={editingColumn.title}
                  onChange={(e) => setEditingColumn({ ...editingColumn, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: 14,
                    borderRadius: 8,
                    border: "1px solid #E5E5E5",
                  }}
                />
              </div>

              {/* Column Color */}
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, color: "#666", display: "block", marginBottom: 8 }}>
                  Column Color
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["#E8E4FF", "#FFE8D9", "#FFF4D9", "#D9FFE8", "#FFE8E8", "#E8F4FF"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditingColumn({ ...editingColumn, color })}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: color,
                        border: editingColumn.color === color ? "3px solid #8B7BE8" : "2px solid #E5E5E5",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button
                  onClick={() => setShowEditColumnModal(false)}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    borderRadius: 8,
                    border: "1px solid #E5E5E5",
                    background: "#FFF",
                    color: "#666",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveColumnEdit}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    borderRadius: 8,
                    border: "none",
                    background: "#8B7BE8",
                    color: "#FFF",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Column Confirmation Modal */}
      {showClearColumnModal && clearingColumn && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowClearColumnModal(false)}
        >
          <div
            style={{
              background: "#FFF",
              borderRadius: 16,
              padding: "32px",
              width: "90%",
              maxWidth: "450px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#000", marginBottom: 16 }}>
              Clear Column
            </h2>
            
            <p style={{ fontSize: 16, color: "#666", marginBottom: 8 }}>
              Are you sure you want to clear all tasks from &quot{clearingColumn.title}&quot?
            </p>
            
            <p style={{ fontSize: 14, color: "#999", marginBottom: 24 }}>
              This will permanently delete {getTasksForColumn(clearingColumn.status).length} task(s). This action cannot be undone.
            </p>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowClearColumnModal(false)}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: "1px solid #E5E5E5",
                  background: "#FFF",
                  color: "#666",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearColumn}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: "#FF6B6B",
                  color: "#FFF",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Clear Column
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
