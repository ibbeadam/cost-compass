import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log(`\n🚨 SIMPLE DEBUG REQUEST`);
  console.log(`🕐 Time: ${new Date().toISOString()}`);
  console.log(`🔍 URL: ${request.url}`);
  console.log(`🌐 Method: ${request.method}`);
  console.log(`🍪 Has cookies: ${!!request.headers.get('cookie')}`);
  console.log(`🗂️ Headers:`, Object.fromEntries(request.headers.entries()));

  return NextResponse.json({
    success: true,
    message: "Debug endpoint reached successfully",
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method,
    hasCookies: !!request.headers.get('cookie')
  });
}

export async function POST(request: NextRequest) {
  console.log(`\n🚨 SIMPLE DEBUG POST REQUEST`);
  console.log(`🕐 Time: ${new Date().toISOString()}`);
  console.log(`🔍 URL: ${request.url}`);

  return NextResponse.json({
    success: true,
    message: "Debug POST endpoint reached successfully",
    timestamp: new Date().toISOString()
  });
}