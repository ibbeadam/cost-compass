/**
 * Session Statistics API
 * Provides session analytics for administrators
 */

import { NextRequest } from "next/server";
import { handleSessionManagement } from "@/lib/session/session-middleware";

export async function GET(request: NextRequest) {
  return handleSessionManagement(request);
}