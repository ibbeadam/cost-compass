import { NextRequest, NextResponse } from "next/server";
import { withServerPermissions } from "@/lib/permissions/server-middleware";
import { prisma } from "@/lib/prisma";

export const GET = withServerPermissions(
  async (request: NextRequest, context) => {
    try {
      const currentUser = context.user;

      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get("limit") || "20");
      const page = parseInt(searchParams.get("page") || "1");
      const days = parseInt(searchParams.get("days") || "30");

      // Calculate date range
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Get user's own activity logs directly from database
      // Users can only see their own activity logs
      const where = {
        userId: currentUser.id,
        timestamp: {
          gte: fromDate,
        },
      };

      // Get total count
      const total = await prisma.auditLog.count({ where });

      // Get audit logs
      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          timestamp: "desc",
        },
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      const response = {
        logs,
        total,
        page,
        limit,
        totalPages,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error("Error fetching user activity:", error);
      return NextResponse.json(
        { error: "Failed to fetch activity logs" },
        { status: 500 }
      );
    }
  },
  {
    permissions: ["activity.own.read"],
    auditAction: "READ",
    auditResource: "user_activity",
    rateLimiting: {
      maxRequests: 30,
      windowMs: 60000
    }
  }
);