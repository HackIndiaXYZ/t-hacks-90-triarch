import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { anchorCredentialToSepolia } from "@/lib/blockchain/sepolia-service";

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
    const { rawVcJson } = body;

    if (!rawVcJson || typeof rawVcJson !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid rawVcJson in request body." },
        { status: 400 }
      );
    }

    // Execute server-side Sepolia anchoring
    const result = await anchorCredentialToSepolia(rawVcJson);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    console.error("[API /api/blockchain/anchor] Error:", err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
