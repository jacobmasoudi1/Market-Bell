import { prisma } from "@/lib/prisma";


export async function getOrCreateDefaultUser() {
  const existing = await prisma.user.findFirst({ select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.user.create({ data: {} });
  return created.id;
}
