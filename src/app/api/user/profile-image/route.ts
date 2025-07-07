import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { getCurrentUser } from "@/lib/server-auth";
import { updateUserAction } from "@/actions/prismaUserActions";
import { createAuditLogAction } from "@/actions/auditLogActions";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
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
    const uploadsDir = join(process.cwd(), "public", "uploads", "profile-images");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const filename = `${currentUser.id}-${timestamp}.${fileExtension}`;
    const filepath = join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Update user profile with image path
    const imageUrl = `/uploads/profile-images/${filename}`;
    
    // Delete old profile image if it exists
    if (currentUser.profileImage) {
      try {
        const oldImagePath = join(process.cwd(), "public", currentUser.profileImage);
        await unlink(oldImagePath);
        console.log("Old profile image deleted:", oldImagePath);
      } catch (deleteError) {
        console.warn("Could not delete old profile image:", deleteError?.message);
        // Don't fail the upload if we can't delete the old file
      }
    }
    
    await updateUserAction(currentUser.id, {
      profileImage: imageUrl,
    });

    // Create audit log
    await createAuditLogAction({
      userId: currentUser.id,
      action: "UPDATE",
      resource: "user",
      resourceId: currentUser.id.toString(),
      details: {
        field: "profileImage",
        filename: filename,
        fileSize: file.size,
        fileType: file.type,
      },
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      message: "Profile image updated successfully",
    });

  } catch (error) {
    console.error("Error uploading profile image:", error);
    return NextResponse.json(
      { error: "Failed to upload profile image" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Delete current profile image file if it exists
    if (currentUser.profileImage) {
      try {
        const oldImagePath = join(process.cwd(), "public", currentUser.profileImage);
        await unlink(oldImagePath);
        console.log("Profile image file deleted:", oldImagePath);
      } catch (deleteError) {
        console.warn("Could not delete profile image file:", deleteError?.message);
        // Don't fail the operation if we can't delete the file
      }
    }

    // Remove profile image from user
    await updateUserAction(currentUser.id, {
      profileImage: null,
    });

    // Create audit log
    await createAuditLogAction({
      userId: currentUser.id,
      action: "UPDATE",
      resource: "user",
      resourceId: currentUser.id.toString(),
      details: {
        field: "profileImage",
        action: "removed",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile image removed successfully",
    });

  } catch (error) {
    console.error("Error removing profile image:", error);
    return NextResponse.json(
      { error: "Failed to remove profile image" },
      { status: 500 }
    );
  }
}