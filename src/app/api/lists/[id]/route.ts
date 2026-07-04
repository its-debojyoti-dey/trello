import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isValidObjectId } from '@/lib/utils';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const list = await db.boardList.findUnique({
      where: { id },
      include: {
        cards: true,
        board: true,
      },
    });
    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    // GET validation: Block if board is private and user is not member/owner/admin
    const session = await auth();
    const isAdmin = (session.sessionClaims?.metadata as any)?.role === 'admin';
    const dbUser = session.userId ? await db.user.findUnique({ where: { clerkId: session.userId } }) : null;

    if (list.board.privacy === 'PRIVATE') {
      if (!dbUser && !isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      if (!isAdmin && list.board.ownerId !== dbUser?.id && !list.board.userIds.includes(dbUser!.id)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const { board, ...listWithoutBoard } = list;
    return NextResponse.json(listWithoutBoard);
  } catch (e) {
    const error = e as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const listExists = await db.boardList.findUnique({
      where: { id },
      include: { board: true },
    });
    if (!listExists) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    // PUT validation: Block unless user is member or admin
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const dbUser = await db.user.findUnique({ where: { clerkId: session.userId } });
    if (!dbUser) {
      return NextResponse.json({ error: 'User record not synced yet' }, { status: 403 });
    }
    const isAdmin = (session.sessionClaims?.metadata as any)?.role === 'admin';

    const isMember = listExists.board.ownerId === dbUser.id || listExists.board.userIds.includes(dbUser.id);
    if (!isAdmin && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const list = await db.boardList.update({
      where: { id },
      data: { name },
    });
    return NextResponse.json(list);
  } catch (e) {
    const error = e as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const listExists = await db.boardList.findUnique({
      where: { id },
      include: { board: true },
    });
    if (!listExists) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    // DELETE validation: Block unless user is member or admin
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const dbUser = await db.user.findUnique({ where: { clerkId: session.userId } });
    if (!dbUser) {
      return NextResponse.json({ error: 'User record not synced yet' }, { status: 403 });
    }
    const isAdmin = (session.sessionClaims?.metadata as any)?.role === 'admin';

    const isMember = listExists.board.ownerId === dbUser.id || listExists.board.userIds.includes(dbUser.id);
    if (!isAdmin && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.boardList.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    const error = e as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

