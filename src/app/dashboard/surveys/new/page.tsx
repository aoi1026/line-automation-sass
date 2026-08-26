import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import type { SurveyQuestion } from "@/app/api/surveys/schema";
import { PageHeader } from "@/components/ui/page-header";
import { SurveyForm, type SurveyFormInitial } from "../_components/survey-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "アンケートの作成" };

const DEFAULT_THANKS_MESSAGE =
  "ご回答ありがとうございました。今後のサービス向上に役立てさせていただきます。";

/** 新規作成時のデフォルト質問（IDはリクエストごとに生成し、propsとしてクライアントへ渡す） */
function createDefaultQuestions(): SurveyQuestion[] {
  return [
    {
      id: crypto.randomUUID(),
      type: "rating",
      label: "本日の満足度を教えてください",
      required: true,
    },
    {
      id: crypto.randomUUID(),
      type: "choice",
      label: "どちらでお知りになりましたか？",
      options: ["ご紹介", "SNS", "検索サイト", "通りがかり", "その他"],
      required: false,
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      label: "ご意見・ご感想があればお聞かせください",
      required: false,
    },
  ];
}

export default async function NewSurveyPage() {
  const session = await requireSession();
  const store = await prisma.store.findUnique({
    where: { id: session.storeId },
    select: { name: true },
  });

  const initial: SurveyFormInitial = {
    title: "ご来店後アンケート",
    description: "今後のサービス向上のため、ご意見をお聞かせください。",
    thanksMessage: DEFAULT_THANKS_MESSAGE,
    questions: createDefaultQuestions(),
  };

  return (
    <>
      <PageHeader
        title="アンケートを作成"
        description="来店後のお客様に送るアンケートを作成します。右側のプレビューで実際の見え方を確認できます。"
      />
      <SurveyForm storeName={store?.name ?? ""} initial={initial} />
    </>
  );
}
