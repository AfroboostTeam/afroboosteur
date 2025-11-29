import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  getDocsFromServer,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  arrayUnion,
  arrayRemove,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Course, Offer, OfferPurchase, Booking, Review, ChatMessage, Notification, Transaction, FAQItem, User, DirectMessage, EditableContent, CustomEmoji, GroupChat, GroupChatMessage, CourseSchedule, SubscriptionPlan, UserSubscription, SessionUsage, SubscriptionSettings, BackgroundSettings, CreditTransaction, SocialMediaLinks, HomePageSettings, StudentCourseSession, CoachEarnings, EarningTransaction, WithdrawalRequest, TokenPackage, StudentTokenPackage, TokenUsage, TokenTransaction, Publication, PublicationLike, PublicationComment, PublicationCommentLike, PublicationSave, SaveFolder, PublicationShare, PartnershipRequest, PartnershipContent, PartnershipMeeting, SellerApplication, SellerProfile, ProductCategory, Product, Order, OrderItem, ProductReview, DeliveryTracking, TrackingEvent, SellerEarnings, SellerTransaction, MarketplaceSettings, GiftCard, GiftCardTransaction, ProductVariantType, ProductVariantOption, ProductVariant, DiscountCard, Referral, CoachReferralActivity, CoachReferralLicense, CoachReferralStats, HelmetReservation, UserQRCode } from '@/types';
import { time } from 'console';

// Helper function to remove undefined fields from an object
const removeUndefinedFields = (obj: any): any => {
  // Handle arrays - keep them as is (even if empty)
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item));
  }

  // Handle null or non-objects
  if (obj === null || typeof obj !== 'object' || obj instanceof Date || obj instanceof Timestamp) {
    return obj;
  }

  const cleaned: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null) {
      if (Array.isArray(obj[key])) {
        // Keep arrays, even if empty
        cleaned[key] = obj[key].map((item: any) => removeUndefinedFields(item));
      } else if (typeof obj[key] === 'object' && !(obj[key] instanceof Date) && !(obj[key] instanceof Timestamp)) {
        const nestedCleaned = removeUndefinedFields(obj[key]);
        // Keep object if it has keys or is explicitly an empty object we want to preserve
        if (Object.keys(nestedCleaned).length > 0) {
          cleaned[key] = nestedCleaned;
        }
      } else {
        cleaned[key] = obj[key];
      }
    }
  });
  return cleaned;
};

// User Services
export const userService = {
  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
    const newUser = {
      ...userData,
      preferences: userData.preferences || {
        notifications: {
          email: true,
          whatsapp: true,
          website: true,
        },
        twoFactorEnabled: false,
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'users'), removeUndefinedFields(newUser));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'users', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
  },

  async update(id: string, data: Partial<User>) {
    await updateDoc(doc(db, 'users', id), removeUndefinedFields(data));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'users', id));
  },

  getByEmail: async (email: string): Promise<User | null> => {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as User;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  },

  getByReferralCode: async (referralCode: string): Promise<User | null> => {
    try {
      const q = query(collection(db, 'users'), where('referralCode', '==', referralCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as User;
    } catch (error) {
      console.error('Error getting user by referral code:', error);
      throw error;
    }
  }
};

// Course Services
export const courseService = {
  async create(courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'courses'), removeUndefinedFields({
      ...courseData,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'courses'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];
  },

  async getById(id: string) {
    try {
      console.log(`Fetching course with ID: ${id}`);
      const docSnap = await getDoc(doc(db, 'courses', id));

      if (docSnap.exists()) {
        console.log('Course found:', docSnap.id);
        return { id: docSnap.id, ...docSnap.data() } as Course;
      } else {
        console.log('Course not found');
        return null;
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      return null;
    }
  },

  async getByCoach(coachId: string) {
    const q = query(collection(db, 'courses'), where('coachId', '==', coachId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];
  },

  async getBoosted() {
    const q = query(collection(db, 'courses'), where('boosted', '==', true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];
  },

  async update(id: string, updates: Partial<Course>) {
    await updateDoc(doc(db, 'courses', id), removeUndefinedFields({
      ...updates,
      updatedAt: new Date()
    }));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'courses', id));
  }
};

const COACH_OFFERS_COLLECTION = 'coach_offers';
const OFFER_PURCHASES_COLLECTION = 'offer_purchases';

type OfferTemplate = Omit<Offer, 'id' | 'coachId' | 'coachName' | 'createdAt' | 'updatedAt'>;

const defaultOfferTemplates: OfferTemplate[] = [
  {
    slug: 'discovery-class',
    title: 'Discovery Class',
    subtitle: 'One session to feel the vibe',
    description: 'Perfect for newcomers. Experience the Afroboost energy before committing to a full program.',
    emoji: '🎟',
    price: 30,
    currency: 'CHF',
    buttonLabel: 'Book now',
    paymentMethods: ['credit_card', 'twint', 'gift_card', 'discount_card'],
    highlightItems: [
      'Member discount card accepted',
      'Gift cards welcome',
      'Card & TWINT ready'
    ],
    sortOrder: 1,
    isActive: true
  },
  {
    slug: 'afroboost-subscription',
    title: 'Afroboost Subscription',
    subtitle: 'Choose the plan that fits you best',
    description: 'Stay consistent all year with three curated subscription paths. Switch anytime.',
    emoji: '💳',
    price: 420,
    currency: 'CHF',
    buttonLabel: 'Subscribe now',
    paymentMethods: ['credit_card', 'twint', 'gift_card', 'discount_card'],
    highlightItems: [
      'Annual discount card available',
      'Instant class access',
      'Gift card friendly'
    ],
    options: [
      {
        id: 'option_a',
        label: 'Option A — With discount card',
        description: 'Includes subscription + annual discount card. Payment allowed in 1 or 2 installments.',
        price: 420,
        paymentMethods: ['credit_card', 'twint', 'gift_card', 'discount_card'],
        notes: ['Installment eligible', 'Includes member discount card'],
        isActive: true
      },
      {
        id: 'option_b',
        label: 'Option B — Without discount card',
        description: 'For dancers who do not need a discount card. Gift card payments remain available.',
        price: 640,
        paymentMethods: ['credit_card', 'twint', 'gift_card'],
        notes: ['Gift card ready'],
        isActive: true
      },
      {
        id: 'option_c',
        label: 'Option C — I already have a discount card',
        description: 'Already equipped? Enjoy the reduced subscription price immediately.',
        price: 320,
        paymentMethods: ['credit_card', 'twint', 'gift_card'],
        notes: ['Discount already applied'],
        isActive: true
      }
    ],
    defaultOptionId: 'option_a',
    sortOrder: 2,
    isActive: true
  },
  {
    slug: 'afroboost-pulse-x10',
    title: 'Afroboost Pulse X10',
    subtitle: '10 sessions – valid for 3 months',
    description: 'Secure 10 energizing sessions you can use anytime within the next 3 months.',
    emoji: '🔥',
    price: 150,
    currency: 'CHF',
    buttonLabel: 'Buy now',
    paymentMethods: ['credit_card', 'twint', 'gift_card'],
    highlightItems: [
      '10 guided sessions',
      'Gift cards accepted',
      'Flexible scheduling'
    ],
    sortOrder: 3,
    isActive: true
  }
];

// Shared IDs used for the public "Ready to Dance" offers that appear in the popup
// and in the coach dashboard "Offers" management section.
// Using a constant here guarantees both places read & write the same documents.
export const MAIN_OFFERS_COACH_ID = 'public';
export const MAIN_OFFERS_COACH_NAME = 'Afroboost';

const buildCoachOfferDocId = (coachId: string, slug: string) => `${coachId}-${slug}`;

const mapOfferSnapshot = (snapshot: any): Offer => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
  } as Offer;
};

const sortOffers = (offers: Offer[]) =>
  [...offers].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

export const buildDefaultOffers = (coachId?: string, coachName?: string) =>
  defaultOfferTemplates.map((template) => ({
    ...template,
    id: coachId ? buildCoachOfferDocId(coachId, template.slug) : template.slug,
    coachId: coachId || MAIN_OFFERS_COACH_ID,
    coachName: coachName || MAIN_OFFERS_COACH_NAME,
    options: template.options?.map(option => ({
      ...option,
      isActive: option.isActive !== false
    })),
    isActive: template.isActive !== false,
    createdAt: new Date(),
    updatedAt: new Date()
  })) as Offer[];

export const offerService = {
  async ensureDefaults(coachId: string, coachName?: string, forceRefresh = false) {
    try {
      await Promise.all(
        defaultOfferTemplates.map(async (template) => {
          const docId = buildCoachOfferDocId(coachId, template.slug);
          const offerRef = doc(db, COACH_OFFERS_COLLECTION, docId);
          const offerSnap = await getDoc(offerRef);

          if (!offerSnap.exists()) {
            const payload = removeUndefinedFields({
              ...template,
              coachId,
              coachName,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            await setDoc(offerRef, payload);
          }
        })
      );

      return this.getByCoach(coachId, forceRefresh);
    } catch (error) {
      console.warn('Falling back to default offers for coach due to error:', error);
      return buildDefaultOffers(coachId, coachName);
    }
  },

  async getByCoach(coachId: string, forceRefresh = false) {
    try {
      const qCoach = query(
        collection(db, COACH_OFFERS_COLLECTION),
        where('coachId', '==', coachId)
      );

      // If forceRefresh is true, wait a bit and use getDocsFromServer to bypass cache
      if (forceRefresh) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second for Firestore to process
      }

      let snapshot;
      try {
        // Use getDocsFromServer to bypass cache when forceRefresh is true
        if (forceRefresh) {
          snapshot = await getDocsFromServer(qCoach);
          console.log('Fetched coach offers from server (bypassing cache):', snapshot.docs.length, 'offers');
        } else {
          snapshot = await getDocs(qCoach);
          console.log('Fetched coach offers from cache:', snapshot.docs.length, 'offers');
        }
      } catch (serverError) {
        // If server fetch fails (e.g., offline), fall back to regular getDocs
        console.warn('Server fetch failed, using cache:', serverError);
        snapshot = await getDocs(qCoach);
      }

      const offers = snapshot.docs.map(mapOfferSnapshot);
      if (!offers.length) {
        return buildDefaultOffers(coachId);
      }
      return sortOffers(offers);
    } catch (error) {
      console.error('Error loading coach offers, using defaults:', error);
      return sortOffers(buildDefaultOffers(coachId));
    }
  },

  async getActiveOffers(forceRefresh = false) {
    try {
      // Always use the main/public coach offers for the Ready to Dance popup.
      // This ensures the popup and the coach dashboard "Offers" section are
      // editing and reading the exact same three offers.
      const offersForMainCoach = await this.getByCoach(MAIN_OFFERS_COACH_ID, forceRefresh);
      const activeOffers = offersForMainCoach.filter(offer => offer.isActive !== false);

      console.log('Active offers for main coach after filtering:', activeOffers.length);
      console.log('Offer details:', activeOffers.map(o => ({
        id: o.id,
        title: o.title,
        subtitle: o.subtitle,
        description: o.description,
        isActive: o.isActive,
        coachId: o.coachId,
        updatedAt: o.updatedAt
      })));

      if (!activeOffers.length) {
        console.warn('No active offers found for main coach, using defaults');
        return sortOffers(buildDefaultOffers(MAIN_OFFERS_COACH_ID, MAIN_OFFERS_COACH_NAME));
      }

      return sortOffers(activeOffers);
    } catch (error) {
      console.error('Error loading active offers for main coach, using defaults:', error);
      return sortOffers(buildDefaultOffers(MAIN_OFFERS_COACH_ID, MAIN_OFFERS_COACH_NAME));
    }
  },

  async create(offerData: any) {
    const payload = removeUndefinedFields({
      ...offerData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true, // Default to active
      options: [], // Default empty options
      paymentMethods: ['credit_card', 'twint'], // Default payment methods
      highlightItems: []
    });

    // Use addDoc to let Firestore generate the ID
    await addDoc(collection(db, COACH_OFFERS_COLLECTION), payload);
  },

  async update(id: string, data: Partial<Offer>) {
    // Ensure all fields are properly saved, including nested options
    const updateData = removeUndefinedFields({
      ...data,
      updatedAt: new Date()
    });

    console.log('Updating offer:', id, 'with data:', updateData);

    await updateDoc(doc(db, COACH_OFFERS_COLLECTION, id), updateData);

    console.log('Offer updated successfully:', id);
  },

  async setActiveState(id: string, isActive: boolean) {
    await updateDoc(doc(db, COACH_OFFERS_COLLECTION, id), removeUndefinedFields({
      isActive,
      updatedAt: new Date()
    }));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, COACH_OFFERS_COLLECTION, id));
  }
};

export const offerPurchaseService = {
  async create(purchaseData: Omit<OfferPurchase, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, OFFER_PURCHASES_COLLECTION), removeUndefinedFields({
      ...purchaseData,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    return docRef.id;
  },

  async getByUser(userId: string) {
    const qUser = query(
      collection(db, OFFER_PURCHASES_COLLECTION),
      where('purchaserId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(qUser);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as OfferPurchase[];
  },

  async hasActivePurchase(userId: string): Promise<boolean> {
    try {
      const purchases = await this.getByUser(userId);
      return purchases.some(p => p.status === 'completed');
    } catch (error) {
      console.error('Error checking offer purchases:', error);
      return false;
    }
  }
};

// Booking Services
export const bookingService = {
  async create(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) {
    // Get course details
    const course = await courseService.getById(bookingData.courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    // Get student details
    const student = await userService.getById(bookingData.studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Check if student already has this course
    const existingSession = await studentCourseSessionService.getByStudentAndCourse(
      bookingData.studentId,
      bookingData.courseId
    );

    if (existingSession) {
      // Add sessions to existing course
      await studentCourseSessionService.addSession(existingSession.id, course.sessions);
    } else {
      // Create new student course session
      await studentCourseSessionService.create({
        studentId: bookingData.studentId,
        courseId: bookingData.courseId,
        courseName: course.title,
        coachId: course.coachId,
        coachName: course.coachName,
        totalSessions: course.sessions,
        remainingSessions: course.sessions,
        isComplete: false,
        purchaseDate: Timestamp.now()
      });
    }

    // Handle coach earnings if payment was successful
    if (bookingData.paymentStatus === 'completed' && bookingData.paymentAmount > 0) {
      // Create earning transaction and update coach earnings
      await earningTransactionService.createFromPurchase(
        course.coachId,
        bookingData.studentId,
        `${student.firstName} ${student.lastName}`,
        bookingData.courseId,
        course.title,
        bookingData.paymentAmount,
        'course_purchase'
      );
    }

    // Create the booking
    const docRef = await addDoc(collection(db, 'bookings'), removeUndefinedFields({
      ...bookingData,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    return docRef.id;
  },

  async createWithSubscription(
    bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>,
    courseId: string,
    courseName: string,
    coachName: string
  ) {
    // Check if user has active subscription
    const activeSubscription = await userSubscriptionService.getActiveByUserId(bookingData.studentId);

    if (!activeSubscription) {
      throw new Error('No active subscription found');
    }

    // For session packs, check if sessions are available
    if (activeSubscription.planType === 'session_pack') {
      if (!activeSubscription.remainingSessions || activeSubscription.remainingSessions <= 0) {
        throw new Error('No sessions remaining in your package');
      }
    }

    // For annual subscriptions, check if still valid
    if (activeSubscription.planType === 'annual' && activeSubscription.endDate) {
      const endDate = activeSubscription.endDate instanceof Timestamp
        ? activeSubscription.endDate.toDate()
        : new Date(activeSubscription.endDate);

      if (endDate < new Date()) {
        throw new Error('Annual subscription has expired');
      }
    }

    // Get student details for notification
    const student = await userService.getById(bookingData.studentId);
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'A student';

    // Create booking
    const bookingId = await this.create(bookingData);

    // Notify coach about the new booking
    await notificationService.create({
      userId: bookingData.coachId,
      title: 'New Session Booked!',
      message: `${studentName} has booked your course "${courseName}" using their subscription. Check your dashboard to manage this session.`,
      type: 'booking',
      read: false
    });

    // Deduct session if it's a session pack
    if (activeSubscription.planType === 'session_pack') {
      await userSubscriptionService.deductSession(activeSubscription.id);

      // Record session usage
      await sessionUsageService.create({
        userId: bookingData.studentId,
        subscriptionId: activeSubscription.id,
        courseId,
        courseName,
        coachId: bookingData.coachId,
        coachName,
        sessionDate: bookingData.scheduledDate,
        status: 'scheduled',
        deductedAt: Timestamp.now()
      });
    } else {
      // For annual subscription, still record usage but don't deduct
      await sessionUsageService.create({
        userId: bookingData.studentId,
        subscriptionId: activeSubscription.id,
        courseId,
        courseName,
        coachId: bookingData.coachId,
        coachName,
        sessionDate: bookingData.scheduledDate,
        status: 'attended',
        deductedAt: Timestamp.now()
      });
    }

    return bookingId;
  },

  async createWithTokens(
    courseId: string,
    studentId: string,
    studentTokenPackageId: string
  ) {
    // Get course details
    const course = await courseService.getById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    // Get student details
    const student = await userService.getById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Get student token package
    const tokenPackage = await studentTokenPackageService.getById(studentTokenPackageId);
    if (!tokenPackage) {
      throw new Error('Token package not found');
    }

    // Verify the token package belongs to the correct coach and student
    if (tokenPackage.coachId !== course.coachId) {
      throw new Error('Token package is not valid for this coach');
    }

    if (tokenPackage.studentId !== studentId) {
      throw new Error('Token package does not belong to this student');
    }

    // Check if package has enough tokens
    if (tokenPackage.remainingTokens < course.sessions) {
      throw new Error('Insufficient tokens in package');
    }

    // Check if package is expired
    if (tokenPackage.isExpired || tokenPackage.expiryDate < Timestamp.now()) {
      throw new Error('Token package has expired');
    }

    // Use tokens from the package
    await studentTokenPackageService.useTokens(studentTokenPackageId, course.sessions);

    // Check if student already has this course
    const existingSession = await studentCourseSessionService.getByStudentAndCourse(
      studentId,
      courseId
    );

    if (existingSession) {
      // Add sessions to existing course
      await studentCourseSessionService.addSession(existingSession.id, course.sessions);
    } else {
      // Create new student course session
      await studentCourseSessionService.create({
        studentId,
        courseId,
        courseName: course.title,
        coachId: course.coachId,
        coachName: course.coachName,
        totalSessions: course.sessions,
        remainingSessions: course.sessions,
        isComplete: false,
        purchaseDate: Timestamp.now()
      });
    }

    // Record token usage
    await tokenUsageService.create({
      studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      studentTokenPackageId,
      packageId: tokenPackage.packageId,
      coachId: course.coachId,
      coachName: course.coachName,
      packageName: tokenPackage.packageName,
      courseId,
      courseName: course.title,
      tokensUsed: course.sessions,
      usageDate: Timestamp.now()
    });

    // Create transaction record
    await tokenTransactionService.createFromUsage(
      studentId,
      course.coachId,
      tokenPackage.packageId,
      studentTokenPackageId,
      course.sessions,
      courseId,
      course.title
    );

    // Create the booking record
    const docRef = await addDoc(collection(db, 'bookings'), removeUndefinedFields({
      courseId,
      studentId,
      coachId: course.coachId,
      bookingDate: Timestamp.now(),
      paymentStatus: 'completed',
      paymentMethod: 'tokens',
      paymentAmount: 0,
      sessionCount: course.sessions,
      totalPrice: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'bookings'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
  },

  async getByStudent(studentId: string) {
    const q = query(collection(db, 'bookings'), where('studentId', '==', studentId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
  },

  async getByCoach(coachId: string) {
    const q = query(collection(db, 'bookings'), where('coachId', '==', coachId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
  },

  async update(id: string, updates: Partial<Booking>) {
    await updateDoc(doc(db, 'bookings', id), removeUndefinedFields({
      ...updates,
      updatedAt: new Date()
    }));
  },

  async updateSessionStatus(bookingId: string, status: 'attended' | 'missed' | 'cancelled') {
    const booking = await this.getById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Update booking status
    await this.update(bookingId, { status: status === 'attended' ? 'completed' : 'cancelled' });

    // Find and update session usage
    const sessions = await sessionUsageService.getByUserId(booking.studentId);
    const matchingSession = sessions.find(session =>
      session.courseId === booking.courseId &&
      session.sessionDate === booking.scheduledDate
    );

    if (matchingSession) {
      await sessionUsageService.update(matchingSession.id, { status });

      // If session was missed and it was from a session pack, optionally handle refund logic
      if (status === 'missed' && matchingSession.subscriptionId) {
        const subscription = await userSubscriptionService.getById(matchingSession.subscriptionId);
        if (subscription && subscription.planType === 'session_pack') {
          // Optionally add back the session to the subscription
          // This is a business decision - some gyms refund missed sessions, others don't
          // await userSubscriptionService.update(subscription.id, {
          //   remainingSessions: (subscription.remainingSessions || 0) + 1
          // });
        }
      }
    }
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'bookings', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Booking;
    }
    return null;
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'bookings', id));
  }
};

// Review Services
export const reviewService = {
  async create(reviewData: Omit<Review, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'reviews'), removeUndefinedFields({
      ...reviewData,
      createdAt: new Date()
    }));

    // Update course rating
    await updateCourseRating(reviewData.courseId);
    return docRef.id;
  },

  async getAll() {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Review[];
  },

  async getByCourse(courseId: string) {
    const q = query(
      collection(db, 'reviews'),
      where('courseId', '==', courseId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Review[];
  },

  async getByUser(userId: string): Promise<Review[]> {
    try {
      const q = query(collection(db, 'reviews'), where('studentId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Review[];
    } catch (error) {
      console.error('Error getting reviews by user:', error);
      throw error;
    }
  }
};

// Chat Services
export const chatService = {
  async sendMessage(messageData: Omit<ChatMessage, 'id' | 'timestamp'>) {
    const docRef = await addDoc(collection(db, 'chat'), removeUndefinedFields({
      ...messageData,
      timestamp: new Date()
    }));
    return docRef.id;
  },

  async getCourseMessages(courseId: string) {
    const q = query(
      collection(db, 'chat'),
      where('courseId', '==', courseId),
      orderBy('timestamp', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[];
  }
};

// Direct Message Services
export const directMessageService = {
  async sendMessage(messageData: Omit<DirectMessage, 'id' | 'timestamp' | 'read'>) {
    const docRef = await addDoc(collection(db, 'directMessages'), removeUndefinedFields({
      ...messageData,
      read: false,
      timestamp: new Date()
    }));

    // Create notification for the receiver about the new message
    try {
      await notificationService.create({
        userId: messageData.receiverId,
        title: `New message from ${messageData.senderName}`,
        message: messageData.message.length > 50
          ? `${messageData.message.substring(0, 50)}...`
          : messageData.message,
        type: 'system',
        read: false
      });
    } catch (error) {
      console.error('Error creating message notification:', error);
      // Don't fail the message sending if notification fails
    }

    return docRef.id;
  },

  async getConversation(userId1: string, userId2: string) {
    // Get messages where either user is sender and the other is receiver
    const q1 = query(
      collection(db, 'directMessages'),
      where('senderId', '==', userId1),
      where('receiverId', '==', userId2),
      orderBy('timestamp', 'asc')
    );

    const q2 = query(
      collection(db, 'directMessages'),
      where('senderId', '==', userId2),
      where('receiverId', '==', userId1),
      orderBy('timestamp', 'asc')
    );

    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2)
    ]);

    const messages1 = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DirectMessage[];
    const messages2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DirectMessage[];

    // Combine and sort by timestamp
    return [...messages1, ...messages2].sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : (a.timestamp as any).toDate().getTime();
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : (b.timestamp as any).toDate().getTime();
      return timeA - timeB;
    });
  },

  async getUserConversations(userId: string) {
    // Get all messages where user is either sender or receiver
    const q1 = query(
      collection(db, 'directMessages'),
      where('senderId', '==', userId)
    );

    const q2 = query(
      collection(db, 'directMessages'),
      where('receiverId', '==', userId)
    );

    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2)
    ]);

    const sentMessages = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DirectMessage[];
    const receivedMessages = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DirectMessage[];

    // Combine all messages
    const allMessages = [...sentMessages, ...receivedMessages];

    // Get unique conversation partners
    const conversationPartners = new Map();

    allMessages.forEach(msg => {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const partnerName = msg.senderId === userId ? msg.receiverName : msg.senderName;

      // Keep track of the latest message for each conversation
      if (!conversationPartners.has(partnerId) ||
        (conversationPartners.get(partnerId).timestamp < msg.timestamp)) {
        conversationPartners.set(partnerId, {
          userId: partnerId,
          name: partnerName,
          lastMessage: msg, // Store the complete message object
          timestamp: msg.timestamp,
          unread: msg.receiverId === userId && !msg.read ? 1 : 0
        });
      } else if (msg.receiverId === userId && !msg.read) {
        // Increment unread count
        const partner = conversationPartners.get(partnerId);
        partner.unread = (partner.unread || 0) + 1;
        conversationPartners.set(partnerId, partner);
      }
    });

    // Convert to array and sort by most recent message
    return Array.from(conversationPartners.values()).sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : (a.timestamp as any).toDate().getTime();
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : (b.timestamp as any).toDate().getTime();
      return timeB - timeA; // Descending order (newest first)
    });
  },

  async markAsRead(messageId: string) {
    await updateDoc(doc(db, 'directMessages', messageId), { read: true });
  },

  async markConversationAsRead(userId: string, partnerId: string) {
    const q = query(
      collection(db, 'directMessages'),
      where('senderId', '==', partnerId),
      where('receiverId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);

    const updatePromises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, { read: true })
    );

    await Promise.all(updatePromises);
  },

  async searchUsers(searchTerm: string, currentUserId: string, limit = 5) {
    // Search for users whose first or last name contains the search term
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    const users = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }) as User)
      .filter(user =>
        user.id !== currentUserId && // Exclude current user
        ((user.firstName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())))
      )
      .slice(0, limit); // Limit results

    return users;
  }
};

// Notification Services
export const notificationService = {
  async create(notificationData: Omit<Notification, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'notifications'), removeUndefinedFields({
      ...notificationData,
      createdAt: new Date()
    }));

    // Send email notification if user has email notifications enabled
    try {
      // Import the email service dynamically to avoid circular dependencies
      const { emailNotificationService } = await import('./emailNotificationService');
      await emailNotificationService.sendEmailNotification(notificationData);
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't fail the notification creation if email fails
    }

    return docRef.id;
  },

  async getByUser(userId: string) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
  },

  async markAsRead(id: string) {
    await updateDoc(doc(db, 'notifications', id), removeUndefinedFields({ read: true }));
  },

  async update(id: string, data: Partial<Notification>) {
    await updateDoc(doc(db, 'notifications', id), removeUndefinedFields(data));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'notifications', id));
  }
};

// Transaction Services
export const transactionService = {
  async create(transactionData: Omit<Transaction, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'transactions'), removeUndefinedFields({
      ...transactionData,
      createdAt: new Date()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'transactions'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
  },

  async getByUser(userId: string): Promise<Transaction[]> {
    try {
      const q = query(collection(db, 'transactions'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
    } catch (error) {
      console.error('Error getting transactions by user:', error);
      throw error;
    }
  }
};

// FAQ Services
export const faqService = {
  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'faqs'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FAQItem[];
  },

  async create(faqData: Omit<FAQItem, 'id'>) {
    const docRef = await addDoc(collection(db, 'faqs'), removeUndefinedFields(faqData));
    return docRef.id;
  }
};

// Content Services for managing editable pages
export const contentService = {
  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'content'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EditableContent[];
  },

  async getByType(type: 'about' | 'privacy' | 'terms') {
    const q = query(collection(db, 'content'), where('type', '==', type));
    const querySnapshot = await getDocs(q);
    const contents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EditableContent[];
    return contents.length > 0 ? contents[0] : null;
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'content', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as EditableContent;
    }
    return null;
  },

  async create(contentData: Omit<EditableContent, 'id'>) {
    const docRef = await addDoc(collection(db, 'content'), removeUndefinedFields(contentData));
    return docRef.id;
  },

  async update(id: string, data: Partial<EditableContent>) {
    await updateDoc(doc(db, 'content', id), removeUndefinedFields({
      ...data,
      lastUpdated: new Date()
    }));
  }
};

// Custom Emoji Services
export const emojiService = {
  async create(emojiData: Omit<CustomEmoji, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'customEmojis'), removeUndefinedFields({
      ...emojiData,
      createdAt: new Date()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'customEmojis'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CustomEmoji[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'customEmojis', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as CustomEmoji;
    }
    return null;
  },

  async update(id: string, data: Partial<CustomEmoji>) {
    await updateDoc(doc(db, 'customEmojis', id), removeUndefinedFields(data));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'customEmojis', id));
  }
};

// Group Chat Services
export const groupChatService = {
  async create(groupData: Omit<GroupChat, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'groupChats'), removeUndefinedFields({
      ...groupData,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    return docRef.id;
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'groupChats', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as GroupChat;
    }
    return null;
  },

  async getByMember(userId: string) {
    const q = query(
      collection(db, 'groupChats'),
      where('members', 'array-contains', userId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as GroupChat[];
  },

  async update(id: string, data: Partial<GroupChat>) {
    await updateDoc(doc(db, 'groupChats', id), removeUndefinedFields({
      ...data,
      updatedAt: new Date()
    }));
  },

  async addMember(groupId: string, userId: string) {
    const groupRef = doc(db, 'groupChats', groupId);
    await updateDoc(groupRef, {
      members: arrayUnion(userId),
      updatedAt: new Date()
    });
  },

  async removeMember(groupId: string, userId: string) {
    const groupRef = doc(db, 'groupChats', groupId);
    await updateDoc(groupRef, {
      members: arrayRemove(userId),
      updatedAt: new Date()
    });
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'groupChats', id));
  }
};

// Group Chat Message Services
export const groupMessageService = {
  async sendMessage(messageData: Omit<GroupChatMessage, 'id' | 'timestamp'>) {
    const docRef = await addDoc(collection(db, 'groupMessages'), removeUndefinedFields({
      ...messageData,
      timestamp: new Date()
    }));
    return docRef.id;
  },

  async getGroupMessages(groupId: string) {
    const q = query(
      collection(db, 'groupMessages'),
      where('groupId', '==', groupId),
      orderBy('timestamp', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as GroupChatMessage[];
  }
};

// Course Schedule Services
export const scheduleService = {
  async create(scheduleData: Omit<CourseSchedule, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'courseSchedules'), removeUndefinedFields({
      ...scheduleData,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'courseSchedules'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CourseSchedule[];
  },

  async getById(id: string) {
    const docRef = doc(db, 'courseSchedules', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as CourseSchedule;
    }
    return null;
  },

  async getByCourse(courseId: string) {
    const q = query(
      collection(db, 'courseSchedules'),
      where('courseId', '==', courseId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CourseSchedule[];
  },

  async getByDateRange(startDate: Date, endDate: Date) {
    const q = query(
      collection(db, 'courseSchedules'),
      where('startTime', '>=', startDate),
      where('startTime', '<=', endDate)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CourseSchedule[];
  },

  async update(id: string, data: Partial<CourseSchedule>) {
    await updateDoc(doc(db, 'courseSchedules', id), removeUndefinedFields({
      ...data,
      updatedAt: new Date()
    }));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'courseSchedules', id));
  }
};

// Dance Category Services
export const danceCategoryService = {
  async create(categoryData: { name: string; description?: string; createdBy: string }) {
    const docRef = await addDoc(collection(db, 'danceCategories'), removeUndefinedFields({
      ...categoryData,
      createdAt: new Date()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'danceCategories'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'danceCategories', id));
  }
};

// Admin Settings Services
export const adminSettingsService = {
  async get(key: string) {
    const docSnap = await getDoc(doc(db, 'admin_settings', key));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  },

  async set(key: string, data: any) {
    const docRef = doc(db, 'admin_settings', key);
    await updateDoc(docRef, {
      ...removeUndefinedFields(data),
      updatedAt: Timestamp.now()
    });
  },

  async create(key: string, data: any) {
    const docRef = doc(db, 'admin_settings', key);
    await addDoc(collection(db, 'admin_settings'), {
      id: key,
      ...removeUndefinedFields(data),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  },

  async getBoostPricing() {
    const docSnap = await getDoc(doc(db, 'admin_settings', 'boost_pricing'));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  },

  async getBackgroundSettings(): Promise<BackgroundSettings | null> {
    const docSnap = await getDoc(doc(db, 'admin_settings', 'background'));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as BackgroundSettings;
    }
    return null;
  }
};

// Subscription Plan Services
export const subscriptionPlanService = {
  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'subscription_plans'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SubscriptionPlan[];
  },

  async getActive() {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'subscription_plans'),
        where('isActive', '==', true),
        orderBy('price', 'asc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SubscriptionPlan[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'subscription_plans', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SubscriptionPlan;
    }
    return null;
  },

  async create(data: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'subscription_plans'), {
      ...removeUndefinedFields(data),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<SubscriptionPlan>) {
    await updateDoc(doc(db, 'subscription_plans', id), {
      ...removeUndefinedFields(data),
      updatedAt: Timestamp.now()
    });
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'subscription_plans', id));
  }
};

// User Subscription Services
export const userSubscriptionService = {
  async getByUserId(userId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'user_subscriptions'),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserSubscription[];
  },

  async getActiveByUserId(userId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'user_subscriptions'),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        limit(1)
      )
    );
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as UserSubscription;
    }
    return null;
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'user_subscriptions', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as UserSubscription;
    }
    return null;
  },

  async create(data: Omit<UserSubscription, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'user_subscriptions'), {
      ...removeUndefinedFields(data),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<UserSubscription>) {
    await updateDoc(doc(db, 'user_subscriptions', id), {
      ...removeUndefinedFields(data),
      updatedAt: Timestamp.now()
    });
  },

  async deductSession(subscriptionId: string) {
    const subscription = await this.getById(subscriptionId);
    if (subscription && subscription.remainingSessions && subscription.remainingSessions > 0) {
      await this.update(subscriptionId, {
        remainingSessions: subscription.remainingSessions - 1
      });
      return true;
    }
    return false;
  },

  async addSession(subscriptionId: string) {
    const subscription = await this.getById(subscriptionId);
    if (subscription && subscription.planType === 'session_pack') {
      const currentSessions = subscription.remainingSessions || 0;
      await this.update(subscriptionId, {
        remainingSessions: currentSessions + 1
      });
      return true;
    }
    return false;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'user_subscriptions'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserSubscription[];
  }
};

// Session Usage Services
export const sessionUsageService = {
  async getByUserId(userId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'session_usage'),
        where('userId', '==', userId),
        orderBy('sessionDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SessionUsage[];
  },

  async getBySubscriptionId(subscriptionId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'session_usage'),
        where('subscriptionId', '==', subscriptionId),
        orderBy('sessionDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SessionUsage[];
  },

  async getByCoach(coachId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'session_usage'),
        where('coachId', '==', coachId),
        orderBy('sessionDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SessionUsage[];
  },

  async getByUserAndCoach(userId: string, coachId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'session_usage'),
        where('userId', '==', userId),
        where('coachId', '==', coachId),
        orderBy('sessionDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SessionUsage[];
  },

  async create(data: Omit<SessionUsage, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'session_usage'), {
      ...removeUndefinedFields(data),
      createdAt: Timestamp.now()
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<SessionUsage>) {
    await updateDoc(doc(db, 'session_usage', id), data);
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'session_usage'), orderBy('sessionDate', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SessionUsage[];
  }
};

// Subscription Settings Services
export const subscriptionSettingsService = {
  async get() {
    const docSnap = await getDoc(doc(db, 'admin_settings', 'subscription_settings'));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SubscriptionSettings;
    }
    return null;
  },

  async set(data: Omit<SubscriptionSettings, 'id'>) {
    const docRef = doc(db, 'admin_settings', 'subscription_settings');
    await updateDoc(docRef, {
      ...removeUndefinedFields(data),
      lastUpdatedAt: Timestamp.now()
    });
  },

  async create(data: Omit<SubscriptionSettings, 'id'>) {
    const docRef = doc(db, 'admin_settings', 'subscription_settings');
    await addDoc(collection(db, 'admin_settings'), {
      id: 'subscription_settings',
      ...removeUndefinedFields(data),
      lastUpdatedAt: Timestamp.now()
    });
  }
};

// Credit Transaction Services
export const creditTransactionService = {
  async create(transactionData: Omit<CreditTransaction, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'creditTransactions'), removeUndefinedFields({
      ...transactionData,
      createdAt: new Date()
    }));
    return docRef.id;
  },

  async getByUser(userId: string) {
    const q = query(
      collection(db, 'creditTransactions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CreditTransaction[];
  },

  async getAll() {
    const q = query(collection(db, 'creditTransactions'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CreditTransaction[];
  },

  async creditUser(userId: string, amount: number, reason: string, adminId: string, adminName: string) {
    try {
      // Get current user
      const user = await userService.getById(userId);
      if (!user) throw new Error('User not found');

      const balanceBefore = user.credits;
      const balanceAfter = balanceBefore + amount;

      // Update user credits
      await userService.update(userId, { credits: balanceAfter });

      // Create credit transaction record
      await this.create({
        userId,
        adminId,
        adminName,
        type: 'credit',
        amount,
        reason,
        balanceBefore,
        balanceAfter
      });

      // Create transaction record
      await transactionService.create({
        userId,
        type: 'admin_credit',
        amount,
        description: `Admin credit: ${reason}`,
        status: 'completed'
      });

      return balanceAfter;
    } catch (error) {
      console.error('Error crediting user:', error);
      throw error;
    }
  },

  async debitUser(userId: string, amount: number, reason: string, adminId: string, adminName: string) {
    try {
      // Get current user
      const user = await userService.getById(userId);
      if (!user) throw new Error('User not found');

      const balanceBefore = user.credits;
      const balanceAfter = Math.max(0, balanceBefore - amount); // Prevent negative balance

      // Update user credits
      await userService.update(userId, { credits: balanceAfter });

      // Create debit transaction record
      await this.create({
        userId,
        adminId,
        adminName,
        type: 'debit',
        amount,
        reason,
        balanceBefore,
        balanceAfter
      });

      // Create transaction record
      await transactionService.create({
        userId,
        type: 'admin_debit',
        amount: -amount,
        description: `Admin debit: ${reason}`,
        status: 'completed'
      });

      return balanceAfter;
    } catch (error) {
      console.error('Error debiting user:', error);
      throw error;
    }
  }
};


// Helper function to update course rating
async function updateCourseRating(courseId: string) {
  const reviews = await reviewService.getByCourse(courseId);
  if (reviews.length > 0) {
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    await courseService.update(courseId, {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length
    });
  }
};

// Social Media Links Service
export const socialMediaService = {
  async get() {
    try {
      const docSnap = await getDoc(doc(db, 'admin_settings', 'social_media'));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as SocialMediaLinks;
      }
      return null;
    } catch (error) {
      console.error('Error getting social media links:', error);
      return null;
    }
  },

  async update(data: Partial<SocialMediaLinks>) {
    try {
      const cleanedData = removeUndefinedFields({
        ...data,
        updatedAt: new Date()
      });
      await updateDoc(doc(db, 'settings', 'socialMedia'), cleanedData);
    } catch (error) {
      console.error('Error updating social media links:', error);
      throw error;
    }
  },

  async create(data: Omit<SocialMediaLinks, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const newData = removeUndefinedFields({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await setDoc(doc(db, 'settings', 'socialMedia'), newData);
      return 'socialMedia';
    } catch (error) {
      console.error('Error creating social media links:', error);
      throw error;
    }
  }
};

// Home Page Settings Service
export const homePageService = {
  async get() {
    try {
      const docSnap = await getDoc(doc(db, 'admin_settings', 'home_page_video'));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as HomePageSettings;
      }
      return null;
    } catch (error) {
      console.error('Error getting home page settings:', error);
      return null;
    }
  },

  async update(data: Partial<HomePageSettings>) {
    try {
      const cleanedData = removeUndefinedFields({
        ...data,
        updatedAt: new Date()
      });
      await updateDoc(doc(db, 'settings', 'homePage'), cleanedData);
    } catch (error) {
      console.error('Error updating home page settings:', error);
      throw error;
    }
  },

  async create(data: Omit<HomePageSettings, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const newData = removeUndefinedFields({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await setDoc(doc(db, 'settings', 'homePage'), newData);
      return 'homePage';
    } catch (error) {
      console.error('Error creating home page settings:', error);
      throw error;
    }
  }
};

export const UserProfileService = {
  async getById(userId: string) {
    const docSnap = await getDoc(doc(db, 'users', userId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
  },
}


// Student Course Session Services
export const studentCourseSessionService = {
  async getByStudentId(studentId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'student_course_sessions'),
        where('studentId', '==', studentId),
        orderBy('purchaseDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StudentCourseSession[];
  },

  async getByStudentAndCourse(studentId: string, courseId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'student_course_sessions'),
        where('studentId', '==', studentId),
        where('courseId', '==', courseId)
      )
    );
    const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StudentCourseSession[];
    return docs.length > 0 ? docs[0] : null;
  },

  async getByCoachId(coachId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'student_course_sessions'),
        where('coachId', '==', coachId),
        orderBy('purchaseDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StudentCourseSession[];
  },

  async create(data: Omit<StudentCourseSession, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'student_course_sessions'), {
      ...removeUndefinedFields(data),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<StudentCourseSession>) {
    await updateDoc(doc(db, 'student_course_sessions', id), {
      ...removeUndefinedFields(data),
      updatedAt: Timestamp.now()
    });
  },

  async deductSession(sessionId: string) {
    const session = await this.getById(sessionId);
    if (session && session.remainingSessions > 0) {
      const newRemaining = session.remainingSessions - 1;
      await this.update(sessionId, {
        remainingSessions: newRemaining,
        isComplete: newRemaining === 0,
        lastSessionDate: Timestamp.now()
      });
      return true;
    }
    return false;
  },

  async addSession(sessionId: string, count: number = 1) {
    const session = await this.getById(sessionId);
    if (session) {
      const newRemaining = session.remainingSessions + count;
      await this.update(sessionId, {
        remainingSessions: newRemaining,
        isComplete: false
      });
      return true;
    }
    return false;
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'student_course_sessions', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as StudentCourseSession;
    }
    return null;
  }
};

// Coach Earnings Services (Consolidated - no more coach_commission_settings)
export const coachEarningsService = {
  async getByCoachId(coachId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'coach_earnings'), where('coachId', '==', coachId))
    );
    const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CoachEarnings[];
    return docs.length > 0 ? docs[0] : null;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'coach_earnings'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CoachEarnings[];
  },

  async initializeCoachEarnings(coachId: string, coachName?: string, commissionRate: number = 15) {
    const existing = await this.getByCoachId(coachId);
    if (!existing) {
      const docRef = await addDoc(collection(db, 'coach_earnings'), {
        coachId,
        coachName: coachName || 'Unknown Coach',
        totalEarnings: 0,
        totalCommissionDeducted: 0,
        netEarnings: 0,
        currentBalance: 0,
        availableBalance: 0,
        totalWithdrawn: 0,
        commissionRate,
        isActive: true,
        effectiveDate: Timestamp.now(),
        setBy: 'system',
        createdAt: Timestamp.now(),
        lastUpdated: Timestamp.now()
      });
      return docRef.id;
    }
    return existing.id;
  },

  async updateCommissionRate(coachId: string, commissionRate: number, setBy: string) {
    const earnings = await this.getByCoachId(coachId);
    if (earnings) {
      await updateDoc(doc(db, 'coach_earnings', earnings.id), {
        commissionRate,
        setBy,
        lastUpdated: Timestamp.now()
      });
    } else {
      // Initialize if doesn't exist
      await this.initializeCoachEarnings(coachId, undefined, commissionRate);
    }
  },

  async addEarning(coachId: string, grossAmount: number, commissionAmount: number) {
    const netAmount = grossAmount - commissionAmount;
    const earnings = await this.getByCoachId(coachId);

    if (earnings) {
      await updateDoc(doc(db, 'coach_earnings', earnings.id), {
        totalEarnings: earnings.totalEarnings + grossAmount,
        totalCommissionDeducted: earnings.totalCommissionDeducted + commissionAmount,
        netEarnings: earnings.netEarnings + netAmount,
        currentBalance: earnings.currentBalance + netAmount,
        availableBalance: earnings.availableBalance + netAmount,
        lastUpdated: Timestamp.now()
      });
    } else {
      await this.initializeCoachEarnings(coachId);
      await this.addEarning(coachId, grossAmount, commissionAmount);
    }
  },

  async deductWithdrawal(coachId: string, amount: number) {
    const earnings = await this.getByCoachId(coachId);
    if (earnings && earnings.availableBalance >= amount) {
      await updateDoc(doc(db, 'coach_earnings', earnings.id), {
        availableBalance: earnings.availableBalance - amount,
        lastUpdated: Timestamp.now()
      });
      return true;
    }
    return false;
  },

  async processWithdrawal(coachId: string, amount: number) {
    const earnings = await this.getByCoachId(coachId);
    if (earnings && earnings.availableBalance >= amount) {
      await updateDoc(doc(db, 'coach_earnings', earnings.id), {
        availableBalance: earnings.availableBalance - amount,
        totalWithdrawn: earnings.totalWithdrawn + amount,
        lastUpdated: Timestamp.now()
      });
      return true;
    }
    return false;
  },

  async refundWithdrawal(coachId: string, amount: number) {
    const earnings = await this.getByCoachId(coachId);
    if (earnings) {
      await updateDoc(doc(db, 'coach_earnings', earnings.id), {
        availableBalance: earnings.availableBalance + amount,
        totalWithdrawn: earnings.totalWithdrawn - amount,
        lastUpdated: Timestamp.now()
      });
    }
  }
};

// Earning Transactions Services
export const earningTransactionService = {
  async getByCoachId(coachId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'earning_transactions'),
        where('coachId', '==', coachId),
        orderBy('transactionDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EarningTransaction[];
  },

  async create(data: Omit<EarningTransaction, 'id'>) {
    const docRef = await addDoc(collection(db, 'earning_transactions'), removeUndefinedFields(data));
    return docRef.id;
  },

  async createFromPurchase(
    coachId: string,
    studentId: string,
    studentName: string,
    courseId: string,
    courseName: string,
    grossAmount: number,
    paymentMethod: string
  ) {
    // Get coach earnings to fetch current commission rate
    let earnings = await coachEarningsService.getByCoachId(coachId);

    // Initialize coach earnings if doesn't exist
    if (!earnings) {
      await coachEarningsService.initializeCoachEarnings(coachId, 'Unknown Coach', 15);
      earnings = await coachEarningsService.getByCoachId(coachId);
    }

    const course = await courseService.getById(courseId);
    const numberOfSessions = course?.sessions ?? 0;
    const commissionRate = earnings?.commissionRate || 15;
    const commissionAmount = (grossAmount * commissionRate * numberOfSessions) / 100;
    const netAmount = (grossAmount * numberOfSessions) - commissionAmount;

    // Create transaction record
    await this.create({
      coachId,
      studentId,
      studentName,
      courseId,
      courseName,
      grossAmount: grossAmount * numberOfSessions,
      commissionRate,
      commissionAmount,
      netAmount,
      transactionDate: Timestamp.now(),
      paymentMethod,
      status: 'completed',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      type: 'course_purchase'
    });

    // Update coach earnings
    await coachEarningsService.addEarning(coachId, grossAmount * numberOfSessions, commissionAmount);
  },

  // Legacy method for backward compatibility
  async createFromPurchaseWithRate(
    coachId: string,
    studentId: string,
    studentName: string,
    courseId: string,
    courseName: string,
    grossAmount: number,
    commissionRate: number,
    paymentMethod: string
  ) {
    // get the no of sessions from the course
    const course = await courseService.getById(courseId);
    const numberOfSessions = course?.sessions ?? 0;
    const commissionAmount = (grossAmount * commissionRate * numberOfSessions) / 100;
    const netAmount = (grossAmount * numberOfSessions) - commissionAmount;

    // Create transaction record
    await this.create({
      coachId,
      studentId,
      studentName,
      courseId,
      courseName,
      grossAmount: grossAmount * numberOfSessions,
      commissionRate,
      commissionAmount,
      netAmount,
      transactionDate: Timestamp.now(),
      paymentMethod,
      status: 'completed',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      type: 'course_purchase'
    });

    // Update coach earnings
    await coachEarningsService.addEarning(coachId, grossAmount * numberOfSessions, commissionAmount);
  },

  async createFromTokenPackagePurchase(
    coachId: string,
    studentId: string,
    studentName: string,
    packageId: string,
    packageName: string,
    grossAmount: number,
    paymentMethod: string
  ) {
    // Get coach earnings to fetch current commission rate
    let earnings = await coachEarningsService.getByCoachId(coachId);

    // Initialize coach earnings if doesn't exist
    if (!earnings) {
      await coachEarningsService.initializeCoachEarnings(coachId, 'Unknown Coach', 15);
      earnings = await coachEarningsService.getByCoachId(coachId);
    }

    const commissionRate = earnings?.commissionRate || 15;
    const commissionAmount = (grossAmount * commissionRate) / 100;
    const netAmount = grossAmount - commissionAmount;

    // Create transaction record
    await this.create({
      coachId,
      studentId,
      studentName,
      packageId,
      packageName,
      grossAmount,
      commissionRate,
      commissionAmount,
      netAmount,
      transactionDate: Timestamp.now(),
      paymentMethod,
      status: 'completed',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      type: 'token_package_purchase'
    });

    // Update coach earnings
    await coachEarningsService.addEarning(coachId, grossAmount, commissionAmount);
  }
};

// Withdrawal Request Services
export const withdrawalRequestService = {
  async getByCoachId(coachId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'withdrawal_requests'),
        where('coachId', '==', coachId),
        orderBy('requestDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WithdrawalRequest[];
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'withdrawal_requests'), orderBy('requestDate', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WithdrawalRequest[];
  },

  async getPending() {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'withdrawal_requests'),
        where('status', '==', 'pending'),
        orderBy('requestDate', 'asc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WithdrawalRequest[];
  },

  async create(data: Omit<WithdrawalRequest, 'id'>) {
    const docRef = await addDoc(collection(db, 'withdrawal_requests'), removeUndefinedFields(data));
    return docRef.id;
  },

  async update(id: string, data: Partial<WithdrawalRequest>) {
    await updateDoc(doc(db, 'withdrawal_requests', id), removeUndefinedFields(data));
  },

  async updateStatus(
    id: string,
    status: 'approved' | 'rejected',
    processedBy: string,
    adminNote?: string,
    rejectionReason?: string
  ) {
    // Get the withdrawal request first
    const requestDoc = await getDoc(doc(db, 'withdrawal_requests', id));
    if (!requestDoc.exists()) {
      throw new Error('Withdrawal request not found');
    }

    const requestData = requestDoc.data() as WithdrawalRequest;

    if (status === 'approved') {
      // Process the actual withdrawal (deduct from available balance and add to total withdrawn)
      const success = await coachEarningsService.processWithdrawal(requestData.coachId, requestData.amount);
      if (!success) {
        throw new Error('Insufficient balance to process withdrawal');
      }
    } else if (status === 'rejected') {
      // Refund the amount back to available balance (it was deducted when request was created)
      await coachEarningsService.refundWithdrawal(requestData.coachId, requestData.amount);
    }

    // Update the request status
    await updateDoc(doc(db, 'withdrawal_requests', id), {
      status,
      processedDate: Timestamp.now(),
      processedBy,
      adminNote: adminNote || '',
      rejectionReason: rejectionReason || ''
    });
  },

  async requestWithdrawal(
    coachId: string,
    coachName: string,
    amount: number,
    paymentMethod: string,
    paymentDetails: { description: string; accountDetails: string }
  ) {
    // Check if coach has sufficient balance
    const earnings = await coachEarningsService.getByCoachId(coachId);
    if (!earnings || earnings.availableBalance < amount) {
      throw new Error('Insufficient balance for withdrawal');
    }

    // Deduct amount from available balance
    await coachEarningsService.deductWithdrawal(coachId, amount);

    // Create withdrawal request
    const requestId = await this.create({
      coachId,
      coachName,
      amount,
      paymentMethod,
      paymentDetails,
      status: 'pending',
      requestDate: Timestamp.now()
    });

    return requestId;
  }
};

// Token Package Services
export const tokenPackageService = {
  async create(packageData: Omit<TokenPackage, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'token_packages'), removeUndefinedFields({
      ...packageData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'token_packages'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TokenPackage[];
  },

  async getActivePackages() {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'token_packages'),
        where('isActive', '==', true),
        where('expiryDate', '>', Timestamp.now()),
        orderBy('expiryDate', 'asc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TokenPackage[];
  },

  async getByCoachId(coachId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'token_packages'),
        where('coachId', '==', coachId),
        orderBy('createdAt', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TokenPackage[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'token_packages', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as TokenPackage;
    }
    return null;
  },

  async update(id: string, updateData: Partial<TokenPackage>) {
    await updateDoc(doc(db, 'token_packages', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'token_packages', id));
  },

  async searchByCoachName(coachName: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'token_packages'),
        where('coachName', '>=', coachName),
        where('coachName', '<=', coachName + '\uf8ff'),
        where('isActive', '==', true),
        where('expiryDate', '>', Timestamp.now())
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TokenPackage[];
  }
};

// Student Token Package Services
export const studentTokenPackageService = {
  async create(packageData: Omit<StudentTokenPackage, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'student_token_packages'), removeUndefinedFields({
      ...packageData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'student_token_packages'),
        orderBy('purchaseDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StudentTokenPackage[];
  },

  async getByStudentId(studentId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'student_token_packages'),
        where('studentId', '==', studentId),
        orderBy('purchaseDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StudentTokenPackage[];
  },

  async getByStudentAndCoach(studentId: string, coachId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'student_token_packages'),
        where('studentId', '==', studentId),
        where('coachId', '==', coachId),
        where('isExpired', '==', false),
        where('remainingTokens', '>', 0),
        orderBy('purchaseDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StudentTokenPackage[];
  },

  async getByPackageId(packageId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'student_token_packages'),
        where('packageId', '==', packageId),
        orderBy('purchaseDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StudentTokenPackage[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'student_token_packages', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as StudentTokenPackage;
    }
    return null;
  },

  async update(id: string, updateData: Partial<StudentTokenPackage>) {
    await updateDoc(doc(db, 'student_token_packages', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async useTokens(id: string, tokensToUse: number) {
    const packageDoc = await this.getById(id);
    if (!packageDoc) {
      throw new Error('Token package not found');
    }

    if (packageDoc.remainingTokens < tokensToUse) {
      throw new Error('Insufficient tokens');
    }

    if (packageDoc.isExpired || packageDoc.expiryDate < Timestamp.now()) {
      throw new Error('Token package has expired');
    }

    const newRemainingTokens = packageDoc.remainingTokens - tokensToUse;
    await this.update(id, {
      remainingTokens: newRemainingTokens,
      lastUsedDate: Timestamp.now()
    });

    return true;
  },

  async addTokens(studentId: string, packageId: string, tokensToAdd: number) {
    // Check if student already has this package
    const querySnapshot = await getDocs(
      query(
        collection(db, 'student_token_packages'),
        where('studentId', '==', studentId),
        where('packageId', '==', packageId)
      )
    );

    if (!querySnapshot.empty) {
      // Update existing package
      const existingPackage = querySnapshot.docs[0];
      const currentData = existingPackage.data() as StudentTokenPackage;
      await this.update(existingPackage.id, {
        remainingTokens: currentData.remainingTokens + tokensToAdd,
        totalTokens: currentData.totalTokens + tokensToAdd
      });
      return existingPackage.id;
    }

    return null; // No existing package found
  }
};

// Token Usage Services
export const tokenUsageService = {
  async create(usageData: Omit<TokenUsage, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'token_usage'), removeUndefinedFields({
      ...usageData,
      createdAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getByStudentId(studentId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'token_usage'),
        where('studentId', '==', studentId),
        orderBy('usageDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TokenUsage[];
  },

  async getByCoachId(coachId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'token_usage'),
        where('coachId', '==', coachId),
        orderBy('usageDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TokenUsage[];
  },

  async getByPackageId(packageId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'token_usage'),
        where('packageId', '==', packageId),
        orderBy('usageDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TokenUsage[];
  },

  async getByStudentTokenPackageId(studentTokenPackageId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'token_usage'),
        where('studentTokenPackageId', '==', studentTokenPackageId),
        orderBy('usageDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TokenUsage[];
  }
};

// Token Transaction Services
export const tokenTransactionService = {
  async create(transactionData: Omit<TokenTransaction, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'token_transactions'), removeUndefinedFields({
      ...transactionData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'token_transactions'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TokenTransaction[];
  },

  async getByStudentId(studentId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'token_transactions'),
        where('studentId', '==', studentId),
        orderBy('createdAt', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TokenTransaction[];
  },

  async getByCoachId(coachId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'token_transactions'),
        where('coachId', '==', coachId),
        orderBy('createdAt', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TokenTransaction[];
  },

  async update(id: string, updateData: Partial<TokenTransaction>) {
    await updateDoc(doc(db, 'token_transactions', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async createFromPurchase(
    studentId: string,
    coachId: string,
    packageId: string,
    studentTokenPackageId: string,
    amount: number,
    tokens: number,
    paymentId: string,
    paymentMethod: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card'
  ) {
    return await this.create({
      studentId,
      coachId,
      packageId,
      studentTokenPackageId,
      type: 'purchase',
      amount,
      tokensInvolved: tokens,
      description: `Purchased token package`,
      paymentId,
      paymentMethod,
      status: 'completed'
    });
  },

  async createFromUsage(
    studentId: string,
    coachId: string,
    packageId: string,
    studentTokenPackageId: string,
    tokensUsed: number,
    courseId: string,
    courseName: string
  ) {
    return await this.create({
      studentId,
      coachId,
      packageId,
      studentTokenPackageId,
      type: 'usage',
      amount: 0,
      tokensInvolved: tokensUsed,
      description: `Used ${tokensUsed} tokens for course: ${courseName}`,
      status: 'completed'
    });
  }
};

// Publication Wall Services
export const publicationService = {
  async create(publicationData: Omit<Publication, 'id' | 'createdAt' | 'updatedAt'>) {
    const cleanedData = removeUndefinedFields({
      ...publicationData,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      isModerated: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    const docRef = await addDoc(collection(db, 'publications'), cleanedData);
    return docRef.id;
  },

  async getAll(limitCount: number = 20, lastDoc?: any) {
    let q = query(
      collection(db, 'publications'),
      where('isModerated', '==', false),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (lastDoc) {
      q = query(
        collection(db, 'publications'),
        where('isModerated', '==', false),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(q);
    return {
      publications: querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Publication[],
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
    };
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'publications', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Publication;
    }
    return null;
  },

  async getByIds(ids: string[]) {
    if (ids.length === 0) return [];

    const publications: Publication[] = [];
    // Process in batches of 10 (Firestore limit)
    for (let i = 0; i < ids.length; i += 10) {
      const batch = ids.slice(i, i + 10);
      const q = query(
        collection(db, 'publications'),
        where('__name__', 'in', batch),
        where('isModerated', '==', false)
      );
      const querySnapshot = await getDocs(q);
      publications.push(...querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Publication[]);
    }
    return publications;
  },

  async getByAuthor(authorId: string) {
    const q = query(
      collection(db, 'publications'),
      where('authorId', '==', authorId),
      where('isModerated', '==', false),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Publication[];
  },

  async update(id: string, updates: Partial<Publication>) {
    const cleanedData = removeUndefinedFields({
      ...updates,
      updatedAt: Timestamp.now()
    });
    await updateDoc(doc(db, 'publications', id), cleanedData);
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'publications', id));
  },

  async incrementStat(id: string, stat: 'likes' | 'comments' | 'shares' | 'saves', increment: number = 1) {
    const publicationRef = doc(db, 'publications', id);
    const publication = await getDoc(publicationRef);
    if (publication.exists()) {
      const currentValue = publication.data()[stat] || 0;
      await updateDoc(publicationRef, {
        [stat]: Math.max(0, currentValue + increment),
        updatedAt: Timestamp.now()
      });
    }
  },

  async moderate(id: string, moderatedBy: string, reason?: string) {
    await updateDoc(doc(db, 'publications', id), {
      isModerated: true,
      moderatedBy,
      moderatedAt: Timestamp.now(),
      moderationReason: reason || 'Content moderated',
      updatedAt: Timestamp.now()
    });
  }
};

export const publicationLikeService = {
  async create(publicationId: string, userId: string) {
    const likeData = {
      publicationId,
      userId,
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'publication_likes'), likeData);

    // Increment likes count
    await publicationService.incrementStat(publicationId, 'likes', 1);

    return docRef.id;
  },

  async delete(publicationId: string, userId: string) {
    const q = query(
      collection(db, 'publication_likes'),
      where('publicationId', '==', publicationId),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    querySnapshot.docs.forEach(async (docSnapshot) => {
      await deleteDoc(docSnapshot.ref);
    });

    // Decrement likes count
    await publicationService.incrementStat(publicationId, 'likes', -1);
  },

  async getUserLike(publicationId: string, userId: string) {
    const q = query(
      collection(db, 'publication_likes'),
      where('publicationId', '==', publicationId),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.length > 0 ? { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } : null;
  }
};

export const publicationCommentService = {
  async create(commentData: Omit<PublicationComment, 'id' | 'createdAt' | 'updatedAt'>) {
    const cleanedData = removeUndefinedFields({
      ...commentData,
      likes: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    const docRef = await addDoc(collection(db, 'publication_comments'), cleanedData);

    // Increment comments count
    await publicationService.incrementStat(commentData.publicationId, 'comments', 1);

    return docRef.id;
  },

  async getByPublication(publicationId: string) {
    const q = query(
      collection(db, 'publication_comments'),
      where('publicationId', '==', publicationId),
      orderBy('createdAt', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PublicationComment[];
  },

  async delete(id: string, publicationId: string) {
    await deleteDoc(doc(db, 'publication_comments', id));

    // Decrement comments count
    await publicationService.incrementStat(publicationId, 'comments', -1);
  },

  async update(id: string, updates: Partial<PublicationComment>) {
    const cleanedData = removeUndefinedFields({
      ...updates,
      updatedAt: Timestamp.now()
    });
    await updateDoc(doc(db, 'publication_comments', id), cleanedData);
  }
};

export const publicationSaveService = {
  async create(publicationId: string, userId: string, folderId?: string) {
    const saveData = {
      publicationId,
      userId,
      folderId,
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'publication_saves'), removeUndefinedFields(saveData));

    // Increment saves count
    await publicationService.incrementStat(publicationId, 'saves', 1);

    return docRef.id;
  },

  async delete(publicationId: string, userId: string) {
    const q = query(
      collection(db, 'publication_saves'),
      where('publicationId', '==', publicationId),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    querySnapshot.docs.forEach(async (docSnapshot) => {
      await deleteDoc(docSnapshot.ref);
    });

    // Decrement saves count
    await publicationService.incrementStat(publicationId, 'saves', -1);
  },

  async getUserSave(publicationId: string, userId: string) {
    const q = query(
      collection(db, 'publication_saves'),
      where('publicationId', '==', publicationId),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.length > 0 ? { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } : null;
  },

  async getUserSaves(userId: string, folderId?: string) {
    let q = query(
      collection(db, 'publication_saves'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    if (folderId) {
      q = query(
        collection(db, 'publication_saves'),
        where('userId', '==', userId),
        where('folderId', '==', folderId),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PublicationSave[];
  }
};

export const saveFolderService = {
  async create(folderData: Omit<SaveFolder, 'id' | 'createdAt' | 'updatedAt'>) {
    const cleanedData = removeUndefinedFields({
      ...folderData,
      publicationCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    const docRef = await addDoc(collection(db, 'save_folders'), cleanedData);
    return docRef.id;
  },

  async getUserFolders(userId: string) {
    const q = query(
      collection(db, 'save_folders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SaveFolder[];
  },

  async update(id: string, updates: Partial<SaveFolder>) {
    const cleanedData = removeUndefinedFields({
      ...updates,
      updatedAt: Timestamp.now()
    });
    await updateDoc(doc(db, 'save_folders', id), cleanedData);
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'save_folders', id));
  }
};

export const publicationShareService = {
  async create(shareData: Omit<PublicationShare, 'id' | 'createdAt'>) {
    const cleanedData = removeUndefinedFields({
      ...shareData,
      createdAt: Timestamp.now()
    });

    const docRef = await addDoc(collection(db, 'publication_shares'), cleanedData);

    // Increment shares count
    await publicationService.incrementStat(shareData.publicationId, 'shares', 1);

    return docRef.id;
  }
};

// Partnership Services
export const partnershipService = {
  async create(requestData: Omit<PartnershipRequest, 'id' | 'createdAt' | 'updatedAt'>) {
    const cleanedData = removeUndefinedFields({
      ...requestData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    const docRef = await addDoc(collection(db, 'partnership_requests'), cleanedData);
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    snapshot.forEach(async (userDoc) => {
      const userData = userDoc.data() as User;
      if (userData.role === 'admin' || userData.role === 'superadmin') {
        await notificationService.create({
          userId: userDoc.id,
          title: 'New Partnership Request',
          message: `A new partnership request has been received from ${requestData.contactName}.`,
          type: 'system',
          read: false
        });
      }
    });

    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'partnership_requests'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PartnershipRequest[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'partnership_requests', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as PartnershipRequest;
    }
    return null;
  },

  async update(id: string, updates: Partial<PartnershipRequest>) {
    const cleanedData = removeUndefinedFields({
      ...updates,
      updatedAt: Timestamp.now()
    });
    await updateDoc(doc(db, 'partnership_requests', id), cleanedData);
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'partnership_requests', id));
  },

  async getOccupiedSlots(): Promise<Array<{ date: string; startTime: string; endTime: string; title: string }>> {
    try {
      // Get partnership meetings
      const meetingsSnapshot = await getDocs(
        query(collection(db, 'partnership_meetings'), where('status', '==', 'scheduled'))
      );

      const partnershipSlots = meetingsSnapshot.docs.map(doc => {
        const data = doc.data() as PartnershipMeeting;
        return {
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          title: `${data.title} - ${data.organizationName}`
        };
      });

      // Get course schedules (existing calendar events)
      const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
      const courseSlots = schedulesSnapshot.docs.map(doc => {
        const data = doc.data() as CourseSchedule;
        const startTime = data.startTime instanceof Timestamp ? data.startTime.toDate() : new Date(data.startTime);
        const endTime = data.endTime instanceof Timestamp ? data.endTime.toDate() : new Date(data.endTime);

        return {
          date: startTime.toISOString().split('T')[0],
          startTime: startTime.toTimeString().slice(0, 5),
          endTime: endTime.toTimeString().slice(0, 5),
          title: `Course: ${data.courseId}`
        };
      });

      return [...partnershipSlots, ...courseSlots];
    } catch (error) {
      console.error('Error fetching occupied slots:', error);
      return [];
    }
  },

};

export const partnershipContentService = {
  async get(): Promise<PartnershipContent | null> {
    try {
      // Get the first (and should be only) partnership content document
      const querySnapshot = await getDocs(collection(db, 'partnership_content'));
      if (querySnapshot.empty) {
        // Create default content if none exists
        return await this.createDefault();
      }

      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as PartnershipContent;
    } catch (error) {
      console.error('Error fetching partnership content:', error);
      return null;
    }
  },

  async update(updates: Partial<PartnershipContent>) {
    try {
      const querySnapshot = await getDocs(collection(db, 'partnership_content'));
      if (querySnapshot.empty) {
        // Create new document if none exists
        await this.createDefault();
        return;
      }

      const docRef = querySnapshot.docs[0].ref;
      const cleanedData = removeUndefinedFields({
        ...updates,
        updatedAt: Timestamp.now()
      });

      await updateDoc(docRef, cleanedData);
    } catch (error) {
      console.error('Error updating partnership content:', error);
      throw error;
    }
  },

  async createDefault(): Promise<PartnershipContent> {
    const defaultContent: Omit<PartnershipContent, 'id'> = {
      title: 'Become Our Partner',
      subtitle: 'Join us in promoting African dance and culture through strategic partnerships.',
      opportunities: {
        danceSports: {
          title: 'Dance & Sports Courses',
          description: 'Collaborate with us to offer specialized dance and sports programs to your community.'
        },
        eventOrganization: {
          title: 'Event Organization',
          description: 'Partner with us to organize cultural events, workshops, and festivals.'
        },
        coachCollaboration: {
          title: 'Coach Collaboration',
          description: 'Connect with our network of professional coaches and dancers.'
        }
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'partnership_content'), defaultContent);
    return { id: docRef.id, ...defaultContent };
  }
};

export const partnershipMeetingService = {
  async create(meetingData: Omit<PartnershipMeeting, 'id' | 'createdAt' | 'updatedAt'>) {
    const cleanedData = removeUndefinedFields({
      ...meetingData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    const docRef = await addDoc(collection(db, 'partnership_meetings'), cleanedData);
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'partnership_meetings'), orderBy('date', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PartnershipMeeting[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'partnership_meetings', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as PartnershipMeeting;
    }
    return null;
  },

  async update(id: string, updates: Partial<PartnershipMeeting>) {
    const cleanedData = removeUndefinedFields({
      ...updates,
      updatedAt: Timestamp.now()
    });
    await updateDoc(doc(db, 'partnership_meetings', id), cleanedData);
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'partnership_meetings', id));
  },

  async getByDate(date: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'partnership_meetings'), where('date', '==', date))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PartnershipMeeting[];
  }
};

// Marketplace Services

// Seller Application Services
export const sellerApplicationService = {
  async create(applicationData: Omit<SellerApplication, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'seller_applications'), removeUndefinedFields({
      ...applicationData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'seller_applications'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SellerApplication[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'seller_applications', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SellerApplication;
    }
    return null;
  },

  async getByUserId(userId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'seller_applications'), where('userId', '==', userId))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SellerApplication[];
  },

  async getPending() {
    const querySnapshot = await getDocs(
      query(collection(db, 'seller_applications'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SellerApplication[];
  },

  async update(id: string, updateData: Partial<SellerApplication>) {
    await updateDoc(doc(db, 'seller_applications', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async approve(id: string, processedBy: string, adminNotes?: string) {
    await this.update(id, {
      status: 'approved',
      processedBy,
      processedAt: Timestamp.now(),
      adminNotes
    });
  },

  async reject(id: string, processedBy: string, rejectionReason: string, adminNotes?: string) {
    await this.update(id, {
      status: 'rejected',
      processedBy,
      processedAt: Timestamp.now(),
      rejectionReason,
      adminNotes
    });
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'seller_applications', id));
  }
};

// Seller Profile Services
export const sellerProfileService = {
  async create(profileData: Omit<SellerProfile, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'seller_profiles'), removeUndefinedFields({
      ...profileData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'seller_profiles'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SellerProfile[];
  },

  async getActive() {
    const querySnapshot = await getDocs(
      query(collection(db, 'seller_profiles'), where('isActive', '==', true))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SellerProfile[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'seller_profiles', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SellerProfile;
    }
    return null;
  },

  async getByUserId(userId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'seller_profiles'), where('userId', '==', userId), limit(1))
    );
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as SellerProfile;
    }
    return null;
  },

  async getByCategory(categoryId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'seller_profiles'), where('businessCategory', '==', categoryId), where('isActive', '==', true))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SellerProfile[];
  },

  async update(id: string, updateData: Partial<SellerProfile>) {
    await updateDoc(doc(db, 'seller_profiles', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async updateSubscriptionStatus(id: string, status: 'active' | 'inactive' | 'suspended') {
    await this.update(id, { subscriptionStatus: status });
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'seller_profiles', id));
  }
};

// Product Category Services
export const productCategoryService = {
  async create(categoryData: Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'product_categories'), removeUndefinedFields({
      ...categoryData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'product_categories'));
    const categories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductCategory[];
    // Sort in memory instead of using Firestore orderBy to avoid index issues
    return categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  },

  async getActive() {
    const querySnapshot = await getDocs(
      query(collection(db, 'product_categories'), where('isActive', '==', true))
    );
    const categories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductCategory[];
    // Sort in memory instead of using Firestore orderBy to avoid index issues
    return categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'product_categories', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ProductCategory;
    }
    return null;
  },

  async getByParent(parentId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'product_categories'), where('parentCategoryId', '==', parentId))
    );
    const categories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductCategory[];
    // Sort in memory instead of using Firestore orderBy to avoid index issues
    return categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  },

  async update(id: string, updateData: Partial<ProductCategory>) {
    await updateDoc(doc(db, 'product_categories', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'product_categories', id));
  }
};

// Product Services
export const productService = {
  async create(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'products'), removeUndefinedFields({
      ...productData,
      views: 0,
      totalSold: 0,
      rating: 0,
      reviewCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'products'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
  },

  async getActive() {
    const querySnapshot = await getDocs(
      query(collection(db, 'products'), where('isActive', '==', true), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
  },

  async getFeatured() {
    const querySnapshot = await getDocs(
      query(collection(db, 'products'), where('isFeatured', '==', true), where('isActive', '==', true), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'products', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Product;
    }
    return null;
  },

  async getBySeller(sellerId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'products'), where('sellerId', '==', sellerId), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
  },

  async getByCategory(categoryId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'products'), where('categoryId', '==', categoryId), where('isActive', '==', true), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
  },

  async search(searchTerm: string) {
    // For simple search, we'll get all active products and filter client-side
    // In production, you'd want to use a search service like Algolia
    const querySnapshot = await getDocs(
      query(collection(db, 'products'), where('isActive', '==', true))
    );
    const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];

    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  },

  async update(id: string, updateData: Partial<Product>) {
    await updateDoc(doc(db, 'products', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async incrementViews(id: string) {
    const product = await this.getById(id);
    if (product) {
      await this.update(id, { views: product.views + 1 });
    }
  },

  async updateStock(id: string, newStock: number) {
    await this.update(id, { stock: newStock });
  },

  async updateRating(productId: string) {
    // Calculate average rating from reviews
    const reviews = await productReviewService.getByProduct(productId);
    if (reviews.length > 0) {
      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
      await this.update(productId, {
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        reviewCount: reviews.length
      });
    }
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'products', id));
  }
};

// Order Services
export const orderService = {
  async create(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'orders'), removeUndefinedFields({
      ...orderData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'orders', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Order;
    }
    return null;
  },

  async getByCustomer(customerId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'orders'), where('customerId', '==', customerId), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
  },

  async getBySeller(sellerId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'orders'), where('sellerId', '==', sellerId), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
  },

  async getByStatus(status: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'orders'), where('orderStatus', '==', status), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
  },

  async update(id: string, updateData: Partial<Order>) {
    await updateDoc(doc(db, 'orders', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async updateStatus(id: string, status: Order['orderStatus'], sellerNotes?: string) {
    const updateData: Partial<Order> = {
      orderStatus: status,
      updatedAt: Timestamp.now()
    };

    if (sellerNotes) {
      updateData.sellerNotes = sellerNotes;
    }

    if (status === 'delivered') {
      updateData.actualDeliveryTime = Timestamp.now();
    }

    await updateDoc(doc(db, 'orders', id), removeUndefinedFields(updateData));

    // Send notification to customer
    const order = await this.getById(id);
    if (order) {
      await notificationService.create({
        userId: order.customerId,
        title: `Order Status Updated`,
        message: `Your order #${order.orderNumber} is now ${status}.`,
        type: 'system',
        read: false
      });
    }
  },

  async cancel(id: string, cancelReason: string) {
    await this.update(id, {
      orderStatus: 'cancelled',
      cancelReason
    });
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'orders', id));
  }
};

// Product Review Services
export const productReviewService = {
  async create(reviewData: Omit<ProductReview, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'product_reviews'), removeUndefinedFields({
      ...reviewData,
      helpfulVotes: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));

    // Update product rating
    await productService.updateRating(reviewData.productId);

    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'product_reviews'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductReview[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'product_reviews', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ProductReview;
    }
    return null;
  },

  async getByProduct(productId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'product_reviews'), where('productId', '==', productId), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductReview[];
  },

  async getByCustomer(customerId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'product_reviews'), where('customerId', '==', customerId), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductReview[];
  },

  async getBySeller(sellerId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'product_reviews'), where('sellerId', '==', sellerId), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductReview[];
  },

  async update(id: string, updateData: Partial<ProductReview>) {
    await updateDoc(doc(db, 'product_reviews', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async moderate(id: string, moderatedBy: string, isModerated: boolean = true) {
    await this.update(id, {
      isModerated,
      moderatedBy,
      moderatedAt: Timestamp.now()
    });
  },

  async addHelpfulVote(id: string) {
    const review = await this.getById(id);
    if (review) {
      await this.update(id, { helpfulVotes: review.helpfulVotes + 1 });
    }
  },

  async delete(id: string) {
    const review = await this.getById(id);
    if (review) {
      await deleteDoc(doc(db, 'product_reviews', id));
      // Update product rating after deletion
      await productService.updateRating(review.productId);
    }
  }
};

// Delivery Tracking Services
export const deliveryTrackingService = {
  async create(trackingData: Omit<DeliveryTracking, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'delivery_tracking'), removeUndefinedFields({
      ...trackingData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'delivery_tracking'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DeliveryTracking[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'delivery_tracking', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as DeliveryTracking;
    }
    return null;
  },

  async getByOrder(orderId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'delivery_tracking'), where('orderId', '==', orderId), limit(1))
    );
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as DeliveryTracking;
    }
    return null;
  },

  async getByCustomer(customerId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'delivery_tracking'), where('customerId', '==', customerId), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DeliveryTracking[];
  },

  async getByTrackingNumber(trackingNumber: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'delivery_tracking'), where('trackingNumber', '==', trackingNumber), limit(1))
    );
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as DeliveryTracking;
    }
    return null;
  },

  async update(id: string, updateData: Partial<DeliveryTracking>) {
    await updateDoc(doc(db, 'delivery_tracking', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async updateStatus(id: string, status: DeliveryTracking['status'], description?: string, location?: string) {
    const tracking = await this.getById(id);
    if (tracking) {
      const newEvent: TrackingEvent = {
        id: Date.now().toString(),
        status,
        description: description || `Package is ${status}`,
        location,
        timestamp: Timestamp.now()
      };

      const updatedEvents = [...tracking.trackingEvents, newEvent];

      await this.update(id, {
        status,
        trackingEvents: updatedEvents
      });

      // Send notification to customer
      await notificationService.create({
        userId: tracking.customerId,
        title: 'Delivery Update',
        message: `Your package is now ${status}. ${description || ''}`,
        type: 'system',
        read: false
      });
    }
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'delivery_tracking', id));
  }
};

// Seller Earnings Services
export const sellerEarningsService = {
  async create(earningsData: Omit<SellerEarnings, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'seller_earnings'), removeUndefinedFields({
      ...earningsData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'seller_earnings'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SellerEarnings[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'seller_earnings', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SellerEarnings;
    }
    return null;
  },

  async getBySeller(sellerId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'seller_earnings'), where('sellerId', '==', sellerId), limit(1))
    );
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as SellerEarnings;
    }
    return null;
  },

  async update(id: string, updateData: Partial<SellerEarnings>) {
    await updateDoc(doc(db, 'seller_earnings', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async processOrderEarning(sellerId: string, orderId: string, orderTotal: number, commissionRate: number) {
    let earnings = await this.getBySeller(sellerId);

    if (!earnings) {
      // Create new earnings record
      const sellerProfile = await sellerProfileService.getByUserId(sellerId);
      if (!sellerProfile) return;

      const earningsId = await this.create({
        sellerId,
        sellerName: sellerProfile.businessName,
        businessName: sellerProfile.businessName,
        totalRevenue: 0,
        totalOrders: 0,
        subscriptionFees: 0,
        commissionFees: 0,
        netEarnings: 0,
        availableBalance: 0,
        totalWithdrawn: 0,
        subscriptionModel: sellerProfile.subscriptionModel,
        monthlySubscriptionPrice: sellerProfile.monthlySubscriptionPrice,
        commissionRate: sellerProfile.commissionRate,
        lastCalculatedAt: Timestamp.now()
      });
      earnings = await this.getById(earningsId);
    }

    if (earnings) {
      const commissionFee = earnings.subscriptionModel === 'commission' ? (orderTotal * commissionRate / 100) : 0;
      const netAmount = orderTotal - commissionFee;

      await this.update(earnings.id, {
        totalRevenue: earnings.totalRevenue + orderTotal,
        totalOrders: earnings.totalOrders + 1,
        commissionFees: earnings.commissionFees + commissionFee,
        netEarnings: earnings.netEarnings + netAmount,
        availableBalance: earnings.availableBalance + netAmount,
        lastCalculatedAt: Timestamp.now()
      });

      // Create transaction record
      await sellerTransactionService.create({
        sellerId,
        orderId,
        type: 'sale',
        amount: netAmount,
        currency: 'CHF',
        description: `Sale from order #${orderId}`,
        status: 'completed'
      });
    }
  },

  async processSubscriptionFee(sellerId: string, amount: number) {
    const earnings = await this.getBySeller(sellerId);
    if (earnings) {
      await this.update(earnings.id, {
        subscriptionFees: earnings.subscriptionFees + amount,
        availableBalance: Math.max(0, earnings.availableBalance - amount),
        lastCalculatedAt: Timestamp.now()
      });

      // Create transaction record
      await sellerTransactionService.create({
        sellerId,
        type: 'subscription_fee',
        amount: -amount,
        currency: 'CHF',
        description: 'Monthly subscription fee',
        status: 'completed'
      });
    }
  },

  async processWithdrawal(sellerId: string, amount: number) {
    const earnings = await this.getBySeller(sellerId);
    if (earnings && earnings.availableBalance >= amount) {
      await this.update(earnings.id, {
        availableBalance: earnings.availableBalance - amount,
        totalWithdrawn: earnings.totalWithdrawn + amount,
        lastCalculatedAt: Timestamp.now()
      });

      // Create transaction record
      await sellerTransactionService.create({
        sellerId,
        type: 'withdrawal',
        amount: -amount,
        currency: 'CHF',
        description: 'Earnings withdrawal',
        status: 'completed'
      });

      return true;
    }
    return false;
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'seller_earnings', id));
  }
};

// Seller Transaction Services
export const sellerTransactionService = {
  async create(transactionData: Omit<SellerTransaction, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'seller_transactions'), removeUndefinedFields({
      ...transactionData,
      createdAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'seller_transactions'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SellerTransaction[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'seller_transactions', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SellerTransaction;
    }
    return null;
  },

  async getBySeller(sellerId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'seller_transactions'), where('sellerId', '==', sellerId), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SellerTransaction[];
  },

  async getByType(sellerId: string, type: SellerTransaction['type']) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'seller_transactions'),
        where('sellerId', '==', sellerId),
        where('type', '==', type),
        orderBy('createdAt', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SellerTransaction[];
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'seller_transactions', id));
  }
};

// Marketplace Settings Services
export const marketplaceSettingsService = {
  async get() {
    const docSnap = await getDoc(doc(db, 'admin_settings', 'marketplace'));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as MarketplaceSettings;
    }
    return null;
  },

  async create(settingsData: Omit<MarketplaceSettings, 'id'>) {
    await setDoc(doc(db, 'admin_settings', 'marketplace'), removeUndefinedFields(settingsData));
    return 'marketplace';
  },

  async update(updateData: Partial<MarketplaceSettings>) {
    await updateDoc(doc(db, 'admin_settings', 'marketplace'), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async getCommissionRate(activityType: 'products' | 'food' | 'services') {
    const settings = await this.get();
    return settings?.commissionRates[activityType] || 10; // Default 10%
  },

  async getSubscriptionPrice(activityType: 'products' | 'food' | 'services') {
    const settings = await this.get();
    return settings?.subscriptionPrices[activityType] || 29.99; // Default price
  },

  async getVatRate(country: string) {
    const settings = await this.get();
    return settings?.vatRates[country] || 7.7; // Default Swiss VAT
  }
};

// Gift Card Services
export const giftCardService = {
  async create(giftCardData: Omit<GiftCard, 'id'>) {
    const docRef = await addDoc(collection(db, 'giftCards'), {
      ...removeUndefinedFields(giftCardData),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { id: docRef.id, ...giftCardData };
  },

  async getById(id: string) {
    const docRef = doc(db, 'giftCards', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as GiftCard : null;
  },

  async getByCardCode(cardCode: string) {
    const q = query(
      collection(db, 'giftCards'),
      where('cardCode', '==', cardCode),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as GiftCard;
    }
    return null;
  },

  async getByIssuer(issuerId: string, issuerType: 'seller' | 'coach') {
    const q = query(
      collection(db, 'giftCards'),
      where('issuerId', '==', issuerId),
      where('issuerType', '==', issuerType),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GiftCard[];
  },

  async getByUser(userId: string) {
    const q = query(
      collection(db, 'giftCards'),
      where('usedBy', '==', userId),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GiftCard[];
  },

  async getActiveByUser(userId: string) {
    const q = query(
      collection(db, 'giftCards'),
      where('usedBy', '==', userId),
      where('isActive', '==', true),
      where('remainingAmount', '>', 0)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GiftCard[];
  },

  async update(id: string, updates: Partial<GiftCard>) {
    const docRef = doc(db, 'giftCards', id);
    await updateDoc(docRef, {
      ...removeUndefinedFields(updates),
      updatedAt: Timestamp.now()
    });
  },

  async validateAndUse(cardCode: string, amountToUse: number, customerId: string, customerName: string, businessId?: string, orderId?: string, bookingId?: string, transactionType?: 'course' | 'product' | 'token') {
    const card = await this.getByCardCode(cardCode);
    console.log(businessId)
    if (!card) {
      throw new Error('Gift card not found');
    }

    if (!card.isActive) {
      throw new Error('Gift card is not active');
    }

    if (card.isUsed && card.remainingAmount === 0) {
      throw new Error('Gift card has been fully used');
    }

    // Enhanced validation: Check gift card type against transaction type
    if (transactionType) {
      const cardCodeUpper = cardCode.toUpperCase();

      if (transactionType === 'course' || transactionType === 'token') {
        // Course and token purchases require COACH gift cards
        if (!cardCodeUpper.startsWith('COACH-')) {
          throw new Error('This gift card can only be used for product purchases. Please use a COACH gift card for course and token purchases.');
        }

        // If businessId provided, ensure it matches the coach who issued the card
        if (businessId && card.issuerId !== businessId) {
          throw new Error(`This gift card can only be used with courses/tokens from ${card.businessName || card.issuerName}`);
        }
      } else if (transactionType === 'product') {
        // Product purchases require SELLER gift cards
        if (!cardCodeUpper.startsWith('SELLER-')) {
          throw new Error('This gift card can only be used for course and token purchases. Please use a SELLER gift card for product purchases.');
        }

        // If businessId provided, ensure it matches the seller who issued the card
        if (businessId && card.issuerId !== businessId) {
          throw new Error(`This gift card can only be used with products from ${card.businessName || card.issuerName}`);
        }
      }
    }

    // Check if gift card belongs to the right business (legacy check for backward compatibility)
    if (businessId && card.issuerId !== businessId && !transactionType) {
      throw new Error(`This gift card can only be used with ${card.businessName || card.issuerName}`);
    }

    // Check expiration
    const expirationDate = card.expirationDate instanceof Timestamp
      ? card.expirationDate.toDate()
      : new Date(card.expirationDate as any);

    if (expirationDate < new Date()) {
      throw new Error('Gift card has expired');
    }

    if (card.remainingAmount < amountToUse) {
      throw new Error(`Insufficient gift card balance. Available: ${card.remainingAmount}`);
    }

    // Calculate new remaining amount
    const newRemainingAmount = card.remainingAmount - amountToUse;
    const isFullyUsed = newRemainingAmount === 0;

    // Update gift card
    const updateData: Partial<GiftCard> = {
      remainingAmount: newRemainingAmount,
      isUsed: isFullyUsed,
      updatedAt: new Date()
    };

    if (isFullyUsed) {
      updateData.usedAt = new Date();
      updateData.usedBy = customerId;
      updateData.usedByName = customerName;
      if (orderId) updateData.usedForOrderId = orderId;
      if (bookingId) updateData.usedForBookingId = bookingId;
    }

    await this.update(card.id, updateData);

    // Create transaction record
    await giftCardTransactionService.create({
      giftCardId: card.id,
      customerId,
      customerName,
      orderId,
      bookingId,
      amountUsed: amountToUse,
      transactionType: isFullyUsed ? 'redemption' : 'partial_redemption',
      createdAt: new Date()
    });

    return {
      card: { ...card, ...updateData },
      amountUsed: amountToUse,
      remainingAmount: newRemainingAmount
    };
  },

  async deactivate(id: string) {
    await this.update(id, { isActive: false });
  },

  async delete(id: string) {
    const docRef = doc(db, 'giftCards', id);
    await deleteDoc(docRef);
  }
};

// Gift Card Transaction Services
export const giftCardTransactionService = {
  async create(transactionData: Omit<GiftCardTransaction, 'id'>) {
    const docRef = await addDoc(collection(db, 'giftCardTransactions'), {
      ...removeUndefinedFields(transactionData),
      createdAt: Timestamp.now()
    });
    return { id: docRef.id, ...transactionData };
  },

  async getByGiftCard(giftCardId: string) {
    const q = query(
      collection(db, 'giftCardTransactions'),
      where('giftCardId', '==', giftCardId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GiftCardTransaction[];
  },

  async getByIssuer(issuerId: string) {
    // Get all gift cards by issuer first
    const giftCards = await giftCardService.getByIssuer(issuerId, 'seller'); // This would need to be dynamic
    const giftCardIds = giftCards.map(card => card.id);

    if (giftCardIds.length === 0) return [];

    const q = query(
      collection(db, 'giftCardTransactions'),
      where('giftCardId', 'in', giftCardIds),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GiftCardTransaction[];
  }
};

// Product Variant Type Services
export const productVariantTypeService = {
  async create(variantTypeData: Omit<ProductVariantType, 'id'>) {
    const docRef = await addDoc(collection(db, 'product_variant_types'), removeUndefinedFields({
      ...variantTypeData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'product_variant_types'), orderBy('sortOrder', 'asc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductVariantType[];
  },

  async getBySeller(sellerId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'product_variant_types'),
        where('sellerId', '==', sellerId),
        where('isActive', '==', true),
        orderBy('sortOrder', 'asc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductVariantType[];
  },

  async getBySellerAndCategory(sellerId: string, productCategory: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'product_variant_types'),
        where('sellerId', '==', sellerId),
        where('productCategories', 'array-contains', productCategory.toLowerCase()),
        where('isActive', '==', true),
        orderBy('sortOrder', 'asc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductVariantType[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'product_variant_types', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ProductVariantType;
    }
    return null;
  },

  async update(id: string, updateData: Partial<ProductVariantType>) {
    await updateDoc(doc(db, 'product_variant_types', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'product_variant_types', id));
  },

  // Get variant types by seller and type
  async getBySellerAndType(sellerId: string, type: 'size' | 'color' | 'material' | 'length' | 'format' | 'style' | 'custom') {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'product_variant_types'),
        where('sellerId', '==', sellerId),
        where('type', '==', type),
        where('isActive', '==', true),
        orderBy('sortOrder', 'asc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductVariantType[];
  },

  // Get predefined variant types for different categories
  async getByType(type: 'size' | 'color' | 'material' | 'length' | 'format' | 'style' | 'custom') {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'product_variant_types'),
        where('type', '==', type),
        orderBy('sortOrder', 'asc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductVariantType[];
  }
};

// Discount Card Services
export const discountCardService = {
  async create(discountCardData: Omit<DiscountCard, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'discount_cards'), removeUndefinedFields({
      ...discountCardData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'discount_cards'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DiscountCard[];
  },

  async getByCoachId(coachId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'discount_cards'),
        where('coachId', '==', coachId),
        orderBy('createdAt', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DiscountCard[];
  },

  async getByCode(code: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'discount_cards'), where('code', '==', code))
    );
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as DiscountCard;
    }
    return null;
  },

  async getActive() {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'discount_cards'),
        where('isActive', '==', true),
        where('expiryDate', '>', Timestamp.now())
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DiscountCard[];
  },

  async update(id: string, updateData: Partial<DiscountCard>) {
    await updateDoc(doc(db, 'discount_cards', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'discount_cards', id));
  },

  async incrementUsage(id: string) {
    const card = await this.getById(id);
    if (card) {
      const newUsageCount = card.usageCount + 1;
      await this.update(id, {
        usageCount: newUsageCount,
        isActive: card.usageLimit ? newUsageCount < card.usageLimit : true
      });
      return true;
    }
    return false;
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'discount_cards', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as DiscountCard;
    }
    return null;
  }
};

// Referral Services
export const referralService = {
  async create(referralData: Omit<Referral, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'referrals'), removeUndefinedFields({
      ...referralData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'referrals'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Referral[];
  },

  async getByStatus(status: 'pending' | 'approved' | 'rejected') {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'referrals'),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Referral[];
  },

  async getBySponsor(sponsorId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'referrals'),
        where('sponsorId', '==', sponsorId),
        orderBy('createdAt', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Referral[];
  },

  async getByReferee(refereeId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'referrals'),
        where('refereeId', '==', refereeId),
        orderBy('createdAt', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Referral[];
  },

  async getByCode(referralCode: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'referrals'), where('referralCode', '==', referralCode))
    );
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Referral;
    }
    return null;
  },

  async update(id: string, updateData: Partial<Referral>) {
    await updateDoc(doc(db, 'referrals', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async approve(id: string, adminId: string, adminName: string) {
    const referral = await this.getById(id);
    if (!referral) throw new Error('Referral not found');

    // Get referral reward settings from admin_settings collection
    let sponsorRewardAmount = 50; // Default values
    let refereeRewardAmount = 25;

    try {
      const settingsDoc = await getDoc(doc(db, 'admin_settings', 'referral_rewards'));
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        if (settings.isEnabled && settings.sponsorReward && settings.referredUserReward) {
          sponsorRewardAmount = settings.sponsorReward.amount || 50;
          refereeRewardAmount = settings.referredUserReward.amount || 25;
        }
      }
    } catch (settingsError) {
      console.error('Error fetching referral settings, using defaults:', settingsError);
    }

    await this.update(id, {
      status: 'approved',
      approvedAt: Timestamp.now(),
      approvedBy: adminId,
      approvedByName: adminName
    });

    // Credit both sponsor and referee
    console.log('Attempting to credit users:', {
      sponsorId: referral.sponsorId,
      refereeId: referral.refereeId,
      sponsorRewardAmount,
      refereeRewardAmount
    });

    const sponsor = await userService.getById(referral.sponsorId);
    const referee = await userService.getById(referral.refereeId);

    console.log('Retrieved users:', {
      sponsor: sponsor ? `${sponsor.firstName} ${sponsor.lastName} (credits: ${sponsor.credits})` : 'NOT FOUND',
      referee: referee ? `${referee.firstName} ${referee.lastName} (credits: ${referee.credits})` : 'NOT FOUND'
    });

    if (sponsor && referee) {
      console.log('Both users found, proceeding with credit updates...');

      await userService.update(referral.sponsorId, {
        credits: (sponsor.credits || 0) + sponsorRewardAmount
      });
      await userService.update(referral.refereeId, {
        credits: (referee.credits || 0) + refereeRewardAmount
      });

      console.log('User credits updated successfully');

      // Create credit transactions
      await creditTransactionService.create({
        userId: referral.sponsorId,
        adminId,
        adminName,
        type: 'credit',
        amount: sponsorRewardAmount,
        reason: `Referral bonus for referring ${referral.refereeName}`,
        balanceBefore: sponsor.credits || 0,
        balanceAfter: (sponsor.credits || 0) + sponsorRewardAmount
      });

      await creditTransactionService.create({
        userId: referral.refereeId,
        adminId,
        adminName,
        type: 'credit',
        amount: refereeRewardAmount,
        reason: `Welcome bonus for being referred by ${referral.sponsorName}`,
        balanceBefore: referee.credits || 0,
        balanceAfter: (referee.credits || 0) + refereeRewardAmount
      });

      console.log('Credit transactions created successfully');

      // Send notifications
      await notificationService.create({
        userId: referral.sponsorId,
        title: 'Referral Approved!',
        message: `Your referral of ${referral.refereeName} has been approved. You've earned ${sponsorRewardAmount} credits!`,
        type: 'system',
        read: false
      });

      await notificationService.create({
        userId: referral.refereeId,
        title: 'Welcome Bonus!',
        message: `Welcome to AfroBoost! You've received ${refereeRewardAmount} credits as a welcome bonus.`,
        type: 'system',
        read: false
      });

      console.log('Notifications sent successfully');
    } else {
      const missingUsers = [];
      if (!sponsor) missingUsers.push(`sponsor (ID: ${referral.sponsorId})`);
      if (!referee) missingUsers.push(`referee (ID: ${referral.refereeId})`);

      const errorMessage = `Cannot approve referral: ${missingUsers.join(' and ')} not found`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  },

  async reject(id: string, adminId: string, adminName: string, reason: string) {
    await this.update(id, {
      status: 'rejected',
      rejectedAt: Timestamp.now(),
      rejectedBy: adminId,
      rejectedByName: adminName,
      rejectionReason: reason
    });

    const referral = await this.getById(id);
    if (referral) {
      // Send notification to sponsor
      await notificationService.create({
        userId: referral.sponsorId,
        title: 'Referral Update',
        message: `Your referral of ${referral.refereeName} has been reviewed. Reason: ${reason}`,
        type: 'system',
        read: false
      });
    }
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'referrals', id));
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'referrals', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Referral;
    }
    return null;
  },

  async validateReferralCode(code: string) {
    // Check if user exists with this referral code
    const usersQuery = query(
      collection(db, 'users'),
      where('referralCode', '==', code)
    );
    const usersSnapshot = await getDocs(usersQuery);

    if (usersSnapshot.empty) {
      return { valid: false, message: 'Invalid referral code' };
    }

    const sponsor = { id: usersSnapshot.docs[0].id, ...usersSnapshot.docs[0].data() } as User;
    return {
      valid: true,
      sponsor,
      message: `Valid referral code from ${sponsor.firstName} ${sponsor.lastName}`
    };
  },

  async getReferralStats() {
    const totalQuery = await getDocs(collection(db, 'referrals'));
    const pendingQuery = await getDocs(query(collection(db, 'referrals'), where('status', '==', 'pending')));
    const approvedQuery = await getDocs(query(collection(db, 'referrals'), where('status', '==', 'approved')));
    const rejectedQuery = await getDocs(query(collection(db, 'referrals'), where('status', '==', 'rejected')));

    return {
      total: totalQuery.size,
      pending: pendingQuery.size,
      approved: approvedQuery.size,
      rejected: rejectedQuery.size
    };
  }
};

// Product Variant Services
export const productVariantService = {
  async create(variantData: Omit<ProductVariant, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'product_variants'), removeUndefinedFields({
      ...variantData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'product_variants'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductVariant[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'product_variants', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ProductVariant;
    }
    return null;
  },

  async getByProduct(productId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'product_variants'),
        where('productId', '==', productId),
        where('isActive', '==', true)
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductVariant[];
  },

  async getBySku(sku: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'product_variants'), where('sku', '==', sku))
    );
    const variants = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductVariant[];
    return variants.length > 0 ? variants[0] : null;
  },

  async update(id: string, updateData: Partial<ProductVariant>) {
    await updateDoc(doc(db, 'product_variants', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async updateStock(id: string, newStock: number) {
    await this.update(id, { stock: newStock });
  },

  async updatePrice(id: string, price: number, salePrice?: number) {
    const updateData: Partial<ProductVariant> = { price };
    if (salePrice !== undefined) {
      updateData.salePrice = salePrice;
    }
    await this.update(id, updateData);
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'product_variants', id));
  },

  async deleteByProduct(productId: string) {
    const variants = await this.getByProduct(productId);
    const deletePromises = variants.map(variant => this.delete(variant.id));
    await Promise.all(deletePromises);
  },

  // Bulk create variants for a product
  async createBulk(variantDataArray: Omit<ProductVariant, 'id' | 'createdAt' | 'updatedAt'>[]) {
    const createPromises = variantDataArray.map(variantData => this.create(variantData));
    return await Promise.all(createPromises);
  },

  // Get available variant combinations for a product
  async getAvailableVariantCombinations(productId: string) {
    const variants = await this.getByProduct(productId);
    return variants.filter(variant => variant.stock > 0);
  },

  // Generate variant display text
  generateDisplayText(combinations: { [key: string]: string }, variantTypes: ProductVariantType[]) {
    const displayParts: string[] = [];

    Object.entries(combinations).forEach(([typeId, value]) => {
      const variantType = variantTypes.find(vt => vt.id === typeId);
      if (variantType) {
        const optionsArray = Array.isArray(variantType.options)
          ? variantType.options
          : Object.values(variantType.options as Record<string, any>);
        const option = optionsArray.find(opt => opt.id === value);
        if (option) {
          displayParts.push(`${variantType.displayName}: ${option.displayValue}`);
        }
      }
    });

    return displayParts.join(', ');
  }
};


export const predefinedVariantTypesService = {
  async seedDefaultVariantTypes(user: User) {
    // Clothing sizes
    const clothingSizeOptions: ProductVariantOption[] = [
      { id: 'xs', value: 'XS', displayValue: 'Extra Small', sortOrder: 1, isActive: true },
      { id: 's', value: 'S', displayValue: 'Small', sortOrder: 2, isActive: true },
      { id: 'm', value: 'M', displayValue: 'Medium', sortOrder: 3, isActive: true },
      { id: 'l', value: 'L', displayValue: 'Large', sortOrder: 4, isActive: true },
      { id: 'xl', value: 'XL', displayValue: 'Extra Large', sortOrder: 5, isActive: true },
      { id: 'xxl', value: 'XXL', displayValue: '2X Large', sortOrder: 6, isActive: true },
      { id: 'xxxl', value: 'XXXL', displayValue: '3X Large', sortOrder: 7, isActive: true }
    ];

    // Shoe sizes
    const shoeSizeOptions: ProductVariantOption[] = [];
    for (let size = 36; size <= 45; size++) {
      shoeSizeOptions.push({
        id: `size_${size}`,
        value: size.toString(),
        displayValue: `Size ${size}`,
        sortOrder: size - 35,
        isActive: true
      });
    }

    // Basic colors
    const colorOptions: ProductVariantOption[] = [
      { id: 'black', value: 'Black', displayValue: 'Black', colorHex: '#000000', sortOrder: 1, isActive: true },
      { id: 'white', value: 'White', displayValue: 'White', colorHex: '#FFFFFF', sortOrder: 2, isActive: true },
      { id: 'red', value: 'Red', displayValue: 'Red', colorHex: '#FF0000', sortOrder: 3, isActive: true },
      { id: 'blue', value: 'Blue', displayValue: 'Blue', colorHex: '#0000FF', sortOrder: 4, isActive: true },
      { id: 'green', value: 'Green', displayValue: 'Green', colorHex: '#008000', sortOrder: 5, isActive: true },
      { id: 'yellow', value: 'Yellow', displayValue: 'Yellow', colorHex: '#FFFF00', sortOrder: 6, isActive: true },
      { id: 'orange', value: 'Orange', displayValue: 'Orange', colorHex: '#FFA500', sortOrder: 7, isActive: true },
      { id: 'purple', value: 'Purple', displayValue: 'Purple', colorHex: '#800080', sortOrder: 8, isActive: true },
      { id: 'pink', value: 'Pink', displayValue: 'Pink', colorHex: '#FFC0CB', sortOrder: 9, isActive: true },
      { id: 'grey', value: 'Grey', displayValue: 'Grey', colorHex: '#808080', sortOrder: 10, isActive: true },
      { id: 'navy', value: 'Navy', displayValue: 'Navy Blue', colorHex: '#000080', sortOrder: 11, isActive: true },
      { id: 'brown', value: 'Brown', displayValue: 'Brown', colorHex: '#964B00', sortOrder: 12, isActive: true }
    ];

    // Materials
    const materialOptions: ProductVariantOption[] = [
      { id: 'cotton', value: 'Cotton', displayValue: '100% Cotton', sortOrder: 1, isActive: true },
      { id: 'polyester', value: 'Polyester', displayValue: '100% Polyester', sortOrder: 2, isActive: true },
      { id: 'leather', value: 'Leather', displayValue: 'Genuine Leather', sortOrder: 3, isActive: true },
      { id: 'wool', value: 'Wool', displayValue: '100% Wool', sortOrder: 4, isActive: true },
      { id: 'silk', value: 'Silk', displayValue: '100% Silk', sortOrder: 5, isActive: true },
      { id: 'denim', value: 'Denim', displayValue: 'Denim', sortOrder: 6, isActive: true },
      { id: 'canvas', value: 'Canvas', displayValue: 'Canvas', sortOrder: 7, isActive: true },
      { id: 'synthetic', value: 'Synthetic', displayValue: 'Synthetic Materials', sortOrder: 8, isActive: true }
    ];

    // Length options
    const lengthOptions: ProductVariantOption[] = [
      { id: 'short', value: 'Short', displayValue: 'Short', sortOrder: 1, isActive: true },
      { id: 'mid', value: 'Mid', displayValue: 'Mid-Length', sortOrder: 2, isActive: true },
      { id: 'long', value: 'Long', displayValue: 'Long', sortOrder: 3, isActive: true }
    ];

    // Format options (for liquids, etc.)
    const formatOptions: ProductVariantOption[] = [
      { id: '250ml', value: '250ml', displayValue: '250ml', sortOrder: 1, isActive: true },
      { id: '500ml', value: '500ml', displayValue: '500ml', sortOrder: 2, isActive: true },
      { id: '1l', value: '1L', displayValue: '1 Liter', sortOrder: 3, isActive: true },
      { id: '2l', value: '2L', displayValue: '2 Liters', sortOrder: 4, isActive: true },
      { id: '5l', value: '5L', displayValue: '5 Liters', sortOrder: 5, isActive: true }
    ];

    // Style options
    const styleOptions: ProductVariantOption[] = [
      { id: 'short_sleeve', value: 'Short Sleeve', displayValue: 'Short Sleeve', sortOrder: 1, isActive: true },
      { id: 'long_sleeve', value: 'Long Sleeve', displayValue: 'Long Sleeve', sortOrder: 2, isActive: true },
      { id: 'sleeveless', value: 'Sleeveless', displayValue: 'Sleeveless', sortOrder: 3, isActive: true },
      { id: 'tank_top', value: 'Tank Top', displayValue: 'Tank Top', sortOrder: 4, isActive: true }
    ];

    // Create default variant types
    const defaultVariantTypes = [
      {
        name: 'clothing_size',
        displayName: 'Clothing Size',
        type: 'size' as const,
        options: clothingSizeOptions,
        required: true,
        multiSelect: false,
        sortOrder: 1
      },
      {
        name: 'shoe_size',
        displayName: 'Shoe Size',
        type: 'size' as const,
        options: shoeSizeOptions,
        required: true,
        multiSelect: false,
        sortOrder: 2
      },
      {
        name: 'color',
        displayName: 'Color',
        type: 'color' as const,
        options: colorOptions,
        required: false,
        multiSelect: false,
        sortOrder: 3
      },
      {
        name: 'material',
        displayName: 'Material',
        type: 'material' as const,
        options: materialOptions,
        required: false,
        multiSelect: false,
        sortOrder: 4
      },
      {
        name: 'length',
        displayName: 'Length',
        type: 'length' as const,
        options: lengthOptions,
        required: false,
        multiSelect: false,
        sortOrder: 5
      },
      {
        name: 'format',
        displayName: 'Format',
        type: 'format' as const,
        options: formatOptions,
        required: false,
        multiSelect: false,
        sortOrder: 6
      },
      {
        name: 'style',
        displayName: 'Style',
        type: 'style' as const,
        options: styleOptions,
        required: false,
        multiSelect: false,
        sortOrder: 7
      }
    ];

    // Check if variant types already exist
    const existingTypes = await productVariantTypeService.getAll();

    // Only create types that don't exist
    for (const variantType of defaultVariantTypes) {
      const exists = existingTypes.some(existing => existing.name === variantType.name);
      if (!exists) {
        await productVariantTypeService.create({
          ...variantType,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isActive: true,
          sellerId: user.id,
          sellerName: `${user.firstName} ${user.lastName}`,
          productCategories: []
        });
      }
    }

    return true;
  }
};

// Coach Referral Activity Services
export const coachReferralActivityService = {
  async create(activityData: Omit<CoachReferralActivity, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'coach_referral_activities'), removeUndefinedFields({
      ...activityData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'coach_referral_activities'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CoachReferralActivity[];
  },

  async getByCoach(coachId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'coach_referral_activities'),
        where('coachId', '==', coachId),
        orderBy('createdAt', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CoachReferralActivity[];
  },

  async getByStatus(status: 'pending' | 'rewarded_both' | 'rewarded_purchaser' | 'rewarded_referrer' | 'no_reward') {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'coach_referral_activities'),
        where('rewardStatus', '==', status),
        orderBy('createdAt', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CoachReferralActivity[];
  },

  async update(id: string, updateData: Partial<CoachReferralActivity>) {
    await updateDoc(doc(db, 'coach_referral_activities', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'coach_referral_activities', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as CoachReferralActivity;
    }
    return null;
  },

  async markRewardGiven(activityId: string, userType: 'purchaser' | 'referrer', reward: {
    type: 'credits' | 'course';
    amount?: number;
    courseId?: string;
    courseName?: string;
    sessions?: number;
    rewardedBy: string;
  }) {
    const activity = await this.getById(activityId);
    if (!activity) throw new Error('Activity not found');

    const updateData: Partial<CoachReferralActivity> = {};

    if (userType === 'purchaser') {
      updateData.purchaserReward = {
        ...reward,
        rewardedAt: Timestamp.now()
      };

      // Update reward status
      if (activity.referrerReward) {
        updateData.rewardStatus = 'rewarded_both';
      } else {
        updateData.rewardStatus = 'rewarded_purchaser';
      }
    } else {
      updateData.referrerReward = {
        ...reward,
        rewardedAt: Timestamp.now()
      };

      // Update reward status
      if (activity.purchaserReward) {
        updateData.rewardStatus = 'rewarded_both';
      } else {
        updateData.rewardStatus = 'rewarded_referrer';
      }
    }

    await this.update(activityId, updateData);
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'coach_referral_activities', id));
  }
};

// Coach Referral License Services
export const coachReferralLicenseService = {
  async create(licenseData: Omit<CoachReferralLicense, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'coach_referral_licenses'), removeUndefinedFields({
      ...licenseData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'coach_referral_licenses'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CoachReferralLicense[];
  },

  async getByCoach(coachId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'coach_referral_licenses'), where('coachId', '==', coachId))
    );
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as CoachReferralLicense;
    }
    return null;
  },

  async getEnabled() {
    const querySnapshot = await getDocs(
      query(collection(db, 'coach_referral_licenses'), where('isEnabled', '==', true))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CoachReferralLicense[];
  },

  async update(id: string, updateData: Partial<CoachReferralLicense>) {
    await updateDoc(doc(db, 'coach_referral_licenses', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async enableLicense(coachId: string, adminId: string, adminName: string) {
    const license = await this.getByCoach(coachId);

    if (license) {
      await this.update(license.id, {
        isEnabled: true,
        enabledBy: adminId,
        enabledByName: adminName,
        enabledAt: Timestamp.now(),
        disabledBy: undefined,
        disabledByName: undefined,
        disabledAt: undefined,
        disabledReason: undefined
      });
    } else {
      // Get coach info
      const coach = await userService.getById(coachId);
      if (!coach) throw new Error('Coach not found');

      await this.create({
        coachId,
        coachName: `${coach.firstName} ${coach.lastName}`,
        coachEmail: coach.email,
        isEnabled: true,
        enabledBy: adminId,
        enabledByName: adminName,
        enabledAt: Timestamp.now(),
        violationCount: 0
      });
    }
  },

  async disableLicense(coachId: string, adminId: string, adminName: string, reason: string) {
    const license = await this.getByCoach(coachId);
    if (!license) throw new Error('License not found');

    await this.update(license.id, {
      isEnabled: false,
      disabledBy: adminId,
      disabledByName: adminName,
      disabledAt: Timestamp.now(),
      disabledReason: reason,
      violationCount: (license.violationCount || 0) + 1
    });
  },

  async isCoachEnabled(coachId: string): Promise<boolean> {
    const license = await this.getByCoach(coachId);
    return license ? license.isEnabled : false;
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'coach_referral_licenses', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as CoachReferralLicense;
    }
    return null;
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'coach_referral_licenses', id));
  }
};

// Coach Referral Stats Services
export const coachReferralStatsService = {
  async create(statsData: Omit<CoachReferralStats, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'coach_referral_stats'), removeUndefinedFields({
      ...statsData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    return docRef.id;
  },

  async getByCoach(coachId: string) {
    const querySnapshot = await getDocs(
      query(collection(db, 'coach_referral_stats'), where('coachId', '==', coachId))
    );
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as CoachReferralStats;
    }
    return null;
  },

  async updateStats(coachId: string, activity: CoachReferralActivity) {
    let stats = await this.getByCoach(coachId);

    const month = new Date(activity.purchaseDate instanceof Timestamp ?
      activity.purchaseDate.toDate() : activity.purchaseDate).toISOString().substring(0, 7);

    if (!stats) {
      // Create new stats record
      await this.create({
        coachId,
        totalReferralPurchases: 1,
        totalRewardsGiven: 0,
        totalCreditsRewarded: 0,
        totalCourseSessionsRewarded: 0,
        lastActivityDate: activity.purchaseDate,
        monthlyStats: {
          [month]: {
            purchases: 1,
            rewardsGiven: 0,
            creditsRewarded: 0,
            sessionsRewarded: 0
          }
        }
      });
    } else {
      // Update existing stats
      const monthlyStats = stats.monthlyStats || {};
      const currentMonth = monthlyStats[month] || {
        purchases: 0,
        rewardsGiven: 0,
        creditsRewarded: 0,
        sessionsRewarded: 0
      };

      monthlyStats[month] = {
        ...currentMonth,
        purchases: currentMonth.purchases + 1
      };

      await this.update(stats.id, {
        totalReferralPurchases: stats.totalReferralPurchases + 1,
        lastActivityDate: activity.purchaseDate,
        monthlyStats
      });
    }
  },

  async updateRewardStats(coachId: string, rewardType: 'credits' | 'course', amount: number, month: string) {
    const stats = await this.getByCoach(coachId);
    if (!stats) return;

    const monthlyStats = stats.monthlyStats || {};
    const currentMonth = monthlyStats[month] || {
      purchases: 0,
      rewardsGiven: 0,
      creditsRewarded: 0,
      sessionsRewarded: 0
    };

    if (rewardType === 'credits') {
      monthlyStats[month] = {
        ...currentMonth,
        rewardsGiven: currentMonth.rewardsGiven + 1,
        creditsRewarded: currentMonth.creditsRewarded + amount
      };

      await this.update(stats.id, {
        totalRewardsGiven: stats.totalRewardsGiven + 1,
        totalCreditsRewarded: stats.totalCreditsRewarded + amount,
        monthlyStats
      });
    } else {
      monthlyStats[month] = {
        ...currentMonth,
        rewardsGiven: currentMonth.rewardsGiven + 1,
        sessionsRewarded: currentMonth.sessionsRewarded + amount
      };

      await this.update(stats.id, {
        totalRewardsGiven: stats.totalRewardsGiven + 1,
        totalCourseSessionsRewarded: stats.totalCourseSessionsRewarded + amount,
        monthlyStats
      });
    }
  },

  async update(id: string, updateData: Partial<CoachReferralStats>) {
    await updateDoc(doc(db, 'coach_referral_stats', id), removeUndefinedFields({
      ...updateData,
      updatedAt: Timestamp.now()
    }));
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'coach_referral_stats'), orderBy('totalReferralPurchases', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CoachReferralStats[];
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'coach_referral_stats', id));
  }
};

// Helmet Reservation Services
export const helmetReservationService = {
  async create(reservationData: Omit<HelmetReservation, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'helmet_reservations'), removeUndefinedFields({
      ...reservationData,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    return docRef.id;
  },

  async getById(id: string) {
    const docRef = doc(db, 'helmet_reservations', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as HelmetReservation;
    }
    return null;
  },

  async getByUserId(userId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'helmet_reservations'),
        where('userId', '==', userId)
      )
    );
    // Sort in memory instead of using orderBy to avoid index requirement
    const reservations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HelmetReservation[];
    return reservations.sort((a, b) => {
      const dateA = a.classDate instanceof Date ? a.classDate : a.classDate.toDate();
      const dateB = b.classDate instanceof Date ? b.classDate : b.classDate.toDate();
      return dateB.getTime() - dateA.getTime();
    });
  },

  async getByUserAndSchedule(userId: string, scheduleId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'helmet_reservations'),
        where('userId', '==', userId),
        where('scheduleId', '==', scheduleId),
        limit(1)
      )
    );
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as HelmetReservation;
    }
    return null;
  },

  async getByScheduleId(scheduleId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'helmet_reservations'),
        where('scheduleId', '==', scheduleId),
        orderBy('createdAt', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HelmetReservation[];
  },

  async getByCoachId(coachId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'helmet_reservations'),
        where('coachId', '==', coachId),
        orderBy('classDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HelmetReservation[];
  },

  async update(id: string, data: Partial<HelmetReservation>) {
    const docRef = doc(db, 'helmet_reservations', id);
    await updateDoc(docRef, removeUndefinedFields({
      ...data,
      updatedAt: new Date()
    }));
  },

  async checkIn(id: string) {
    const docRef = doc(db, 'helmet_reservations', id);
    await updateDoc(docRef, {
      status: 'checked_in',
      checkinTime: new Date(),
      updatedAt: new Date()
    });
  },

  async cancel(id: string) {
    const docRef = doc(db, 'helmet_reservations', id);
    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: new Date()
    });
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'helmet_reservations', id));
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'helmet_reservations'), orderBy('classDate', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HelmetReservation[];
  }
};

// User QR Code Services
export const userQRCodeService = {
  async create(qrCodeData: Omit<UserQRCode, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'user_qr_codes'), removeUndefinedFields({
      ...qrCodeData,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    return docRef.id;
  },

  async getByUserId(userId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'user_qr_codes'),
        where('userId', '==', userId),
        limit(1)
      )
    );
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as UserQRCode;
    }
    return null;
  },

  async getByQRCodeData(qrCodeData: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'user_qr_codes'),
        where('qrCodeData', '==', qrCodeData),
        limit(1)
      )
    );
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as UserQRCode;
    }
    return null;
  },

  async update(id: string, data: Partial<UserQRCode>) {
    const docRef = doc(db, 'user_qr_codes', id);
    await updateDoc(docRef, removeUndefinedFields({
      ...data,
      updatedAt: new Date()
    }));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'user_qr_codes', id));
  }
};
