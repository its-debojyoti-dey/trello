'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  clerkId: string;
}

interface Card {
  id: string;
  name: string;
}

interface BoardList {
  id: string;
  name: string;
  cards?: Card[];
}

interface Board {
  id: string;
  name: string;
  privacy: string;
  ownerId: string;
  owner?: { name: string } | null;
  users: User[];
  lists?: BoardList[];
}

export default function AdminPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  // Stats
  const [totalLists, setTotalLists] = useState(0);
  const [totalCards, setTotalCards] = useState(0);

  const isAdmin = clerkUser?.publicMetadata?.role === 'admin';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch users
      const usersRes = await fetch('/api/users');
      if (!usersRes.ok) throw new Error('Failed to fetch users');
      const usersData = (await usersRes.json()) as User[];
      setUsers(usersData);

      // Fetch boards
      const boardsRes = await fetch('/api/boards');
      if (!boardsRes.ok) throw new Error('Failed to fetch boards');
      const boardsData = (await boardsRes.json()) as Board[];
      setBoards(boardsData);

      // Extract stats
      let listsCount = 0;
      let cardsCount = 0;
      boardsData.forEach((b) => {
        if (b.lists) {
          listsCount += b.lists.length;
          b.lists.forEach((l) => {
            if (l.cards) {
              cardsCount += l.cards.length;
            }
          });
        }
      });
      setTotalLists(listsCount);
      setTotalCards(cardsCount);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      if (!isAdmin) {
        router.push('/');
      } else {
        setTimeout(() => {
          fetchData();
        }, 0);
      }
    }
  }, [isLoaded, isAdmin, router, fetchData]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName, email: newUserEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccess(`User "${newUserName}" added successfully!`);
      setNewUserName('');
      setNewUserEmail('');
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBoard = async (boardId: string, boardName: string) => {
    if (!confirm(`Are you sure you want to delete the board "${boardName}"? This will permanently delete all lists and cards inside it.`)) {
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete board');
      }

      setSuccess(`Board "${boardName}" deleted successfully!`);
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <main className="container" style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <p className="text-caption">Loading Admin Dashboard...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <main className="container" style={{ padding: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <h1 className="text-display-sm">Platform Admin Dashboard</h1>
        <Link href="/" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          Back to Boards
        </Link>
      </div>

      {/* Error & Success Banners */}
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--colors-error)', padding: 'var(--spacing-md)', borderRadius: 'var(--rounded-md)', marginBottom: 'var(--spacing-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: 'var(--colors-success)', padding: 'var(--spacing-md)', borderRadius: 'var(--rounded-md)', marginBottom: 'var(--spacing-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          {success}
        </div>
      )}

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
        <div className="card-product-mockup">
          <h3 className="text-caption">Total Users</h3>
          <p className="text-display-sm" style={{ margin: 0 }}>{users.length}</p>
        </div>
        <div className="card-product-mockup">
          <h3 className="text-caption">Total Boards</h3>
          <p className="text-display-sm" style={{ margin: 0 }}>{boards.length}</p>
        </div>
        <div className="card-product-mockup">
          <h3 className="text-caption">Total Lists</h3>
          <p className="text-display-sm" style={{ margin: 0 }}>{totalLists}</p>
        </div>
        <div className="card-product-mockup">
          <h3 className="text-caption">Total Cards</h3>
          <p className="text-display-sm" style={{ margin: 0 }}>{totalCards}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--spacing-xl)', alignItems: 'start' }}>
        {/* Left Column: Tables */}
        <div>
          {/* Boards List Section */}
          <h2 className="text-title-md" style={{ marginBottom: 'var(--spacing-md)' }}>Manage Boards</h2>
          <div className="card-product-mockup" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--spacing-xl)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--colors-surface-soft)', borderBottom: '1px solid var(--colors-hairline)' }}>
                  <th style={{ padding: '12px', fontSize: '13px', fontWeight: 600 }}>Board Name</th>
                  <th style={{ padding: '12px', fontSize: '13px', fontWeight: 600 }}>Owner</th>
                  <th style={{ padding: '12px', fontSize: '13px', fontWeight: 600 }}>Privacy</th>
                  <th style={{ padding: '12px', fontSize: '13px', fontWeight: 600 }}>Members</th>
                  <th style={{ padding: '12px', fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {boards.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--colors-hairline-soft)' }}>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      <Link href={`/boards/${b.id}`} style={{ color: 'var(--colors-primary)', fontWeight: 500, textDecoration: 'none' }}>
                        {b.name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>{b.owner?.name || 'System / None'}</td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      <span className="badge-pill" style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        backgroundColor: b.privacy === 'PRIVATE' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: b.privacy === 'PRIVATE' ? 'var(--colors-warning)' : 'var(--colors-success)'
                      }}>
                        {b.privacy}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>{b.users?.length || 0}</td>
                    <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteBoard(b.id, b.name)}
                        disabled={actionLoading}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--colors-error)',
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: '12px',
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {boards.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--colors-muted)' }}>No boards found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Users List Section */}
          <h2 className="text-title-md" style={{ marginBottom: 'var(--spacing-md)' }}>Registered Users</h2>
          <div className="card-product-mockup" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--colors-surface-soft)', borderBottom: '1px solid var(--colors-hairline)' }}>
                  <th style={{ padding: '12px', fontSize: '13px', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '12px', fontSize: '13px', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '12px', fontSize: '13px', fontWeight: 600 }}>Sync Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isMock = u.clerkId.startsWith('mock_clerk_');
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--colors-hairline-soft)' }}>
                      <td style={{ padding: '12px', fontSize: '13px', fontWeight: 500 }}>{u.name}</td>
                      <td style={{ padding: '12px', fontSize: '13px' }}>{u.email}</td>
                      <td style={{ padding: '12px', fontSize: '13px' }}>
                        <span className="badge-pill" style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          backgroundColor: isMock ? 'rgba(107, 114, 128, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: isMock ? 'var(--colors-muted)' : 'var(--colors-success)',
                        }}>
                          {isMock ? 'Pending Clerk Sign-in' : 'Synced with Clerk'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: 'var(--colors-muted)' }}>No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: User Addition Form */}
        <div style={{ position: 'sticky', top: 'var(--spacing-xl)' }}>
          <h2 className="text-title-md" style={{ marginBottom: 'var(--spacing-md)' }}>Add Pre-registered User</h2>
          <div className="card-product-mockup" style={{ padding: 'var(--spacing-lg)' }}>
            <p className="text-caption" style={{ marginBottom: 'var(--spacing-md)', color: 'var(--colors-muted)' }}>
              Add a user&apos;s name and email below. Once they sign in to Clerk with the matching email address, their profile will be linked automatically.
            </p>
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <div>
                <label className="text-caption" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  className="form-input"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  disabled={actionLoading}
                />
              </div>
              <div>
                <label className="text-caption" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jane@example.com"
                  className="form-input"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  disabled={actionLoading}
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={actionLoading || !newUserName.trim() || !newUserEmail.trim()}
                style={{ marginTop: 'var(--spacing-xs)', height: '40px' }}
              >
                {actionLoading ? 'Saving...' : 'Add User'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
