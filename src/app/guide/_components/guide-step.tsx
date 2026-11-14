import Image, { type StaticImageData } from "next/image";

interface GuideStepProps {
  /** 目次のアンカーに使う id */
  id: string;
  number: number;
  title: string;
  /** このステップが何のためにあるかの説明 */
  lead: React.ReactNode;
  children: React.ReactNode;
}

/** 使い方ページの1ステップ（番号付き見出し + 説明 + 本文） */
export function GuideStep({ id, number, title, lead, children }: GuideStepProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="stat-number text-3xl font-bold text-primary" aria-hidden="true">
          {String(number).padStart(2, "0")}
        </span>
        <h2 id={`${id}-title`} className="text-lg sm:text-xl font-bold">
          {title}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{lead}</p>
      {children}
    </section>
  );
}

/**
 * 実画面のスクリーンショット。静的 import した画像を渡す（幅・高さは自動で入る）。
 * スマホ幅では細部が読めないため、押すと原寸の画像を別タブで開く。
 */
export function GuideShot({ src, alt }: { src: StaticImageData; alt: string }) {
  return (
    <a href={src.src} target="_blank" rel="noopener noreferrer" className="block" title="原寸で開く">
      <Image
        src={src}
        alt={alt}
        placeholder="blur"
        sizes="(min-width: 768px) 720px, 100vw"
        className="w-full h-auto rounded-lg border"
      />
    </a>
  );
}

/** 番号付きの操作手順 */
export function GuideActions({ children }: { children: React.ReactNode }) {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed marker:text-muted-foreground">
      {children}
    </ol>
  );
}

/** 手順の補足（つまずきやすい点） */
export function GuideNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground leading-relaxed">
      {children}
    </p>
  );
}

/** 画面上のボタン・項目名 */
export function Ui({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">「{children}」</span>;
}
