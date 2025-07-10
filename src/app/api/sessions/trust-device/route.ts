/**
 * Device Trust Management API
 * Allows users to trust/untrust devices
 */

import { NextRequest } from "next/server";
import { handleSessionManagement } from "@/lib/session/session-middleware";

export async function POST(request: NextRequest) {
  return handleSessionManagement(request);
}