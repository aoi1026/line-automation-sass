import type { Metadata } from "next";
import { CheckCircle2, ClipboardX } from "lucide-react";
import { prisma } from "@/lib/db";
import { parseSurveyQuestions } from "@/app/api/surveys/schema";
import { Card, CardContent } from "@/components/ui/card";
import { SurveyAnswerForm } from "./survey-answer-form";

export const dynamic = "force-dynamic";

/**
 * お客様ごとの個別URLのため、検索エンジンには一切登録させない。
 * （robots.ts でもクロールを禁止しているが、meta でも二重に指定する）
 */
export const metadata: Metadata = {
  title: "アンケート",
  description: "ご来店ありがとうございました。サービス向上のためアンケートにご協力ください。",
  robots: { index: false, follow: false, nocache: true },
};

function PublicShell({
  storeName,
  children,
}: {
  storeName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {storeName !== undefined && (
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex h-14 max-w-md items-center justify-center px-4">
            <span className="truncate text-base font-bold text-gray-900">{storeName}</span>
          </div>
        </header>
      )}
      <main className="mx-auto max-w-md px-4 py-8">{children}</main>
    </div>
  );
}

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const request = await prisma.surveyRequest.findUnique({
    where: { token },
    include: {
      survey: { include: { store: true } },
      customer: true,
    },
  });

  if (!request || !request.survey.active) {
    return (
      <PublicShell>
        <Card className="mt-12">
          <CardContent className="p-8 text-center">
            <ClipboardX aria-hidden="true" className="mx-auto h-12 w-12 text-gray-300" />
            <h1 className="mt-4 text-lg font-bold text-gray-900">
              アンケートが見つかりませんでした
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              URLが正しいかご確認のうえ、もう一度お試しください。
              受付を終了している場合もございます。
            </p>
          </CardContent>
        </Card>
      </PublicShell>
    );
  }

  const { survey } = request;
  const storeName = survey.store.name;

  if (request.respondedAt) {
    return (
      <PublicShell storeName={storeName}>
        <Card className="mt-8">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-light">
              <CheckCircle2 aria-hidden="true" className="h-9 w-9 text-brand" />
            </div>
            <h1 className="mt-4 text-lg font-bold text-gray-900">回答済みです</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              このアンケートには回答済みです。
              ご協力いただき、ありがとうございました。
            </p>
            <p className="mt-6 text-sm font-medium text-gray-700">{storeName}</p>
          </CardContent>
        </Card>
      </PublicShell>
    );
  }

  const questions = parseSurveyQuestions(survey.questions);

  return (
    <PublicShell storeName={storeName}>
      <SurveyAnswerForm
        token={token}
        storeName={storeName}
        surveyTitle={survey.title}
        surveyDescription={survey.description}
        questions={questions}
        fallbackThanksMessage={survey.thanksMessage}
      />
      <p className="mt-8 text-center text-xs text-gray-400">{storeName}</p>
    </PublicShell>
  );
}
