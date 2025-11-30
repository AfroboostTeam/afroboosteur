import { NextRequest, NextResponse } from 'next/server';
import { helmetReservationService, userQRCodeService, userService, courseService } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user's reservations
    let reservations = await helmetReservationService.getByUserId(userId);

    // Enrich reservations with coach names if missing
    for (const reservation of reservations) {
      if (!reservation.coachName || reservation.coachName === '' || reservation.coachName === 'Coach') {
        try {
          // Try to get coach name from course
          if (reservation.courseId) {
            const course = await courseService.getById(reservation.courseId);
            if (course?.coachName) {
              reservation.coachName = course.coachName;
            } else if (reservation.coachId) {
              // Try to get coach name from user
              const coach = await userService.getById(reservation.coachId);
              if (coach) {
                reservation.coachName = `${coach.firstName} ${coach.lastName}`;
              }
            }
          } else if (reservation.coachId) {
            // Try to get coach name from user
            const coach = await userService.getById(reservation.coachId);
            if (coach) {
              reservation.coachName = `${coach.firstName} ${coach.lastName}`;
            }
          }
        } catch (error) {
          console.error(`Error enriching reservation ${reservation.id} with coach name:`, error);
          // Keep existing coachName or leave empty
        }
      }
    }

    // Get user's QR code
    const userQRCode = await userQRCodeService.getByUserId(userId);

    return NextResponse.json({
      success: true,
      reservations,
      qrCode: userQRCode?.qrCodeImage || null,
      qrCodeData: userQRCode?.qrCodeData || null
    });

  } catch (error: any) {
    console.error('Error fetching user reservations:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

