import { NextResponse } from "next/server";
import type {
  FollowEvent,
  MessageEvent,
  WebhookEvent as LineWebhookEvent,
  WebhookRequestBody,
} from "@line/bot-sdk";
import { Prisma, type Store } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getLineProfile, replyText, verifyLineSignature } from "@/lib/line/client";
import { getAppUrl } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

/** Web予約ページのURL */
function bookingUrl(store: Pick<Store, "slug">): string {
  return `${getAppUrl()}/r/${store.slug}`;
}

/** 友だち追加（follow）: 未登録なら仮顧客を作成し、挨拶を返信 */
async function handleFollow(store: Store, event: FollowEvent): Promise<void> {
  const userId = event.source.userId;
  if (!userId) return;

  const existing = await prisma.customer.findFirst({
    where: { storeId: store.id, lineUserId: userId },
  });
  if (!existing) {
    const profile = await getLineProfile(store, userId);
    await prisma.customer.create({
      data: {
        storeId: store.id,
        name: profile?.displayName || "LINEのお客様",
        lineUserId: userId,
        lineDisplayName: profile?.displayName ?? "",
      },
    });
  }

  await replyText(
    store,
    event.replyToken,
    "友だち追加ありがとうございます！ご予約・お知らせをこちらにお送りします。店頭で発行された6桁の連携コードをお持ちの場合は、このトークに送信してください。"
  );
}

/** 6桁の連携コードによる顧客連携 */
async function handleLinkCode(
  store: Store,
  senderUserId: string | undefined,
  code: string,
  replyToken: string
): Promise<void> {
  const now = new Date();
  const target = await prisma.customer.findFirst({
    where: {
      storeId: store.id,
      linkCode: code,
      linkCodeExpiresAt: { gt: now },
    },
  });

  if (!target || !senderUserId) {
    await replyText(
      store,
      replyToken,
      "コードが確認できませんでした。お手数ですが店舗スタッフにお声がけください。"
    );
    return;
  }

  // 送信者のlineUserIdが既に別の顧客（follow時に自動作成された仮顧客など）に
  // 紐づいている場合は、その顧客から連携を外す（予約・履歴が無ければ削除）
  let displayName = "";
  const holder = await prisma.customer.findFirst({
    where: { storeId: store.id, lineUserId: senderUserId },
    include: { _count: { select: { reservations: true, messageLogs: true } } },
  });
  if (holder && holder.id !== target.id) {
    displayName = holder.lineDisplayName;
    const hasHistory = holder._count.reservations > 0 || holder._count.messageLogs > 0;
    if (hasHistory) {
      await prisma.customer.update({
        where: { id: holder.id },
        data: { lineUserId: null, lineDisplayName: "" },
      });
    } else {
      await prisma.customer.delete({ where: { id: holder.id } });
    }
  }
  if (!displayName) {
    const profile = await getLineProfile(store, senderUserId);
    displayName = profile?.displayName ?? "";
  }

  await prisma.customer.update({
    where: { id: target.id },
    data: {
      lineUserId: senderUserId,
      lineDisplayName: displayName,
      linkCode: null,
      linkCodeExpiresAt: null,
    },
  });

  await replyText(
    store,
    replyToken,
    `連携が完了しました！${target.name}様、今後こちらにお知らせをお送りします。`
  );
}

/** テキストメッセージ受信時の応答 */
async function handleMessage(store: Store, event: MessageEvent): Promise<void> {
  if (event.message.type !== "text") return;
  const text = event.message.text.trim();

  // 6桁数字 → 連携コードとして処理
  if (/^\d{6}$/.test(text)) {
    await handleLinkCode(store, event.source.userId, text, event.replyToken);
    return;
  }

  // 「予約」を含む → Web予約リンクを案内
  if (text.includes("予約")) {
    await replyText(
      store,
      event.replyToken,
      `ご予約はこちらのページから承っております。\n${bookingUrl(store)}`
    );
    return;
  }

  // それ以外 → 自動応答
  const lines = [`メッセージありがとうございます。ご予約はこちらから: ${bookingUrl(store)}`];
  if (store.phone.trim()) {
    lines.push(`その他のお問い合わせはお電話（${store.phone}）にてお願いいたします。`);
  }
  await replyText(store, event.replyToken, lines.join("\n"));
}

/**
 * LINE Messaging API Webhook 受信エンドポイント。
 * 署名検証後、各イベントを記録・処理する。LINE側の再送を避けるため、
 * イベント処理中のエラーはログのみとし、常に200を返す。
 */
export async function POST(req: Request, ctx: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await ctx.params;

  // 大量リクエストによる過負荷を防ぐ。LINE側の再送を招かないよう、制限中も200を返す
  const rl = rateLimit(`line-webhook:${storeId}`, 600, 60_000);
  if (!rl.ok) {
    console.warn(`[line-webhook] レート制限のためイベントを無視しました: store=${storeId}`);
    return NextResponse.json({
      ok: true,
      ignored: true,
      message: "リクエストが多すぎるため、このイベントは処理されませんでした",
    });
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    return NextResponse.json({ error: "店舗が見つかりませんでした" }, { status: 404 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";
  if (!verifyLineSignature(store, body, signature)) {
    return NextResponse.json({ error: "署名の検証に失敗しました" }, { status: 401 });
  }

  let events: LineWebhookEvent[] = [];
  try {
    const parsed = JSON.parse(body) as WebhookRequestBody;
    events = Array.isArray(parsed.events) ? parsed.events : [];
  } catch (e) {
    console.error("[line-webhook] リクエストボディの解析に失敗しました:", e);
    return NextResponse.json({ ok: true });
  }

  for (const event of events) {
    try {
      await prisma.webhookEvent.create({
        data: {
          storeId: store.id,
          type: event.type,
          payload: event as unknown as Prisma.InputJsonValue,
        },
      });

      switch (event.type) {
        case "follow":
          await handleFollow(store, event);
          break;
        case "unfollow":
          // lineUserIdは保持したまま何もしない（ブロック解除で再開できるため）
          console.log(`[line-webhook] unfollow: store=${store.id} user=${event.source.userId ?? "?"}`);
          break;
        case "message":
          await handleMessage(store, event);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error(`[line-webhook] イベント処理でエラーが発生しました (type=${event.type}):`, e);
    }
  }

  return NextResponse.json({ ok: true });
}
