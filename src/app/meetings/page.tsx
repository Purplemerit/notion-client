'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Video,
  Calendar as CalendarIcon,
  Upload,
  ChevronLeft,
  ChevronRight,
  Bell,
  MessageSquare,
  MoreHorizontal,
  Clock,
  CalendarDays,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { meetingsAPI, userAPI, tasksAPI, projectsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Meeting {
  _id: string;
  title: string;
  description?: string;
  roomId: string;
  scheduledDate: Date;
  startTime: string;
  endTime: string;
  createdBy: any;
  participants: any[];
  status: string;
  relatedTasks?: string[];
  relatedProjects?: string[];
  settings: {
    requiresAuth?: boolean;
    maxParticipants?: number;
    recordingEnabled?: boolean;
  };
}

// Calendar Component with Upcoming Meetings
const CalendarWithMeetings = ({
  upcomingMeetings,
  loading,
  router
}: {
  upcomingMeetings: Meeting[];
  loading: boolean;
  router: any;
}) => {
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const currentDate = new Date();
  const currentDay = currentDate.getDate();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const dates: number[] = [];
  const startDay = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = startDay - 1; i >= 0; i--) {
    dates.push(prevMonthDays - i);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    dates.push(i);
  }

  const remainingDays = 35 - dates.length;
  for (let i = 1; i <= remainingDays; i++) {
    dates.push(i);
  }

  return (
    <Card
      className="bg-white shadow-sm w-full flex flex-col rounded-2xl border-gray-300 p-4"
    >
      {/* Calendar Section */}
      <div className="mb-6">
        <div className="flex flex-row items-center justify-between pb-2 px-2">
          <h2 className="text-lg font-bold">
            {new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-full hover:bg-gray-100"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-full hover:bg-gray-100"
              onClick={handleNextMonth}
            >
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Button>
          </div>
        </div>
        <div className="px-2">
          <div className="grid grid-cols-7 text-center text-sm">
            {daysOfWeek.map((day) => (
              <div key={day} className="font-semibold text-gray-400 py-2">{day}</div>
            ))}
            {dates.map((date, index) => {
              const isCurrentMonth = index >= startDay && index < startDay + daysInMonth;
              const isViewingCurrentMonth = viewMonth === currentMonth && viewYear === currentYear;
              const isCurrentDay = date === currentDay && isCurrentMonth && isViewingCurrentMonth;
              return (
                <div
                  key={index}
                  className={`w-9 h-9 font-semibold mx-auto rounded-full flex items-center justify-center cursor-pointer transition-colors
                    ${isCurrentDay ? 'bg-black text-white' : ''}
                    ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'}
                  `}
                >
                  {date}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Meetings Section */}
      <div className="flex flex-col gap-4 flex-1">
        <h3 className="text-lg font-semibold text-gray-800 px-2">Upcoming Meetings</h3>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : upcomingMeetings.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No upcoming meetings</p>
        ) : (
          upcomingMeetings.map((meeting) => (
            <Card
              key={meeting._id}
              className="bg-gray-50 shadow-sm rounded-xl border-gray-300 w-full"
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm">{meeting.title}</h4>
                    <p className="text-xs text-gray-500">{meeting.startTime} - {meeting.endTime}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Switch />
                    <Button size="sm" className="h-8 px-3 text-xs" onClick={() => router.push(`/meeting-room/${meeting.roomId}`)}>Start</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${meeting.createdBy?._id}`} />
                      <AvatarFallback>{meeting.createdBy?.name?.charAt(0) || 'H'}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold text-gray-700">{meeting.createdBy?.name || 'Host'}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{meeting.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </Card>
  );
};

// Create Schedule Card Component
const CreateScheduleCard = ({ onMeetingCreated, onCancel }: { onMeetingCreated: () => void, onCancel: () => void }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const today = new Date().toISOString().split('T')[0];
  const [scheduledDate, setScheduledDate] = useState(today);
  const [startTime, setStartTime] = useState("08:00 AM");
  const [endTime, setEndTime] = useState("11:00 AM");
  const [creating, setCreating] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState<Meeting | null>(null);
  const [copied, setCopied] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [loadingTasksProjects, setLoadingTasksProjects] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTasksAndProjects = async () => {
      try {
        const [fetchedTasks, fetchedProjects] = await Promise.all([
          tasksAPI.getAll(),
          projectsAPI.getAll()
        ]);
        setTasks(fetchedTasks || []);
        setProjects(fetchedProjects || []);
      } catch (error) {
        console.error("Failed to fetch tasks/projects:", error);
      } finally {
        setLoadingTasksProjects(false);
      }
    };
    fetchTasksAndProjects();
  }, []);

  const handleCreateMeeting = async () => {
    try {
      setCreating(true);
      const meeting = await meetingsAPI.create({
        title,
        description,
        scheduledDate,
        startTime,
        endTime,
        relatedTasks: selectedTasks,
        relatedProjects: selectedProjects,
        requiresAuth: false,
        maxParticipants: 50,
        recordingEnabled: false,
      });

      setCreatedMeeting(meeting);
      toast({
        title: "Meeting Created!",
        description: "Your meeting has been scheduled successfully.",
      });
      onMeetingCreated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create meeting",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const copyMeetingLink = () => {
    if (createdMeeting) {
      const link = `${window.location.origin}/meeting-room/${createdMeeting.roomId}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Meeting link has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (createdMeeting) {
    return (
      <Card className="bg-white rounded-xl shadow-sm">
        <CardContent className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center border">
              <Check className="w-8 h-8 text-green-600"/>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Meeting Created!</h3>
              <p className="text-md text-gray-500">Share this link with participants</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-600">Meeting Title</label>
              <p className="text-lg font-medium text-gray-800 mt-1">{createdMeeting.title}</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600">Room ID</label>
              <p className="text-lg font-mono text-primary mt-1">{createdMeeting.roomId}</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600">Shareable Link</label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={`${window.location.origin}/meeting-room/${createdMeeting.roomId}`}
                  readOnly
                  className="flex-1 font-mono text-sm"
                />
                <Button onClick={copyMeetingLink} variant="outline">
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                onClick={() => setCreatedMeeting(null)}
                variant="outline"
                className="flex-1"
              >
                Create Another
              </Button>
              <Button
                onClick={() => window.open(`/meeting-room/${createdMeeting.roomId}`, '_blank')}
                className="flex-1"
              >
                Join Meeting
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-sm">
      <CardContent className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border">
            <CalendarIcon className="w-8 h-8 text-gray-600"/>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">Create Schedule</h3>
            <p className="text-md text-gray-500">Fill in the details to schedule a meeting</p>
          </div>
        </div>

        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleCreateMeeting(); }}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">Description (Optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-12"
              placeholder="Add meeting description..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">Date</label>
            <div className="relative">
              <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="h-12 pl-12"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">Time</label>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="time"
                  value={startTime.replace(/ AM| PM/, '')}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-12 pl-12"
                  required
                />
              </div>
              <span className="text-gray-400">-</span>
              <div className="relative flex-1">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="time"
                  value={endTime.replace(/ AM| PM/, '')}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-12 pl-12"
                  required
                />
              </div>
            </div>
          </div>

          {/* Related Tasks */}
          {!loadingTasksProjects && tasks.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">Related Tasks (Optional)</label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {tasks.slice(0, 10).map((task) => (
                  <div key={task._id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`task-${task._id}`}
                      checked={selectedTasks.includes(task._id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTasks([...selectedTasks, task._id]);
                        } else {
                          setSelectedTasks(selectedTasks.filter(id => id !== task._id));
                        }
                      }}
                    />
                    <Label
                      htmlFor={`task-${task._id}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {task.title}
                      {task.status && (
                        <Badge variant="outline" className="ml-2 text-xs">{task.status}</Badge>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Projects */}
          {!loadingTasksProjects && projects.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">Related Projects (Optional)</label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {projects.slice(0, 10).map((project) => (
                  <div key={project._id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`project-${project._id}`}
                      checked={selectedProjects.includes(project._id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedProjects([...selectedProjects, project._id]);
                        } else {
                          setSelectedProjects(selectedProjects.filter(id => id !== project._id));
                        }
                      }}
                    />
                    <Label
                      htmlFor={`project-${project._id}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {project.name}
                      {project.status && (
                        <Badge variant="outline" className="ml-2 text-xs">{project.status}</Badge>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" className="text-gray-700 font-semibold h-12 px-8 border-gray-300" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating} className="font-semibold h-12 px-8">
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Meeting"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// New Meeting Card (redesigned UI like image)
const NewMeetingCard = ({
  meetingUrl,
  setMeetingUrl,
  onJoin,
  meetingName,
  setMeetingName,
  onSchedule,
  currentUser
}: {
  meetingUrl: string;
  setMeetingUrl: (v: string) => void;
  onJoin: () => void;
  meetingName: string;
  setMeetingName: (v: string) => void;
  onSchedule: () => void;
  currentUser: any;
}) => {
  return (
    <Card
      className="bg-white shadow-sm w-full rounded-2xl border-gray-300 p-4 sm:p-6 md:p-8"
    >
      <CardContent className="p-0">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-6 sm:mb-8">
          Hello {currentUser?.name || 'User'}
        </h1>
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-6">
          <Button
            onClick={onJoin}
            className="inline-flex items-center justify-center gap-3 px-6 sm:px-10 py-3 text-sm sm:text-base font-semibold rounded-xl bg-purple-200 hover:bg-purple-300 text-gray-800"
          >
            <Video className="w-5 h-5" />
            New Meeting
          </Button>
          <Button
            onClick={onSchedule}
            variant="outline"
            className="inline-flex items-center justify-center gap-3 px-6 sm:px-10 py-3 text-sm sm:text-base font-semibold rounded-xl border-gray-300 bg-white hover:bg-gray-50 text-gray-800"
          >
            <CalendarIcon className="w-5 h-5" />
            Schedule Meeting
          </Button>
        </div>
        {/* Form Fields */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-8 space-y-3">
            <Input
              placeholder="Name of your meeting"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              className="h-14 text-base rounded-xl border-gray-300"
            />
            <Input 
              placeholder="Paste Your Meeting Url Here" 
              value={meetingUrl} 
              onChange={(e) => setMeetingUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onJoin()}
              className="h-14 text-base rounded-xl border-gray-300"
            />
          </div>

          <div className="lg:col-span-4 flex flex-col items-stretch gap-3">
            <Select>
              <SelectTrigger className="h-14 text-base rounded-xl border-gray-300">
                <SelectValue placeholder="English" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="en">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7410 3900" className="w-5 h-3">
                      <rect width="7410" height="3900" fill="#b22234"/>
                      <path d="M0,450H7410m0,600H0m0,600H7410m0,600H0m0,600H7410m0,600H0" stroke="#fff" strokeWidth="300"/>
                      <rect width="2964" height="2100" fill="#3c3b6e"/>
                      <g fill="#fff">
                        <g id="s18">
                          <g id="s9">
                            <g id="s5">
                              <g id="s4">
                                <path id="s" d="M247,90 317.534230,307.082039 132.873218,172.917961H361.126782L176.465770,307.082039z"/>
                                <use xlinkHref="#s" y="420"/>
                                <use xlinkHref="#s" y="840"/>
                                <use xlinkHref="#s" y="1260"/>
                              </g>
                              <use xlinkHref="#s" y="1680"/>
                            </g>
                            <use xlinkHref="#s4" x="247" y="210"/>
                          </g>
                          <use xlinkHref="#s9" x="494"/>
                        </g>
                        <use xlinkHref="#s18" x="988"/>
                        <use xlinkHref="#s9" x="1976"/>
                        <use xlinkHref="#s5" x="2470"/>
                      </g>
                    </svg>
                    English
                  </div>
                </SelectItem>
                <SelectItem value="hi">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" className="w-5 h-3">
                      <rect width="900" height="600" fill="#f93"/>
                      <rect width="900" height="200" y="200" fill="#fff"/>
                      <rect width="900" height="200" y="400" fill="#128807"/>
                      <circle cx="450" cy="300" r="50" fill="#008"/>
                      <circle cx="450" cy="300" r="45" fill="#fff"/>
                      <circle cx="450" cy="300" r="15" fill="#008"/>
                      <g fill="#008">
                        <circle cx="450" cy="255" r="3"/>
                        <g id="spokes">
                          <path d="M450,300 L450,260" strokeWidth="2" stroke="#008"/>
                        </g>
                        <use xlinkHref="#spokes" transform="rotate(15 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(30 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(45 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(60 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(75 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(90 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(105 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(120 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(135 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(150 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(165 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(180 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(195 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(210 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(225 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(240 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(255 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(270 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(285 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(300 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(315 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(330 450 300)"/>
                        <use xlinkHref="#spokes" transform="rotate(345 450 300)"/>
                      </g>
                    </svg>
                    Hindi
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={onJoin}
              className="h-12 sm:h-14 text-base sm:text-lg font-bold rounded-xl bg-[#846BD2] hover:bg-purple-500 text-white"
            >
              Join Here +
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Meeting Component
export default function Meeting() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState("meetings");
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingName, setMeetingName] = useState('');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const { toast } = useToast();

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const [profile, allMeetings, upcoming] = await Promise.all([
        userAPI.getProfile(),
        meetingsAPI.getAll(),
        meetingsAPI.getUpcoming(7)
      ]);
      setCurrentUser(profile);
      setMeetings(allMeetings.slice(0, 5));
      setUpcomingMeetings(upcoming.slice(0, 3));
    } catch (error: any) {
      console.error("Failed to fetch data:", error);
      toast({
        title: "Error",
        description: "Failed to load meetings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleJoinMeeting = () => {
    if (!meetingUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a meeting URL or room ID",
        variant: "destructive",
      });
      return;
    }

    // Extract room ID from URL or use as is
    const roomIdMatch = meetingUrl.match(/meeting-room\/([a-zA-Z0-9_-]+)/);
    const roomId = roomIdMatch ? roomIdMatch[1] : meetingUrl.trim();

    router.push(`/meeting-room/${roomId}`);
  };

  const handleScheduleMeeting = () => {
    setShowScheduleForm(true);
  };

  const copyMeetingLink = (roomId: string) => {
    const link = `${window.location.origin}/meeting-room/${roomId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied!",
      description: "Meeting link has been copied to clipboard",
    });
  };

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      <main className="flex-1 p-4 flex gap-4 justify-center max-w-[1600px] mx-auto">
        {/* Main Content Column */}
        <div className="flex-1 max-w-[1080px] flex flex-col gap-4">
          {/* Header */}
          <header className="flex items-center justify-between w-full">
            <div className="flex-1">
              <div className="relative max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search Meeting"
                  className="pl-11 bg-white h-10 w-full"
                  style={{
                    borderRadius: '24px',
                    border: '1px solid #E6E6E6',
                    background: '#FFF',
                    boxShadow: '0 4px 4px 0 rgba(221, 221, 221, 0.25)',
                  }}
                />
              </div>
            </div>
          </header>

          {/* Main Meeting Card */}
          {!showScheduleForm ? (
            <NewMeetingCard
              meetingUrl={meetingUrl}
              setMeetingUrl={setMeetingUrl}
              onJoin={handleJoinMeeting}
              meetingName={meetingName}
              setMeetingName={setMeetingName}
              onSchedule={handleScheduleMeeting}
              currentUser={currentUser}
            />
          ) : (
            <CreateScheduleCard 
              onMeetingCreated={() => {
                fetchMeetings();
                setShowScheduleForm(false);
              }}
              onCancel={() => setShowScheduleForm(false)}
            />
          )}

          {/* Recent Meetings */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Recent Meeting</h2>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : meetings.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No meetings scheduled</p>
            ) : (
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <Card key={meeting._id} className="bg-white rounded-xl shadow-sm border-gray-100" style={{ borderLeftWidth: 6, borderLeftColor: meeting.status === 'ongoing' ? '#34D399' : meeting.status === 'scheduled' ? '#C084FC' : '#FDE68A' }}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex-1">
                          <span className="text-sm text-gray-500">
                            {new Date(meeting.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                          <div className="text-sm text-gray-500">{meeting.startTime} - {meeting.endTime}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {meeting.participants?.slice(0,3).map((p, i) => (
                              <Avatar key={i} className="h-8 w-8 border-2 border-white">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p?._id || i}`} />
                                <AvatarFallback>{p?.name?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg text-gray-800 mb-2">{meeting.title}</h3>
                      {meeting.description && (
                        <p className="text-sm text-gray-500 mb-3">{meeting.description}</p>
                      )}
                      {/* Related Tasks and Projects */}
                      {((meeting.relatedTasks && meeting.relatedTasks.length > 0) ||
                        (meeting.relatedProjects && meeting.relatedProjects.length > 0)) && (
                        <div className="mb-3 space-y-2">
                          {meeting.relatedTasks && meeting.relatedTasks.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              <span className="text-xs font-semibold text-gray-600">Tasks:</span>
                              {(meeting.relatedTasks as any[]).map((task: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {task.title || task}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {meeting.relatedProjects && meeting.relatedProjects.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              <span className="text-xs font-semibold text-gray-600">Projects:</span>
                              {(meeting.relatedProjects as any[]).map((project: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                  {project.name || project}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 font-mono">Room: {meeting.roomId}</span>
                          <Button variant="ghost" size="sm" onClick={() => copyMeetingLink(meeting.roomId)} className="h-6 px-2">
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <Button onClick={() => router.push(`/meeting-room/${meeting.roomId}`)} size="sm" className="bg-primary hover:bg-primary/90">
                          Join Meeting
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="hidden lg:flex lg:min-w-[360px] flex-shrink-0 flex-col gap-4">
          <div className="flex items-center gap-1 justify-end">
            <Button variant="ghost" size="icon" className="w-10 h-10 border border-gray-300">
              <MessageSquare className="w-5 h-5 text-gray-500" />
            </Button>
            <Button variant="ghost" size="icon" className="w-10 h-10 border border-gray-300">
              <Bell className="w-5 h-5 text-gray-500" />
            </Button>
            <Button variant="ghost" size="icon" className="w-10 h-10 border border-gray-300">
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </Button>
          </div>
          <CalendarWithMeetings 
            upcomingMeetings={upcomingMeetings}
            loading={loading}
            router={router}
          />
        </aside>
      </main>
    </div>
  );
}
