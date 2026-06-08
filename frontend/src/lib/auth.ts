import { verify, sign } from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";

export interface TokenPayload {
  id: number;
  email: string;
  role: Role;
  schoolUnitId: number | null;
}

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export function signToken(payload: TokenPayload): string {
  return sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

export function verifyToken(token: string): TokenPayload {
  return verify(token, JWT_SECRET) as TokenPayload;
}

/**
 * Extracts and verifies the JWT token from the request cookie.
 * Returns the decoded payload if valid, or a 401 NextResponse if not.
 */
export async function requireAuth(
  req: NextRequest
): Promise<TokenPayload | NextResponse> {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "Autentikasi gagal: Sesi tidak valid atau telah berakhir",
      },
      { status: 401 }
    );
  }

  try {
    const decoded = verifyToken(token);
    return decoded;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Autentikasi gagal: Sesi tidak valid atau telah berakhir",
      },
      { status: 401 }
    );
  }
}

/**
 * Helper to check if the requireAuth result is an error response.
 */
export function isAuthError(
  result: TokenPayload | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
