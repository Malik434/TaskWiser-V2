import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { adminDb } from "@/lib/firebase-admin";

const NONCE_COLLECTION = "wallet_nonces";
const NONCE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Wallet address is required." },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();
    const nonce = randomBytes(32).toString("hex");
    const now = Date.now();

    await adminDb.collection(NONCE_COLLECTION).doc(normalizedAddress).set({
      nonce,
      createdAt: now,
      expiresAt: now + NONCE_TTL_MS,
    });

    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("Error generating nonce:", error);
    return NextResponse.json(
      { error: "Failed to generate nonce." },
      { status: 500 }
    );
  }
}

