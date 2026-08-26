import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Sparkles } from "lucide-react";
import { getSession } from "@/lib/session";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CAPABILITIES,
  FAQS,
  FEATURES,
  PROBLEMS,
  STEPS,
  TRUST_POINTS,
} from "./_components/landing-content";
import { HeroChatMock } from "./_components/hero-chat-mock";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";

export const metadata: Metadata = {
  title: { absolute: `${APP_NAME}｜${APP_TAGLINE}` },
  description:
    "予約確認・リマインド・来店お礼・再来店のご案内までLINEで自動化。美容室・ネイルサロン・エステサロンのための顧客リピート自動化サービス「リピナビ」。",
  openGraph: {
    title: `${APP_NAME}｜${APP_TAGLINE}`,
    description:
      "予約確認・リマインド・来店お礼・再来店のご案内までLINEで自動化。スタッフの手を止めずに、リピーターを増やします。",
    type: "website",
    locale: "ja_JP",
  },
};

export default async function LandingPage() {
  const session = await getSession();
  const loggedIn = session !== null;

  return (
    <div className="bg-white">
      <SiteHeader loggedIn={loggedIn} />

      <main className="pt-16">
        {/* ========== ヒーロー ========== */}
        <section className="bg-gradient-to-b from-brand-light via-white to-white">
          <div className="mx-auto grid max-w-6xl gap-14 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-28">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-white px-3 py-1 text-xs font-medium text-brand-dark shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                美容室・ネイルサロン・エステサロン向け
              </span>
              <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-5xl lg:leading-[1.15]">
                {APP_TAGLINE}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg">
                予約確認・リマインド・来店お礼・再来店のご案内まで、LINEで自動。スタッフの手を止めずに、リピーターを増やします。
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {loggedIn ? (
                  <>
                    <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
                      ダッシュボードへ
                      <ArrowRight />
                    </Link>
                    <a
                      href="#features"
                      className={buttonVariants({ variant: "outline", size: "lg" })}
                    >
                      機能を見る
                    </a>
                  </>
                ) : (
                  <>
                    <Link href="/register" className={buttonVariants({ size: "lg" })}>
                      無料で始める
                      <ArrowRight />
                    </Link>
                    <Link
                      href="/login"
                      className={buttonVariants({ variant: "outline", size: "lg" })}
                    >
                      ログイン
                    </Link>
                  </>
                )}
              </div>

              <p className="mt-4 text-xs text-gray-500">
                クレジットカードの登録は不要です。デモデータ付きで、すぐに動作をお確かめいただけます。
              </p>
            </div>

            <HeroChatMock />
          </div>
        </section>

        {/* ========== 信頼指標バンド ========== */}
        <section className="border-y border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
            <div className="grid gap-8 sm:grid-cols-3 sm:gap-10">
              {TRUST_POINTS.map((point) => (
                <div key={point.title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand shadow-sm">
                    <point.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{point.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{point.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-8 text-xs text-gray-500">
              ※ LINEの国内月間利用者数はLINEヤフー株式会社の公表値です。
            </p>
          </div>
        </section>

        {/* ========== 課題提起 ========== */}
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                こんなお悩みはありませんか？
              </h2>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                お客様とのやり取りは大切な仕事です。それでも、施術の合間に手作業で続けるには限界があります。
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {PROBLEMS.map((problem) => (
                <div
                  key={problem.title}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-6"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-500 shadow-sm">
                    <problem.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-base font-bold text-gray-900">{problem.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-gray-600">{problem.body}</p>
                </div>
              ))}
            </div>

            <p className="mt-10 text-center text-base font-medium text-gray-900 sm:text-lg">
              リピナビは、この3つをまとめてLINEの自動配信に置き換えます。
            </p>
          </div>
        </section>

        {/* ========== 機能 ========== */}
        <section id="features" className="scroll-mt-16 border-t border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold tracking-wide text-brand-dark">機能</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                来店前から次の来店まで、まるごと自動化
              </h2>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                お客様への連絡を、リピートにつながる一連の流れとして設計しました。すべて店舗ごとの文面に編集できます。
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-base font-bold text-gray-900">{feature.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-gray-600">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== 使い方 ========== */}
        <section id="how" className="scroll-mt-16 border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold tracking-wide text-brand-dark">使い方</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                3ステップではじめられます
              </h2>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                専門知識は必要ありません。登録したその日から、配信の流れを確かめられます。
              </p>
            </div>

            <div className="relative mt-14">
              <div
                aria-hidden
                className="absolute inset-x-12 top-6 hidden border-t border-dashed border-gray-300 md:block"
              />
              <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
                {STEPS.map((step, index) => (
                  <li key={step.title} className="flex flex-col items-center text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-lg font-bold text-white shadow-md shadow-brand/30">
                      {index + 1}
                    </span>
                    <span className="mt-5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-base font-bold text-gray-900">{step.title}</h3>
                    <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-gray-600">
                      {step.body}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ========== できること ========== */}
        <section className="border-t border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
              <div>
                <p className="text-sm font-bold tracking-wide text-brand-dark">できること</p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                  日々の連絡を、ひとつずつ手放す
                </h2>
                <p className="mt-4 text-base leading-relaxed text-gray-600">
                  必要な配信だけをオンにして、少しずつ運用に組み込めます。使わない機能は、オフのままで構いません。
                </p>
              </div>

              <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {CAPABILITIES.map((capability) => (
                  <li key={capability} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm leading-relaxed text-gray-700">{capability}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ========== よくある質問 ========== */}
        <section id="faq" className="scroll-mt-16 border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="text-center">
              <p className="text-sm font-bold tracking-wide text-brand-dark">よくある質問</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                導入前に多くいただくご質問
              </h2>
            </div>

            <div className="mt-10 space-y-3">
              {FAQS.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-xl border border-gray-200 bg-white px-5 py-4 transition-colors open:border-brand/30 open:bg-brand-light/40"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold text-gray-900 [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <ChevronDown className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ========== CTAバンド ========== */}
        <section className="bg-brand">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
              まずはデモデータで、
              <br className="sm:hidden" />
              配信の流れを体験してください。
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/90">
              登録は1分ほど。LINE公式アカウントの準備がまだでも、デモモードですべての機能をお試しいただけます。
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {loggedIn ? (
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full bg-white text-brand-dark shadow-md hover:bg-gray-100 sm:w-auto"
                  )}
                >
                  ダッシュボードへ
                  <ArrowRight />
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "w-full bg-white text-brand-dark shadow-md hover:bg-gray-100 sm:w-auto"
                    )}
                  >
                    無料で始める
                    <ArrowRight />
                  </Link>
                  <Link
                    href="/login"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "w-full border-white/60 bg-transparent text-white shadow-none hover:bg-white/10 hover:text-white sm:w-auto"
                    )}
                  >
                    ログイン
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
