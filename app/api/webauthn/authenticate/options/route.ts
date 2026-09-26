import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://dazzling-armadillo-628.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);

export async function POST(req: NextRequest) {
  try {
    const host = req.headers.get("host") || "localhost";
    const rpID = host.split(":")[0];

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
    });

    // Save challenge in Convex
    await convex.mutation(api.passkeys.saveAuthenticationChallenge, {
      challenge: options.challenge,
    });

    return NextResponse.json(options);
  } catch (err: unknown) {
    console.error("[WebAuthn Auth Options Error]:", err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
