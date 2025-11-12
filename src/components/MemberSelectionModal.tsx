'use client';

import React, { useState, useEffect } from 'react';
import { usersAPI } from '@/lib/api';
import { X, Search, UserPlus, Check } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface MemberSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMembers: string[];
  onSelectMembers: (memberIds: string[]) => void;
  title?: string;
}

export function MemberSelectionModal({
  isOpen,
  onClose,
  selectedMembers,
  onSelectMembers,
  title = 'Select Members'
}: MemberSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [tempSelectedMembers, setTempSelectedMembers] = useState<string[]>(selectedMembers);

  useEffect(() => {
    setTempSelectedMembers(selectedMembers);
  }, [selectedMembers]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        const results = await usersAPI.search(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Failed to search users:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const toggleMember = (userId: string) => {
    setTempSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleConfirm = () => {
    onSelectMembers(tempSelectedMembers);
    onClose();
  };

  if (!isOpen) return null;

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
        zIndex: 1002,
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
          <div style={{ fontWeight: 600, fontSize: 18, color: '#7B8794' }}>{title}</div>
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

        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7B8794' }}
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              fontSize: 15,
              fontWeight: 500,
              border: '1.5px solid #E5E7EB',
              borderRadius: 12,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#7B8794'}
            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
          />
        </div>

        {/* Selected Members Count */}
        {tempSelectedMembers.length > 0 && (
          <div style={{ fontSize: 14, fontWeight: 500, color: '#7B8794' }}>
            {tempSelectedMembers.length} member{tempSelectedMembers.length !== 1 ? 's' : ''} selected
          </div>
        )}

        {/* Search Results */}
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
              Searching...
            </div>
          ) : searchQuery && searchResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#7B8794', fontSize: 15 }}>
              No users found
            </div>
          ) : !searchQuery ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#7B8794', fontSize: 15 }}>
              <UserPlus size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div>Search for users to add</div>
            </div>
          ) : (
            searchResults.map((user) => {
              const isSelected = tempSelectedMembers.includes(user._id);
              return (
                <div
                  key={user._id}
                  onClick={() => toggleMember(user._id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #7B8794' : '2px solid transparent',
                    background: isSelected ? '#F9FAFB' : '#FFF',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
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
                      background: user.avatar
                        ? `url(${user.avatar}) center/cover`
                        : `linear-gradient(135deg, ${getColorFromString(user.name || user.email)})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      fontWeight: 600,
                      fontSize: 16,
                    }}
                  >
                    {!user.avatar && getInitials(user.name || user.email)}
                  </div>

                  {/* User Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#222' }}>
                      {user.name || 'Unknown User'}
                    </div>
                    <div style={{ fontSize: 13, color: '#7B8794' }}>{user.email}</div>
                  </div>

                  {/* Checkbox */}
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: isSelected ? '2px solid #7B8794' : '2px solid #D1D5DB',
                      background: isSelected ? '#7B8794' : '#FFF',
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
            onClick={handleConfirm}
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
            Confirm
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
    .map(word => word[0])
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
