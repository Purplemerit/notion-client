import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { MemberSelectionModal } from "@/components/MemberSelectionModal";
import { useTasks } from "@/contexts/TaskContext";
import { usersAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";

interface AllTaskSidebarProps {
  open: boolean;
  onClose: () => void;
  task: any;
  onUpdate?: () => void;
}

export default function AllTaskSidebar({ open, onClose, task, onUpdate }: AllTaskSidebarProps) {
  const { updateTask, deleteTask } = useTasks();
  const { toast } = useToast();
  const { actualTheme } = useTheme();
  const [checklist, setChecklist] = useState<any[]>([]);
  const [newItem, setNewItem] = useState("");
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [taskAdmin, setTaskAdmin] = useState<any>(null);
  const [taskMembers, setTaskMembers] = useState<any[]>([]);

  // Load checklist from task
  useEffect(() => {
    if (task?.checklist && Array.isArray(task.checklist)) {
      setChecklist(task.checklist);
    } else {
      setChecklist([]);
    }
  }, [task]);

  // Fetch admin details
  useEffect(() => {
    const fetchAdmin = async () => {
      if (!task?.admin) {
        setTaskAdmin(null);
        return;
      }

      try {
        const adminData = await usersAPI.getById(task.admin);
        setTaskAdmin(adminData);
      } catch (error) {
        console.error('Failed to fetch admin:', error);
      }
    };

    fetchAdmin();
  }, [task]);

  // Fetch member details
  useEffect(() => {
    const fetchMembers = async () => {
      if (!task?.members || task.members.length === 0) {
        setTaskMembers([]);
        return;
      }

      try {
        const memberDetails = await Promise.all(
          task.members.map(async (userId: string) => {
            try {
              return await usersAPI.getById(userId);
            } catch (error) {
              console.error(`Failed to fetch user ${userId}:`, error);
              return null;
            }
          })
        );
        setTaskMembers(memberDetails.filter(Boolean));
      } catch (error) {
        console.error('Failed to fetch members:', error);
      }
    };

    fetchMembers();
  }, [task]);

  const handleCheck = async (idx: number) => {
    const updatedChecklist = checklist.map((item, i) =>
      i === idx ? { ...item, checked: !item.checked } : item
    );
    setChecklist(updatedChecklist);

    // Update in backend
    try {
      await updateTask(task._id, { checklist: updatedChecklist });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update checklist:', error);
      toast({ title: "Error", description: "Failed to update checklist", variant: "destructive" });
    }
  };

  const handleAdd = async () => {
    if (newItem.trim()) {
      const updatedChecklist = [...checklist, { label: newItem, checked: false }];
      setChecklist(updatedChecklist);
      setNewItem("");

      // Update in backend
      try {
        await updateTask(task._id, { checklist: updatedChecklist });
        if (onUpdate) onUpdate();
      } catch (error) {
        console.error('Failed to add checklist item:', error);
        toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
      }
    }
  };

  const handleMarkAsDone = async () => {
    try {
      await updateTask(task._id, { status: 'completed' });
      toast({ title: "Success", description: "Task marked as done" });
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to mark task as done:', error);
      toast({ title: "Error", description: "Failed to mark task as done", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      try {
        await deleteTask(task._id);
        toast({ title: "Success", description: "Task deleted" });
        if (onUpdate) onUpdate();
        onClose();
      } catch (error) {
        console.error('Failed to delete task:', error);
        toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
      }
    }
  };

  const handleInviteMembers = (memberIds: string[]) => {
    const updatedMembers = [...new Set([...(task.members || []), ...memberIds])];
    updateTask(task._id, { members: updatedMembers });
    toast({ title: "Success", description: `Invited ${memberIds.length} member(s)` });
    if (onUpdate) onUpdate();
  };

  if (!task) return null;

  return (
    <aside
      className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-l border-gray-200 dark:border-gray-700 shadow-lg flex flex-col transition-all duration-300`}
      style={{
        width: 400,
        height: "100%",
        position: "relative",
        display: open ? "flex" : "none",
        borderLeft: "1px solid var(--border)",
      }}
    >
      <div className="p-8 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <span className="font-bold text-xl text-gray-900 dark:text-white">{task.title}</span>
          <button onClick={onClose} className="bg-none border-none text-2xl text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100">&times;</button>
        </div>
        {taskAdmin && (
          <div className="mb-6">
            <div className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-2">Assign to -</div>
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={taskAdmin.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${taskAdmin.name || taskAdmin.email}`} />
              </Avatar>
              <div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{taskAdmin.name || taskAdmin.email}</span>
                {taskAdmin.role && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({taskAdmin.role})</span>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <span className="font-medium text-sm text-gray-500 dark:text-gray-400">
            Invite Members - {taskMembers.length > 0 && `(${taskMembers.length})`}
          </span>
          <Button
            onClick={() => setShowMemberModal(true)}
            variant="ghost"
            size="icon"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >+</Button>
        </div>
        {taskMembers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {taskMembers.map((member) => (
              <div key={member._id} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name || member.email}`} />
                </Avatar>
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{member.name || member.email}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 p-8">
        <div className="font-semibold text-base text-gray-900 dark:text-white mb-3">Checklist</div>
        <div className="flex flex-col gap-2.5">
          {checklist.map((item, idx) => (
            <label key={item.label} className="flex items-center gap-2.5 text-sm text-gray-900 dark:text-gray-100 cursor-pointer">
              <Checkbox checked={item.checked} onCheckedChange={() => handleCheck(idx)} />
              {item.label}
            </label>
          ))}
          <div className="flex items-center gap-2 mt-2">
            <input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              placeholder="Add More."
              className="flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-1.5 text-sm placeholder-gray-400 dark:placeholder-gray-500"
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
            />
            <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100" onClick={handleAdd}>+</Button>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 flex gap-3 flex-wrap">
        <Button
          onClick={handleMarkAsDone}
          variant="outline"
          className="flex-1 font-semibold text-gray-900 dark:text-gray-100 rounded-lg border-2 border-purple-400 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
        >
          Mark as done
        </Button>
        <Button
          variant="outline"
          className="flex-1 font-semibold text-gray-900 dark:text-gray-100 rounded-lg border-2 border-purple-400 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
          title="Coming soon"
        >
          Remind me
        </Button>
        <Button
          variant="outline"
          className="flex-1 font-semibold text-gray-900 dark:text-gray-100 rounded-lg border-2 border-purple-400 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
          title={`${checklist.filter(item => item.checked).length}/${checklist.length} completed`}
        >
          Checklist
        </Button>
        <Button
          onClick={handleDelete}
          variant="outline"
          className="flex-1 font-semibold text-red-600 dark:text-red-400 rounded-lg border-2 border-red-500 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          Delete
        </Button>
      </div>

      {/* Member Selection Modal */}
      <MemberSelectionModal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        selectedMembers={task.members || []}
        onSelectMembers={handleInviteMembers}
        title={`Invite Members to: ${task.title}`}
      />
    </aside>
  );
}
