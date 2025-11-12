'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, Check } from 'lucide-react';
import { usersAPI } from '@/lib/api';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface ChangeAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    _id: string;
    title: string;
    teamId?: string;
    admin?: string;
    owner?: string;
    members?: string[];
  } | null;
  currentUserId?: string;
  onChangeAdmin: (taskId: string, newAdminId: string) => Promise<void>;
}

export function ChangeAdminModal({
  isOpen,
  onClose,
  task,
  currentUserId,
  onChangeAdmin
}: ChangeAdminModalProps) {
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!task || !task.members || task.members.length === 0) {
        setTeamMembers([]);
        return;
      }

      setLoading(true);
      try {
        const memberDetails = await Promise.all(
          task.members.map(async (userId) => {
            try {
              return await usersAPI.getById(userId);
            } catch (error) {
              console.error(`Failed to fetch user ${userId}:`, error);
              return null;
            }
          })
        );
        setTeamMembers(memberDetails.filter(Boolean) as User[]);
        // Set current admin as default selected
        if (task.admin) {
          setSelectedAdminId(task.admin);
        }
      } catch (error) {
        console.error('Failed to fetch team members:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchTeamMembers();
    }
  }, [task, isOpen]);

  const handleChangeAdmin = async () => {
    if (!task || !selectedAdminId || selectedAdminId === task.admin) {
      return;
    }

    try {
      await onChangeAdmin(task._id, selectedAdminId);
      onClose();
    } catch (error) {
      console.error('Failed to change admin:', error);
    }
  };

  if (!isOpen || !task) return null;

  const isOwner = currentUserId && task.owner === currentUserId;

  return (
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
        zIndex: 1003,
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
          maxHeight: '80vh',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 18, color: '#7B8794' }}>Change Team Admin</div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 22,
              color: '#222',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Task Info */}
        <div style={{ padding: '12px 16px', background: '#F9FAFB', borderRadius: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#222', marginBottom: 4 }}>
            {task.title}
          </div>
          <div style={{ fontSize: 13, color: '#7B8794' }}>
            Select a new admin from the team members below
          </div>
        </div>

        {/* Permission Warning */}
        {!isOwner && (
          <div
            style={{
              padding: '12px 16px',
              background: '#FEF2F2',
              borderRadius: 12,
              border: '1px solid #FCA5A5',
            }}
          >
            <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>
              Only the task owner can change the admin
            </div>
          </div>
        )}

        {/* Team Members List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: '400px',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#7B8794', fontSize: 15 }}>
              Loading team members...
            </div>
          ) : teamMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#7B8794', fontSize: 15 }}>
              <Shield size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div>No team members found</div>
            </div>
          ) : (
            teamMembers.map((member) => {
              const isSelected = selectedAdminId === member._id;
              const isCurrentAdmin = task.admin === member._id;
              const isTaskOwner = task.owner === member._id;

              return (
                <div
                  key={member._id}
                  onClick={() => isOwner && setSelectedAdminId(member._id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px',
                    borderRadius: 12,
                    cursor: isOwner ? 'pointer' : 'not-allowed',
                    border: isSelected ? '2px solid #7C3AED' : '2px solid transparent',
                    background: isSelected ? '#F5F3FF' : '#FFF',
                    transition: 'all 0.2s',
                    opacity: isOwner ? 1 : 0.6,
                  }}
                  onMouseEnter={(e) => {
                    if (isOwner && !isSelected) {
                      e.currentTarget.style.background = '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isOwner && !isSelected) {
                      e.currentTarget.style.background = '#FFF';
                    }
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: member.avatar
                        ? `url(${member.avatar}) center/cover`
                        : `linear-gradient(135deg, ${getColorFromString(member.name || member.email)})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      fontWeight: 600,
                      fontSize: 16,
                      position: 'relative',
                    }}
                  >
                    {!member.avatar && getInitials(member.name || member.email)}
                    {isCurrentAdmin && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: '#7C3AED',
                          border: '2px solid #FFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Shield size={10} color="#FFF" />
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#222' }}>
                        {member.name || 'Unknown User'}
                      </div>
                      {isTaskOwner && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#7C3AED',
                            background: '#F5F3FF',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          OWNER
                        </span>
                      )}
                      {isCurrentAdmin && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#7C3AED',
                            background: '#F5F3FF',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#7B8794' }}>{member.email}</div>
                  </div>

                  {/* Selection Indicator */}
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: isSelected ? '2px solid #7C3AED' : '2px solid #D1D5DB',
                      background: isSelected ? '#7C3AED' : '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isSelected && <Check size={14} color="#FFF" strokeWidth={3} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
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
            onClick={handleChangeAdmin}
            disabled={!isOwner || !selectedAdminId || selectedAdminId === task.admin}
            style={{
              flex: 1,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              border: 'none',
              borderRadius: 12,
              background:
                !isOwner || !selectedAdminId || selectedAdminId === task.admin
                  ? '#E5E7EB'
                  : '#7C3AED',
              color: '#FFF',
              cursor:
                !isOwner || !selectedAdminId || selectedAdminId === task.admin
                  ? 'not-allowed'
                  : 'pointer',
              transition: 'all 0.2s',
              opacity:
                !isOwner || !selectedAdminId || selectedAdminId === task.admin ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (isOwner && selectedAdminId && selectedAdminId !== task.admin) {
                e.currentTarget.style.background = '#6D28D9';
              }
            }}
            onMouseLeave={(e) => {
              if (isOwner && selectedAdminId && selectedAdminId !== task.admin) {
                e.currentTarget.style.background = '#7C3AED';
              }
            }}
          >
            Change Admin
          </button>
        </div>
      </div>
    </div>
  );
}

// Utility functions
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromString(str: string): string {
  const colors = [
    '#FF6B6B, #EE5A6F',
    '#4ECDC4, #44A08D',
    '#95E1D3, #38EF7D',
    '#F38181, #FCE38A',
    '#AA96DA, #FCBAD3',
    '#FECA57, #FF9FF3',
    '#48DBFB, #0ABDE3',
    '#FF9FF3, #54A0FF',
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
