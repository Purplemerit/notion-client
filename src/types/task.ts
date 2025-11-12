export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Project {
  _id: string;
  name: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  projectId?: Project;
  assignedTo: User[];
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date | string;
  createdBy: User;
  createdAt: Date | string;
  updatedAt: Date | string;
  checklist?: Array<{ label: string; checked: boolean }>;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  projectId?: string;
  assignedTo?: string[];
  status?: 'todo' | 'in-progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  projectId?: string;
  assignedTo?: string[];
  status?: 'todo' | 'in-progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  checklist?: Array<{ label: string; checked: boolean }>;
}
