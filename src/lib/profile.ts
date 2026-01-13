import { prisma } from "@/lib/prisma";
import { BriefStyle, Experience, Horizon, Risk } from "@prisma/client";

export const PROFILE_DEFAULTS = {
  riskTolerance: Risk.medium,
  horizon: Horizon.long,
  briefStyle: BriefStyle.bullet,
  experience: Experience.intermediate,
  sectors: null as string | null,
  constraints: null as string | null,
};

const riskSet = new Set(["low", "medium", "high"]);
const horizonSet = new Set(["day", "swing", "long"]);
const briefSet = new Set(["bullet", "narrative", "numbers_first"]);
const expSet = new Set(["beginner", "intermediate", "advanced"]);

export function sanitizeProfile(input: any) {
  const risk = riskSet.has(input?.riskTolerance) ? input.riskTolerance : PROFILE_DEFAULTS.riskTolerance;
  const horizon = horizonSet.has(input?.horizon) ? input.horizon : PROFILE_DEFAULTS.horizon;
  const brief = briefSet.has(input?.briefStyle) ? input.briefStyle : PROFILE_DEFAULTS.briefStyle;
  const experience = expSet.has(input?.experience) ? input.experience : PROFILE_DEFAULTS.experience;
  return {
    riskTolerance: risk,
    horizon,
    briefStyle: brief,
    experience,
    sectors: input?.sectors?.trim() || null,
    constraints: input?.constraints?.trim() || null,
  };
}

export async function getOrCreateProfile(userId: string) {
  const existing = await prisma.userProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.userProfile.create({
    data: {
      userId,
      ...PROFILE_DEFAULTS,
    },
  });
}
