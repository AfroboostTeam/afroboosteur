import { NextRequest, NextResponse } from 'next/server';
import { addDoc, collection, Timestamp, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userService } from '@/lib/database';
import QRCode from 'qrcode';

// Interface for discount card data
interface DiscountCard {
  id?: string;
  coachId: string;
  coachName: string;
  title: string;
  description: string;
  discountPercentage: number;
  code: string;
  qrCodeImage?: string; // Base64 data URL for QR code
  isActive: boolean;
  expirationDate?: Date;
  usageLimit?: number;
  timesUsed: number;
  createdAt: Date;
  updatedAt: Date;
  userEmail?: string;
}

// Generate unique discount code
const generateDiscountCode = (coachName: string, percentage: number): string => {
  const timestamp = Date.now().toString().slice(-6);
  const cleanName = coachName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
  return `${cleanName}${percentage}${timestamp}`;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const {
      coachId,
      title,
      description,
      discountPercentage,
      userEmail,
      courseId,
      cardType,
      expirationDate,
      maxUsage,
      code: providedCode, // Optional: for duplication
      qrCodeImage: providedQrCodeImage // Optional: for duplication
    } = body;

    // Validate required fields
    if (!coachId || !discountPercentage) {
      return NextResponse.json(
        { error: 'Missing required fields: coachId, discountPercentage' },
        { status: 400 }
      );
    }

    // Validate discount percentage
    if (discountPercentage < 1 || discountPercentage > 100) {
      return NextResponse.json(
        { error: 'Discount percentage must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Get coach details
    const coach = await userService.getById(coachId);
    if (!coach) {
      return NextResponse.json(
        { error: 'Coach not found' },
        { status: 404 }
      );
    }

    // Validate coach role
    if (coach.role !== 'coach') {
      return NextResponse.json(
        { error: 'Only coaches can create discount cards' },
        { status: 403 }
      );
    }

    // If userEmail is provided, validate it exists
    if (userEmail) {
      const targetUser = await userService.getByEmail(userEmail);
      if (!targetUser) {
        return NextResponse.json(
          { error: 'Target user email not found' },
          { status: 400 }
        );
      }
    }

    // Generate unique discount code (or use provided one for duplication)
    let code = providedCode;
    let qrCodeImage = providedQrCodeImage;

    if (!code) {
      // Generate new code if not provided
      code = generateDiscountCode(coach.firstName + coach.lastName, discountPercentage);

      // Check if code already exists (very unlikely but good to check)
      const existingCodeQuery = query(
        collection(db, 'discount_cards'),
        where('code', '==', code)
      );
      const existingCodeSnapshot = await getDocs(existingCodeQuery);
      
      if (!existingCodeSnapshot.empty) {
        // Regenerate with additional timestamp
        code = generateDiscountCode(coach.firstName + coach.lastName, discountPercentage) + Math.random().toString(36).substr(2, 3);
      }
    } else {
      // If code is provided, check if it already exists
      const existingCodeQuery = query(
        collection(db, 'discount_cards'),
        where('code', '==', code.toUpperCase())
      );
      const existingCodeSnapshot = await getDocs(existingCodeQuery);
      
      if (!existingCodeSnapshot.empty) {
        return NextResponse.json(
          { error: 'This discount code already exists. Please try again.' },
          { status: 400 }
        );
      }
      code = code.toUpperCase();
    }

    // Generate QR code if not provided
    if (!qrCodeImage) {
      qrCodeImage = await QRCode.toDataURL(code, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    }

    // Create discount card object
    const discountCard: Omit<DiscountCard, 'id'> = {
      coachId,
      coachName: `${coach.firstName} ${coach.lastName}`,
      title: title || 'Special Discount',
      description: description || '',
      discountPercentage,
      code,
      qrCodeImage,
      isActive: true,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      usageLimit: maxUsage || undefined,
      timesUsed: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(userEmail ? { userEmail } : {}),
      ...(courseId ? { courseId } : {}),
      ...(cardType ? { cardType } : {})
    };

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'discount_cards'), {
      ...discountCard,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return NextResponse.json({
      success: true,
      discountCard: {
        id: docRef.id,
        ...discountCard
      }
    });

  } catch (error) {
    console.error('Error creating discount card:', error);
    return NextResponse.json(
      { error: 'Failed to create discount card' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get('coachId');

    if (!coachId) {
      return NextResponse.json(
        { error: 'coachId parameter is required' },
        { status: 400 }
      );
    }

    // Get coach's discount cards
    const discountCardsQuery = query(
      collection(db, 'discount_cards'),
      where('coachId', '==', coachId)
    );
    
    const querySnapshot = await getDocs(discountCardsQuery);
    const discountCards = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to dates
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      expirationDate: doc.data().expirationDate?.toDate() || null
    }));

    return NextResponse.json({
      success: true,
      discountCards
    });

  } catch (error) {
    console.error('Error fetching discount cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discount cards' },
      { status: 500 }
    );
  }
}