import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserForSessionRefresh } from '@/lib/session-refresh';

/**
 * API endpoint to refresh user permissions
 * This endpoint updates the user's session with latest permissions from database
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    
    // Get latest user data with updated permissions
    const updatedUserData = await getUserForSessionRefresh(userId);
    
    if (!updatedUserData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Return the updated permissions
    // The client will use this to update the session
    return NextResponse.json({
      success: true,
      data: {
        permissions: updatedUserData.permissions,
        role: updatedUserData.role,
        lastRefresh: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error refreshing permissions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to refresh permissions' 
      },
      { status: 500 }
    );
  }
}