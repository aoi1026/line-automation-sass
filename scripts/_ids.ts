import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const stores = await p.store.findMany({ select: { id: true, slug: true, name: true } });
  console.error("STORES: " + JSON.stringify(stores));
  const store = stores.find((s) => s.slug === "demo-salon");
  if (!store) throw new Error("demo-salon が見つかりません");
  const storeId = store.id;
  const [r, c, cp, s, seg, cam, ci, sr, tpl] = await Promise.all([
    p.reservation.findFirst({ where: { storeId }, orderBy: { startAt: "desc" } }),
    p.customer.findFirst({ where: { storeId, visitCount: { gt: 0 } } }),
    p.coupon.findFirst({ where: { storeId } }),
    p.survey.findFirst({ where: { storeId } }),
    p.segment.findFirst({ where: { storeId } }),
    p.campaign.findFirst({ where: { storeId } }),
    p.couponIssue.findFirst({ where: { coupon: { storeId } } }),
    p.surveyRequest.findFirst({ where: { survey: { storeId }, respondedAt: null } }),
    p.messageTemplate.findFirst({ where: { storeId } }),
  ]);
  console.log(JSON.stringify({ storeId, rid: r?.id, rtok: r?.publicToken, cid: c?.id, cpid: cp?.id,
    sid: s?.id, segid: seg?.id, camid: cam?.id, citok: ci?.token, srtok: sr?.token, tplid: tpl?.id }));
  await p.$disconnect();
}
main();
