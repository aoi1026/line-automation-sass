import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { parseSurveyQuestions } from "@/app/api/surveys/schema";
import { PageHeader } from "@/components/ui/page-header";
import {
  SurveyForm,
  type SurveyFormInitial,
} from "../../_components/survey-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "アンケートの編集" };

export default async function EditSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const [survey, store] = await Promise.all([
    prisma.survey.findFirst({
      where: { id, storeId: session.storeId },
    }),
    prisma.store.findUnique({
      where: { id: session.storeId },
      select: { name: true },
    }),
  ]);
  if (!survey) notFound();

  const initial: SurveyFormInitial = {
    title: survey.title,
    description: survey.description,
    thanksMessage: survey.thanksMessage,
    questions: parseSurveyQuestions(survey.questions),
  };

  return (
    <>
      <PageHeader
        title="アンケートを編集"
        description="質問の変更は、これから送る回答依頼から反映されます。"
      />
      <SurveyForm
        surveyId={survey.id}
        storeName={store?.name ?? ""}
        initial={initial}
      />
    </>
  );
}
