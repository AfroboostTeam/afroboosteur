'use client';

import { useEffect, useMemo, useState, ReactElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiArrowRight, FiCreditCard, FiGift, FiPercent, FiChevronDown } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import PaymentHandlerWithCredits from './PaymentHandlerWithCredits';
import DiscountCardScanner from './DiscountCardScanner';
import { useAuth } from '@/lib/auth';
import { offerService, offerPurchaseService, notificationService, transactionService, buildDefaultOffers } from '@/lib/database';
import { Offer, OfferOption } from '@/types';

interface WelcomePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PurchaseContext {
  offer: Offer;
  option?: OfferOption;
  amount: number;
}

export default function WelcomePopup({ isOpen, onClose }: WelcomePopupProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activePurchase, setActivePurchase] = useState<PurchaseContext | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showDiscountCardScanner, setShowDiscountCardScanner] = useState(false);
  const [selectedDiscountCardCode, setSelectedDiscountCardCode] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Always reload offers when popup opens to get latest data from coach dashboard
      loadOffers(true);
      // Reset active tab when popup opens
      setActiveTab(0);
    }
  }, [isOpen]);

  const loadOffers = async (forceRefresh = false) => {
    try {
      setIsLoadingOffers(true);
      setError(null);
      
      // Add a longer delay to ensure Firestore has processed the update and cache is cleared
      if (forceRefresh) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay to match getActiveOffers
      }
      
      // Force fresh fetch from Firestore - don't use cache
      const activeOffers = await offerService.getActiveOffers(forceRefresh);
      
      console.log('WelcomePopup: Loaded offers from Firestore:', activeOffers.length);
      console.log('WelcomePopup: Offer details:', activeOffers.map(o => ({ 
        id: o.id, 
        title: o.title, 
        subtitle: o.subtitle,
        description: o.description,
        coachId: o.coachId,
        updatedAt: o.updatedAt
      })));
      
      // Always use Firestore data if available, don't fall back to defaults if we have any offers
      if (activeOffers.length > 0) {
        setOffers(activeOffers);
        const defaults: Record<string, string> = {};
        activeOffers.forEach(offer => {
          const activeOptions = offer.options?.filter(option => option.isActive !== false) || [];
          if (activeOptions.length > 0) {
            const initialOption = activeOptions.find(option => option.id === offer.defaultOptionId) || activeOptions[0];
            defaults[offer.id] = initialOption.id;
          }
        });
        setSelectedOptions(defaults);
        setError(null);
      } else {
        // Only use defaults if no offers in Firestore
        console.warn('WelcomePopup: No active offers found, using defaults');
        const fallback = buildDefaultOffers();
        setOffers(fallback);
        const defaults: Record<string, string> = {};
        fallback.forEach(offer => {
          const activeOptions = offer.options?.filter(option => option.isActive !== false) || [];
          if (activeOptions.length > 0) {
            const initialOption = activeOptions.find(option => option.id === offer.defaultOptionId) || activeOptions[0];
            defaults[offer.id] = initialOption.id;
          }
        });
        setSelectedOptions(defaults);
        setError(null);
      }
    } catch (err) {
      console.error('WelcomePopup: Failed to load offers', err);
      // Only set error if we truly have no offers
      const fallback = buildDefaultOffers();
      setOffers(fallback);
      const defaults: Record<string, string> = {};
      fallback.forEach(offer => {
        const activeOptions = offer.options?.filter(option => option.isActive !== false) || [];
        if (activeOptions.length > 0) {
          const initialOption = activeOptions.find(option => option.id === offer.defaultOptionId) || activeOptions[0];
          defaults[offer.id] = initialOption.id;
        }
      });
      setSelectedOptions(defaults);
      // Don't show error if we have fallback offers
      if (fallback.length > 0) {
        setError(null);
      } else {
        setError(t('failedToLoadOffers') || 'Failed to load offers');
      }
    } finally {
      setIsLoadingOffers(false);
    }
  };

  const getSelectedOption = (offer: Offer) => {
    const activeOptions = offer.options?.filter(option => option.isActive !== false) || [];
    if (!activeOptions.length) return undefined;
    const optionId = selectedOptions[offer.id] || offer.defaultOptionId || activeOptions[0].id;
    return activeOptions.find(option => option.id === optionId) || activeOptions[0];
  };

  const getPaymentMethods = (offer: Offer, option?: OfferOption) => {
    const methods = option?.paymentMethods?.length ? option.paymentMethods : offer.paymentMethods;
    return Array.from(new Set(methods || []));
  };

  const paymentBadges = (offer: Offer, option?: OfferOption) => {
    const methods = getPaymentMethods(offer, option);
    const badgeConfig: Record<string, { label: string; icon: ReactElement }> = {
      credit_card: { label: t('creditDebitCard'), icon: <FiCreditCard size={14} /> },
      twint: { label: 'TWINT', icon: <span className="text-sm font-semibold">📱</span> },
      gift_card: { label: t('Gift Card'), icon: <FiGift size={14} /> },
      discount_card: { label: t('Member discount card'), icon: <FiPercent size={14} /> }
    };

    return methods.map(method => (
      <span
        key={method}
        className="inline-flex items-center space-x-2 bg-gray-800/60 border border-gray-700 rounded-full px-3 py-1 text-xs text-gray-200"
      >
        {badgeConfig[method]?.icon}
        <span>{badgeConfig[method]?.label || method}</span>
      </span>
    ));
  };

  const handleOptionChange = (offerId: string, optionId: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [offerId]: optionId
    }));
  };

  // Don't restrict payment methods - show all available methods like in course booking
  // This allows users to use any configured payment method (stripe, paypal, twint, credits, etc.)
  const mapAllowedPaymentMethods = (offer: Offer, option?: OfferOption): Array<'stripe' | 'twint' | 'gift-card' | 'discount-card' | 'credits' | 'paypal'> | undefined => {
    // Return undefined to allow all payment methods (same as course booking)
    // PaymentHandlerWithCredits will show all configured methods when allowedPaymentMethods is undefined
    return undefined;
  };

  const openPayment = (offer: Offer) => {
    if (!user) {
      router.push('/login');
      return;
    }
    const option = getSelectedOption(offer);
    const amount = option ? option.price : offer.price;
    
    // Check if it's the second offer (subscription) and selected option contains "with discount" (not "without discount")
    const isSecondOffer = activeTab === 1;
    const optionLabel = option?.label?.toLowerCase() || '';
    
    // Only show discount scanner if option explicitly contains "with discount" or "with a discount"
    // Exclude "without discount" or "without a discount" options
    const hasWithDiscountOption = (
      optionLabel.includes('with discount') || 
      optionLabel.includes('with a discount') ||
      optionLabel.includes('with discount card') ||
      optionLabel.includes('with a discount card')
    ) && !optionLabel.includes('without');
    
    // If it's the second offer with "with discount" option, show discount card scanner first
    if (isSecondOffer && hasWithDiscountOption) {
      setActivePurchase({ offer, option, amount });
      // Close popup before opening discount scanner
      onClose();
      // Small delay to ensure popup closes smoothly
      setTimeout(() => {
        setShowDiscountCardScanner(true);
      }, 300);
    } else {
      // Normal flow - go directly to payment
      setActivePurchase({ offer, option, amount });
      // Close popup before opening payment
      onClose();
      // Small delay to ensure popup closes smoothly
      setTimeout(() => {
        setShowPayment(true);
      }, 300);
    }
  };

  const closePayment = () => {
    setShowPayment(false);
    setActivePurchase(null);
    setSelectedDiscountCardCode(undefined);
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
    error?: string;
  }) => {
    setShowDiscountCardScanner(false);
    if (result.valid) {
      setSelectedDiscountCardCode(result.cardCode);
      setError(null);
      // After successful discount card scan, proceed to payment
      if (activePurchase) {
        setTimeout(() => {
          setShowPayment(true);
        }, 300);
      }
    } else {
      // If validation fails, clear the purchase context and show error
      setError(result.error || 'Invalid discount card');
      setActivePurchase(null);
      setSelectedDiscountCardCode(undefined);
      // The discount scanner will close, and user can try again from the popup
    }
  };

  const handleOfferPaymentSuccess = async (paymentId: string, method: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card') => {
    if (!activePurchase || !user) return;

    try {
      const { offer, option, amount } = activePurchase;
      const amountPaid = method === 'gift-card' || method === 'discount-card' ? 0 : amount;

      // Calculate expiration date based on offer validity days (default to 30 days if not set)
      const validityDays = offer.validityDays || 30;
      const startDate = new Date();
      // Create expiration date by adding validity days to start date
      const expirationDate = new Date(startDate);
      expirationDate.setDate(startDate.getDate() + validityDays);
      // Set time to end of day (23:59:59) to ensure full day validity
      expirationDate.setHours(23, 59, 59, 999);

      // Create offer purchase with expiration date
      await offerPurchaseService.create({
        offerId: offer.id,
        offerTitle: offer.title,
        optionId: option?.id,
        optionLabel: option?.label,
        purchaserId: user.id,
        purchaserName: `${user.firstName} ${user.lastName}`,
        coachId: offer.coachId,
        amountPaid,
        paymentMethod: method,
        paymentReference: paymentId,
        status: 'completed',
        expirationDate: expirationDate
      });

      // Create UserSubscription for the offer purchase
      const { userSubscriptionService } = await import('@/lib/database');
      const { Timestamp } = await import('firebase/firestore');
      
      await userSubscriptionService.create({
        userId: user.id,
        planId: offer.id,
        planName: offer.title,
        planType: 'annual', // Treat offer subscriptions as annual subscriptions with expiry
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(expirationDate),
        status: 'active',
        paymentId: paymentId,
        paymentMethod: method,
        amount: amountPaid
      });

      if (amountPaid > 0) {
        await transactionService.create({
          userId: user.id,
          type: 'offer_purchase',
          amount: amountPaid,
          description: `${offer.title}${option ? ` - ${option.label}` : ''} via ${method}`,
          status: 'completed'
        });
      }

      await notificationService.create({
        userId: user.id,
        title: t('Offer confirmed') || 'Offer confirmed',
        message: t('offerConfirmedMessage', { title: offer.title }) || `Your ${offer.title} is ready. Head to courses to start.`,
        type: 'booking',
        read: false
      });

      if (offer.coachId) {
        try {
          await notificationService.create({
            userId: offer.coachId,
            title: t('New offer purchase') || 'New offer purchase',
            message: `${user.firstName} ${user.lastName} purchased ${offer.title}`,
            type: 'booking',
            read: false
          });
        } catch (coachError) {
          console.warn('Unable to notify coach about offer purchase', coachError);
        }
      }

      if (typeof window !== 'undefined' && user.role === 'student') {
        localStorage.setItem('preferredLandingPage', '/courses');
        localStorage.setItem('preferredLandingFor', user.id);
      }

      closePayment();
      onClose();
      router.push('/courses');
    } catch (err) {
      console.error('Error handling offer payment', err);
      setError(t('failedToCompletePurchase') || 'Failed to complete the purchase, please try again.');
    }
  };

  const visibleOffers = useMemo(() => offers.filter(offer => offer.isActive !== false), [offers]);
  const currentOffer = useMemo(() => visibleOffers[activeTab] || visibleOffers[0], [visibleOffers, activeTab]);
  
  // Different background gradients for each offer
  const offerBackgrounds = [
    'bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-purple-800/30', // Discovery Class
    'bg-gradient-to-br from-blue-900/30 via-indigo-900/20 to-blue-800/30',   // Subscription
    'bg-gradient-to-br from-orange-900/30 via-red-900/20 to-orange-800/30'   // Pulse X10
  ];

  const offersContent = useMemo(() => {
    if (isLoadingOffers) {
      return (
        <div className="animate-pulse bg-gray-800/40 h-32 rounded-2xl border border-gray-800" />
      );
    }

    if (!currentOffer) {
      return (
        <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-4 text-center text-gray-400 text-sm">
          {t('noOffersFound') || 'No offers available at the moment.'}
        </div>
      );
    }

    const selectedOption = getSelectedOption(currentOffer);
    const price = selectedOption ? selectedOption.price : currentOffer.price;
    const activeOptions = currentOffer.options?.filter(option => option.isActive !== false) || [];
    const bgClass = offerBackgrounds[activeTab] || offerBackgrounds[0];
    
    return (
      <div
        key={currentOffer.id}
        className={`${bgClass} border border-gray-700/50 rounded-xl p-4 space-y-3 shadow-inner w-full max-w-full min-w-0`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between w-full min-w-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-gray-400 flex items-center space-x-1 mb-1">
              <span>{currentOffer.emoji}</span>
              <span>{t('Offer')}</span>
            </p>
            <h3 className="text-lg sm:text-xl font-semibold">{currentOffer.title}</h3>
            {currentOffer.subtitle && <p className="text-gray-400 text-xs mt-0.5">{currentOffer.subtitle}</p>}
          </div>
          <div className="text-right sm:text-left sm:ml-4">
            <span className="text-xs text-gray-400">{t('Starting at')}</span>
            <div className="text-2xl sm:text-3xl font-bold">CHF {price.toFixed(0)}</div>
          </div>
        </div>

        <p className="text-gray-300 text-xs leading-relaxed">{currentOffer.description}</p>

        {currentOffer.highlightItems?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {currentOffer.highlightItems.map(item => (
              <span key={item} className="text-xs bg-[#D91CD2]/10 text-[#D91CD2] px-2 py-0.5 rounded-full border border-[#D91CD2]/30">
                {item}
              </span>
            ))}
          </div>
        ) : null}

        {activeOptions.length ? (
          <div className="space-y-2 w-full max-w-full overflow-hidden">
            <label className="text-xs uppercase tracking-wider text-gray-400 block">
              {t('Choose your option')}
            </label>
            <div className="relative w-full max-w-full overflow-hidden">
              <select
                value={selectedOption?.id || ''}
                onChange={(e) => handleOptionChange(currentOffer.id, e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-2.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D91CD2] appearance-none cursor-pointer pr-7"
                style={{ 
                  maxWidth: '100%',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {activeOptions.map(option => {
                  // Remove "Option A -", "Option B -", "Option C -" prefixes
                  let displayLabel = option.label;
                  if (displayLabel.startsWith('Option A — ')) {
                    displayLabel = displayLabel.replace('Option A — ', '');
                  } else if (displayLabel.startsWith('Option B — ')) {
                    displayLabel = displayLabel.replace('Option B — ', '');
                  } else if (displayLabel.startsWith('Option C — ')) {
                    displayLabel = displayLabel.replace('Option C — ', '');
                  } else if (displayLabel.startsWith('Option A - ')) {
                    displayLabel = displayLabel.replace('Option A - ', '');
                  } else if (displayLabel.startsWith('Option B - ')) {
                    displayLabel = displayLabel.replace('Option B - ', '');
                  } else if (displayLabel.startsWith('Option C - ')) {
                    displayLabel = displayLabel.replace('Option C - ', '');
                  }
                  
                  // Shorten label for dropdown - keep it very short to prevent overflow
                  const maxLength = 15; // Reduced for better mobile compatibility
                  const truncatedLabel = displayLabel.length > maxLength 
                    ? displayLabel.substring(0, maxLength) + '...' 
                    : displayLabel;
                  
                  return (
                    <option key={option.id} value={option.id} className="bg-gray-900">
                      {truncatedLabel} - CHF {option.price.toFixed(0)}
                    </option>
                  );
                })}
              </select>
              <FiChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>
            {selectedOption && (
              <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-2 text-xs text-gray-300">
                {selectedOption.description}
              </div>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {paymentBadges(currentOffer, selectedOption)}
        </div>

        <button
          onClick={() => openPayment(currentOffer)}
          className="w-full bg-gradient-to-r from-[#D91CD2] to-[#7000FF] text-white font-semibold py-2 rounded-lg shadow-lg hover:opacity-90 transition text-sm"
          disabled={!user}
        >
          {user ? currentOffer.buttonLabel : t('signIn')}
        </button>
      </div>
    );
  }, [currentOffer, isLoadingOffers, selectedOptions, t, user, activeTab, getSelectedOption, paymentBadges, openPayment, offerBackgrounds]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999]"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto border border-gray-800 shadow-2xl relative flex flex-col"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#D91CD2 #1F2937'
                }}
              >
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700 transition-colors"
                >
                  <FiX className="text-white" size={20} />
                </button>

                <div className="relative h-24 sm:h-28 bg-gradient-to-r from-[#D91CD2] to-[#7000FF] overflow-hidden flex-shrink-0">
                  <div className="absolute inset-0 opacity-20">
                    <Image
                      src="https://images.unsplash.com/photo-1594125674956-61a9b49c8ecc?q=80&w=1974&auto=format&fit=crop"
                      alt="Dance"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="relative h-full flex items-center justify-center text-center px-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring' }}
                    >
                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-0.5">
                        💃 {t('Ready to Dance?')}
                      </h2>
                      <p className="text-white/90 text-xs sm:text-sm">
                        {t('Explore tailor-made offers and jump back into class.')}
                      </p>
                    </motion.div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  {/* Tab Navigation - Always Visible - Responsive with max 3 per row */}
                  {!isLoadingOffers && visibleOffers.length > 0 && (
                    <div className="border-b border-gray-800 bg-gray-900/50 px-2 sm:px-4 flex-shrink-0">
                      <div className="grid grid-cols-3 gap-1 sm:flex sm:flex-wrap">
                        {visibleOffers.map((offer, index) => {
                          // Use title directly from database - no hardcoded overrides
                          const displayName = offer.title || '';
                          
                          return (
                            <button
                              key={offer.id}
                              onClick={() => {
                                setActiveTab(index);
                                // Scroll to top of content when switching tabs
                                const contentArea = document.querySelector('[data-offer-content]');
                                if (contentArea) {
                                  contentArea.scrollTop = 0;
                                }
                              }}
                              className={`flex-1 min-w-0 px-2 sm:px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap text-center sm:text-left ${
                                activeTab === index
                                  ? 'border-b-2 border-[#D91CD2] text-[#D91CD2] bg-gray-800/50'
                                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
                              }`}
                            >
                              <span className="mr-1">{offer.emoji || '🎯'}</span>
                              <span className="hidden sm:inline truncate">{displayName}</span>
                              <span className="sm:hidden truncate text-[10px]">{displayName.split(' ')[0] || displayName.substring(0, 8)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && !visibleOffers.length && (
                    <div className="bg-yellow-500/10 border border-yellow-500/40 text-yellow-200 rounded-lg p-2 text-center text-xs mx-4 mt-4">
                      {error}
                    </div>
                  )}

                  {/* Offer Content */}
                  <div 
                    data-offer-content
                    className="flex-1 p-3 sm:p-4 w-full max-w-full min-w-0"
                  >
                    {offersContent}
                  </div>

                  {/* Footer Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row gap-2 flex-shrink-0 p-3 sm:p-4 border-t border-gray-800 bg-gray-900/30"
                  >
                    <Link
                      href="/courses"
                      onClick={onClose}
                      className="flex-1 bg-gradient-to-r from-[#D91CD2] to-[#7000FF] text-white px-3 py-2 rounded-lg font-semibold text-center hover:opacity-90 transition-opacity flex items-center justify-center shadow-lg text-xs sm:text-sm"
                    >
                      {t('View all courses')} <FiArrowRight className="ml-1.5" size={14} />
                    </Link>
                    <button
                      onClick={onClose}
                      className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors text-xs sm:text-sm"
                    >
                      {t('Not Now')}
                    </button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Discount Card Scanner - Only for second offer with discount option */}
      {showDiscountCardScanner && user && activePurchase && (
        <DiscountCardScanner
          onValidation={handleDiscountCardValidation}
          onClose={() => {
            setShowDiscountCardScanner(false);
            setActivePurchase(null);
            setSelectedDiscountCardCode(undefined);
          }}
          customerId={user.id}
          customerName={`${user.firstName} ${user.lastName}`}
          coachId={activePurchase.offer.coachId}
          orderAmount={activePurchase.amount}
        />
      )}

      {activePurchase && user && (
        <PaymentHandlerWithCredits
          isOpen={showPayment}
          onClose={() => {
            closePayment();
            // Reopen popup if payment is cancelled
            if (isOpen) {
              setTimeout(() => {
                // Popup will remain open since isOpen is still true
              }, 100);
            }
          }}
          onSuccess={handleOfferPaymentSuccess}
          amount={activePurchase.amount}
          title={activePurchase.offer.title}
          description={activePurchase.option?.description || activePurchase.offer.description}
          userId={user.id}
          transactionType="course"
          businessId={activePurchase.offer.coachId}
          coachId={activePurchase.offer.coachId}
          allowedPaymentMethods={undefined}
          preAppliedDiscountCardCode={selectedDiscountCardCode}
        />
      )}
    </>
  );
}

