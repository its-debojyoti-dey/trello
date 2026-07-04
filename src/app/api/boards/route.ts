import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const boards = await db.board.findMany();
    return NextResponse.json(boards);
  } catch (e) {
    const error = e as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, privacy } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const defaultUser = await db.user.findFirst();
    if (!defaultUser) {
      return NextResponse.json({ error: 'No users exist to own this board. Create a user first.' }, { status: 400 });
    }
    const board = await db.board.create({
      data: {
        name,
        privacy: privacy || 'PUBLIC',
        ownerId: defaultUser.id,
        userIds: [defaultUser.id]
      },
    });
    const updatedBoard = await db.board.update({
      where: { id: board.id },
      data: { url: `/boards/${board.id}` },
    });
    return NextResponse.json(updatedBoard, { status: 201 });
  } catch (e) {
    const error = e as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
