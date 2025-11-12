'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { MemberSelectionModal } from './MemberSelectionModal';
import { usersAPI } from '@/lib/api';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    _id: string;
    title: string;
    description?: string;
    day: string;
    startTime: number;
    duration: number;
    label?: 'High' | 'Medium' | 'Low' | 'Stand-by';
    members?: string[];
  } | null;
  onSave: (taskId: string, updates: any) => Promise<void>;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const LABEL_BG_COLORS: Record<string, string> = {
  'High': '#D9B4C7',
  'Medium': '#FFD3B5',
  'Low': '#FFF9C4',
  'Stand-by': '#A8DADC',
};

export function EditTaskModal({ isOpen, onClose, task, onSave }: EditTaskModalProps) {
  const [showMemberSelection, setShowMemberSelection] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [editedTask, setEditedTask] = useState({
    title: '',
    description: '',
    day: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    label: 'Medium' as 'High' | 'Medium' | 'Low' | 'Stand-by',
    members: [] as string[],
  });

  useEffect(() => {
    if (task) {
      const startHour = Math.floor(task.startTime);
      const startMin = Math.round((task.startTime - startHour) * 60);
      const startTimeStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;

      const endTime = task.startTime + task.duration;
      const endHour = Math.floor(endTime);
      const endMin = Math.round((endTime - endHour) * 60);
      const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

      setEditedTask({
        title: task.title,
        description: task.description || '',
        day: task.day,
        startTime: startTimeStr,
        endTime: endTimeStr,
        label: task.label || 'Medium',
        members: task.members || [],
      });
    }
  }, [task]);

  // Fetch member details when member IDs change
  useEffect(() => {
    const fetchMemberDetails = async () => {
      if (editedTask.members.length === 0) {
        setSelectedMembers([]);
        return;
      }

      try {
        const memberDetails = await Promise.all(
          editedTask.members.map(async (userId) => {
            try {
              return await usersAPI.getById(userId);
            } catch (error) {
              console.error(`Failed to fetch user ${userId}:`, error);
              return null;
            }
          })
        );
        setSelectedMembers(memberDetails.filter(Boolean));
      } catch (error) {
        console.error('Failed to fetch member details:', error);
      }
    };

    fetchMemberDetails();
  }, [editedTask.members]);

  const handleSelectMembers = (memberIds: string[]) => {
    setEditedTask({ ...editedTask, members: memberIds });
  };

  const handleSave = async () => {
    if (!task || !editedTask.title || !editedTask.startTime || !editedTask.endTime) {
      return;
    }

    // Convert time strings to decimal hours
    const [startHour, startMin] = editedTask.startTime.split(':').map(Number);
    const [endHour, endMin] = editedTask.endTime.split(':').map(Number);
    const startTimeDecimal = startHour + startMin / 60;
    const endTimeDecimal = endHour + endMin / 60;
    const duration = endTimeDecimal - startTimeDecimal;

    const updates = {
      title: editedTask.title,
      description: editedTask.description,
      day: editedTask.day,
      startTime: startTimeDecimal,
      duration: duration,
      label: editedTask.label,
      members: editedTask.members,
    };

    await onSave(task._id, updates);
    onClose();
  };

  if (!isOpen || !task) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          background: 'rgba(0,0,0,0.04)',
        }}
        onClick={onClose}
      >
        <div
          style={{
            borderRadius: 24,
            background: '#FFF',
            boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.20), 35px 45px 73px 0 rgba(32, 32, 35, 0.07)',
            width: 480,
            padding: '32px 32px 24px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 18,
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close icon */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              background: 'none',
              border: 'none',
              fontSize: 22,
              color: '#222',
              cursor: 'pointer',
            }}
          >
            <X size={24} />
          </button>

          <div style={{ fontWeight: 600, fontSize: 18, color: '#7B8794', marginBottom: 8 }}>
            Edit Task
          </div>

          {/* Task Title */}
          <input
            type="text"
            placeholder="Task Title"
            value={editedTask.title}
            onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
            style={{
              width: '100%',
              fontWeight: 700,
              fontSize: 22,
              color: '#222',
              border: 'none',
              outline: 'none',
              marginBottom: 8,
            }}
          />

          {/* Invite Members */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: 8 }}>
            <span style={{ fontWeight: 500, fontSize: 15, color: '#222', marginRight: 8 }}>
              Team Members
            </span>
            <button
              onClick={() => setShowMemberSelection(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#222',
                fontSize: 18,
                cursor: 'pointer',
                marginRight: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: '50%',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              +
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              {selectedMembers.length === 0 ? (
                <span style={{ fontSize: 13, color: '#7B8794', fontStyle: 'italic' }}>
                  No members selected
                </span>
              ) : (
                selectedMembers.slice(0, 5).map((member, idx) => (
                  <div
                    key={member._id}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: member.avatar ? `url(${member.avatar}) center/cover` : '#7B8794',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      fontSize: 12,
                      fontWeight: 600,
                      border: '2px solid #FFF',
                      marginLeft: idx > 0 ? -8 : 0,
                    }}
                    title={member.name || member.email}
                  >
                    {!member.avatar && (member.name || member.email).charAt(0).toUpperCase()}
                  </div>
                ))
              )}
              {selectedMembers.length > 5 && (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#7B8794',
                    marginLeft: -8,
                  }}
                >
                  +{selectedMembers.length - 5}
                </div>
              )}
            </div>
          </div>

          {/* Day and Time */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 24, marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize: 15, color: '#222' }}>
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="6" width="16" height="12" rx="2" stroke="#222" strokeWidth="2" />
                <path d="M7 3V6" stroke="#222" strokeWidth="2" strokeLinecap="round" />
                <path d="M15 3V6" stroke="#222" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <select
                value={editedTask.day}
                onChange={(e) => setEditedTask({ ...editedTask, day: e.target.value })}
                style={{ border: 'none', outline: 'none', fontSize: 15, fontWeight: 500 }}
              >
                {daysOfWeek.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize: 15, color: '#222' }}>
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="9" stroke="#222" strokeWidth="2" />
                <path d="M11 7V11L13 13" stroke="#222" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="time"
                value={editedTask.startTime}
                onChange={(e) => setEditedTask({ ...editedTask, startTime: e.target.value })}
                style={{ border: 'none', outline: 'none', fontSize: 15, fontWeight: 500, width: 80 }}
              />
              <span>-</span>
              <input
                type="time"
                value={editedTask.endTime}
                onChange={(e) => setEditedTask({ ...editedTask, endTime: e.target.value })}
                style={{ border: 'none', outline: 'none', fontSize: 15, fontWeight: 500, width: 80 }}
              />
            </label>
          </div>

          {/* Label */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 12, marginBottom: 8 }}>
            <span style={{ fontWeight: 500, fontSize: 15, color: '#222', marginRight: 8 }}>Label</span>
            {(['High', 'Medium', 'Low', 'Stand-by'] as const).map((labelOption) => (
              <span
                key={labelOption}
                onClick={() => setEditedTask({ ...editedTask, label: labelOption })}
                style={{
                  background: LABEL_BG_COLORS[labelOption],
                  color: '#000',
                  fontWeight: 600,
                  fontSize: 13,
                  borderRadius: '21.913px',
                  padding: '5px 14px',
                  cursor: 'pointer',
                  border:
                    editedTask.label === labelOption
                      ? `3.652px solid ${LABEL_BG_COLORS[labelOption].replace('C', 'F')}`
                      : '3.652px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                {labelOption}
              </span>
            ))}
          </div>

          {/* Description */}
          <textarea
            placeholder="Description (optional)"
            value={editedTask.description}
            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
            style={{
              width: '100%',
              fontSize: 15,
              fontWeight: 500,
              color: '#222',
              border: '1.5px solid #E5E7EB',
              borderRadius: 12,
              padding: 12,
              outline: 'none',
              resize: 'vertical',
              minHeight: 80,
            }}
          />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 8 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 24px',
                fontSize: 15,
                fontWeight: 600,
                border: '2px solid #E5E7EB',
                borderRadius: 12,
                background: '#FFF',
                color: '#222',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFF';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '12px 24px',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                borderRadius: 12,
                background: '#222',
                color: '#FFF',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#222';
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Member Selection Modal */}
      <MemberSelectionModal
        isOpen={showMemberSelection}
        onClose={() => setShowMemberSelection(false)}
        selectedMembers={editedTask.members}
        onSelectMembers={handleSelectMembers}
        title="Select Team Members"
      />
    </>
  );
}
