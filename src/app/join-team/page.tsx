import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamJoinForm } from "@/components/team-join-form";
import { LogoutButton } from "./_components/logout-button";

// 所属チームが無いユーザー（脱退・除外で最後のチームを失った場合など）の着地ページ
export default async function JoinTeamPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");

  const [{ data: profile }, { data: currentTeamId }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", data.claims.sub).single(),
    supabase.rpc("get_my_team_id"),
  ]);
  if (!profile) redirect("/login");
  // 有効な選択中チームがあるならダッシュボードへ
  if (currentTeamId) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-baseline gap-2 mb-2 font-display">
            <span className="text-3xl font-bold tracking-widest text-primary">COD</span>
            <span className="text-lg font-medium text-muted-foreground tracking-wider">STATS</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {profile.username} さんは現在どのチームにも所属していません
          </p>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-lg space-y-5">
          <TeamJoinForm />
          <div className="pt-4 border-t border-border">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
