import { NextRequest, NextResponse } from 'next/server';
import { giftCardService } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardCode, amount, customerId, customerName, businessId, orderId, bookingId, transactionType } = body;

    // Validate required fields
    if (!cardCode || !amount || !customerId || !customerName) {
      return NextResponse.json(
        { error: 'Card code, amount, customer ID, and customer name are required' },
        { status: 400 }
      );
    }

    // Use the gift card (this will mark it as used and deduct the amount)
    const result = await giftCardService.validateAndUse(
      String(cardCode).trim().toUpperCase(), 
      Number(amount), 
      String(customerId).trim(), 
      String(customerName).trim(),
      businessId,
      orderId, 
      bookingId,
      transactionType
    );

    return NextResponse.json({
      success: true,
      message: 'Gift card used successfully',
      ...result
    });

  } catch (error: any) {
    console.error('Error using gift card:', error);
    
    // Return specific error messages
    if (error.message && (
      error.message.includes('not found') || 
      error.message.includes('not active') || 
      error.message.includes('expired') || 
      error.message.includes('used') ||
      error.message.includes('balance') ||
      error.message.includes('can only be used with')
    )) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


