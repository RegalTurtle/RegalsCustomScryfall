import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import authorization from "@/authorization";
import { authOptions } from "@/auth-options";
import deckData from "@/data/decks";
import { deleteLocalProxyImage, getProxyImagePath, getProxyImageUploadDir, proxyImageUrlPrefix } from "@/utils/proxyImages";

export const runtime = "nodejs";

const allowedImageTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const maxUploadBytes = 15 * 1024 * 1024;
type DeckSection = "cards" | "sideboard" | "maybeboard" | "wishlist";
type FoilOption = "nonfoil" | "foil" | "etched";

function isDeckSection(value: string): value is DeckSection {
  return ["cards", "sideboard", "maybeboard", "wishlist"].includes(value);
}

function isFoilOption(value: string): value is FoilOption {
  return ["nonfoil", "foil", "etched"].includes(value);
}

function formValueToString(value: FormDataEntryValue | null, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deck_id: string }> }
): Promise<NextResponse> {
  const { deck_id } = await params;
  const session = await getServerSession({ request, ...authOptions });

  if (!session || !authorization.canAddCardsToCollection(session.user?.permissionLevel)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      throw new Error("Image file is required");
    }

    const extension = allowedImageTypes[file.type];
    if (!extension) {
      throw new Error("Image must be a JPG, PNG, WEBP, or GIF");
    }

    if (file.size > maxUploadBytes) {
      throw new Error("Image must be 15MB or smaller");
    }

    const deckSection = formValueToString(formData.get("deckSection"), "deckSection");
    const set = formValueToString(formData.get("set"), "set");
    const cn = formValueToString(formData.get("cn"), "cn");
    const foil = formValueToString(formData.get("foil"), "foil");
    if (!isDeckSection(deckSection)) {
      throw new Error("deckSection invalid");
    }
    if (!isFoilOption(foil)) {
      throw new Error("foil invalid");
    }

    const fileName = `${deck_id}-${set}-${cn}-${randomUUID()}.${extension}`.replace(/[^a-zA-Z0-9._-]/g, "-");
    const uploadDir = getProxyImageUploadDir();
    const uploadPath = getProxyImagePath(fileName);
    const imageUrl = `${proxyImageUrlPrefix}${fileName}`;

    if (!uploadPath) {
      throw new Error("Generated image filename was invalid");
    }

    await mkdir(uploadDir, { recursive: true });
    await writeFile(uploadPath, Buffer.from(await file.arrayBuffer()));
    let previousImage: string | undefined;
    try {
      previousImage = await deckData.setProxyImage(deck_id, deckSection, set, cn, foil, imageUrl);
    } catch (error) {
      await deleteLocalProxyImage(imageUrl);
      throw error;
    }

    await deleteLocalProxyImage(previousImage, imageUrl);

    return NextResponse.json({ imageUrl }, { status: 201 });
  } catch (err) {
    console.error("Error uploading proxy image:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
