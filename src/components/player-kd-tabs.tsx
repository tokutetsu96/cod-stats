"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface PlayerModeStats {
  kills: number;
  deaths: number;
  damage: number;
  kd: string;
  count: number;
  avgHillTime: number | null;
  totalPlants: number | null;
  totalDefuses: number | null;
  totalFirstBloods: number | null;
  totalFirstDeaths: number | null;
  totalGoals: number | null;
}

export interface PlayerKDData {
  id: string;
  name: string;
  overall: PlayerModeStats;
  hardpoint: PlayerModeStats;
  snd: PlayerModeStats;
  overload: PlayerModeStats;
}

type ModeTab = "overall" | "hardpoint" | "snd" | "overload";

const tabs: { key: ModeTab; label: string }[] = [
  { key: "overall", label: "総合" },
  { key: "hardpoint", label: "HP" },
  { key: "snd", label: "S&D" },
  { key: "overload", label: "OL" },
];

function kdColor(kd: string) {
  const v = parseFloat(kd);
  if (isNaN(v)) return undefined;
  return v >= 1.0 ? "var(--win)" : "var(--loss)";
}

export function PlayerKDTabs({
  players,
  playerLinkPrefix,
}: {
  players: PlayerKDData[];
  playerLinkPrefix?: string;
}) {
  const [activeTab, setActiveTab] = useState<ModeTab>("overall");

  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      const aKD = parseFloat(a[activeTab].kd) || 0;
      const bKD = parseFloat(b[activeTab].kd) || 0;
      return bKD - aKD;
    });
  }, [players, activeTab]);

  const renderName = (p: PlayerKDData) =>
    playerLinkPrefix ? (
      <Link href={`${playerLinkPrefix}${p.id}`} className="text-primary hover:underline font-medium">
        {p.name}
      </Link>
    ) : (
      <span className="font-medium">{p.name}</span>
    );

  const stats = (p: PlayerKDData) => p[activeTab];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium uppercase tracking-wider rounded-md transition-colors whitespace-nowrap",
              activeTab === t.key
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Mobile card layout */}
      <div className="space-y-1 sm:hidden">
        {sorted.map((p) => {
          const s = stats(p);
          if (s.count === 0 && activeTab !== "overall") {
            return (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50">
                {renderName(p)}
                <span className="text-sm text-muted-foreground">-</span>
              </div>
            );
          }
          return (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="min-w-0 mr-3">{renderName(p)}</div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="stat-number text-base font-semibold" style={{ color: kdColor(s.kd) }}>
                  {s.kd}
                </span>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="stat-number">{s.kills}K</span>
                  <span className="stat-number">{s.deaths}D</span>
                  <span className="stat-number">{s.damage}Dmg</span>
                  {activeTab === "hardpoint" && s.avgHillTime !== null && (
                    <span className="stat-number">{s.avgHillTime}s</span>
                  )}
                  {activeTab === "snd" && (
                    <>
                      <span className="stat-number">{s.totalPlants ?? 0}P</span>
                      <span className="stat-number">{s.totalFirstBloods ?? 0}FB</span>
                    </>
                  )}
                  {activeTab === "overload" && (
                    <span className="stat-number">{s.totalGoals ?? 0}G</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full text-sm data-table">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">プレイヤー</th>
              <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">KD</th>
              <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">K</th>
              <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">D</th>
              <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">Dmg</th>
              {activeTab === "hardpoint" && (
                <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">Avg Hill</th>
              )}
              {activeTab === "snd" && (
                <>
                  <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">P</th>
                  <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">Def</th>
                  <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">FB</th>
                  <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">FD</th>
                </>
              )}
              {activeTab === "overload" && (
                <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">Goals</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const s = stats(p);
              const noData = s.count === 0 && activeTab !== "overall";
              return (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2.5">{renderName(p)}</td>
                  <td className="py-2.5 text-center">
                    <span className="stat-number text-base font-semibold" style={{ color: noData ? undefined : kdColor(s.kd) }}>
                      {noData ? "-" : s.kd}
                    </span>
                  </td>
                  <td className="py-2.5 text-center stat-number">{noData ? "-" : s.kills}</td>
                  <td className="py-2.5 text-center stat-number">{noData ? "-" : s.deaths}</td>
                  <td className="py-2.5 text-center stat-number">{noData ? "-" : s.damage}</td>
                  {activeTab === "hardpoint" && (
                    <td className="py-2.5 text-center stat-number">{noData ? "-" : `${s.avgHillTime ?? 0}s`}</td>
                  )}
                  {activeTab === "snd" && (
                    <>
                      <td className="py-2.5 text-center stat-number">{noData ? "-" : s.totalPlants ?? 0}</td>
                      <td className="py-2.5 text-center stat-number">{noData ? "-" : s.totalDefuses ?? 0}</td>
                      <td className="py-2.5 text-center stat-number">{noData ? "-" : s.totalFirstBloods ?? 0}</td>
                      <td className="py-2.5 text-center stat-number">{noData ? "-" : s.totalFirstDeaths ?? 0}</td>
                    </>
                  )}
                  {activeTab === "overload" && (
                    <td className="py-2.5 text-center stat-number">{noData ? "-" : s.totalGoals ?? 0}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
