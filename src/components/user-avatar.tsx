import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * ユーザーのアバター。画像URLが無い場合は名前の頭文字を表示する。
 * size は px（Tailwind の動的クラスは生成されないため style で指定する）。
 */
export function UserAvatar({
  username,
  avatar,
  size = 32,
  className,
}: {
  username?: string | null;
  avatar?: string | null;
  size?: number;
  className?: string;
}) {
  const isUrl = avatar?.startsWith("http");
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full bg-primary/20 font-medium overflow-hidden shrink-0",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.45)) }}
      title={username ?? undefined}
    >
      {isUrl ? (
        <Image src={avatar!} alt={username ?? "avatar"} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span className="text-primary">{username?.[0]?.toUpperCase() ?? "?"}</span>
      )}
    </div>
  );
}
