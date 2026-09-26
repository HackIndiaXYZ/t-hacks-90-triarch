import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
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

    const body = await req.json();
    const { registrationResponse, challenge, deviceName } = body;

    if (!registrationResponse || !challenge) {
      return NextResponse.json(
        { error: "Missing registration response or challenge." },
        { status: 400 }
      );
    }

    // 1. Consume and validate challenge in Convex
    const challengeResult = await convex.mutation(api.passkeys.verifyAndConsumeChallenge, {
      challenge,
      purpose: "registration",
    });

    if (!challengeResult.valid) {
      return NextResponse.json(
        { error: challengeResult.error || "Invalid or expired challenge." },
        { status: 400 }
      );
    }

    const host = req.headers.get("host") || "localhost";
    const rpID = host.split(":")[0];
    const originHeader = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "");
    const allowedOrigins = [
      originHeader,
      `http://${host}`,
      `https://${host}`,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ].filter(Boolean) as string[];

    // 2. Perform authoritative cryptographic WebAuthn verification
    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: challenge,
      expectedOrigin: allowedOrigins,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "WebAuthn cryptographic registration verification failed." },
        { status: 400 }
      );
    }

    const { credential, credentialDeviceType, credentialBackedUp, aaguid } = verification.registrationInfo;

    // Convert binary credential ID and public key to base64url string for safe storage
    const credentialId = Buffer.from(credential.id).toString("base64url");
    const publicKey = Buffer.from(credential.publicKey).toString("base64url");

    // 3. Store public metadata in Convex (Zero Biometrics / Zero Private Keys)
    await convex.mutation(api.passkeys.storePasskey, {
      credentialId,
      publicKey,
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      deviceName: deviceName || (credentialDeviceType === "multiDevice" ? "iCloud / Passkey Keychain" : "Hardware Security Key"),
      aaguid: aaguid ? String(aaguid) : undefined,
      clerkId: user.id,
    });

    return NextResponse.json({
      success: true,
      verified: true,
      passkey: {
        credentialId,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
      },
    });
  } catch (err: unknown) {
    console.error("[WebAuthn Register Verify Error]:", err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
