import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isValidObjectId } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const { name, boardId } = await req.json();
    if (!name || !boardId) {
      return NextResponse.json({ error: 'Name and boardId are required' }, { status: 400 });
    }
    if (!isValidObjectId(boardId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const boardExists = await db.board.findUnique({ where: { id: boardId } });
    if (!boardExists) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const session = await auth();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const dbUser = await db.user.findUnique({ where: { clerkId: session.userId } });
    if (!dbUser) {
      return NextResponse.json({ error: 'User record not synced yet' }, { status: 403 });
    }
    const isAdmin = (session.sessionClaims?.metadata as any)?.role === 'admin';

    const isMember = boardExists.ownerId === dbUser.id || boardExists.userIds.includes(dbUser.id);
    if (!isAdmin && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const list = await db.boardList.create({
      data: {
        name,
        boardId,
      },
    });
    return NextResponse.json(list, { status: 201 });
  } catch (e) {
    const error = e as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

