import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Ensure all existing users have a unique clerkId so we can apply the @unique constraint
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users in database.`);
  
  for (const user of users) {
    if (!user.clerkId) {
      const generatedClerkId = `user_${user.id}`;
      await prisma.user.update({
        where: { id: user.id },
        data: { clerkId: generatedClerkId }
      });
      console.log(`Assigned clerkId '${generatedClerkId}' to user ${user.name}`);
      user.clerkId = generatedClerkId; // update local object reference
    }
  }

  // Reload users after updates to ensure we have correct state
  const updatedUsers = await prisma.user.findMany();

  if (updatedUsers.length === 0) {
    console.log('No users found. Creating a temporary user to own existing boards.');
    const tempUser = await prisma.user.create({
      data: {
        clerkId: 'temp_clerk_id',
        name: 'System Owner',
        email: 'system@example.com',
      }
    });
    updatedUsers.push(tempUser);
  }

  const defaultOwner = updatedUsers[0];
  const allBoards = await prisma.board.findMany();
  const boards = allBoards.filter((board: any) => !board.ownerId);

  console.log(`Found ${boards.length} boards without an owner.`);

  for (const board of boards) {
    let ownerToAssign = defaultOwner;
    if (board.userIds && board.userIds.length > 0) {
      const firstUserId = board.userIds[0];
      const existingUser = updatedUsers.find(u => u.id === firstUserId);
      if (existingUser) {
        ownerToAssign = existingUser;
      }
    }

    await prisma.board.update({
      where: { id: board.id },
      data: { ownerId: ownerToAssign.id }
    });
    console.log(`Updated board ${board.name} with owner ${ownerToAssign.name}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
