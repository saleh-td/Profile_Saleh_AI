import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/apiBaseUrl";

export async function GET() {
  const baseUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/health`, {
      // Always fetch live health in dev.
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { status: "error", reason: "backend_unreachable" },
      { status: 502 }
    );
  }
}
