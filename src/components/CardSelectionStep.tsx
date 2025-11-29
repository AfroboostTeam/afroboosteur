'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCamera, FiPercent, FiUpload } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import GiftCardScanner from './GiftCardScanner';
import DiscountCardScanner from './DiscountCardScanner';

interface CardSelectionStepProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: (giftCardCode?: string, discountCardCode?: string) => void;
  userId: string;
  coachId: string;
  courseId: string;
  amount: number;
  businessId?: string;
  orderId?: string;
  transactionType?: 'course' | 'product' | 'token';
}

export default function CardSelectionStep({
  isOpen,
  onClose,
  onNext,
  userId,
  coachId,
  courseId,
  amount,
  businessId,
  orderId,
  transactionType
}: CardSelectionStepProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showGiftCardScanner, setShowGiftCardScanner] = useState(false);
  const [showDiscountCardScanner, setShowDiscountCardScanner] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [discountCardCode, setDiscountCardCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleContinue = () => {
    onNext(giftCardCode || undefined, discountCardCode || undefined);
  };

  const handleGiftCardValidation = (result: { valid: boolean; amount: number; remainingAmount: number; cardCode: string; error?: string }) => {
    setShowGiftCardScanner(false);
    if (result.valid) {
      setGiftCardCode(result.cardCode);
      setErrorMessage('');
      // Automatically proceed to payment after successful gift card scan
      onNext(result.cardCode, discountCardCode || undefined);
    } else {
      setErrorMessage(result.error || 'Invalid gift card');
    }
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
    setShowDiscountCardScanner(false);
    if (result.valid) {
      setDiscountCardCode(result.cardCode);
      setErrorMessage('');
      // Automatically proceed to payment after successful discount card scan
      onNext(giftCardCode || undefined, result.cardCode);
    } else {
      setErrorMessage(result.error || 'Invalid discount card');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 rounded-xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-start p-4 sm:p-6 border-b border-gray-700 gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-white break-words">
                    {t('Step 1: Apply Gift or Discount Card')}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1 break-words">
                    {t('Scan or enter your gift card or discount code (optional)')}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white flex-shrink-0"
                >
                  <FiX size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {/* Error Message */}
                {errorMessage && (
                  <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                    <p className="text-red-500 text-sm">{errorMessage}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Gift Card Section */}
                  <button
                    onClick={() => {
                      setErrorMessage('');
                      setShowGiftCardScanner(true);
                    }}
                    className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 transition-all flex items-center space-x-4 text-left"
                  >
                    <div className="bg-[#D91CD2]/10 p-3 rounded-lg">
                      <FiCamera className="text-[#D91CD2]" size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">{t('Scan Gift Card')}</div>
                      <div className="text-sm text-gray-400">{t('Scan QR code or upload gift card image')}</div>
                    </div>
                  </button>

                  {/* Discount Card Section */}
                  <button
                    onClick={() => {
                      setErrorMessage('');
                      setShowDiscountCardScanner(true);
                    }}
                    className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 transition-all flex items-center space-x-4 text-left"
                  >
                    <div className="bg-[#7000FF]/10 p-3 rounded-lg">
                      <FiPercent className="text-[#7000FF]" size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">{t('Scan Discount Card')}</div>
                      <div className="text-sm text-gray-400">{t('Scan coach discount card for automatic discount')}</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-6 border-t border-gray-700">
                <button
                  onClick={handleContinue}
                  className="w-full bg-gradient-to-r from-[#D91CD2] to-[#7000FF] hover:from-[#D91CD2]/90 hover:to-[#7000FF]/90 text-white py-3 sm:py-4 rounded-lg font-semibold transition-all"
                >
                  {t("I don't have any cards - Continue to Payment")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gift Card Scanner Modal */}
      {showGiftCardScanner && user && (
        <GiftCardScanner
          onValidation={handleGiftCardValidation}
          onClose={() => setShowGiftCardScanner(false)}
          customerId={user.id}
          customerName={`${user.firstName} ${user.lastName}`}
          businessId={businessId}
          orderId={orderId}
          requestedAmount={amount}
          transactionType={transactionType}
        />
      )}

      {/* Discount Card Scanner Modal */}
      {showDiscountCardScanner && user && (
        <DiscountCardScanner
          onValidation={handleDiscountCardValidation}
          onClose={() => setShowDiscountCardScanner(false)}
          customerId={user.id}
          customerName={`${user.firstName} ${user.lastName}`}
          coachId={coachId}
          orderAmount={amount}
        />
      )}
    </>
  );
}

