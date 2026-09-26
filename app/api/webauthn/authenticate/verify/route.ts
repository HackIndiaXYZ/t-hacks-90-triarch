import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://dazzling-armadillo-628.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { authenticationResponse, challenge } = body;

    if (!authenticationResponse || !challenge) {
      return NextResponse.json(
        { error: "Missing authentication response or challenge." },
        { status: 400 }
      );
    }

    // 1. Consume and validate challenge in Convex
    const challengeResult = await convex.mutation(api.passkeys.verifyAndConsumeChallenge, {
      challenge,
      purpose: "authentication",
    });

    if (!challengeResult.valid) {
      return NextResponse.json(
        { error: challengeResult.error || "Invalid or expired authentication challenge." },
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

    // 2. Fetch passkey from Convex by credential ID
    const credentialId = authenticationResponse.id;
    const passkey = await convex.query(api.passkeys.getPasskeyByCredentialId, {
      credentialId,
    });

    if (!passkey) {
      return NextResponse.json(
        { error: "Passkey credential not recognized or not registered with this Verifi account." },
        { status: 404 }
      );
    }

    // 3. Cryptographically verify the WebAuthn signature over clientDataJSON and authenticatorData
    const publicKeyBytes = new Uint8Array(Buffer.from(passkey.publicKey, "base64url"));

    const verification = await verifyAuthenticationResponse({
      response: authenticationResponse,
      expectedChallenge: challenge,
      expectedOrigin: allowedOrigins,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: publicKeyBytes,
        counter: passkey.counter,
      },
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.authenticationInfo) {
      return NextResponse.json(
        { error: "Passkey cryptographic signature verification failed." },
        { status: 401 }
      );
    }

    // 4. Update usage counter in Convex to prevent replay attacks
    const { newCounter } = verification.authenticationInfo;
    await convex.mutation(api.passkeys.updatePasskeyUsage, {
      credentialId: passkey.credentialId,
      newCounter,
    });

    return NextResponse.json({
      success: true,
      verified: true,
      user: {
        userId: passkey.userId,
        clerkId: passkey.clerkId,
        email: passkey.userEmail,
        name: passkey.userName,
        deviceName: passkey.deviceName,
        credentialId: passkey.credentialId,
      },
    });
  } catch (err: unknown) {
    console.error("[WebAuthn Authenticate Verify Error]:", err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
