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
  FiGift,
  FiChevronDown
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
    courseIds?: string[];
    courseSessions?: Record<string, string[]>; // Map of courseId to array of session IDs
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
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [courseSchedules, setCourseSchedules] = useState<CourseSchedule[]>([]);
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  // Map of courseId to array of selected schedule IDs for that course
  const [courseSessionsMap, setCourseSessionsMap] = useState<Record<string, string[]>>({});
  // Map of courseId to its schedules
  const [allCourseSchedules, setAllCourseSchedules] = useState<Record<string, CourseSchedule[]>>({});
  const [advantageType, setAdvantageType] = useState<'free' | 'special_price' | 'percentage_discount'>('free');
  const [value, setValue] = useState<number>(0);
  const [expirationDate, setExpirationDate] = useState('');
  const [description, setDescription] = useState('');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const courseDropdownRef = useRef<HTMLDivElement>(null);

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

  // Load schedules for all selected courses
  useEffect(() => {
    const loadAllSchedules = async () => {
      if (selectedCourses.length === 0) {
        setAllCourseSchedules({});
        setCourseSessionsMap({});
        return;
      }

      const schedulesMap: Record<string, CourseSchedule[]> = {};
      
      try {
        await Promise.all(
          selectedCourses.map(async (course) => {
            if (!schedulesMap[course.id]) {
              try {
                const schedules = await scheduleService.getByCourse(course.id);
                schedulesMap[course.id] = schedules;
              } catch (error) {
                console.error(`Error loading schedules for course ${course.id}:`, error);
                schedulesMap[course.id] = [];
              }
            }
          })
        );
        
        setAllCourseSchedules(schedulesMap);
        
        // Initialize courseSessionsMap for new courses
        setCourseSessionsMap(prev => {
          const newMap = { ...prev };
          selectedCourses.forEach(course => {
            if (!newMap[course.id]) {
              newMap[course.id] = [];
            }
          });
          // Remove entries for courses that are no longer selected
          Object.keys(newMap).forEach(courseId => {
            if (!selectedCourses.some(c => c.id === courseId)) {
              delete newMap[courseId];
            }
          });
          return newMap;
        });
      } catch (error) {
        console.error('Error loading schedules:', error);
      }
    };
    
    loadAllSchedules();
  }, [selectedCourses]);

  // Load course schedules when first course is selected (for backward compatibility)
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
      
      // Load course(s) if exists
      if (editingCard.courseId) {
        const course = courses.find(c => c.id === editingCard.courseId);
        if (course) {
          setSelectedCourse(course);
          setSelectedCourses([course]);
        }
      } else if (editingCard.courseIds && Array.isArray(editingCard.courseIds)) {
        const selected = courses.filter(c => editingCard.courseIds.includes(c.id));
        setSelectedCourses(selected);
        if (selected.length > 0) {
          setSelectedCourse(selected[0]);
        }
      }
      
      // Set other fields
      setAdvantageType(editingCard.advantageType || 'free');
      setValue(editingCard.value || editingCard.discountPercentage || 0);
      setExpirationDate(editingCard.expiryDate ? new Date(editingCard.expiryDate).toISOString().split('T')[0] : '');
      setDescription(editingCard.description || '');
      setSelectedSchedules(editingCard.recurringSchedule || []);
      
      // Initialize courseSessionsMap if courseSessions exists (will be refined when schedules load)
      if (editingCard.courseSessions && typeof editingCard.courseSessions === 'object' && editingCard.courseSessions !== null) {
        setCourseSessionsMap(editingCard.courseSessions);
      }
    } else {
      // Set default expiration date (6 months from now)
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      setExpirationDate(sixMonthsFromNow.toISOString().split('T')[0]);
    }
  }, [editingCard, courses]);

  // Load courseSessions from editingCard after schedules are loaded
  useEffect(() => {
    if (!editingCard) return;
    
    // Wait for schedules to be loaded for all selected courses
    if (selectedCourses.length === 0) return;
    
    const allSchedulesLoaded = selectedCourses.every(course => 
      allCourseSchedules[course.id] && allCourseSchedules[course.id].length >= 0
    );
    
    if (!allSchedulesLoaded) return;
    
      const sessionsMap: Record<string, string[]> = {};
    let hasSessionsToLoad = false;
      
      // First, try to load from courseSessions (new format: Record<courseId, sessionIds[]>)
      if (editingCard.courseSessions && typeof editingCard.courseSessions === 'object' && editingCard.courseSessions !== null) {
      hasSessionsToLoad = true;
        Object.keys(editingCard.courseSessions).forEach(courseId => {
          const sessionIds = editingCard.courseSessions[courseId];
          if (Array.isArray(sessionIds) && sessionIds.length > 0) {
            // Verify that these session IDs exist in the loaded schedules
            const courseSchedules = allCourseSchedules[courseId] || [];
            const validSessionIds = sessionIds.filter(sessionId => 
              courseSchedules.some(schedule => schedule.id === sessionId)
            );
            if (validSessionIds.length > 0) {
              sessionsMap[courseId] = validSessionIds;
            }
          }
        });
      }
      
      // If no courseSessions found, try legacy format: recurringSchedule for single course
    if (!hasSessionsToLoad && editingCard.recurringSchedule && Array.isArray(editingCard.recurringSchedule) && editingCard.recurringSchedule.length > 0) {
      hasSessionsToLoad = true;
        // For legacy format, use the first selected course
        const firstCourse = selectedCourses[0];
        if (firstCourse) {
          const courseSchedules = allCourseSchedules[firstCourse.id] || [];
          const validSessionIds = editingCard.recurringSchedule.filter((sessionId: string) => 
            courseSchedules.some(schedule => schedule.id === sessionId)
          );
          if (validSessionIds.length > 0) {
            sessionsMap[firstCourse.id] = validSessionIds;
          }
        }
      }
      
    // Update sessions map if we found sessions to load
    if (hasSessionsToLoad && Object.keys(sessionsMap).length > 0) {
      setCourseSessionsMap(prev => {
        // Merge with existing, but prioritize loaded sessions
        const merged = { ...prev };
        Object.keys(sessionsMap).forEach(courseId => {
          merged[courseId] = sessionsMap[courseId];
        });
        return merged;
      });
    }
  }, [editingCard, allCourseSchedules, selectedCourses]);

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
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
        setShowCourseDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get unique time slots for a specific course
  const getTimeSlotsForCourse = (courseId: string) => {
    const schedules = allCourseSchedules[courseId] || [];
    if (schedules.length === 0) {
      return [];
    }
    
    const slotsMap = new Map<string, { id: string; label: string; schedule: CourseSchedule }>();
    
    schedules.forEach(schedule => {
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
      const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayA = days.indexOf(a.label.split(' – ')[0]);
      const dayB = days.indexOf(b.label.split(' – ')[0]);
      if (dayA !== dayB && dayA !== -1 && dayB !== -1) return dayA - dayB;
      return a.label.localeCompare(b.label);
    });
  };

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
      newErrors.student = t('Please select a student') || 'Veuillez sélectionner un étudiant';
    }
    
    if (selectedCourses.length === 0) {
      newErrors.course = t('Please select at least one course') || 'Veuillez sélectionner au moins un cours';
    }
    
    // Validate that each selected course has at least one session selected
    if (selectedCourses.length > 0) {
      const coursesWithoutSessions = selectedCourses.filter(course => {
        const sessions = courseSessionsMap[course.id] || [];
        return sessions.length === 0;
      });
      
      if (coursesWithoutSessions.length > 0) {
        newErrors.schedule = t('Please select at least one session for each selected course') || 'Veuillez sélectionner au moins une session pour chaque cours sélectionné';
      }
    }
    
    if (!expirationDate) {
      newErrors.expirationDate = t('Expiration date is required') || 'La date d\'expiration est requise';
    } else if (new Date(expirationDate) <= new Date()) {
      newErrors.expirationDate = t('Expiration date must be in the future') || 'La date d\'expiration doit être dans le futur';
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
      // Build course-session mappings
      const courseSessions: Record<string, string[]> = {};
      selectedCourses.forEach(course => {
        const sessions = courseSessionsMap[course.id] || [];
        if (sessions.length > 0) {
          courseSessions[course.id] = sessions;
        }
      });

      await onSubmit({
        userId: selectedStudent?.id,
        userEmail: selectedStudent?.email,
        userName: selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : undefined,
        courseId: selectedCourses.length === 1 ? selectedCourses[0].id : undefined,
        courseIds: selectedCourses.length > 1 ? selectedCourses.map(c => c.id) : undefined,
        courseSessions: Object.keys(courseSessions).length > 0 ? courseSessions : undefined,
        recurringSchedule: selectedSchedules,
        advantageType,
        value: advantageType !== 'free' ? value : undefined,
        expirationDate,
        description: description.trim() || undefined
      });
    } catch (error: any) {
      console.error('Error submitting form:', error);
      // Show error to user if not already handled by onSubmit
      if (error?.message && !error.handled) {
        alert(error.message);
      }
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
            {editingCard ? 'Modifier la carte de réduction' : 'Créer une carte de réduction'}
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
              Étudiant <span className="text-red-400">*</span>
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
                  placeholder="Rechercher par nom ou email"
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

          {/* 2. Course - Multi-select Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cours <span className="text-red-400">*</span>
            </label>
            <div className="relative" ref={courseDropdownRef}>
              <button
                type="button"
                onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-left flex items-center justify-between transition-colors ${
                  errors.course ? 'border-red-500' : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <span className="text-white">
                  {selectedCourses.length === 0
                    ? 'Sélectionner des cours...'
                    : `${selectedCourses.length} cours sélectionné(s)`
                  }
                </span>
                <FiChevronDown
                  className={`text-gray-400 transition-transform ${showCourseDropdown ? 'rotate-180' : ''}`}
                  size={20}
                />
              </button>
              
              {showCourseDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {courses.length === 0 ? (
                    <p className="text-gray-400 text-sm py-3 px-4">Aucun cours disponible</p>
                  ) : (
                    <div className="p-2 space-y-1">
                      {courses.map((course) => {
                        const isSelected = selectedCourses.some(c => c.id === course.id);
                        return (
                          <label
                            key={course.id}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newSelectedCourses = [...selectedCourses, course];
                                  setSelectedCourses(newSelectedCourses);
                                  // If this is the first course selected, set it as selectedCourse for schedule loading
                                  if (selectedCourses.length === 0) {
                                    setSelectedCourse(course);
                                  }
                                } else {
                                  const newSelectedCourses = selectedCourses.filter(c => c.id !== course.id);
                                  setSelectedCourses(newSelectedCourses);
                                  // If we removed the currently selected course, update selectedCourse
                                  if (selectedCourse?.id === course.id) {
                                    if (newSelectedCourses.length > 0) {
                                      setSelectedCourse(newSelectedCourses[0]);
                                    } else {
                                      setSelectedCourse(null);
                                      setSelectedSchedules([]);
                                    }
                                  }
                                }
                                // Clear error when course is selected
                                if (errors.course) {
                                  setErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors.course;
                                    return newErrors;
                                  });
                                }
                              }}
                              className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate">{course.title}</p>
                              {course.description && (
                                <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">
                                  {course.description}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            {errors.course && (
              <p className="mt-1 text-sm text-red-400">{errors.course}</p>
            )}
          </div>

          {/* 3. Sessions for each selected course */}
          {selectedCourses.length > 0 && (
            <div className="space-y-4">
              {selectedCourses.map((course) => {
                const timeSlots = getTimeSlotsForCourse(course.id);
                const selectedSessions = courseSessionsMap[course.id] || [];
                const hasError = errors.schedule && selectedSessions.length === 0;
                
                return (
                  <div key={course.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                    <h3 className="text-white font-medium mb-3 flex items-center">
                      <FiBook className="mr-2" size={16} />
                      {course.title} - Sélectionner les sessions <span className="text-red-400">*</span>
                      {selectedSessions.length > 0 && (
                        <span className="ml-2 text-sm text-gray-400">
                          ({selectedSessions.length} sélectionné(s))
                        </span>
                      )}
                    </h3>
                    {timeSlots.length === 0 ? (
                      <p className="text-gray-400 text-sm py-2">Aucune session disponible pour ce cours</p>
                    ) : (
                      <>
                        <div className={`space-y-2 max-h-48 overflow-y-auto ${hasError ? 'border border-red-500 rounded-lg p-2' : ''}`}>
                        {timeSlots.map((slot) => {
                          const isSelected = selectedSessions.includes(slot.id);
                          return (
                            <label
                              key={slot.id}
                              className="flex items-center space-x-3 p-2 hover:bg-gray-700/50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  setCourseSessionsMap(prev => {
                                    const currentSessions = prev[course.id] || [];
                                    if (e.target.checked) {
                                      return {
                                        ...prev,
                                        [course.id]: [...currentSessions, slot.id]
                                      };
                                    } else {
                                      return {
                                        ...prev,
                                        [course.id]: currentSessions.filter(id => id !== slot.id)
                                      };
                                    }
                                  });
                                  // Clear error when session is selected
                                  if (errors.schedule) {
                                    setErrors(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors.schedule;
                                      return newErrors;
                                    });
                                  }
                                }}
                                className="w-4 h-4 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                              />
                              <span className="text-white text-sm">{slot.label}</span>
                            </label>
                          );
                        })}
                      </div>
                        {hasError && (
                          <p className="mt-2 text-sm text-red-400">{errors.schedule}</p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Recurring Schedule (Legacy - keeping for backward compatibility) */}
          {selectedCourse && timeSlots.length > 0 && selectedCourses.length === 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('Reschedule Class') || 'Réorganiser le cours'} <span className="text-red-400">*</span>
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
              Type d'avantage <span className="text-red-400">*</span>
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
                <span className="text-white font-medium text-sm">{t('Free') || 'Gratuit'}</span>
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
                <span className="text-white font-medium text-sm">Prix spécial</span>
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
                <span className="text-white font-medium text-sm">Remise en pourcentage</span>
              </label>
            </div>
          </div>

          {/* 5. Value */}
          {(advantageType === 'special_price' || advantageType === 'percentage_discount') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {advantageType === 'special_price' 
                  ? 'Prix spécial (CHF)'
                  : 'Pourcentage de remise (%)'} 
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
              Date d'expiration <span className="text-red-400">*</span>
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
              Description (optionnel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              placeholder="Ajouter une description..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <FiLoader className="animate-spin" size={18} />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <FiCheckCircle size={18} />
                  <span>{editingCard ? 'Mettre à jour' : 'Créer'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

