'use client';

import { useState, useEffect, useMemo, ReactElement } from 'react';
import { motion } from 'framer-motion';
import { FiCreditCard, FiGift, FiPercent, FiChevronDown, FiCheckCircle, FiCopy, FiShare2, FiCheck } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { offerService, buildDefaultOffers, userSubscriptionService, offerPurchaseService } from '@/lib/database';
import { Offer, OfferOption, UserSubscription } from '@/types';
import PaymentHandlerWithCredits from '@/components/PaymentHandlerWithCredits';
import DiscountCardScanner from '@/components/DiscountCardScanner';
import Toast from '@/components/Toast';

export default function OffersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activePurchase, setActivePurchase] = useState<{ offer: Offer; option?: OfferOption; amount: number } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showDiscountCardScanner, setShowDiscountCardScanner] = useState(false);
  const [selectedDiscountCardCode, setSelectedDiscountCardCode] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [copiedOfferId, setCopiedOfferId] = useState<string | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [userPurchases, setUserPurchases] = useState<Array<{ offerId: string; status: string }>>([]);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    show: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    loadOffers();
    if (user) {
      loadUserSubscription();
      loadUserPurchases();
    }
  }, [user]);

  const loadOffers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const activeOffers = await offerService.getActiveOffers(true);
      
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
      } else {
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
      }
    } catch (err) {
      console.error('Failed to load offers', err);
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
      setError(t('failedToLoadOffers') || 'Failed to load offers');
    } finally {
      setIsLoading(false);
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

  const loadUserSubscription = async () => {
    if (!user?.id) return;
    try {
      const subscription = await userSubscriptionService.getActiveByUserId(user.id);
      setUserSubscription(subscription);
    } catch (error) {
      console.error('Error loading user subscription:', error);
    }
  };

  const loadUserPurchases = async () => {
    if (!user?.id) return;
    try {
      const purchases = await offerPurchaseService.getByUser(user.id);
      setUserPurchases(purchases.map(p => ({ offerId: p.offerId, status: p.status })));
    } catch (error) {
      console.error('Error loading user purchases:', error);
    }
  };

  const mapAllowedPaymentMethods = (offer: Offer, option?: OfferOption) => {
    const methods = getPaymentMethods(offer, option);
    const mapped: Array<'stripe' | 'paypal' | 'twint' | 'gift-card' | 'discount-card'> = [];
    if (methods.includes('credit_card')) mapped.push('stripe');
    if (methods.includes('paypal')) mapped.push('paypal');
    if (methods.includes('twint')) mapped.push('twint');
    if (methods.includes('gift_card')) mapped.push('gift-card');
    if (methods.includes('discount_card')) mapped.push('discount-card');
    return mapped;
  };

  const openPayment = (offer: Offer) => {
    if (!user) {
      router.push('/login');
      return;
    }
    const option = getSelectedOption(offer);
    const amount = option ? option.price : offer.price;
    
    // Check if it's the second offer (subscription) and selected option contains "with discount"
    const offerIndex = offers.findIndex(o => o.id === offer.id);
    const isSecondOffer = offerIndex === 1; // Second offer (index 1)
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
      setTimeout(() => {
        setShowDiscountCardScanner(true);
      }, 300);
    } else {
      // Normal flow - go directly to payment
      setActivePurchase({ offer, option, amount });
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
    }
  };

  const getOfferUrl = (offer: Offer) => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    // Create a URL with offer ID as query parameter
    return `${baseUrl}/offers?offer=${offer.id}`;
  };

  const handleCopyLink = async (offer: Offer) => {
    try {
      const url = getOfferUrl(offer);
      await navigator.clipboard.writeText(url);
      setCopiedOfferId(offer.id);
      setTimeout(() => {
        setCopiedOfferId(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      setError(t('Failed to copy link') || 'Failed to copy link');
    }
  };

  const handleShareWhatsApp = (offer: Offer) => {
    const url = getOfferUrl(offer);
    const shareText = `${offer.title} - ${offer.description || ''}\n\n${t('Starting at')} CHF ${(getSelectedOption(offer)?.price || offer.price).toFixed(0)}\n\n${t('Check out this amazing offer!')}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleOfferPaymentSuccess = async (paymentId: string, method: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card') => {
    if (!activePurchase || !user) return;

    try {
      const { offer, option, amount } = activePurchase;
      const amountPaid = method === 'gift-card' || method === 'discount-card' ? 0 : amount;

      // Import offerPurchaseService here to avoid circular dependencies
      const { offerPurchaseService, notificationService, transactionService } = await import('@/lib/database');

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
        status: 'completed'
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

      // Reload user purchases to update UI
      await loadUserPurchases();
      await loadUserSubscription();

      // Show success message
      setToast({
        show: true,
        message: t('Payment successful! Your offer has been confirmed.') || 'Payment successful! Your offer has been confirmed.',
        type: 'success'
      });

      closePayment();
      
      // Wait a bit before redirecting to show the success message
      setTimeout(() => {
        router.push('/courses');
      }, 2000);
    } catch (err) {
      console.error('Error handling offer payment', err);
      setError(t('failedToCompletePurchase') || 'Failed to complete the purchase, please try again.');
      setToast({
        show: true,
        message: t('failedToCompletePurchase') || 'Failed to complete the purchase, please try again.',
        type: 'error'
      });
    }
  };

  // Check if offer matches user's active subscription or has been purchased
  const isOfferActive = (offer: Offer): boolean => {
    if (!user) return false;
    
    // Check if user has purchased this offer
    const purchase = userPurchases.find(p => p.offerId === offer.id && p.status === 'completed');
    if (purchase) return true;
    
    // Check if user has active subscription matching this offer
    if (userSubscription) {
      // Compare subscription plan name with offer title (case-insensitive, partial match)
      const subscriptionName = userSubscription.planName?.toLowerCase() || '';
      const offerTitle = offer.title.toLowerCase();
      
      // Check if subscription name contains offer title or vice versa
      if (subscriptionName.includes(offerTitle) || offerTitle.includes(subscriptionName)) {
        return true;
      }
      
      // Also check if offer title contains subscription-related keywords
      if (offerTitle.includes('subscription') && subscriptionName.includes('subscription')) {
        return true;
      }
    }
    
    return false;
  };

  // Different background gradients for each offer
  const offerBackgrounds = [
    'bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-purple-800/30', // Discovery Class
    'bg-gradient-to-br from-blue-900/30 via-indigo-900/20 to-blue-800/30',   // Subscription
    'bg-gradient-to-br from-orange-900/30 via-red-900/20 to-orange-800/30'   // Pulse X10
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-6">
            {t('Offers', 'Offers')}
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {t('Explore our special offers and subscription plans designed to fit your dance journey.')}
          </p>
          
          {/* Active Subscription Badge */}
          {user && userSubscription && userSubscription.status === 'active' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 inline-block"
            >
              <div className="bg-green-500/20 border border-green-500 rounded-lg px-6 py-3">
                <div className="flex items-center justify-center space-x-2">
                  <FiCheckCircle className="text-green-400" size={20} />
                  <div className="text-left">
                    <p className="text-green-400 font-medium text-sm">{t('Active Subscription')}</p>
                    <p className="text-gray-300 text-xs">{userSubscription.planName}</p>
                    {userSubscription.planType === 'session_pack' && userSubscription.remainingSessions !== undefined && (
                      <p className="text-green-400 text-xs mt-1">
                        {userSubscription.remainingSessions} {t('sessions left')}
                      </p>
                    )}
                    {userSubscription.planType === 'annual' && userSubscription.endDate && (
                      <p className="text-green-400 text-xs mt-1">
                        {t('Valid until')} {new Date(userSubscription.endDate instanceof Date ? userSubscription.endDate : (userSubscription.endDate as any).toDate()).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/40 text-yellow-200 rounded-lg p-4 text-center">
            {error}
          </div>
        )}

        {/* Offers Grid */}
        {offers.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-2xl font-semibold mb-4">{t('No offers available')}</h3>
            <p className="text-gray-400">{t('Please check back later')}</p>
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {offers.map((offer, index) => {
              const selectedOption = getSelectedOption(offer);
              const price = selectedOption ? selectedOption.price : offer.price;
              const activeOptions = offer.options?.filter(option => option.isActive !== false) || [];
              const bgClass = offerBackgrounds[index] || offerBackgrounds[0];
              const isActive = isOfferActive(offer);

              return (
                <motion.div
                  key={offer.id}
                  variants={item}
                  className={`${bgClass} ${isActive ? 'border-green-500/50 ring-2 ring-green-500/30' : 'border-gray-700/50'} rounded-xl p-6 space-y-4 shadow-inner hover:transform hover:scale-105 transition-all duration-300 relative`}
                >
                  {/* Active Badge */}
                  {isActive && (
                    <div className="absolute top-4 right-4 bg-green-500/20 border border-green-500 rounded-full px-3 py-1 flex items-center space-x-1.5 z-10">
                      <FiCheckCircle className="text-green-400" size={14} />
                      <span className="text-green-400 text-xs font-medium">{t('Activated') || 'Activated'}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider text-gray-400 flex items-center space-x-1 mb-1">
                          <span>{offer.emoji}</span>
                          <span>{t('Offer')}</span>
                        </p>
                        <h3 className="text-xl font-semibold text-white">{t(offer.title) || offer.title}</h3>
                        {offer.subtitle && <p className="text-gray-400 text-sm mt-1">{t(offer.subtitle) || offer.subtitle}</p>}
                      </div>
                      {!isActive && (
                        <div className="text-right ml-4">
                          <span className="text-xs text-gray-400">{t('Starting at')}</span>
                          <div className="text-3xl font-bold text-white">CHF {price.toFixed(0)}</div>
                        </div>
                      )}
                      {isActive && userSubscription && (
                        <div className="text-right ml-4">
                          <span className="text-xs text-green-400">{t('Active Subscription')}</span>
                          {userSubscription.planType === 'session_pack' && userSubscription.remainingSessions !== undefined && (
                            <div className="text-lg font-semibold text-green-400">{userSubscription.remainingSessions} {t('sessions left')}</div>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-gray-300 text-sm leading-relaxed">{t(offer.description) || offer.description}</p>

                    {offer.highlightItems?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {offer.highlightItems.map(item => (
                          <span key={item} className="text-xs bg-[#D91CD2]/10 text-[#D91CD2] px-2 py-0.5 rounded-full border border-[#D91CD2]/30">
                            {t(item) || item}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {activeOptions.length > 0 ? (
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-gray-400 block">
                          {t('Choose your option')}
                        </label>
                        <div className="relative">
                          <select
                            value={selectedOption?.id || ''}
                            onChange={(e) => handleOptionChange(offer.id, e.target.value)}
                            disabled={isActive}
                            className={`w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D91CD2] appearance-none pr-8 ${
                              isActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                            }`}
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
                              
                              return (
                                <option key={option.id} value={option.id} className="bg-gray-900">
                                  {displayLabel} - CHF {option.price.toFixed(0)}
                                </option>
                              );
                            })}
                          </select>
                          <FiChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                        </div>
                        {selectedOption && (
                          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-3 text-xs text-gray-300">
                            {selectedOption.description}
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-1.5">
                      {paymentBadges(offer, selectedOption)}
                    </div>

                    {/* Share Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyLink(offer)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                          copiedOfferId === offer.id
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                        title={t('Copy link') || 'Copy link'}
                      >
                        {copiedOfferId === offer.id ? (
                          <>
                            <FiCheck size={16} />
                            <span>{t('Copied!') || 'Copied!'}</span>
                          </>
                        ) : (
                          <>
                            <FiCopy size={16} />
                            <span>{t('Copy Link') || 'Copy Link'}</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleShareWhatsApp(offer)}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg font-medium text-sm transition-colors"
                        title={t('Share on WhatsApp') || 'Share on WhatsApp'}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        <span>{t('WhatsApp') || 'WhatsApp'}</span>
                      </button>
                    </div>

                    {!isActive && (
                      <button
                        onClick={() => openPayment(offer)}
                        className="w-full bg-gradient-to-r from-[#D91CD2] to-[#7000FF] text-white font-semibold py-3 rounded-lg shadow-lg hover:opacity-90 transition text-sm"
                        disabled={!user}
                      >
                        {user ? offer.buttonLabel : t('signIn')}
                      </button>
                    )}
                    {isActive && (
                      <div className="w-full bg-green-500/20 border border-green-500 text-green-400 font-semibold py-3 rounded-lg text-center text-sm">
                        {t('You already have this subscription active') || 'You already have this subscription active'}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

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

      {/* Payment Modal */}
      {activePurchase && user && (
        <PaymentHandlerWithCredits
          isOpen={showPayment}
          onClose={closePayment}
          onSuccess={handleOfferPaymentSuccess}
          amount={activePurchase.amount}
          title={activePurchase.offer.title}
          description={activePurchase.option?.description || activePurchase.offer.description}
          userId={user.id}
          transactionType="course"
          businessId={activePurchase.offer.coachId}
          coachId={activePurchase.offer.coachId}
          // Don't restrict payment methods - show all configured methods for all offers
          preAppliedDiscountCardCode={selectedDiscountCardCode}
        />
      )}

      {/* Toast Notification */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
}

