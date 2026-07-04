import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isValidObjectId } from '@/lib/utils';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (!isValidObjectId(userId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const userExists = await db.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const boardExists = await db.board.findUnique({ where: { id } });
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

    if (!isAdmin && boardExists.ownerId !== dbUser.id) {
      return NextResponse.json({ error: 'Only the board owner can invite members' }, { status: 403 });
    }

    // If user is already associated with the board, return the board to prevent duplicate entries
    if (boardExists.userIds.includes(userId)) {
      return NextResponse.json(boardExists);
    }

    const updatedBoard = await db.board.update({
      where: { id },
      data: {
        users: {
          connect: { id: userId },
        },
      },
      include: {
        users: true,
      },
    });

    return NextResponse.json(updatedBoard);
  } catch (e) {
    const error = e as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

