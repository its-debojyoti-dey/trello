'use client';

import React from 'react';
import { UserButton, SignInButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function Header() {
  const { user, isLoaded } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';

  return (
    <header className="top-nav">
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', textDecoration: 'none' }}>
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
      </Link>

      <div>
        {isLoaded && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            {isAdmin && (
              <Link
                href="/admin"
                className="btn-secondary"
                style={{
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 var(--spacing-md)',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                Admin Panel
              </Link>
            )}
            <UserButton />
          </div>
        ) : isLoaded ? (
          <SignInButton mode="modal">
            <button className="btn-primary" style={{ height: '36px', padding: '0 var(--spacing-md)', fontSize: '14px', fontWeight: 500 }}>
              Sign In
            </button>
          </SignInButton>
        ) : (
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--colors-surface-soft)' }} />
        )}
      </div>
    </header>
  );
}
