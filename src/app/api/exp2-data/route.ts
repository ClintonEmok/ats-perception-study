import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

const DATA_PATH = join(
  process.cwd(),
  "scripts",
  "output",
  "experiment2_expert_stimuli",
  "data.json",
);

export const dynamic = "force-static";

export function GET() {
  if (!existsSync(DATA_PATH)) {
    return NextResponse.json(
      {
        error: "data-not-found",
        message:
          "Run `pnpm stimuli:exp2` to generate scripts/output/experiment2_expert_stimuli/data.json before loading this page.",
        path: DATA_PATH,
      },
      { status: 404 },
    );
  }
  const raw = readFileSync(DATA_PATH, "utf8");
  return new NextResponse(raw, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
