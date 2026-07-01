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
