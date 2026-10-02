import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/lib/config";

const hopByHop = new Set(["connection", "content-length", "host", "keep-alive", "transfer-encoding"]);

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = `${siteConfig.apiBaseUrl}/v1/${path.join("/")}${request.nextUrl.search}`;
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!hopByHop.has(key.toLowerCase())) headers.set(key, value);
  });

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store",
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Cannot reach the Trickle API. Check NEXT_PUBLIC_API_BASE_URL and that the backend is running." },
      { status: 502 },
    );
  }
}

export const DELETE = proxy;
export const GET = proxy;
export const PATCH = proxy;
export const POST = proxy;
export const PUT = proxy;
