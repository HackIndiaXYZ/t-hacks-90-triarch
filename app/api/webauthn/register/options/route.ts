import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://dazzling-armadillo-628.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Valid authenticated session required." },
        { status: 401 }
      );
    }

    const host = req.headers.get("host") || "localhost";
    const rpID = host.split(":")[0]; // Strip port for rpID
    const userEmail =
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      user.username ||
      user.id;

    const userDisplayName =
      user.fullName ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      userEmail;

    // Generate WebAuthn registration options
    const options = await generateRegistrationOptions({
      rpName: "Verifi TrustID",
      rpID,
      userID: new TextEncoder().encode(user.id),
      userName: userEmail,
      userDisplayName,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    // Save challenge in Convex
    await convex.mutation(api.passkeys.saveRegistrationChallenge, {
      challenge: options.challenge,
      clerkId: user.id,
    });

    return NextResponse.json(options);
  } catch (err: unknown) {
    console.error("[WebAuthn Register Options Error]:", err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
