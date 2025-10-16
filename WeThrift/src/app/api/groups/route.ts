import { NextRequest, NextResponse } from 'next/server';
import { GroupService } from '@/services/groups';
import { AuthService } from '@/lib/auth';
import { z } from 'zod';

const createGroupSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  groupType: z.enum(['community', 'formal', 'corporate']),
  maxMembers: z.number().min(2, 'Maximum members must be at least 2').max(1000, 'Maximum members cannot exceed 1000'),
  privacySettings: z.object({
    isPublic: z.boolean(),
    allowInvites: z.boolean(),
    requireApproval: z.boolean(),
  }),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (userId) {
      const { groups, error } = await GroupService.getUserGroups(userId);
      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, data: groups });
    }

    if (query) {
      const { groups, error } = await GroupService.searchGroups(query, limit);
      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, data: groups });
    }

    return NextResponse.json(
      { success: false, error: 'Missing required parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Get groups error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createGroupSchema.parse(body);

    // Get current user from session
    const { user } = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const groupData = {
      name: validatedData.name,
      description: validatedData.description,
      group_type: validatedData.groupType,
      max_members: validatedData.maxMembers,
      privacy_settings: validatedData.privacySettings,
      settings: {},
      commission_rate: 2.5, // Default commission rate
    };

    const { data, error } = await GroupService.createGroup(groupData, user.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Group created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create group error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
