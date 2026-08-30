import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { runBirthday } from "./birthday";
import { runCampaigns } from "./campaigns";
import { runRebooking } from "./rebooking";
import { runReminders } from "./reminders";
import { runThanks } from "./thanks";
import type { KindCounts } from "./types";
import { emptyCounts, mergeCounts } from "./types";

export type AutomationSummary = {
  ranAt: string;
  storeCount: number;
  results: {
    reminder: KindCounts;
    thanks: KindCounts;
    rebooking: KindCounts;
    birthday: KindCounts;
    campaign: KindCounts;
  };
  errors: string[];
};

/** 実行対象の指定 */
export type RunOptions = {
  /** 指定した場合はその店舗のみを対象にする。未指定なら全店舗。 */
  storeId?: string;
  now?: Date;
};

/**
 * 実行の重複を防ぐ調停役を作る。runAutomations は次の3経路から起動されうる:
 *   - instrumentation の setInterval（アプリ内スケジューラ・全店舗）
 *   - GET /api/cron/run（外部cron・全店舗）
 *   - POST /api/automations/run（管理画面の「今すぐ実行」・自店舗のみ）
 * 同じ店舗を同時に処理すると、送信済み判定を両方が通過してお客様へ二重にメッセージが届く。
 *
 * そこで排他は「実行単位ごと」に持つ:
 *   - 実行中のPromiseを共有するのは「同じ店舗への要求」だけにする。
 *     他店舗や全店舗の実行結果をそのまま返すと、管理画面に他店舗を含む件数や
 *     店舗名（errors）が表示され、かつ自店舗の配信が実行されないまま完了してしまう。
 *   - 全店舗実行は対象にその店舗を含むため、単一店舗実行とは重ならないよう順番待ちにする。
 *   - 対象が重ならない別々の店舗どうしは、待たせずに並行して実行してよい。
 *
 * 注: 複数インスタンス構成ではプロセスをまたげないため、外部cronは
 * 単一インスタンスに向けるか、DBロックへの置き換えが必要（docs/DEPLOY.md 参照）。
 */
export function createRunCoordinator<T>(
  run: (opts?: RunOptions) => Promise<T>
): (opts?: RunOptions) => Promise<T> {
  /** 実行中の単一店舗実行（storeId → 実行中のPromise） */
  const storeRuns = new Map<string, Promise<T>>();
  /** 実行中の全店舗実行 */
  let allStoresRun: Promise<T> | null = null;

  /** 順番待ち用。先行実行の成否は引き継がず、完了だけを待つ */
  const waitFor = (p: Promise<unknown>): Promise<void> =>
    p.then(
      () => undefined,
      () => undefined
    );

  return (opts?: RunOptions): Promise<T> => {
    const storeId = opts?.storeId;

    if (storeId) {
      // 実行中の同一店舗の要求とだけ結果を共有する（自店舗の結果なので安全）
      const sameStore = storeRuns.get(storeId);
      if (sameStore) return sameStore;

      // 実行中の全店舗実行にはこの店舗も含まれるため、終わってから開始する
      const blocker = allStoresRun;
      const started = (async () => {
        if (blocker) await waitFor(blocker);
        return run(opts);
      })();
      const current: Promise<T> = started.finally(() => {
        if (storeRuns.get(storeId) === current) storeRuns.delete(storeId);
      });
      storeRuns.set(storeId, current);
      return current;
    }

    if (allStoresRun) return allStoresRun;

    // 実行中の単一店舗実行と重ならないよう、すべての完了を待ってから開始する
    const blockers = [...storeRuns.values()];
    const started = (async () => {
      await Promise.all(blockers.map(waitFor));
      return run(opts);
    })();
    const current: Promise<T> = started.finally(() => {
      if (allStoresRun === current) allStoresRun = null;
    });
    allStoresRun = current;
    return current;
  };
}

const coordinator = createRunCoordinator<AutomationSummary>((opts) => doRunAutomations(opts));

/**
 * 自動配信エンジン本体。
 * 全店舗（storeId指定時はその店舗のみ）について、
 * リマインダー / 来店お礼 / 再来店リマインド / 誕生日 / キャンペーン配信 を実行する。
 * 冪等: 送信済み判定はMessageLogに基づくため、何度実行しても重複送信しない。
 * 返す結果は必ず「この呼び出しの対象店舗」のもので、他店舗の件数・店舗名は含まない。
 */
export function runAutomations(opts?: RunOptions): Promise<AutomationSummary> {
  return coordinator(opts);
}

async function doRunAutomations(opts?: RunOptions): Promise<AutomationSummary> {
  const now = opts?.now ?? new Date();
  const summary: AutomationSummary = {
    ranAt: now.toISOString(),
    storeCount: 0,
    results: {
      reminder: emptyCounts(),
      thanks: emptyCounts(),
      rebooking: emptyCounts(),
      birthday: emptyCounts(),
      campaign: emptyCounts(),
    },
    errors: [],
  };

  const stores = await prisma.store.findMany({
    where: opts?.storeId ? { id: opts.storeId } : undefined,
  });
  summary.storeCount = stores.length;

  for (const store of stores) {
    try {
      summary.results.reminder = mergeCounts(summary.results.reminder, await runReminders(store, now));
      summary.results.thanks = mergeCounts(summary.results.thanks, await runThanks(store, now));
      summary.results.rebooking = mergeCounts(summary.results.rebooking, await runRebooking(store, now));
      summary.results.birthday = mergeCounts(summary.results.birthday, await runBirthday(store, now));
      summary.results.campaign = mergeCounts(summary.results.campaign, await runCampaigns(store, now));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      summary.errors.push(`店舗 ${store.name}: ${message}`);
      console.error(`[automation] 店舗「${store.name}」の自動配信でエラー:`, e);

      // 店舗スタッフ向けの通知（無人実行のため、失敗に気付けるようにする）。
      //
      // 配信エンジンは毎分実行されるため、恒久的な障害（DB接続不可など）が起きると
      // 同じ通知が毎分積み上がって通知センターが埋まってしまう。
      // 直近1時間に同種の未読通知があれば新規作成しない。
      const recentFailure = await prisma.notification.findFirst({
        where: {
          storeId: store.id,
          type: "AUTOMATION_FAILED",
          createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
        },
        select: { id: true },
      });
      if (!recentFailure) {
        // notify() は内部で例外を握りつぶすため、他店舗の処理を妨げることはない
        await notify({
          storeId: store.id,
          type: "AUTOMATION_FAILED",
          title: "自動配信のエラー",
          body: `自動配信の処理中にエラーが発生しました。${message}`,
          link: "/dashboard/automations",
        });
      }
    }
  }
  return summary;
}
