import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquare, Pencil, Percent, Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { formatJstDateTimeShort } from "@/lib/jst";
import { formatNumber, formatPercent } from "@/lib/utils";
import {
  QUESTION_TYPE_LABELS,
  parseSurveyAnswers,
  parseSurveyQuestions,
} from "@/app/api/surveys/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RatingDistributionChart } from "../_components/rating-distribution-chart";
import { RatingValue } from "../_components/rating-value";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "アンケート結果" };

function excerpt(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** 集計バー（ラベル + 件数/割合 + 横棒グラフ） */
function BreakdownBar({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: "amber" | "brand";
}) {
  const ratio = total > 0 ? count / total : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-gray-700">{label}</span>
        <span className="shrink-0 text-xs text-gray-500">
          {formatNumber(count)}件（{formatPercent(ratio)}）
        </span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={tone === "amber" ? "h-full rounded-full bg-amber-400" : "h-full rounded-full bg-brand"}
          style={{ width: `${Math.round(ratio * 1000) / 10}%` }}
        />
      </div>
    </div>
  );
}

export default async function SurveyResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const survey = await prisma.survey.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!survey) notFound();

  const [responses, requestCount] = await Promise.all([
    prisma.surveyResponse.findMany({
      where: { surveyId: survey.id },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { name: true } } },
    }),
    prisma.surveyRequest.count({ where: { surveyId: survey.id } }),
  ]);

  const questions = parseSurveyQuestions(survey.questions);
  const parsed = responses.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    customerName: r.customer?.name ?? null,
    rating: r.rating,
    comment: r.comment,
    answers: parseSurveyAnswers(r.answers),
  }));

  // ヘッダー統計: 平均評価は最初のratingタイプ質問から算出
  const firstRating = questions.find((q) => q.type === "rating");
  const ratingValues = firstRating
    ? parsed
        .map((r) => r.answers[firstRating.id])
        .filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5)
    : [];
  const avgRating =
    ratingValues.length > 0
      ? ratingValues.reduce((sum, v) => sum + v, 0) / ratingValues.length
      : null;

  return (
    <>
      <PageHeader
        title={survey.title}
        description={survey.description !== "" ? survey.description : "アンケートの回答集計を表示します。"}
        actions={
          <Link href={`/dashboard/surveys/${survey.id}/edit`}>
            <Button variant="outline">
              <Pencil />
              編集
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="回答数"
          value={formatNumber(parsed.length)}
          icon={<MessageSquare />}
        />
        <StatCard
          label="平均評価"
          value={
            avgRating == null ? (
              "-"
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                {avgRating.toFixed(1)}
              </span>
            )
          }
          sub={firstRating ? excerpt(firstRating.label, 20) : "評価質問なし"}
          icon={<Star />}
        />
        <StatCard
          label="回答率"
          value={requestCount === 0 ? "-" : formatPercent(parsed.length / requestCount)}
          sub={`回答 ${formatNumber(parsed.length)} / 依頼 ${formatNumber(requestCount)}`}
          icon={<Percent />}
        />
      </div>

      {questions.length === 0 ? (
        <EmptyState
          title="質問が設定されていません"
          description="「編集」から質問を追加してください。"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {questions.map((question, index) => {
            const rawAnswers = parsed.map((r) => ({
              value: r.answers[question.id],
              createdAt: r.createdAt,
              customerName: r.customerName,
            }));

            return (
              <Card key={question.id}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <span>
                      Q{index + 1}. {question.label}
                    </span>
                    <Badge variant="secondary">{QUESTION_TYPE_LABELS[question.type]}</Badge>
                    {question.required && <Badge variant="destructive">必須</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {question.type === "rating" &&
                    (() => {
                      const values = rawAnswers
                        .map((a) => a.value)
                        .filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5);
                      if (values.length === 0) {
                        return <p className="text-sm text-gray-400">まだ回答がありません。</p>;
                      }
                      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
                      return (
                        <div>
                          <div className="mb-4 flex items-baseline gap-2">
                            <RatingValue value={avg} className="text-xl font-bold" />
                            <span className="text-xs text-gray-500">
                              {formatNumber(values.length)}件の回答
                            </span>
                          </div>
                          <RatingDistributionChart
                            data={[1, 2, 3, 4, 5].map((score) => ({
                              label: `★${score}`,
                              count: values.filter((v) => v === score).length,
                            }))}
                          />
                        </div>
                      );
                    })()}

                  {question.type === "choice" &&
                    (() => {
                      const options = question.options ?? [];
                      const values = rawAnswers
                        .map((a) => a.value)
                        .filter((v): v is string => typeof v === "string" && options.includes(v));
                      if (values.length === 0) {
                        return <p className="text-sm text-gray-400">まだ回答がありません。</p>;
                      }
                      return (
                        <div className="flex flex-col gap-3">
                          {options.map((option) => (
                            <BreakdownBar
                              key={option}
                              label={option}
                              count={values.filter((v) => v === option).length}
                              total={values.length}
                              tone="brand"
                            />
                          ))}
                        </div>
                      );
                    })()}

                  {question.type === "text" &&
                    (() => {
                      const entries = rawAnswers
                        .filter(
                          (a): a is typeof a & { value: string } =>
                            typeof a.value === "string" && a.value.trim() !== ""
                        )
                        .slice(0, 20);
                      if (entries.length === 0) {
                        return <p className="text-sm text-gray-400">まだ回答がありません。</p>;
                      }
                      return (
                        <ul className="flex flex-col gap-3">
                          {entries.map((entry, i) => (
                            <li key={i} className="rounded-lg bg-gray-50 p-3">
                              <p className="whitespace-pre-wrap text-sm text-gray-700">
                                {entry.value}
                              </p>
                              <p className="mt-1.5 text-xs text-gray-400">
                                {formatJstDateTimeShort(entry.createdAt)} ・{" "}
                                {entry.customerName ?? "匿名"}
                              </p>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">最近の回答</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {parsed.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                icon={<MessageSquare />}
                title="回答がまだありません"
                description="来店お礼メッセージなどでアンケートを送ると、回答がここに表示されます。"
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>回答日時</TableHead>
                  <TableHead>顧客</TableHead>
                  <TableHead>総合評価</TableHead>
                  <TableHead>コメント</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.slice(0, 10).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-gray-600">
                      {formatJstDateTimeShort(r.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-gray-900">
                      {r.customerName ?? "匿名"}
                    </TableCell>
                    <TableCell>
                      <RatingValue value={r.rating} digits={0} />
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {r.comment !== "" ? excerpt(r.comment) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
