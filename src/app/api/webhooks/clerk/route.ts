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

    await db.user.upsert({
      where: { clerkId: id },
      update: {
        name: fullName,
        email: primaryEmail,
      },
      create: {
        clerkId: id,
        name: fullName,
        email: primaryEmail,
      },
    });

    return new Response('User synced successfully', { status: 200 });
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    if (id) {
      // Find user to clean up card assignees
      const user = await db.user.findUnique({ where: { clerkId: id } });
      if (user) {
        await db.card.updateMany({
          where: { assignedToId: user.id },
          data: { assignedToId: null }
        });
        await db.user.delete({ where: { id: user.id } });
      }
    }
    return new Response('User deleted successfully', { status: 200 });
  }

  return new Response('Event type unhandled', { status: 200 });
}
