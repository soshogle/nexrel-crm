import { NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { leadId, audioBlob } = await request.json();

    if (!leadId || !audioBlob) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!process.env.AWS_S3_BUCKET) {
      return NextResponse.json({ success: true, url: null });
    }

    const audioBuffer = Buffer.from(audioBlob, "base64");
    const fileName = `conversations/lead-${leadId}-${Date.now()}.webm`;
    const url = await uploadToS3({
      key: fileName,
      body: audioBuffer,
      contentType: "audio/webm",
    });

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Error uploading audio:", error);
    return NextResponse.json({ error: "Failed to upload audio" }, { status: 500 });
  }
}
