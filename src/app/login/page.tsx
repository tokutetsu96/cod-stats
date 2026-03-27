"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

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
      // 1. Sign up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // セッションが返らない場合は自動ログインを試みる
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError("アカウント作成後のログインに失敗しました: " + signInError.message);
          setLoading(false);
          return;
        }
      }

      // 2. Create or join team
      let resolvedTeamId: string;

      if (joinExisting && teamId.trim()) {
        // 既存チームに参加
        resolvedTeamId = teamId.trim();
      } else {
        // 新規チーム作成
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

      // 3. Create profile
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
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
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">CoD Stats Dashboard</CardTitle>
          <CardDescription>
            {isSignUp ? "新規アカウント作成" : "ログイン"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">ユーザー名</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`text-sm px-3 py-1 rounded cursor-pointer ${!joinExisting ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                      onClick={() => setJoinExisting(false)}
                    >
                      新規チーム作成
                    </button>
                    <button
                      type="button"
                      className={`text-sm px-3 py-1 rounded cursor-pointer ${joinExisting ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                      onClick={() => setJoinExisting(true)}
                    >
                      既存チームに参加
                    </button>
                  </div>
                  {joinExisting ? (
                    <div className="space-y-2">
                      <Label htmlFor="teamId">チームID</Label>
                      <Input
                        id="teamId"
                        value={teamId}
                        onChange={(e) => setTeamId(e.target.value)}
                        placeholder="チームIDを入力"
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="teamName">チーム名</Label>
                      <Input
                        id="teamName"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="チーム名を入力"
                        required
                      />
                    </div>
                  )}
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "処理中..." : isSignUp ? "アカウント作成" : "ログイン"}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
            >
              {isSignUp
                ? "既にアカウントをお持ちの方はこちら"
                : "新規アカウント作成はこちら"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
