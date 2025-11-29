'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiGift, FiLayers, FiSave, FiPlus, FiTrash2 } from 'react-icons/fi';
import Card from './Card';
import { useAuth } from '@/lib/auth';
import { offerService, MAIN_OFFERS_COACH_ID, MAIN_OFFERS_COACH_NAME } from '@/lib/database';
import { Offer } from '@/types';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const CoachOffersPanel = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingOfferId, setSavingOfferId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOffer, setNewOffer] = useState<Partial<Offer>>({
    title: '',
    subtitle: '',
    description: '',
    price: 0,
    buttonLabel: 'Select',
    emoji: '✨',
    sortOrder: 0
  });

  const sortedOffers = useMemo(
    () => [...offers].sort((a, b) => a.sortOrder - b.sortOrder),
    [offers]
  );

  const loadOffers = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setFeedback(null);
      // Use the shared "main offers" coach so that the coach dashboard and the
      // public Ready to Dance popup are always editing the same three offers.
      const coachName =
        (user && `${user.firstName || ''} ${user.lastName || ''}`.trim()) ||
        user?.email ||
        MAIN_OFFERS_COACH_NAME;
      const data = await offerService.ensureDefaults(MAIN_OFFERS_COACH_ID, coachName, forceRefresh);
      setOffers(data);
    } catch (error) {
      console.error('Failed to load offers', error);
      setFeedback({
        type: 'error',
        message: t('failedToLoadOffers') || 'Failed to load offers'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load the shared/main offers once the user context is available.
    if (user) {
      loadOffers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleOfferChange = (offerId: string, field: keyof Offer, value: string) => {
    setOffers(prev =>
      prev.map(offer =>
        offer.id === offerId
          ? {
            ...offer,
            [field]: field === 'price' ? Number(value) || 0 : value
          }
          : offer
      )
    );
  };

  const handleOfferActiveChange = (offerId: string, value: boolean) => {
    setOffers(prev =>
      prev.map(offer =>
        offer.id === offerId
          ? {
            ...offer,
            isActive: value
          }
          : offer
      )
    );
  };

  const handleOptionChange = (offerId: string, optionId: string, field: 'label' | 'description' | 'price', value: string) => {
    setOffers(prev =>
      prev.map(offer => {
        if (offer.id !== offerId || !offer.options) return offer;
        const updated = offer.options.map(option =>
          option.id === optionId
            ? {
              ...option,
              [field]: field === 'price' ? Number(value) || 0 : value
            }
            : option
        );
        return { ...offer, options: updated };
      })
    );
  };

  const handleOptionActiveChange = (offerId: string, optionId: string, value: boolean) => {
    setOffers(prev =>
      prev.map(offer => {
        if (offer.id !== offerId || !offer.options) return offer;
        return {
          ...offer,
          options: offer.options.map(option =>
            option.id === optionId ? { ...option, isActive: value } : option
          )
        };
      })
    );
  };

  const handleSaveOffer = async (offerId: string) => {
    const target = offers.find(o => o.id === offerId);
    if (!target) return;

    try {
      setSavingOfferId(offerId);
      setFeedback(null);

      // Prepare payload - exclude only the fields that shouldn't be updated
      const { id, createdAt, updatedAt, ...payload } = target;

      // Ensure all fields are included, especially nested options
      const updatePayload: Partial<Offer> = {
        ...payload,
        // Explicitly include all fields to ensure they're saved
        title: target.title,
        subtitle: target.subtitle,
        description: target.description,
        emoji: target.emoji,
        price: target.price,
        currency: target.currency || 'CHF',
        buttonLabel: target.buttonLabel,
        paymentMethods: target.paymentMethods || [],
        highlightItems: target.highlightItems || [],
        options: target.options || [],
        defaultOptionId: target.defaultOptionId,
        sortOrder: target.sortOrder,
        isActive: target.isActive !== false,
        coachId: target.coachId,
        coachName: target.coachName,
        slug: target.slug
      };

      console.log('Saving offer:', offerId, 'with payload:', updatePayload);

      await offerService.update(offerId, updatePayload);

      // Wait a bit before reloading to ensure Firestore has processed the update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Force refresh to bypass cache and get fresh data from Firestore
      await loadOffers(true);
      setFeedback({
        type: 'success',
        message: t('offerUpdatedSuccessfully') || 'Offer updated successfully'
      });
    } catch (error) {
      console.error('Failed to save offer', error);
      setFeedback({
        type: 'error',
        message: t('failedToUpdateOffer') || 'Failed to update offer'
      });
    } finally {
      setSavingOfferId(null);
    }
  };

  const handleCreateOffer = async () => {
    try {
      setIsLoading(true);

      // Use MAIN_OFFERS_COACH_ID to ensure it appears in the public popup
      const offerData = {
        ...newOffer,
        coachId: MAIN_OFFERS_COACH_ID,
        coachName: MAIN_OFFERS_COACH_NAME,
        slug: newOffer.title?.toLowerCase().replace(/\s+/g, '-') || 'new-offer',
        isActive: true,
        currency: 'CHF'
      };

      await offerService.create(offerData);

      setShowCreateModal(false);
      setNewOffer({
        title: '',
        subtitle: '',
        description: '',
        price: 0,
        buttonLabel: 'Select',
        emoji: '✨',
        sortOrder: 0
      });

      // Refresh offers
      await loadOffers(true);

      setFeedback({
        type: 'success',
        message: t('Offer created successfully')
      });
    } catch (error) {
      console.error('Failed to create offer', error);
      setFeedback({
        type: 'error',
        message: t('Failed to create offer')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm(t('Are you sure you want to delete this offer?'))) return;

    try {
      setIsLoading(true);
      await offerService.delete(offerId);
      await loadOffers(true);
      setFeedback({
        type: 'success',
        message: t('Offer deleted successfully')
      });
    } catch (error) {
      console.error('Failed to delete offer', error);
      setFeedback({
        type: 'error',
        message: t('Failed to delete offer')
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center space-x-3 py-6">
          <div className="w-6 h-6 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-400">{t('loadingOffers') || 'Loading offers...'}</span>
        </div>
      </Card>
    );
  }

  if (!sortedOffers.length) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-400">
          {t('noOffersFound') || 'No offers found'}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-[#D91CD2]/10 text-[#D91CD2]">
              <FiGift size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{t('Offer Management')}</h2>
              <p className="text-sm text-gray-400">
                {t('offerManagementSubtitle') ||
                  'Customize the offers displayed inside the Ready to Dance popup.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center justify-center px-4 py-2"
          >
            <FiPlus className="mr-2" />
            {t('Create Offer')}
          </button>
        </div>
      </Card>

      {feedback && (
        <div
          className={`p-4 rounded-lg ${feedback.type === 'success'
            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
            : 'bg-red-500/10 text-red-400 border border-red-500/30'
            }`}
        >
          {feedback.message}
        </div>
      )}

      {sortedOffers.map(offer => (
        <Card key={offer.id}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-400 uppercase tracking-wide">
                {offer.emoji} {t('Offer')}
              </div>
              <h3 className="text-2xl font-semibold">{offer.title}</h3>
              {offer.subtitle && <p className="text-gray-400 text-sm">{offer.subtitle}</p>}
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-400">{t('Sort order')}: {offer.sortOrder}</span>
              <div className="text-2xl font-bold">CHF {offer.price.toFixed(2)}</div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center space-x-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={offer.isActive !== false}
                onChange={(e) => handleOfferActiveChange(offer.id, e.target.checked)}
                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-[#D91CD2] focus:ring-[#D91CD2]"
              />
              <span>{t('Offer active')}</span>
            </label>
            <button
              onClick={() => handleDeleteOffer(offer.id)}
              className="text-red-400 hover:text-red-300 p-2"
              title={t('Delete Offer')}
            >
              <FiTrash2 size={18} />
            </button>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">{t('Title')}</label>
                <input
                  type="text"
                  value={offer.title}
                  onChange={(e) => handleOfferChange(offer.id, 'title', e.target.value)}
                  className="input-primary w-full mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">{t('Button label')}</label>
                <input
                  type="text"
                  value={offer.buttonLabel}
                  onChange={(e) => handleOfferChange(offer.id, 'buttonLabel', e.target.value)}
                  className="input-primary w-full mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400">{t('Description')}</label>
              <textarea
                value={offer.description}
                onChange={(e) => handleOfferChange(offer.id, 'description', e.target.value)}
                className="input-primary w-full mt-1 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">{t('Subtitle')}</label>
                <input
                  type="text"
                  value={offer.subtitle || ''}
                  onChange={(e) => handleOfferChange(offer.id, 'subtitle', e.target.value)}
                  className="input-primary w-full mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">{t('Price (CHF)')}</label>
                <input
                  type="number"
                  min="0"
                  value={offer.price}
                  onChange={(e) => handleOfferChange(offer.id, 'price', e.target.value)}
                  className="input-primary w-full mt-1"
                />
              </div>
            </div>
          </div>

          {offer.options?.length ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-center space-x-2 text-sm uppercase tracking-wide text-gray-400">
                <FiLayers />
                <span>{t('Subscription Options')}</span>
              </div>
              {offer.options.map(option => (
                <div key={option.id} className="border border-gray-800 rounded-xl p-4 space-y-3 bg-black/30">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-500">{t('Option label')}</label>
                    <label className="flex items-center space-x-2 text-xs text-gray-300">
                      <input
                        type="checkbox"
                        checked={option.isActive !== false}
                        onChange={(e) => handleOptionActiveChange(offer.id, option.id, e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-[#D91CD2] focus:ring-[#D91CD2]"
                      />
                      <span>{t('Option active')}</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">{t('Option label')}</label>
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) => handleOptionChange(offer.id, option.id, 'label', e.target.value)}
                        className="input-primary w-full mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">{t('Option price')}</label>
                      <input
                        type="number"
                        min="0"
                        value={option.price}
                        onChange={(e) => handleOptionChange(offer.id, option.id, 'price', e.target.value)}
                        className="input-primary w-full mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">{t('Option description')}</label>
                    <textarea
                      value={option.description || ''}
                      onChange={(e) => handleOptionChange(offer.id, option.id, 'description', e.target.value)}
                      className="input-primary w-full mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3 text-sm text-gray-400">
              <FiGift />
              <span>{t('offerPaymentHint') || 'These prices power the Ready to Dance popup offers.'}</span>
            </div>
            <button
              onClick={() => handleSaveOffer(offer.id)}
              disabled={savingOfferId === offer.id}
              className="btn-primary inline-flex items-center justify-center"
            >
              {savingOfferId === offer.id ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t('saving') || 'Saving...'}
                </>
              ) : (
                <>
                  <FiSave className="mr-2" />
                  {t('Save Offer')}
                </>
              )}
            </button>
          </div>
        </Card>
      ))}

      {/* Create Offer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#1a1a1a] rounded-xl max-w-lg w-full p-6 border border-gray-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{t('Create New Offer')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('Title')}</label>
                <input
                  type="text"
                  value={newOffer.title}
                  onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                  className="input-primary w-full"
                  placeholder={t('e.g. Starter Pack')}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('Subtitle')}</label>
                <input
                  type="text"
                  value={newOffer.subtitle}
                  onChange={(e) => setNewOffer({ ...newOffer, subtitle: e.target.value })}
                  className="input-primary w-full"
                  placeholder={t('e.g. Perfect for beginners')}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('Description')}</label>
                <textarea
                  value={newOffer.description}
                  onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                  className="input-primary w-full min-h-[80px]"
                  placeholder={t('Describe what is included...')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('Price (CHF)')}</label>
                  <input
                    type="number"
                    min="0"
                    value={newOffer.price}
                    onChange={(e) => setNewOffer({ ...newOffer, price: Number(e.target.value) })}
                    className="input-primary w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('Sort Order')}</label>
                  <input
                    type="number"
                    value={newOffer.sortOrder}
                    onChange={(e) => setNewOffer({ ...newOffer, sortOrder: Number(e.target.value) })}
                    className="input-primary w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('Button Label')}</label>
                  <input
                    type="text"
                    value={newOffer.buttonLabel}
                    onChange={(e) => setNewOffer({ ...newOffer, buttonLabel: e.target.value })}
                    className="input-primary w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('Emoji')}</label>
                  <input
                    type="text"
                    value={newOffer.emoji}
                    onChange={(e) => setNewOffer({ ...newOffer, emoji: e.target.value })}
                    className="input-primary w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
              >
                {t('Cancel')}
              </button>
              <button
                onClick={handleCreateOffer}
                disabled={!newOffer.title || !newOffer.description}
                className="btn-primary px-4 py-2"
              >
                {t('Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachOffersPanel;

