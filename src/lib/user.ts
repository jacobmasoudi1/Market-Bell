import { prisma } from "@/lib/prisma";


export async function getOrCreateDefaultUser() {
  const userId = "default-user";
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });
  return userId;
}
