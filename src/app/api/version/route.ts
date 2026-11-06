import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  let gitCommit = process.env.GIT_COMMIT_SHA || "";
  if (!gitCommit) {
    try {
      const headPath = path.join(process.cwd(), ".git", "HEAD");
      if (fs.existsSync(headPath)) {
        const headContent = fs.readFileSync(headPath, "utf8").trim();
        if (headContent.startsWith("ref: ")) {
          const refPath = path.join(process.cwd(), ".git", headContent.slice(5));
          if (fs.existsSync(refPath)) {
            gitCommit = fs.readFileSync(refPath, "utf8").trim().slice(0, 8);
          }
        } else {
          gitCommit = headContent.slice(0, 8);
        }
      }
    } catch {
      // Ignore git read errors in container
    }
  }

  return NextResponse.json({
    version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    commit: gitCommit || "release-1.0",
    timestamp: new Date().toISOString(),
  });
}
