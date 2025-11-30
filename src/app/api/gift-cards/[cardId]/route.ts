import { NextRequest, NextResponse } from 'next/server';
import { giftCardService } from '@/lib/database';
import { doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await context.params;
    const body = await request.json();
    const { issuerId, amount, description, expirationDate } = body;

    if (!cardId) {
      return NextResponse.json(
        { error: 'Card ID is required' },
        { status: 400 }
      );
    }

    if (!issuerId) {
      return NextResponse.json(
        { error: 'Issuer ID is required' },
        { status: 400 }
      );
    }

    // Get the gift card to verify ownership
    const giftCard = await giftCardService.getById(cardId);
    if (!giftCard) {
      return NextResponse.json(
        { error: 'Gift card not found' },
        { status: 404 }
      );
    }

    // Verify that the user is the issuer of this card
    if (giftCard.issuerId !== issuerId) {
      return NextResponse.json(
        { error: 'Unauthorized to edit this gift card' },
        { status: 403 }
      );
    }

    // Only allow editing if card is not used
    if (giftCard.isUsed) {
      return NextResponse.json(
        { error: 'Cannot edit a gift card that has been used' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {
      updatedAt: Timestamp.now()
    };

    if (amount !== undefined) {
      updateData.amount = parseFloat(amount);
      // Only update remaining amount if card hasn't been used
      if (!giftCard.isUsed) {
        updateData.remainingAmount = parseFloat(amount);
      }
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (expirationDate) {
      updateData.expirationDate = expirationDate instanceof Date 
        ? Timestamp.fromDate(expirationDate)
        : Timestamp.fromDate(new Date(expirationDate));
    }

    // Update the gift card
    await updateDoc(doc(db, 'giftCards', cardId), updateData);

    return NextResponse.json({
      success: true,
      message: 'Gift card updated successfully'
    });

  } catch (error) {
    console.error('Error updating gift card:', error);
    return NextResponse.json(
      { error: 'Failed to update gift card' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await context.params;
    const body = await request.json();
    const { issuerId } = body;

    if (!cardId) {
      return NextResponse.json(
        { error: 'Card ID is required' },
        { status: 400 }
      );
    }

    if (!issuerId) {
      return NextResponse.json(
        { error: 'Issuer ID is required' },
        { status: 400 }
      );
    }

    // Get the gift card to verify ownership
    const giftCard = await giftCardService.getById(cardId);
    if (!giftCard) {
      return NextResponse.json(
        { error: 'Gift card not found' },
        { status: 404 }
      );
    }

    // Verify that the user is the issuer of this card
    if (giftCard.issuerId !== issuerId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this gift card' },
        { status: 403 }
      );
    }

    // Delete the gift card directly using deleteDoc
    const docRef = doc(db, 'giftCards', cardId);
    await deleteDoc(docRef);

    return NextResponse.json({
      success: true,
      message: 'Gift card deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting gift card:', error);
    return NextResponse.json(
      { error: 'Failed to delete gift card' },
      { status: 500 }
    );
  }
}