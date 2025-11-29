'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiDownload,
  FiShare2,
  FiEye,
  FiCalendar,
  FiDollarSign,
  FiCreditCard,
  FiClock,
  FiCheckCircle,
  FiX,
  FiCode,
  FiCopy,
  FiFilter
} from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import Card from '@/components/Card';
import { useTranslation } from 'react-i18next';
import { GiftCard, GiftCardTransaction } from '@/types';
import Image from 'next/image';
import QRCode from 'qrcode';

interface GiftCardManagementProps {
  className?: string;
  userType: 'seller' | 'coach';
}

export default function GiftCardManagement({ className = '', userType }: GiftCardManagementProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [transactions, setTransactions] = useState<GiftCardTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Form state
  const [cardForm, setCardForm] = useState({
    amount: '',
    description: '',
    expirationDays: '365',
    expirationMethod: 'preset' as 'preset' | 'custom',
    customExpirationDate: '',
    customTimeUnit: 'days' as 'hours' | 'days' | 'weeks' | 'months',
    customTimeValue: '1',
    sendViaEmail: false,
    recipientEmail: ''
  });

  const [generatingQR, setGeneratingQR] = useState(false);

  const statusFilters = [
    { value: 'all', label: t('All Cards') },
    { value: 'active', label: t('Active') },
    { value: 'used', label: t('Used') },
    { value: 'expired', label: t('Expired') }
  ];

  useEffect(() => {
    if (user) {
      loadGiftCards();
      loadTransactions();
    }
  }, [user]);

  const loadGiftCards = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/gift-cards?issuerId=${user.id}&issuerType=${userType}`);
      if (response.ok) {
        const data = await response.json();
        setGiftCards(data.giftCards || []);
      }
    } catch (error) {
      console.error('Error loading gift cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/gift-cards/transactions?issuerId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error loading gift card transactions:', error);
    }
  };

  const generateQRCode = async (cardCode: string): Promise<string> => {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(cardCode, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  };

  const generateCardCode = (): string => {
    const timestamp = Date.now().toString();
    const randomPart = Math.random().toString(36).substring(2, 15);
    const userPart = user?.id.substring(0, 8) || 'unknown';
    return `${userType.toUpperCase()}-${userPart}-${timestamp}-${randomPart}`.toUpperCase();
  };

  const handleCreateCard = async () => {
    if (!user || !cardForm.amount) return;

    setGeneratingQR(true);
    try {
      const cardCode = generateCardCode();
      const qrCodeImage = await generateQRCode(cardCode);

      // Calculate expiration date based on method
      let expirationDate = new Date();

      if (cardForm.expirationMethod === 'custom') {
        if (cardForm.customExpirationDate) {
          // Use exact date
          expirationDate = new Date(cardForm.customExpirationDate);
        } else {
          // Use custom time unit and value
          const timeValue = parseInt(cardForm.customTimeValue);
          switch (cardForm.customTimeUnit) {
            case 'hours':
              expirationDate.setHours(expirationDate.getHours() + timeValue);
              break;
            case 'days':
              expirationDate.setDate(expirationDate.getDate() + timeValue);
              break;
            case 'weeks':
              expirationDate.setDate(expirationDate.getDate() + (timeValue * 7));
              break;
            case 'months':
              expirationDate.setMonth(expirationDate.getMonth() + timeValue);
              break;
          }
        }
      } else {
        // Use preset days
        expirationDate.setDate(expirationDate.getDate() + parseInt(cardForm.expirationDays));
      }

      const cardData = {
        issuerId: user.id,
        issuerType: userType,
        issuerName: `${user.firstName} ${user.lastName}`,
        businessName: userType === 'seller' ? (user as any).businessName || `${user.firstName} ${user.lastName}` : undefined,
        cardCode,
        qrCodeImage,
        amount: parseFloat(cardForm.amount),
        currency: 'CHF',
        description: cardForm.description,
        expirationDate: expirationDate.toISOString(),
        remainingAmount: parseFloat(cardForm.amount)
      };

      const response = await fetch('/api/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData)
      });

      if (response.ok) {
        await loadGiftCards();
        setShowCreateModal(false);
        setCardForm({
          amount: '',
          description: '',
          expirationDays: '365',
          expirationMethod: 'preset',
          customExpirationDate: '',
          customTimeUnit: 'days',
          customTimeValue: '1',
          sendViaEmail: false,
          recipientEmail: ''
        });
      }
    } catch (error) {
      console.error('Error creating gift card:', error);
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleDeactivateCard = async (cardId: string) => {
    if (!confirm(t('Are you sure you want to deactivate this gift card?'))) return;

    try {
      const response = await fetch(`/api/gift-cards/${cardId}/deactivate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issuerId: user?.id })
      });

      if (response.ok) {
        await loadGiftCards();
      }
    } catch (error) {
      console.error('Error deactivating gift card:', error);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm(t('Do you really want to permanently delete this card?'))) return;

    try {
      const response = await fetch(`/api/gift-cards/${cardId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issuerId: user?.id })
      });

      if (response.ok) {
        await loadGiftCards();
      } else {
        const errorData = await response.json();
        alert(t('Error deleting gift card: {{message}}', { message: errorData.message || 'Unknown error' }));
      }
    } catch (error) {
      console.error('Error deleting gift card:', error);
      alert(t('Error deleting gift card. Please try again.'));
    }
  };

  const downloadQRCode = (card: GiftCard) => {
    const link = document.createElement('a');
    link.href = card.qrCodeImage;
    link.download = `gift-card-qr-${card.cardCode}.png`;
    link.click();
  };

  const downloadCompleteCard = (card: GiftCard) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for card (standard credit card ratio 3.375:2.125)
    canvas.width = 540;
    canvas.height = 340;

    // Create gradient background using site colors
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#D91CD2'); // Primary site color
    gradient.addColorStop(0.5, '#7B1FA2'); // Purple variant
    gradient.addColorStop(1, '#1f2937'); // Dark gray
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add elegant border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

    // Inner border for premium look
    ctx.strokeStyle = '#E91E63';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    // Title with localized text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.textAlign = 'center';
    const giftCardTitle = t('🎁 AFROBOOST GIFT CARD');
    ctx.fillText(giftCardTitle, canvas.width / 2, 45);

    // Amount with enhanced styling
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#D91CD2';
    ctx.lineWidth = 2;
    ctx.strokeText(`${card.amount} ${card.currency}`, canvas.width / 2, 90);
    ctx.fillText(`${card.amount} ${card.currency}`, canvas.width / 2, 90);

    // Add QR code with proper positioning
    const qrImg = document.createElement('img');
    qrImg.onload = () => {
      // QR code positioned in bottom left
      ctx.drawImage(qrImg, 25, 200, 100, 100);

      // Card details on the right side with better layout
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial, sans-serif';
      ctx.textAlign = 'left';

      let yPos = 130;
      const leftMargin = 25; // Moved further left to give more space
      const rightMargin = 40; // Reduced right margin
      const maxWidth = canvas.width - rightMargin - leftMargin;

      // Card code with localized label and text wrapping
      ctx.font = 'bold 16px Arial, sans-serif'; // Slightly smaller font
      const codeText = `${t('Code')}: ${card.cardCode}`;
      const codeMetrics = ctx.measureText(codeText);

      // If code text is too long, wrap it to multiple lines
      if (codeMetrics.width > maxWidth) {
        const codeLabel = `${t('Code')}:`;
        ctx.fillText(codeLabel, leftMargin, yPos);
        yPos += 20;

        // Split the card code if it's still too long
        const code = card.cardCode;
        const codeFont = '14px Arial, sans-serif';
        ctx.font = codeFont;

        let codeLine = '';
        let codeChars = code.split('');

        for (let i = 0; i < codeChars.length; i++) {
          const testLine = codeLine + codeChars[i];
          const testMetrics = ctx.measureText(testLine);

          if (testMetrics.width > maxWidth && codeLine !== '') {
            ctx.fillText(codeLine, leftMargin, yPos);
            codeLine = codeChars[i];
            yPos += 18;
          } else {
            codeLine = testLine;
          }
        }

        if (codeLine) {
          ctx.fillText(codeLine, leftMargin, yPos);
          yPos += 25;
        }
      } else {
        ctx.fillText(codeText, leftMargin, yPos);
        yPos += 30;
      }

      // Description with proper text wrapping
      if (card.description && card.description.trim()) {
        ctx.font = '14px Arial, sans-serif';
        const words = card.description.split(' ');
        let line = '';
        let lineHeight = 18;

        for (let word of words) {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line.trim(), leftMargin, yPos);
            line = word + ' ';
            yPos += lineHeight;
            // Prevent text overflow
            if (yPos > 190) break;
          } else {
            line = testLine;
          }
        }
        if (line.trim() && yPos <= 190) {
          ctx.fillText(line.trim(), leftMargin, yPos);
          yPos += 25;
        }
      }

      // Expiration date with localized label
      ctx.font = '14px Arial, sans-serif';
      if (yPos <= 190) {
        ctx.fillText(`${t('Expires')}: ${formatDate(card.expirationDate)}`, leftMargin, yPos);
        yPos += 20;
      }

      // Status with localized text
      if (yPos <= 190) {
        if (card.isUsed) {
          ctx.fillStyle = '#ffcccb'; // Light red for used cards
          ctx.fillText(`${t('Used by')}: ${card.usedByName || 'Unknown'}`, leftMargin, yPos);
          if (card.remainingAmount && yPos + 20 <= 190) {
            yPos += 20;
            ctx.fillText(`${t('Remaining')}: ${card.remainingAmount} ${card.currency}`, leftMargin, yPos);
          }
        } else {
          ctx.fillStyle = '#90EE90'; // Light green for active cards
          ctx.fillText(`${t('Status')}: ${t('Active & Ready to Use')}`, leftMargin, yPos);
        }
      }

      // QR Code label with localized text
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('Scan QR Code'), 75, 315);

      // Footer with site branding
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AfroBoost - Dance Your Way to Success', canvas.width / 2, canvas.height - 15);

      // Download the complete card
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `afroboost-gift-card-${card.cardCode}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };
    qrImg.src = card.qrCodeImage;
  };

  const shareQRCode = async (card: GiftCard) => {
    if (navigator.share) {
      try {
        // Convert base64 to blob for sharing
        const response = await fetch(card.qrCodeImage);
        const blob = await response.blob();
        const file = new File([blob], `gift-card-${card.cardCode}.png`, { type: 'image/png' });

        await navigator.share({
          title: t('Gift Card'),
          text: t('Here is your gift card worth {{amount}} {{currency}}', {
            amount: card.amount,
            currency: card.currency
          }),
          files: [file]
        });
      } catch (error) {
        console.error('Error sharing:', error);
        // Fallback to copying code
        copyCardCode(card.cardCode);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      copyCardCode(card.cardCode);
    }
  };

  const shareFullCard = async (card: GiftCard) => {
    const cardDetails = `🎁 GIFT CARD 🎁
💰 Value: ${card.amount} ${card.currency}
📅 Expires: ${formatDate(card.expirationDate)}
🎟️ Code: ${card.cardCode}
📖 ${card.description || 'Gift card for AfroBoost services'}
${card.isUsed ? `✅ Used by: ${card.usedByName || 'Unknown'}` : '🟢 Status: Active'}
${card.isUsed ? `📅 Used on: ${formatDate(card.usedAt)}` : ''}
${card.isUsed && card.remainingAmount ? `💳 Remaining: ${card.remainingAmount} ${card.currency}` : ''}`;

    if (navigator.share) {
      try {
        // Try to share with QR code if available
        if (card.qrCodeImage) {
          const response = await fetch(card.qrCodeImage);
          const blob = await response.blob();
          const file = new File([blob], `gift-card-${card.cardCode}.png`, { type: 'image/png' });

          await navigator.share({
            title: t('Gift Card - {{amount}} {{currency}}', { amount: card.amount, currency: card.currency }),
            text: cardDetails,
            files: [file]
          });
        } else {
          await navigator.share({
            title: t('Gift Card - {{amount}} {{currency}}', { amount: card.amount, currency: card.currency }),
            text: cardDetails
          });
        }
      } catch (error) {
        console.error('Error sharing full card:', error);
        // Fallback to copying details
        navigator.clipboard.writeText(cardDetails);
        alert(t('Card details copied to clipboard'));
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(cardDetails);
      alert(t('Card details copied to clipboard'));
    }
  };

  const copyCardCode = (cardCode: string) => {
    navigator.clipboard.writeText(cardCode);
    alert(t('Gift card code copied to clipboard'));
  };

  const formatDate = (date: any) => {
    try {
      if (!date) return 'N/A';
      if (date && typeof date === 'object' && date.seconds) {
        return new Date(date.seconds * 1000).toLocaleDateString();
      }
      return new Date(date).toLocaleDateString();
    } catch (error) {
      return 'N/A';
    }
  };

  const getDateValue = (date: any): Date => {
    try {
      if (!date) return new Date();
      if (date && typeof date === 'object' && date.seconds) {
        return new Date(date.seconds * 1000);
      }
      return new Date(date);
    } catch (error) {
      return new Date();
    }
  };

  const getStatusColor = (card: GiftCard) => {
    if (card.isUsed) return 'text-green-400 bg-green-500/20';
    if (!card.isActive) return 'text-red-400 bg-red-500/20';
    if (getDateValue(card.expirationDate) < new Date()) return 'text-orange-400 bg-orange-500/20';
    return 'text-blue-400 bg-blue-500/20';
  };

  const getStatusText = (card: GiftCard) => {
    if (card.isUsed) return t('Used');
    if (!card.isActive) return t('Deactivated');
    if (getDateValue(card.expirationDate) < new Date()) return t('Expired');
    return t('Active');
  };

  const filteredCards = giftCards.filter(card => {
    switch (statusFilter) {
      case 'active':
        return card.isActive && !card.isUsed && getDateValue(card.expirationDate) > new Date();
      case 'used':
        return card.isUsed;
      case 'expired':
        return getDateValue(card.expirationDate) < new Date();
      default:
        return true;
    }
  });

  if (!user) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('Gift Cards Management')}</h2>
          <p className="text-gray-400 mt-1">
            {t('Create and manage gift cards for your {{type}}', { type: userType === 'seller' ? t('products') : t('courses') })}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center space-x-2"
        >
          <FiPlus size={18} />
          <span>{t('Create Gift Card')}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === filter.value
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Gift Cards Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">{t('Loading gift cards...')}</p>
        </div>
      ) : filteredCards.length > 0 ? (
        <div className="space-y-4">
          {/* Desktop/Tablet: Grid Layout */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCards.map((card) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 relative">
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(card)}`}>
                      {getStatusText(card)}
                    </span>
                  </div>

                  {/* QR Code */}
                  <div className="text-center mb-4">
                    <div className="w-32 h-32 mx-auto mb-3 bg-white rounded-lg p-2 flex items-center justify-center">
                      <Image
                        src={card.qrCodeImage}
                        alt={`QR Code for ${card.cardCode}`}
                        width={120}
                        height={120}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-gray-400 text-sm font-mono">{card.cardCode}</p>
                  </div>

                  {/* Card Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">{t('Amount')}:</span>
                      <span className="text-xl font-bold text-purple-400">
                        {card.amount} {card.currency}
                      </span>
                    </div>

                    {card.isUsed && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">{t('Remaining')}:</span>
                        <span className="text-lg font-semibold text-green-400">
                          {card.remainingAmount} {card.currency}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">{t('Expires')}:</span>
                      <span className="text-white text-sm">{formatDate(card.expirationDate)}</span>
                    </div>

                    {card.description && (
                      <div>
                        <span className="text-gray-400 text-sm">{t('Description')}:</span>
                        <p className="text-white text-sm mt-1 break-words overflow-hidden leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    )}

                    {card.isUsed && (
                      <div className="pt-3 border-t border-gray-700 space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="text-gray-400 text-sm flex-shrink-0">{t('Used by')}:</span>
                          <span className="text-white text-sm text-right break-words ml-2 min-w-0">{card.usedByName || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">{t('Used on')}:</span>
                          <span className="text-white text-sm">{formatDate(card.usedAt)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 pt-4 border-t border-gray-700 space-y-3 sm:space-y-0">
                    <div className="flex items-center justify-center sm:justify-start space-x-2">
                      <button
                        onClick={() => downloadQRCode(card)}
                        className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-500/10 transition-colors"
                        title={t('Download QR Code')}
                      >
                        <FiDownload size={18} />
                      </button>
                      <button
                        onClick={() => shareQRCode(card)}
                        className="text-green-400 hover:text-green-300 p-2 rounded-lg hover:bg-green-500/10 transition-colors"
                        title={t('Share QR Code')}
                      >
                        <FiShare2 size={18} />
                      </button>
                      <button
                        onClick={() => downloadCompleteCard(card)}
                        className="text-purple-400 hover:text-purple-300 p-2 rounded-lg hover:bg-purple-500/10 transition-colors"
                        title={t('Download Complete Card')}
                      >
                        <FiCreditCard size={18} />
                      </button>
                      <button
                        onClick={() => copyCardCode(card.cardCode)}
                        className="text-yellow-400 hover:text-yellow-300 p-2 rounded-lg hover:bg-yellow-500/10 transition-colors"
                        title={t('Copy Code')}
                      >
                        <FiCopy size={18} />
                      </button>
                    </div>

                    <div className="flex items-center justify-center sm:justify-end space-x-2">
                      {card.isActive && !card.isUsed && (
                        <button
                          onClick={() => handleDeactivateCard(card.id)}
                          className="text-orange-400 hover:text-orange-300 p-2 rounded-lg hover:bg-orange-500/10 transition-colors"
                          title={t('Deactivate')}
                        >
                          <FiX size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        title={t('Delete Permanently')}
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Mobile: Horizontal Scrolling */}
          <div className="md:hidden">
            <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
              {filteredCards.map((card) => (
                <motion.div
                  key={`mobile-${card.id}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex-shrink-0 w-80"
                >
                  <Card className="p-6 relative h-full">
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(card)}`}>
                        {getStatusText(card)}
                      </span>
                    </div>

                    {/* QR Code */}
                    <div className="text-center mb-6">
                      <div className="w-32 h-32 bg-white rounded-lg mx-auto mb-3 p-2">
                        <Image
                          src={card.qrCodeImage}
                          alt={`QR Code for ${card.cardCode}`}
                          width={120}
                          height={120}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <p className="text-gray-400 text-sm font-mono">{card.cardCode}</p>
                    </div>

                    {/* Card Details */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">{t('Amount')}:</span>
                        <span className="text-xl font-bold text-purple-400">
                          {card.amount} {card.currency}
                        </span>
                      </div>

                      {card.isUsed && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">{t('Remaining')}:</span>
                          <span className="text-lg font-semibold text-green-400">
                            {card.remainingAmount} {card.currency}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">{t('Expires')}:</span>
                        <span className="text-white text-sm">{formatDate(card.expirationDate)}</span>
                      </div>

                      {card.description && (
                        <div>
                          <span className="text-gray-400 text-sm">{t('Description')}:</span>
                          <p className="text-white text-sm mt-1">{card.description}</p>
                        </div>
                      )}

                      {card.isUsed && (
                        <div className="pt-3 border-t border-gray-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">{t('Used by')}:</span>
                            <span className="text-white text-sm">{card.usedByName || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">{t('Used on')}:</span>
                            <span className="text-white text-sm">{formatDate(card.usedAt)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-700">
                      <button
                        onClick={() => downloadQRCode(card)}
                        className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-500/10 transition-colors"
                        title={t('Download QR Code Only')}
                      >
                        <FiDownload size={18} />
                      </button>
                      <button
                        onClick={() => downloadCompleteCard(card)}
                        className="text-purple-400 hover:text-purple-300 p-2 rounded-lg hover:bg-purple-500/10 transition-colors"
                        title={t('Download Complete Card')}
                      >
                        <FiCreditCard size={18} />
                      </button>
                      <button
                        onClick={() => shareQRCode(card)}
                        className="text-green-400 hover:text-green-300 p-2 rounded-lg hover:bg-green-500/10 transition-colors"
                        title={t('Share QR Code')}
                      >
                        <FiShare2 size={18} />
                      </button>
                      <button
                        onClick={() => copyCardCode(card.cardCode)}
                        className="text-yellow-400 hover:text-yellow-300 p-2 rounded-lg hover:bg-yellow-500/10 transition-colors"
                        title={t('Copy Code')}
                      >
                        <FiCopy size={18} />
                      </button>
                      {card.isActive && !card.isUsed && (
                        <button
                          onClick={() => handleDeactivateCard(card.id)}
                          className="text-orange-400 hover:text-orange-300 p-2 rounded-lg hover:bg-orange-500/10 transition-colors"
                          title={t('Deactivate')}
                        >
                          <FiX size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        title={t('Delete Permanently')}
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Mobile scroll hint */}
            {filteredCards.length > 1 && (
              <div className="text-center mt-2">
                <p className="text-xs text-gray-500">{t('Swipe left to see more cards')}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <FiCode className="text-6xl text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {statusFilter === 'all' ? t('No gift cards yet') : t('No gift cards with this status')}
          </h3>
          <p className="text-gray-400 mb-6">
            {statusFilter === 'all'
              ? t('Create your first gift card to start selling gift cards to your customers.')
              : t('Try selecting a different status filter.')
            }
          </p>
          {statusFilter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
            >
              {t('Create Gift Card')}
            </button>
          )}
        </div>
      )}

      {/* Create Gift Card Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">{t('Create Gift Card')}</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex space-x-2 mb-6 border-b border-gray-700">
                <button
                  onClick={() => setCardForm(prev => ({ ...prev, sendViaEmail: false, recipientEmail: '' }))}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${!cardForm.sendViaEmail
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                >
                  {t('Create Card')}
                </button>
                <button
                  onClick={() => setCardForm(prev => ({ ...prev, sendViaEmail: true }))}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${cardForm.sendViaEmail
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                >
                  {t('Create & Send via Email')}
                </button>
              </div>

              <div className="space-y-4">
                {/* Email field - only shown in second tab */}
                {cardForm.sendViaEmail && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('Recipient Email')} *
                    </label>
                    <input
                      type="email"
                      value={cardForm.recipientEmail || ''}
                      onChange={(e) => setCardForm(prev => ({ ...prev, recipientEmail: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="recipient@example.com"
                      required={cardForm.sendViaEmail}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('The gift card will be sent to this email address')}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Amount')} (CHF) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={cardForm.amount}
                    onChange={(e) => setCardForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="50.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Description')} ({t('optional')})
                  </label>
                  <textarea
                    value={cardForm.description}
                    onChange={(e) => setCardForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                    placeholder={t('Gift card description...')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Expiration Settings')} *
                  </label>

                  {/* Expiration Method Selection */}
                  <div className="flex space-x-4 mb-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="preset"
                        checked={cardForm.expirationMethod === 'preset'}
                        onChange={(e) => setCardForm(prev => ({ ...prev, expirationMethod: e.target.value as 'preset' | 'custom' }))}
                        className="mr-2 text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-white">{t('Preset Options')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="custom"
                        checked={cardForm.expirationMethod === 'custom'}
                        onChange={(e) => setCardForm(prev => ({ ...prev, expirationMethod: e.target.value as 'preset' | 'custom' }))}
                        className="mr-2 text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-white">{t('Custom Period')}</span>
                    </label>
                  </div>

                  {/* Preset Options */}
                  {cardForm.expirationMethod === 'preset' && (
                    <select
                      value={cardForm.expirationDays}
                      onChange={(e) => setCardForm(prev => ({ ...prev, expirationDays: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="1">1 {t('day')}</option>
                      <option value="3">3 {t('days')}</option>
                      <option value="7">1 {t('week')}</option>
                      <option value="14">2 {t('weeks')}</option>
                      <option value="30">30 {t('days')}</option>
                      <option value="60">60 {t('days')}</option>
                      <option value="90">90 {t('days')}</option>
                      <option value="180">180 {t('days')}</option>
                      <option value="365">1 {t('year')}</option>
                      <option value="730">2 {t('years')}</option>
                    </select>
                  )}

                  {/* Custom Options */}
                  {cardForm.expirationMethod === 'custom' && (
                    <div className="space-y-4">
                      {/* Custom Time Period */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          {t('Custom Time Period')}
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            min="1"
                            value={cardForm.customTimeValue}
                            onChange={(e) => setCardForm(prev => ({ ...prev, customTimeValue: e.target.value }))}
                            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="1"
                          />
                          <select
                            value={cardForm.customTimeUnit}
                            onChange={(e) => setCardForm(prev => ({ ...prev, customTimeUnit: e.target.value as 'hours' | 'days' | 'weeks' | 'months' }))}
                            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="hours">{t('Hours')}</option>
                            <option value="days">{t('Days')}</option>
                            <option value="weeks">{t('Weeks')}</option>
                            <option value="months">{t('Months')}</option>
                          </select>
                        </div>
                      </div>

                      {/* Or Exact Date */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          {t('Or Set Exact Expiration Date')}
                        </label>
                        <input
                          type="datetime-local"
                          value={cardForm.customExpirationDate}
                          onChange={(e) => setCardForm(prev => ({ ...prev, customExpirationDate: e.target.value }))}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min={new Date().toISOString().slice(0, 16)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {t('Leave empty to use the time period above')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  {t('Cancel')}
                </button>
                <button
                  onClick={handleCreateCard}
                  disabled={!cardForm.amount || generatingQR || (cardForm.sendViaEmail && !cardForm.recipientEmail)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {generatingQR ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t('Creating...')}</span>
                    </>
                  ) : (
                    <>
                      <FiCode size={18} />
                      <span>{cardForm.sendViaEmail ? t('Create & Send') : t('Create')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
