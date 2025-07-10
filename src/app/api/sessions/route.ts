/**
 * Session Management API Routes
 * Provides endpoints for managing user sessions and device trust
 */

import { NextRequest } from "next/server";
import { handleSessionManagement } from "@/lib/session/session-middleware";

export async function GET(request: NextRequest) {
  return handleSessionManagement(request);
}

export async function DELETE(request: NextRequest) {
  return handleSessionManagement(request);
}

export async function POST(request: NextRequest) {
  return handleSessionManagement(request);
}