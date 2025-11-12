import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { MemberSelectionModal } from "@/components/MemberSelectionModal";
import { useTasks } from "@/contexts/TaskContext";
import { usersAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AllTaskSidebarProps {
  open: boolean;
  onClose: () => void;
  task: any;
  onUpdate?: () => void;
}

export default function AllTaskSidebar({ open, onClose, task, onUpdate }: AllTaskSidebarProps) {
  const { updateTask, deleteTask } = useTasks();
  const { toast } = useToast();
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
      style={{
        width: 400,
        background: "#F7F7FB",
        height: "100%",
        position: "relative",
        boxShadow: "-2px 0 16px 0 rgba(0,0,0,0.04)",
        display: open ? "flex" : "none",
        flexDirection: "column",
        borderLeft: "1px solid #E0E0E0",
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div style={{ padding: "32px 32px 0 32px", borderBottom: "1px solid #E0E0E0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 22, color: "#222" }}>{task.title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 28, color: "#222", cursor: "pointer" }}>&times;</button>
        </div>
        {taskAdmin && (
          <div style={{ marginTop: 24, marginBottom: 16 }}>
            <div style={{ fontWeight: 500, fontSize: 15, color: "#888", marginBottom: 8 }}>Assign to -</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar className="w-10 h-10">
                <AvatarImage src={taskAdmin.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${taskAdmin.name || taskAdmin.email}`} />
              </Avatar>
              <div>
                <span style={{ fontWeight: 600, color: "#222" }}>{taskAdmin.name || taskAdmin.email}</span>
                {taskAdmin.role && (
                  <span style={{ fontSize: 13, color: "#888", marginLeft: 6 }}>({taskAdmin.role})</span>
                )}
              </div>
            </div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontWeight: 500, fontSize: 15, color: "#888" }}>
            Invite Members - {taskMembers.length > 0 && `(${taskMembers.length})`}
          </span>
          <Button
            onClick={() => setShowMemberModal(true)}
            variant="ghost"
            size="icon"
            style={{ color: "#888", borderRadius: 999, width: 32, height: 32, fontSize: 22 }}
          >+</Button>
        </div>
        {taskMembers.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {taskMembers.map((member) => (
              <div key={member._id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#F0F0F0", padding: "4px 10px", borderRadius: 16 }}>
                <Avatar className="w-6 h-6">
                  <AvatarImage src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name || member.email}`} />
                </Avatar>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#222" }}>{member.name || member.email}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ flex: 1, padding: "32px" }}>
        <div style={{ fontWeight: 600, fontSize: 16, color: "#222", marginBottom: 12 }}>Checklist</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {checklist.map((item, idx) => (
            <label key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, color: "#222" }}>
              <Checkbox checked={item.checked} onCheckedChange={() => handleCheck(idx)} />
              {item.label}
            </label>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              placeholder="Add More."
              style={{ flex: 1, border: "1px solid #E0E0E0", borderRadius: 8, padding: "6px 10px", fontSize: 14 }}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
            />
            <Button variant="ghost" size="icon" style={{ color: "#888", borderRadius: 999, width: 32, height: 32, fontSize: 22 }} onClick={handleAdd}>+</Button>
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid #E0E0E0", padding: "18px 32px", background: "#F7F7FB", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Button
          onClick={handleMarkAsDone}
          variant="outline"
          style={{ flex: 1, fontWeight: 600, color: "#222", borderRadius: 10, border: "1.5px solid #B39DDB" }}
        >
          Mark as done
        </Button>
        <Button
          variant="outline"
          style={{ flex: 1, fontWeight: 600, color: "#222", borderRadius: 10, border: "1.5px solid #B39DDB" }}
          title="Coming soon"
        >
          Remind me
        </Button>
        <Button
          variant="outline"
          style={{ flex: 1, fontWeight: 600, color: "#222", borderRadius: 10, border: "1.5px solid #B39DDB" }}
          title={`${checklist.filter(item => item.checked).length}/${checklist.length} completed`}
        >
          Checklist
        </Button>
        <Button
          onClick={handleDelete}
          variant="outline"
          style={{ flex: 1, fontWeight: 600, color: "#F44336", borderRadius: 10, border: "1.5px solid #F44336" }}
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
