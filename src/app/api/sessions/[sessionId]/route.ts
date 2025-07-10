/**
 * Individual Session Management API
 * Handles operations on specific sessions
 */

import { NextRequest } from "next/server";
import { handleSessionManagement } from "@/lib/session/session-middleware";

export async function DELETE(request: NextRequest) {
  return handleSessionManagement(request);
}