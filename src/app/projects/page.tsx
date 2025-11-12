"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Plus,
  SlidersHorizontal,
  LayoutGrid,
  Box,
  CalendarDays,
  Users
} from "lucide-react";
import { projectsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function ProjectsPage() {
  const [currentView, setCurrentView] = useState("projects");
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsAPI.getAll();
      setProjects(data);
    } catch (error: any) {
      toast({
        title: "Error Loading Projects",
        description: error.message || "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 border-b">
            <div className="relative flex-1 max-w-md">
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
            <div className="flex items-center gap-2 sm:gap-4">
                <Button
                  onClick={() => router.push('/new-project')}
                  className="font-semibold bg-primary hover:bg-primary/90 flex-1 sm:flex-none"
                >
                  <Plus className="w-4 h-4 sm:mr-2"/>
                  <span className="hidden sm:inline">Create Project</span>
                </Button>
                <Button
                  variant="outline"
                  className="font-semibold text-gray-600"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  <LayoutGrid className="w-4 h-4 sm:mr-2"/>
                  <span className="hidden sm:inline">{viewMode === 'grid' ? 'List' : 'Grid'}</span>
                </Button>
            </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <div className="flex items-center mb-6">
                <Button variant="outline" className="font-semibold text-gray-700">
                    <SlidersHorizontal className="w-4 h-4 mr-2"/>
                    Filter
                </Button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Box className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-semibold mb-2">No projects found</p>
                <p>Create one to get started!</p>
                <Button onClick={() => router.push('/new-project')} className="mt-4">
                  <Plus className="w-4 h-4 mr-2"/> Create Project
                </Button>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {projects.map((project) => (
                  <Card
                    key={project._id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push(`/project-detail/${project._id}`)}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-semibold text-lg text-gray-800 flex-1">{project.name}</h3>
                        <Badge
                          variant="outline"
                          className={
                            project.status === 'active'
                              ? "border-green-300 bg-green-50 text-green-700 font-semibold"
                              : project.status === 'completed'
                              ? "border-blue-300 bg-blue-50 text-blue-700 font-semibold"
                              : "border-gray-300 bg-gray-50 text-gray-700 font-semibold"
                          }
                        >
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            project.status === 'active' ? 'bg-green-500' :
                            project.status === 'completed' ? 'bg-blue-500' : 'bg-gray-500'
                          }`}></span>
                          {project.status?.charAt(0).toUpperCase() + project.status?.slice(1)}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>{project.members?.length || 0} members</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CalendarDays className="w-4 h-4" />
                          <span>
                            {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No deadline'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-semibold text-gray-700">
                              {project.status === 'completed' ? '100%' : project.status === 'active' ? '50%' : '0%'}
                            </span>
                          </div>
                          <Progress
                            value={project.status === 'completed' ? 100 : project.status === 'active' ? 50 : 0}
                            className="h-2"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={`https://i.pravatar.cc/150?u=${project._id}`} />
                            <AvatarFallback>
                              {project.createdBy?.name?.substring(0, 2).toUpperCase() || 'UN'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-600">
                            {project.createdBy?.name || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* List View - Desktop Table, Mobile Cards */
              <>
                {/* Desktop Table Header */}
                <div className="hidden lg:grid grid-cols-[3fr_2fr_1fr_1fr_1fr_2fr] gap-4 px-4 pb-3 border-b text-sm font-semibold text-gray-500">
                  <div>Name</div>
                  <div>Status</div>
                  <div>Priority</div>
                  <div>Lead</div>
                  <div>Target Date</div>
                  <div>Progress</div>
                </div>

                {/* Projects */}
                <div className="mt-4 space-y-2">
                  {projects.map((project) => (
                    <div
                      key={project._id}
                      onClick={() => router.push(`/project-detail/${project._id}`)}
                      className="lg:grid lg:grid-cols-[3fr_2fr_1fr_1fr_1fr_2fr] gap-4 items-center p-4 rounded-lg hover:bg-gray-50 cursor-pointer border lg:border-0"
                    >
                      {/* Mobile Card View */}
                      <div className="lg:hidden space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-gray-800 flex-1">{project.name}</h3>
                          <Badge
                            variant="outline"
                            className={
                              project.status === 'active'
                                ? "border-green-300 bg-green-50 text-green-700 font-semibold"
                                : project.status === 'completed'
                                ? "border-blue-300 bg-blue-50 text-blue-700 font-semibold"
                                : "border-gray-300 bg-gray-50 text-gray-700 font-semibold"
                            }
                          >
                            <span className={`w-2 h-2 rounded-full mr-2 ${
                              project.status === 'active' ? 'bg-green-500' :
                              project.status === 'completed' ? 'bg-blue-500' : 'bg-gray-500'
                            }`}></span>
                            {project.status?.charAt(0).toUpperCase() + project.status?.slice(1)}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="font-medium text-gray-600">
                            <Users className="w-3 h-3 mr-1.5" />
                            <span>{project.members?.length || 0} members</span>
                          </Badge>
                          <Badge variant="secondary" className="font-medium text-gray-600">
                            <CalendarDays className="w-3 h-3 mr-1.5" />
                            <span>
                              {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No deadline'}
                            </span>
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3">
                          <Progress
                            value={project.status === 'completed' ? 100 : project.status === 'active' ? 50 : 0}
                            className="h-2 flex-1"
                          />
                          <span className="text-sm font-semibold text-gray-700">
                            {project.status === 'completed' ? '100%' : project.status === 'active' ? '50%' : '0%'}
                          </span>
                        </div>
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden lg:block">
                        <p className="font-semibold text-gray-800">{project.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="font-medium text-gray-600 text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            <span>{project.members?.length || 0}</span>
                          </Badge>
                          <Badge variant="secondary" className="font-medium text-gray-600 text-xs">
                            <CalendarDays className="w-3 h-3 mr-1" />
                            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                          </Badge>
                        </div>
                      </div>

                      <div className="hidden lg:block">
                        <Badge
                          variant="outline"
                          className={
                            project.status === 'active'
                              ? "border-green-300 bg-green-50 text-green-700 font-semibold"
                              : project.status === 'completed'
                              ? "border-blue-300 bg-blue-50 text-blue-700 font-semibold"
                              : "border-gray-300 bg-gray-50 text-gray-700 font-semibold"
                          }
                        >
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            project.status === 'active' ? 'bg-green-500' :
                            project.status === 'completed' ? 'bg-blue-500' : 'bg-gray-500'
                          }`}></span>
                          {project.status?.charAt(0).toUpperCase() + project.status?.slice(1)}
                        </Badge>
                      </div>

                      <div className="hidden lg:block text-sm font-medium text-gray-700">-</div>

                      <div className="hidden lg:block">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={`https://i.pravatar.cc/150?u=${project._id}`} />
                          <AvatarFallback>
                            {project.createdBy?.name?.substring(0, 2).toUpperCase() || 'UN'}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="hidden lg:block text-sm font-medium text-gray-700">
                        {project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}
                      </div>

                      <div className="hidden lg:flex items-center gap-3">
                        <Progress
                          value={project.status === 'completed' ? 100 : project.status === 'active' ? 50 : 0}
                          className="h-2"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          {project.status === 'completed' ? '100%' : project.status === 'active' ? '50%' : '0%'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
        </main>
      </div>
    </div>
  );
}
