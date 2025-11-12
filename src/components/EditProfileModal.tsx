'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSave: (updates: any) => Promise<void>;
}

export function EditProfileModal({ isOpen, onClose, user, onSave }: EditProfileModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    avatar: '',
    country: '',
    cityState: '',
    postalCode: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
        country: user.country || '',
        cityState: user.cityState || user.location || '',
        postalCode: user.postalCode || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setLoading(false);
    }
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
          width: 600,
          maxHeight: '90vh',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          position: 'relative',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 20, color: '#222' }}>Edit Profile</div>
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

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Avatar Section */}
          <div>
            <Label className="text-sm font-medium text-foreground">Profile Avatar</Label>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 12 }}>
              {/* Avatar Preview */}
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: formData.avatar
                    ? `url(${formData.avatar}) center/cover`
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  fontSize: 28,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {!formData.avatar && (user?.name?.[0] || 'U').toUpperCase()}
              </div>
              {/* Avatar URL Input */}
              <div style={{ flex: 1 }}>
                <Input
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="Enter avatar URL or leave empty for default"
                />
                <p style={{ fontSize: 12, color: '#7B8794', marginTop: 6 }}>
                  Paste an image URL to set your profile picture
                </p>
              </div>
            </div>
          </div>

          {/* Name Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Label className="text-sm font-medium text-foreground">First Name</Label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="mt-2"
                placeholder="Enter first name"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">Last Name</Label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="mt-2"
                placeholder="Enter last name"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <Label className="text-sm font-medium text-foreground">Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="mt-2"
              placeholder="Enter phone number"
            />
          </div>

          {/* Bio */}
          <div>
            <Label className="text-sm font-medium text-foreground">Bio</Label>
            <Input
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="mt-2"
              placeholder="Tell us about yourself"
            />
          </div>

          {/* Location Fields */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-2" style={{ display: 'block' }}>
              Location Details
            </Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Label className="text-sm text-muted-foreground">Country</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="mt-1"
                  placeholder="Country"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">City, State</Label>
                <Input
                  value={formData.cityState}
                  onChange={(e) => setFormData({ ...formData, cityState: e.target.value })}
                  className="mt-1"
                  placeholder="City, State"
                />
              </div>
            </div>
          </div>

          {/* Postal Code */}
          <div>
            <Label className="text-sm font-medium text-foreground">Postal Code</Label>
            <Input
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              className="mt-2"
              placeholder="Enter postal code"
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Button
            onClick={onClose}
            variant="outline"
            style={{ flex: 1 }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            style={{ flex: 1, background: '#846BD2', color: '#FFF' }}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
