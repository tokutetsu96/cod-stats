// Supabase の接続情報。キーは publishable key（sb_publishable_...）を優先し、
// 未設定の環境では従来の anon key にフォールバックする（どちらもブラウザに公開してよいキー）。
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
