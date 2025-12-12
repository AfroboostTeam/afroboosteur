import { NextRequest, NextResponse } from 'next/server';
import { giftCardService } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { cardCode, amount, customerId, customerName, businessId, orderId, bookingId, transactionType } = await request.json();

    // Validate required fields
    if (!cardCode || !amount || !customerId || !customerName) {
      return NextResponse.json(
        { error: 'Card code, amount, customer ID, and customer name are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate transaction type for proper cross-checking
    if (!transactionType || !['course', 'product', 'token'].includes(transactionType)) {
      return NextResponse.json(
        { error: 'Valid transaction type is required (course, product, token)' },
        { status: 400 }
      );
    }

    // Validate the gift card (without using it - it will be used when payment is completed)
    const result = await giftCardService.validate(
      cardCode.trim().toUpperCase(), 
      Number(amount), 
      customerId.trim(), 
      customerName.trim(),
      businessId,
      transactionType
    );

    console.log('🔍 Gift card validation result:', {
      amountToUse: result.amountToUse,
      remainingAmountAfterUse: result.remainingAmountAfterUse,
      amountAvailable: result.amountAvailable,
      requestedAmount: Number(amount)
    });

    const responseData = {
      success: true,
      valid: true,
      message: 'Gift card validated successfully',
      amount: result.amountToUse, // Amount that will be used
      amountToUse: result.amountToUse, // Also include amountToUse for fallback
      remainingAmount: result.remainingAmountAfterUse, // Remaining amount after use
      amountAvailable: result.amountAvailable, // Current available balance
      cardCode: cardCode.trim().toUpperCase()
    };
    
    console.log('📤 Sending response:', responseData);
    
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Error validating gift card:', error);
    
    // Return specific error messages for gift card validation
    if (error.message.includes('not found') || 
        error.message.includes('not active') || 
        error.message.includes('expired') || 
        error.message.includes('used') ||
        error.message.includes('balance') ||
        error.message.includes('can only be used with')) {
      return NextResponse.json(
        { 
          success: false,
          valid: false,
          error: error.message 
        },
        { status: 200 } // Return 200 so frontend can handle it gracefully
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
