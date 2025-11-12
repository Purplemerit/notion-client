'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Calendar, Settings2 } from 'lucide-react';
import { projectsAPI } from '@/lib/api';
import { format } from 'date-fns';

interface Project {
  _id: string;
  name: string;
  description?: string;
  status: string;
  progress?: number;
  priority?: string;
  lead?: {
    _id: string;
    name: string;
    avatar?: string;
  };
  members?: Array<{
    _id: string;
    name: string;
    avatar?: string;
  }>;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProjectListViewProps {
  onProjectClick?: (projectId: string) => void;
}

export default function ProjectListView({ onProjectClick }: ProjectListViewProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const data = await projectsAPI.getAll();
        setProjects(data);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch projects:', err);
        setError(err.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Handle project click
  const handleProjectClick = (projectId: string) => {
    if (onProjectClick) {
      onProjectClick(projectId);
    } else {
      router.push(`/project-detail/${projectId}`);
    }
  };

  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get priority color
  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  // Get progress color
  const getProgressColor = (progress?: number) => {
    if (!progress) return 'from-gray-200 to-gray-400';
    if (progress < 30) return 'from-red-200 to-red-400';
    if (progress < 70) return 'from-yellow-200 to-yellow-400';
    return 'from-green-200 to-green-400';
  };

  // Get status indicator
  const getStatusIndicator = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'on track':
        return <div className="w-3 h-3 rounded-full bg-green-400"></div>;
      case 'at risk':
        return <div className="w-3 h-3 rounded-full bg-yellow-400"></div>;
      case 'delayed':
        return <div className="w-3 h-3 rounded-full bg-red-400"></div>;
      default:
        return <div className="w-3 h-3 rounded-full bg-gray-400"></div>;
    }
  };

  if (loading) {
    return (
      <main className="bg-white p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-white p-8">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Error loading projects</p>
          <p className="text-sm">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-white">
      {/* Filter Button */}
      <div className="mb-4">
        <Button variant="outline" className="flex items-center gap-2 px-4 py-2 rounded-lg border-2">
          <Settings2 className="h-5 w-5" />
          <span className="font-medium">Filter</span>
        </Button>
      </div>

      {/* Table Header */}
      <div className="border-b border-gray-200">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-sm font-semibold text-gray-700">
          <div className="col-span-3">Name</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-2">Lead</div>
          <div className="col-span-2">Target Date</div>
          <div className="col-span-1">Status</div>
        </div>
      </div>

      {/* Table Rows */}
      {projects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No projects found</p>
          <p className="text-sm">Create your first project to get started</p>
        </div>
      ) : (
        projects.map((project) => (
          <div
            key={project._id}
            className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => handleProjectClick(project._id)}
          >
            <div className="grid grid-cols-12 gap-4 px-4 py-4 items-center">
              {/* Name */}
              <div className="col-span-3 flex items-center gap-3">
                <span className="font-medium text-gray-900 truncate">{project.name}</span>
                {project.createdAt && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                      <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    <span>{project.status || 'Active'}</span>
                    <span>• {format(new Date(project.createdAt), 'd MMM')}</span>
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="col-span-2 flex items-center gap-2">
                {getStatusIndicator(project.status)}
                <span className="text-sm text-gray-700">
                  {project.status === 'active' ? 'On track' : project.status}
                </span>
                {project.updatedAt && (
                  <span className="text-sm text-gray-500">
                    • {format(new Date(project.updatedAt), 'relative')}
                  </span>
                )}
              </div>

              {/* Priority */}
              <div className="col-span-2 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
                <span className={`text-sm font-medium ${getPriorityColor(project.priority)}`}>
                  {project.priority || 'Medium'}
                </span>
              </div>

              {/* Lead */}
              <div className="col-span-2 flex items-center gap-2">
                {project.lead ? (
                  <>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={project.lead.avatar} alt={project.lead.name} />
                      <AvatarFallback className="bg-purple-200 text-purple-800 text-xs">
                        {getInitials(project.lead.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-700 truncate">{project.lead.name}</span>
                  </>
                ) : (
                  <>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-orange-200 text-orange-800 text-xs">?</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-700">No Lead</span>
                  </>
                )}
              </div>

              {/* Target Date */}
              <div className="col-span-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {project.endDate ? format(new Date(project.endDate), 'MMM d') : 'No date'}
                </span>
              </div>

              {/* Status */}
              <div className="col-span-1 flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-r ${getProgressColor(
                    project.progress
                  )} flex items-center justify-center`}
                >
                  <span className="text-xs font-semibold text-gray-800">
                    {project.progress || 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </main>
  );
}
