'use client';

import { useContext, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiCalendar, FiClock, FiMessageCircle, FiTrendingUp, FiBell, FiChevronRight, FiPackage, FiUser, FiDollarSign, FiUsers, FiCheckCircle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import Card from '@/components/Card';
import StudentCourseSessions from '@/components/StudentCourseSessions';
import SessionOverview from '@/components/SessionOverview';
import CreditHistory from '@/components/CreditHistory';
import TokenUsage from '@/components/TokenUsage';
import ReferralSystem from '@/components/ReferralSystem';
import MyReservations from '@/components/MyReservations';
import { useAuth } from '@/lib/auth';
import { bookingService, notificationService } from '@/lib/database';
import { Booking, Notification } from '@/types';
import { toDate, formatDate, isFutureDate } from '@/lib/dateUtils';


const StudentDashboard = () => {

  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('sessions');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Load bookings and notifications in parallel
      const [userBookings, userNotifications] = await Promise.all([
        bookingService.getByStudent(user.id),
        notificationService.getByUser(user.id)
      ]);

      setBookings(userBookings);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate session statistics
  const completedSessions = bookings.filter(booking => booking.status === 'completed').length;
  const upcomingSessions = bookings.filter(booking => booking.status === 'confirmed' && isFutureDate(booking.scheduledDate));
  const totalPurchased = bookings.length;
  const remainingSessions = upcomingSessions.length;

  const getLocalizedDate = (dateOrTimestamp: any): string => {
    return formatDate(dateOrTimestamp,
      i18n.language === 'en' ? 'en-US' :
        i18n.language === 'fr' ? 'fr-FR' : 'de-DE'
    );
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Sidebar Navigation */}
      <div className="md:col-span-1">
        <Card className="sticky top-24">
          <h2 className="text-xl font-semibold mb-6">{t('dashboard')}</h2>
          <nav className="space-y-2">
            {/* My Reservations - moved to top */}
            <button
              onClick={() => setActiveTab('reservations')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${activeTab === 'reservations' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
                }`}
            >
              <FiCheckCircle className="mr-3" />
              {t('My Reservations')}
            </button>

            <button
              onClick={() => setActiveTab('sessions')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${activeTab === 'sessions' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
                }`}
            >
              <FiCalendar className="mr-3" />
              {t('mySessions')}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${activeTab === 'history' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
                }`}
            >
              <FiClock className="mr-3" />
              {t('sessionHistory')}
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${activeTab === 'notifications' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
                }`}
            >
              <FiBell className="mr-3" />
              {t('notifications')}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${activeTab === 'chat' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
                }`}
            >
              <FiMessageCircle className="mr-3" />
              {t('Community Chat')}
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${activeTab === 'progress' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
                }`}
            >
              <FiTrendingUp className="mr-3" />
              {t('myProgress')}
            </button>
            <button
              onClick={() => setActiveTab('my-courses')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${activeTab === 'my-courses' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
                }`}
            >
              <FiPackage className="mr-3" />
              {t('My Courses')}
            </button>

            <button
              onClick={() => setActiveTab('credits')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${activeTab === 'credits' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
                }`}
            >
              <FiDollarSign className="mr-3" />
              {t('Credits & History')}
            </button>

            <button
              onClick={() => setActiveTab('tokens')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${activeTab === 'tokens' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
                }`}
            >
              <FiPackage className="mr-3" />
              {t('Token Usage')}
            </button>

            <button
              onClick={() => setActiveTab('referrals')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${activeTab === 'referrals' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
                }`}
            >
              <FiUsers className="mr-3" />
              {t('Referral Program')}
            </button>
          </nav>
        </Card>
      </div>

      {/* Main Content */}
      <div className="md:col-span-2">
        {/* My Sessions */}
        {activeTab === 'sessions' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <motion.div variants={item}>
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">{t('mySessions')}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-black/40 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">{t('purchased')}</p>
                    <p className="text-3xl font-bold text-[#D91CD2]">{totalPurchased}</p>
                  </div>
                  <div className="bg-black/40 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">{t('remaining')}</p>
                    <p className="text-3xl font-bold text-[#D91CD2]">{remainingSessions}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/courses" className="btn-primary text-center">
                    {t('bookNewSession')}
                  </Link>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">{t('Upcoming Sessions')}</h2>
                </div>

                <div className="space-y-4">
                  {upcomingSessions.length > 0 ? (
                    upcomingSessions
                      .sort((a, b) => toDate(a.scheduledDate).getTime() - toDate(b.scheduledDate).getTime())
                      .map(booking => (
                        <div key={booking.id} className="bg-black/40 p-4 rounded-lg flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">Booking #{booking.id.slice(0, 8)}</h3>
                            <p className="text-sm text-gray-400">
                              {getLocalizedDate(booking.scheduledDate)}
                            </p>
                          </div>
                          <Link href={`/courses/${booking.courseId}`} className="text-[#D91CD2] hover:underline flex items-center">
                            {t('Details')} <FiChevronRight className="ml-1" />
                          </Link>
                        </div>
                      ))
                  ) : (
                    <div className="bg-black/40 p-8 rounded-lg text-center">
                      <p className="text-gray-400">{t('No upcoming sessions. Book a new session!')}</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Session History */}
        {activeTab === 'history' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <SessionOverview />
          </motion.div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">{t('notifications')}</h2>
                </div>

                {notifications.length > 0 ? (
                  <div className="space-y-4">
                    {notifications
                      .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
                      .map((notification) => (
                        <div key={notification.id} className={`bg-black/40 p-4 rounded-lg ${!notification.read ? 'border-l-4 border-[#D91CD2]' : ''}`}>
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium">{notification.title}</h3>
                            <span className="text-xs text-gray-400">
                              {getLocalizedDate(notification.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 mt-1">{notification.message}</p>
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={async () => {
                                if (!notification.read) {
                                  await notificationService.markAsRead(notification.id);
                                  setNotifications(prev => prev.map(n =>
                                    n.id === notification.id ? { ...n, read: true } : n
                                  ));
                                }
                              }}
                              className="text-xs text-[#D91CD2] hover:underline"
                            >
                              {notification.read ? 'Read' : 'Mark as read'}
                            </button>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div className="bg-black/40 p-8 rounded-lg text-center">
                    <FiBell className="mx-auto text-4xl text-gray-500 mb-3" />
                    <p className="text-gray-400">{t('noNotifications')}</p>
                  </div>
                )}
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Community Chat */}
        {activeTab === 'chat' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">{t('Community Chat')}</h2>
                </div>

                <div className="bg-black/40 p-8 rounded-lg text-center">
                  <FiMessageCircle className="mx-auto text-4xl text-gray-500 mb-3" />
                  <p className="text-gray-400 mb-4">{t('Connect with other dancers and share your experience!')}</p>
                  <Link href="/chat" className="btn-primary">
                    {t('Join Community Chat')}
                  </Link>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* My Progress */}
        {activeTab === 'progress' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">{t('myProgress')}</h2>
                </div>

                <div className="space-y-6">
                  <div className="bg-black/40 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">{t('Sessions Completed')}</h3>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-700 rounded-full h-4">
                        <div
                          className="bg-[#D91CD2] h-4 rounded-full"
                          style={{ width: `${(completedSessions / Math.max(totalPurchased, 1)) * 100}%` }}
                        ></div>
                      </div>
                      <span className="ml-4 font-medium">{completedSessions}/{totalPurchased}</span>
                    </div>
                  </div>

                  <div className="bg-black/40 p-4 rounded-lg">
                    <h3 className="font-medium mb-4">{t('Dance Skills')}</h3>
                    <p className="text-gray-400 text-center">{t('Complete more sessions to track your progress!')}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* My Courses */}
        {activeTab === 'my-courses' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <StudentCourseSessions />
          </motion.div>
        )}



        {/* Credits & History */}
        {activeTab === 'credits' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <CreditHistory />
          </motion.div>
        )}

        {/* Token Usage */}
        {activeTab === 'tokens' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <TokenUsage />
          </motion.div>
        )}

        {/* Referral Program */}
        {activeTab === 'referrals' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <ReferralSystem userId={user?.id || ''} userType="user" />
          </motion.div>
        )}

        {/* My Reservations */}
        {activeTab === 'reservations' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <MyReservations userId={user?.id || ''} />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;