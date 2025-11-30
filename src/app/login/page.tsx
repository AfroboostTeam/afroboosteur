'use client';

import { useState, useContext, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { AppContext } from '../providers';
import { useAuth } from '@/lib/auth';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkUserSubscriptionStatus } from '@/lib/subscriptionUtils';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { t } = useTranslation(); // Initialize useTranslation
  const { language } = useContext(AppContext);
  const { login, loginWithGoogle, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const resolveLandingPage = useCallback(async (role?: string, userId?: string) => {
    if (typeof window === 'undefined') return '/publications';
    
    // For students, check subscription status
    if (role === 'student' && userId) {
      try {
        const status = await checkUserSubscriptionStatus(userId);
        
        // If user has active subscription or purchased offer, go to courses
        if (status.hasActiveSubscription || status.hasPurchasedOffer) {
          return '/courses';
        }
        
        // If subscription expired, show offers (publications page will handle popup)
        if (status.isExpired) {
          return '/publications';
        }
        
        // New user - check if they have a preferred landing page
        const storedPage = localStorage.getItem('preferredLandingPage');
        const storedFor = localStorage.getItem('preferredLandingFor');
        if (storedPage && storedFor === userId) {
          return storedPage;
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    }
    
    return '/publications';
  }, []);

  // Simple redirect if already logged in
  useEffect(() => {
    const handleRedirect = async () => {
      if (user && !authLoading) {
        console.log('User already logged in, checking for redirect');
        const redirectUrl = searchParams?.get('redirect');
        if (redirectUrl) {
          console.log('Redirecting to:', redirectUrl);
          router.replace(redirectUrl);
        } else {
          const landing = await resolveLandingPage(user.role, user.id);
          router.replace(landing);
        }
      }
    };
    handleRedirect();
  }, [user, authLoading, router, searchParams, resolveLandingPage]);

  // Load saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      setValue('email', savedEmail);
      setValue('password', atob(savedPassword)); // Decode from base64
      setRememberMe(true);
    }
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');
    console.log('Login form submitted:', data.email);

    try {
      const success = await login(data.email, data.password);

      if (success) {
        // Handle remember me functionality
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', data.email);
          localStorage.setItem('rememberedPassword', btoa(data.password)); // Encode to base64
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedPassword');
        }

        console.log('Login successful, checking for redirect');

        // Check for redirect parameter
        const redirectUrl = searchParams?.get('redirect');
        if (redirectUrl) {
          console.log('Redirecting to:', redirectUrl);
          router.replace(redirectUrl);
        } else {
          // Determine landing page based on subscription status
          const landing = await resolveLandingPage('student', user?.id);
          router.replace(landing);
        }
      } else {
        console.log('Login failed');
        setError(t('invalidCredentials'));
      }
    } catch (err: any) {
      console.error('Login error:', err);

      // Provide more specific error messages
      if (err?.code === 'auth/user-not-found') {
        setError(t('userNotFound'));
      } else if (err?.code === 'auth/wrong-password') {
        setError(t('wrongPassword'));
      } else if (err?.code === 'auth/invalid-credential') {
        setError(t('invalidCredentials'));
      } else if (err?.code === 'auth/network-request-failed') {
        setError(t('networkError'));
      } else {
        setError(`${t('errorOccurred')}: ${err?.message || t('tryAgainLater')}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');

    try {
      const success = await loginWithGoogle();

      if (success) {
        console.log('Google login successful, checking for redirect');

        // Check for redirect parameter
        const redirectUrl = searchParams?.get('redirect');
        if (redirectUrl) {
          console.log('Redirecting to:', redirectUrl);
          router.replace(redirectUrl);
        } else {
          // Determine landing page based on subscription status
          const landing = await resolveLandingPage('student', user?.id);
          router.replace(landing);
        }
      } else {
        console.log('Google login failed');
        setError(t('googleLoginFailed'));
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      const errorMessage = err?.message || err?.code || t('tryAgainLater');
      
      // Provide more helpful error messages
      if (err?.message?.includes('Popup blocked')) {
        setError(t('popupBlocked') || 'Popup blocked. Please allow popups for this site and try again.');
      } else if (err?.message?.includes('Domain not authorized')) {
        setError(t('domainNotAuthorized') || 'This domain is not authorized. Please contact support.');
      } else if (err?.message?.includes('Network error')) {
        setError(t('networkError') || 'Network error. Please check your connection and try again.');
      } else {
        setError(`${t('errorOccurred')}: ${errorMessage}`);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Show simple loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-4 text-lg">Loading...</p>
      </div>
    );
  }

  // Don't render if user is authenticated (prevent flash)
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-4 text-lg">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center mt-8 justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold gradient-text">{t('signIn')}</h1>
            <p className="text-gray-400 mt-2">
              {t('noAccount')}{' '}
              <Link href="/signup" className="text-[#D91CD2] hover:underline">
                {t('signUp')}
              </Link>
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-6 flex items-center">
              <FiAlertCircle className="text-red-500 mr-2" />
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">
                {t('email')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="input-primary w-full pl-12"
                  placeholder={t('emailPlaceholder')}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium">
                {t('password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  {...register('password')}
                  className="input-primary w-full pl-12"
                  placeholder={t('passwordPlaceholder')}
                />
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 bg-black border-[#D91CD2] rounded focus:ring-[#D91CD2]"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                  {t('rememberMe')}
                </label>
              </div>
              <Link href="/forgot-password" className="text-sm text-[#D91CD2] hover:underline">
                {t('forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex justify-center items-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                t('signIn')
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#D91CD2]/10">
            <div className="flex items-center justify-between">
              <div className="flex-1 h-px bg-[#D91CD2]/10"></div>
              <span className="text-[#D91CD2] text-sm px-4">
                {t('or')}
              </span>
              <div className="flex-1 h-px bg-[#D91CD2]/10"></div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-600 rounded-lg text-white bg-gray-800 hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGoogleLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FcGoogle className="w-5 h-5 mr-2" />
                )}
                {t('signInWithGoogle')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}