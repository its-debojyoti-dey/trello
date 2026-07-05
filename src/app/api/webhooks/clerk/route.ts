import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response('CLERK_WEBHOOK_SECRET not configured', { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response('Webhook verification failed', { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, first_name, last_name, email_addresses } = evt.data;
    const primaryEmail = email_addresses?.[0]?.email_address;

    if (!primaryEmail) {
      return new Response('Missing primary email address', { status: 400 });
    }

    const fullName = [first_name, last_name].filter(Boolean).join(' ') || 'User';

    // Check if user already exists by clerkId
    const existingByClerkId = await db.user.findUnique({
      where: { clerkId: id },
    });

    if (existingByClerkId) {
      await db.user.update({
        where: { clerkId: id },
        data: {
          name: fullName,
          email: primaryEmail,
        },
      });
    } else {
      // Check if user already exists by email to prevent User_email_key violations
      const existingByEmail = await db.user.findUnique({
        where: { email: primaryEmail },
      });

      if (existingByEmail) {
        await db.user.update({
          where: { email: primaryEmail },
          data: {
            clerkId: id,
            name: fullName,
          },
        });
      } else {
        await db.user.create({
          data: {
            clerkId: id,
            name: fullName,
            email: primaryEmail,
          },
        });
      }
    }

    return new Response('User synced successfully', { status: 200 });
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    if (id) {
      // Find user to clean up card assignees
      const user = await db.user.findUnique({ where: { clerkId: id } });
      if (user) {
        // Run all cleanup operations inside a database transaction to ensure atomicity
        await db.$transaction(async (tx) => {
          // 1. Get all board IDs owned by this user
          const ownedBoards = await tx.board.findMany({
            where: { ownerId: user.id },
            select: { id: true }
          });
          const ownedBoardIds = ownedBoards.map(b => b.id);

          if (ownedBoardIds.length > 0) {
            // Manual cascade delete cards and lists for these boards to avoid orphaned documents
            await tx.card.deleteMany({
              where: { list: { boardId: { in: ownedBoardIds } } }
            });
            await tx.boardList.deleteMany({
              where: { boardId: { in: ownedBoardIds } }
            });
            
            // Clean up member users' boardIds arrays for the boards we are deleting
            const usersToUpdate = await tx.user.findMany({
              where: { boardIds: { hasSome: ownedBoardIds } }
            });
            for (const u of usersToUpdate) {
              await tx.user.update({
                where: { id: u.id },
                data: {
                  boardIds: {
                    set: u.boardIds.filter(bid => !ownedBoardIds.includes(bid))
                  }
                }
              });
            }

            await tx.board.deleteMany({
              where: { id: { in: ownedBoardIds } }
            });
          }

          // 2. Remove user from userIds in any other boards they are members of (excluding owned boards which are already deleted)
          const boardsToUpdate = await tx.board.findMany({
            where: {
              userIds: { has: user.id },
              ownerId: { not: user.id }
            }
          });
          for (const board of boardsToUpdate) {
            await tx.board.update({
              where: { id: board.id },
              data: {
                userIds: {
                  set: board.userIds.filter(uid => uid !== user.id)
                }
              }
            });
          }

          // 3. Unassign the user from cards
          await tx.card.updateMany({
            where: { assignedToId: user.id },
            data: { assignedToId: null }
          });

          // 4. Finally, delete the user
          await tx.user.delete({ where: { id: user.id } });
        });
      }
    }
    return new Response('User deleted successfully', { status: 200 });
  }

  return new Response('Event type unhandled', { status: 200 });
}
