'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tasksAPI, teamsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Label to color mapping
const LABEL_BG_COLORS: Record<string, string> = {
  'High': '#FFCDD2',
  'Medium': '#FFE0B2',
  'Low': '#FFF9C4',
  'Stand-by': '#B2EBF2',
};

export interface Task {
  _id: string;
  title: string;
  description: string;
  day: string;
  startTime: number; // Decimal hours (e.g., 9.5 = 9:30 AM)
  duration: number; // Hours
  label?: 'High' | 'Medium' | 'Low' | 'Stand-by';
  members?: string[];
  startDate?: string;
  endDate?: string;
  assignee?: string;
  backgroundColor?: string;
  teamId?: string; // Associated team ID
  owner?: string; // User ID of task creator
  admin?: string; // User ID of team admin
  createdAt?: string | Date;
  updatedAt?: string | Date;
  checklist?: Array<{ label: string; checked: boolean }>;
  status?: string;
}

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  addTask: (task: Omit<Task, '_id' | 'teamId' | 'owner' | 'admin'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  changeAdmin: (taskId: string, newAdminId: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Convert backend event to our Task format
  const convertEventToTask = (event: any): Task => {
    // Handle local tasks created from modal
    if (event.day) {
      const bgColor = event.label ? LABEL_BG_COLORS[event.label] || '#D8D5F0' : '#D8D5F0';
      return {
        _id: event._id,
        title: event.title,
        description: event.description || '',
        day: event.day,
        startTime: event.startTime,
        duration: event.duration,
        label: event.label,
        members: event.members || [],
        backgroundColor: bgColor,
        startDate: event.startDate,
        endDate: event.endDate,
        assignee: event.assignee,
      };
    }
    
    // Handle backend events
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    const dayName = daysOfWeek[startDate.getDay()];
    const startHour = startDate.getHours() + startDate.getMinutes() / 60;
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

    return {
      _id: event._id,
      title: event.title,
      description: event.description || '',
      day: dayName,
      startTime: startHour,
      duration: duration,
      members: event.members || [],
      backgroundColor: '#D8D5F0',
      startDate: event.startDate,
      endDate: event.endDate,
      assignee: event.assignee || `https://i.pravatar.cc/150?u=${event._id}`,
    };
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await tasksAPI.getAll();
      const convertedTasks = data.map(convertEventToTask);
      setTasks(convertedTasks);
    } catch (error: any) {
      toast({
        title: "Error Loading Tasks",
        description: error.message || "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const addTask = async (taskData: Omit<Task, '_id' | 'teamId' | 'owner' | 'admin'>) => {
    try {
      // Backend auto-creates team when task is created
      const createdTask = await tasksAPI.create(taskData);
      const bgColor = createdTask.label ? LABEL_BG_COLORS[createdTask.label] || '#D8D5F0' : '#D8D5F0';
      
      const taskWithBg: Task = {
        ...createdTask,
        backgroundColor: bgColor,
      };
      
      setTasks(prevTasks => [...prevTasks, taskWithBg]);
      toast({
        title: "Task & Team Created",
        description: "Your task and associated team have been created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error Creating Task",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      // Backend auto-syncs team when task is updated
      const updatedTask = await tasksAPI.update(id, updates);
      
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task._id === id ? { ...task, ...updatedTask } : task
        )
      );
      toast({
        title: "Task Updated",
        description: "Your task and team have been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error Updating Task",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (id: string) => {
    try {
      // Backend auto-deletes team when task is deleted
      await tasksAPI.delete(id);
      setTasks(prevTasks => prevTasks.filter(task => task._id !== id));
      toast({
        title: "Task & Team Deleted",
        description: "Task and its associated team have been removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error Deleting Task",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const changeAdmin = async (taskId: string, newAdminId: string) => {
    const task = tasks.find(t => t._id === taskId);
    const currentUserId = user?._id;

    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to change admin",
        variant: "destructive",
      });
      return;
    }

    if (!task) {
      toast({
        title: "Error",
        description: "Task not found",
        variant: "destructive",
      });
      return;
    }
    
    if (task.owner !== currentUserId) {
      toast({
        title: "Permission Denied",
        description: "Only the task owner can change the admin",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (!task.teamId) {
        throw new Error("Task has no associated team");
      }
      
      // Call backend to change admin (backend validates owner permission)
      await teamsAPI.changeAdmin(task.teamId, newAdminId);
      
      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t._id === taskId ? { ...t, admin: newAdminId } : t
        )
      );
      
      toast({
        title: "Admin Changed",
        description: "Team admin has been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error Changing Admin",
        description: error.message || "Failed to change admin",
        variant: "destructive",
      });
    }
  };

  const refreshTasks = async () => {
    await loadTasks();
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        addTask,
        updateTask,
        deleteTask,
        refreshTasks,
        changeAdmin,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
