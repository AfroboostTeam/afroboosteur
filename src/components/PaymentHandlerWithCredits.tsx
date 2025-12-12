'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCreditCard, FiDollarSign, FiX, FiCheck, FiCamera, FiPercent, FiGift } from 'react-icons/fi';
import StripePaymentModal from './StripePaymentModal';
import PaypalPaymentModal from './PaypalPaymentModal';
import TwintPaymentModal from './TwintPaymentModal';
import PurchaseConfirmationModal from './PurchaseConfirmationModal';
import GiftCardScanner from './GiftCardScanner';
import DiscountCardScanner from './DiscountCardScanner';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { transactionService, userService, creditTransactionService } from '@/lib/database';
import { usePurchaseConfirmation } from '@/hooks/usePurchaseConfirmation';
import { useTranslation } from 'react-i18next';

interface PaymentHandlerWithCreditsProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string, method: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card', referralCode?: string) => void;
  amount: number;
  title: string;
  description: string;
  userId: string;
  orderId?: string; // For gift card validation
  businessId?: string; // To validate gift cards are from the same business
  coachId?: string; // For discount card validation
  transactionType?: 'course' | 'product' | 'token'; // For gift card type validation
  // Additional context for TWINT payments
  courseId?: string;
  productId?: string;
  tokenPackageId?: string;
  checkoutData?: string; // For complex purchases like shopping cart
  // Pre-applied cards from Step 1
  preAppliedGiftCardCode?: string;
  preAppliedDiscountCardCode?: string;
  allowedPaymentMethods?: Array<'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card'>;
}

interface PaymentMethod {
  id: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card';
  name: string;
  icon: React.ReactNode;
  isEnabled: boolean;
  description?: string;
}

export default function PaymentHandlerWithCredits(props: PaymentHandlerWithCreditsProps) {
  const { t } = useTranslation();
  const { user, updateUserProfile } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMethodSelection, setShowMethodSelection] = useState(false);
  const [isProcessingCredit, setIsProcessingCredit] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showGiftCardScanner, setShowGiftCardScanner] = useState(false);
  const [giftCardResult, setGiftCardResult] = useState<{ valid: boolean; amount: number; remainingAmount: number; cardCode: string; error?: string } | null>(null);
  const [showDiscountCardScanner, setShowDiscountCardScanner] = useState(false);
  const [discountCardResult, setDiscountCardResult] = useState<{ 
    valid: boolean; 
    discountPercentage: number; 
    cardCode: string; 
    memberName: string;
    coachId: string;
    expirationDate: string;
    description: string;
    discountAmount?: number;
    finalAmount?: number;
    error?: string 
  } | null>(null);
  const [discountedAmount, setDiscountedAmount] = useState<number>(props.amount);
  const [referralCode, setReferralCode] = useState<string>('');
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [referralValidated, setReferralValidated] = useState<boolean | null>(null);
  const [referralUserInfo, setReferralUserInfo] = useState<{ name: string; email: string } | null>(null);
  
  const {
    isConfirmationOpen,
    purchaseItem,
    paymentMethod: confirmationPaymentMethod,
    showConfirmation,
    hideConfirmation,
    confirmPurchase,
    isProcessing: isConfirmationProcessing,
    setIsProcessing: setConfirmationProcessing,
  } = usePurchaseConfirmation();

  // Debug: Log giftCardResult whenever it changes
  useEffect(() => {
    if (giftCardResult) {
      console.log('🔍 giftCardResult state changed:', giftCardResult);
      console.log('🔍 giftCardResult.amount:', giftCardResult.amount, 'type:', typeof giftCardResult.amount);
    }
  }, [giftCardResult]);

  useEffect(() => {
    if (props.isOpen) {
      // Initialize discountedAmount when modal opens (if no cards applied yet)
      if (!discountCardResult && !giftCardResult) {
        setDiscountedAmount(props.amount);
      }
      loadPaymentSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isOpen, user, props.allowedPaymentMethods]);
  
  // Debug: Log discountedAmount whenever it changes
  useEffect(() => {
    console.log('🔍 discountedAmount state changed:', discountedAmount, 'props.amount:', props.amount);
  }, [discountedAmount, props.amount]);

  // Auto-validate pre-applied cards from Step 1
  useEffect(() => {
    if (props.isOpen && props.preAppliedGiftCardCode && !giftCardResult) {
      // Auto-validate gift card
      validatePreAppliedGiftCard(props.preAppliedGiftCardCode);
    }
    if (props.isOpen && props.preAppliedDiscountCardCode && !discountCardResult) {
      // Auto-validate discount card
      validatePreAppliedDiscountCard(props.preAppliedDiscountCardCode);
    }
  }, [props.isOpen, props.preAppliedGiftCardCode, props.preAppliedDiscountCardCode]);

  const validatePreAppliedGiftCard = async (cardCode: string) => {
    if (!user) return;
    
    try {
      // Use the current discounted amount (after discount card if applied)
      const currentAmount = discountCardResult?.finalAmount || props.amount;
      
      const response = await fetch('/api/gift-cards/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardCode,
          amount: currentAmount,
          customerId: props.userId,
          customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Customer',
          businessId: props.businessId,
          orderId: props.orderId,
          transactionType: props.transactionType
        })
      });

      const data = await response.json();
      console.log('🎁 Pre-applied gift card API response:', data);
      
      if (response.ok && data.success && data.valid) {
        // Extract amount: use amount if available, otherwise use amountToUse, otherwise use amountAvailable
        let giftCardAmount = 0;
        if (data.amount !== undefined && data.amount !== null) {
          giftCardAmount = Number(data.amount);
        } else if (data.amountToUse !== undefined && data.amountToUse !== null) {
          giftCardAmount = Number(data.amountToUse);
        } else if (data.amountAvailable !== undefined && data.amountAvailable !== null) {
          // If partial payment, use the available amount (up to requested amount)
          giftCardAmount = Math.min(Number(data.amountAvailable), currentAmount);
        }
        
        const result = {
          valid: true,
          amount: giftCardAmount, // Amount that will be used from gift card
          remainingAmount: data.remainingAmount || 0,
          cardCode: cardCode
        };
        console.log('✅ Pre-applied gift card result (final):', result);
        setGiftCardResult(result);
        
        // Update discounted amount (same logic as handleGiftCardValidation)
        const newAmount = Math.max(0, currentAmount - giftCardAmount);
        setDiscountedAmount(newAmount);
        console.log('✅ Pre-applied gift card: Updated discountedAmount to:', newAmount);
      }
    } catch (error) {
      console.error('Error validating pre-applied gift card:', error);
    }
  };

  const validatePreAppliedDiscountCard = async (cardCode: string) => {
    try {
      const response = await fetch('/api/discount-cards/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardCode,
          customerId: props.userId,
          coachId: props.coachId,
          orderAmount: props.amount
        })
      });

      const result = await response.json();
      if (result.valid) {
        setDiscountCardResult(result);
        const newAmount = typeof result.finalAmount === 'number' ? result.finalAmount : props.amount;
        setDiscountedAmount(newAmount);
      }
    } catch (error) {
      console.error('Error validating pre-applied discount card:', error);
    }
  };

  const isMethodAllowed = (methodId: PaymentMethod['id']) => {
    // Never allow gift-card in payment methods list (it should be applied before reaching payment step)
    if (methodId === 'gift-card') return false;
    // If no restrictions specified, allow all methods (like in course booking)
    if (!props.allowedPaymentMethods || props.allowedPaymentMethods.length === 0) return true;
    // Otherwise check if method is in allowed list
    return props.allowedPaymentMethods.includes(methodId);
  };

  const loadPaymentSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [stripeDoc, paypalDoc] = await Promise.all([
        getDoc(doc(db, 'admin_settings', 'stripe')),
        getDoc(doc(db, 'admin_settings', 'paypal'))
      ]);
      
      const stripeEnabled = stripeDoc.exists() && stripeDoc.data().isConfigured && stripeDoc.data().isEnabled;
      const paypalEnabled = paypalDoc.exists() && paypalDoc.data().isConfigured && paypalDoc.data().isEnabled;
      
      const methods: PaymentMethod[] = [];

      // Always add credits option first if allowed
      if (user && isMethodAllowed('credits')) {
        const hasEnoughCredits = user.credits >= discountedAmount;
        methods.push({
          id: 'credits',
          name: t('useCredits'),
          icon: <FiCheck size={24} />,
          isEnabled: hasEnoughCredits,
          description: hasEnoughCredits
            ? t('useCreditBalanceDescription', {
                amount: discountedAmount.toFixed(2),
                available: user.credits.toFixed(2)
              })
            : `${t('Insufficient credits')} (${t('Available')}: ${user.credits.toFixed(2)} CHF, ${t('Required')}: ${discountedAmount.toFixed(2)} CHF)`
        });
      }

      // Add other payment methods - ALWAYS show all configured methods (like course booking)
      // All methods should be available for all offers
      
      // Stripe (Credit/Debit Card) - Always add if configured
      if (stripeEnabled) {
        methods.push({
          id: 'stripe',
          name: t('creditDebitCard'),
          icon: <FiCreditCard size={24} />,
          isEnabled: true // Always enabled if Stripe is configured
        });
      }

      // PayPal - Always add if configured
      // PayPal should always be available when configured (like in course booking)
      if (paypalEnabled) {
        methods.push({
          id: 'paypal',
          name: t('paypal'),
          icon: <FiDollarSign size={24} />,
          isEnabled: true // Always enabled if PayPal is configured
        });
      }

      // TWINT - Only show if Stripe is enabled (not just configured)
      // TWINT uses Stripe infrastructure, so it should only be available when Stripe is enabled
      if (stripeEnabled) {
        methods.push({
          id: 'twint',
          name: 'TWINT',
          icon: <span className="text-orange-500 font-bold text-lg">📱</span>,
          isEnabled: true // Only enabled if Stripe is enabled
        });
      }

      // Discount Card - Always available when coachId is provided
      if (props.coachId) {
        methods.push({
          id: 'discount-card',
          name: t('Use discount card') || 'Use discount card',
          icon: <FiPercent size={24} />,
          isEnabled: true
        });
        }
       
        // Filter out gift-card method (should not be shown in payment methods list)
        const filteredMethods = methods.filter(m => m.id !== 'gift-card');
        setPaymentMethods(filteredMethods);
      
      const availableMethods = filteredMethods.filter(m => m.isEnabled);
      
      // If no methods are available, check if it's because of restrictions
      if (availableMethods.length === 0) {
        // If we have allowedPaymentMethods but none are enabled, show helpful error
        if (props.allowedPaymentMethods && props.allowedPaymentMethods.length > 0) {
          setError(t('noPaymentMethodsAvailable') + '. Please configure payment methods in admin settings or contact support.');
        } else {
          setError(t('noPaymentMethodsAvailable'));
        }
      } else if (availableMethods.length === 1) {
        // Only one method available, use it directly
        setSelectedMethod(availableMethods[0].id);
        setShowMethodSelection(false);
      } else {
        // Multiple methods available, show selection
        setShowMethodSelection(true);
        setSelectedMethod(null);
      }
      
    } catch (error) {
      console.error('Error loading payment settings:', error);
      setError(t('failedToLoadPaymentOptions'));
    } finally {
      setIsLoading(false);
    }
  };

  const validateReferralCode = async (code: string) => {
    if (!code.trim()) {
      setReferralValidated(null);
      setReferralUserInfo(null);
      return;
    }

    try {
      const response = await fetch(`/api/referrals/validate/${encodeURIComponent(code)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setReferralValidated(true);
          setReferralUserInfo({
            name: data.user.name,
            email: data.user.email
          });
        } else {
          setReferralValidated(false);
          setReferralUserInfo(null);
        }
      } else {
        setReferralValidated(false);
        setReferralUserInfo(null);
      }
    } catch (error) {
      console.error('Error validating referral code:', error);
      setReferralValidated(false);
      setReferralUserInfo(null);
    }
  };

    const handleCreditPayment = async () => {
    if (isProcessingPayment || !user || user.credits < discountedAmount) {
      if (!user || user.credits < discountedAmount) {
        setError(t('insufficient_credits'));
      }
      return;
    }

    setIsProcessingPayment(true);
    setError(null);
    
    try {
      const newCredits = user.credits - discountedAmount;
      
      // Update user credits
      await userService.update(user.id, { credits: newCredits });
      
      // Create credit transaction record
      await creditTransactionService.create({
        userId: user.id,
        adminId: user.id, // Self-service purchase
        adminName: `${user.firstName} ${user.lastName}`,
        amount: discountedAmount,
        type: 'debit',
        reason: props.title || 'Purchase',
        balanceBefore: user.credits,
        balanceAfter: newCredits
      });
      
      setIsProcessingPayment(false);
      hideConfirmation();
      props.onSuccess('credits', 'credits', referralValidated && referralCode ? referralCode : undefined);
    } catch (error) {
      console.error('Credit payment error:', error);
      setError(t('Payment failed. Please try again.'));
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    if (selectedMethod && selectedMethod !== 'credits') {
      // Use gift card if one was applied (only when payment is successful)
      if (giftCardResult && giftCardResult.valid && giftCardResult.cardCode && user) {
        try {
          const useResponse = await fetch('/api/gift-cards/use', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cardCode: giftCardResult.cardCode,
              amount: giftCardResult.amount,
              customerId: user.id,
              customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Customer',
              businessId: props.businessId,
              orderId: props.orderId,
              bookingId: undefined,
              transactionType: props.transactionType
            })
          });
          
          if (!useResponse.ok) {
            console.error('Failed to use gift card:', await useResponse.json());
            // Continue with payment even if gift card use fails (it was already validated)
          }
        } catch (error) {
          console.error('Error using gift card:', error);
          // Continue with payment even if gift card use fails
        }
      }
      
      setIsProcessingPayment(false);
      hideConfirmation();
      props.onSuccess(paymentId, selectedMethod, referralValidated && referralCode ? referralCode : undefined);
    }
  };

  const handlePaymentFailure = (error?: string) => {
    setIsProcessingPayment(false);
    setError(error || t('Payment failed. Please try again.'));
    setSelectedMethod(null);
    setShowMethodSelection(true);
    hideConfirmation(); // Also hide confirmation dialog on failure
  };

  const handleMethodSelection = (methodId: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card') => {
    if (isProcessingPayment) {
      return; // Prevent method selection during payment processing
    }

    if (methodId === 'gift-card') {
      setShowGiftCardScanner(true);
      return;
    }

    if (methodId === 'discount-card') {
      setShowDiscountCardScanner(true);
      return;
    }

    // For Stripe, PayPal, and TWINT, directly open the payment modal
    if (methodId === 'stripe' || methodId === 'paypal' || methodId === 'twint') {
      setSelectedMethod(methodId);
      setShowMethodSelection(false);
      return;
    }

    // For credits, show confirmation dialog
    if (methodId === 'credits') {
      const purchaseItem = {
        id: 'purchase-item',
        name: props.title,
        description: props.description,
        price: props.amount,
        quantity: 1,
        type: 'course' as const, // Default to course, can be customized based on props
      };

      showConfirmation(purchaseItem, methodId, () => {
        setSelectedMethod(methodId);
        handleCreditPayment();
      });
    }
  };

  const handleGiftCardValidation = (result: { valid: boolean; amount: number; remainingAmount: number; cardCode: string; error?: string }) => {
    if (isProcessingPayment) {
      return; // Prevent double processing
    }

    console.log('🎁 Gift card validation result received:', result);
    console.log('🔍 Gift card result details:', {
      valid: result.valid,
      amount: result.amount,
      remainingAmount: result.remainingAmount,
      cardCode: result.cardCode,
      amountType: typeof result.amount,
      amountIsNaN: isNaN(Number(result.amount))
    });
    
    // SIMPLIFIED: Use result.amount directly - it should already be a valid number from GiftCardScanner
    // Only normalize if it's not already a valid number
    let giftCardAmount = 0;
    
    if (result.amount !== undefined && result.amount !== null) {
      if (typeof result.amount === 'number' && !isNaN(result.amount)) {
        giftCardAmount = result.amount; // Don't check > 0, as 0 is valid (though unlikely)
      } else if (typeof result.amount === 'string') {
        const parsed = parseFloat(result.amount);
        if (!isNaN(parsed)) {
          giftCardAmount = parsed;
        }
      }
    }
    
    console.log('🔍 Amount extraction in handleGiftCardValidation:', {
      resultAmount: result.amount,
      resultAmountType: typeof result.amount,
      extractedAmount: giftCardAmount,
      isValid: !isNaN(giftCardAmount)
    });
    
    // If amount is still 0 but validation is valid, log error
    if (giftCardAmount === 0 && result.valid) {
      console.error('❌ CRITICAL ERROR: Gift card amount is 0 but validation is valid!', {
        result,
        giftCardAmount,
        originalAmount: result.amount,
        originalType: typeof result.amount
      });
    }
    
    // Create the result object with the gift card amount
    const finalResult = {
      valid: result.valid,
      amount: giftCardAmount, // Store the extracted amount
      remainingAmount: result.remainingAmount || 0,
      cardCode: result.cardCode,
      error: result.error
    };
    
    console.log('✅ Final gift card result to store:', finalResult);
    console.log('🔍 Amount verification:', {
      originalAmount: result.amount,
      giftCardAmount: giftCardAmount,
      willBeStored: finalResult.amount,
      isValid: giftCardAmount > 0
    });
    
    // Store the result in state FIRST
    setGiftCardResult(finalResult);
    setShowGiftCardScanner(false);
    
    if (result.valid) {
      // Calculate the new amount after gift card deduction (same logic as discount card)
      // Use giftCardAmount from the extraction above
      console.log('💰 Gift card amount for calculation:', giftCardAmount);
      console.log('💰 Current state before calculation:', {
        discountedAmount,
        propsAmount: props.amount,
        discountCardResult: discountCardResult?.finalAmount
      });
      
      // Use the current discounted amount (which may already have discount applied)
      const currentAmount = discountedAmount > 0 && discountedAmount < props.amount 
        ? discountedAmount 
        : (discountCardResult?.finalAmount || props.amount);
      
      // Calculate new amount: subtract gift card amount from current amount
      const newAmount = Math.max(0, currentAmount - giftCardAmount);
      
      console.log('💰 Gift card amount calculation:', {
        giftCardAmount,
        currentAmount,
        discountedAmount,
        originalAmount: props.amount,
        newAmount,
        calculation: `${currentAmount} - ${giftCardAmount} = ${newAmount}`,
        discountCardApplied: !!discountCardResult
      });
      
      // Update the discounted amount
      setDiscountedAmount(newAmount);
      console.log('✅ Updated discountedAmount to:', newAmount);
      
      // CRITICAL: Also update giftCardResult to ensure amount is stored correctly
      setGiftCardResult(prev => {
        if (prev && prev.valid) {
          const updated = { ...prev, amount: giftCardAmount };
          console.log('🔄 Ensuring giftCardResult has correct amount:', updated);
          return updated;
        }
        return prev;
      });
      
      // IMPORTANT: Update giftCardResult again to ensure amount is stored correctly
      // This ensures the UI displays the correct amount
      setGiftCardResult(prev => {
        if (prev && prev.valid) {
          const updated = { ...prev, amount: giftCardAmount };
          console.log('🔄 Updating giftCardResult with amount:', updated);
          return updated;
        }
        return prev;
      });
      
      // Reload payment settings to update available methods with new amount
      loadPaymentSettings();
      
      // If the gift card covers the full amount (or more), complete the purchase immediately
      if (newAmount <= 0) {
        setIsProcessingPayment(true);
        // Use the gift card and complete the purchase
        (async () => {
          try {
            if (user) {
              const useResponse = await fetch('/api/gift-cards/use', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  cardCode: result.cardCode,
                  amount: giftCardAmount,
                  customerId: user.id,
                  customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Customer',
                  businessId: props.businessId,
                  orderId: props.orderId,
                  bookingId: undefined,
                  transactionType: props.transactionType
                })
              });
              
              if (!useResponse.ok) {
                const errorData = await useResponse.json();
                throw new Error(errorData.error || 'Failed to use gift card');
              }
            }
            props.onSuccess(result.cardCode, 'gift-card');
          } catch (error: any) {
            console.error('Error using gift card:', error);
            setError(error.message || 'Failed to complete purchase with gift card');
            setIsProcessingPayment(false);
          }
        })();
      } else {
        // Gift card partially covers the amount, show remaining amount
        console.log(`💳 Gift card partially covers amount. Remaining: ${newAmount} CHF`);
        setError(null);
        // Show payment methods for remaining amount
        setShowMethodSelection(true);
      }
    } else {
      setError(result.error || 'Gift card validation failed');
    }
  };

  const handleCloseGiftCardScanner = () => {
    setShowGiftCardScanner(false);
    // Don't clear giftCardResult - keep it applied if it was already validated
    // This allows user to close scanner and still see the discount applied
  };

  const handleDiscountCardValidation = (result: { 
    valid: boolean; 
    discountPercentage: number; 
    cardCode: string; 
    memberName: string;
    coachId: string;
    expirationDate: string;
    description: string;
    discountAmount?: number;
    finalAmount?: number;
    error?: string 
  }) => {
    if (isProcessingPayment) {
      return; // Prevent double processing
    }

    setDiscountCardResult(result);
    setShowDiscountCardScanner(false);
    
    if (result.valid) {
      // Use the API calculated values instead of manual calculation
      const newAmount = typeof result.finalAmount === 'number' ? result.finalAmount : props.amount;
      setDiscountedAmount(newAmount);
      
      // If the discount covers the full amount, complete the purchase immediately
      if (newAmount <= 0) {
        setIsProcessingPayment(true);
        try {
          props.onSuccess(result.cardCode, 'discount-card');
        } finally {
          setIsProcessingPayment(false);
        }
      } else {
        // Show payment methods for remaining amount
        setShowMethodSelection(true);
      }
    } else {
      setError(result.error || 'Discount card validation failed');
    }
  };

  const handleCloseDiscountCardScanner = () => {
    setShowDiscountCardScanner(false);
  };

  const handleBackToSelection = () => {
    setSelectedMethod(null);
    setShowMethodSelection(true);
  };

  if (!props.isOpen) return null;

  return (
    <>
      {/* Payment Processing Overlay */}
      {isProcessingPayment && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-xl p-8 text-center max-w-sm w-full mx-4"
          >
            <div className="w-16 h-16 border-4 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('Processing Payment')}</h3>
            <p className="text-gray-400 mb-4">
              {t('Please wait while we process your payment. Do not close this window.')}
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-[#D91CD2] rounded-full animate-pulse"></div>
              <span>{t('Secure transaction in progress')}</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Payment Method Selection or Loading */}
      {(showMethodSelection || isLoading || error) && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-900 rounded-xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] flex flex-col"
          >
            {/* Fixed Header */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-700">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold truncate pr-2">{t('Step 2: Choose Payment Method')}</h3>
                <p className="text-sm text-gray-400 mt-1">{props.title}</p>
              </div>
              <button
                onClick={props.onClose}
                className="text-gray-400 hover:text-white flex-shrink-0"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-6">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">{t('loadingPaymentOptions')}</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <div className="text-red-500 mb-4 px-2">{error}</div>
                    <button
                      onClick={props.onClose}
                      className="btn-secondary"
                    >
                      {t('close')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Amount Display */}
                    <div className="text-center">
                      <p className="text-gray-400 text-sm sm:text-base px-2">{props.description}</p>
                      {(discountCardResult && discountCardResult.valid) || (giftCardResult && giftCardResult.valid) || discountedAmount < props.amount ? (
                        <div className="space-y-2 mt-4">
                          {discountCardResult && discountCardResult.valid && (
                            <div className="flex items-center justify-center space-x-2 text-green-400">
                              <FiPercent size={16} />
                              <span className="text-sm">
                                {discountCardResult.discountPercentage}% {t('Discount Applied')}
                              </span>
                            </div>
                          )}
                          {giftCardResult && giftCardResult.valid && (
                            <div className="flex items-center justify-center space-x-2 text-purple-400">
                              <FiGift size={16} />
                              <span className="text-sm">
                                {t('Gift Card Applied')}: CHF {(() => {
                                  // Use the amount directly from giftCardResult
                                  // Log the current state for debugging
                                  console.log('🎨 Rendering gift card amount. Current giftCardResult:', giftCardResult);
                                  
                                  const displayAmount = giftCardResult.amount && typeof giftCardResult.amount === 'number' && !isNaN(giftCardResult.amount)
                                    ? giftCardResult.amount
                                    : (typeof giftCardResult.amount === 'string' ? parseFloat(giftCardResult.amount) : 0);
                                  
                                  if (displayAmount === 0 || isNaN(displayAmount)) {
                                    console.error('❌ ERROR: Display amount is 0 or NaN!', {
                                      giftCardResult,
                                      amount: giftCardResult.amount,
                                      amountType: typeof giftCardResult.amount,
                                      displayAmount,
                                      isValid: !isNaN(displayAmount) && displayAmount > 0
                                    });
                                  } else {
                                    console.log('✅ Displaying gift card amount:', displayAmount);
                                  }
                                  
                                  return (displayAmount || 0).toFixed(2);
                                })()}
                              </span>
                            </div>
                          )}
                          <div className="text-gray-400 line-through text-lg">
                            CHF {props.amount.toFixed(2)}
                          </div>
                          <p className="text-xl sm:text-2xl font-bold text-[#D91CD2]">
                            CHF {discountedAmount.toFixed(2)}
                          </p>
                          {(discountCardResult?.discountAmount || giftCardResult?.amount || discountedAmount < props.amount) && (
                            <p className="text-sm text-green-400">
                              {t('You save')} CHF {
                                discountCardResult?.discountAmount 
                                  ? (discountCardResult.discountAmount + (giftCardResult?.amount || 0)).toFixed(2)
                                  : giftCardResult?.amount 
                                    ? giftCardResult.amount.toFixed(2)
                                    : (props.amount - discountedAmount).toFixed(2)
                              }
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xl sm:text-2xl font-bold text-[#D91CD2] mt-4">
                          CHF {props.amount.toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Referral Code Section */}
                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <label className="text-sm sm:text-base font-medium text-gray-300">
                          {t('Referral Code')} ({t('Optional')})
                        </label>
                        <button
                          onClick={() => setShowReferralInput(!showReferralInput)}
                          className="text-sm text-purple-400 hover:text-purple-300 self-start sm:self-auto"
                        >
                          {showReferralInput ? t('Hide') : t('Have a referral code?')}
                        </button>
                      </div>
                      
                      {showReferralInput && (
                        <div className="space-y-3">
                          <div className="relative">
                            <input
                              type="text"
                              value={referralCode}
                              onChange={(e) => {
                                const code = e.target.value;
                                setReferralCode(code);
                                if (code.length >= 3) {
                                  validateReferralCode(code);
                                } else {
                                  setReferralValidated(null);
                                  setReferralUserInfo(null);
                                }
                              }}
                              placeholder={t('Enter referral code')}
                              className={`w-full px-3 py-3 sm:px-4 sm:py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 text-base sm:text-sm ${
                                referralValidated === true ? 'border-green-500' :
                                referralValidated === false ? 'border-red-500' :
                                'border-gray-600'
                              }`}
                            />
                            {referralValidated === true && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <FiCheck className="text-green-500" size={18} />
                              </div>
                            )}
                            {referralValidated === false && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <FiX className="text-red-500" size={18} />
                              </div>
                            )}
                          </div>
                          
                          {referralValidated === true && referralUserInfo && (
                            <div className="text-sm text-green-400 flex items-center space-x-2 bg-green-900/20 p-2 rounded-md">
                              <FiCheck size={14} className="flex-shrink-0" />
                              <span className="break-words">{t('Valid referral from')} {referralUserInfo.name}</span>
                            </div>
                          )}
                          
                          {referralValidated === false && (
                            <div className="text-sm text-red-400 flex items-center space-x-2 bg-red-900/20 p-2 rounded-md">
                              <FiX size={14} className="flex-shrink-0" />
                              <span>{t('Invalid referral code')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Payment Methods */}
                    <div className="space-y-3">
                      {paymentMethods.filter(m => m.isEnabled).map((method) => (
                        <button
                          key={method.id}
                          onClick={() => handleMethodSelection(method.id)}
                          disabled={isProcessingPayment || (method.id === 'credits' && isProcessingCredit)}
                          className={`w-full p-3 sm:p-4 border border-gray-600 rounded-lg hover:border-[#D91CD2] hover:bg-[#D91CD2]/10 transition-all flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${
                            isProcessingPayment ? 'pointer-events-none' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className={`${method.id === 'credits' ? 'text-green-400' : 'text-[#D91CD2]'} flex-shrink-0`}>
                              {method.icon}
                            </div>
                            <div className="text-left min-w-0 flex-1">
                              <div className="font-medium text-sm sm:text-base">{method.name}</div>
                              {method.description && (
                                <div className="text-xs sm:text-sm text-gray-400 break-words">{method.description}</div>
                              )}
                              {isProcessingPayment && (
                                <div className="text-xs sm:text-sm text-yellow-400">
                                  {method.id === 'credits' ? t('processing') : t('Processing payment...')}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="w-4 h-4 rounded-full border-2 border-gray-500 flex-shrink-0"></div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            {!isLoading && !error && (
              <div className="p-4 sm:p-6 border-t border-gray-700">
                <button
                  onClick={props.onClose}
                  disabled={isProcessingPayment}
                  className={`btn-secondary w-full ${isProcessingPayment ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {t('cancel')}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Stripe Payment Modal */}
      {selectedMethod === 'stripe' && (
        <StripePaymentModal
          isOpen={true}
          onClose={paymentMethods.filter(m => m.isEnabled).length > 1 ? () => {
            setIsProcessingPayment(false); // Reset processing state
            handlePaymentFailure();
          } : props.onClose}
          onSuccess={handlePaymentSuccess}
          amount={discountedAmount}
          title={props.title}
          description={props.description}
          userId={props.userId}
        />
      )}

      {/* PayPal Payment Modal */}
      {selectedMethod === 'paypal' && (
        <PaypalPaymentModal
          isOpen={true}
          onClose={paymentMethods.filter(m => m.isEnabled).length > 1 ? () => {
            setIsProcessingPayment(false); // Reset processing state
            handlePaymentFailure();
          } : props.onClose}
          onSuccess={handlePaymentSuccess}
          amount={discountedAmount}
          title={props.title}
          description={props.description}
          userId={props.userId}
        />
      )}

      {/* TWINT Payment Modal */}
      {selectedMethod === 'twint' && (
        <TwintPaymentModal
          isOpen={true}
          onClose={paymentMethods.filter(m => m.isEnabled).length > 1 ? () => {
            setIsProcessingPayment(false); // Reset processing state
            handlePaymentFailure();
          } : props.onClose}
          onSuccess={handlePaymentSuccess}
          amount={discountedAmount}
          title={props.title}
          description={props.description}
          userId={props.userId}
          purchaseContext={{
            type: props.transactionType || 'course',
            courseId: props.courseId,
            productId: props.productId,
            tokenPackageId: props.tokenPackageId,
            businessId: props.businessId,
            coachId: props.coachId,
            referralCode: referralValidated && referralCode ? referralCode : undefined,
            checkoutData: props.checkoutData
          }}
        />
      )}

      {/* Purchase Confirmation Modal */}
      {isConfirmationOpen && purchaseItem && confirmationPaymentMethod && !isProcessingPayment && (
        <PurchaseConfirmationModal
          isOpen={isConfirmationOpen}
          onClose={() => {
            hideConfirmation();
            setIsProcessingPayment(false);
          }}
          onConfirm={confirmPurchase}
          item={purchaseItem}
          paymentMethod={confirmationPaymentMethod}
          userCredits={user?.credits || 0}
          isLoading={isConfirmationProcessing}
          title={t('confirmPurchaseTitle')}
        />
      )}

      {/* Gift Card Scanner Modal */}
      {showGiftCardScanner && user && (
        <GiftCardScanner
          onValidation={handleGiftCardValidation}
          onClose={handleCloseGiftCardScanner}
          customerId={user.id}
          customerName={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Customer'}
          businessId={props.businessId}
          orderId={props.orderId}
          requestedAmount={discountedAmount || props.amount}
          transactionType={props.transactionType}
        />
      )}

      {/* Discount Card Scanner Modal */}
      {showDiscountCardScanner && user && (
        <DiscountCardScanner
          onValidation={handleDiscountCardValidation}
          onClose={handleCloseDiscountCardScanner}
          customerId={user.id}
          customerName={`${user.firstName} ${user.lastName}`}
          coachId={props.coachId}
          orderAmount={props.amount}
        />
      )}
    </>
  );
}
