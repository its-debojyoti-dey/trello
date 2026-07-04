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
    const card = await db.card.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        list: {
          include: {
            board: true,
          },
        },
      },
    });
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // GET validation: Block if board is private and user is not member/owner/admin
    const session = await auth();
    const isAdmin = (session.sessionClaims?.metadata as { role?: string })?.role === 'admin';
    const dbUser = session.userId ? await db.user.findUnique({ where: { clerkId: session.userId } }) : null;

    if (card.list.board.privacy === 'PRIVATE') {
      if (!dbUser && !isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      if (!isAdmin && card.list.board.ownerId !== dbUser?.id && !card.list.board.userIds.includes(dbUser!.id)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { list: _list, ...cardWithoutList } = card;
    return NextResponse.json(cardWithoutList);
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
    const { name, description, listId, assignedToId } = await req.json();

    if (listId !== undefined && !isValidObjectId(listId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    if (assignedToId !== undefined && assignedToId !== null && !isValidObjectId(assignedToId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const originalCard = await db.card.findUnique({
      where: { id },
      include: {
        list: {
          include: {
            board: true,
          },
        },
      },
    });

    if (!originalCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
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
    const isAdmin = (session.sessionClaims?.metadata as { role?: string })?.role === 'admin';

    const isMember = originalCard.list.board.ownerId === dbUser.id || originalCard.list.board.userIds.includes(dbUser.id);
    if (!isAdmin && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const dataToUpdate: {
      name?: string;
      description?: string;
      listId?: string;
      assignedToId?: string | null;
    } = {};

    if (name !== undefined) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;

    // Validate and update listId
    if (listId !== undefined && listId !== originalCard.listId) {
      const targetList = await db.boardList.findUnique({
        where: { id: listId },
      });
      if (!targetList) {
        return NextResponse.json({ error: 'Target list not found' }, { status: 404 });
      }
      if (targetList.boardId !== originalCard.list.boardId) {
        return NextResponse.json({ error: 'Cannot move card to a list in a different board' }, { status: 400 });
      }
      dataToUpdate.listId = listId;
    }

    // Validate and update assignedToId
    if (assignedToId !== undefined) {
      if (assignedToId === null) {
        dataToUpdate.assignedToId = null;
      } else {
        const user = await db.user.findUnique({
          where: { id: assignedToId },
        });
        if (!user) {
          return NextResponse.json({ error: 'Assignee user not found' }, { status: 404 });
        }
        const boardUserIds = originalCard.list.board.userIds || [];
        if (!boardUserIds.includes(assignedToId)) {
          return NextResponse.json({ error: 'Assignee must be a member of the board' }, { status: 400 });
        }
        dataToUpdate.assignedToId = assignedToId;
      }
    }

    const card = await db.card.update({
      where: { id },
      data: dataToUpdate,
      include: {
        assignedTo: true,
      },
    });

    return NextResponse.json(card);
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
    const cardExists = await db.card.findUnique({
      where: { id },
      include: {
        list: {
          include: {
            board: true,
          },
        },
      },
    });
    if (!cardExists) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
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
    const isAdmin = (session.sessionClaims?.metadata as { role?: string })?.role === 'admin';

    const isMember = cardExists.list.board.ownerId === dbUser.id || cardExists.list.board.userIds.includes(dbUser.id);
    if (!isAdmin && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.card.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    const error = e as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

