'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FiX,
  FiUser,
  FiCalendar,
  FiFileText,
  FiLoader,
  FiCheckCircle,
  FiBook,
  FiSearch,
  FiDollarSign,
  FiPercent,
  FiGift
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { courseService, scheduleService, userService } from '@/lib/database';
import { Course, User, CourseSchedule } from '@/types';

interface SimplifiedDiscountCardModalProps {
  onClose: () => void;
  onSubmit: (cardData: {
    userId?: string;
    userEmail?: string;
    userName?: string;
    courseId?: string;
    recurringSchedule?: string[];
    advantageType: 'free' | 'special_price' | 'percentage_discount';
    value?: number;
    expirationDate: string;
    description?: string;
  }) => void;
  coachId: string;
  editingCard?: any; // DiscountCard for editing
}

export default function SimplifiedDiscountCardModal({
  onClose,
  onSubmit,
  coachId,
  editingCard
}: SimplifiedDiscountCardModalProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // Form state
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseSchedules, setCourseSchedules] = useState<CourseSchedule[]>([]);
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  const [advantageType, setAdvantageType] = useState<'free' | 'special_price' | 'percentage_discount'>('free');
  const [value, setValue] = useState<number>(0);
  const [expirationDate, setExpirationDate] = useState('');
  const [description, setDescription] = useState('');
  
  const searchRef = useRef<HTMLDivElement>(null);

  // Load courses
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const allCourses = await courseService.getAll();
        const coachCourses = allCourses.filter(c => c.coachId === coachId);
        setCourses(coachCourses);
      } catch (error) {
        console.error('Error loading courses:', error);
      }
    };
    loadCourses();
  }, [coachId]);

  // Load course schedules when course is selected
  useEffect(() => {
    const loadSchedules = async () => {
      if (!selectedCourse?.id) {
        setCourseSchedules([]);
        setSelectedSchedules([]);
        return;
      }
      
      try {
        const schedules = await scheduleService.getByCourse(selectedCourse.id);
        setCourseSchedules(schedules);
      } catch (error) {
        console.error('Error loading schedules:', error);
        setCourseSchedules([]);
      }
    };
    loadSchedules();
  }, [selectedCourse]);

  // Initialize form if editing
  useEffect(() => {
    if (editingCard) {
      // Load student if exists
      if (editingCard.userEmail) {
        // Try to find user by email
        userService.getByEmail(editingCard.userEmail).then(user => {
          if (user) {
            setSelectedStudent(user);
            setStudentSearch(`${user.firstName} ${user.lastName}`);
          }
        }).catch(() => {});
      }
      
      // Load course if exists
      if (editingCard.courseId) {
        const course = courses.find(c => c.id === editingCard.courseId);
        if (course) {
          setSelectedCourse(course);
        }
      }
      
      // Set other fields
      setAdvantageType(editingCard.advantageType || 'free');
      setValue(editingCard.value || editingCard.discountPercentage || 0);
      setExpirationDate(editingCard.expiryDate ? new Date(editingCard.expiryDate).toISOString().split('T')[0] : '');
      setDescription(editingCard.description || '');
      setSelectedSchedules(editingCard.recurringSchedule || []);
    } else {
      // Set default expiration date (6 months from now)
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      setExpirationDate(sixMonthsFromNow.toISOString().split('T')[0]);
    }
  }, [editingCard, courses]);

  // Search users
  const searchUsers = async (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      // First try exact email match
      try {
        const exactEmailUser = await userService.getByEmail(term);
        if (exactEmailUser && exactEmailUser.email.toLowerCase() === term.toLowerCase()) {
          setSearchResults([exactEmailUser]);
          setShowSearchResults(true);
          return;
        }
      } catch (e) {
        // Continue with general search
      }
      
      // Search by name - get all users and filter
      const allUsers = await userService.getAll();
      const searchLower = term.toLowerCase();
      const filtered = allUsers
        .filter(user => 
          `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
        )
        .slice(0, 10);
      
      setSearchResults(filtered);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
  };

  // Handle search input
  useEffect(() => {
    if (studentSearch.length >= 2) {
      const timer = setTimeout(() => searchUsers(studentSearch), 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [studentSearch]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get unique schedule time slots from course schedules
  const getUniqueTimeSlots = (): Array<{id: string; label: string; schedule: CourseSchedule}> => {
    const slotsMap = new Map<string, {id: string; label: string; schedule: CourseSchedule}>();
    
    courseSchedules.forEach(schedule => {
      const startTime = schedule.startTime instanceof Date 
        ? schedule.startTime 
        : (schedule.startTime as any)?.toDate?.() || new Date();
      const endTime = schedule.endTime instanceof Date 
        ? schedule.endTime 
        : (schedule.endTime as any)?.toDate?.() || new Date();
      
      const dayName = startTime.toLocaleDateString('fr-FR', { weekday: 'long' });
      const startTimeStr = startTime.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      const endTimeStr = endTime.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      const slotKey = `${dayName}-${startTimeStr}-${endTimeStr}`;
      const slotId = schedule.id;
      
      if (!slotsMap.has(slotKey)) {
        slotsMap.set(slotKey, {
          id: slotId,
          label: `${dayName} – ${startTimeStr} - ${endTimeStr}`,
          schedule
        });
      }
    });
    
    return Array.from(slotsMap.values()).sort((a, b) => {
      // Sort by day of week, then by time
      const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayA = days.indexOf(a.label.split(' – ')[0]);
      const dayB = days.indexOf(b.label.split(' – ')[0]);
      if (dayA !== dayB && dayA !== -1 && dayB !== -1) return dayA - dayB;
      return a.label.localeCompare(b.label);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const newErrors: {[key: string]: string} = {};
    
    if (!selectedStudent) {
      newErrors.student = t('Please select a student');
    }
    
    if (!selectedCourse) {
      newErrors.course = t('Please select a course');
    }
    
    if (selectedSchedules.length === 0) {
      newErrors.schedule = t('Please select at least one recurring schedule');
    }
    
    if (!expirationDate) {
      newErrors.expirationDate = t('Expiration date is required');
    } else if (new Date(expirationDate) <= new Date()) {
      newErrors.expirationDate = t('Expiration date must be in the future');
    }
    
    if (advantageType === 'special_price' && (!value || value <= 0)) {
      newErrors.value = t('Special price must be greater than 0');
    }
    
    if (advantageType === 'percentage_discount' && (!value || value <= 0 || value > 100)) {
      newErrors.value = t('Discount percentage must be between 1 and 100');
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await onSubmit({
        userId: selectedStudent?.id,
        userEmail: selectedStudent?.email,
        userName: selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : undefined,
        courseId: selectedCourse?.id,
        recurringSchedule: selectedSchedules,
        advantageType,
        value: advantageType !== 'free' ? value : undefined,
        expirationDate,
        description: description.trim() || undefined
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const timeSlots = getUniqueTimeSlots();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-xl w-full max-w-2xl my-4 border border-gray-700 max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {editingCard ? t('Edit Discount Card') : t('Create Discount Card')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* 1. Student (User) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('Student')} <span className="text-red-400">*</span>
            </label>
            <div className="relative" ref={searchRef}>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    if (!e.target.value) {
                      setSelectedStudent(null);
                    }
                  }}
                  placeholder={t('Search by name or email') || 'Search by name or email'}
                  className="w-full pl-10 pr-10 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                {selectedStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudent(null);
                      setStudentSearch('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <FiX size={18} />
                  </button>
                )}
              </div>
              
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudent(user);
                        setStudentSearch(`${user.firstName} ${user.lastName}`);
                        setShowSearchResults(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <FiUser className="text-purple-400 flex-shrink-0" size={18} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-gray-400 text-sm truncate">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {selectedStudent && (
                <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center space-x-3">
                  <FiCheckCircle className="text-purple-400 flex-shrink-0" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </p>
                    <p className="text-gray-400 text-sm truncate">{selectedStudent.email}</p>
                  </div>
                </div>
              )}
              
              {errors.student && (
                <p className="mt-1 text-sm text-red-400">{errors.student}</p>
              )}
            </div>
          </div>

          {/* 2. Course */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('Course')} <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedCourse?.id || ''}
              onChange={(e) => {
                const course = courses.find(c => c.id === e.target.value);
                setSelectedCourse(course || null);
                setSelectedSchedules([]);
              }}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">{t('Select a course') || 'Select a course'}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            {errors.course && (
              <p className="mt-1 text-sm text-red-400">{errors.course}</p>
            )}
          </div>

          {/* 3. Recurring Schedule */}
          {selectedCourse && timeSlots.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('Reschedule Class')} <span className="text-red-400">*</span>
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                {timeSlots.map((slot) => (
                  <label
                    key={slot.id}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-700/50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSchedules.includes(slot.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSchedules([...selectedSchedules, slot.id]);
                        } else {
                          setSelectedSchedules(selectedSchedules.filter(id => id !== slot.id));
                        }
                      }}
                      className="w-4 h-4 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-white text-sm sm:text-base">{slot.label}</span>
                  </label>
                ))}
              </div>
              {errors.schedule && (
                <p className="mt-1 text-sm text-red-400">{errors.schedule}</p>
              )}
            </div>
          )}

          {/* 4. Advantage Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              {t('Advantage Type')} <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                advantageType === 'free'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}>
                <input
                  type="radio"
                  name="advantageType"
                  value="free"
                  checked={advantageType === 'free'}
                  onChange={(e) => {
                    setAdvantageType(e.target.value as any);
                    setValue(0);
                  }}
                  className="sr-only"
                />
                <FiGift className="text-purple-400 mb-2" size={24} />
                <span className="text-white font-medium text-sm">{t('Free')}</span>
              </label>
              
              <label className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                advantageType === 'special_price'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}>
                <input
                  type="radio"
                  name="advantageType"
                  value="special_price"
                  checked={advantageType === 'special_price'}
                  onChange={(e) => setAdvantageType(e.target.value as any)}
                  className="sr-only"
                />
                <FiDollarSign className="text-purple-400 mb-2" size={24} />
                <span className="text-white font-medium text-sm">{t('Special Price')}</span>
              </label>
              
              <label className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                advantageType === 'percentage_discount'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}>
                <input
                  type="radio"
                  name="advantageType"
                  value="percentage_discount"
                  checked={advantageType === 'percentage_discount'}
                  onChange={(e) => setAdvantageType(e.target.value as any)}
                  className="sr-only"
                />
                <FiPercent className="text-purple-400 mb-2" size={24} />
                <span className="text-white font-medium text-sm">{t('Percentage Discount')}</span>
              </label>
            </div>
          </div>

          {/* 5. Value */}
          {(advantageType === 'special_price' || advantageType === 'percentage_discount') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {advantageType === 'special_price' 
                  ? t('Special Price (CHF)') 
                  : t('Discount Percentage (%)')} 
                <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                {advantageType === 'special_price' && (
                  <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                )}
                {advantageType === 'percentage_discount' && (
                  <FiPercent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                )}
                <input
                  type="number"
                  value={value || ''}
                  onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                  min={0}
                  max={advantageType === 'percentage_discount' ? 100 : undefined}
                  step={advantageType === 'percentage_discount' ? 1 : 0.01}
                  className={`w-full ${advantageType === 'special_price' ? 'pl-10' : 'pl-10'} pr-3 sm:pr-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500`}
                  placeholder={advantageType === 'special_price' ? '0.00' : '0'}
                />
              </div>
              {errors.value && (
                <p className="mt-1 text-sm text-red-400">{errors.value}</p>
              )}
            </div>
          )}

          {/* 6. Expiration Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('Expiration Date')} <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
            {errors.expirationDate && (
              <p className="mt-1 text-sm text-red-400">{errors.expirationDate}</p>
            )}
          </div>

          {/* 7. Description (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('Description')} ({t('optional')})
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              placeholder={t('Add a description...') || 'Add a description...'}
            />
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              {t('Cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <FiLoader className="animate-spin" size={18} />
                  <span>{t('Saving...')}</span>
                </>
              ) : (
                <>
                  <FiCheckCircle size={18} />
                  <span>{editingCard ? t('Update') : t('Create')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

