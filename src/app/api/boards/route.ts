import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    const { userId: clerkId } = session;
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: 'User record not synced yet' }, { status: 403 });
    }

    const isAdmin = (session.sessionClaims?.metadata as any)?.role === 'admin';

    const boards = await db.board.findMany({
      where: isAdmin ? {} : {
        OR: [
          { ownerId: user.id },
          { userIds: { has: user.id } }
        ]
      }
    });

    return NextResponse.json(boards);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: 'User record not synced yet' }, { status: 403 });
    }

    const { name, privacy } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const board = await db.board.create({
      data: {
        name,
        privacy: privacy || 'PUBLIC',
        ownerId: user.id,
        userIds: [user.id]
      },
    });

    const updatedBoard = await db.board.update({
      where: { id: board.id },
      data: { url: `/boards/${board.id}` },
    });

    return NextResponse.json(updatedBoard, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

