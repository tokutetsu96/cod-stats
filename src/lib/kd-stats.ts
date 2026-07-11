import { calcKD } from "@/lib/utils";
import type { GameMode } from "@/lib/types";
import type {
  PlayerKDData,
  PlayerModeStats,
} from "@/components/player-kd-tabs";

// メンバー別K/D集計の共有ロジック。
// ダッシュボード（RPC集計行）と試合詳細（生スタッツ行）の両方から
// StatContribution に正規化して加算し、PlayerKDData を生成する。

export type ModeAcc = {
  kills: number;
  deaths: number;
  damage: number;
  count: number;
  hillTime: number;
  plants: number;
  defuses: number;
  firstBloods: number;
  firstDeaths: number;
  goals: number;
};

export const emptyModeAcc = (): ModeAcc => ({
  kills: 0,
  deaths: 0,
  damage: 0,
  count: 0,
  hillTime: 0,
  plants: 0,
  defuses: 0,
  firstBloods: 0,
  firstDeaths: 0,
  goals: 0,
});

export interface StatContribution {
  kills: number;
  deaths: number;
  damage: number;
  /** 加算するゲーム数（生スタッツ行なら1、RPC集計行なら games_count） */
  count: number;
  hillTime?: number;
  plants?: number;
  defuses?: number;
  firstBloods?: number;
  firstDeaths?: number;
  goals?: number;
}

export interface PlayerAcc {
  id: string;
  name: string;
  kills: number;
  deaths: number;
  damage: number;
  count: number;
  modes: Record<GameMode, ModeAcc>;
}

export const emptyPlayerAcc = (id: string, name: string): PlayerAcc => ({
  id,
  name,
  kills: 0,
  deaths: 0,
  damage: 0,
  count: 0,
  modes: {
    hardpoint: emptyModeAcc(),
    snd: emptyModeAcc(),
    overload: emptyModeAcc(),
  },
});

export function addStat(
  map: Map<string, PlayerAcc>,
  playerId: string,
  playerName: string,
  mode: string,
  stat: StatContribution,
) {
  let p = map.get(playerId);
  if (!p) {
    p = emptyPlayerAcc(playerId, playerName);
    map.set(playerId, p);
  }
  p.kills += stat.kills;
  p.deaths += stat.deaths;
  p.damage += stat.damage;
  p.count += stat.count;
  const m = p.modes[mode as GameMode];
  if (m) {
    m.kills += stat.kills;
    m.deaths += stat.deaths;
    m.damage += stat.damage;
    m.count += stat.count;
    m.hillTime += stat.hillTime ?? 0;
    m.plants += stat.plants ?? 0;
    m.defuses += stat.defuses ?? 0;
    m.firstBloods += stat.firstBloods ?? 0;
    m.firstDeaths += stat.firstDeaths ?? 0;
    m.goals += stat.goals ?? 0;
  }
}

export function avg(total: number, count: number) {
  return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
}

export function toModeStats(m: ModeAcc): PlayerModeStats {
  const c = m.count;
  return {
    avgKills: avg(m.kills, c),
    avgDeaths: avg(m.deaths, c),
    avgDamage: avg(m.damage, c),
    count: c,
    kd: c > 0 ? calcKD(m.kills, m.deaths) : "-",
    avgHillTime: c > 0 ? avg(m.hillTime, c) : null,
    avgPlants: c > 0 ? avg(m.plants, c) : null,
    avgDefuses: c > 0 ? avg(m.defuses, c) : null,
    avgFirstBloods: c > 0 ? avg(m.firstBloods, c) : null,
    avgFirstDeaths: c > 0 ? avg(m.firstDeaths, c) : null,
    avgGoals: c > 0 ? avg(m.goals, c) : null,
  };
}

export function toPlayerKDData(p: PlayerAcc): PlayerKDData {
  const c = p.count;
  return {
    id: p.id,
    name: p.name,
    overall: {
      avgKills: avg(p.kills, c),
      avgDeaths: avg(p.deaths, c),
      avgDamage: avg(p.damage, c),
      count: c,
      kd: c > 0 ? calcKD(p.kills, p.deaths) : "-",
      avgHillTime: null,
      avgPlants: null,
      avgDefuses: null,
      avgFirstBloods: null,
      avgFirstDeaths: null,
      avgGoals: null,
    },
    hardpoint: toModeStats(p.modes.hardpoint),
    snd: toModeStats(p.modes.snd),
    overload: toModeStats(p.modes.overload),
  };
}
