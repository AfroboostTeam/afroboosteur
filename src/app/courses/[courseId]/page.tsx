'use client';

import { useState, useEffect, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  FiStar,
  FiClock,
  FiUsers,
  FiCalendar,
  FiDollarSign,
  FiArrowLeft,
  FiMapPin,
  FiShare2,
  FiArrowRight,
  FiMessageCircle,
  FiCopy,
  FiCheckCircle,
  FiX
} from 'react-icons/fi';

import { useAuth } from '@/lib/auth';
import { Course, Review, StudentTokenPackage, CourseSchedule } from '@/types';
import { courseService, reviewService, userSubscriptionService, studentTokenPackageService, userService, coachReferralActivityService, coachReferralStatsService, scheduleService, offerPurchaseService } from '@/lib/database';
import { checkUserSubscriptionStatus } from '@/lib/subscriptionUtils';
import PaymentModal from '@/components/PaymentModal';
import ReviewSystem from '@/components/ReviewSystem';
import CourseBoost from '@/components/CourseBoost';
import CommunityChat from '@/components/CommunityChat';
import VideoModal from '@/components/VideoModal';
import TokenSelectionModal from '@/components/TokenSelectionModal';
import { PaymentDetails, UserSubscription } from '@/types';
import { bookingService, transactionService, notificationService } from '@/lib/database';
import PaymentHandlerWithCredits from '@/components/PaymentHandlerWithCredits';
import Toast from '@/components/Toast';
import CardSelectionStep from '@/components/CardSelectionStep';

export default function CourseDetail() {
  const params = useParams();
  const router = useRouter();
  const { user, updateUserProfile } = useAuth();
  const {t} = useTranslation();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCardSelectionStep, setShowCardSelectionStep] = useState(false);
  const [selectedGiftCardCode, setSelectedGiftCardCode] = useState<string | undefined>();
  const [selectedDiscountCardCode, setSelectedDiscountCardCode] = useState<string | undefined>();
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    show: false,
    message: '',
    type: 'success'
  });
  const [hasCompletedCourse, setHasCompletedCourse] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message, type });
  };
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [hasPurchasedOffer, setHasPurchasedOffer] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [bookingType, setBookingType] = useState<'subscription' | 'pay_per_session' | 'tokens'>('subscription');
  const [availableTokenPackages, setAvailableTokenPackages] = useState<StudentTokenPackage[]>([]);
  const [selectedTokenPackage, setSelectedTokenPackage] = useState<StudentTokenPackage | null>(null);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [showBookingOptions, setShowBookingOptions] = useState(false);
  const [showSubscriptionDatePicker, setShowSubscriptionDatePicker] = useState(false);
  const [selectedScheduleForBooking, setSelectedScheduleForBooking] = useState<CourseSchedule | null>(null);
  const [selectedDateForSubscription, setSelectedDateForSubscription] = useState<Date | null>(null);

  useEffect(() => {
    loadCourseData();
    // If you need to check if courseContent is an array, do so without assignment
   
    
  }, [params?.courseId]);

  useEffect(() => {
    if (user && course) {
      checkUserCourseStatus();
      loadUserSubscription(); // This checks both subscription and offer purchases
      loadUserTokenPackages();
    }
  }, [user, course]);


  // Initialize tab from URL parameters and handle auto-booking
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const bookParam = urlParams.get('book');

    if (tabParam === 'chat') {
      setActiveTab('chat');
    }

    // Auto-open booking modal if book=true parameter is present
    if (bookParam === 'true' && user && course) {
      // Small delay to ensure course data is loaded
      setTimeout(() => {
        setShowCardSelectionStep(true);
      }, 500);

      // Remove the book parameter from URL to prevent re-triggering
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('book');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [user, course]);

  const loadUserSubscription = async () => {
    if (!user?.id) return;
    try {
      // Use the utility function that checks both subscription and offer purchases
      const status = await checkUserSubscriptionStatus(user.id);
      setUserSubscription(status.subscription);
      setHasPurchasedOffer(status.hasPurchasedOffer);
      setHasActiveSubscription(status.hasActiveSubscription);
      
      // Default to subscription booking if user has active subscription or purchased offer
      if (status.hasActiveSubscription || status.hasPurchasedOffer) {
        setBookingType('subscription');
      } else {
        setBookingType('pay_per_session');
      }
    } catch (error) {
      console.error('Error loading user subscription status:', error);
    }
  };

  const loadUserTokenPackages = async () => {
    if (!user?.id || !course?.coachId) return;
    try {
      const tokenPackages = await studentTokenPackageService.getByStudentAndCoach(user.id, course.coachId);
      setAvailableTokenPackages(tokenPackages);
      
      // If user has valid token packages but no subscription, suggest tokens
      if (tokenPackages.length > 0 && !userSubscription) {
        setBookingType('tokens');
      }
    } catch (error) {
      console.error('Error loading user token packages:', error);
    }
  };

  const checkUserCourseStatus = async () => {
    if (!user || !course) return;
    
    try {
      // Check if user has completed this course
      const userBookings = await bookingService.getByStudent(user.id);
      const completedBooking = userBookings.find(
        booking => booking.courseId === course.id && booking.status === 'completed'
      );
      
      if (completedBooking) {
        setHasCompletedCourse(true);
        
        // Check if user hasn't reviewed yet
        const userReviews = await reviewService.getByUser(user.id);
        const hasReviewed = userReviews.some((review: { courseId: string; }) => review.courseId === course.id);
        
        // If user completed course but hasn't reviewed, switch to reviews tab
        if (!hasReviewed) {
          setActiveTab('reviews');
        }
      }
    } catch (error) {
      console.error('Error checking course status:', error);
    }
  };

  const loadCourseData = async () => {
    if (!params?.courseId) {
      console.error('No courseId provided');
      return;
    }

    const courseId = params?.courseId as string;
    console.log('Loading course data for ID:', courseId);

    try {
      setIsLoading(true);
      const [courseData, reviewsData, schedulesData] = await Promise.all([
        courseService.getById(courseId),
        reviewService.getByCourse(courseId),
        scheduleService.getAll()
      ]);

      console.log('Course data loaded:', courseData ? 'Found' : 'Not found');
      console.log('Reviews loaded:', reviewsData.length);

      // Filter schedules for this course
      const courseSchedules = schedulesData.filter(s => s.courseId === courseId);

      setCourse(courseData);
      setReviews(reviewsData);
      setSchedules(courseSchedules);

    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update meta tags for social sharing
  useEffect(() => {
    if (course) {
      // Update document title
      document.title = `${course.title} - Afroboost Dance`;

      // Update or create meta tags
      const updateMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.content = content;
      };

      const updateNameMetaTag = (name: string, content: string) => {
        let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', name);
          document.head.appendChild(meta);
        }
        meta.content = content;
      };

      // Ensure image URL is absolute and optimize for social sharing
      const getOptimizedImageUrl = (imageUrl: string) => {
        if (!imageUrl) return '';
        
        let absoluteUrl = '';
        
        // If already absolute URL, use as is
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          absoluteUrl = imageUrl;
        }
        // If relative URL, make it absolute
        else if (imageUrl.startsWith('/')) {
          absoluteUrl = `${window.location.origin}${imageUrl}`;
        }
        // If Cloudinary URL without protocol, add https
        else if (imageUrl.includes('cloudinary.com')) {
          absoluteUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `https://${imageUrl}`;
        }
        // Default: prepend origin
        else {
          absoluteUrl = `${window.location.origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }

        // Optimize Cloudinary URL for social sharing (1200x630 is optimal for Open Graph)
        if (absoluteUrl.includes('cloudinary.com') && !absoluteUrl.includes('/w_')) {
          // Check if URL already has transformations by looking for multiple '/upload/' occurrences
          const uploadIndex = absoluteUrl.indexOf('/upload/');
          const hasTransformations = uploadIndex !== -1 && absoluteUrl.indexOf('/upload/', uploadIndex + 1) !== -1;
          
          if (!hasTransformations) {
            // Add transformation parameters for optimal social sharing
            absoluteUrl = absoluteUrl.replace('/upload/', '/upload/w_1200,h_630,c_fill,f_auto,q_auto/');
          } else {
            // If transformations exist, ensure proper dimensions
            if (!absoluteUrl.includes('w_1200') && !absoluteUrl.includes('w_')) {
              absoluteUrl = absoluteUrl.replace('/upload/', '/upload/w_1200,h_630,c_fill,f_auto,q_auto/');
            }
          }
        }

        return absoluteUrl;
      };

      const optimizedImageUrl = getOptimizedImageUrl(course.imageUrl);
      const currentUrl = window.location.href;

      // Update meta tags
      updateNameMetaTag('description', course.description);

      // Open Graph tags for better social media sharing (WhatsApp, Facebook, etc.)
      updateMetaTag('og:type', 'website');
      updateMetaTag('og:url', currentUrl);
      updateMetaTag('og:title', `${course.title} - Afroboost Dance`);
      updateMetaTag('og:description', course.description);
      updateMetaTag('og:image', optimizedImageUrl);
      updateMetaTag('og:image:secure_url', optimizedImageUrl);
      updateMetaTag('og:image:type', 'image/jpeg');
      updateMetaTag('og:image:width', '1200');
      updateMetaTag('og:image:height', '630');
      updateMetaTag('og:site_name', 'Afroboost Dance');

      // Twitter Card tags
      updateMetaTag('twitter:card', 'summary_large_image');
      updateMetaTag('twitter:url', currentUrl);
      updateMetaTag('twitter:title', `${course.title} - Afroboost Dance`);
      updateMetaTag('twitter:description', course.description);
      updateMetaTag('twitter:image', optimizedImageUrl);
    }
  }, [course]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Update URL parameters to help with footer detection
    if (tabId === 'chat') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'chat');
      window.history.replaceState({}, '', url.toString());
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleBookCourse = () => {
    if (!user) {
      router.push('/login');
      return;
    }

    // If user has subscription, show date picker instead of booking directly
    if (bookingType === 'subscription' && userSubscription) {
      setShowSubscriptionDatePicker(true);
      return;
    }

    // If user has tokens, show token selector
    if (bookingType === 'tokens' && availableTokenPackages.length > 0) {
      if (availableTokenPackages.length > 1) {
        setShowTokenSelector(true);
      } else if (availableTokenPackages.length === 1) {
        bookWithTokens(availableTokenPackages[0]);
      }
      return;
    }

    // User doesn't have subscription - show booking options modal
    setShowBookingOptions(true);
  };

  const handleFinalizeReservation = () => {
    setShowBookingOptions(false);
    // Show card selection step first for pay-per-session
    setShowCardSelectionStep(true);
  };

  const handleGoToOffers = () => {
    setShowBookingOptions(false);
    router.push('/offers');
  };

  const handleCardSelectionNext = (giftCardCode?: string, discountCardCode?: string) => {
    setSelectedGiftCardCode(giftCardCode);
    setSelectedDiscountCardCode(discountCardCode);
    setShowCardSelectionStep(false);
    setShowPaymentModal(true);
  };

  const bookWithTokens = async (tokenPackage: StudentTokenPackage) => {
    if (!course || !user || !tokenPackage) return;

    try {
      setIsLoading(true);

      // Check if token package has enough tokens
      if (tokenPackage.remainingTokens < course.sessions) {
        alert(`Insufficient tokens. You need ${course.sessions} tokens but only have ${tokenPackage.remainingTokens} remaining.`);
        return;
      }

      // Use the token-aware booking method
      await bookingService.createWithTokens(
        course.id,
        user.id,
        tokenPackage.id
      );

      // Update course student count
      await courseService.update(course.id, {
        currentStudents: course.currentStudents + 1
      });

      // Send notification
      await notificationService.create({
        userId: user.id,
        title: 'Course Booked Successfully!',
        message: `You have successfully booked "${course.title}" using ${course.sessions} tokens from your ${tokenPackage.packageName} package.`,
        type: 'booking',
        read: false
      });

      // Reload data
      await loadCourseData();
      await loadUserTokenPackages();
      setShowTokenSelector(false);
      
    } catch (error) {
      console.error('Token booking error:', error);
      alert(error instanceof Error ? error.message : 'Failed to book course with tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const bookWithSubscription = async (selectedDate?: Date) => {
    if (!course || !user) return;
    
    // User must have either subscription or purchased offer
    if (!userSubscription && !hasPurchasedOffer) {
      alert('You need an active subscription or offer purchase to book with this method');
      return;
    }

    try {
      setIsLoading(true);
      setShowSubscriptionDatePicker(false);

      // Use the selected date or default to next week
      const scheduledDate = selectedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // If user has subscription, use subscription booking method
      if (hasActiveSubscription && userSubscription) {
        await bookingService.createWithSubscription(
          {
            courseId: course.id,
            studentId: user.id,
            coachId: course.coachId,
            status: 'confirmed',
            paymentStatus: 'completed',
            paymentAmount: 0, // No direct payment required
            scheduledDate
          },
          course.id,
          course.title,
          course.coachName
        );
      } else if (hasPurchasedOffer) {
        // User has purchased offer but no subscription - create booking with 0 payment
        await bookingService.create({
          courseId: course.id,
          studentId: user.id,
          coachId: course.coachId,
          status: 'confirmed',
          paymentStatus: 'completed',
          paymentAmount: 0, // No payment required - covered by offer purchase
          scheduledDate
        });
      }

      // Update course student count
      await courseService.update(course.id, {
        currentStudents: course.currentStudents + 1
      });

      // Send notification
      await notificationService.create({
        userId: user.id,
        title: 'Course Booked Successfully!',
        message: `You have successfully booked "${course.title}" using your subscription/offer. Check your dashboard for details.`,
        type: 'booking',
        read: false
      });

      // Reload data
      await loadCourseData();
      await loadUserSubscription(); // This reloads both subscription and offer purchase status
      
    } catch (error) {
      console.error('Subscription/offer booking error:', error);
      alert(error instanceof Error ? error.message : 'Failed to book course');
    } finally {
      setIsLoading(false);
    }
  };

  const processPayment = async (paymentDetails: PaymentDetails) => {
    if (!course || !user) return false;

    try {
      // Check if user has enough credits
      if (user.credits >= course.totalPrice) {
        // Pay with credits
        const newCredits = user.credits - course.totalPrice;
        await updateUserProfile({ credits: newCredits });
        
        // Record transaction
        await transactionService.create({
          userId: user.id,
          type: 'course_purchase',
          amount: -course.totalPrice,
          description: `Purchased: ${course.title} (${course.sessions} sessions)`,
          status: 'completed'
        });
      } else {
        // Simulate card payment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Record transaction
        await transactionService.create({
          userId: user.id,
          type: 'course_purchase',
          amount: course.totalPrice,
          description: `Purchased: ${course.title} (${course.sessions} sessions) via ${paymentDetails.cardNumber.slice(-4)} card`,
          status: 'completed'
        });
      }

      // Create booking
      await bookingService.create({
        courseId: course.id,
        studentId: user.id,
        coachId: course.coachId,
        status: 'confirmed',
        paymentStatus: 'completed',
        paymentAmount: course.totalPrice,
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next week
      });

      // Update course student count
      await courseService.update(course.id, {
        currentStudents: course.currentStudents + 1
      });

      // Send notification
      await notificationService.create({
        userId: user.id,
        title: 'Course Booked Successfully!',
        message: `You have successfully booked "${course.title}". Check your dashboard for details.`,
        type: 'booking',
        read: false
      });

      // Send notification to coach
      await notificationService.create({
        userId: course.coachId,
        title: 'New Course Booking!',
        message: `${user.firstName} ${user.lastName} has booked your course "${course.title}". Payment method: ${user.credits >= course.price ? 'Credits' : 'Card'}. Check your dashboard for details.`,
        type: 'booking',
        read: false
      });

      // Reload course data
      await loadCourseData();
      setShowPaymentModal(false);
      
      return true;
    } catch (error) {
      console.error('Booking error:', error);
      return false;
    }
  };

  const processPaymentSuccess = async (paymentId: string, method: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card', referralCode?: string) => {
    if (!course || !user) return;

    try {
      // For credits, gift-card, and discount-card payments, the transaction is already recorded in PaymentHandlerWithCredits
      if (method !== 'credits' && method !== 'gift-card' && method !== 'discount-card') {
        // Record transaction for stripe/paypal payments
        await transactionService.create({
          userId: user.id,
          type: 'course_purchase',
          amount: course.price,
          description: `Purchased: ${course.title} via ${method}`,
          status: 'completed'
        });
      }

      // Create booking
      await bookingService.create({
        courseId: course.id,
        studentId: user.id,
        coachId: course.coachId,
        status: 'confirmed',
        paymentStatus: 'completed',
        paymentAmount: course.price,
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Handle referral tracking if referral code was provided
      if (referralCode) {
        try {
          const referrerUser = await userService.getByReferralCode(referralCode);
          if (referrerUser) {
            // Create coach referral activity record
            await coachReferralActivityService.create({
              coachId: course.coachId,
              coachName: course.coachName,
              courseId: course.id,
              courseName: course.title,
              purchaserUserId: user.id,
              purchaserName: `${user.firstName} ${user.lastName}`,
              purchaserEmail: user.email,
              referrerUserId: referrerUser.id,
              referrerName: `${referrerUser.firstName} ${referrerUser.lastName}`,
              referrerEmail: referrerUser.email,
              referralCode: referralCode,
              purchaseAmount: course.price,
              purchaseDate: new Date(),
              rewardStatus: 'pending'
            });

            // Update coach referral stats
            await coachReferralStatsService.updateStats(course.coachId, {
              coachId: course.coachId,
              coachName: course.coachName,
              courseId: course.id,
              courseName: course.title,
              purchaserUserId: user.id,
              purchaserName: `${user.firstName} ${user.lastName}`,
              purchaserEmail: user.email,
              referrerUserId: referrerUser.id,
              referrerName: `${referrerUser.firstName} ${referrerUser.lastName}`,
              referrerEmail: referrerUser.email,
              referralCode: referralCode,
              purchaseAmount: course.price,
              purchaseDate: new Date(),
              rewardStatus: 'pending'
            } as any);

            console.log('Referral activity tracked successfully');
          }
        } catch (referralError) {
          console.error('Error tracking referral activity:', referralError);
          // Don't fail the purchase if referral tracking fails
        }
      }

      // Update course student count
      await courseService.update(course.id, {
        currentStudents: course.currentStudents + 1
      });

      // Send notification to student
      await notificationService.create({
        userId: user.id,
        title: 'Course Booked Successfully!',
        message: `You have successfully booked "${course.title}". Check your dashboard for details.`,
        type: 'booking',
        read: false
      });

      // Send notification to coach
      await notificationService.create({
        userId: course.coachId,
        title: 'New Course Booking!',
        message: `${user.firstName} ${user.lastName} has booked your course "${course.title}" via ${method === 'credits' ? 'Credits' : method}. Check your dashboard for details.`,
        type: 'booking',
        read: false
      });

      // Reload course data
      await loadCourseData();
      setShowPaymentModal(false);

      // Clear selected cards after successful payment
      setSelectedGiftCardCode(undefined);
      setSelectedDiscountCardCode(undefined);

      return true;
    } catch (error) {
      console.error('Booking error:', error);
      return false;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{t('Course Not Found')}</h1>
          <button onClick={() => router.back()} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-20">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <FiArrowLeft />
          <span>{t('Back to Courses')}</span>
        </button>

        {/* Course Thumbnail/Video - Always at Top */}
        <div className="relative mb-6 lg:mb-8">
          <img
            src={course.imageUrl}
            alt={course.title}
            className="w-full h-56 sm:h-64 md:h-80 lg:h-96 object-cover rounded-lg"
          />

          {/* Video Preview Button */}
          {course.videoLink && (
            <button
              onClick={() => setShowVideoModal(true)}
              className="absolute inset-0 bg-black/20 hover:bg-black/40 transition-colors flex items-center justify-center group rounded-lg"
            >
              <div className="bg-white/90 hover:bg-white transition-colors rounded-full p-4 sm:p-6 group-hover:scale-110 transform duration-200">
                <svg
                  className="w-8 h-8 sm:w-12 sm:h-12 text-black ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 bg-black/80 text-white px-3 sm:px-4 py-2 rounded-full text-sm sm:text-base font-medium backdrop-blur-sm">
                ▶ {t('Watch Preview')}
              </div>
            </button>
          )}

          {course.boosted && (
            <div className="absolute top-3 sm:top-4 left-3 sm:left-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-sm sm:text-base font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded">
              BOOSTED
            </div>
          )}
          <div className={`absolute top-3 sm:top-4 right-3 sm:right-4 px-3 sm:px-4 py-1.5 sm:py-2 rounded text-sm sm:text-base font-medium ${
            course.difficulty === 'Beginner' ? 'bg-green-500 text-white' :
            course.difficulty === 'Intermediate' ? 'bg-yellow-500 text-black' :
            'bg-red-500 text-white'
          }`}>
            {t(`${course.difficulty}`)}
          </div>
        </div>

        {/* Course Header */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-12">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4 leading-tight">{course.title}</h1>
              <div className="text-sm sm:text-base text-gray-300 leading-relaxed">
                {course.description.split('\n').map((line, index) => (
                  <span key={index}>
                    {line}
                    <br />
                  </span>
                ))}
              </div>
            </div>

            {/* Course Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-gray-400 text-xs sm:text-sm">
                <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-900/50 p-2 sm:p-3 rounded-lg">
                  <FiStar className="text-yellow-400 flex-shrink-0" size={14} />
                  <span className="truncate">{course.averageRating.toFixed(1)} ({course.totalReviews})</span>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-900/50 p-2 sm:p-3 rounded-lg">
                  <FiClock className="flex-shrink-0" size={14} />
                  <span className="truncate">{course.duration} {t('min')}</span>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-900/50 p-2 sm:p-3 rounded-lg">
                  <FiUsers className="flex-shrink-0" size={14} />
                  <span className="truncate">{course.currentStudents}/{course.maxStudents}</span>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-900/50 p-2 sm:p-3 rounded-lg">
                  <FiArrowRight className="flex-shrink-0" size={14} />
                  <span className="truncate">{course.sessions} {t('sessions')}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
                  CHF {course.price}
                </div>
                <span className="text-sm sm:text-base text-gray-400">{t('per class')}</span>
              </div>

              {/* Instructor Section - Responsive */}
              <div className="p-3 sm:p-4 bg-gray-900/70 rounded-lg border border-gray-800">
                <h3 className="font-semibold mb-3 text-sm sm:text-base">{t('Instructor')}</h3>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#D91CD2] to-[#7B1FA2] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium text-sm sm:text-base">
                      {course.coachName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base text-white truncate">{course.coachName}</p>
                    <p className="text-xs sm:text-sm text-gray-400">{t('Professional Dance Coach')}</p>
                  </div>
                </div>
              </div>

              {/* Schedule Information & Helmet Reservation - Only show for users WITHOUT subscription */}
              {schedules.length > 0 && user && !userSubscription && (
                <div className="p-3 sm:p-4 bg-gray-900/70 rounded-lg border border-gray-800">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-sm sm:text-base">{t('Upcoming Sessions - Reserve Your Helmet')}</h3>
                    {schedules.length > 1 && (
                      <button
                        onClick={() => setShowAllSessions(!showAllSessions)}
                        className="text-[#D91CD2] text-xs sm:text-sm hover:underline"
                      >
                        {showAllSessions ? t('Show Less') : t('Show All')}
                      </button>
                    )}
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {schedules.slice(0, showAllSessions ? schedules.length : 1).map((schedule) => {
                      const startTime = schedule.startTime instanceof Date
                        ? schedule.startTime
                        : schedule.startTime.toDate();
                      const endTime = schedule.endTime instanceof Date
                        ? schedule.endTime
                        : schedule.endTime.toDate();

                      return (
                        <div key={schedule.id} className="flex flex-col space-y-2 pb-3 border-b border-gray-700 last:border-0 last:pb-0">
                          {/* Date */}
                          <div className="flex items-center text-gray-300 text-xs sm:text-sm">
                            <FiCalendar className="mr-2 text-[#D91CD2] flex-shrink-0" size={14} />
                            <span className="font-medium">
                              {startTime.toLocaleDateString('fr-FR', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>

                          {/* Time */}
                          <div className="flex items-center text-gray-300 text-xs sm:text-sm">
                            <FiClock className="mr-2 text-[#D91CD2] flex-shrink-0" size={14} />
                            <span className="font-medium">
                              {startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })} - {endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                          </div>

                          {/* Location */}
                          {schedule.location && (
                            <div className="flex items-center text-gray-300 text-xs sm:text-sm">
                              <FiMapPin className="mr-2 text-[#D91CD2] flex-shrink-0" size={14} />
                              <span>{schedule.location}</span>
                            </div>
                          )}

                          {/* Helmet Reservation Button */}
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/helmet-reservations/create', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ userId: user.id, scheduleId: schedule.id }),
                                });
                                const data = await response.json();
                                if (response.ok) {
                                  showToast(t('Helmet Reserved!'), 'success');
                                  loadCourseData();
                                } else {
                                  showToast(data.error || t('Failed to reserve helmet'), 'error');
                                }
                              } catch (error) {
                                console.error('Reservation error:', error);
                                showToast(t('Failed to reserve helmet'), 'error');
                              }
                            }}
                            className="w-full btn-primary text-xs sm:text-sm py-2 flex items-center justify-center space-x-2 mt-2"
                          >
                            <FiCheckCircle size={14} />
                            <span>{t('Reserve Helmet')}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


              {/* Action Buttons */}
              <div className="space-y-3 sm:space-y-4">
                {/* For users with active subscription or purchased offer - Only show date selection */}
                {user && (hasActiveSubscription || hasPurchasedOffer) ? (
                  <>
                    {/* Title: "Choose your next session" */}
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-white mb-2">{t('Choose your next session')}</h3>
                      {userSubscription && userSubscription.planType === 'session_pack' && (
                        <p className="text-sm text-gray-400">
                          {userSubscription.remainingSessions} {t('sessions left')}
                        </p>
                      )}
                      {hasPurchasedOffer && !userSubscription && (
                        <p className="text-sm text-gray-400">
                          {t('You have an active subscription')}
                        </p>
                      )}
                    </div>

                    {/* Date Selection - Show list of upcoming dates */}
                    {schedules.length > 0 && (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {schedules
                          .filter(schedule => {
                            const scheduleDate = schedule.startTime instanceof Date 
                              ? schedule.startTime 
                              : (schedule.startTime as any).toDate();
                            return scheduleDate >= new Date();
                          })
                          .slice(0, 10)
                          .map((schedule) => {
                            const scheduleDate = schedule.startTime instanceof Date 
                              ? schedule.startTime 
                              : (schedule.startTime as any).toDate();
                            const endTime = schedule.endTime instanceof Date 
                              ? schedule.endTime 
                              : (schedule.endTime as any).toDate();
                            const isSelected = selectedDateForSubscription?.getTime() === scheduleDate.getTime();
                            
                            return (
                              <button
                                key={schedule.id}
                                onClick={() => {
                                  setSelectedScheduleForBooking(schedule);
                                  setSelectedDateForSubscription(scheduleDate);
                                }}
                                disabled={isLoading || course.currentStudents >= course.maxStudents}
                                className={`w-full p-4 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isSelected
                                    ? 'bg-purple-600/20 border-2 border-purple-500'
                                    : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-white font-medium">
                                      {scheduleDate.toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                      })}
                                    </p>
                                    <p className="text-gray-400 text-sm mt-1">
                                      {scheduleDate.toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })} - {endTime.toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </p>
                                  </div>
                                  <FiCalendar className={`${isSelected ? 'text-purple-400' : 'text-gray-400'}`} size={20} />
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    )}

                    {/* Reserve helmet Button */}
                    <button
                      onClick={() => {
                        if (selectedDateForSubscription && selectedScheduleForBooking) {
                          bookWithSubscription(selectedDateForSubscription);
                        } else {
                          setShowSubscriptionDatePicker(true);
                        }
                      }}
                      disabled={course.currentStudents >= course.maxStudents || (!selectedDateForSubscription && schedules.length === 0)}
                      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-3 sm:py-4 text-sm sm:text-base font-medium"
                    >
                      {course.currentStudents >= course.maxStudents 
                        ? t('Fully Booked')
                        : !selectedDateForSubscription
                          ? t('Select a date first')
                          : t('Reserve helmet') || 'Reserve helmet'
                      }
                    </button>
                  </>
                ) : (
                  <>
                    {/* Booking Type Selection - Only for users WITHOUT subscription */}
                    {user && availableTokenPackages.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm sm:text-base font-medium">{t('How would you like to book?')}</p>
                        <div className="grid grid-cols-1 gap-2 sm:gap-3">
                          {availableTokenPackages.length > 0 && (
                            <button
                              onClick={() => setBookingType('tokens')}
                              className={`px-3 sm:px-4 py-3 rounded-lg text-sm sm:text-base transition-colors ${
                                bookingType === 'tokens'
                                  ? 'bg-[#D91CD2] text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                              disabled={availableTokenPackages.every(pkg => pkg.remainingTokens < course.sessions)}
                            >
                              <span className="block font-medium">{t('Use Tokens')}</span>
                              <span className="block text-xs sm:text-sm opacity-75 mt-1">
                                {availableTokenPackages.reduce((total, pkg) => total + pkg.remainingTokens, 0)} {t('tokens available')}
                              </span>
                            </button>
                          )}

                          <button
                            onClick={() => setBookingType('pay_per_session')}
                            className={`px-3 sm:px-4 py-3 rounded-lg text-sm sm:text-base transition-colors ${
                              bookingType === 'pay_per_session'
                                ? 'bg-[#D91CD2] text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <span className="block font-medium">{t('Pay Per Session')}</span>
                            <span className="block text-xs sm:text-sm opacity-75 mt-1">
                              CHF {course.totalPrice} ({course.sessions} {t('sessions')}))
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleBookCourse}
                      disabled={
                        course.currentStudents >= course.maxStudents ||
                        (bookingType === 'tokens' && availableTokenPackages.every(pkg => pkg.remainingTokens < course.sessions))
                      }
                      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-3 sm:py-4 text-sm sm:text-base font-medium"
                    >
                      {course.currentStudents >= course.maxStudents 
                        ? t('Fully Booked')
                        : bookingType === 'tokens' && availableTokenPackages.length > 0
                          ? `${t('Book with Tokens')} (${course.sessions} ${t('tokens needed')})`
                          : `${t('Book Now')} - CHF ${course.totalPrice}`
                      }
                    </button>
                  </>
                )}

                
                {/* Course Boost (only for course owner) */}
                <CourseBoost 
                  course={course} 
                  onBoostSuccess={loadCourseData}
                />

                {/* Share Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className="btn-secondary flex items-center justify-center space-x-2 py-3 sm:py-4 text-sm sm:text-base"
                    onClick={() => {
                      const url = `${window.location.origin}/signup?redirect=/courses/${course.id}?book=true`;
                      navigator.clipboard.writeText(url).then(() => {
                        alert(t('Course link copied to clipboard!'));
                      });
                    }}
                  >
                    <FiCopy className="flex-shrink-0" />
                    <span>{t('Copy Link')}</span>
                  </button>

                  <button
                    className="btn-primary flex items-center justify-center space-x-2 py-3 sm:py-4 text-sm sm:text-base"
                    onClick={() => {
                      const url = `${window.location.origin}/signup?redirect=/courses/${course.id}?book=true`;
                      const shareText = `${t('Check out this course')}: ${course.title}`;
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                  >
                    <FiShare2 className="flex-shrink-0" />
                    <span>{t('WhatsApp')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap mb-8 border-b border-gray-800">
            {[
            { id: 'overview', label: 'Overview' },
            { 
              id: 'reviews', 
              label: `Reviews (${course.totalReviews})`,
              notification: hasCompletedCourse && !reviews.some(r => r.studentId === user?.id)
            },
            { 
              id: 'chat', 
              label: (
              <span className="flex items-center gap-2">
                <FiMessageCircle className="inline-block" />
                Community Chat
              </span>
              ),
              isSpecial: true,
              isGroupChat: true
            }
            ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-3 py-1 border-b-2 transition-all duration-300 relative font-medium text-xs sm:text-sm
              ${activeTab === tab.id
              ? 'border-[#D91CD2] text-[#D91CD2] scale-105'
              : 'border-transparent text-gray-400 hover:text-white'}
              ${tab.isSpecial ? 'bg-gradient-to-r from-[#D91CD2]/10 to-[#7000FF]/10 rounded-t-md' : ''}
              ${tab.isGroupChat 
              ? 'bg-[#7B1FA2] hover:bg-[#D91CD2] text-white font-semibold px-4 py-0 mb-1 rounded-md shadow border-2 border-[#D91CD2] hover:border-[#7B1FA2]' 
              : ''
              }
              `}
            >
              {tab.isSpecial && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-[#D91CD2] to-[#7000FF] rounded-full animate-pulse"></div>
              )}
              {tab.label}
              {tab.notification && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            ))}
        </div>
          
        {/* Tab Content */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">{t('What You\'ll Learn')}</h3>
              <ul className="space-y-2 text-gray-300">
                {course.courseContent && typeof course.courseContent === 'object' && Object.keys(course.courseContent).length > 0 ? (
                  Object.entries(course.courseContent).map(([key, value]: [string, string], idx: number) => (
                  <li key={idx}>• {value}</li>
                  ))
                ) : (
                  <li>{t('No course content available.')}</li>
                )}
                </ul>
            </div>

            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">{t('Class Details')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                <div>
                  <p><strong>{t('Category:')}</strong> {course.category}</p>
                  <p><strong>{t('Duration:')}</strong> {course.duration} {t('Minutes')}</p>
                  <p><strong>{t('Max Students:')}</strong> {course.maxStudents}</p>
                </div>
                <div>
                  <p><strong>{t('Difficulty:')}</strong> {t(`${course.difficulty}`)}</p>

                  <p><strong>{t('Equipment:')}</strong>{t('None required')}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'reviews' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-6 bg-gradient-to-r from-[#D91CD2]/20 to-[#7000FF]/20 p-4 rounded-lg border border-[#D91CD2]/30">
              <h3 className="text-xl font-semibold mb-2">{t('Share Your Experience')}</h3>
              <p className="text-gray-300 mb-4">
                Have you taken this course? Help others by leaving a review and rating!
              </p>
              <p className="text-sm text-gray-400">
                Note: You can only leave a review after completing the course, and you can only review each course once.
              </p>
            </div>
            
            <ReviewSystem
              courseId={course.id}
              onReviewSubmitted={loadCourseData}
              showReviews={true}
            />
          </motion.div>
        )}

        {activeTab === 'chat' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-[calc(100vh-200px)] min-h-[600px]"
          >
            <CommunityChat courseId={course.id} courseName={course.title} />
          </motion.div>
        )}

        {/* Step 1: Card Selection */}
        {user && course && (
          <CardSelectionStep
            isOpen={showCardSelectionStep}
            onClose={() => setShowCardSelectionStep(false)}
            onNext={handleCardSelectionNext}
            userId={user.id}
            coachId={course.coachId}
            courseId={course.id}
            amount={course.totalPrice}
            businessId={course.coachId}
            transactionType="course"
          />
        )}

        {/* Step 2: Payment Modal */}
        <PaymentHandlerWithCredits
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            // Clear selected cards when modal is closed
            setSelectedGiftCardCode(undefined);
            setSelectedDiscountCardCode(undefined);
          }}
          onSuccess={(paymentId: string, method: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card', referralCode?: string) => {
            console.log(`Payment successful with ID: ${paymentId} using ${method}`, referralCode ? `with referral: ${referralCode}` : '');
            processPaymentSuccess(paymentId, method, referralCode);
          }}
          amount={course.totalPrice}
          title="Book Course"
          description={`Book "${course.title}" (${course.sessions} sessions) with ${course.coachName}`}
          userId={user?.id || ''}
          businessId={course.coachId}
          coachId={course.coachId}
          courseId={course.id}
          transactionType="course"
          preAppliedGiftCardCode={selectedGiftCardCode}
          preAppliedDiscountCardCode={selectedDiscountCardCode}
        />

        {/* Subscription Date Picker Modal */}
        {showSubscriptionDatePicker && course && userSubscription && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowSubscriptionDatePicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div>
                  <h2 className="text-xl font-bold text-white">{t('Choose your next session')}</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {t('Select a date to reserve with your subscription')}
                  </p>
                </div>
                <button
                  onClick={() => setShowSubscriptionDatePicker(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <FiX className="text-gray-400" size={20} />
                </button>
              </div>

              {/* Content - Date Selection */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {schedules.length > 0 ? (
                  <div className="space-y-3">
                    {schedules
                      .filter(schedule => {
                        const scheduleDate = schedule.startTime instanceof Date 
                          ? schedule.startTime 
                          : (schedule.startTime as any).toDate();
                        return scheduleDate >= new Date();
                      })
                      .slice(0, 10)
                      .map((schedule) => {
                        const scheduleDate = schedule.startTime instanceof Date 
                          ? schedule.startTime 
                          : (schedule.startTime as any).toDate();
                        const endTime = schedule.endTime instanceof Date 
                          ? schedule.endTime 
                          : (schedule.endTime as any).toDate();
                        
                        return (
                          <button
                            key={schedule.id}
                            onClick={() => {
                              setSelectedScheduleForBooking(schedule);
                              bookWithSubscription(scheduleDate);
                            }}
                            disabled={isLoading}
                            className="w-full p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white font-medium">
                                  {scheduleDate.toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}
                                </p>
                                <p className="text-gray-400 text-sm mt-1">
                                  {scheduleDate.toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })} - {endTime.toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                              </div>
                              <FiCalendar className="text-purple-400" size={20} />
                            </div>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">{t('No upcoming sessions available')}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Token Selection Modal */}
        <TokenSelectionModal
          isOpen={showTokenSelector}
          onClose={() => setShowTokenSelector(false)}
          onSuccess={async () => {
            await loadCourseData();
            await loadUserTokenPackages();
            setShowTokenSelector(false);
          }}
          onProceedWithPayment={() => {
            setShowTokenSelector(false);
            setShowPaymentModal(true);
          }}
          courseId={course.id}
          coachId={course.coachId}
          courseName={course.title}
          sessionsRequired={course.sessions}
        />

        {/* Booking Options Modal - For users without subscription */}
        {showBookingOptions && course && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowBookingOptions(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div>
                  <h2 className="text-xl font-bold text-white">{t('Book Course')}</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {t('Choose how you want to proceed')}
                  </p>
                </div>
                <button
                  onClick={() => setShowBookingOptions(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <FiArrowLeft className="text-gray-400" size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="bg-gradient-to-r from-[#D91CD2]/10 to-[#7000FF]/10 border border-[#D91CD2]/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">{course.title}</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{t('Price')}:</span>
                    <span className="text-white font-semibold">CHF {course.totalPrice}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-400">{t('Sessions')}:</span>
                    <span className="text-white font-semibold">{course.sessions}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleGoToOffers}
                    className="w-full bg-gradient-to-r from-[#D91CD2] to-[#7000FF] text-white font-semibold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
                  >
                    <FiCheckCircle size={20} />
                    <span>{t('Offers')}</span>
                  </button>

                  <button
                    onClick={handleFinalizeReservation}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <FiArrowRight size={20} />
                    <span>{t('Finalize your reservation')}</span>
                  </button>
                </div>

                <p className="text-gray-400 text-xs text-center mt-4">
                  {t('Subscribe to get access to multiple courses, or proceed with a one-time payment for this course.')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Video Modal */}
      {showVideoModal && course?.videoLink && (
        <VideoModal
          isOpen={showVideoModal}
          videoUrl={course.videoLink}
          title={course.title}
          onClose={() => setShowVideoModal(false)}
        />
      )}

      {/* Toast Notification */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
}
