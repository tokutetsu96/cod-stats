import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { GuideActions, GuideNote, GuideShot, GuideStep, Ui } from "./_components/guide-step";
// スクリーンショットは `npm run guide:capture`（scripts/capture-guide.mjs）で撮り直す
import signupShot from "./_images/01-signup.png";
import playersShot from "./_images/02-players.png";
import mapsShot from "./_images/03-maps.png";
import opponentsShot from "./_images/04-opponents.png";
import matchInfoShot from "./_images/05-match-info.png";
import matchGameShot from "./_images/06-match-game.png";
import matchSubmitShot from "./_images/07-match-submit.png";
import matchListShot from "./_images/08-match-list.png";
import matchDetailShot from "./_images/09-match-detail.png";
import dashboardShot from "./_images/10-dashboard.png";

export const metadata: Metadata = {
  title: "使い方 | CoD Stats Dashboard",
  description: "アカウント作成から最初の対戦登録までの手順",
};

const steps = [
  { id: "signup", title: "アカウントとチームを作る" },
  { id: "players", title: "自チームのプレイヤーを登録する" },
  { id: "maps", title: "マップを登録する" },
  { id: "opponents", title: "対戦相手を登録する" },
  { id: "match", title: "対戦を登録する" },
  { id: "result", title: "結果を確認する" },
] as const;

const stepProps = (id: (typeof steps)[number]["id"]) => {
  const index = steps.findIndex((s) => s.id === id);
  return { id, number: index + 1, title: steps[index].title };
};

// 未ログインでも閲覧できる静的ページ（認証情報・Supabase は読まない）
export default function GuidePage() {
  return (
    <>
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-1.5 font-display">
            <span className="text-xl font-bold tracking-widest text-primary">COD</span>
            <span className="text-sm font-medium text-muted-foreground tracking-wider">STATS</span>
          </Link>
          <Link href="/" className={buttonVariants({ size: "sm" })}>
            アプリを開く
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-12">
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold">使い方</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            アカウントを作ってから最初の対戦を登録するまでの手順です。対戦を登録するには、先に自チームのプレイヤー・マップ・対戦相手を登録しておく必要があります。上から順に進めてください。
          </p>
          <nav aria-label="目次" className="rounded-lg border bg-card p-4">
            <ol className="space-y-1.5 text-sm">
              {steps.map((step, i) => (
                <li key={step.id} className="flex items-baseline gap-3">
                  <span className="stat-number w-5 text-muted-foreground" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <a href={`#${step.id}`} className="link">
                    {step.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <GuideNote>
            プレイヤー・マップ・対戦相手・対戦の登録や編集ができるのはチームの<span className="font-medium text-foreground">管理者</span>だけです。チームを作成した人が管理者になります。招待コードで参加したメンバーは、戦績の閲覧と対戦へのメモ投稿ができます。
          </GuideNote>
        </div>

        <GuideStep
          {...stepProps("signup")}
          lead="戦績はチーム単位で管理します。最初にアカウントと自分のチームを同時に作ります。"
        >
          <GuideShot src={signupShot} alt="ログイン画面の新規登録タブ。ユーザー名・チーム名・メールアドレス・パスワードを入力している" />
          <GuideActions>
            <li>ログイン画面で <Ui>新規登録</Ui> タブを選びます。</li>
            <li><Ui>ユーザー名</Ui> を入力します（チーム内で表示される名前です）。</li>
            <li><Ui>チーム</Ui> で <Ui>新規作成</Ui> を選び、チーム名を入力します。</li>
            <li>メールアドレスとパスワード（6文字以上）を入力し、<Ui>アカウント作成</Ui> を押します。</li>
          </GuideActions>
          <GuideNote>
            すでにあるチームに参加する場合は、<Ui>チーム</Ui> で <Ui>既存に参加</Ui> を選び、管理者から受け取った招待コードを入力します。この場合、以降の登録作業は不要です。
          </GuideNote>
        </GuideStep>

        <GuideStep
          {...stepProps("players")}
          lead="個人スタッツを記録する自チームの選手を登録します。ここで登録した名前が、対戦登録のスタッツ入力欄で選べるようになります。"
        >
          <GuideShot src={playersShot} alt="プレイヤー管理画面。名前の入力欄と追加ボタン、登録済みプレイヤーの一覧" />
          <GuideActions>
            <li>ヘッダーの <Ui>プレイヤー</Ui> を開きます。</li>
            <li>プレイヤー名を入力して <Ui>追加</Ui> を押します。人数分くり返します。</li>
            <li>いつも出場する選手は ★ を押して <Ui>デフォルト</Ui> にします（最大4人）。</li>
          </GuideActions>
          <GuideNote>
            デフォルトにした選手は、対戦登録でゲームを追加したときに最初からスタッツ欄に並びます。目のアイコンは、その選手をダッシュボードに表示するかどうかの切り替えです。
          </GuideNote>
        </GuideStep>

        <GuideStep
          {...stepProps("maps")}
          lead="対戦登録でゲームごとに選ぶマップを登録します。作ったばかりのチームにはマップが1つも入っていないので、使うマップを先に登録しておきます。"
        >
          <GuideShot src={mapsShot} alt="設定画面のマップ管理。モードのタブ、マップ名と地点数の入力欄、登録済みマップの一覧" />
          <GuideActions>
            <li>右上のユーザー名を押してメニューを開き、<Ui>設定</Ui> を選びます。</li>
            <li>ページ下部の <Ui>マップ管理</Ui> で、登録するモード（Hardpoint / S&amp;D など）のタブを選びます。</li>
            <li>マップ名を入力して <Ui>追加</Ui> を押します。Hardpoint は地点数も入力できます。</li>
          </GuideActions>
          <GuideNote>
            マップは作品ごと・モードごとに分かれています。ヘッダーで選択中の作品（画面の例では MW4）に登録されます。Hardpoint で地点数を入れておくと、対戦登録で地点別の Hill Time を記録できます。
          </GuideNote>
        </GuideStep>

        <GuideStep
          {...stepProps("opponents")}
          lead="対戦する相手チームと、その選手を登録します。相手の選手を登録しておくと、相手側の個人スタッツも記録できます。"
        >
          <GuideShot src={opponentsShot} alt="対戦相手管理画面。相手チームの行を展開して選手を登録している" />
          <GuideActions>
            <li>ヘッダーの <Ui>対戦相手</Ui> を開きます。</li>
            <li>チーム名を入力して <Ui>追加</Ui> を押します。</li>
            <li>追加したチームの行にある人数のアイコンを押して、選手一覧を開きます。</li>
            <li>選手名を入力して <Ui>追加</Ui> を押します。いつも出てくる選手は ★ でデフォルトにします（最大4人）。</li>
          </GuideActions>
        </GuideStep>

        <GuideStep
          {...stepProps("match")}
          lead="1回の対戦（シリーズ）と、その中の各ゲームの結果・個人スタッツを登録します。"
        >
          <GuideShot src={matchInfoShot} alt="対戦登録画面の対戦情報。タイプ・日付・対戦相手・YouTube URL・メモの入力欄" />
          <GuideActions>
            <li>ヘッダーの <Ui>対戦登録</Ui> を開きます。</li>
            <li><Ui>タイプ</Ui>（Scrim / 大会）と <Ui>日付</Ui>、<Ui>対戦相手</Ui> を選びます。YouTube URL とメモは必要なときだけ入力します。</li>
            <li><Ui>ゲームを追加</Ui> を押します（対戦相手を選ぶと押せるようになります）。</li>
          </GuideActions>

          <GuideShot src={matchGameShot} alt="ゲーム1の入力欄。モード・マップ・スコアと、自チーム・相手チームの個人スタッツ表" />
          <GuideActions>
            <li><Ui>モード</Ui> と <Ui>マップ</Ui> を選び、<Ui>自チーム</Ui> と <Ui>相手チーム</Ui> のスコアを入力します。</li>
            <li>スタッツ表に選手ごとのキル（K）・デス（D）・ダメージ（Dmg）と、モード固有の項目を入力します。</li>
            <li>2ゲーム目以降も <Ui>ゲームを追加</Ui> から同じように入力します。選手の並びは前のゲームから引き継がれます。</li>
          </GuideActions>
          <GuideNote>
            Hardpoint では、試合後のスコアボードのスクリーンショットを点線の枠にドロップ（または貼り付け）すると、スタッツを自動で入力できます。読み取り結果は登録前に確認してください。
          </GuideNote>

          <GuideShot src={matchSubmitShot} alt="対戦登録画面の下部。ゲームを追加ボタンと登録ボタン" />
          <GuideActions>
            <li>すべてのゲームを入力したら、ページ下部の <Ui>登録</Ui> を押します。対戦一覧に移動します。</li>
          </GuideActions>
        </GuideStep>

        <GuideStep
          {...stepProps("result")}
          lead="登録した対戦は対戦一覧に並び、ダッシュボードの勝率や選手ごとの K/D にも反映されます。"
        >
          <GuideShot src={matchListShot} alt="対戦一覧。登録した対戦の行と、詳細を開く目のアイコン" />
          <GuideActions>
            <li><Ui>対戦一覧</Ui> で、対戦の行にある目のアイコンを押すと詳細が開きます。鉛筆のアイコンから内容を修正できます。</li>
          </GuideActions>
          <GuideShot src={matchDetailShot} alt="対戦詳細。シリーズのスコア、ゲームごとの結果、メンバー別 K/D" />
          <GuideShot src={dashboardShot} alt="ダッシュボード。ゲーム勝率、モード別の勝率、メンバー別 K/D" />
          <GuideNote>
            ダッシュボードは、モード・期間・対戦チームで絞り込めます。
          </GuideNote>
        </GuideStep>

        <section aria-labelledby="next-title" className="space-y-3 border-t pt-8">
          <h2 id="next-title" className="text-lg font-bold">次にできること</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed marker:text-muted-foreground">
            <li>
              <span className="font-medium">メンバーを招待する</span>: <Ui>設定</Ui> の <Ui>チーム管理</Ui> で <Ui>招待コードを発行</Ui> を押し、コードをメンバーに伝えます。メンバーは新規登録の <Ui>既存に参加</Ui> にコードを入力します。
            </li>
            <li>
              <span className="font-medium">対戦にメモを残す</span>: 対戦詳細のメモ欄には、管理者以外のメンバーも書き込めます。
            </li>
            <li>
              <span className="font-medium">相手チームを分析する</span>: <Ui>対戦相手</Ui> でチーム名を押すと、相手選手ごとのスタッツを確認できます。
            </li>
          </ul>
          <Link href="/" className={buttonVariants()}>
            アプリを開く
          </Link>
        </section>
      </main>
    </>
  );
}
