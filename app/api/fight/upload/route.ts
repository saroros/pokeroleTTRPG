import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Buffer } from "node:buffer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    const allowed = ["image/png", "image/jpeg"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ ok: false, error: "Only PNG/JPG allowed" }, { status: 400 });
    }

    const MAX = 2 * 1024 * 1024;
    if (file.size > MAX) {
      return NextResponse.json({ ok: false, error: "Image too large (max 2MB)" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;

    await db.fightConfig.upsert({
      where: { id: "global" },
      create: { id: "global", headerImageDataUrl: dataUrl },
      update: { headerImageDataUrl: dataUrl },
    });

    revalidatePath("/fight");
    return NextResponse.redirect(new URL("/fight", req.url), { status: 303 });
  } catch (err: any) {
    console.error("UPLOAD ERROR:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
