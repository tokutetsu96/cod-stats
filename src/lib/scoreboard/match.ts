// OCR で読み取った名前と登録済みプレイヤー名のあいまい照合（DOM 非依存）

export interface NameCandidate {
  id: string;
  name: string;
}

export interface NameMatch {
  id: string | null;
  score: number;
}

const ignorable = /[\s_\-.・･'"`|]/g;

export function normalizeName(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(ignorable, "");
}

/** サロゲートペアを考慮するためコードポイント配列で比較する */
function levenshtein(a: string[], b: string[]): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** 0〜1 の類似度。正規化後に一致すれば 1、片方を含めば 0.9 */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ca = [...na];
  const cb = [...nb];
  // 短い名前は他の名前に含まれやすいため、部分一致は 3 文字以上に限る
  if (Math.min(ca.length, cb.length) >= 3 && (na.includes(nb) || nb.includes(na))) return 0.9;
  return 1 - levenshtein(ca, cb) / Math.max(ca.length, cb.length);
}

/**
 * 類似度の高い組み合わせから貪欲に割り当てる（1 プレイヤーは 1 行まで）。
 * しきい値未満は未一致（id: null）。
 */
export function matchNames(
  ocrNames: string[],
  candidates: NameCandidate[],
  threshold = 0.5,
): NameMatch[] {
  const pairs: { row: number; cand: number; score: number }[] = [];
  ocrNames.forEach((name, row) => {
    candidates.forEach((c, cand) => {
      const score = nameSimilarity(name, c.name);
      if (score >= threshold) pairs.push({ row, cand, score });
    });
  });
  pairs.sort((a, b) => b.score - a.score);

  const result: NameMatch[] = ocrNames.map(() => ({ id: null, score: 0 }));
  const usedRows = new Set<number>();
  const usedCands = new Set<number>();
  for (const p of pairs) {
    if (usedRows.has(p.row) || usedCands.has(p.cand)) continue;
    usedRows.add(p.row);
    usedCands.add(p.cand);
    result[p.row] = { id: candidates[p.cand].id, score: p.score };
  }
  return result;
}

/** 名前の一致度合計。どちらのチームが自チームかの判定に使う */
export function teamAffinity(ocrNames: string[], candidates: NameCandidate[]): number {
  return matchNames(ocrNames, candidates).reduce((sum, m) => sum + m.score, 0);
}
