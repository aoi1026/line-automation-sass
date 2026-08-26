"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Circle, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** 「あとで」を押した状態を覚えておくためのキー */
const DISMISS_KEY = "repinavi.onboarding.dismissed";

export type OnboardingStep = {
  /** 項目の識別子 */
  key: string;
  title: string;
  /** 未完了のときだけ表示する補足説明 */
  description: string;
  href: string;
  actionLabel: string;
  done: boolean;
};

export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  // localStorage を読む前は描画しない（非表示にしたカードが一瞬見えてしまうのを防ぐ）
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const total = steps.length;
  const doneCount = steps.filter((step) => step.done).length;
  const remaining = total - doneCount;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const hide = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // localStorage が使えない環境では、この画面を開いている間だけ非表示にする
    }
    setDismissed(true);
  };

  // すべて完了していれば自動的に消える（「あとで」より優先）
  if (total === 0 || remaining === 0) return null;
  if (dismissed !== false) return null;

  return (
    <Card className="border-brand/30 bg-brand/5">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Rocket aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>セットアップガイド</CardTitle>
            <CardDescription className="mt-1">
              はじめに済ませておきたい設定です。あと{remaining}項目で完了します。
            </CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={hide} className="shrink-0 text-gray-500">
          あとで
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* 進捗バー */}
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-gray-600">設定の進み具合</span>
            <span className="font-semibold tabular-nums text-brand-dark">
              {doneCount} / {total} 件完了
            </span>
          </div>
          <div
            className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-label="セットアップの進み具合"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={doneCount}
          >
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* チェック項目 */}
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {steps.map((step) => (
            <li key={step.key} className="flex items-center gap-3 px-4 py-3">
              {step.done ? (
                <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <Circle aria-hidden="true" className="h-5 w-5 shrink-0 text-gray-300" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.done ? "text-gray-400" : "text-gray-900"
                  )}
                >
                  {step.title}
                </p>
                {!step.done && (
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                    {step.description}
                  </p>
                )}
              </div>
              {step.done ? (
                <span className="shrink-0 text-xs font-medium text-gray-400">完了</span>
              ) : (
                <Link
                  href={step.href}
                  aria-label={`${step.title}（${step.actionLabel}）`}
                  className={cn(
                    buttonVariants({ size: "sm", variant: "outline" }),
                    "shrink-0"
                  )}
                >
                  {step.actionLabel}
                </Link>
              )}
            </li>
          ))}
        </ul>

        <Link
          href="/dashboard/setup"
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-brand-dark hover:underline"
        >
          <BookOpen aria-hidden="true" className="h-4 w-4" />
          詳しいセットアップガイド
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
