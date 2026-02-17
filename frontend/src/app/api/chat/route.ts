import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/apiBaseUrl";

export async function POST(request: Request) {
  const baseUrl = getApiBaseUrl();

  try {
    const payload = await request.json();
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Backend unreachable" },
      { status: 502 }
    );
  }
}
