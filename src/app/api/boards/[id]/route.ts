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
    const board = await db.board.findUnique({
      where: { id },
      include: {
        lists: {
          include: {
            cards: {
              include: {
                assignedTo: true,
              },
            },
          },
        },
        users: true,
      },
    });
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // GET validation: Block if private and user is not member/owner/admin
    const session = await auth();
    const isAdmin = (session.sessionClaims?.metadata as any)?.role === 'admin';
    const dbUser = session.userId ? await db.user.findUnique({ where: { clerkId: session.userId } }) : null;

    if (board.privacy === 'PRIVATE') {
      if (!dbUser && !isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      if (!isAdmin && board.ownerId !== dbUser?.id && !board.userIds.includes(dbUser!.id)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json(board);
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
    const { name, privacy } = await req.json();

    const dataToUpdate: { name?: string; privacy?: string } = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (privacy !== undefined) dataToUpdate.privacy = privacy;

    const boardExists = await db.board.findUnique({ where: { id } });
    if (!boardExists) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // PUT validation: Block unless user is board owner or platform admin
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
      return NextResponse.json({ error: 'Only the board owner or admin can perform this action' }, { status: 403 });
    }

    const board = await db.board.update({
      where: { id },
      data: dataToUpdate,
    });
    return NextResponse.json(board);
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
    const boardExists = await db.board.findUnique({ where: { id } });
    if (!boardExists) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // DELETE validation: Block unless user is board owner or platform admin
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
      return NextResponse.json({ error: 'Only the board owner or admin can perform this action' }, { status: 403 });
    }

    const lists = await db.boardList.findMany({ where: { boardId: id } });
    const listIds = lists.map((l) => l.id);
    await db.card.deleteMany({ where: { listId: { in: listIds } } });
    await db.board.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    const error = e as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

