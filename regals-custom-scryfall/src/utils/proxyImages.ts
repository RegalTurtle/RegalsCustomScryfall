import { unlink } from "fs/promises";
import path from "path";

export const proxyImageUrlPrefix = "/proxy-images/";

export function getProxyImageUploadDir(): string {
  return path.join(process.cwd(), "public", "proxy-images");
}

export function getProxyImagePath(fileName: string): string | null {
  if (!fileName || path.basename(fileName) !== fileName) return null;
  return path.join(getProxyImageUploadDir(), fileName);
}

export async function deleteLocalProxyImage(imageUrl: string | undefined, exceptImageUrl?: string) {
  if (!imageUrl || imageUrl === exceptImageUrl || !imageUrl.startsWith(proxyImageUrlPrefix)) return;

  const imagePath = getProxyImagePath(imageUrl.slice(proxyImageUrlPrefix.length));
  if (!imagePath) return;

  try {
    await unlink(imagePath);
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      console.warn(`Could not delete old proxy image ${imageUrl}:`, error);
    }
  }
}
