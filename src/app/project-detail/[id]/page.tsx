'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Edit2,
  Save,
  Users,
  Calendar,
  Trash2,
  X,
  Loader2,
  Plus,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { projectsAPI, usersAPI } from '@/lib/api';
import { format } from 'date-fns';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  startDate?: string;
  endDate?: string;
  members: User[];
  createdBy: User;
  teamId?: {
    _id: string;
    name: string;
    members: string[];
  };
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'completed' | 'archived'>('active');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  // Member management
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    setIsLoading(true);
    try {
      const data = await projectsAPI.getById(projectId);
      setProject(data);
      setEditName(data.name);
      setEditDescription(data.description || '');
      setEditStatus(data.status);
      setEditStartDate(data.startDate ? format(new Date(data.startDate), 'yyyy-MM-dd') : '');
      setEditEndDate(data.endDate ? format(new Date(data.endDate), 'yyyy-MM-dd') : '');
    } catch (error: any) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error('Project name is required');
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {
        name: editName,
        description: editDescription,
        status: editStatus,
        startDate: editStartDate || undefined,
        endDate: editEndDate || undefined,
      };

      await projectsAPI.update(projectId, updateData);
      toast.success('Project updated successfully!');
      setIsEditing(false);
      await loadProject();
    } catch (error: any) {
      console.error('Failed to update project:', error);
      toast.error(error.message || 'Failed to update project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await projectsAPI.delete(projectId);
      toast.success('Project deleted successfully');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      toast.error(error.message || 'Failed to delete project');
      setIsDeleting(false);
    }
  };

  // Search users
  const handleUserSearch = async (query: string) => {
    setUserSearch(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const users = await usersAPI.search(query);
      setSearchResults(users);
    } catch (error) {
      console.error('Failed to search users:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  // Add member
  const handleAddMember = async (user: User) => {
    try {
      await projectsAPI.addMember(projectId, user._id);
      toast.success(`${user.name} added to project`);
      setUserSearch('');
      setSearchResults([]);
      setShowMemberSearch(false);
      await loadProject();
    } catch (error: any) {
      console.error('Failed to add member:', error);
      toast.error(error.message || 'Failed to add member');
    }
  };

  // Remove member
  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the project?')) {
      return;
    }

    try {
      await projectsAPI.removeMember(projectId, userId);
      toast.success('Member removed from project');
      await loadProject();
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      toast.error(error.message || 'Failed to remove member');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 bg-white flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="flex-1 bg-white flex flex-col items-center justify-center">
          <p className="text-lg text-gray-500 mb-4">Project not found</p>
          <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 bg-white p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">Project Details</h1>
          </div>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(project.name);
                    setEditDescription(project.description || '');
                    setEditStatus(project.status);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="border-gray-300"
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="max-w-4xl space-y-8">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-2xl font-bold"
                placeholder="Enter project name"
              />
            ) : (
              <h2 className="text-2xl font-bold text-gray-800">{project.name}</h2>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            {isEditing ? (
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            ) : (
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
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            {isEditing ? (
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add a description..."
                rows={4}
                className="resize-none"
              />
            ) : (
              <p className="text-gray-600">{project.description || 'No description'}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Start Date
              </label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              ) : (
                <p className="text-gray-600">
                  {project.startDate ? format(new Date(project.startDate), 'PPP') : 'Not set'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                End Date
              </label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  min={editStartDate}
                />
              ) : (
                <p className="text-gray-600">
                  {project.endDate ? format(new Date(project.endDate), 'PPP') : 'Not set'}
                </p>
              )}
            </div>
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                <Users className="inline h-4 w-4 mr-1" />
                Team Members ({project.members?.length || 0})
              </label>
              {!isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMemberSearch(!showMemberSearch)}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Member
                </Button>
              )}
            </div>

            {/* Member Search */}
            {showMemberSearch && !isEditing && (
              <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <Input
                  placeholder="Search users by name or email..."
                  value={userSearch}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  className="mb-3"
                />
                {isSearching ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-500" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults
                      .filter((user) => !project.members?.find((m) => m._id === user._id))
                      .map((user) => (
                        <div
                          key={user._id}
                          className="flex items-center justify-between p-2 hover:bg-white rounded cursor-pointer"
                          onClick={() => handleAddMember(user)}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">{user.name}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                ) : userSearch ? (
                  <p className="text-center text-sm text-gray-500 py-4">No users found</p>
                ) : (
                  <p className="text-center text-sm text-gray-500 py-4">
                    Start typing to search users
                  </p>
                )}
              </div>
            )}

            {/* Members List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {project.members && project.members.length > 0 ? (
                project.members.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                    {!isEditing && member._id !== project.createdBy._id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(member._id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 col-span-2 text-center py-4">No members yet</p>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Created by:</span> {project.createdBy.name}
              </div>
              <div>
                <span className="font-medium">Created on:</span>{' '}
                {format(new Date(project.createdAt), 'PPP')}
              </div>
              {project.teamId && (
                <div className="col-span-2">
                  <span className="font-medium">Team:</span> {project.teamId.name}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
