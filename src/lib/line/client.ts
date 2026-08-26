import { messagingApi, validateSignature } from "@line/bot-sdk";
import type { Store } from "@prisma/client";

export type PushResult =
  | { ok: true; channel: "LINE" | "DEMO" }
  | { ok: false; channel: "LINE"; error: string };

/** 店舗にLINEチャネルが設定されているか（未設定ならデモモード） */
export function isLineConfigured(store: Pick<Store, "lineChannelAccessToken">): boolean {
  return store.lineChannelAccessToken.trim().length > 0;
}

function createClient(store: Pick<Store, "lineChannelAccessToken">): messagingApi.MessagingApiClient {
  return new messagingApi.MessagingApiClient({
    channelAccessToken: store.lineChannelAccessToken,
  });
}

/**
 * テキストメッセージをプッシュ送信する。
 * チャネル未設定の店舗の場合は実送信せず DEMO を返す（呼び出し側でログのみ記録）。
 */
export async function pushText(
  store: Pick<Store, "lineChannelAccessToken">,
  lineUserId: string,
  text: string
): Promise<PushResult> {
  if (!isLineConfigured(store)) {
    return { ok: true, channel: "DEMO" };
  }
  try {
    const client = createClient(store);
    await client.pushMessage({
      to: lineUserId,
      messages: [{ type: "text", text }],
    });
    return { ok: true, channel: "LINE" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, channel: "LINE", error: message };
  }
}

/** 返信メッセージ（Webhook応答用） */
export async function replyText(
  store: Pick<Store, "lineChannelAccessToken">,
  replyToken: string,
  text: string
): Promise<void> {
  if (!isLineConfigured(store)) return;
  const client = createClient(store);
  await client.replyMessage({
    replyToken,
    messages: [{ type: "text", text }],
  });
}

/** LINEユーザーのプロフィールを取得（表示名の記録用） */
export async function getLineProfile(
  store: Pick<Store, "lineChannelAccessToken">,
  lineUserId: string
): Promise<{ displayName: string } | null> {
  if (!isLineConfigured(store)) return null;
  try {
    const client = createClient(store);
    const profile = await client.getProfile(lineUserId);
    return { displayName: profile.displayName };
  } catch {
    return null;
  }
}

/** Webhook署名の検証 */
export function verifyLineSignature(
  store: Pick<Store, "lineChannelSecret">,
  body: string,
  signature: string
): boolean {
  if (!store.lineChannelSecret) return false;
  try {
    return validateSignature(body, store.lineChannelSecret, signature);
  } catch {
    return false;
  }
}
