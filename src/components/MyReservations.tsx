'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FiCalendar, FiClock, FiMapPin, FiCheck, FiX, FiDownload, FiUser, FiBook } from 'react-icons/fi';
import { HelmetReservation } from '@/types';
import { Timestamp } from 'firebase/firestore';

// Custom scrollbar styles
const scrollbarStyles = `
  .reservations-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .reservations-scroll::-webkit-scrollbar-track {
    background: #1f2937;
    border-radius: 4px;
  }
  .reservations-scroll::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #D91CD2 0%, #7000FF 100%);
    border-radius: 4px;
  }
  .reservations-scroll::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #E91CE2 0%, #8000FF 100%);
  }
`;

interface MyReservationsProps {
  userId: string;
}

export default function MyReservations({ userId }: MyReservationsProps) {
  const { t } = useTranslation();
  const [reservations, setReservations] = useState<HelmetReservation[]>([]);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReservations();
  }, [userId]);

  const loadReservations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/helmet-reservations/user/${userId}`);
      const data = await response.json();

      if (data.success) {
        setReservations(data.reservations);
        setQrCode(data.qrCode);
      }
    } catch (error) {
      console.error('Error loading reservations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm(t('Are you sure you want to cancel this reservation?'))) {
      return;
    }

    try {
      const response = await fetch(`/api/helmet-reservations/${reservationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadReservations();
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
    }
  };

  const downloadQRCode = () => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = 'my-qr-code.png';
    link.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'booked':
        return 'text-blue-500 bg-blue-500/20 border-blue-500';
      case 'checked_in':
        return 'text-green-500 bg-green-500/20 border-green-500';
      case 'cancelled':
        return 'text-red-500 bg-red-500/20 border-red-500';
      case 'no_show':
        return 'text-orange-500 bg-orange-500/20 border-orange-500';
      default:
        return 'text-gray-500 bg-gray-500/20 border-gray-500';
    }
  };

  const formatDate = (date: any): Date => {
    if (!date) return new Date();
    if (date instanceof Date) return date;
    if (date?.toDate && typeof date.toDate === 'function') {
      return date.toDate();
    }
    if (typeof date === 'string' || typeof date === 'number') {
      return new Date(date);
    }
    return new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D91CD2]"></div>
      </div>
    );
  }

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div className="space-y-6">
      {/* QR Code Section */}
      {qrCode && (
        <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
          <h3 className="text-xl font-bold mb-4">{t('My QR Code')}</h3>
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <img src={qrCode} alt="My QR Code" className="w-48 h-48" />
            </div>
            <p className="text-gray-400 text-sm text-center">
              {t('Show this QR code at the entrance to check in')}
            </p>
            <button
              onClick={downloadQRCode}
              className="btn-secondary flex items-center space-x-2 px-6 py-2"
            >
              <FiDownload size={16} />
              <span>{t('Download QR Code')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Reservations List */}
      <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">{t('My Reservations')}</h3>
          {reservations.length > 2 && (
            <span className="text-sm text-gray-400">
              {reservations.length} {t('total')}
            </span>
          )}
        </div>

        {reservations.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            {t('No reservations yet')}
          </p>
        ) : (
          <div
            className="reservations-scroll space-y-6 overflow-y-auto pr-2"
            style={{
              maxHeight: reservations.length > 2 ? 'calc(2 * 320px + 1.5rem)' : 'none',
              scrollbarWidth: 'thin',
              scrollbarColor: '#D91CD2 #1f2937'
            }}
          >
            {reservations.map((reservation, index) => {
              const classDate = formatDate(reservation.classDate);
              const startTime = formatDate(reservation.classStartTime);
              const endTime = formatDate(reservation.classEndTime);

              return (
                <motion.div
                  key={reservation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 border border-gray-700/50 hover:border-[#D91CD2]/50 transition-all shadow-lg hover:shadow-[#D91CD2]/20"
                >
                  {/* Header with Status */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <FiBook className="text-[#D91CD2]" size={20} />
                        <h4 className="font-bold text-lg text-white">{reservation.courseName || t('Course')}</h4>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <FiUser size={14} />
                        <span>{reservation.coachName || t('Coach')}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(reservation.status)}`}>
                      {t(reservation.status.replace('_', ' ').toUpperCase())}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-4"></div>

                  {/* Details */}
                  <div className="space-y-3">
                    {/* Date */}
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-[#D91CD2]/10 rounded-lg">
                        <FiCalendar className="text-[#D91CD2]" size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{t('Date')}</p>
                        <p className="text-white font-medium">
                          {classDate.toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <FiClock className="text-purple-400" size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{t('Time')}</p>
                        <p className="text-white font-medium">
                          {startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })} - {endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </p>
                      </div>
                    </div>

                    {/* Location */}
                    {reservation.location && (
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <FiMapPin className="text-blue-400" size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">{t('Location')}</p>
                          <p className="text-white font-medium">{reservation.location}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  {reservation.status === 'booked' && (
                    <button
                      onClick={() => handleCancelReservation(reservation.id)}
                      className="mt-6 w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 py-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
                    >
                      <FiX size={18} />
                      <span>{t('Cancel Reservation')}</span>
                    </button>
                  )}

                  {reservation.status === 'checked_in' && (
                    <div className="mt-6 w-full bg-green-500/10 text-green-400 border border-green-500/30 py-3 rounded-lg font-medium flex items-center justify-center space-x-2">
                      <FiCheck size={18} />
                      <span>{t('Checked In')}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </>
  );
}

