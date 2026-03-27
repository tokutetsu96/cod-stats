"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Settings, LogOut } from "lucide-react";

const links = [
  { href: "/", label: "ダッシュボード" },
  { href: "/matches", label: "対戦一覧" },
  { href: "/matches/new", label: "対戦登録" },
  { href: "/opponents", label: "対戦相手" },
  { href: "/players", label: "プレイヤー" },
];

interface NavProps {
  teamName?: string;
  username?: string;
  avatar?: string | null;
}

export function Nav({ teamName, username, avatar }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isUrl = avatar?.startsWith("http");
  const fallback = username?.[0]?.toUpperCase() ?? "?";

  return (
    <nav className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="font-bold text-lg shrink-0">
          CoD Stats
        </Link>
        {teamName && (
          <span className="text-xs text-muted-foreground border rounded px-2 py-0.5 shrink-0">
            {teamName}
          </span>
        )}
        <div className="flex gap-4 overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm transition-colors hover:text-foreground whitespace-nowrap",
                pathname === link.href
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto shrink-0 relative" ref={menuRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 hover:bg-primary/25 transition-colors text-sm font-medium overflow-hidden"
            aria-label="メニューを開く"
          >
            {isUrl ? (
              <img src={avatar!} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{fallback}</span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-card border rounded-md shadow-lg z-50 py-1">
              {username && (
                <div className="px-3 py-2 border-b mb-1">
                  <p className="text-xs font-medium truncate">{username}</p>
                </div>
              )}
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Settings className="h-4 w-4" />
                設定
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
