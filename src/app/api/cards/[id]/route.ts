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
      },
    });
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    return NextResponse.json(card);
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
    const cardExists = await db.card.findUnique({ where: { id } });
    if (!cardExists) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
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
