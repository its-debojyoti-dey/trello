'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from './components/Header';

interface Board {
  id: string;
  name: string;
  privacy: string;
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  


  // Create Form state
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardPrivacy, setNewBoardPrivacy] = useState('PUBLIC');
  const [isCreating, setIsCreating] = useState(false);

  const fetchBoards = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/boards');
      if (!res.ok) {
        throw new Error('Failed to fetch boards');
      }
      const data = await res.json();
      setBoards(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBoards();
  }, []);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBoardName.trim(),
          privacy: newBoardPrivacy,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create board');
      }

      setNewBoardName('');
      setNewBoardPrivacy('PUBLIC');
      fetchBoards();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Something went wrong');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBoard = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`Are you sure you want to delete the board "${name}"? This will permanently delete all lists and cards inside it.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/boards/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete board');
      }

      setBoards((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      const error = err as Error;
      alert(error.message || 'Failed to delete board');
    }
  };

  return (
    <>
      <Header />

      <main className="container" style={{ padding: 'var(--spacing-xl) var(--spacing-lg)' }}>
        {/* Error Banner */}
        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              color: 'var(--colors-error)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: 'var(--spacing-sm)',
              borderRadius: 'var(--rounded-md)',
              marginBottom: 'var(--spacing-lg)',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* Dashboard Grid Layout (Create Form + Boards List) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-xl)',
          }}
        >
          {/* Create Board Section */}
          <div
            className="card-product-mockup"
            style={{
              padding: 'var(--spacing-lg)',
              backgroundColor: 'var(--colors-surface-soft)',
              border: '1px solid var(--colors-hairline)',
              borderRadius: 'var(--rounded-lg)',
            }}
          >
            <h2 className="text-title-md" style={{ marginBottom: '4px' }}>
              Create New Board
            </h2>
            <p className="text-body-sm" style={{ color: 'var(--colors-muted)', marginBottom: 'var(--spacing-md)' }}>
              Add a new project board to plan tasks, organize lists, and track progress.
            </p>

            <form
              onSubmit={handleCreateBoard}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--spacing-sm)',
                alignItems: 'flex-end',
              }}
            >
              <div style={{ flex: '1 1 240px' }}>
                <label className="text-caption" style={{ display: 'block', marginBottom: '4px', color: 'var(--colors-muted)' }}>
                  Board Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Q3 Launch Campaign"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  required
                />
              </div>

              <div style={{ flex: '0 0 160px' }}>
                <label className="text-caption" style={{ display: 'block', marginBottom: '4px', color: 'var(--colors-muted)' }}>
                  Privacy
                </label>
                <select
                  className="form-input"
                  value={newBoardPrivacy}
                  onChange={(e) => setNewBoardPrivacy(e.target.value)}
                  style={{
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '16px',
                    paddingRight: '36px',
                  }}
                >
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isCreating || !newBoardName.trim()}
                style={{
                  height: '40px',
                  whiteSpace: 'nowrap',
                }}
              >
                {isCreating ? 'Creating...' : 'Create Board'}
              </button>
            </form>
          </div>

          {/* Boards List Section */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 'var(--spacing-md)',
                borderBottom: '1px solid var(--colors-hairline-soft)',
                paddingBottom: 'var(--spacing-xs)',
              }}
            >
              <h2 className="text-display-sm" style={{ fontSize: '24px', fontWeight: 600 }}>
                My Boards
              </h2>
              <span className="text-caption" style={{ color: 'var(--colors-muted)' }}>
                {boards.length} total
              </span>
            </div>

            {isLoading && boards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl) 0', color: 'var(--colors-muted)' }}>
                <span className="text-body-md">Loading boards...</span>
              </div>
            ) : boards.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 'var(--spacing-xxl) 0',
                  border: '2px dashed var(--colors-hairline)',
                  borderRadius: 'var(--rounded-lg)',
                  color: 'var(--colors-muted)',
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginBottom: 'var(--spacing-sm)', opacity: 0.6 }}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                  <line x1="15" y1="3" x2="15" y2="21"></line>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="3" y1="15" x2="21" y2="15"></line>
                </svg>
                <p className="text-body-md" style={{ margin: 0, fontWeight: 500 }}>
                  No boards found
                </p>
                <p className="text-caption" style={{ margin: '4px 0 0 0', color: 'var(--colors-muted)' }}>
                  Get started by creating a new board above.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 'var(--spacing-lg)',
                }}
              >
                {boards.map((board) => (
                  <div
                    key={board.id}
                    className="card-product-mockup card-board-item"
                    onClick={() => router.push(`/boards/${board.id}`)}
                    style={{
                      padding: 'var(--spacing-lg)',
                      height: '140px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      backgroundColor: 'var(--colors-canvas)',
                      overflow: 'hidden',
                    }}
                  >
                    <div>
                      {/* Privacy status tag */}
                      <span
                        className="badge-pill"
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          fontWeight: 600,
                          backgroundColor:
                            board.privacy === 'PRIVATE'
                              ? 'rgba(245, 158, 11, 0.1)'
                              : 'rgba(16, 185, 129, 0.1)',
                          color:
                            board.privacy === 'PRIVATE'
                              ? 'var(--colors-warning)'
                              : 'var(--colors-success)',
                          marginBottom: 'var(--spacing-sm)',
                        }}
                      >
                        {board.privacy}
                      </span>

                      <h3
                        className="text-title-sm"
                        style={{
                          fontSize: '18px',
                          margin: 'var(--spacing-xxs) 0 0 0',
                          fontWeight: 600,
                          color: 'var(--colors-ink)',
                          wordBreak: 'break-word',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {board.name}
                      </h3>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 'var(--spacing-sm)',
                      }}
                    >
                      <span className="text-caption" style={{ color: 'var(--colors-muted)' }}>
                        Created {new Date(board.createdAt).toLocaleDateString()}
                      </span>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDeleteBoard(e, board.id, board.name)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--colors-muted)',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: 'var(--rounded-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.15s ease, background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--colors-error)';
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--colors-muted)';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title="Delete Board"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>


    </>
  );
}
