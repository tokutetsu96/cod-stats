"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [joinExisting, setJoinExisting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError("アカウント作成後のログインに失敗しました: " + signInError.message);
          setLoading(false);
          return;
        }
      }

      let resolvedTeamId: string;

      if (joinExisting && teamId.trim()) {
        resolvedTeamId = teamId.trim();
      } else {
        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .insert({ name: teamName.trim() })
          .select("id")
          .single();
        if (teamError) {
          setError("チーム作成に失敗しました: " + teamError.message);
          setLoading(false);
          return;
        }
        resolvedTeamId = teamData.id;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user!.id,
        username: username.trim(),
        team_id: resolvedTeamId,
      });
      if (profileError) {
        setError("プロフィール作成に失敗しました: " + profileError.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-baseline gap-2 mb-2"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            <span className="text-3xl font-bold tracking-widest text-primary">COD</span>
            <span className="text-lg font-medium text-muted-foreground tracking-wider">STATS</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "アカウントを作成して始める" : "チームの戦績を管理する"}
          </p>
        </div>

        {/* Form card */}
        <div className="bg-card border rounded-xl p-6 shadow-lg">
          {/* Mode toggle */}
          <div className="flex rounded-lg bg-muted p-1 mb-5">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(""); }}
              className={`flex-1 text-sm py-1.5 rounded-md transition-all font-medium ${
                !isSignUp ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(""); }}
              className={`flex-1 text-sm py-1.5 rounded-md transition-all font-medium ${
                isSignUp ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              新規登録
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    ユーザー名
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="gamertag"
                  />
                </div>

                {/* Team section */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    チーム
                  </Label>
                  <div className="flex rounded-lg bg-muted p-0.5 gap-0.5">
                    <button
                      type="button"
                      onClick={() => setJoinExisting(false)}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all ${
                        !joinExisting ? "bg-card shadow text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      新規作成
                    </button>
                    <button
                      type="button"
                      onClick={() => setJoinExisting(true)}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all ${
                        joinExisting ? "bg-card shadow text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      既存に参加
                    </button>
                  </div>
                  {joinExisting ? (
                    <Input
                      id="teamId"
                      value={teamId}
                      onChange={(e) => setTeamId(e.target.value)}
                      placeholder="チームID"
                      required
                    />
                  ) : (
                    <Input
                      id="teamName"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="チーム名"
                      required
                    />
                  )}
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                メールアドレス
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                パスワード
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "処理中..." : isSignUp ? "アカウント作成" : "ログイン"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
