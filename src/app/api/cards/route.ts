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

    const listExists = await db.boardList.findUnique({ where: { id: listId } });
    if (!listExists) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
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
