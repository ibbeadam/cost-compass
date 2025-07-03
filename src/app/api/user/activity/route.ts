import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

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
}