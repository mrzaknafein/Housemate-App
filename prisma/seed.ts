import { ensureDefaultDemoRooms } from "../src/lib/demo-seed";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🌱 Housemate örnek verileri hazırlanıyor (HM-DEMO & HM-YURT)...");
  await ensureDefaultDemoRooms();
  console.log("✅ HM-DEMO (Ev) ve HM-YURT (Yurt) odaları 4 aylık geçmiş verileriyle hazır!");
}

main()
  .catch((e) => {
    console.error("Seed hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
