'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import QRCode from 'qrcode';
import {
  FiPlus,
  FiPercent,
  FiCalendar,
  FiUser,
  FiEdit,
  FiTrash2,
  FiEye,
  FiCopy,
  FiDownload,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiShare2,
  FiCreditCard
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import SimplifiedDiscountCardModal from './SimplifiedDiscountCardModal';

interface DiscountCard {
  id: string;
  code: string; // Backend uses 'code', not 'cardCode'
  title: string;
  memberName?: string; // Mapped from userName or memberName
  memberEmail?: string; // Mapped from userEmail or memberEmail
  discountPercentage: number;
  expiryDate: string; // Mapped from expirationDate or expiryDate
  description: string;
  isActive: boolean;
  usageCount: number;
  usageLimit?: number; // Backend may use 'usageLimit' or 'maxUsage'
  createdAt: string; // Backend uses 'createdAt', not 'createdDate'
  coachId: string;
  coachName: string;
  qrCodeUrl?: string; // Optional for now
  qrCodeImage?: string; // Base64 data URL for QR code
  courseId?: string; // For course-specific discount cards
  courseName?: string; // Course name for display
  cardType?: 'student' | 'course'; // Type of discount card

  // Backend properties (for compatibility)
  expirationDate?: string;
  userEmail?: string;
  userName?: string;
  maxUsage?: number;
}

interface DiscountCardManagementProps {
  coachId: string;
}

export default function DiscountCardManagement({ coachId }: DiscountCardManagementProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [discountCards, setDiscountCards] = useState<DiscountCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCard, setEditingCard] = useState<DiscountCard | null>(null);
  const [selectedCard, setSelectedCard] = useState<DiscountCard | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'used'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCourse, setSearchCourse] = useState('');
  const [searchExpiration, setSearchExpiration] = useState('');

  useEffect(() => {
    loadDiscountCards();
  }, [coachId]);

  const loadDiscountCards = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/discount-cards/${coachId}`);
      if (response.ok) {
        const data = await response.json();
        // Handle the API response structure { success: true, discountCards: [...] }
        const cards = data.discountCards || data || [];

        // Map backend properties to frontend interface
        const mappedCards = Array.isArray(cards) ? await Promise.all(cards.map(async (card) => {
          let courseName = undefined;

          // Fetch course name if courseId exists
          if (card.courseId) {
            try {
              const courseResponse = await fetch(`/api/courses/${card.courseId}`);
              if (courseResponse.ok) {
                const courseData = await courseResponse.json();
                courseName = courseData.course?.title || courseData.title;
              }
            } catch (error) {
              console.error('Error fetching course name:', error);
            }
          }

          return {
            ...card,
            expiryDate: card.expirationDate || card.expiryDate || new Date().toISOString(),
            memberEmail: card.userEmail || card.memberEmail,
            memberName: card.userName || card.memberName,
            usageCount: typeof card.usageCount === 'number' ? card.usageCount : 0,
            usageLimit: typeof card.usageLimit === 'number' ? card.usageLimit :
                       (typeof card.maxUsage === 'number' ? card.maxUsage : null),
            discountPercentage: typeof card.discountPercentage === 'number' ? card.discountPercentage : 0,
            courseName,
          };
        })) : [];

        setDiscountCards(mappedCards);
      } else {
        console.error('Failed to load discount cards:', response.statusText);
        setDiscountCards([]);
      }
    } catch (error) {
      console.error('Error loading discount cards:', error);
      setDiscountCards([]);
    } finally {
      setIsLoading(false);
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

  const handleCreateCard = async (cardData: {
    memberEmail?: string;
    courseId?: string;
    discountPercentage: number;
    expirationDate: string;
    description: string;
    maxUsage: number;
    cardType: 'student' | 'course';
  }) => {
    try {
      const response = await fetch('/api/discount-cards/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coachId,
          title: `${cardData.discountPercentage}% Discount Card`,
          description: cardData.description,
          discountPercentage: cardData.discountPercentage,
          userEmail: cardData.memberEmail,
          courseId: cardData.courseId,
          cardType: cardData.cardType,
          expirationDate: cardData.expirationDate,
          maxUsage: cardData.maxUsage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Handle the API response structure { success: true, discountCard: {...} }
        const newCard = data.discountCard || data;
        
        // Map backend properties to frontend interface
        const mappedCard = {
          ...newCard,
          expiryDate: newCard.expirationDate || newCard.expiryDate || new Date().toISOString(),
          memberEmail: newCard.userEmail || newCard.memberEmail,
          memberName: newCard.userName || newCard.memberName,
          usageCount: typeof newCard.usageCount === 'number' ? newCard.usageCount : 0,
          usageLimit: typeof newCard.usageLimit === 'number' ? newCard.usageLimit : 
                     (typeof newCard.maxUsage === 'number' ? newCard.maxUsage : null),
          discountPercentage: typeof newCard.discountPercentage === 'number' ? newCard.discountPercentage : 0,
        };
        
        setDiscountCards(prev => [mappedCard, ...prev]);
        setShowCreateModal(false);
      } else {
        const error = await response.json();
        alert(error.message || t('Error creating discount card'));
      }
    } catch (error) {
      console.error('Error creating discount card:', error);
      alert(t('Error creating discount card'));
    }
  };

  const handleDeactivateCard = async (cardId: string) => {
    if (!confirm(t('Are you sure you want to deactivate this discount card?'))) {
      return;
    }

    try {
      const response = await fetch(`/api/discount-cards/${coachId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId,
          isActive: false
        })
      });

      if (response.ok) {
        setDiscountCards(prev =>
          prev.map(card =>
            card.id === cardId ? { ...card, isActive: false } : card
          )
        );
      } else {
        alert(t('Error deactivating discount card'));
      }
    } catch (error) {
      console.error('Error deactivating discount card:', error);
      alert(t('Error deactivating discount card'));
    }
  };

  const handleEditCard = (card: DiscountCard) => {
    // Only allow editing if card is not used
    const usageCount = typeof card.usageCount === 'number' ? card.usageCount : 0;
    if (usageCount > 0) {
      alert(t('Cannot edit a discount card that has been used'));
      return;
    }

    setEditingCard(card);
    setShowCreateModal(true);
  };

  const handleDuplicateCard = async (card: DiscountCard) => {
    if (!confirm(t('Are you sure you want to duplicate this discount card?'))) {
      return;
    }

    setDuplicatingCardId(card.id);
    try {
      // Generate new unique code following the same format as the API
      // Format: {COACHNAME}{percentage}{timestamp}
      const coachName = card.coachName || 'COACH';
      const cleanName = coachName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
      const timestamp = Date.now().toString().slice(-6);
      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      const newCode = `${cleanName}${card.discountPercentage || 10}${timestamp}${randomSuffix}`;

      // Generate new QR code with the new unique code (this ensures QR is different)
      const qrCodeImage = await generateQRCode(newCode);

      // Prepare duplicate card data - API will create with new code, but we'll send our generated one
      const duplicateData = {
        coachId: card.coachId,
        title: card.title,
        description: card.description || '',
        discountPercentage: card.discountPercentage,
        userEmail: card.memberEmail || card.userEmail,
        courseId: card.courseId,
        cardType: card.cardType || 'student',
        expirationDate: card.expiryDate || card.expirationDate || new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        maxUsage: card.usageLimit || card.maxUsage || 1,
        code: newCode, // Send the new code
        qrCodeImage: qrCodeImage // Send the new QR code
      };

      // Create the duplicate via API
      const response = await fetch('/api/discount-cards/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicateData)
      });

      if (response.ok) {
        const data = await response.json();
        const newCard = data.discountCard || data;
        
        // Map backend properties to frontend interface
        const mappedCard = {
          ...newCard,
          expiryDate: newCard.expirationDate || newCard.expiryDate || new Date().toISOString(),
          memberEmail: newCard.userEmail || newCard.memberEmail,
          memberName: newCard.userName || newCard.memberName,
          usageCount: typeof newCard.usageCount === 'number' ? newCard.usageCount : 0,
          usageLimit: typeof newCard.usageLimit === 'number' ? newCard.usageLimit : 
                     (typeof newCard.maxUsage === 'number' ? newCard.maxUsage : null),
          discountPercentage: typeof newCard.discountPercentage === 'number' ? newCard.discountPercentage : 0,
        };
        
        setDiscountCards(prev => [mappedCard, ...prev]);
        alert(t('Discount card duplicated successfully!'));
      } else {
        const error = await response.json();
        alert(t('Error duplicating discount card: {{message}}', { message: error.message || error.error || 'Unknown error' }));
      }
    } catch (error) {
      console.error('Error duplicating discount card:', error);
      alert(t('Error duplicating discount card. Please try again.'));
    } finally {
      setDuplicatingCardId(null);
    }
  };

  const handleUpdateCard = async (cardData: {
    userId?: string;
    userEmail?: string;
    userName?: string;
    courseId?: string;
    recurringSchedule?: string[];
    advantageType: 'free' | 'special_price' | 'percentage_discount';
    value?: number;
    expirationDate: string;
    description?: string;
  }) => {
    if (!editingCard) return;

    try {
      // Map the new format to the old format for API compatibility
      const discountPercentage = cardData.advantageType === 'percentage_discount' 
        ? (cardData.value || 0)
        : (editingCard.discountPercentage || 0);

      const response = await fetch(`/api/discount-cards/${coachId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId: editingCard.id,
          title: editingCard.title, // Keep original title format or update
          description: cardData.description || '',
          expirationDate: cardData.expirationDate,
          userEmail: cardData.userEmail,
          courseId: cardData.courseId,
          discountPercentage: discountPercentage,
          recurringSchedule: cardData.recurringSchedule
        })
      });

      if (response.ok) {
        await loadDiscountCards(); // Reload to get updated data
        setShowCreateModal(false);
        setEditingCard(null);
        alert(t('Discount card updated successfully!'));
      } else {
        const error = await response.json();
        alert(t('Error updating discount card: {{message}}', { message: error.message || error.error || 'Unknown error' }));
      }
    } catch (error) {
      console.error('Error updating discount card:', error);
      alert(t('Error updating discount card. Please try again.'));
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm(t('Do you really want to permanently delete this card?'))) {
      return;
    }

    try {
      const response = await fetch(`/api/discount-cards/${coachId}?cardId=${cardId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setDiscountCards(prev => prev.filter(card => card.id !== cardId));
      } else {
        const error = await response.json();
        alert(t('Error deleting discount card: {{message}}', { message: error.message || 'Unknown error' }));
      }
    } catch (error) {
      console.error('Error deleting discount card:', error);
      alert(t('Error deleting discount card. Please try again.'));
    }
  };

  const copyCardCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert(t('Discount card code copied to clipboard'));
  };

  const downloadQRCode = (card: DiscountCard) => {
    if (!card.qrCodeImage) {
      alert(t('QR Code not available'));
      return;
    }
    const link = document.createElement('a');
    link.href = card.qrCodeImage;
    link.download = `discount-card-qr-${card.memberName || 'user'}-${card.discountPercentage}%.png`;
    link.click();
  };

  const downloadCompleteCard = (card: DiscountCard) => {
    if (!card.qrCodeImage) {
      alert(t('QR Code not available'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for card (standard credit card ratio 3.375:2.125)
    canvas.width = 540;
    canvas.height = 340;

    // Create gradient background using site colors
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#D91CD2'); // Primary site color
    gradient.addColorStop(0.5, '#E91E63'); // Pink variant
    gradient.addColorStop(1, '#1f2937'); // Dark gray
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add elegant border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

    // Inner border for premium look
    ctx.strokeStyle = '#D91CD2';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    // Title with localized text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.textAlign = 'center';
    const discountCardTitle = t('💳 AFROBOOST DISCOUNT CARD');
    ctx.fillText(discountCardTitle, canvas.width / 2, 45);

    // Discount percentage with enhanced styling and localized text
    ctx.font = 'bold 44px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#D91CD2';
    ctx.lineWidth = 2;
    const discountText = `${card.discountPercentage}% ${t('OFF')}`;
    ctx.strokeText(discountText, canvas.width / 2, 95);
    ctx.fillText(discountText, canvas.width / 2, 95);

    // Add QR code with proper positioning
    const qrImg = document.createElement('img');
    qrImg.onload = () => {
      // QR code positioned in bottom left
      ctx.drawImage(qrImg, 25, 200, 100, 100);
      
      // Card details on the right side with better layout
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial, sans-serif';
      ctx.textAlign = 'left';
      
      let yPos = 135;
      const leftMargin = 50;
      const rightMargin = 140;
      const maxWidth = canvas.width - rightMargin - leftMargin;
      
      // Card code with localized label
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText(`${t('Code')}: ${card.code}`, leftMargin, yPos);
      yPos += 25;
      
      // Member name with localized label
      if (card.memberName && card.memberName.trim()) {
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText(`${t('For')}: ${card.memberName}`, leftMargin, yPos);
        yPos += 25;
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
            if (yPos > 185) break;
          } else {
            line = testLine;
          }
        }
        if (line.trim() && yPos <= 185) {
          ctx.fillText(line.trim(), leftMargin, yPos);
          yPos += 20;
        }
      }
      
      // Expiration date with localized label
      ctx.font = '14px Arial, sans-serif';
      if (yPos <= 185) {
        ctx.fillText(`${t('Expires')}: ${new Date(card.expiryDate).toLocaleDateString()}`, leftMargin, yPos);
        yPos += 18;
      }
      
      // Usage count with localized label
      if (yPos <= 185) {
        const usageCount = typeof card.usageCount === 'number' ? card.usageCount : 0;
        const usageLimit = card.usageLimit === undefined || card.usageLimit === null || card.usageLimit === -1 
          ? '∞' 
          : (typeof card.usageLimit === 'number' ? card.usageLimit : '∞');
        
        ctx.fillText(`${t('Usage')}: ${usageCount}/${usageLimit}`, leftMargin, yPos);
        yPos += 18;
      }
      
      // Status with localized text
      if (yPos <= 185) {
        if (card.isActive) {
          ctx.fillStyle = '#90EE90'; // Light green for active cards
          ctx.fillText(`${t('Status')}: ${t('Active & Ready to Use')}`, leftMargin, yPos);
        } else {
          ctx.fillStyle = '#ffcccb'; // Light red for inactive cards
          ctx.fillText(`${t('Status')}: ${t('Inactive')}`, leftMargin, yPos);
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
          link.download = `afroboost-discount-card-${card.memberName || 'user'}-${card.discountPercentage}%.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };
    qrImg.src = card.qrCodeImage;
  };

  const shareQRCode = async (card: DiscountCard) => {
    if (!card.qrCodeImage) {
      alert(t('QR Code not available'));
      return;
    }

    if (navigator.share) {
      try {
        // Convert base64 to blob for sharing
        const response = await fetch(card.qrCodeImage);
        const blob = await response.blob();
        const file = new File([blob], `discount-card-${card.code}.png`, { type: 'image/png' });

        await navigator.share({
          title: t('Discount Card'),
          text: t('Here is your {{percentage}}% discount card!', { 
            percentage: card.discountPercentage
          }),
          files: [file]
        });
      } catch (error) {
        console.error('Error sharing:', error);
        // Fallback to copying code
        copyCardCode(card.code);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      copyCardCode(card.code);
    }
  };

  const shareFullCard = async (card: DiscountCard) => {
    const cardDetails = `🎫 DISCOUNT CARD 🎫
💰 ${card.discountPercentage}% OFF
📧 For: ${card.memberName || card.memberEmail || 'Guest'}
📅 Expires: ${new Date(card.expiryDate).toLocaleDateString()}
🎟️ Code: ${card.code}
📖 ${card.description || 'Special discount card'}
🔢 Usage: ${typeof card.usageCount === 'number' ? card.usageCount : 0}/${
      card.usageLimit === undefined || 
      card.usageLimit === null || 
      card.usageLimit === -1 
        ? '∞' 
        : (typeof card.usageLimit === 'number' ? card.usageLimit : '∞')
    }`;

    if (navigator.share) {
      try {
        // Try to share with QR code if available
        if (card.qrCodeImage) {
          const response = await fetch(card.qrCodeImage);
          const blob = await response.blob();
          const file = new File([blob], `discount-card-${card.code}.png`, { type: 'image/png' });

          await navigator.share({
            title: t('{{percentage}}% Discount Card', { percentage: card.discountPercentage }),
            text: cardDetails,
            files: [file]
          });
        } else {
          await navigator.share({
            title: t('{{percentage}}% Discount Card', { percentage: card.discountPercentage }),
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

  const getFilteredCards = () => {
    const now = new Date();
    // Ensure discountCards is an array before filtering
    const cardsArray = Array.isArray(discountCards) ? discountCards : [];
    return cardsArray.filter(card => {
      try {
        const isExpired = card.expiryDate ? new Date(card.expiryDate) < now : false;
        const usageCount = typeof card.usageCount === 'number' ? card.usageCount : 0;
        const usageLimit = typeof card.usageLimit === 'number' ? card.usageLimit : null;
        const isUsedUp = usageLimit ? usageCount >= usageLimit : false;
        const lowerSearch = searchTerm.trim().toLowerCase();

        if (lowerSearch) {
          const name = (card.memberName || '').toLowerCase();
          const email = (card.memberEmail || '').toLowerCase();
          const code = (card.code || '').toLowerCase();
          const courseName = (card.courseName || '').toLowerCase();
          const matchesSearch =
            name.includes(lowerSearch) ||
            email.includes(lowerSearch) ||
            code.includes(lowerSearch) ||
            courseName.includes(lowerSearch);
          if (!matchesSearch) return false;
        }
        
        switch (filter) {
          case 'active':
            return card.isActive && !isExpired && !isUsedUp;
          case 'expired':
            return isExpired;
          case 'used':
            return isUsedUp;
          default:
            return true;
        }
      } catch (error) {
        console.warn('Error filtering card:', card, error);
        return true; // Include card by default if there's an error
      }
    });
  };

  const getCardStatus = (card: DiscountCard) => {
    try {
      const now = new Date();
      const isExpired = card.expiryDate ? new Date(card.expiryDate) < now : false;
      const usageCount = typeof card.usageCount === 'number' ? card.usageCount : 0;
      const usageLimit = typeof card.usageLimit === 'number' ? card.usageLimit : null;
      const isUsedUp = usageLimit ? usageCount >= usageLimit : false;

      if (!card.isActive) return { status: 'deactivated', color: 'text-gray-400', bg: 'bg-gray-800' };
      if (isExpired) return { status: 'expired', color: 'text-red-400', bg: 'bg-red-900/20' };
      if (isUsedUp) return { status: 'used up', color: 'text-orange-400', bg: 'bg-orange-900/20' };
      return { status: 'active', color: 'text-green-400', bg: 'bg-green-900/20' };
    } catch (error) {
      console.warn('Error getting card status:', card, error);
      return { status: 'unknown', color: 'text-gray-400', bg: 'bg-gray-800' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('Discount Cards Management')}</h1>
          <p className="text-gray-400 mt-2">
            {t('Create and manage discount cards for your students')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center space-x-2"
        >
          <FiPlus size={18} />
          <span>{t('Create Discount Card')}</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">{t('Total Cards')}</p>
              <p className="text-2xl font-bold text-white">{Array.isArray(discountCards) ? discountCards.length : 0}</p>
            </div>
            <FiPercent className="text-purple-400" size={24} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">{t('Active Cards')}</p>
              <p className="text-2xl font-bold text-green-400">
                {getFilteredCards().filter(card => {
                  try {
                    return getCardStatus(card).status === 'active';
                  } catch {
                    return false;
                  }
                }).length}
              </p>
            </div>
            <FiCheckCircle className="text-green-400" size={24} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">{t('Total Uses')}</p>
              <p className="text-2xl font-bold text-blue-400">
                {Array.isArray(discountCards) ? discountCards.reduce((sum, card) => {
                  const usageCount = typeof card.usageCount === 'number' ? card.usageCount : 0;
                  return sum + usageCount;
                }, 0) : 0}
              </p>
            </div>
            <FiUser className="text-blue-400" size={24} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">{t('Expired Cards')}</p>
              <p className="text-2xl font-bold text-red-400">
                {getFilteredCards().filter(card => {
                  try {
                    return getCardStatus(card).status === 'expired';
                  } catch {
                    return false;
                  }
                }).length}
              </p>
            </div>
            <FiClock className="text-red-400" size={24} />
          </div>
        </motion.div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search */}
        <div className="w-full md:w-1/2">
          <div className="relative">
            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('Search by name, email or code') || 'Search by name, email or code'}
              className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
        {[
          { key: 'all', label: t('All Cards') },
          { key: 'active', label: t('Active') },
          { key: 'expired', label: t('Expired') },
          { key: 'used', label: t('Used Up') },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
        </div>
      </div>

      {/* Cards List */}
      {getFilteredCards().length === 0 ? (
        <div className="text-center py-12">
          <FiPercent className="text-gray-600 text-6xl mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            {t('No discount cards found')}
          </h3>
          <p className="text-gray-500 mb-6">
            {filter === 'all' 
              ? t('Create your first discount card to get started')
              : t('No cards match the current filter')
            }
          </p>
          {filter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
            >
              {t('Create First Discount Card')}
            </button>
          )}
        </div>
      ) : (
        /* Unified Grid Layout for All Screen Sizes */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-1">
          {getFilteredCards().map((card) => {
            const status = getCardStatus(card);
            return (
              <motion.div
                key={card.id}
                whileHover={{ scale: 1.01 }}
                className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
              >
                <div className="p-6">
                  {/* Header with Icon and Title */}
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex-shrink-0">
                      <FiPercent className="text-white" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white break-words">
                        {card.discountPercentage}% {t('Discount Card')}
                      </h3>
                      {card.courseName && (
                        <p className="text-sm text-purple-400 mt-1">
                          {card.courseName}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color} ${status.bg}`}>
                          {t(status.status)}
                        </span>
                        {card.memberName && (
                          <span className="text-gray-400 text-sm break-words">
                            {t('for')} {card.memberName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* QR Code Section */}
                  {card.qrCodeImage && (
                    <div className="text-center mb-4">
                      <div className="w-24 h-24 mx-auto mb-2 bg-white rounded-lg p-2 flex items-center justify-center">
                        <Image
                          src={card.qrCodeImage}
                          alt={`QR Code for discount card ${card.code}`}
                          width={80}
                          height={80}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <p className="text-gray-400 text-xs font-mono break-all">{card.code}</p>
                    </div>
                  )}

                  {/* Card Details */}
                  <div className="space-y-3 mb-4">
                    {card.courseId && card.courseName && (
                      <div>
                        <p className="text-gray-400 text-sm">{t('Course')}</p>
                        <p className="text-white text-sm break-words">{card.courseName}</p>
                      </div>
                    )}
                    {card.memberEmail && (
                      <div>
                        <p className="text-gray-400 text-sm">{t('Member Email')}</p>
                        <p className="text-white text-sm break-words">{card.memberEmail}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-gray-400 text-sm">{t('Expiration Date')}</p>
                        <p className="text-white text-sm">
                          {new Date(card.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">{t('Usage')}</p>
                        <p className="text-white text-sm">
                          {typeof card.usageCount === 'number' ? card.usageCount : 0} / {
                            card.usageLimit === undefined || 
                            card.usageLimit === null || 
                            card.usageLimit === -1 
                              ? '∞' 
                              : (typeof card.usageLimit === 'number' ? card.usageLimit : '∞')
                          }
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">{t('Created')}</p>
                      <p className="text-white text-sm">
                        {new Date(card.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {card.description && (
                    <div className="mb-4">
                      <p className="text-gray-400 text-sm">{t('Description')}</p>
                      <p className="text-white text-sm break-words">{card.description}</p>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="text-gray-400 text-sm mb-2">{t('Card Code')}</p>
                    <div className="flex items-center space-x-2">
                      <code className="bg-gray-900 px-3 py-2 rounded text-white font-mono text-sm break-all flex-1">
                        {card.code}
                      </code>
                      <button
                        onClick={() => copyCardCode(card.code)}
                        className="p-2 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                        title={t('Copy code')}
                      >
                        <FiCopy size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons - Organized in 2 rows for better mobile display */}
                  <div className="space-y-2 mt-4">
                    {/* Row 1: Download QR, Share, Download Card, Copy Code */}
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => downloadQRCode(card)}
                        className="flex items-center justify-center px-2 py-2.5 text-blue-400 hover:text-blue-300 transition-colors bg-gray-700 hover:bg-blue-500/10 rounded-lg min-h-[40px]"
                        title={t('Download QR Code Only')}
                      >
                        <FiDownload size={18} className="flex-shrink-0" />
                      </button>
                      
                      <button
                        onClick={() => shareQRCode(card)}
                        className="flex items-center justify-center px-2 py-2.5 text-green-400 hover:text-green-300 transition-colors bg-gray-700 hover:bg-green-500/10 rounded-lg min-h-[40px]"
                        title={t('Share QR Code')}
                      >
                        <FiShare2 size={18} className="flex-shrink-0" />
                      </button>
                      
                      <button
                        onClick={() => downloadCompleteCard(card)}
                        className="flex items-center justify-center px-2 py-2.5 text-purple-400 hover:text-purple-300 transition-colors bg-gray-700 hover:bg-purple-500/10 rounded-lg min-h-[40px]"
                        title={t('Download Complete Card')}
                      >
                        <FiCreditCard size={18} className="flex-shrink-0" />
                      </button>
                      
                      <button
                        onClick={() => copyCardCode(card.code)}
                        className="flex items-center justify-center px-2 py-2.5 text-yellow-400 hover:text-yellow-300 transition-colors bg-gray-700 hover:bg-yellow-500/10 rounded-lg min-h-[40px]"
                        title={t('Copy Code')}
                      >
                        <FiCopy size={18} className="flex-shrink-0" />
                      </button>
                    </div>
                    
                    {/* Row 2: Edit, Duplicate, Deactivate, Delete */}
                    <div className="grid grid-cols-4 gap-2">
                      {/* Edit Button - Only for unused cards */}
                      {(() => {
                        const usageCount = typeof card.usageCount === 'number' ? card.usageCount : 0;
                        if (usageCount === 0) {
                          return (
                            <button
                              onClick={() => handleEditCard(card)}
                              className="flex items-center justify-center px-2 py-2.5 text-blue-400 hover:text-blue-300 transition-colors bg-gray-700 hover:bg-blue-500/10 rounded-lg min-h-[40px]"
                              title={t('Edit Card')}
                            >
                              <FiEdit size={18} className="flex-shrink-0" />
                            </button>
                          );
                        }
                        return <div className="min-h-[40px]"></div>; // Empty div to maintain grid layout
                      })()}
                      
                      {/* Duplicate Button - Available for all cards */}
                      <button
                        onClick={() => handleDuplicateCard(card)}
                        disabled={duplicatingCardId === card.id}
                        className="flex items-center justify-center px-2 py-2.5 text-indigo-400 hover:text-indigo-300 transition-colors bg-gray-700 hover:bg-indigo-500/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
                        title={t('Duplicate Card')}
                      >
                        {duplicatingCardId === card.id ? (
                          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        ) : (
                          <FiCopy size={18} className="flex-shrink-0" />
                        )}
                      </button>
                      
                      {card.isActive ? (
                        <button
                          onClick={() => handleDeactivateCard(card.id)}
                          className="flex items-center justify-center px-2 py-2.5 text-orange-400 hover:text-orange-300 transition-colors bg-gray-700 hover:bg-orange-500/10 rounded-lg min-h-[40px]"
                          title={t('Deactivate card')}
                        >
                          <FiEye size={18} className="flex-shrink-0" />
                        </button>
                      ) : (
                        <div className="min-h-[40px]"></div> // Empty div to maintain grid layout
                      )}
                      
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="flex items-center justify-center px-2 py-2.5 text-red-400 hover:text-red-300 transition-colors bg-gray-700 hover:bg-red-500/10 rounded-lg min-h-[40px]"
                        title={t('Delete Permanently')}
                      >
                        <FiTrash2 size={18} className="flex-shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Discount Card Modal */}
      {(showCreateModal || editingCard) && (
        <SimplifiedDiscountCardModal
          onClose={() => {
            setShowCreateModal(false);
            setEditingCard(null);
          }}
          onSubmit={editingCard ? handleUpdateCard : handleCreateCard}
          coachId={coachId}
          editingCard={editingCard || undefined}
        />
      )}
    </div>
  );
}