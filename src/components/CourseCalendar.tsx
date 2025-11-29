'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiMapPin,
  FiClock,
  FiUsers,
  FiBookOpen,
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiX,
  FiGrid,
  FiList,
  FiEye,
  FiDollarSign,
  FiStar,
  FiMove,
  FiCopy,
  FiCheck,
  FiAlertTriangle
} from 'react-icons/fi';
import { Course, CourseSchedule } from '@/types';
import { courseService, scheduleService } from '@/lib/database';
import { useAuth } from '@/lib/auth';
import Card from '@/components/Card';
import Link from 'next/link';
import HelmetReservationScanner from '@/components/HelmetReservationScanner';

interface CourseCalendarProps {
  onBookCourse?: (courseId: string) => void;
  showManagement?: boolean; // Show add/edit/delete options for coaches/admins
}

interface ScheduleFormData {
  courseId: string;
  startTime: Date;
  endTime: Date;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  location?: string;
  description?: string;
  maxParticipants?: number;
  price?: number;
  repeatDays?: number[]; // Array of day numbers (0=Sunday, 1=Monday, etc.)
}

interface BulkOperationData {
  operation: 'delete' | 'move' | 'duplicate';
  targetDate?: Date;
  selectedSchedules: string[];
}

type ViewMode = 'month' | 'week' | 'day' | 'list';
type FilterLevel = 'all' | 'beginner' | 'intermediate' | 'advanced';
type CalendarView = 'calendar' | 'timeline';

export default function CourseCalendar({ onBookCourse, showManagement = false }: CourseCalendarProps) {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [calendarView, setCalendarView] = useState<CalendarView>('calendar');
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<CourseSchedule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<CourseSchedule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannerSchedule, setScannerSchedule] = useState<CourseSchedule | null>(null);

  // Enhanced state for drag-and-drop and bulk operations
  const [draggedSchedule, setDraggedSchedule] = useState<CourseSchedule | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<Date | null>(null);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState<{
    show: boolean;
    type: 'delete' | 'move' | 'duplicate';
    message: string;
    onConfirm: () => void;
  }>({ show: false, type: 'delete', message: '', onConfirm: () => { } });

  const [formData, setFormData] = useState<ScheduleFormData>({
    courseId: '',
    startTime: new Date(),
    endTime: new Date(),
    level: 'all',
    location: '',
    description: '',
    maxParticipants: 15,
    price: 0,
    repeatDays: []
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [schedulesData, coursesData] = await Promise.all([
        scheduleService.getAll(),
        showManagement && user?.role === 'coach'
          ? courseService.getByCoach(user.id)
          : courseService.getAll()
      ]);

      setSchedules(schedulesData);
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCourseById = (courseId: string) => {
    return courses.find(course => course.id === courseId);
  };

  const getFilteredSchedules = () => {
    return schedules.filter(schedule => {
      const course = getCourseById(schedule.courseId);
      if (!course) return false;

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          course.title.toLowerCase().includes(searchLower) ||
          course.description.toLowerCase().includes(searchLower) ||
          course.coachName.toLowerCase().includes(searchLower) ||
          (schedule.location && schedule.location.toLowerCase().includes(searchLower)) ||
          (schedule.description && schedule.description.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;
      }

      // Filter by level
      if (filterLevel !== 'all' && schedule.level !== filterLevel) return false;

      // Filter by category
      if (filterCategory !== 'all' && course.category !== filterCategory) return false;

      // Filter by date range based on view mode
      const scheduleDate = schedule.startTime instanceof Date
        ? schedule.startTime
        : schedule.startTime.toDate();

      if (viewMode === 'day') {
        return isSameDay(scheduleDate, currentDate);
      } else if (viewMode === 'week') {
        return isInSameWeek(scheduleDate, currentDate);
      } else if (viewMode === 'list') {
        // For list view, show future schedules
        return scheduleDate >= new Date();
      } else {
        return isInSameMonth(scheduleDate, currentDate);
      }
    });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const isInSameWeek = (date1: Date, date2: Date) => {
    const startOfWeek = new Date(date2);
    startOfWeek.setDate(date2.getDate() - date2.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return date1 >= startOfWeek && date1 <= endOfWeek;
  };

  const isInSameMonth = (date1: Date, date2: Date) => {
    return date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
  };

  const formatTime = (date: Date | any) => {
    const actualDate = date instanceof Date ? date : date.toDate();
    return actualDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date | any) => {
    const actualDate = date instanceof Date ? date : date.toDate();
    return actualDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateDetailed = (date: Date | any) => {
    const actualDate = date instanceof Date ? date : date.toDate();
    return actualDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDayOfWeek = (date: Date | any) => {
    const actualDate = date instanceof Date ? date : date.toDate();
    return actualDate.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDayOfMonth = (date: Date | any) => {
    const actualDate = date instanceof Date ? date : date.toDate();
    return actualDate.getDate();
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());

    const days = [];
    const currentCalendarDate = new Date(startDate);

    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      days.push(new Date(currentCalendarDate));
      currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
    }

    return days;
  };

  const getSchedulesForDay = (date: Date) => {
    return filteredSchedules.filter(schedule => {
      const scheduleDate = schedule.startTime instanceof Date
        ? schedule.startTime
        : schedule.startTime.toDate();
      return isSameDay(scheduleDate, date);
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }

    setCurrentDate(newDate);
  };

  const getCalendarTitle = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      });
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const course = getCourseById(formData.courseId);
      if (!course) throw new Error('Course not found');

      if (editingSchedule) {
        // When editing, just update the single schedule
        const scheduleData = {
          courseId: formData.courseId,
          title: course.title,
          startTime: formData.startTime,
          endTime: formData.endTime,
          level: formData.level,
          location: formData.location,
          description: formData.description,
          createdBy: user.id
        };
        await scheduleService.update(editingSchedule.id, scheduleData);
      } else {
        // When creating new schedule
        if (formData.repeatDays && formData.repeatDays.length > 0) {
          // Create recurring schedules
          const schedulesToCreate = [];
          const startDate = new Date(formData.startTime);
          const endDate = new Date(formData.endTime);

          // Calculate the time difference to maintain duration
          const duration = endDate.getTime() - startDate.getTime();

          // Get the time components from the original dates
          const startHours = startDate.getHours();
          const startMinutes = startDate.getMinutes();
          const endHours = endDate.getHours();
          const endMinutes = endDate.getMinutes();

          // Find all dates within a reasonable range (e.g., next 12 weeks)
          const weeksToSchedule = 12;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          for (let week = 0; week < weeksToSchedule; week++) {
            for (const dayOfWeek of formData.repeatDays) {
              const scheduleDate = new Date(today);
              scheduleDate.setDate(today.getDate() + (week * 7) + (dayOfWeek - today.getDay() + 7) % 7);

              // Skip if the date is in the past
              if (scheduleDate < today) continue;

              // Create start and end times for this occurrence
              const occurrenceStart = new Date(scheduleDate);
              occurrenceStart.setHours(startHours, startMinutes, 0, 0);

              const occurrenceEnd = new Date(scheduleDate);
              occurrenceEnd.setHours(endHours, endMinutes, 0, 0);

              schedulesToCreate.push({
                courseId: formData.courseId,
                title: course.title,
                startTime: occurrenceStart,
                endTime: occurrenceEnd,
                level: formData.level,
                location: formData.location,
                description: formData.description,
                createdBy: user.id
              });
            }
          }

          // Create all schedules
          for (const scheduleData of schedulesToCreate) {
            await scheduleService.create(scheduleData);
          }
        } else {
          // Create single schedule
          const scheduleData = {
            courseId: formData.courseId,
            title: course.title,
            startTime: formData.startTime,
            endTime: formData.endTime,
            level: formData.level,
            location: formData.location,
            description: formData.description,
            createdBy: user.id
          };
          await scheduleService.create(scheduleData);
        }
      }

      await loadData();
      setIsModalOpen(false);
      setEditingSchedule(null);
      resetForm();
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSchedule = (schedule: CourseSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      courseId: schedule.courseId,
      startTime: schedule.startTime instanceof Date ? schedule.startTime : schedule.startTime.toDate(),
      endTime: schedule.endTime instanceof Date ? schedule.endTime : schedule.endTime.toDate(),
      level: schedule.level,
      location: schedule.location || '',
      description: schedule.description || '',
      maxParticipants: (schedule as any).maxParticipants || 15,
      price: (schedule as any).price || 0
    });
    setIsModalOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await scheduleService.delete(scheduleId);
        await loadData();
      } catch (error) {
        console.error('Error deleting schedule:', error);
      }
    }
  };

  // Enhanced drag-and-drop functionality
  const handleDragStart = (schedule: CourseSchedule) => {
    setDraggedSchedule(schedule);
  };

  const handleDragEnd = () => {
    setDraggedSchedule(null);
    setDropTargetDate(null);
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    setDropTargetDate(date);
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!draggedSchedule) return;

    const startTimeDate = draggedSchedule.startTime instanceof Date
      ? draggedSchedule.startTime
      : draggedSchedule.startTime.toDate();
    const endTimeDate = draggedSchedule.endTime instanceof Date
      ? draggedSchedule.endTime
      : draggedSchedule.endTime.toDate();
    const timeDiff = endTimeDate.getTime() - startTimeDate.getTime();

    const newStartTime = new Date(targetDate);
    newStartTime.setHours(
      draggedSchedule.startTime instanceof Date
        ? draggedSchedule.startTime.getHours()
        : draggedSchedule.startTime.toDate().getHours()
    );
    newStartTime.setMinutes(
      draggedSchedule.startTime instanceof Date
        ? draggedSchedule.startTime.getMinutes()
        : draggedSchedule.startTime.toDate().getMinutes()
    );

    const newEndTime = new Date(newStartTime.getTime() + timeDiff);

    try {
      await scheduleService.update(draggedSchedule.id, {
        ...draggedSchedule,
        startTime: newStartTime,
        endTime: newEndTime
      });
      await loadData();
      setConfirmationModal({
        show: true,
        type: 'move',
        message: `Course successfully moved to ${targetDate.toLocaleDateString()}`,
        onConfirm: () => setConfirmationModal({ ...confirmationModal, show: false })
      });
    } catch (error) {
      console.error('Error moving schedule:', error);
    }

    setDraggedSchedule(null);
    setDropTargetDate(null);
  };

  // Bulk operations
  const toggleScheduleSelection = (scheduleId: string) => {
    const newSelection = new Set(selectedScheduleIds);
    if (newSelection.has(scheduleId)) {
      newSelection.delete(scheduleId);
    } else {
      newSelection.add(scheduleId);
    }
    setSelectedScheduleIds(newSelection);
  };

  const handleBulkDelete = () => {
    setConfirmationModal({
      show: true,
      type: 'delete',
      message: `Are you sure you want to delete ${selectedScheduleIds.size} selected schedule(s)?`,
      onConfirm: async () => {
        try {
          await Promise.all(
            Array.from(selectedScheduleIds).map(id => scheduleService.delete(id))
          );
          await loadData();
          setSelectedScheduleIds(new Set());
          setBulkMode(false);
        } catch (error) {
          console.error('Error deleting schedules:', error);
        }
        setConfirmationModal({ ...confirmationModal, show: false });
      }
    });
  };

  const handleBulkMove = (targetDate: Date) => {
    setConfirmationModal({
      show: true,
      type: 'move',
      message: `Move ${selectedScheduleIds.size} selected schedule(s) to ${targetDate.toLocaleDateString()}?`,
      onConfirm: async () => {
        try {
          const selectedSchedules = schedules.filter(s => selectedScheduleIds.has(s.id));
          await Promise.all(
            selectedSchedules.map(schedule => {
              const originalStart = schedule.startTime instanceof Date
                ? schedule.startTime
                : schedule.startTime.toDate();
              const originalEnd = schedule.endTime instanceof Date
                ? schedule.endTime
                : schedule.endTime.toDate();

              const newStartTime = new Date(targetDate);
              newStartTime.setHours(originalStart.getHours());
              newStartTime.setMinutes(originalStart.getMinutes());

              const timeDiff = originalEnd.getTime() - originalStart.getTime();
              const newEndTime = new Date(newStartTime.getTime() + timeDiff);

              return scheduleService.update(schedule.id, {
                ...schedule,
                startTime: newStartTime,
                endTime: newEndTime
              });
            })
          );
          await loadData();
          setSelectedScheduleIds(new Set());
          setBulkMode(false);
        } catch (error) {
          console.error('Error moving schedules:', error);
        }
        setConfirmationModal({ ...confirmationModal, show: false });
      }
    });
  };

  const handleBulkDuplicate = (targetDate: Date) => {
    setConfirmationModal({
      show: true,
      type: 'duplicate',
      message: `Duplicate ${selectedScheduleIds.size} selected schedule(s) to ${targetDate.toLocaleDateString()}?`,
      onConfirm: async () => {
        try {
          const selectedSchedules = schedules.filter(s => selectedScheduleIds.has(s.id));
          await Promise.all(
            selectedSchedules.map(schedule => {
              const originalStart = schedule.startTime instanceof Date
                ? schedule.startTime
                : schedule.startTime.toDate();
              const originalEnd = schedule.endTime instanceof Date
                ? schedule.endTime
                : schedule.endTime.toDate();

              const newStartTime = new Date(targetDate);
              newStartTime.setHours(originalStart.getHours());
              newStartTime.setMinutes(originalStart.getMinutes());

              const timeDiff = originalEnd.getTime() - originalStart.getTime();
              const newEndTime = new Date(newStartTime.getTime() + timeDiff);

              // Create new schedule without ID (will be auto-generated)
              const { id, ...scheduleData } = schedule;
              return scheduleService.create({
                ...scheduleData,
                startTime: newStartTime,
                endTime: newEndTime
              } as any);
            })
          );
          await loadData();
          setSelectedScheduleIds(new Set());
          setBulkMode(false);
        } catch (error) {
          console.error('Error duplicating schedules:', error);
        }
        setConfirmationModal({ ...confirmationModal, show: false });
      }
    });
  };

  const resetForm = () => {
    setFormData({
      courseId: '',
      startTime: new Date(),
      endTime: new Date(),
      level: 'all',
      location: '',
      description: '',
      maxParticipants: 15,
      price: 0,
      repeatDays: []
    });
  };

  const categories = [
    'Afrobeat', 'Hip-Hop', 'Contemporary', 'Salsa', 'Bachata',
    'Kizomba', 'Jazz', 'Ballet', 'Breakdance', 'Latin'
  ];

  const filteredSchedules = getFilteredSchedules();

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intermediate':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'advanced':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getCalendarStats = () => {
    const totalSchedules = filteredSchedules.length;
    const upcomingSchedules = filteredSchedules.filter(s => {
      const scheduleDate = s.startTime instanceof Date ? s.startTime : s.startTime.toDate();
      return scheduleDate > new Date();
    }).length;

    const levelCounts = filteredSchedules.reduce((acc, schedule) => {
      acc[schedule.level] = (acc[schedule.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryCount = new Set(
      filteredSchedules.map(s => getCourseById(s.courseId)?.category).filter(Boolean)
    ).size;

    return {
      total: totalSchedules,
      upcoming: upcomingSchedules,
      levelCounts,
      categories: categoryCount
    };
  };

  const CalendarStats = () => {
    const stats = getCalendarStats();

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-[#D91CD2]/20 to-[#7000FF]/20 p-4 rounded-lg border border-[#D91CD2]/30">
          <div className="text-2xl font-bold text-[#D91CD2]">{stats.total}</div>
          <div className="text-sm text-gray-400">{t('totalSessions')}</div>
        </div>
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 rounded-lg border border-green-500/30">
          <div className="text-2xl font-bold text-green-400">{stats.upcoming}</div>
          <div className="text-sm text-gray-400">{t('upcoming')}</div>
        </div>
        <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-4 rounded-lg border border-blue-500/30">
          <div className="text-2xl font-bold text-blue-400">{stats.categories}</div>
          <div className="text-sm text-gray-400">{t('categories')}</div>
        </div>
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-4 rounded-lg border border-yellow-500/30">
          <div className="text-2xl font-bold text-yellow-400">
            {Object.keys(stats.levelCounts).length}
          </div>
          <div className="text-sm text-gray-400">{t('skillLevels')}</div>
        </div>
      </div>
    );
  };

  if (isLoading && schedules.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col space-y-4 sm:space-y-6">
          {/* Header Section */}
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
            <h2 className="text-xl sm:text-2xl font-bold gradient-text">{t('courseCalendar')}</h2>

            {showManagement && user?.role === 'coach' && (
              <button
                onClick={() => {
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                <FiPlus size={20} />
                <span>{t('scheduleCourse')}</span>
              </button>
            )}
          </div>

          {/* Controls Section */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="w-full">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiFilter className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder={t('searchCoursesCoachesLocations')}
                  className="input-primary w-full pl-10 text-sm sm:text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* View Mode and Calendar Toggle Row */}
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 sm:items-center">
              {/* View Mode Selector */}
              <div className="flex-1 bg-black/40 rounded-lg p-1 min-w-0">
                {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`flex-1 min-w-[120px] px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 ${viewMode === mode
                        ? 'bg-[#D91CD2] text-white'
                        : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    {mode === 'list' ? <FiList size={16} /> : <FiCalendar size={16} />}
                    <span className="truncate">{t(mode)}</span>
                  </button>
                ))}
              </div>

              {/* Calendar View Toggle for Month/Week view */}
              {(viewMode === 'month' || viewMode === 'week') && (
                <div className="flex bg-black/40 rounded-lg p-1 min-w-0">
                  <button
                    onClick={() => setCalendarView('calendar')}
                    className={`flex-1 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 ${calendarView === 'calendar'
                        ? 'bg-[#D91CD2] text-white'
                        : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    <FiGrid size={16} />
                    <span className="hidden sm:inline">{t('grid')}</span>
                  </button>
                  <button
                    onClick={() => setCalendarView('timeline')}
                    className={`flex-1 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 ${calendarView === 'timeline'
                        ? 'bg-[#D91CD2] text-white'
                        : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    <FiList size={16} />
                    <span className="hidden sm:inline">{t('timeline')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Management Controls */}
            {showManagement && user?.role === 'coach' && (
              <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 sm:items-center">
                <button
                  onClick={() => setBulkMode(!bulkMode)}
                  className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${bulkMode
                      ? 'bg-[#D91CD2] text-white'
                      : 'bg-black/40 text-gray-400 hover:text-white border border-gray-600'
                    }`}
                >
                  <FiCheck size={16} />
                  <span>{t('bulkSelect')}</span>
                  <span>({selectedScheduleIds.size})</span>
                </button>

                {bulkMode && selectedScheduleIds.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-red-500/20 text-red-400 border border-red-400/30 hover:bg-red-500/30 transition-colors"
                  >
                    <FiTrash2 size={16} />
                    <span>{t('delete')}</span>
                    <span>({selectedScheduleIds.size})</span>
                  </button>
                )}
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as FilterLevel)}
                className="input-primary text-sm w-full sm:w-auto sm:min-w-[120px]"
              >
                <option value="all">{t('allLevels')}</option>
                <option value="beginner">{t('beginner')}</option>
                <option value="intermediate">{t('intermediate')}</option>
                <option value="advanced">{t('advanced')}</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="input-primary text-sm w-full sm:w-auto sm:min-w-[120px]"
              >
                <option value="all">{t('allCategories')}</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Calendar Statistics */}
          <CalendarStats />

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FiChevronLeft size={20} />
            </button>

            <h3 className="text-base sm:text-lg font-semibold text-center px-4">{getCalendarTitle()}</h3>

            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FiChevronRight size={20} />
            </button>
          </div>

          {/* Calendar View */}
          <div className="space-y-4">
            {viewMode === 'list' ? (
              /* List View */
              <div className="space-y-4">
                {filteredSchedules.length > 0 ? (
                  filteredSchedules
                    .sort((a, b) => {
                      const dateA = a.startTime instanceof Date ? a.startTime : a.startTime.toDate();
                      const dateB = b.startTime instanceof Date ? b.startTime : b.startTime.toDate();
                      return dateA.getTime() - dateB.getTime();
                    })
                    .map((schedule) => {
                      const course = getCourseById(schedule.courseId);
                      if (!course) return null;

                      return (
                        <motion.div
                          key={schedule.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          draggable={showManagement && user?.role === 'coach'}
                          onDragStart={() => handleDragStart(schedule)}
                          onDragEnd={handleDragEnd}
                          className={`bg-black/40 rounded-lg p-4 sm:p-6 border border-gray-700/30 hover:border-[#D91CD2]/30 transition-colors relative ${draggedSchedule?.id === schedule.id ? 'opacity-50' : ''
                            } ${selectedScheduleIds.has(schedule.id) ? 'ring-2 ring-[#D91CD2]' : ''
                            } ${showManagement && user?.role === 'coach' ? 'cursor-move' : ''
                            }`}
                        >
                          {/* Bulk Selection Checkbox */}
                          {bulkMode && showManagement && user?.role === 'coach' && (
                            <div className="absolute top-4 left-4 z-10">
                              <input
                                type="checkbox"
                                checked={selectedScheduleIds.has(schedule.id)}
                                onChange={() => toggleScheduleSelection(schedule.id)}
                                className="w-4 h-4 sm:w-5 sm:h-5 text-[#D91CD2] bg-black/60 border-gray-600 rounded focus:ring-[#D91CD2] focus:ring-2"
                              />
                            </div>
                          )}

                          {/* Drag Indicator */}
                          {showManagement && user?.role === 'coach' && !bulkMode && (
                            <div className="absolute top-4 right-4 text-gray-500">
                              <FiMove size={20} />
                            </div>
                          )}

                          <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-4 lg:gap-6">
                            {/* Course Image & Basic Info */}
                            <div className="lg:col-span-1">
                              <img
                                src={course.imageUrl}
                                alt={course.title}
                                className="w-full h-32 object-cover rounded-lg mb-4"
                              />
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs border ${getLevelColor(schedule.level)}`}>
                                  {schedule.level}
                                </span>
                                <span className="text-sm text-gray-400">{course.category}</span>
                              </div>
                            </div>

                            {/* Course Details */}
                            <div className="lg:col-span-2">
                              <h4 className="font-bold text-lg sm:text-xl mb-2 text-white pr-8 lg:pr-0">{course.title}</h4>
                              <p className="text-gray-300 mb-4 text-sm sm:text-base line-clamp-2">{course.description}</p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                                <div className="flex items-center text-gray-400">
                                  <FiCalendar className="mr-2 text-[#D91CD2] flex-shrink-0" />
                                  <span className="truncate">{formatDate(schedule.startTime)}</span>
                                </div>
                                <div className="flex items-center text-gray-400">
                                  <FiClock className="mr-2 text-[#D91CD2] flex-shrink-0" />
                                  <span className="truncate">{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                                </div>
                                <div className="flex items-center text-gray-400">
                                  <FiUsers className="mr-2 text-[#D91CD2] flex-shrink-0" />
                                  <span className="truncate">{t('coach')}: {course.coachName}</span>
                                </div>
                                {schedule.location && (
                                  <div className="flex items-center text-gray-400">
                                    <FiMapPin className="mr-2 text-[#D91CD2] flex-shrink-0" />
                                    <span className="truncate">{schedule.location}</span>
                                  </div>
                                )}
                                <div className="flex items-center text-gray-400">
                                  <FiStar className="mr-2 text-[#D91CD2] flex-shrink-0" />
                                  <span className="truncate">{course.averageRating.toFixed(1)} ({course.totalReviews} {t('reviews')})</span>
                                </div>
                                <div className="flex items-center text-gray-400">
                                  <FiUsers className="mr-2 text-[#D91CD2] flex-shrink-0" />
                                  <span className="truncate">{course.currentStudents}/{course.maxStudents} {t('enrolled')}</span>
                                </div>
                              </div>

                              {schedule.description && (
                                <div className="mt-4">
                                  <p className="text-sm text-gray-400">{schedule.description}</p>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="lg:col-span-1 flex flex-col justify-between">
                              <div className="text-center lg:text-right mb-4">
                                <div className="text-xl sm:text-2xl font-bold text-[#D91CD2] mb-2">
                                  ${course.price}
                                </div>
                                <div className="text-sm text-gray-400">{t('perSession')}</div>
                              </div>

                              <div className="space-y-2">
                                <Link
                                  href={`/courses/${course.id}`}
                                  className="btn-secondary w-full text-center text-sm flex items-center justify-center gap-2"
                                >
                                  <FiEye size={16} />
                                  {t('viewDetails')}
                                </Link>

                                {onBookCourse && (
                                  <button
                                    onClick={() => onBookCourse(course.id)}
                                    className="btn-primary w-full text-sm"
                                  >
                                    {t('bookNow')}
                                  </button>
                                )}

                                {showManagement && user?.role === 'coach' && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleEditSchedule(schedule)}
                                      className="flex-1 p-2 hover:bg-white/10 rounded-lg transition-colors border border-gray-600 flex items-center justify-center gap-1"
                                      title={t('editSchedule')}
                                    >
                                      <FiEdit3 size={16} />
                                      <span className="text-xs hidden sm:inline">{t('edit')}</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSchedule(schedule.id)}
                                      className="flex-1 p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 border border-red-400/30 flex items-center justify-center gap-1"
                                      title={t('deleteSchedule')}
                                    >
                                      <FiTrash2 size={16} />
                                      <span className="text-xs hidden sm:inline">{t('delete')}</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        const targetDate = new Date();
                                        targetDate.setDate(targetDate.getDate() + 7);
                                        handleBulkDuplicate(targetDate);
                                      }}
                                      className="flex-1 p-2 hover:bg-blue-500/20 rounded-lg transition-colors text-blue-400 border border-blue-400/30 flex items-center justify-center gap-1"
                                      title={t('duplicateSchedule')}
                                    >
                                      <FiCopy size={16} />
                                      <span className="text-xs hidden sm:inline">{t('copy')}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                ) : (
                  <div className="bg-black/40 p-6 sm:p-8 rounded-lg text-center">
                    <FiCalendar size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-400 mb-4">{t('noCoursesFound')}</p>
                    {showManagement && user?.role === 'coach' && (
                      <button
                        onClick={() => {
                          resetForm();
                          setIsModalOpen(true);
                        }}
                        className="btn-primary w-full sm:w-auto"
                      >
                        {t('scheduleYourFirstCourse')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : viewMode === 'month' && calendarView === 'calendar' ? (
              /* Month Calendar Grid View */
              <div className="bg-black/20 rounded-lg overflow-hidden">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 gap-0 bg-gray-800/50">
                  {[t('Sun'), t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat')].map(day => (
                    <div key={day} className="p-2 sm:p-3 text-center font-medium text-gray-300 border-r border-gray-700 last:border-r-0">
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden text-xs">{day.slice(0, 1)}</span>
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-0">
                  {getCalendarDays().map((day, index) => {
                    const daySchedules = getSchedulesForDay(day);
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = isSameDay(day, new Date());
                    const isDropTarget = dropTargetDate && isSameDay(dropTargetDate, day);

                    return (
                      <div
                        key={index}
                        onDragOver={(e) => handleDragOver(e, day)}
                        onDrop={(e) => handleDrop(e, day)}
                        className={`min-h-16 sm:min-h-24 p-1 sm:p-2 border-r border-b border-gray-700 last:border-r-0 transition-colors ${isCurrentMonth ? 'bg-black/40' : 'bg-gray-900/20'
                          } ${isToday ? 'bg-[#D91CD2]/10 border-[#D91CD2]/30' : ''} ${isDropTarget ? 'bg-green-500/20 border-green-400' : ''
                          } ${showManagement && user?.role === 'coach' && draggedSchedule ? 'hover:bg-blue-500/10' : ''
                          }`}
                      >
                        <div className={`text-xs sm:text-sm font-medium mb-1 flex items-center justify-between ${isCurrentMonth ? 'text-white' : 'text-gray-500'
                          } ${isToday ? 'text-[#D91CD2]' : ''}`}>
                          <span>{getDayOfMonth(day)}</span>
                          {isDropTarget && draggedSchedule && (
                            <div className="text-green-400 text-xs hidden sm:inline">{t('dropHere')}</div>
                          )}
                        </div>

                        <div className="space-y-1">
                          {daySchedules.slice(0, window.innerWidth < 640 ? 1 : 2).map((schedule, idx) => {
                            const course = getCourseById(schedule.courseId);
                            if (!course) return null;

                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedSchedule(schedule)}
                                draggable={showManagement && user?.role === 'coach'}
                                onDragStart={() => handleDragStart(schedule)}
                                onDragEnd={handleDragEnd}
                                className={`text-xs p-1 rounded cursor-pointer truncate border ${getLevelColor(schedule.level)} hover:opacity-80 transition-opacity ${draggedSchedule?.id === schedule.id ? 'opacity-50' : ''
                                  } ${selectedScheduleIds.has(schedule.id) ? 'ring-1 ring-[#D91CD2]' : ''
                                  } ${showManagement && user?.role === 'coach' ? 'cursor-move' : ''
                                  }`}
                              >
                                {bulkMode && showManagement && user?.role === 'coach' && (
                                  <input
                                    type="checkbox"
                                    checked={selectedScheduleIds.has(schedule.id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleScheduleSelection(schedule.id);
                                    }}
                                    className="w-2 h-2 sm:w-3 sm:h-3 mr-1 text-[#D91CD2] bg-black/60 border-gray-600 rounded"
                                  />
                                )}
                                <span className="hidden sm:inline">{formatTime(schedule.startTime)} </span>
                                <span className="truncate">{course.title}</span>
                              </div>
                            );
                          })}
                          {daySchedules.length > (window.innerWidth < 640 ? 1 : 2) && (
                            <div className="text-xs text-gray-400 font-medium">
                              +{daySchedules.length - (window.innerWidth < 640 ? 1 : 2)} {t('more')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Timeline View for Week/Month and Week/Day views */
              <div className="space-y-4">
                {filteredSchedules.length > 0 ? (
                  filteredSchedules
                    .sort((a, b) => {
                      const dateA = a.startTime instanceof Date ? a.startTime : a.startTime.toDate();
                      const dateB = b.startTime instanceof Date ? b.startTime : b.startTime.toDate();
                      return dateA.getTime() - dateB.getTime();
                    })
                    .map((schedule) => {
                      const course = getCourseById(schedule.courseId);
                      if (!course) return null;

                      return (
                        <motion.div
                          key={schedule.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-black/40 rounded-lg p-4 border border-gray-700/30 hover:border-[#D91CD2]/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedSchedule(schedule)}
                        >
                          <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                                <h4 className="font-semibold text-base sm:text-lg truncate">{course.title}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs border ${getLevelColor(schedule.level)} self-start`}>
                                  {schedule.level}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 text-sm">
                                <div className="flex items-center text-gray-400">
                                  <FiCalendar className="mr-2 flex-shrink-0" />
                                  <span className="truncate">{formatDate(schedule.startTime)}</span>
                                </div>
                                <div className="flex items-center text-gray-400">
                                  <FiClock className="mr-2 flex-shrink-0" />
                                  <span className="truncate">{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                                </div>
                                {schedule.location && (
                                  <div className="flex items-center text-gray-400">
                                    <FiMapPin className="mr-2 flex-shrink-0" />
                                    <span className="truncate">{schedule.location}</span>
                                  </div>
                                )}
                                <div className="flex items-center text-gray-400">
                                  <FiUsers className="mr-2 flex-shrink-0" />
                                  <span className="truncate">{course.currentStudents}/{course.maxStudents}</span>
                                </div>
                                <div className="flex items-center text-gray-400">
                                  <FiDollarSign className="mr-2 flex-shrink-0" />
                                  <span className="truncate">${course.price}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                              {onBookCourse && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onBookCourse(course.id);
                                  }}
                                  className="btn-primary text-sm px-4 py-2"
                                >
                                  {t('bookNow')}
                                </button>
                              )}

                              {showManagement && user?.role === 'coach' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditSchedule(schedule);
                                    }}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    title={t('editSchedule')}
                                  >
                                    <FiEdit3 size={16} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSchedule(schedule.id);
                                    }}
                                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                                    title={t('deleteSchedule')}
                                  >
                                    <FiTrash2 size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                ) : (
                  <div className="bg-black/40 p-6 sm:p-8 rounded-lg text-center">
                    <FiCalendar size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-400 mb-4">{t('noCoursesScheduled')}</p>
                    {showManagement && user?.role === 'coach' && (
                      <button
                        onClick={() => {
                          resetForm();
                          setIsModalOpen(true);
                        }}
                        className="btn-primary w-full sm:w-auto"
                      >
                        {t('scheduleYourFirstCourse')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
      {/* Schedule Detail Modal */}
      <AnimatePresence>
        {selectedSchedule && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-black border border-[#D91CD2]/20 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              {(() => {
                const course = getCourseById(selectedSchedule.courseId);
                if (!course) return null;

                return (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold gradient-text">{course.title}</h3>
                      <button
                        onClick={() => setSelectedSchedule(null)}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        <FiX size={20} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <img
                        src={course.imageUrl}
                        alt={course.title}
                        className="w-full h-40 object-cover rounded-lg"
                      />

                      <p className="text-gray-300">{course.description}</p>

                      <div className="space-y-2">
                        <div className="flex items-center">
                          <FiCalendar className="mr-2 text-[#D91CD2]" />
                          <span>{formatDate(selectedSchedule.startTime)}</span>
                        </div>
                        <div className="flex items-center">
                          <FiClock className="mr-2 text-[#D91CD2]" />
                          <span>{formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}</span>
                        </div>
                        {selectedSchedule.location && (
                          <div className="flex items-center">
                            <FiMapPin className="mr-2 text-[#D91CD2]" />
                            <span>{selectedSchedule.location}</span>
                          </div>
                        )}
                        <div className="max-h-40 overflow-y-auto">
                          <div className="flex items-center"></div>
                          <span>{course.currentStudents}/{course.maxStudents} {t('students')}</span>
                        </div>
                      </div>

                      {selectedSchedule.description && (
                        <div>
                          <h4 className="font-semibold mb-2">{t('additionalInformation')}</h4>
                          <p className="text-gray-400 text-sm">{selectedSchedule.description}</p>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-4">
                        <span className={`px-3 py-1 rounded-full text-sm border ${getLevelColor(selectedSchedule.level)}`}>
                          {selectedSchedule.level} {t('level')}
                        </span>
                        <span className="text-xl font-bold text-[#D91CD2]">{course.price} CHF</span>
                      </div>

                      {onBookCourse && (
                        <button
                          onClick={() => {
                            onBookCourse(course.id);
                            setSelectedSchedule(null);
                          }}
                          className="btn-primary w-full"
                        >
                          {t('bookThisCourse')}
                        </button>
                      )}

                      {/* Scan QR Button for Coaches */}
                      {showManagement && user?.role === 'coach' && (
                        <button
                          onClick={() => {
                            setScannerSchedule(selectedSchedule);
                            setShowScanner(true);
                            setSelectedSchedule(null);
                          }}
                          className="btn-secondary w-full mt-3 flex items-center justify-center space-x-2"
                        >
                          <FiEye size={18} />
                          <span>{t('Scan Reservations')}</span>
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Helmet Reservation Scanner */}
      {scannerSchedule && (
        <HelmetReservationScanner
          isOpen={showScanner}
          onClose={() => {
            setShowScanner(false);
            setScannerSchedule(null);
          }}
          schedule={scannerSchedule}
        />
      )}

      {/* Schedule Form Modal */}
      <AnimatePresence>
        {isModalOpen && showManagement && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-black border border-[#D91CD2]/20 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold gradient-text mb-6">
                {editingSchedule ? t('editSchedule') : t('scheduleCourse')}
              </h3>

              <form onSubmit={handleScheduleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">{t('course')}</label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => setFormData(prev => ({ ...prev, courseId: e.target.value }))}
                    required
                    className="input-primary w-full"
                  >
                    <option value="">{t('selectACourse')}</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">{t('startTime')}</label>
                    <input
                      type="datetime-local"
                      value={formData.startTime.toISOString().slice(0, 16)}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: new Date(e.target.value) }))}
                      required
                      className="input-primary w-full text-white"
                      style={{ colorScheme: "dark" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">{t('endTime')}</label>
                    <input
                      type="datetime-local"
                      value={formData.endTime.toISOString().slice(0, 16)}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: new Date(e.target.value) }))}
                      required
                      className="input-primary w-full text-white"
                      style={{ colorScheme: "dark" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">{t('level')}</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value as any }))}
                    required
                    className="input-primary w-full"
                  >
                    <option value="all">{t('allLevels')}</option>
                    <option value="beginner">{t('beginner')}</option>
                    <option value="intermediate">{t('intermediate')}</option>
                    <option value="advanced">{t('advanced')}</option>
                  </select>
                </div>

                {/* Recurring Days Multi-Select - Only show when creating new schedule */}
                {!editingSchedule && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      {t('repeat')} ({t('optional')})
                    </label>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 0, label: t('everySunday') || 'Every Sunday' },
                          { value: 1, label: t('everyMonday') || 'Every Monday' },
                          { value: 2, label: t('everyTuesday') || 'Every Tuesday' },
                          { value: 3, label: t('everyWednesday') || 'Every Wednesday' },
                          { value: 4, label: t('everyThursday') || 'Every Thursday' },
                          { value: 5, label: t('everyFriday') || 'Every Friday' },
                          { value: 6, label: t('everySaturday') || 'Every Saturday' },
                        ].map((day) => (
                          <label
                            key={day.value}
                            className="flex items-center space-x-2 p-2 rounded-lg bg-black/40 border border-gray-700 hover:border-[#D91CD2]/50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={formData.repeatDays?.includes(day.value) || false}
                              onChange={(e) => {
                                const currentDays = formData.repeatDays || [];
                                if (e.target.checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    repeatDays: [...currentDays, day.value].sort()
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    repeatDays: currentDays.filter(d => d !== day.value)
                                  }));
                                }
                              }}
                              className="w-4 h-4 text-[#D91CD2] bg-gray-700 border-gray-600 rounded focus:ring-[#D91CD2] focus:ring-2"
                            />
                            <span className="text-sm text-white">{day.label}</span>
                          </label>
                        ))}
                      </div>
                      {formData.repeatDays && formData.repeatDays.length > 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                          {t('schedulesWillBeCreatedForNext12Weeks') || 'Schedules will be created for the next 12 weeks on selected days'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white mb-2">{t('location')} ({t('optional')})</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="input-primary w-full"
                    placeholder={t('e.g.StudioA,Online')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">{t('additionalNotes')} ({t('optional')})</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="input-primary w-full h-20"
                    placeholder={t('anyAdditionalInformationForStudents')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-white mb-2">{t('maxParticipants')} ({t('optional')})</label>
                    <input
                      type="number"
                      value={formData.maxParticipants}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 0 }))}
                      className="input-primary w-full"
                      placeholder={t('leaveEmptyToUseCourseDefault')}
                      min="1"
                      max="50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">{t('sessionPrice')} ({t('optional')})</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="input-primary w-full"
                      placeholder={t('leaveEmptyToUseCourseDefault')}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingSchedule(null);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary"
                  >
                    {isLoading ? t('saving') : editingSchedule ? t('updateSchedule') : t('createSchedule')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmationModal.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-700"
            >
              <div className="flex items-center gap-3 mb-4">
                <FiAlertTriangle className="text-yellow-400" size={24} />
                <h3 className="text-xl font-bold text-white">{t('confirmAction')}</h3>
              </div>

              <p className="text-gray-300 mb-6">{confirmationModal.message}</p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmationModal({ ...confirmationModal, show: false })}
                  className="btn-secondary flex-1"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={confirmationModal.onConfirm}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${confirmationModal.type === 'delete'
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-[#D91CD2] hover:bg-[#B91CA8] text-white'
                    }`}
                >
                  {confirmationModal.type === 'delete' ? t('delete') :
                    confirmationModal.type === 'move' ? t('move') : t('duplicate')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Operations Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">{t('bulkOperations')}</h3>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX size={24} />
                </button>
              </div>

              <p className="text-gray-300 mb-6">
                {t('selectActionFor', { count: selectedScheduleIds.size })}
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">{t('targetDate')}</label>
                  <input
                    type="date"
                    className="input-primary w-full"
                    onChange={(e) => {
                      const targetDate = new Date(e.target.value);
                      if (targetDate > new Date()) {
                        // Store the selected date for operations
                        (window as any).bulkTargetDate = targetDate;
                      }
                    }}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const targetDate = (window as any).bulkTargetDate || new Date();
                      targetDate.setDate(targetDate.getDate() + 7);
                      handleBulkMove(targetDate);
                      setShowBulkModal(false);
                    }}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <FiMove size={16} />
                    {t('move')}
                  </button>
                  <button
                    onClick={() => {
                      const targetDate = (window as any).bulkTargetDate || new Date();
                      targetDate.setDate(targetDate.getDate() + 7);
                      handleBulkDuplicate(targetDate);
                      setShowBulkModal(false);
                    }}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <FiCopy size={16} />
                    {t('duplicate')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}