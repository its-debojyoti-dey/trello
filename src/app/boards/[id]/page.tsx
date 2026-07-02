'use client';

import React, { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import UserModal from '../../components/UserModal';
import CardModal from '../../components/CardModal';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Card {
  id: string;
  name: string;
  description: string;
  listId: string;
  assignedToId: string | null;
  assignedTo?: User | null;
}

interface BoardList {
  id: string;
  name: string;
  boardId: string;
  cards: Card[];
}

interface Board {
  id: string;
  name: string;
  privacy: string;
  userIds: string[];
  users: User[];
  lists: BoardList[];
}

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = use(params);
  const router = useRouter();

  // Board Data and User lists
  const [board, setBoard] = useState<Board | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // In-flight PUT tracking for drag and drop operations
  const inFlightPuts = useRef(0);

  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Create List Form state
  const [showAddListForm, setShowAddListForm] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Create Card Form state (key: listId)
  const [newCardNames, setNewCardNames] = useState<Record<string, string>>({});
  const [activeAddCardListId, setActiveAddCardListId] = useState<string | null>(null);

  // Search/Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Drag and Drop state
  const [activeDragOverListId, setActiveDragOverListId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  const fetchBoardData = async (clearError = true) => {
    setIsLoading(true);
    if (clearError) {
      setError(null);
    }
    try {
      const res = await fetch(`/api/boards/${boardId}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Board not found');
        }
        throw new Error('Failed to fetch board details');
      }
      const data = await res.json();
      if (inFlightPuts.current === 0) {
        setBoard(data);
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBoardData();
    fetchAllUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const handleDeleteBoard = async () => {
    if (!board) return;
    if (
      !window.confirm(
        `Are you sure you want to delete the board "${board.name}"? This will permanently delete all lists and cards inside it.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete board');
      }
      router.push('/');
    } catch (err) {
      const error = err as Error;
      alert(error.message || 'Failed to delete board');
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/boards/${boardId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add member');
      }
      // Reload board data to get the updated members pile
      fetchBoardData();
    } catch (err) {
      const error = err as Error;
      alert(error.message || 'Failed to add member to the board');
    }
  };

  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newListName.trim(),
          boardId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create list');
      }

      setNewListName('');
      setShowAddListForm(false);
      fetchBoardData();
    } catch (err) {
      const error = err as Error;
      alert(error.message || 'Failed to add list');
    }
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the list "${listName}"? This will delete all cards inside it.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete list');
      }
      fetchBoardData();
    } catch (err) {
      const error = err as Error;
      alert(error.message || 'Failed to delete list');
    }
  };

  const handleAddCard = async (listId: string) => {
    const cardName = newCardNames[listId];
    if (!cardName || !cardName.trim()) return;

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cardName.trim(),
          listId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create card');
      }

      setNewCardNames((prev) => ({ ...prev, [listId]: '' }));
      setActiveAddCardListId(null);
      fetchBoardData();
    } catch (err) {
      const error = err as Error;
      alert(error.message || 'Failed to add card');
    }
  };

  const handleDrop = async (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    setActiveDragOverListId(null);
    setDraggedCardId(null);

    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    if (!board) return;

    // Find the source list and the card to move synchronously before calling setBoard
    let cardToMove: Card | undefined;
    let sourceListId: string | undefined;

    for (const list of board.lists) {
      const card = list.cards.find((c) => c.id === cardId);
      if (card) {
        cardToMove = card;
        sourceListId = list.id;
        break;
      }
    }

    if (!cardToMove || !sourceListId) return;
    if (sourceListId === targetListId) return;

    // In-flight PUT tracking: increment right before performing optimistic update
    inFlightPuts.current++;

    // Optimistically update the UI state
    setBoard((prevBoard) => {
      if (!prevBoard) return null;

      const updatedLists = prevBoard.lists.map((list) => {
        if (list.id === sourceListId) {
          return {
            ...list,
            cards: list.cards.filter((c) => c.id !== cardId),
          };
        }
        if (list.id === targetListId) {
          const updatedCard = { ...cardToMove!, listId: targetListId };
          return {
            ...list,
            cards: [...list.cards, updatedCard],
          };
        }
        return list;
      });

      return {
        ...prevBoard,
        lists: updatedLists,
      };
    });

    try {
      try {
        const res = await fetch(`/api/cards/${cardId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listId: targetListId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to move card');
        }

        setError(null);
      } finally {
        inFlightPuts.current--;
      }
    } catch (err) {
      const error = err as Error;

      // Revert ONLY that specific card's position if it is still in the target list
      setBoard((prevBoard) => {
        if (!prevBoard) return null;

        // Verify that the card with cardId is actually present in targetListId currently
        const targetList = prevBoard.lists.find((l) => l.id === targetListId);
        const currentCard = targetList?.cards.find((c) => c.id === cardId);

        if (!currentCard) {
          // Abort rollback (do not change state)
          return prevBoard;
        }

        // Revert card back to sourceListId, keeping all its current fields/properties (to preserve any concurrent edits) except listId
        const revertedLists = prevBoard.lists.map((list) => {
          if (list.id === targetListId) {
            return {
              ...list,
              cards: list.cards.filter((c) => c.id !== cardId),
            };
          }
          if (list.id === sourceListId) {
            const exists = list.cards.some((c) => c.id === cardId);
            if (exists) return list;
            const revertedCard = {
              ...currentCard,
              listId: sourceListId!,
            };
            return {
              ...list,
              cards: [...list.cards, revertedCard],
            };
          }
          return list;
        });

        return {
          ...prevBoard,
          lists: revertedLists,
        };
      });

      // Trigger fetchBoardData(false) at the end of the catch block to sync client with actual DB state
      await fetchBoardData(false);
      setError(error.message || 'Failed to move card');
    }
  };

  // Find users who are NOT yet members of the board
  const nonMembers = allUsers.filter(
    (u) => !board?.users.some((member) => member.id === u.id)
  );

  return (
    <>
      <Header onManageUsersClick={() => setIsUserModalOpen(true)} />

      {/* Main Container */}
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: 'var(--spacing-lg)',
          overflow: 'hidden',
          height: 'calc(100vh - 64px)', // Deduct header height
        }}
      >
        {/* Back Link and Header controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--spacing-md)',
            flexWrap: 'wrap',
            gap: 'var(--spacing-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <button
              onClick={() => router.push('/')}
              className="btn-secondary"
              style={{
                height: '32px',
                padding: '0 12px',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
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
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Boards
            </button>
            {board && (
              <>
                <h1 className="text-title-lg" style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                  {board.name}
                </h1>
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
                  }}
                >
                  {board.privacy}
                </span>
              </>
            )}
          </div>

          {board && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              {/* Search input */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search cards..."
                  className="form-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '180px',
                    height: '32px',
                    padding: '0 28px 0 28px',
                    fontSize: '13px',
                    borderRadius: 'var(--rounded-md)',
                    backgroundColor: 'var(--colors-canvas)',
                    color: 'var(--colors-ink)',
                    transition: 'all 0.15s ease',
                  }}
                />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--colors-muted)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    position: 'absolute',
                    left: '8px',
                    pointerEvents: 'none',
                  }}
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--colors-muted)',
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>

              {/* Member pile and invite selector */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  backgroundColor: 'var(--colors-surface-soft)',
                  padding: '4px 10px',
                  borderRadius: 'var(--rounded-pill)',
                  border: '1px solid var(--colors-hairline)',
                }}
              >
                {/* Facepile */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {board.users.map((member, idx) => (
                    <div
                      key={member.id}
                      className="avatar-circle"
                      title={`${member.name} (${member.email})`}
                      style={{
                        width: '28px',
                        height: '28px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: '2px solid var(--colors-canvas)',
                        marginLeft: idx === 0 ? '0' : '-8px',
                        zIndex: 10 - idx,
                        backgroundColor: '#e5e7eb',
                        color: 'var(--colors-ink)',
                      }}
                    >
                      {member.name
                        ? member.name
                            .split(' ')
                            .filter(Boolean)
                            .map((n) => n[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase() || '?'
                        : '?'}
                    </div>
                  ))}
                </div>

                {/* Add member select dropdown */}
                <select
                  className="form-input"
                  value=""
                  onChange={(e) => {
                    const userId = e.target.value;
                    if (userId) {
                      handleAddMember(userId);
                    }
                  }}
                  style={{
                    width: 'auto',
                    minWidth: '120px',
                    height: '28px',
                    padding: '0 24px 0 8px',
                    fontSize: '12px',
                    fontWeight: 500,
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 4px center',
                    backgroundSize: '12px',
                  }}
                >
                  <option value="" disabled>
                    + Add Member
                  </option>
                  {nonMembers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                  {nonMembers.length === 0 && (
                    <option disabled>All users added</option>
                  )}
                </select>
              </div>

              {/* Delete Board Button */}
              <button
                onClick={handleDeleteBoard}
                style={{
                  height: '32px',
                  padding: '0 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: 'transparent',
                  color: 'var(--colors-error)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--rounded-md)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
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
                Delete Board
              </button>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              color: 'var(--colors-error)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--rounded-md)',
              marginBottom: 'var(--spacing-lg)',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && !board ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--colors-muted)',
            }}
          >
            <span className="text-body-md">Loading board layout...</span>
          </div>
        ) : !board ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--colors-muted)',
              flexDirection: 'column',
              gap: 'var(--spacing-sm)',
            }}
          >
            <span className="text-body-md">Board details could not be found.</span>
            <button onClick={() => router.push('/')} className="btn-primary">
              Back to Home
            </button>
          </div>
        ) : (
          /* Kanban Board Columns Scrollable Layout */
          <div
            style={{
              display: 'flex',
              gap: 'var(--spacing-md)',
              overflowX: 'auto',
              flex: 1,
              alignItems: 'flex-start',
              paddingBottom: 'var(--spacing-md)',
            }}
          >
            {board.lists.map((list) => {
              const filteredCards = list.cards.filter((card) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase().trim();
                const nameMatch = card.name ? card.name.toLowerCase().includes(query) : false;
                const descMatch = card.description ? card.description.toLowerCase().includes(query) : false;
                return nameMatch || descMatch;
              });

              return (
                <div
                  key={list.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (activeDragOverListId !== list.id) {
                      setActiveDragOverListId(list.id);
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (activeDragOverListId !== list.id) {
                      setActiveDragOverListId(list.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (activeDragOverListId === list.id) {
                      setActiveDragOverListId(null);
                    }
                  }}
                  onDrop={(e) => handleDrop(e, list.id)}
                  style={{
                    width: '280px',
                    flexShrink: 0,
                    backgroundColor:
                      activeDragOverListId === list.id
                        ? 'var(--colors-surface-strong)'
                        : 'var(--colors-surface-soft)',
                    border:
                      activeDragOverListId === list.id
                        ? '1px solid var(--colors-primary)'
                        : '1px solid var(--colors-hairline)',
                    borderRadius: 'var(--rounded-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '100%',
                    transition: 'background-color 0.2s ease, border-color 0.2s ease',
                  }}
                >
                {/* List Header */}
                <div
                  style={{
                    padding: '12px var(--spacing-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--colors-hairline-soft)',
                    pointerEvents: draggedCardId ? 'none' : 'auto',
                  }}
                >
                  <h3
                    className="text-title-sm"
                    style={{
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '200px',
                      fontSize: '15px',
                    }}
                  >
                    {list.name}
                  </h3>
                  <button
                    onClick={() => handleDeleteList(list.id, list.name)}
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
                    title="Delete List"
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
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>

                {/* Cards Area */}
                <div
                  style={{
                    padding: 'var(--spacing-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-sm)',
                    overflowY: 'auto',
                    flex: 1,
                    pointerEvents: draggedCardId ? 'none' : 'auto',
                  }}
                >
                  {filteredCards.map((card) => (
                    <div
                      key={card.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', card.id);
                        setDraggedCardId(card.id);
                        setError(null);
                      }}
                      onDragEnd={() => {
                        setActiveDragOverListId(null);
                        setDraggedCardId(null);
                      }}
                      onClick={() => {
                        setActiveCardId(card.id);
                        setIsCardModalOpen(true);
                      }}
                      className="card-product-mockup card-item-hover"
                      style={{
                        padding: 'var(--spacing-sm)',
                        backgroundColor: 'var(--colors-canvas)',
                        border: '1px solid var(--colors-hairline)',
                        borderRadius: 'var(--rounded-md)',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        cursor: 'grab',
                      }}
                    >
                      <div
                        className="text-title-sm"
                        style={{ fontSize: '13.5px', margin: 0, color: 'var(--colors-ink)', fontWeight: 600 }}
                      >
                        {card.name}
                      </div>
                      {card.description && (
                        <p
                          className="text-caption"
                          style={{
                            color: 'var(--colors-muted)',
                            margin: 0,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontSize: '11.5px',
                            lineHeight: 1.4,
                          }}
                        >
                          {card.description}
                        </p>
                      )}
                      {card.assignedTo && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                          <div
                            className="avatar-circle"
                            title={`Assigned to ${card.assignedTo.name}`}
                            style={{
                              width: '18px',
                              height: '18px',
                              fontSize: '8px',
                              fontWeight: 700,
                              backgroundColor: '#e5e7eb',
                              color: 'var(--colors-ink)',
                              border: '1px solid var(--colors-hairline)',
                            }}
                          >
                            {card.assignedTo.name
                              ? card.assignedTo.name
                                  .split(' ')
                                  .filter(Boolean)
                                  .map((n) => n[0])
                                  .join('')
                                  .substring(0, 2)
                                  .toUpperCase() || '?'
                              : '?'}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredCards.length === 0 && (
                    <div
                      style={{
                        padding: 'var(--spacing-md) 0',
                        textAlign: 'center',
                        color: 'var(--colors-muted)',
                        fontSize: '12px',
                        border: '1px dashed var(--colors-hairline-soft)',
                        borderRadius: 'var(--rounded-md)',
                      }}
                    >
                      {searchQuery.trim() ? 'No matching cards' : 'Empty List'}
                    </div>
                  )}
                </div>

                {/* Add Card Form inline */}
                <div
                  style={{
                    padding: 'var(--spacing-md)',
                    borderTop: '1px solid var(--colors-hairline-soft)',
                    pointerEvents: draggedCardId ? 'none' : 'auto',
                  }}
                >
                  {activeAddCardListId === list.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddCard(list.id);
                      }}
                      style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                    >
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter card name..."
                        value={newCardNames[list.id] || ''}
                        onChange={(e) =>
                          setNewCardNames((prev) => ({ ...prev, [list.id]: e.target.value }))
                        }
                        autoFocus
                        required
                        style={{ height: '32px', fontSize: '13px' }}
                      />
                      <div style={{ display: 'flex', gap: 'var(--spacing-xxs)', marginTop: '2px' }}>
                        <button
                          type="submit"
                          className="btn-primary"
                          style={{ height: '28px', padding: '0 12px', fontSize: '12px' }}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setActiveAddCardListId(null);
                            setNewCardNames((prev) => ({ ...prev, [list.id]: '' }));
                          }}
                          style={{ height: '28px', padding: '0 12px', fontSize: '12px' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setActiveAddCardListId(list.id)}
                      style={{
                        width: '100%',
                        height: '32px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--colors-muted)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        borderRadius: 'var(--rounded-md)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--colors-hairline-soft)';
                        e.currentTarget.style.color = 'var(--colors-ink)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--colors-muted)';
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
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add Card
                    </button>
                  )}
                </div>
              </div>
              );
            })}

            {/* Add List column */}
            <div style={{ width: '280px', flexShrink: 0 }}>
              {showAddListForm ? (
                <form
                  onSubmit={handleAddList}
                  style={{
                    backgroundColor: 'var(--colors-surface-soft)',
                    border: '1px solid var(--colors-hairline)',
                    borderRadius: 'var(--rounded-lg)',
                    padding: 'var(--spacing-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-xs)',
                  }}
                >
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter list title..."
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    autoFocus
                    required
                    style={{ height: '36px', fontSize: '14px' }}
                  />
                  <div style={{ display: 'flex', gap: 'var(--spacing-xxs)' }}>
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ height: '32px', padding: '0 14px', fontSize: '13px' }}
                    >
                      Add List
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setShowAddListForm(false);
                        setNewListName('');
                      }}
                      style={{ height: '32px', padding: '0 14px', fontSize: '13px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddListForm(true)}
                  style={{
                    width: '100%',
                    height: '48px',
                    backgroundColor: 'transparent',
                    border: '1px dashed var(--colors-hairline)',
                    borderRadius: 'var(--rounded-lg)',
                    color: 'var(--colors-muted)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--colors-primary)';
                    e.currentTarget.style.color = 'var(--colors-ink)';
                    e.currentTarget.style.backgroundColor = 'var(--colors-surface-soft)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--colors-hairline)';
                    e.currentTarget.style.color = 'var(--colors-muted)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add List
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* User Management Modal */}
      <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />

      {/* Card Details Modal */}
      {board && (
        <CardModal
          isOpen={isCardModalOpen}
          onClose={() => {
            setIsCardModalOpen(false);
            setActiveCardId(null);
          }}
          cardId={activeCardId}
          boardMembers={board.users}
          boardLists={board.lists.map((l) => ({ id: l.id, name: l.name }))}
          onCardUpdated={fetchBoardData}
        />
      )}
    </>
  );
}
