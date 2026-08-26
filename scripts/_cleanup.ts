import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const r = await p.store.deleteMany({ where: { slug: "salon-aoi" } });
  console.log(`孤児店舗 salon-aoi を削除: ${r.count}件`);
  const stores = await p.store.findMany({ select: { slug: true, name: true } });
  console.log("残存店舗:", JSON.stringify(stores));
  await p.$disconnect();
}
main();
