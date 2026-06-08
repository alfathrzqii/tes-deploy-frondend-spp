import { NextResponse } from "next/server";

export async function POST() {
  const isProduction = process.env.NODE_ENV === "production";

  const response = NextResponse.json({
    success: true,
    message: "Logout berhasil",
  });

  response.cookies.set("token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
