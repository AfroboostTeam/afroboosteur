'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiCheck, FiLoader, FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { 
  bookingService, 
  transactionService, 
  courseService, 
  earningTransactionService,
  studentTokenPackageService,
  tokenTransactionService,
  userService,
  notificationService,
  coachReferralActivityService,
  coachReferralStatsService
} from '@/lib/database';
import { useAuth } from '@/lib/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function PaymentSuccess() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);

  useEffect(() => {
    const sessionId = searchParams?.get('session_id');
    
    if (!sessionId) {
      setStatus('error');
      return;
    }

    // Verify the payment session
    verifyPaymentSession(sessionId);
  }, [searchParams]);

  const processPurchase = async (session: any) => {
    if (!user || !session.metadata) return;

    const metadata = session.metadata;
    const amount = session.amount_total / 100;
    const paymentMethod = session.payment_method_types?.includes('twint') ? 'twint' : 'stripe';
    
    try {
      if (metadata.purchaseType === 'course') {
        if (metadata.boostType) {
          await processCourseBoost(metadata, amount, paymentMethod, session.id);
        } else {
          await processCourseBooking(metadata, amount, paymentMethod, session.id);
        }
      } else if (metadata.purchaseType === 'token') {
        await processTokenPurchase(metadata, amount, paymentMethod, session.id);
      } else if (metadata.purchaseType === 'product') {
        await processProductPurchase(metadata, amount, paymentMethod, session.id);
      }
    } catch (error) {
      console.error('Error processing purchase:', error);
      // Don't fail the whole flow, payment was successful
    }
  };

  const processCourseBooking = async (metadata: any, amount: number, paymentMethod: string, paymentId: string) => {
    if (!metadata.courseId || !user) return;

    try {
      // Get course details
      const course = await courseService.getById(metadata.courseId);
      if (!course) throw new Error('Course not found');

      // Record transaction
      await transactionService.create({
        userId: user.id,
        type: 'course_purchase',
        amount: amount,
        description: `Purchased: ${course.title} via ${paymentMethod}`,
        status: 'completed'
      });

      // Create booking
      await bookingService.create({
        courseId: metadata.courseId,
        studentId: user.id,
        coachId: metadata.coachId || course.coachId,
        status: 'confirmed',
        paymentStatus: 'completed',
        paymentAmount: amount,
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Handle referral if present
      if (metadata.referralCode) {
        try {
          const referrerUser = await userService.getByReferralCode(metadata.referralCode);
          if (referrerUser) {
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
              referralCode: metadata.referralCode,
              purchaseAmount: amount,
              purchaseDate: new Date(),
              rewardStatus: 'pending'
            });
          }
        } catch (error) {
          console.error('Error processing referral:', error);
        }
      }

      // Create earnings for coach
      await earningTransactionService.createFromPurchase(
        course.coachId,
        user.id,
        `${user.firstName} ${user.lastName}`,
        course.id,
        course.title,
        amount,
        paymentMethod
      );

      // Send notifications
      await notificationService.create({
        userId: user.id,
        title: 'Cours réservé avec succès!',
        message: `Vous avez réservé "${course.title}". Votre coach vous contactera bientôt.`,
        type: 'booking',
        read: false
      });

      await notificationService.create({
        userId: course.coachId,
        title: 'Nouvelle réservation de cours!',
        message: `${user.firstName} ${user.lastName} a réservé votre cours "${course.title}". Méthode de paiement: ${paymentMethod}. Consultez votre tableau de bord pour plus de détails.`,
        type: 'booking',
        read: false
      });

    } catch (error) {
      console.error('Error processing course booking:', error);
      throw error;
    }
  };

  const processCourseBoost = async (metadata: any, amount: number, paymentMethod: string, paymentId: string) => {
    if (!metadata.courseId || !user) return;

    try {
      // Get course details
      const course = await courseService.getById(metadata.courseId);
      if (!course) throw new Error('Course not found');

      // Record transaction
      await transactionService.create({
        userId: user.id,
        type: 'course_boost',
        amount: amount,
        description: `Course boost (${metadata.boostType}) for "${course.title}" via ${paymentMethod}`,
        status: 'completed'
      });

      // Calculate boost end date based on boost type
      const boostPlans = {
        0: { name: 'Basic Boost', duration: '7 days' },
        1: { name: 'Standard Boost', duration: '14 days' },
        2: { name: 'Premium Boost', duration: '30 days' }
      };

      const plan = boostPlans[metadata.boostType as keyof typeof boostPlans] || boostPlans[0];
      const boostEndDate = new Date();
      boostEndDate.setDate(boostEndDate.getDate() + parseInt(plan.duration.split(' ')[0]));

      // Update course with boost
      await courseService.update(metadata.courseId, {
        boosted: true,
        boostLevel: metadata.boostType === '0' ? 'basic' : metadata.boostType === '1' ? 'premium' : 'featured',
        boostEndDate
      });

      // Send notification
      await notificationService.create({
        userId: user.id,
        title: 'Course Boost Activated!',
        message: `Your course "${course.title}" is now boosted with ${plan.name} for ${plan.duration}.`,
        type: 'course',
        read: false
      });

    } catch (error) {
      console.error('Error processing course boost:', error);
      throw error;
    }
  };

  const processTokenPurchase = async (metadata: any, amount: number, paymentMethod: string, paymentId: string) => {
    if (!metadata.tokenPackageId || !user) return;

    try {
      // Get token package
      const { tokenPackageService } = await import('@/lib/database');
      const tokenPackage = await tokenPackageService.getById(metadata.tokenPackageId);
      if (!tokenPackage) throw new Error('Token package not found');

      // Check if user already has this package
      const existingPackageId = await studentTokenPackageService.addTokens(
        user.id,
        metadata.tokenPackageId,
        tokenPackage.totalTokens
      );

      if (!existingPackageId) {
        // Create new student token package
        await studentTokenPackageService.create({
          studentId: user.id,
          studentName: `${user.firstName} ${user.lastName}`,
          packageId: metadata.tokenPackageId,
          coachId: tokenPackage.coachId,
          coachName: tokenPackage.coachName,
          packageName: tokenPackage.packageName,
          totalTokens: tokenPackage.totalTokens,
          remainingTokens: tokenPackage.totalTokens,
          purchasePrice: tokenPackage.price,
          expiryDate: tokenPackage.expiryDate,
          isExpired: false,
          purchaseDate: new Date(),
          lastUsedDate: undefined
        });
      }

      // Create transaction record
      await tokenTransactionService.createFromPurchase(
        user.id,
        tokenPackage.coachId,
        metadata.tokenPackageId,
        existingPackageId || 'new',
        tokenPackage.price,
        tokenPackage.totalTokens,
        paymentId,
        paymentMethod as any
      );

      // Create coach earnings
      await earningTransactionService.createFromTokenPackagePurchase(
        tokenPackage.coachId,
        user.id,
        `${user.firstName} ${user.lastName}`,
        metadata.tokenPackageId,
        tokenPackage.packageName,
        tokenPackage.price,
        paymentMethod
      );
    } catch (error) {
      console.error('Error processing token purchase:', error);
      throw error;
    }
  };

  const processProductPurchase = async (metadata: any, amount: number, paymentMethod: string, paymentId: string) => {
    if (!user) return;

    try {
      // If we have checkout data ID, fetch the data from Firestore
      if (metadata.checkoutDataId) {
        const checkoutDoc = await getDoc(doc(db, 'checkout_sessions', metadata.checkoutDataId));
        if (!checkoutDoc.exists()) {
          throw new Error('Checkout session data not found');
        }
        
        const checkoutData = JSON.parse(checkoutDoc.data().data);
        const { items: checkoutItems, form: checkoutForm } = checkoutData;

        // Helper function to get product VAT rate
        const getProductVATRate = (product: any): number => {
          return product.vatIncluded ? 7.7 : 0; // Swiss VAT rate
        };

        // Create orders for each seller
        const ordersBySeller: { [sellerId: string]: any[] } = {};
        
        checkoutItems.forEach((item: any) => {
          if (!ordersBySeller[item.sellerId]) {
            ordersBySeller[item.sellerId] = [];
          }
          ordersBySeller[item.sellerId].push(item);
        });

        // Create separate orders for each seller
        for (const [sellerId, items] of Object.entries(ordersBySeller)) {
          const sellerItems = items as any[];
          
          // Calculate subtotal for this seller
          const subtotal = sellerItems.reduce((sum, item) => sum + (item.salePrice || item.price) * item.quantity, 0);
          
          // Calculate VAT for this seller
          const vatAmount = sellerItems.reduce((total, item) => {
            const vatRate = getProductVATRate(item);
            const itemTotal = (item.salePrice || item.price) * item.quantity;
            return total + (itemTotal * vatRate) / 100;
          }, 0);
          
          // Calculate average VAT rate for this seller
          const avgVatRate = subtotal > 0 ? (vatAmount / subtotal) * 100 : 0;
          
          // Calculate delivery fee for this seller
          let deliveryFee = 0;
          if (checkoutForm.deliveryType === 'delivery') {
            if (sellerItems[0]?.deliveryInfo) {
              const { deliveryFee: fee, freeDeliveryThreshold } = sellerItems[0].deliveryInfo;
              if (freeDeliveryThreshold && subtotal >= freeDeliveryThreshold) {
                deliveryFee = 0; // Free delivery
              } else {
                deliveryFee = fee || 0;
              }
            }
          }

          const orderData = {
            customerId: user.id,
            customerName: checkoutForm.customerName,
            customerEmail: checkoutForm.customerEmail,
            customerPhone: checkoutForm.customerPhone,
            sellerId,
            sellerName: sellerItems[0].businessName || sellerItems[0].sellerName,
            businessName: sellerItems[0].businessName || sellerItems[0].sellerName,
            items: sellerItems.map(item => ({
              productId: item.id,
              productName: item.name,
              productImage: item.mainImage,
              quantity: item.quantity,
              price: item.selectedVariant?.price || item.salePrice || item.price,
              subtotal: (item.selectedVariant?.price || item.salePrice || item.price) * item.quantity,
              // Include variant details if present
              ...(item.selectedVariant && {
                variantId: item.selectedVariant.variantId,
                variantSku: item.selectedVariant.sku,
                variantDetails: {
                  combinations: item.selectedVariant.combinations,
                  displayText: item.selectedVariant.displayText,
                  weight: item.selectedVariant.weight
                }
              }),
              selectedOptions: {},
              specialInstructions: checkoutForm.specialInstructions
            })),
            subtotal,
            deliveryFee,
            vatAmount,
            vatRate: avgVatRate,
            totalAmount: subtotal + deliveryFee + vatAmount,
            paymentMethod: paymentMethod,
            paymentId: paymentId,
            deliveryType: checkoutForm.deliveryType,
            deliveryAddress: checkoutForm.deliveryType === 'delivery' ? checkoutForm.deliveryAddress : null,
            notes: checkoutForm.specialInstructions,
            currency: 'CHF'
          };

          // Create the order via API
          const response = await fetch('/api/marketplace/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create order');
          }

          // Create transaction record for this order
          await transactionService.create({
            userId: user.id,
            type: 'product_purchase',
            amount: orderData.totalAmount,
            description: `Product purchase: ${sellerItems.length} items from ${orderData.sellerName} via ${paymentMethod}`,
            status: 'completed'
          });
        }

        console.log('All product orders created successfully');
      } else {
        // Fallback for single product purchases (if any)
        console.log('Single product purchase processing not yet implemented');
      }
    } catch (error) {
      console.error('Error processing product purchase:', error);
      throw error;
    }
  };

  const verifyPaymentSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`);
      const result = await response.json();

      if (response.ok && result.session) {
        setSessionInfo(result.session);
        
        // Process the purchase if we have purchase context
        if (result.session.metadata && result.session.metadata.purchaseType && user) {
          setIsProcessingPurchase(true);
          await processPurchase(result.session);
        }
        
        setStatus('success');
        
        // Notify parent window if this is a popup
        if (window.opener) {
          window.opener.postMessage({
            type: 'PAYMENT_SUCCESS',
            sessionId: sessionId,
            amount: result.session.amount_total / 100,
            paymentMethod: result.session.payment_method_types?.includes('twint') ? 'twint' : 'card'
          }, '*');
          window.close();
        }
      } else {
        console.error('Session verification failed:', result.error);
        setStatus('error');
      }
    } catch (error) {
      console.error('Error verifying session:', error);
      setStatus('error');
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  const handleReturnHome = () => {
    // Try to go back to the previous page or dashboard
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-2xl p-8 w-full max-w-md text-center"
      >
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-[#D91CD2] to-[#7000FF] flex items-center justify-center">
              <FiLoader className="text-white animate-spin" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Verifying Payment...
            </h1>
            <p className="text-gray-400">
              Please wait while we confirm your payment.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500 flex items-center justify-center">
              <FiCheck className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Payment Successful!
            </h1>
            <p className="text-gray-400 mb-6">
              Your payment has been processed successfully.
            </p>
            
            {sessionInfo && (
              <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Amount</span>
                  <span className="text-white font-semibold">
                    {(sessionInfo.amount_total / 100).toFixed(2)} CHF
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Payment Method</span>
                  <span className="text-white font-semibold">
                    {sessionInfo.payment_method_types?.includes('twint') ? 'TWINT' : 'Card'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Transaction ID</span>
                  <span className="text-white font-mono text-xs">
                    {sessionInfo.id.substring(0, 16)}...
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleReturnHome}
              className="w-full btn-primary flex items-center justify-center"
            >
              <FiArrowLeft className="mr-2" />
              Return to Application
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500 flex items-center justify-center">
              <FiAlertCircle className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Payment Verification Failed
            </h1>
            <p className="text-gray-400 mb-6">
              We couldn't verify your payment. Please contact support if you were charged.
            </p>
            
            <button
              onClick={handleReturnHome}
              className="w-full btn-secondary flex items-center justify-center"
            >
              <FiArrowLeft className="mr-2" />
              Return to Application
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}