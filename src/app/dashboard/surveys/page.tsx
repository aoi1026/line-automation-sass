import Link from "next/link";
import { ClipboardList, MessageSquare, Plus, Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { formatJstDate, fromJst, jstParts } from "@/lib/jst";
import { formatNumber } from "@/lib/utils";
import { parseSurveyQuestions } from "@/app/api/surveys/schema";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SurveysTable, type SurveyRow } from "./_components/surveys-table";

export default async function SurveysPage() {
  const session = await requireSession();

  const now = new Date();
  const { year, month } = jstParts(now);
  const monthStart = fromJst(`${year}-${String(month).padStart(2, "0")}-01`);

  const [surveys, ratingGroups, monthResponseCount, overallRating] = await Promise.all([
    prisma.survey.findMany({
      where: { storeId: session.storeId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { responses: true } } },
    }),
    prisma.surveyResponse.groupBy({
      by: ["surveyId"],
      where: { survey: { storeId: session.storeId }, rating: { not: null } },
      _avg: { rating: true },
    }),
    prisma.surveyResponse.count({
      where: { survey: { storeId: session.storeId }, createdAt: { gte: monthStart } },
    }),
    prisma.surveyResponse.aggregate({
      where: { survey: { storeId: session.storeId }, rating: { not: null } },
      _avg: { rating: true },
    }),
  ]);

  const avgRatingBySurvey = new Map(ratingGroups.map((g) => [g.surveyId, g._avg.rating]));
  const overallAvg = overallRating._avg.rating;
  const activeCount = surveys.filter((s) => s.active).length;

  const rows: SurveyRow[] = surveys.map(({ _count, ...survey }) => {
    const questions = parseSurveyQuestions(survey.questions);
    return {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      thanksMessage: survey.thanksMessage,
      questions,
      questionCount: questions.length,
      responseCount: _count.responses,
      avgRating: avgRatingBySurvey.get(survey.id) ?? null,
      active: survey.active,
      updatedLabel: formatJstDate(survey.updatedAt),
    };
  });

  return (
    <>
      <PageHeader
        title="アンケート"
        description="来店後のお客様に送るアンケートを管理します。回答は自動で集計されます。"
        actions={
          <Link href="/dashboard/surveys/new">
            <Button>
              <Plus />
              アンケートを作成
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="有効なアンケート"
          value={formatNumber(activeCount)}
          sub={`全${formatNumber(surveys.length)}件中`}
          icon={<ClipboardList />}
        />
        <StatCard
          label="今月の回答数"
          value={formatNumber(monthResponseCount)}
          sub={`${year}年${month}月`}
          icon={<MessageSquare />}
        />
        <StatCard
          label="平均評価"
          value={
            overallAvg == null ? (
              "-"
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                {overallAvg.toFixed(1)}
              </span>
            )
          }
          sub="全期間の平均"
          icon={<Star />}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="アンケートがまだありません"
          description="「アンケートを作成」から、来店後のお客様に送る満足度アンケートを作成できます。"
          action={
            <Link href="/dashboard/surveys/new">
              <Button>
                <Plus />
                アンケートを作成
              </Button>
            </Link>
          }
        />
      ) : (
        <SurveysTable rows={rows} />
      )}
    </>
  );
}
