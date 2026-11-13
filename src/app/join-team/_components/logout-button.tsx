"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await createClient().auth.signOut();
    router.push("/login");
  };

  return (
    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleLogout}>
      <LogOut className="h-4 w-4 mr-2" />
      ログアウト
    </Button>
  );
}
