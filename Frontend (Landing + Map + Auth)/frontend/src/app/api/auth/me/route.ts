import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        provider: user.provider,
        profile: user.profile,
        vaultAnswers: user.vaultAnswers,
      },
    });
  } catch (error) {
    console.error("Auth Me Error:", error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
