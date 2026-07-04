import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isValidObjectId } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const { name, description, listId } = await req.json();
    if (!name || !listId) {
      return NextResponse.json({ error: 'Name and listId are required' }, { status: 400 });
    }
    if (!isValidObjectId(listId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const listExists = await db.boardList.findUnique({
      where: { id: listId },
      include: { board: true },
    });
    if (!listExists) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    const session = await auth();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const dbUser = await db.user.findUnique({ where: { clerkId: session.userId } });
    if (!dbUser) {
      return NextResponse.json({ error: 'User record not synced yet' }, { status: 403 });
    }
    const isAdmin = (session.sessionClaims?.metadata as { role?: string })?.role === 'admin';

    const isMember = listExists.board.ownerId === dbUser.id || listExists.board.userIds.includes(dbUser.id);
    if (!isAdmin && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const card = await db.card.create({
      data: {
        name,
        description: description || '',
        listId,
      },
    });
    return NextResponse.json(card, { status: 201 });
  } catch (e) {
    const error = e as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

