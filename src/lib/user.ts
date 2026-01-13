import { prisma } from "@/lib/prisma";

export const DEFAULT_USER_EMAIL = process.env.DEFAULT_USER_EMAIL ?? "demo@marketbell.local";
export const DEFAULT_PROVIDER_ID = "default_local_user";


export async function getOrCreateDefaultUser(): Promise<string> {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ providerAccountId: DEFAULT_PROVIDER_ID }, { email: DEFAULT_USER_EMAIL }],
    },
  });
  if (existing) return existing.id;

  const user = await prisma.user.create({
    data: {
      email: DEFAULT_USER_EMAIL,
      name: "Market Bell Demo",
      providerAccountId: DEFAULT_PROVIDER_ID,
    },
  });
  return user.id;
}
