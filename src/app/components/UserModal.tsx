'use client';

import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserModal({ isOpen, onClose }: UserModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchUsers();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      // Reset form and refresh list
      setName('');
      setEmail('');
      fetchUsers();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close modal on Esc keypress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-md)',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          transition: 'all 0.2s ease',
        }}
      />

      {/* Modal Container */}
      <div
        style={{
          position: 'relative',
          backgroundColor: 'var(--colors-canvas)',
          width: '100%',
          maxWidth: '560px',
          borderRadius: 'var(--rounded-lg)',
          border: '1px solid var(--colors-hairline)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          zIndex: 1001,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--spacing-lg)',
            borderBottom: '1px solid var(--colors-hairline-soft)',
          }}
        >
          <h2 className="text-title-lg" style={{ margin: 0 }}>
            Manage Users
          </h2>
          <button
            onClick={onClose}
            className="btn-icon-circular"
            style={{ width: '32px', height: '32px' }}
            aria-label="Close modal"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: 'var(--spacing-lg)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-xl)',
          }}
        >
          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: 'var(--colors-error)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: 'var(--spacing-sm)',
                borderRadius: 'var(--rounded-md)',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          {/* Create User Form */}
          <div>
            <h3 className="text-title-sm" style={{ marginBottom: 'var(--spacing-sm)' }}>
              Add New User
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <div>
                <label className="text-caption" style={{ display: 'block', marginBottom: '4px', color: 'var(--colors-muted)' }}>
                  Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-caption" style={{ display: 'block', marginBottom: '4px', color: 'var(--colors-muted)' }}>
                  Email
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || !name.trim() || !email.trim()}
                style={{
                  marginTop: 'var(--spacing-sm)',
                  width: '100%',
                }}
              >
                {isSubmitting ? 'Adding...' : 'Add User'}
              </button>
            </form>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid var(--colors-hairline-soft)', margin: 0 }} />

          {/* User List */}
          <div>
            <h3 className="text-title-sm" style={{ marginBottom: 'var(--spacing-sm)' }}>
              Existing Users ({users.length})
            </h3>

            {isLoading && users.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--colors-muted)', padding: 'var(--spacing-lg) 0' }}>
                <span className="text-body-sm">Loading users...</span>
              </div>
            ) : users.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  color: 'var(--colors-muted)',
                  padding: 'var(--spacing-lg) 0',
                  border: '1px dashed var(--colors-hairline)',
                  borderRadius: 'var(--rounded-md)',
                }}
              >
                <p className="text-body-sm" style={{ margin: 0 }}>
                  No users registered in the system yet.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-xs)',
                  maxHeight: '240px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {users.map((user) => (
                  <div
                    key={user.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)',
                      padding: 'var(--spacing-sm)',
                      borderRadius: 'var(--rounded-md)',
                      backgroundColor: 'var(--colors-surface-soft)',
                      border: '1px solid var(--colors-hairline-soft)',
                    }}
                  >
                    <div className="avatar-circle" style={{ fontWeight: 600, fontSize: '13px', flexShrink: 0 }}>
                      {user.name ? user.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?' : '?'}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div className="text-title-sm" style={{ fontSize: '14px', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {user.name}
                      </div>
                      <div className="text-caption" style={{ color: 'var(--colors-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
