import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getProxyImagePath } from "@/utils/proxyImages";

export const runtime = "nodejs";

const contentTypes: Record<string, string> = {
  gif: "image/gif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file_name: string }> }
): Promise<NextResponse> {
  const { file_name } = await params;
  const imagePath = getProxyImagePath(file_name);

  if (!imagePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await readFile(imagePath);
    const extension = file_name.split(".").pop()?.toLowerCase() ?? "";

    return new NextResponse(file, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": contentTypes[extension] ?? "application/octet-stream",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
