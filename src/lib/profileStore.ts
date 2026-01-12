import { Profile, ToolResponse } from "@/lib/types";

let profileStore: Profile = {
  riskTolerance: "medium",
  horizon: "swing",
  sectors: "tech",
  constraints: "demo constraints",
};

export function saveProfile(input: Partial<Profile>): ToolResponse<{ profile: Profile }> {
  profileStore = {
    riskTolerance: (input.riskTolerance as Profile["riskTolerance"]) ?? profileStore.riskTolerance,
    horizon: (input.horizon as Profile["horizon"]) ?? profileStore.horizon,
    sectors: input.sectors ?? profileStore.sectors,
    constraints: input.constraints ?? profileStore.constraints,
  };
  return { ok: true, data: { profile: profileStore } };
}

export function getProfile(): ToolResponse<Profile> {
  return { ok: true, data: profileStore };
}
