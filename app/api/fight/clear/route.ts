import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await db.fightConfig.upsert({
    where: { id: "global" },
    create: { id: "global", headerImageDataUrl: "" },
    update: { headerImageDataUrl: "" },
  });

  revalidatePath("/fight");
  return NextResponse.redirect(new URL("/fight", req.url), { status: 303 });
}
