import { NextRequest, NextResponse } from "next/server";
import { verifySepoliaAnchor } from "@/lib/blockchain/sepolia-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawVcJson } = body;

    if (!rawVcJson || typeof rawVcJson !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid rawVcJson in request body." },
        { status: 400 }
      );
    }

    const result = await verifySepoliaAnchor(rawVcJson);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    console.error("[API /api/blockchain/verify] Error:", err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
