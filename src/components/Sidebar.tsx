'use client';

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Home,
  MessageCircle,
  Globe,
  Users,
  Calendar,
  Monitor,
  FolderOpen,
  Settings,
  LogOut,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Plus,
  CheckSquare,
  FileText,
} from "lucide-react";
import { useChatContext } from "@/contexts/ChatContext";

interface SidebarProps {
  currentView?: string;
  onViewChange?: (view: string) => void;
}

// --- CONSTANTS for menu items ---
const menuItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "chat", label: "Chat", icon: MessageCircle },
];

const collaborationItems = [
  { id: "community", label: "Community", icon: Globe },
  { id: "projects", label: "Projects/Team", icon: Users, hasDropdown: true },
  { id: "calendar", label: "Calendar", icon: Calendar, hasDropdown: true },
];

const creativeItems = [
  { id: "whiteboard", label: "Whiteboard", icon: Monitor },
  { id: "collection", label: "Collection", icon: FolderOpen },
];

const accountItems = [
  { id: "settings", label: "Settings", icon: Settings },
  { id: "logout", label: "Log Out", icon: LogOut },
];

export const Sidebar = ({ currentView, onViewChange }: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { getTotalUnreadCount } = useChatContext();

  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    projects: false,
    calendar: false,
  });

  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleNavigation = (view: string) => {
    // Map view names to routes
    const routeMap: { [key: string]: string } = {
      home: "/dashboard",
      dashboard: "/dashboard",
      chat: "/chat",
      community: "/community",
      task: "/tasks",
      meeting: "/calendar",
      whiteboard: "/whiteboard",
      collection: "/collection",
      settings: "/settings",
      "new-project": "/new-project",
    };

    const route = routeMap[view] || `/${view}`;
    router.push(route);

    // Call the optional onViewChange if provided
    if (onViewChange) {
      onViewChange(view);
    }
  };

  return (
    <div
      className="inline-flex flex-col items-start flex-shrink-0 text-gray-800 sticky top-0 transition-all duration-300"
      style={{
        height: '100vh',
        padding: '24px 0',
        gap: '40px',
        borderRadius: '0 24px 24px 0',
        border: '2px solid #F1F1F1',
        background: 'linear-gradient(174deg, #C9C4EE 0%, #EFEDFA 56.33%, #E1DEF6 100%)',
        width: isCollapsed ? '80px' : 'auto',
        maxWidth: isCollapsed ? '80px' : '332px',
      }}
    >
      {/* Logo and Collapse Button */}
      <div className="w-full relative" style={{ paddingLeft: '24px', paddingRight: isCollapsed ? '24px' : '0' }}>
        <div className="h-8 flex items-center w-full">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Image 
                src="/purplemerit.svg" 
                alt="Purple Merit Logo" 
                width={40} 
                height={40}
                priority
              />
              <span className="text-2xl font-bold">
                <span className="text-black">Purple</span>
                <span className="text-white"> Merit</span>
              </span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hover:opacity-70 transition-opacity ${isCollapsed ? 'mx-auto' : 'absolute'}`}
            style={isCollapsed ? {} : { right: '0', top: '50%', transform: 'translateY(-50%)' }}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.4783 6.72065L17.2783 11.5206L12.4783 16.3206M5.75828 6.72065L10.5583 11.5206L5.75828 16.3206" stroke="#212121" strokeOpacity="0.8" strokeWidth="1.728" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg 
                width="29" 
                height="39" 
                viewBox="0 0 29 39" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: '24px', height: '32px' }}
              >
                <path d="M-3.8147e-05 19.44C-3.8147e-05 8.70359 8.68746 3.8147e-06 19.404 3.8147e-06C30.1206 3.8147e-06 28.4121 8.70359 28.4121 19.44C28.4121 30.1764 30.1206 38.88 19.404 38.88C8.68746 38.88 -3.8147e-05 30.1764 -3.8147e-05 19.44Z" fill="white"/>
                <path d="M16.3186 24.2407L11.5186 19.4407L16.3186 14.6407M23.0386 24.2407L18.2386 19.4407L23.0386 14.6407" stroke="#212121" strokeOpacity="0.8" strokeWidth="1.728" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Main Menu */}
      <div className="flex-1 px-6 space-y-6 overflow-y-auto w-full">
        <div>
          {!isCollapsed && (
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Main Menu
            </h3>
          )}
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === `/${item.id}` || 
                               (item.id === 'home' && (pathname === '/' || pathname === '/dashboard'));
              const unreadCount = item.id === 'chat' ? getTotalUnreadCount() : 0;
              
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`justify-center items-center gap-2.5 text-white ${
                    isActive
                      ? "rounded-[20px] shadow-[inset_0_2px_3px_0_rgba(110,76,181,0.38)]"
                      : "text-gray-800 hover:bg-black/5 rounded-[20px]"
                  }`}
                  style={
                    isActive
                      ? {
                          display: 'flex',
                          width: isCollapsed ? '48px' : '292px',
                          padding: '10px',
                          background: '#AEA1E4',
                          justifyContent: isCollapsed ? 'center' : 'flex-start',
                        }
                      : {
                          display: 'flex',
                          width: isCollapsed ? '48px' : '292px',
                          padding: '10px',
                          justifyContent: isCollapsed ? 'center' : 'flex-start',
                        }
                  }
                  onClick={() => handleNavigation(item.id)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon size={18} className={isCollapsed ? '' : 'mr-3'} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.id === 'chat' && unreadCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-auto bg-primary text-primary-foreground"
                        >
                          {unreadCount}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        <div>
          {!isCollapsed && (
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Collaboration
            </h3>
          )}
          <div className="space-y-1">
            {/* Community */}
            <Button
              variant="ghost"
              className={`justify-center items-center gap-2.5 text-white ${
                pathname === "/community"
                  ? "rounded-[20px] shadow-[inset_0_2px_3px_0_rgba(110,76,181,0.38)]"
                  : "text-gray-800 hover:bg-black/5 rounded-[20px]"
              }`}
              style={
                pathname === "/community"
                  ? {
                      display: 'flex',
                      width: isCollapsed ? '48px' : '292px',
                      padding: '10px',
                      background: '#AEA1E4',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                    }
                  : {
                      display: 'flex',
                      width: isCollapsed ? '48px' : '292px',
                      padding: '10px',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                    }
              }
              onClick={() => handleNavigation("community")}
              title={isCollapsed ? "Community" : undefined}
            >
              <Globe size={18} className={isCollapsed ? '' : 'mr-3'} />
              {!isCollapsed && <span className="flex-1 text-left">Community</span>}
            </Button>

            {/* Projects/Team with dropdown */}
            {!isCollapsed && (
              <div>
                <Button
                  variant="ghost"
                  className="justify-center items-center gap-2.5 text-gray-800 hover:bg-black/5 rounded-[20px]"
                  style={{
                    display: 'flex',
                    width: '292px',
                    padding: '10px',
                  }}
                  onClick={() => toggleSection("projects")}
                >
                  <Users size={18} className="mr-3" />
                  <span className="flex-1 text-left">Projects/Team</span>
                  {expandedSections.projects ? (
                    <ChevronUp size={16} className="ml-auto" />
                  ) : (
                    <ChevronDown size={16} className="ml-auto" />
                  )}
                </Button>

                {expandedSections.projects && (
                  <div className="ml-9 mt-2 space-y-1">
                    <Button
                      variant="ghost"
                      className={`justify-center items-center gap-2.5 text-white ${
                        pathname === "/new-project"
                          ? "rounded-[20px] shadow-[inset_0_2px_3px_0_rgba(110,76,181,0.38)]"
                          : "text-gray-800 hover:bg-black/5 rounded-[20px]"
                      }`}
                      style={
                        pathname === "/new-project"
                          ? {
                              display: 'flex',
                              width: '256px',
                              padding: '10px',
                              background: '#AEA1E4',
                            }
                          : {
                              display: 'flex',
                              width: '256px',
                              padding: '10px',
                            }
                      }
                      onClick={() => handleNavigation("new-project")}
                    >
                      <Plus size={16} className="mr-3" />
                      <span className="flex-1 text-left">New Project</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Collapsed state - show Projects icon */}
            {isCollapsed && (
              <Button
                variant="ghost"
                className={`justify-center items-center gap-2.5 text-white ${
                  pathname === "/new-project" || pathname === "/projects"
                    ? "rounded-[20px] shadow-[inset_0_2px_3px_0_rgba(110,76,181,0.38)]"
                    : "text-gray-800 hover:bg-black/5 rounded-[20px]"
                }`}
                style={
                  pathname === "/new-project" || pathname === "/projects"
                    ? {
                        display: 'flex',
                        width: '48px',
                        padding: '10px',
                        background: '#AEA1E4',
                        justifyContent: 'center',
                      }
                    : {
                        display: 'flex',
                        width: '48px',
                        padding: '10px',
                        justifyContent: 'center',
                      }
                }
                onClick={() => handleNavigation("new-project")}
                title="Projects/Team"
              >
                <Users size={18} />
              </Button>
            )}

            {/* Calendar with dropdown */}
            {!isCollapsed && (
              <div>
                <Button
                  variant="ghost"
                  className="justify-center items-center gap-2.5 text-gray-800 hover:bg-black/5 rounded-[20px]"
                  style={{
                    display: 'flex',
                    width: '292px',
                    padding: '10px',
                  }}
                  onClick={() => toggleSection("calendar")}
                >
                  <Calendar size={18} className="mr-3" />
                  <span className="flex-1 text-left">Calendar</span>
                  {expandedSections.calendar ? (
                    <ChevronUp size={16} className="ml-auto" />
                  ) : (
                    <ChevronDown size={16} className="ml-auto" />
                  )}
                </Button>

                {expandedSections.calendar && (
                  <div className="ml-9 mt-2 space-y-1">
                    <Button
                      variant="ghost"
                      className={`justify-center items-center gap-2.5 text-white ${
                        pathname === "/teams"
                          ? "rounded-[20px] shadow-[inset_0_2px_3px_0_rgba(110,76,181,0.38)]"
                          : "text-gray-800 hover:bg-black/5 rounded-[20px]"
                      }`}
                      style={
                        pathname === "/teams"
                          ? {
                              display: 'flex',
                              width: '256px',
                              padding: '10px',
                              background: '#AEA1E4',
                            }
                          : {
                              display: 'flex',
                              width: '256px',
                              padding: '10px',
                            }
                      }
                      onClick={() => router.push("/teams")}
                    >
                      <Users size={16} className="mr-3" />
                      <span className="flex-1 text-left">Task</span>
                    </Button>

                    <Button
                      variant="ghost"
                      className={`justify-center items-center gap-2.5 text-white ${
                        pathname === "/meetings"
                          ? "rounded-[20px] shadow-[inset_0_2px_3px_0_rgba(110,76,181,0.38)]"
                          : "text-gray-800 hover:bg-black/5 rounded-[20px]"
                      }`}
                      style={
                        pathname === "/meetings"
                          ? {
                              display: 'flex',
                              width: '256px',
                              padding: '10px',
                              background: '#AEA1E4',
                            }
                          : {
                              display: 'flex',
                              width: '256px',
                              padding: '10px',
                            }
                      }
                      onClick={() => router.push("/meetings")}
                    >
                      <Calendar size={16} className="mr-3" />
                      <span className="flex-1 text-left">Meetings</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Collapsed state - show Calendar icon */}
            {isCollapsed && (
              <Button
                variant="ghost"
                className={`justify-center items-center gap-2.5 text-white ${
                  pathname === "/teams" || pathname === "/meetings"
                    ? "rounded-[20px] shadow-[inset_0_2px_3px_0_rgba(110,76,181,0.38)]"
                    : "text-gray-800 hover:bg-black/5 rounded-[20px]"
                }`}
                style={
                  pathname === "/teams" || pathname === "/meetings"
                    ? {
                        display: 'flex',
                        width: '48px',
                        padding: '10px',
                        background: '#AEA1E4',
                        justifyContent: 'center',
                      }
                    : {
                        display: 'flex',
                        width: '48px',
                        padding: '10px',
                        justifyContent: 'center',
                      }
                }
                onClick={() => router.push("/meetings")}
                title="Calendar"
              >
                <Calendar size={18} />
              </Button>
            )}
          </div>
        </div>

        <div>
          {!isCollapsed && (
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Creatives
            </h3>
          )}
          <div className="space-y-1">
            {creativeItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={`justify-center items-center gap-2.5 text-white ${
                  pathname === `/${item.id}`
                    ? "rounded-[20px] shadow-[inset_0_2px_3px_0_rgba(110,76,181,0.38)]"
                    : "text-gray-800 hover:bg-black/5 rounded-[20px]"
                }`}
                style={
                  pathname === `/${item.id}`
                    ? {
                        display: 'flex',
                        width: isCollapsed ? '48px' : '292px',
                        padding: '10px',
                        background: '#AEA1E4',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                      }
                    : {
                        display: 'flex',
                        width: isCollapsed ? '48px' : '292px',
                        padding: '10px',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                      }
                }
                onClick={() => handleNavigation(item.id)}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon size={18} className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Account Section */}
      <div className="px-6 space-y-2">
        {!isCollapsed && (
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Account
          </h3>
        )}
        <div className="space-y-1">
          {accountItems.map((item) =>
            item.id === "settings" ? (
              <div
                key={item.id}
                className={`flex items-center text-gray-800 ${pathname === '/settings' ? '' : 'hover:bg-black/5 rounded-[20px]'} justify-between`}
                style={
                  pathname === '/settings'
                    ? {
                        width: isCollapsed ? '48px' : '292px',
                        height: '48px',
                        padding: '10px',
                        borderRadius: '32px',
                        background: '#AEA1E4',
                        boxShadow: 'inset 0 2px 3px 0 rgba(110, 76, 181, 0.38)',
                        justifyContent: isCollapsed ? 'center' : 'space-between',
                      }
                    : {
                        width: isCollapsed ? '48px' : '292px',
                        height: '48px',
                        padding: '10px',
                        borderRadius: '20px',
                        justifyContent: isCollapsed ? 'center' : 'space-between',
                      }
                }
              >
                <Button
                  variant="ghost"
                  className="hover:bg-transparent p-0 h-full"
                  style={{ 
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    flex: 'none'
                  }}
                  onClick={() => handleNavigation(item.id)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon size={18} className={isCollapsed ? '' : 'mr-3'} />
                  {!isCollapsed && <span className="text-left">{item.label}</span>}
                </Button>
                {!isCollapsed && (
                  <div className="flex items-center ml-auto">
                    <svg width="60" height="32" viewBox="0 0 93 51" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g filter="url(#filter0_d_3471_15893)">
                        <rect x="6" y="4" width="80.99" height="38.9935" rx="19.4967" fill="white"/>
                        <rect x="10" y="8" width="32" height="30.9935" rx="15.4967" fill="#5865F2"/>
                        <path d="M26.0088 21.5469C26.5259 21.5469 27.022 21.7525 27.3877 22.1182C27.7533 22.4838 27.959 22.98 27.959 23.4971C27.9589 24.0142 27.7533 24.5103 27.3877 24.876C27.022 25.2416 26.5259 25.4472 26.0088 25.4473C25.4917 25.4473 24.9956 25.2416 24.6299 24.876C24.2642 24.5103 24.0586 24.0142 24.0586 23.4971C24.0586 22.9799 24.2642 22.4839 24.6299 22.1182C24.9956 21.7525 25.4916 21.5469 26.0088 21.5469Z" stroke="white" strokeWidth="0.5"/>
                        <path d="M26 19.0971V17.9971M26 28.9971V27.8971M21.6 23.4971H20.5M31.5 23.4971H30.4M22.887 26.6101L22.1115 27.3856M29.8885 19.6086L29.113 20.3841M29.113 26.6101L29.8885 27.3856M22.1115 19.6086L22.887 20.3841M28.2 23.4971C28.2 24.0805 27.9682 24.6401 27.5556 25.0527C27.1431 25.4653 26.5835 25.6971 26 25.6971C25.4165 25.6971 24.8569 25.4653 24.4444 25.0527C24.0318 24.6401 23.8 24.0805 23.8 23.4971C23.8 22.9136 24.0318 22.354 24.4444 21.9414C24.8569 21.5289 25.4165 21.2971 26 21.2971C26.5835 21.2971 27.1431 21.5289 27.5556 21.9414C27.9682 22.354 28.2 22.9136 28.2 23.4971Z" stroke="white" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round"/>
                        <path d="M70.9431 24.7432H70.9468C71.2424 24.7429 71.5303 24.7166 71.8106 24.6644L71.7818 24.669C71.2569 26.5571 69.5529 27.9202 67.5306 27.9202H67.504H67.5054C65.058 27.9175 63.0746 25.9341 63.0723 23.4867C63.078 22.5238 63.3945 21.5881 63.9746 20.8195C64.5548 20.051 65.3675 19.4903 66.292 19.2208L66.3236 19.2131C66.2735 19.4879 66.2487 19.7668 66.2494 20.0463V20.0495C66.2517 22.6411 68.3519 24.7413 70.9431 24.7436V24.7432ZM67.4994 18.2154C67.4449 18.1417 67.3723 18.0834 67.2886 18.046C67.2049 18.0087 67.1129 17.9937 67.0217 18.0024H67.024C64.2046 18.2731 62.0156 20.622 62 23.4858V23.4872C62.0037 26.5264 64.4666 28.9893 67.5054 28.9935H67.5333C70.393 28.9935 72.74 26.8012 72.9865 24.0057L72.9879 23.9851C72.9957 23.8981 72.9821 23.8105 72.9483 23.7299C72.9146 23.6494 72.8616 23.5783 72.7941 23.5229L72.7932 23.522C72.7251 23.4657 72.644 23.4273 72.5573 23.4103C72.4706 23.3933 72.381 23.3981 72.2966 23.4244L72.3003 23.4235L72.0603 23.495C71.7004 23.6133 71.3238 23.6728 70.9449 23.6713H70.9417C69.9819 23.6705 69.0616 23.2888 68.3829 22.6101C67.7042 21.9314 67.3225 21.0111 67.3217 20.0513V20.043C67.3217 19.5713 67.4124 19.1205 67.5773 18.7078L67.5686 18.7321C67.6022 18.6467 67.6134 18.5541 67.6009 18.4631C67.5885 18.3721 67.5529 18.2859 67.4976 18.2127L67.4985 18.214L67.4994 18.2154Z" fill="black"/>
                      </g>
                      <defs>
                        <filter id="filter0_d_3471_15893" x="0" y="0" width="92.99" height="50.9932" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                          <feOffset dy="2"/>
                          <feGaussianBlur stdDeviation="3"/>
                          <feComposite in2="hardAlpha" operator="out"/>
                          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_3471_15893"/>
                          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_3471_15893" result="shape"/>
                        </filter>
                      </defs>
                    </svg>
                  </div>
                )}
              </div>
            ) : (
              <Button
                key={item.id}
                variant="ghost"
                className="justify-center items-center gap-2.5 text-gray-800 hover:bg-black/5 rounded-[20px]"
                style={{
                  display: 'flex',
                  width: isCollapsed ? '48px' : '292px',
                  padding: '10px',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                }}
                onClick={() => {
                  if (item.id === "logout") {
                    localStorage.removeItem('accessToken');
                    router.push("/login");
                  } else {
                    handleNavigation(item.id);
                  }
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon size={18} className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
