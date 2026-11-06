import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";

export const dynamic = "force-dynamic";

/**
 * Webhook endpoint that triggers self-update when GitHub pushes a new release.
 * Can be called by GitHub Webhook or manually by admin if UPDATE_SECRET matches (or if unset in local VDS).
 */
export async function POST(req: NextRequest) {
  try {
    const configuredSecret = process.env.UPDATE_WEBHOOK_SECRET;
    const providedSecret =
      req.headers.get("x-hub-secret") ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (configuredSecret && configuredSecret !== providedSecret) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }

    exec("sh ./deploy/auto-update.sh", (error, stdout, stderr) => {
      if (error) {
        console.error("Auto-update execution error:", error, stderr);
      } else {
        console.log("Auto-update triggered successfully:", stdout);
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Otomatik güncelleme süreci başlatıldı.",
      triggeredAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Webhook update error:", error);
    return NextResponse.json(
      { error: "Güncelleme tetiklenemedi." },
      { status: 500 }
    );
  }
}
