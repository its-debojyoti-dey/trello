'use client';

import React from 'react';

interface HeaderProps {
  onManageUsersClick: () => void;
}

export default function Header({ onManageUsersClick }: HeaderProps) {
  return (
    <header className="top-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
        {/* Sleek Ascendo AI Geometric Logo */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--rounded-md)',
            backgroundColor: 'var(--colors-primary)',
            color: 'var(--colors-on-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '18px',
            fontFamily: 'var(--font-sans)',
            userSelect: 'none',
          }}
        >
          A
        </div>
        <span
          className="text-title-md"
          style={{
            letterSpacing: '-0.3px',
            fontWeight: 600,
            color: 'var(--colors-ink)',
          }}
        >
          Ascendo AI
        </span>
      </div>

      <div>
        <button
          onClick={onManageUsersClick}
          className="btn-secondary"
          style={{
            height: '36px',
            padding: '0 var(--spacing-md)',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Manage Users
        </button>
      </div>
    </header>
  );
}
