import { redirect } from "next/navigation";

/** LINE連携の設定は設定ページのタブに統合されたため、リダイレクトする */
export default function LineSettingsPage() {
  redirect("/dashboard/settings?tab=line");
}
