import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import Link from 'next/link';

export default async function AdminPage() {
  const { sessionClaims } = await auth();
  const isAdmin = (sessionClaims?.metadata as { role?: string })?.role === 'admin';

  if (!isAdmin) {
    redirect('/');
  }

  const totalUsers = await db.user.count();
  const totalBoards = await db.board.count();
  const totalLists = await db.boardList.count();
  const totalCards = await db.card.count();

  const boards = await db.board.findMany({
    include: { owner: true, users: true }
  });

  return (
    <main className="container" style={{ padding: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <h1 className="text-display-sm">Platform Admin Dashboard</h1>
        <Link href="/" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          Back to Boards
        </Link>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
        <div className="card-product-mockup">
          <h3 className="text-caption">Total Users</h3>
          <p className="text-display-sm" style={{ margin: 0 }}>{totalUsers}</p>
        </div>
        <div className="card-product-mockup">
          <h3 className="text-caption">Total Boards</h3>
          <p className="text-display-sm" style={{ margin: 0 }}>{totalBoards}</p>
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

      {/* Boards List Section */}
      <h2 className="text-title-md" style={{ marginBottom: 'var(--spacing-md)' }}>Manage Boards</h2>
      <div className="card-product-mockup" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--spacing-xl)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--colors-surface-soft)', borderBottom: '1px solid var(--colors-hairline)' }}>
              <th style={{ padding: '12px' }}>Board Name</th>
              <th style={{ padding: '12px' }}>Owner</th>
              <th style={{ padding: '12px' }}>Privacy</th>
              <th style={{ padding: '12px' }}>Members</th>
            </tr>
          </thead>
          <tbody>
            {boards.map(b => (
              <tr key={b.id} style={{ borderBottom: '1px solid var(--colors-hairline-soft)' }}>
                <td style={{ padding: '12px' }}>{b.name}</td>
                <td style={{ padding: '12px' }}>{b.owner.name}</td>
                <td style={{ padding: '12px' }}>{b.privacy}</td>
                <td style={{ padding: '12px' }}>{b.users.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
