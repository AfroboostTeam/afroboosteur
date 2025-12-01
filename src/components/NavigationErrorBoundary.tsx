'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { resetSession } from '@/lib/navigationUtils';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class NavigationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('Navigation Error Boundary caught an error:', error);

    // Ignore known non-critical DOM errors that can occur during animations or
    // clipboard fallbacks (they do not affect navigation or session state).
    if (error.message.includes("Failed to execute 'removeChild' on 'Node'")) {
      console.warn(
        'Suppressed non-navigation DOM error in NavigationErrorBoundary:',
        error.message
      );
      return { hasError: false };
    }

    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Navigation Error Boundary - Error details:', error, errorInfo);
    
    // Check if it's a navigation/session related error
    if (
      error.message.includes('router') ||
      error.message.includes('navigation') ||
      error.message.includes('session') ||
      error.message.includes('cookie')
    ) {
      console.log('Session/Navigation error detected, clearing session');
      resetSession();
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    
    // Clear session and redirect to home
    resetSession();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900 rounded-lg p-6 text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-red-500 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <h2 className="text-xl font-bold text-white mb-2">
              Oops! Something went wrong
            </h2>
            
            <p className="text-gray-400 mb-6">
              We encountered a navigation error. Don't worry, we'll get you back on track.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="text-xs text-red-400 mt-2 overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full bg-gradient-to-r from-[#7000FF] to-[#D91CD2] text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
              >
                Return to Home
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default NavigationErrorBoundary;
