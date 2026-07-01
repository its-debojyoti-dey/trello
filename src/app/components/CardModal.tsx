'use client';

import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface BoardList {
  id: string;
  name: string;
}

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string | null;
  boardMembers: User[];
  boardLists: BoardList[];
  onCardUpdated: () => void;
}

export default function CardModal({
  isOpen,
  onClose,
  cardId,
  boardMembers,
  boardLists,
  onCardUpdated,
}: CardModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState<string | null>(null);
  const [listId, setListId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCardDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cards/${cardId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch card details');
      }
      const data = await res.json();
      setName(data.name || '');
      setDescription(data.description || '');
      setAssignedToId(data.assignedToId || null);
      setListId(data.listId || '');
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Something went wrong loading card details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && cardId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCardDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, cardId]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          listId,
          assignedToId: assignedToId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update card');
      }

      onCardUpdated();
      onClose();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Something went wrong saving the card');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this card?')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete card');
      }

      onCardUpdated();
      onClose();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Something went wrong deleting the card');
      setIsDeleting(false);
    }
  };

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
          maxWidth: '640px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--colors-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="15" y1="3" x2="15" y2="21"></line>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="3" y1="15" x2="21" y2="15"></line>
            </svg>
            <h2 className="text-title-lg" style={{ margin: 0 }}>
              Card Details
            </h2>
          </div>
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
        {isLoading ? (
          <div style={{ padding: 'var(--spacing-xxl)', textAlign: 'center', color: 'var(--colors-muted)' }}>
            <span className="text-body-md">Loading card details...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div
              style={{
                padding: 'var(--spacing-lg)',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-md)',
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

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 200px',
                  gap: 'var(--spacing-lg)',
                }}
              >
                {/* Main Fields Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <div>
                    <label
                      className="text-caption"
                      style={{ display: 'block', marginBottom: '6px', color: 'var(--colors-muted)', fontWeight: 600 }}
                    >
                      Card Name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter card name..."
                      required
                    />
                  </div>

                  <div>
                    <label
                      className="text-caption"
                      style={{ display: 'block', marginBottom: '6px', color: 'var(--colors-muted)', fontWeight: 600 }}
                    >
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a detailed description for this card..."
                      style={{
                        width: '100%',
                        minHeight: '120px',
                        backgroundColor: 'var(--colors-canvas)',
                        color: 'var(--colors-ink)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '14px',
                        borderRadius: 'var(--rounded-md)',
                        padding: '10px 14px',
                        border: '1px solid var(--colors-hairline)',
                        outline: 'none',
                        resize: 'vertical',
                        transition: 'border-color 0.15s ease',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--colors-ink)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--colors-hairline)';
                      }}
                    />
                  </div>
                </div>

                {/* Sidebar Controls Column */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-md)',
                    borderLeft: '1px solid var(--colors-hairline-soft)',
                    paddingLeft: 'var(--spacing-md)',
                  }}
                >
                  <div>
                    <label
                      className="text-caption"
                      style={{ display: 'block', marginBottom: '6px', color: 'var(--colors-muted)', fontWeight: 600 }}
                    >
                      Assignee
                    </label>
                    <select
                      className="form-input"
                      value={assignedToId || ''}
                      onChange={(e) => setAssignedToId(e.target.value || null)}
                      style={{
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                        backgroundSize: '14px',
                        paddingRight: '30px',
                        fontSize: '14px',
                      }}
                    >
                      <option value="">Unassigned</option>
                      {boardMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className="text-caption"
                      style={{ display: 'block', marginBottom: '6px', color: 'var(--colors-muted)', fontWeight: 600 }}
                    >
                      List
                    </label>
                    <select
                      className="form-input"
                      value={listId}
                      onChange={(e) => setListId(e.target.value)}
                      style={{
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                        backgroundSize: '14px',
                        paddingRight: '30px',
                        fontSize: '14px',
                      }}
                    >
                      {boardLists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginTop: 'var(--spacing-md)' }}>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      style={{
                        width: '100%',
                        height: '36px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        backgroundColor: 'transparent',
                        color: 'var(--colors-error)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--rounded-md)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                        e.currentTarget.style.borderColor = 'var(--colors-error)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      {isDeleting ? 'Deleting...' : 'Delete Card'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 'var(--spacing-sm)',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                borderTop: '1px solid var(--colors-hairline-soft)',
                backgroundColor: 'var(--colors-surface-soft)',
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
                disabled={isSaving || !name.trim()}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
