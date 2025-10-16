import { NextRequest, NextResponse } from 'next/server';
import { GroupService } from '@/services/groups';
import { AuthService } from '@/lib/auth';
import { z } from 'zod';

const joinGroupSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { inviteCode } = joinGroupSchema.parse(body);

    // Get current user from session
    const { user } = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await GroupService.joinGroupByInviteCode(inviteCode, user.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Successfully joined the group',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Join group error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
