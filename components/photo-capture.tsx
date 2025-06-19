/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, Check, Loader2, Eye, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AnalyzedItem {
  name: string;
  description: string;
  category: string;
  photo: string;
}

interface QueuedPhoto {
  id: string;
  photo: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: AnalyzedItem;
  error?: string;
}

interface PhotoCaptureProps {
  onItemsAnalyzed: (items: AnalyzedItem[]) => void;
  onClose: () => void;
  boxContext?: string;
}

export default function PhotoCapture({ onItemsAnalyzed, onClose, boxContext }: PhotoCaptureProps) {
  const [mode, setMode] = useState<'select' | 'camera' | 'upload'>('select');
  const [photoQueue, setPhotoQueue] = useState<QueuedPhoto[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize camera when entering camera mode
  useEffect(() => {
    if (mode === 'camera') {
      // Don't auto-initialize camera - wait for user interaction
      setCameraError(null);
    } else {
      // Clean up camera when leaving camera mode
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode]);

  const initializeCamera = async () => {
    setIsCameraLoading(true);
    setCameraError(null);

    try {
      // Debug: Log browser information
      console.log('Browser info:', {
        userAgent: navigator.userAgent,
        mediaDevices: !!navigator.mediaDevices,
        getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        isSecure: window.location.protocol === 'https:'
      });

      // Check if we're in a secure context (required for camera access)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('Camera access requires HTTPS (except on localhost)');
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      // Try different constraint configurations for better browser compatibility
      const constraintConfigs = [
        // First try: Full constraints with environment camera
        {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 }
          },
          audio: false
        },
        // Second try: Simplified constraints with environment camera
        {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        },
        // Third try: Basic constraints with any camera
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        },
        // Fourth try: Minimal constraints
        {
          video: true,
          audio: false
        }
      ];

      let stream = null;
      let lastError = null;

      // Try each constraint configuration until one works
      for (let i = 0; i < constraintConfigs.length; i++) {
        const constraints = constraintConfigs[i];
        try {
          console.log(`Trying camera constraint ${i + 1}:`, constraints);
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log(`Camera constraint ${i + 1} succeeded!`);
          break; // If successful, break out of the loop
        } catch (error) {
          lastError = error;
          console.warn(`Camera constraint ${i + 1} failed:`, constraints, error);
          continue;
        }
      }

      if (!stream) {
        throw lastError || new Error('Failed to access camera with any configuration');
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log('Video stream started successfully');
      }
    } catch (error) {
      console.error('Camera initialization error:', error);
      let errorMessage = 'Failed to access camera';

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please allow camera permissions and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Camera is not supported in this browser.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Camera constraints not supported. Please try again.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.';
        } else {
          errorMessage = error.message;
        }
      }

      setCameraError(errorMessage);
    } finally {
      setIsCameraLoading(false);
    }
  };

  // Compress image to under 1MB
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculate dimensions to keep under 1MB
        const maxSize = 800;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);

        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Compress to JPEG with quality 0.7
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressed);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const capturePhoto = useCallback(async () => {
    console.log('capturePhoto called');
    console.log('videoRef.current:', !!videoRef.current);
    console.log('canvasRef.current:', !!canvasRef.current);
    console.log('streamRef.current:', !!streamRef.current);

    if (videoRef.current && canvasRef.current && streamRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const imageSrc = canvas.toDataURL('image/jpeg', 0.8);
      console.log('Image captured, length:', imageSrc.length);

      if (imageSrc) {
        toast.success('Photo captured! Adding to analysis queue...');
        await addPhotoToQueue(imageSrc);
      }
    } else {
      console.error('Missing refs for photo capture:', {
        video: !!videoRef.current,
        canvas: !!canvasRef.current,
        stream: !!streamRef.current
      });
    }
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        let processedFile = file;

        // Convert HEIC to JPEG if needed
        if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
          try {
            // Dynamic import to avoid SSR issues
            const heic2any = (await import('heic2any')).default;
            const convertedBlob = await heic2any({
              blob: file,
              toType: 'image/jpeg',
              quality: 0.8
            });
            const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
            processedFile = new File([finalBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
              type: 'image/jpeg'
            });
          } catch (heicError) {
            console.warn('HEIC conversion failed, using original file:', heicError);
            // If HEIC conversion fails, just use the original file
            processedFile = file;
          }
        }

        const compressedPhoto = await compressImage(processedFile);
        toast.success('Photo uploaded! Adding to analysis queue...');
        await addPhotoToQueue(compressedPhoto);
      } catch (error) {
        console.error('Error processing image:', error);
        toast.error('Error processing image. Please try a different photo.');
      }
    }
  };

  const addPhotoToQueue = async (photo: string) => {
    const newPhoto: QueuedPhoto = {
      id: Date.now().toString(),
      photo,
      status: 'pending'
    };

    console.log('Adding photo to queue:', newPhoto.id);
    console.log('Current isProcessing state:', isProcessing);

    setPhotoQueue(prev => {
      const newQueue = [...prev, newPhoto];
      console.log('New queue length:', newQueue.length);
      console.log('Pending items in new queue:', newQueue.filter(item => item.status === 'pending').length);

      // Start processing if not already processing
      if (!isProcessing) {
        console.log('Starting queue processing...');
        // Use setTimeout to ensure state update completes first
        setTimeout(() => processQueue(newQueue), 0);
      } else {
        console.log('Already processing, skipping auto-start');
      }

      return newQueue;
    });
  };

  const processQueue = async (queueToProcess?: QueuedPhoto[]) => {
    if (isProcessing) {
      console.log('Already processing, skipping...');
      return; // Prevent multiple simultaneous processing
    }

    setIsProcessing(true);
    console.log('Starting queue processing...');

    try {
      // Use provided queue or get current queue state
      const currentQueue = queueToProcess || photoQueue;
      const pendingItems = currentQueue.filter(item => item.status === 'pending');
      console.log('Processing', pendingItems.length, 'pending items');
      console.log('Total queue items:', currentQueue.length);
      console.log('Queue items by status:', {
        pending: currentQueue.filter(i => i.status === 'pending').length,
        processing: currentQueue.filter(i => i.status === 'processing').length,
        completed: currentQueue.filter(i => i.status === 'completed').length,
        failed: currentQueue.filter(i => i.status === 'failed').length
      });

      for (const queuedPhoto of pendingItems) {
        console.log('Processing photo:', queuedPhoto.id);

        // Update status to processing
        setPhotoQueue(prev => prev.map(p =>
          p.id === queuedPhoto.id ? { ...p, status: 'processing' } : p
        ));

        try {
          console.log('Sending photo for analysis...');
          const response = await fetch('/api/analyze-photo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageBase64: queuedPhoto.photo,
              boxContext: boxContext,
            }),
          });

          console.log('Analysis response status:', response.status);
          const data = await response.json();
          console.log('Analysis response data:', data);

          if (response.ok && data.items && data.items.length > 0) {
            const result = data.items[0]; // Take first item since we're processing individual photos
            console.log('Analysis successful:', result);
            setPhotoQueue(prev => prev.map(p =>
              p.id === queuedPhoto.id ? {
                ...p,
                status: 'completed',
                result: { ...result, photo: queuedPhoto.photo }
              } : p
            ));
            toast.success(`Analyzed: ${result.name}`);
          } else {
            console.error('Analysis failed:', data);
            throw new Error(data.error || data.details || 'Analysis failed');
          }
        } catch (error) {
          console.error('Error analyzing photo:', error);
          let errorMessage = 'Analysis failed';

          if (error instanceof Error) {
            errorMessage = error.message;
          }

          console.log('Marking photo as failed:', queuedPhoto.id, errorMessage);
          setPhotoQueue(prev => prev.map(p =>
            p.id === queuedPhoto.id ? { ...p, status: 'failed', error: errorMessage } : p
          ));
          toast.error(`Analysis failed: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      setIsProcessing(false);
      console.log('Queue processing completed');
    }
  };

  const handleFinishPacking = () => {
    const completedItems = photoQueue
      .filter(item => item.status === 'completed' && item.result)
      .map(item => item.result!);

    if (completedItems.length > 0) {
      onItemsAnalyzed(completedItems);
      toast.success(`Successfully added ${completedItems.length} items to the box!`);
    } else {
      toast.error('No items were successfully analyzed. Please try again.');
    }

    // Reset states
    setPhotoQueue([]);
    setShowResults(false);
    onClose();
  };

  const removeFromQueue = (id: string) => {
    setPhotoQueue(prev => prev.filter(item => item.id !== id));
    toast.success('Item removed from queue');
  };

  const retakePhoto = (id: string) => {
    setPhotoQueue(prev => prev.filter(item => item.id !== id));
    setShowResults(false);
    setMode('select');
    toast.info('Photo removed. You can take a new photo.');
  };

  const resetMode = () => {
    setMode('select');
  };

  // Show results if we have completed items AND user has explicitly finished
  if (showResults && photoQueue.length > 0 && photoQueue.some(item => item.status === 'completed')) {
    const completedItems = photoQueue.filter(item => item.status === 'completed' && item.result);
    const pendingItems = photoQueue.filter(item => item.status === 'pending' || item.status === 'processing');
    const failedItems = photoQueue.filter(item => item.status === 'failed');

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold">Packing Progress</h3>
              <Button variant="outline" size="sm" onClick={onClose} className="text-sm">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
              <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{completedItems.length}</div>
                <div className="text-xs sm:text-sm text-green-700">Completed</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-yellow-50 rounded-lg">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">{pendingItems.length}</div>
                <div className="text-xs sm:text-sm text-yellow-700">Processing</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{failedItems.length}</div>
                <div className="text-xs sm:text-sm text-red-700">Failed</div>
              </div>
            </div>

            {/* Completed Items */}
            {completedItems.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base">Analyzed Items:</h4>
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {completedItems.map((item, index) => {
                    // Find the queue item by index since completedItems and photoQueue should be in sync
                    const queueItem = photoQueue.filter(q => q.status === 'completed')[index];
                    const analyzedItem = item.result!;
                    return (
                      <div key={queueItem?.id || index} className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <img
                            src={queueItem?.photo}
                            alt={analyzedItem.name}
                            className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded border flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs sm:text-sm">{analyzedItem.name}</div>
                            <div className="text-xs text-gray-600 mb-1 line-clamp-2">{analyzedItem.description}</div>
                            <div className="text-xs text-blue-600 font-medium">{analyzedItem.category}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retakePhoto(queueItem?.id || '')}
                            className="text-red-600 flex-shrink-0 px-2 py-1"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Failed Items */}
            {failedItems.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <h4 className="font-medium mb-2 sm:mb-3 text-red-600 text-sm sm:text-base">Failed Items:</h4>
                <div className="space-y-2">
                  {failedItems.map((item) => (
                    <div key={item.id} className="p-2 sm:p-3 bg-red-50 rounded-lg flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-medium">Photo Analysis Failed</div>
                        <div className="text-xs text-red-600 line-clamp-1">{item.error}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retakePhoto(item.id)}
                        className="flex-shrink-0 px-2 py-1"
                      >
                        Retry
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button onClick={handleFinishPacking} className="flex-1 py-2 sm:py-3 text-sm" disabled={completedItems.length === 0}>
                <Check className="h-4 w-4 mr-2" />
                Add {completedItems.length} Items to Box
              </Button>
              <Button variant="outline" onClick={() => setMode('select')} className="py-2 sm:py-3 text-sm">
                <Camera className="h-4 w-4 mr-2" />
                Add More Items
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'camera') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        <div className="flex-1 relative">
          {isCameraLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="text-center text-white p-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Initializing camera...</p>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="text-center text-white p-4 max-w-xs mx-4">
                <X className="h-8 w-8 mx-auto mb-2 text-red-400" />
                <p className="mb-4 text-sm">{cameraError}</p>
                <Button onClick={initializeCamera} variant="outline" className="text-white border-white text-sm">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {!streamRef.current && !isCameraLoading && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="text-center text-white p-4 max-w-xs mx-4">
                <Camera className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="mb-4 text-sm">Camera access required to take photos</p>
                <Button onClick={initializeCamera} className="bg-blue-600 hover:bg-blue-700 text-sm">
                  Start Camera
                </Button>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
            style={{ transform: 'scaleX(-1)' }} // Mirror the video for better UX
          />

          {/* Hidden canvas for capturing photos */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="bg-white p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold">Take Photo of Item</h3>
            <Button variant="outline" size="sm" onClick={() => setShowResults(true)} className="text-sm">
              Done
            </Button>
          </div>

          <div className="flex gap-2 sm:gap-3">
            <Button
              onClick={capturePhoto}
              className="flex-1 py-2 sm:py-3 text-sm"
              disabled={isCameraLoading || !!cameraError || !streamRef.current}
            >
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Capture Item
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'upload') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold">Upload Item Photo</h3>
              <Button variant="outline" size="sm" onClick={() => setShowResults(true)} className="text-sm">
                Done
              </Button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 lg:p-8 text-center mb-4">
              <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                Click to select a photo or drag and drop
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="py-2 sm:py-3 text-sm"
              >
                Select Photo
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold">Add Items with Photos</h3>
            <Button variant="outline" size="sm" onClick={onClose} className="text-sm">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
            Take a photo of each item as you pack. AI will automatically identify and categorize them.
          </p>

          <div className="space-y-2 sm:space-y-3">
            <Button
              onClick={() => setMode('camera')}
              className="w-full justify-start py-2 sm:py-3 text-sm"
            >
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
              Take Photo with Camera
            </Button>

            <Button
              variant="outline"
              onClick={() => setMode('upload')}
              className="w-full justify-start py-2 sm:py-3 text-sm"
            >
              <Upload className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
              Upload Photo from Device
            </Button>
          </div>

          {photoQueue.length > 0 && (
            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-medium">Queue ({photoQueue.length})</span>
                <div className="flex items-center gap-1 sm:gap-2">
                  {isProcessing && (
                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-blue-600">
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      <span className="hidden sm:inline">Processing...</span>
                    </div>
                  )}
                  {photoQueue.some(item => item.status === 'pending') && !isProcessing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => processQueue()}
                      className="text-xs px-2 py-1"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Process
                    </Button>
                  )}
                  {photoQueue.some(item => item.status === 'completed') && (
                    <Button
                      size="sm"
                      onClick={() => setShowResults(true)}
                      className="text-xs px-2 py-1"
                    >
                      Done
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1 sm:space-y-2">
                {photoQueue.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs sm:text-sm">
                    {item.status === 'pending' && <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0" />}
                    {item.status === 'processing' && <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-blue-600 flex-shrink-0" />}
                    {item.status === 'completed' && <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />}
                    {item.status === 'failed' && <X className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 flex-shrink-0" />}
                    <span className="flex-1 min-w-0 truncate">
                      {item.status === 'pending' && 'Waiting...'}
                      {item.status === 'processing' && 'Analyzing...'}
                      {item.status === 'completed' && item.result?.name}
                      {item.status === 'failed' && `Failed: ${item.error}`}
                    </span>
                    {(item.status === 'pending' || item.status === 'failed') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFromQueue(item.id)}
                        className="text-red-600 flex-shrink-0 px-2 py-1"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {/* Debug info - hidden on small screens */}
              <div className="mt-2 text-xs text-gray-500 hidden sm:block">
                <div>Pending: {photoQueue.filter(i => i.status === 'pending').length}</div>
                <div>Processing: {photoQueue.filter(i => i.status === 'processing').length}</div>
                <div>Completed: {photoQueue.filter(i => i.status === 'completed').length}</div>
                <div>Failed: {photoQueue.filter(i => i.status === 'failed').length}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}