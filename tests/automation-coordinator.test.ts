import { describe, expect, it } from "vitest";
import { createRunCoordinator, type RunOptions } from "@/lib/automation/engine";

/** 手動で解決できる Promise（実行の重なりを再現するために使う） */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** マイクロタスクを消化して、待機中の処理を進める */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

type Started = { key: string; deferred: ReturnType<typeof deferred<string>> };

/** 呼び出しごとに保留し、テスト側から完了させられる実行関数 */
function createFakeRun() {
  const started: Started[] = [];
  const run = (opts?: RunOptions): Promise<string> => {
    const entry: Started = { key: opts?.storeId ?? "全店舗", deferred: deferred<string>() };
    started.push(entry);
    return entry.deferred.promise;
  };
  const finish = (key: string, value: string) => {
    const entry = started.find((s) => s.key === key);
    if (!entry) throw new Error(`未実行のキー: ${key}`);
    entry.deferred.resolve(value);
  };
  return { run, started, finish };
}

describe("自動配信の実行調停（createRunCoordinator）", () => {
  it("別店舗の実行が走っていても、自店舗の結果が返る", async () => {
    const fake = createFakeRun();
    const coordinate = createRunCoordinator(fake.run);

    const a = coordinate({ storeId: "store-a" });
    const b = coordinate({ storeId: "store-b" });
    await flush();

    // 店舗ごとに実行される（他店舗の実行中Promiseを共有しない）
    expect(fake.started.map((s) => s.key)).toEqual(["store-a", "store-b"]);

    fake.finish("store-a", "A店の結果");
    fake.finish("store-b", "B店の結果");
    await expect(a).resolves.toBe("A店の結果");
    await expect(b).resolves.toBe("B店の結果");
  });

  it("同じ店舗への同時要求は1回だけ実行し、結果を共有する", async () => {
    const fake = createFakeRun();
    const coordinate = createRunCoordinator(fake.run);

    const first = coordinate({ storeId: "store-a" });
    const second = coordinate({ storeId: "store-a" });
    await flush();

    expect(fake.started).toHaveLength(1);
    fake.finish("store-a", "A店の結果");
    await expect(first).resolves.toBe("A店の結果");
    await expect(second).resolves.toBe("A店の結果");
  });

  it("全店舗実行の最中に単一店舗を要求しても、全店舗実行の結果は返らない", async () => {
    const fake = createFakeRun();
    const coordinate = createRunCoordinator(fake.run);

    const all = coordinate();
    await flush();
    const single = coordinate({ storeId: "store-a" });
    await flush();

    // 全店舗実行と重ならないよう、単一店舗実行は順番待ちになる
    expect(fake.started.map((s) => s.key)).toEqual(["全店舗"]);

    fake.finish("全店舗", "全店舗の結果");
    await expect(all).resolves.toBe("全店舗の結果");
    await flush();

    expect(fake.started.map((s) => s.key)).toEqual(["全店舗", "store-a"]);
    fake.finish("store-a", "A店の結果");
    await expect(single).resolves.toBe("A店の結果");
  });

  it("全店舗実行は、実行中の単一店舗実行の完了を待ってから始まる", async () => {
    const fake = createFakeRun();
    const coordinate = createRunCoordinator(fake.run);

    const single = coordinate({ storeId: "store-a" });
    await flush();
    const all = coordinate();
    await flush();

    expect(fake.started.map((s) => s.key)).toEqual(["store-a"]);

    fake.finish("store-a", "A店の結果");
    await expect(single).resolves.toBe("A店の結果");
    await flush();

    expect(fake.started.map((s) => s.key)).toEqual(["store-a", "全店舗"]);
    fake.finish("全店舗", "全店舗の結果");
    await expect(all).resolves.toBe("全店舗の結果");
  });

  it("実行が失敗しても後続の実行は妨げられない", async () => {
    const fake = createFakeRun();
    const coordinate = createRunCoordinator(fake.run);

    const all = coordinate();
    await flush();
    const single = coordinate({ storeId: "store-a" });

    const failing = fake.started[0];
    failing.deferred.reject(new Error("実行に失敗しました"));
    await expect(all).rejects.toThrow("実行に失敗しました");
    await flush();

    expect(fake.started.map((s) => s.key)).toEqual(["全店舗", "store-a"]);
    fake.finish("store-a", "A店の結果");
    await expect(single).resolves.toBe("A店の結果");
  });

  it("完了後は同じ店舗でも新たに実行される", async () => {
    const fake = createFakeRun();
    const coordinate = createRunCoordinator(fake.run);

    const first = coordinate({ storeId: "store-a" });
    await flush();
    fake.finish("store-a", "1回目");
    await expect(first).resolves.toBe("1回目");
    await flush();

    const second = coordinate({ storeId: "store-a" });
    await flush();
    expect(fake.started).toHaveLength(2);
    fake.started[1].deferred.resolve("2回目");
    await expect(second).resolves.toBe("2回目");
  });
});
