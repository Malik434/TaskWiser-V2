import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const NONCE_COLLECTION = "wallet_nonces";

const DEFAULT_USAGE_LEVEL = "contributor";

const buildMessage = (nonce: string) => `TaskWiser authentication nonce:\n${nonce}`;

export async function POST(request: Request) {
  try {
    const { address, signature } = await request.json();

    if (!address || typeof address !== "string") {
      const response = NextResponse.json(
        { error: "Wallet address is required." },
        { status: 400 }
      );
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      return response;
    }

    if (!signature || typeof signature !== "string") {
      const response = NextResponse.json(
        { error: "Signature is required." },
        { status: 400 }
      );
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      return response;
    }

    const normalizedAddress = address.toLowerCase();
    const nonceDocRef = adminDb
      .collection(NONCE_COLLECTION)
      .doc(normalizedAddress);
    const nonceDoc = await nonceDocRef.get();

    if (!nonceDoc.exists) {
      const response = NextResponse.json(
        { error: "Nonce not found. Please request a new one." },
        { status: 400 }
      );
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      return response;
    }

    const data = nonceDoc.data() as {
      nonce?: string;
      expiresAt?: number;
    };

    if (!data?.nonce) {
      await nonceDocRef.delete();
      const response = NextResponse.json(
        { error: "Nonce data invalid. Please retry." },
        { status: 400 }
      );
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      return response;
    }

    if (data.expiresAt && Date.now() > data.expiresAt) {
      await nonceDocRef.delete();
      const response = NextResponse.json(
        { error: "Nonce expired. Please request a new one." },
        { status: 400 }
      );
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      return response;
    }

    const expectedMessage = buildMessage(data.nonce);
    const recoveredAddress = ethers
      .verifyMessage(expectedMessage, signature)
      .toLowerCase();

    if (recoveredAddress !== normalizedAddress) {
      const response = NextResponse.json(
        { error: "Signature does not match wallet address." },
        { status: 400 }
      );
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      return response;
    }

    await nonceDocRef.delete();

    const uid = normalizedAddress;
    const customToken = await adminAuth.createCustomToken(uid, {
      walletAddress: normalizedAddress,
      usageLevel: DEFAULT_USAGE_LEVEL,
    });

    const response = NextResponse.json({ token: customToken });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  } catch (error) {
    console.error("Error verifying wallet signature:", error);
    const response = NextResponse.json(
      { error: "Failed to authenticate wallet." },
      { status: 500 }
    );
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  }
}