import { NextRequest, NextResponse } from 'next/server';
import { USSDService } from '@/services/ussd';
import { z } from 'zod';

const ussdRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  phoneNumber: z.string().regex(/^(\+234|234|0)?[789][01]\d{8}$/, 'Invalid Nigerian phone number'),
  userInput: z.string().min(1, 'User input is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, phoneNumber, userInput } = ussdRequestSchema.parse(body);

    const response = await USSDService.processUSSDRequest(sessionId, phoneNumber, userInput);

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('USSD processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint for USSD provider
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'WeThrift USSD Service is running',
    timestamp: new Date().toISOString(),
  });
}
