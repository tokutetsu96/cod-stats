"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Settings, LogOut, ChevronDown } from "lucide-react";
import { switchTitle } from "@/app/(authenticated)/_actions/switch-title";

const links = [
  { href: "/", label: "ダッシュボード", adminOnly: false },
  { href: "/matches", label: "対戦一覧", adminOnly: false },
  { href: "/matches/new", label: "対戦登録", adminOnly: true },
  { href: "/opponents", label: "対戦相手", adminOnly: false },
  { href: "/players", label: "プレイヤー", adminOnly: false },
];

import type { UserRole, Title } from "@/lib/types";

interface NavProps {
  teamName?: string;
  username?: string;
  avatar?: string | null;
  role?: UserRole;
  titles?: Title[];
  currentTitleId?: string;
}

export function Nav({ teamName, username, avatar, role, titles, currentTitleId }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const [isSwitching, startSwitching] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const titleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (titleMenuRef.current && !titleMenuRef.current.contains(e.target as Node)) {
        setTitleOpen(false);
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

  const handleSwitchTitle = (titleId: string) => {
    setTitleOpen(false);
    if (titleId === currentTitleId) return;
    startSwitching(async () => {
      await switchTitle(titleId);
      router.refresh();
    });
  };

  const currentTitle = titles?.find((t) => t.id === currentTitleId);
  const isUrl = avatar?.startsWith("http");
  const fallback = username?.[0]?.toUpperCase() ?? "?";

  return (
    <nav className="border-b bg-card sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-6xl items-stretch px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-1.5 shrink-0 mr-6"
          style={{ fontFamily: "var(--font-barlow-condensed), sans-serif" }}
        >
          <span className="text-xl font-bold tracking-widest text-primary">COD</span>
          <span className="text-sm font-medium text-muted-foreground tracking-wider">STATS</span>
        </Link>

        {/* Team badge */}
        {teamName && (
          <div className="hidden md:flex items-center mr-4">
            <span className="text-sm font-semibold tracking-wide text-primary shrink-0">
              {teamName}
            </span>
          </div>
        )}

        {/* Title (作品) switcher */}
        {titles && titles.length > 0 && (
          <div className="flex items-center mr-4 relative shrink-0" ref={titleMenuRef}>
            <button
              onClick={() => setTitleOpen(!titleOpen)}
              disabled={isSwitching}
              className={cn(
                "flex items-center gap-1 h-8 px-2 rounded-md transition-colors text-xs sm:text-sm max-w-[8rem] sm:max-w-none",
                "hover:bg-accent text-muted-foreground hover:text-foreground",
                titleOpen && "bg-accent text-foreground"
              )}
              aria-label="作品を切り替える"
            >
              <span className="truncate">{currentTitle?.name ?? "作品未設定"}</span>
              <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", titleOpen && "rotate-180")} />
            </button>

            {titleOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-popover border rounded-md shadow-xl z-50 py-1 overflow-hidden">
                {titles.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSwitchTitle(t.id)}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left",
                      t.id === currentTitleId && "text-primary font-medium"
                    )}
                  >
                    <span className="truncate">{t.name}</span>
                    {t.is_default && <span className="text-xs text-muted-foreground ml-2 shrink-0">既定</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nav links */}
        <div className="flex gap-1 overflow-x-auto flex-1">
          {links.filter((link) => !link.adminOnly || role === "admin").map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-xs sm:text-sm whitespace-nowrap flex items-center px-2 sm:px-3 relative transition-colors",
                  "border-b-2",
                  isActive
                    ? "text-foreground font-medium border-primary"
                    : "text-muted-foreground hover:text-foreground border-transparent"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* User menu */}
        <div className="flex items-center ml-auto shrink-0 relative" ref={menuRef}>
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              "flex items-center gap-1.5 h-8 px-2 rounded-md transition-colors text-sm",
              "hover:bg-accent text-muted-foreground hover:text-foreground",
              open && "bg-accent text-foreground"
            )}
            aria-label="メニューを開く"
          >
            <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-xs font-medium overflow-hidden shrink-0">
              {isUrl ? (
                <Image src={avatar!} alt="avatar" fill sizes="24px" className="object-cover" />
              ) : (
                <span className="text-primary">{fallback}</span>
              )}
            </div>
            {username && (
              <span className="hidden sm:block text-xs max-w-[100px] truncate">{username}</span>
            )}
            <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-popover border rounded-md shadow-xl z-50 py-1 overflow-hidden">
              {username && (
                <div className="px-3 py-2 border-b mb-1">
                  <p className="text-xs font-medium truncate text-muted-foreground">{username}</p>
                </div>
              )}
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                設定
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors w-full text-left text-destructive-foreground hover:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
