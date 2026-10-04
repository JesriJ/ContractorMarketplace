import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const ALLOWED_PREFIXES = ["jobs/", "profiles/", "portfolio/"] as const;
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await getSession();
        if (!session?.user?.id) {
          throw new Error("Not authenticated.");
        }

        const allowed = ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
        if (!allowed) {
          throw new Error("Invalid upload path.");
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
      // Skip onUploadCompleted: locally there is no public callback URL, and the
      // client already receives the blob URL to save with the form.
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }
}
