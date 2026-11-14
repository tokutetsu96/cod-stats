"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { modeShortLabel } from "@/lib/constants";
import type { GameMode } from "@/lib/types";
import type { PlayerKDData } from "@/lib/kd-stats";
import { Table, Th, Td } from "@/components/ui/table";

type ModeTab = "overall" | GameMode;

function kdColor(kd: string) {
  const v = parseFloat(kd);
  if (isNaN(v)) return undefined;
  return v >= 1.0 ? "var(--win)" : "var(--loss)";
}

export function PlayerKDTabs({
  players,
  modes,
  playerLinkPrefix,
}: {
  players: PlayerKDData[];
  /** 表示するモードタブ（作品のモード一覧） */
  modes: GameMode[];
  playerLinkPrefix?: string;
}) {
  const [activeTab, setActiveTab] = useState<ModeTab>("overall");
  const tabs: { key: ModeTab; label: string }[] = [
    { key: "overall", label: "総合" },
    ...modes.map((m) => ({ key: m, label: modeShortLabel[m] })),
  ];

  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      const aKD = parseFloat(a[activeTab].kd) || 0;
      const bKD = parseFloat(b[activeTab].kd) || 0;
      return bKD - aKD;
    });
  }, [players, activeTab]);

  const renderName = (p: PlayerKDData) =>
    playerLinkPrefix ? (
      <Link href={`${playerLinkPrefix}${p.id}`} className="link font-medium">
        {p.name}
      </Link>
    ) : (
      <span className="font-medium">{p.name}</span>
    );

  const stats = (p: PlayerKDData) => p[activeTab];

  return (
    <div>
      {/* Tab bar */}
      <div role="tablist" aria-label="モード" className="flex gap-1 mb-4 overflow-x-auto p-0.5 -m-0.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activeTab === t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
              activeTab === t.key
                ? "bg-accent text-foreground"
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
                  <span className="stat-number">{s.avgKills}K</span>
                  <span className="stat-number">{s.avgDeaths}D</span>
                  <span className="stat-number">{s.avgDamage}Dmg</span>
                  {activeTab === "hardpoint" && s.avgHillTime !== null && (
                    <span className="stat-number">{s.avgHillTime}s</span>
                  )}
                  {activeTab === "snd" && (
                    <>
                      <span className="stat-number">{s.avgPlants ?? 0}P</span>
                      <span className="stat-number">{s.avgFirstBloods ?? 0}FB</span>
                    </>
                  )}
                  {activeTab === "overload" && (
                    <span className="stat-number">{s.avgGoals ?? 0}G</span>
                  )}
                  {activeTab === "hijack" && (
                    <>
                      <span className="stat-number">{s.avgUploads ?? 0}UP</span>
                      <span className="stat-number">{s.avgPlants ?? 0}P</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="overflow-x-auto hidden sm:block">
        <Table>
          <thead>
            <tr className="border-b text-left">
              <Th>プレイヤー</Th>
              <Th numeric>KD</Th>
              <Th numeric>Avg K</Th>
              <Th numeric>Avg D</Th>
              <Th numeric>Avg Dmg</Th>
              {activeTab === "hardpoint" && (
                <Th numeric>Avg Hill</Th>
              )}
              {activeTab === "snd" && (
                <>
                  <Th numeric>P</Th>
                  <Th numeric>Def</Th>
                  <Th numeric>FB</Th>
                  <Th numeric>FD</Th>
                </>
              )}
              {activeTab === "overload" && (
                <Th numeric>Goals</Th>
              )}
              {activeTab === "hijack" && (
                <>
                  <Th numeric>アップロード</Th>
                  <Th numeric>設置</Th>
                  <Th numeric>ダンク</Th>
                  <Th numeric>リモート設置</Th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const s = stats(p);
              const noData = s.count === 0 && activeTab !== "overall";
              return (
                <tr key={p.id} className="border-b border-border/50">
                  <Td>{renderName(p)}</Td>
                  <Td numeric>
                    <span className="stat-number text-base font-semibold" style={{ color: noData ? undefined : kdColor(s.kd) }}>
                      {noData ? "-" : s.kd}
                    </span>
                  </Td>
                  <Td numeric>{noData ? "-" : s.avgKills}</Td>
                  <Td numeric>{noData ? "-" : s.avgDeaths}</Td>
                  <Td numeric>{noData ? "-" : s.avgDamage}</Td>
                  {activeTab === "hardpoint" && (
                    <Td numeric>{noData ? "-" : `${s.avgHillTime ?? 0}s`}</Td>
                  )}
                  {activeTab === "snd" && (
                    <>
                      <Td numeric>{noData ? "-" : s.avgPlants ?? 0}</Td>
                      <Td numeric>{noData ? "-" : s.avgDefuses ?? 0}</Td>
                      <Td numeric>{noData ? "-" : s.avgFirstBloods ?? 0}</Td>
                      <Td numeric>{noData ? "-" : s.avgFirstDeaths ?? 0}</Td>
                    </>
                  )}
                  {activeTab === "overload" && (
                    <Td numeric>{noData ? "-" : s.avgGoals ?? 0}</Td>
                  )}
                  {activeTab === "hijack" && (
                    <>
                      <Td numeric>{noData ? "-" : s.avgUploads ?? 0}</Td>
                      <Td numeric>{noData ? "-" : s.avgPlants ?? 0}</Td>
                      <Td numeric>{noData ? "-" : s.avgDunks ?? 0}</Td>
                      <Td numeric>{noData ? "-" : s.avgRemotePlants ?? 0}</Td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
