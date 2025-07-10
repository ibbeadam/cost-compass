import { NextRequest, NextResponse } from "next/server";
import { withServerPermissions } from "@/lib/permissions/server-middleware";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { updatePropertyAction } from "@/actions/propertyActions";
import { createAuditLogAction } from "@/actions/auditLogActions";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const POST = withServerPermissions(
  async (request: NextRequest, context) => {
    console.log("=== LOGO UPLOAD API ROUTE CALLED ===");
    console.log("Request URL:", request.url);
    console.log("Request method:", request.method);
    console.log("Request headers:", Object.fromEntries(request.headers.entries()));
    
    try {
      console.log("Logo upload started");
      
      const currentUser = context.user;
      
      console.log("Current user for logo upload:", currentUser ? { 
        id: currentUser.id, 
        email: currentUser.email 
      } : "null");

    const formData = await request.formData();
    const file = formData.get("logo") as File;
    const propertyId = formData.get("propertyId") as string;
    
    console.log("Logo upload request:", {
      propertyId,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });

    if (!file) {
      return NextResponse.json(
        { error: "No logo file provided" },
        { status: 400 }
      );
    }

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "property-logos");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `property-${propertyId}-${timestamp}.${fileExtension}`;
    const filepath = join(uploadsDir, filename);

    // Convert file to buffer and save
    console.log("Saving logo file to:", filepath);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);
    console.log("Logo file saved successfully");

    // Update property with logo path
    const logoUrl = `/uploads/property-logos/${filename}`;
    console.log("Updating property with logo URL:", logoUrl);
    
    // Use direct database update since server action has auth issues
    const { prisma } = await import("@/lib/prisma");
    
    // Get the current property to check for existing logo
    const currentProperty = await prisma.property.findUnique({
      where: { id: parseInt(propertyId) },
      select: { logoUrl: true }
    });
    
    // Delete old logo file if it exists
    if (currentProperty?.logoUrl) {
      try {
        const oldLogoPath = join(process.cwd(), "public", currentProperty.logoUrl);
        await unlink(oldLogoPath);
        console.log("Old logo file deleted:", oldLogoPath);
      } catch (deleteError) {
        console.warn("Could not delete old logo file:", deleteError?.message);
        // Don't fail the upload if we can't delete the old file
      }
    }
    
    await prisma.property.update({
      where: { id: parseInt(propertyId) },
      data: { logoUrl: logoUrl }
    });
    
    console.log("Property updated with logo URL successfully via direct DB update");

    // Create audit log (optional - skip if it fails)
    try {
      await createAuditLogAction({
        userId: currentUser.id,
        propertyId: parseInt(propertyId),
        action: "UPDATE",
        resource: "property",
        resourceId: propertyId,
        details: {
          field: "logoUrl",
          filename: filename,
          fileSize: file.size,
          fileType: file.type,
        },
      });
      console.log("Audit log created successfully");
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError?.message);
      // Don't fail the whole operation if audit logging fails
    }

    return NextResponse.json({
      success: true,
      logoUrl,
      message: "Property logo updated successfully",
    });

  } catch (error) {
    console.error("Error uploading property logo:", {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      errorType: error?.constructor?.name,
      code: error?.code
    });
    
    // Return detailed error information
    return NextResponse.json(
      { 
        error: "Failed to upload property logo",
        details: error?.message || 'Unknown error',
        code: error?.code || 'UNKNOWN'
      },
      { status: 500 }
    );
  }
},
{
  permissions: ["properties.update"],
  auditAction: "UPDATE",
  auditResource: "property_logo",
  rateLimiting: {
    maxRequests: 5,
    windowMs: 60000
  }
}
);

export const DELETE = withServerPermissions(
  async (request: NextRequest, context) => {
    try {
      const currentUser = context.user;

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    // Get current property to check for existing logo
    const { prisma } = await import("@/lib/prisma");
    const currentProperty = await prisma.property.findUnique({
      where: { id: parseInt(propertyId) },
      select: { logoUrl: true }
    });

    // Delete current logo file if it exists
    if (currentProperty?.logoUrl) {
      try {
        const oldLogoPath = join(process.cwd(), "public", currentProperty.logoUrl);
        await unlink(oldLogoPath);
        console.log("Property logo file deleted:", oldLogoPath);
      } catch (deleteError) {
        console.warn("Could not delete property logo file:", deleteError?.message);
        // Don't fail the operation if we can't delete the file
      }
    }

    // Remove logo from property
    await updatePropertyAction(parseInt(propertyId), {
      logoUrl: null,
    });

    // Create audit log
    await createAuditLogAction({
      userId: currentUser.id,
      propertyId: parseInt(propertyId),
      action: "UPDATE",
      resource: "property",
      resourceId: propertyId,
      details: {
        field: "logoUrl",
        action: "removed",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Property logo removed successfully",
    });

  } catch (error) {
    console.error("Error removing property logo:", error);
    return NextResponse.json(
      { error: "Failed to remove property logo" },
      { status: 500 }
    );
  }
},
{
  permissions: ["properties.update"],
  auditAction: "DELETE",
  auditResource: "property_logo",
  rateLimiting: {
    maxRequests: 3,
    windowMs: 60000
  }
}
);