'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUpload, 
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiCamera,
  FiStopCircle
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import jsQR from 'jsqr';

interface GiftCardScannerProps {
  onValidation: (result: { valid: boolean; amount: number; remainingAmount: number; cardCode: string; error?: string }) => void;
  onClose: () => void;
  customerId: string;
  customerName: string;
  businessId?: string;
  orderId?: string;
  bookingId?: string;
  requestedAmount: number;
  transactionType?: 'course' | 'product' | 'token';
}

export default function GiftCardScanner({ 
  onValidation, 
  onClose, 
  customerId, 
  customerName,
  businessId,
  orderId, 
  bookingId, 
  requestedAmount,
  transactionType 
}: GiftCardScannerProps) {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [useCameraScanner, setUseCameraScanner] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [detectedCode, setDetectedCode] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);


  // Cleanup function
  const cleanup = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Cleanup on unmount
  // Auto-start camera when switching to camera scanning mode
  useEffect(() => {
    console.log('🎯 Auto-start effect triggered:', { useCameraScanner });
    if (useCameraScanner && !isCameraActive) {
      console.log('🎯 Auto-starting camera in effect...');
      const timer = setTimeout(() => {
        startCamera();
      }, 100); // Small delay to ensure DOM is ready
      return () => clearTimeout(timer);
    }
  }, [useCameraScanner, isCameraActive]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startCamera = async () => {
    try {
      setCameraError('');
      setDetectedCode('');
      
      console.log('Requesting camera access...');

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported by this browser');
      }
      
      // Try with different constraints if the first one fails
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera if available
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (error) {
        console.warn('Failed with environment camera, trying any camera:', error);
        // Fallback to any available camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
      }

      console.log('Camera access granted, setting up video...');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setUseCameraScanner(true);
        setUseManualEntry(false);
        
        // Start scanning after video is loaded
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, starting camera...');
          setIsCameraActive(true);
          
          // Small delay to ensure video is ready
          setTimeout(() => {
            startQRScanning();
          }, 500);
        };

        // Additional event listener for when video starts playing
        videoRef.current.onplaying = () => {
          console.log('Video is now playing');
          if (!isCameraActive) {
            setIsCameraActive(true);
            setTimeout(() => {
              startQRScanning();
            }, 500);
          }
        };
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      setCameraError(
        error.name === 'NotAllowedError' 
          ? t('Camera access denied. Please allow camera access and try again.')
          : error.name === 'NotFoundError'
          ? t('No camera found. Please use upload or manual entry instead.')
          : error.message === 'Camera not supported by this browser'
          ? t('Camera not supported by this browser. Please use upload or manual entry.')
          : t('Failed to access camera. Please try again or use manual entry.')
      );
    }
  };

  const stopCamera = () => {
    cleanup();
    setUseCameraScanner(false);
    setDetectedCode('');
    setCameraError('');
  };

  const startQRScanning = () => {
    console.log('Starting QR scanning...', {
      hasVideo: !!videoRef.current,
      hasCanvas: !!canvasRef.current,
      isCameraActive,
      isValidating
    });

    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref is missing');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    // Clear any existing interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    scanIntervalRef.current = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA && !isValidating) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        if (canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data && code.data.trim()) {
            const detectedCode = code.data.toUpperCase().trim();
            console.log('QR Code detected:', detectedCode);
            setDetectedCode(detectedCode);
            
            // Auto-validate detected QR code
            stopCamera();
            validateGiftCard(detectedCode);
          }
        }
      }
    }, 150); // Scan every 150ms for better performance

    console.log('QR scanning interval started');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const extractQRCodeFromImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        try {
          // Get image data for jsQR processing
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Use jsQR to detect and decode QR code
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            // QR code detected successfully
            resolve(code.data.toUpperCase());
          } else {
            // Fallback: try to extract from filename for demo purposes
            const fileName = file.name;
            const codeMatch = fileName.replace(/^gift-card-/i, '').replace(/\.(png|jpg|jpeg)$/i, '');
            
            if (codeMatch && codeMatch !== fileName) {
              console.warn('QR code not detected in image, using filename fallback');
              resolve(codeMatch.toUpperCase());
            } else {
              reject(new Error('No QR code detected in the image. Please ensure the image contains a clear QR code or try manual entry.'));
            }
          }
        } catch (error) {
          console.error('Error processing QR code:', error);
          reject(new Error('Failed to process image. Please try again or use manual entry.'));
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image. Please select a valid image file.'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const validateGiftCard = async (cardCode: string) => {
    setIsValidating(true);
    
    try {
      const response = await fetch('/api/gift-cards/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardCode,
          amount: requestedAmount,
          customerId,
          customerName,
          businessId,
          orderId,
          bookingId,
          transactionType
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onValidation({
          valid: true,
          amount: data.amountUsed,
          remainingAmount: data.remainingAmount,
          cardCode
        });
      } else {
        onValidation({
          valid: false,
          amount: 0,
          remainingAmount: 0,
          cardCode,
          error: data.error || 'Gift card validation failed'
        });
      }
    } catch (error) {
      console.error('Error validating gift card:', error);
      onValidation({
        valid: false,
        amount: 0,
        remainingAmount: 0,
        cardCode,
        error: 'Network error occurred while validating gift card'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidateFromImage = async () => {
    if (!selectedFile) return;

    setIsValidating(true);
    try {
      const cardCode = await extractQRCodeFromImage(selectedFile);
      await validateGiftCard(cardCode);
    } catch (error: any) {
      onValidation({
        valid: false,
        amount: 0,
        remainingAmount: 0,
        cardCode: '',
        error: error.message
      });
      setIsValidating(false);
    }
  };

  const handleValidateManualCode = async () => {
    if (!manualCode.trim()) return;
    await validateGiftCard(manualCode.trim().toUpperCase());
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-700"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">{t('Validate Gift Card')}</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white"
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Amount Info */}
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <FiCheckCircle className="text-purple-400" size={20} />
              <span className="text-white font-medium">
                {t('Requested amount')}: {requestedAmount} CHF
              </span>
            </div>
            {transactionType && (
              <div className="flex items-center space-x-2 text-sm">
                <FiAlertCircle className="text-yellow-400" size={16} />
                <span className="text-yellow-300">
                  {transactionType === 'course' || transactionType === 'token'
                    ? t('Required: COACH gift card only')
                    : t('Required: SELLER gift card only')
                  }
                </span>
              </div>
            )}
          </div>


          {/* Method Selection */}
          <div className="flex flex-col gap-2 mb-6">
            <button
              onClick={() => {
                stopCamera();
                setUseManualEntry(false);
                setUseCameraScanner(false);
              }}
              className={`w-full py-3 px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                !useManualEntry && !useCameraScanner
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {t('Upload Image')}
            </button>
            <button
              onClick={async () => {
                console.log('Scan QR button clicked');
                stopCamera();
                setUseManualEntry(false);
                setUseCameraScanner(true); // Set this first
                await startCamera();
              }}
              className={`w-full py-3 px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                useCameraScanner
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <FiCamera className="inline mr-1" size={14} />
              {t('Scan QR')}
            </button>
            <button
              onClick={() => {
                stopCamera();
                setUseManualEntry(true);
                setUseCameraScanner(false);
              }}
              className={`w-full py-3 px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                useManualEntry
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {t('Manual Entry')}
            </button>
          </div>

          {useCameraScanner ? (
            /* Live Camera Scanner */
            <div className="space-y-4">
              {/* Debug Info - Remove in production */}
              <div className="bg-gray-800/50 rounded p-2 text-xs text-gray-400">
                Debug: useCameraScanner={useCameraScanner.toString()}, isCameraActive={isCameraActive.toString()}, 
                hasVideo={!!videoRef.current ? 'true' : 'false'}, cameraError={cameraError || 'none'}
              </div>

              {cameraError ? (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <FiAlertCircle className="text-red-400" size={20} />
                    <span className="text-red-300">{cameraError}</span>
                  </div>
                  <button
                    onClick={startCamera}
                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                  >
                    {t('Try Again')}
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 object-cover"
                      style={{ minHeight: '256px' }}
                      onError={(e) => {
                        console.error('Video error:', e);
                        setCameraError('Video playback error occurred');
                      }}
                      onLoadStart={() => console.log('Video load started')}
                      onCanPlay={() => console.log('Video can play')}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  
                  {/* Scanning Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-purple-400 rounded-lg relative">
                      {/* Corner guides */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-purple-400"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-purple-400"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-purple-400"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-purple-400"></div>
                      
                      <div className="w-full h-full border-2 border-dashed border-purple-400/50 rounded-lg flex items-center justify-center">
                        {isCameraActive ? (
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-purple-400 text-center"
                          >
                            <FiCamera size={32} className="mx-auto mb-2" />
                            <p className="text-sm">{t('Scanning for QR code...')}</p>
                            <p className="text-xs mt-1 text-purple-300">
                              {t('Position QR code within the frame')}
                            </p>
                          </motion.div>
                        ) : (
                          <div className="text-gray-400 text-center">
                            <FiLoader size={32} className="mx-auto mb-2 animate-spin" />
                            <p className="text-sm">{t('Starting camera...')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detectedCode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-500/20 border border-green-500/30 rounded-lg p-4"
                >
                  <div className="flex items-center space-x-2">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      <FiCheckCircle className="text-green-400" size={20} />
                    </motion.div>
                    <div>
                      <span className="text-green-300 font-medium">
                        {t('QR Code Detected')}!
                      </span>
                      <p className="text-green-200 text-sm">{detectedCode}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={stopCamera}
                  className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <FiStopCircle size={18} />
                  <span>{t('Stop Camera')}</span>
                </button>
                {!cameraError && (
                  <button
                    onClick={startCamera}
                    disabled={isCameraActive && !cameraError}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <FiCamera size={18} />
                    <span>{isCameraActive && !cameraError ? t('Camera Active') : t('Start Camera')}</span>
                  </button>
                )}
              </div>
            </div>
          ) : !useManualEntry ? (
            /* QR Code Upload */
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors"
              >
                {previewUrl ? (
                  <div className="space-y-4">
                    <div className="w-32 h-32 mx-auto bg-white rounded-lg p-2">
                      <Image
                        src={previewUrl}
                        alt="QR Code Preview"
                        width={120}
                        height={120}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-gray-400 text-sm">
                      {t('QR code image selected. Click validate to continue.')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FiUpload className="text-4xl text-gray-400 mx-auto" />
                    <div>
                      <p className="text-white font-medium">{t('Upload QR Code Image')}</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {t('Click to select a PNG/JPG image containing the gift card QR code')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={handleValidateFromImage}
                disabled={!selectedFile || isValidating}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isValidating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('Validating...')}</span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle size={18} />
                    <span>{t('Validate Gift Card')}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Manual Code Entry */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('Gift Card Code')}
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder={
                    transactionType === 'course' || transactionType === 'token'
                      ? "COACH-12345678-1234567890-ABCDEFGH"
                      : "SELLER-12345678-1234567890-ABCDEFGH"
                  }
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              <button
                onClick={handleValidateManualCode}
                disabled={!manualCode.trim() || isValidating}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isValidating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('Validating...')}</span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle size={18} />
                    <span>{t('Validate Gift Card')}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <FiAlertCircle className="text-blue-400 mt-0.5" size={16} />
              <div className="text-sm text-blue-300">
                <p className="font-medium">{t('Important')}:</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• {t('Make sure the QR code image is clear, well-lit, and properly focused')}</li>
                  <li>• {t('Supported formats: PNG, JPG, JPEG')}</li>
                  {transactionType === 'course' || transactionType === 'token' ? (
                    <li>• {t('Only COACH gift cards can be used for courses and tokens')}</li>
                  ) : (
                    <li>• {t('Only SELLER gift cards can be used for products')}</li>
                  )}
                  <li>• {t('Gift cards can only be used with the business that issued them')}</li>
                  <li>• {t('Check the expiration date before use')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
