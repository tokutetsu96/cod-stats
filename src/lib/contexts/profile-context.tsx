"use client";

import { createContext, useContext } from "react";
import type { Profile } from "@/lib/types";

interface ProfileContextValue {
  profile: Profile;
  teamName: string | null;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({
  children,
  profile,
  teamName,
}: {
  children: React.ReactNode;
  profile: Profile;
  teamName: string | null;
}) {
  return (
    <ProfileContext.Provider value={{ profile, teamName }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return ctx;
}
