'use client';

import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newEmail: string, password: string) => Promise<void>;
  currentEmail?: string;
}

export function ChangeEmailModal({ isOpen, onClose, onSave, currentEmail }: ChangeEmailModalProps) {
  const [formData, setFormData] = useState({
    newEmail: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.newEmail) {
      newErrors.newEmail = 'New email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.newEmail)) {
      newErrors.newEmail = 'Please enter a valid email address';
    } else if (formData.newEmail === currentEmail) {
      newErrors.newEmail = 'New email must be different from current email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required to verify your identity';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSave(formData.newEmail, formData.password);
      setFormData({ newEmail: '', password: '' });
      setErrors({});
      onClose();
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to change email' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ newEmail: '', password: '' });
    setErrors({});
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
      onClick={handleClose}
    >
      <div
        style={{
          borderRadius: 24,
          background: '#FFF',
          boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.20), 35px 45px 73px 0 rgba(32, 32, 35, 0.07)',
          width: 500,
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 20, color: '#222' }}>Change Email</div>
          <button
            onClick={handleClose}
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

        <div style={{ fontSize: 14, color: '#7B8794' }}>
          Enter your new email address and verify with your password. You&apos;ll need to log in with your new email after this change.
        </div>

        {/* Current Email Display */}
        {currentEmail && (
          <div
            style={{
              padding: '12px 16px',
              background: '#F9FAFB',
              borderRadius: 12,
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ fontSize: 12, color: '#7B8794', marginBottom: 4 }}>Current Email</div>
            <div style={{ fontSize: 14, color: '#222', fontWeight: 500 }}>{currentEmail}</div>
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* New Email */}
          <div>
            <Label className="text-sm font-medium text-foreground">New Email Address</Label>
            <Input
              type="email"
              value={formData.newEmail}
              onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
              className="mt-2"
              placeholder="Enter new email address"
            />
            {errors.newEmail && (
              <p style={{ fontSize: 13, color: '#DC2626', marginTop: 4 }}>{errors.newEmail}</p>
            )}
          </div>

          {/* Password Verification */}
          <div>
            <Label className="text-sm font-medium text-foreground">Password</Label>
            <div style={{ position: 'relative' }}>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-2 pr-10"
                placeholder="Enter your password to verify"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#7B8794',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p style={{ fontSize: 13, color: '#DC2626', marginTop: 4 }}>{errors.password}</p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div
              style={{
                padding: '12px 16px',
                background: '#FEF2F2',
                borderRadius: 12,
                border: '1px solid #FCA5A5',
              }}
            >
              <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>{errors.submit}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Button onClick={handleClose} variant="outline" style={{ flex: 1 }} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            style={{ flex: 1, background: '#846BD2', color: '#FFF' }}
            disabled={loading}
          >
            {loading ? 'Changing...' : 'Change Email'}
          </Button>
        </div>
      </div>
    </div>
  );
}
