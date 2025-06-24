'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BoxPhotoUploadProps {
  onPhotoUploaded: (photo: string) => void;
  onClose: () => void;
  currentPhoto?: string;
}

export default function BoxPhotoUpload({ onPhotoUploaded, onClose, currentPhoto }: BoxPhotoUploadProps) {
  const [mode, setMode] = useState<'select' | 'camera' | 'upload'>('select');
  const [isUploading, setIsUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup camera when leaving camera mode or unmounting
  useEffect(() => {
    if (mode !== 'camera') {
      // Clean up camera when leaving camera mode
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsFrontCamera(false);
    }

    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsFrontCamera(false);
    };
  }, [mode]);

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

  const initializeCamera = async () => {
    setIsCameraLoading(true);
    setCameraError(null);

    try {
      // Check if we're in a secure context (required for camera access)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('Camera access requires HTTPS (except on localhost)');
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;

      // Detect if this is a front-facing camera
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        const facingMode = settings.facingMode;
        const isFront = facingMode === 'user' || facingMode === 'front';
        setIsFrontCamera(isFront);
        console.log('Camera facing mode:', facingMode, 'Is front camera:', isFront);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
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
        } else {
          errorMessage = error.message;
        }
      }

      setCameraError(errorMessage);
    } finally {
      setIsCameraLoading(false);
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current && streamRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const imageSrc = canvas.toDataURL('image/jpeg', 0.8);

      if (imageSrc) {
        await handlePhotoUpload(imageSrc);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const compressedPhoto = await compressImage(file);
        await handlePhotoUpload(compressedPhoto);
      } catch (error) {
        console.error('Error processing image:', error);
        toast.error('Error processing image. Please try a different photo.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handlePhotoUpload = async (photo: string) => {
    try {
      setIsUploading(true);
      onPhotoUploaded(photo);
      toast.success('Box photo uploaded successfully!');
      onClose();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Error uploading photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetMode = () => {
    setMode('select');
  };

  if (mode === 'camera') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        {/* Full screen video container */}
        <div className="flex-1 relative">
          {isCameraLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="text-center text-white p-4">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm sm:text-base">Initializing camera...</p>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="text-center text-white p-4 max-w-sm mx-4">
                <X className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-red-400" />
                <p className="mb-4 text-sm sm:text-base">{cameraError}</p>
                <Button onClick={initializeCamera} variant="outline" className="text-white border-white text-sm">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {!streamRef.current && !isCameraLoading && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="text-center text-white p-4 max-w-sm mx-4">
                <Camera className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-300" />
                <p className="mb-4 text-sm sm:text-base">Camera access required to take photos</p>
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
            style={{ transform: isFrontCamera ? 'scaleX(-1)' : 'none' }} // Mirror only front-facing cameras for better UX
          />

          {/* Hidden canvas for capturing photos */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Top right exit button */}
        <div className="absolute top-4 right-4 z-20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { resetMode(); }}
            className="bg-black bg-opacity-50 border-white text-white hover:bg-black hover:bg-opacity-70 h-10 w-10 rounded-full p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Bottom center capture button */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <Button
            onClick={capturePhoto}
            className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white hover:bg-gray-100 p-0 border-4 border-gray-300"
            disabled={isCameraLoading || !!cameraError || !streamRef.current || isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-gray-600" />
            ) : (
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white border-2 border-gray-400" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'upload') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Box Photo</h3>
              <Button variant="outline" size="sm" onClick={resetMode}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center mb-4">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
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
                className="py-3"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Select Photo'}
              </Button>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={resetMode} className="flex-1 py-3">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Box Photo</h3>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {currentPhoto && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">Current photo:</p>
              <img
                src={currentPhoto}
                alt="Current box photo"
                className="w-full h-48 object-cover rounded-lg border"
              />
            </div>
          )}

          <p className="text-gray-600 mb-6">
            Add a photo of your box to help identify it visually.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => setMode('camera')}
              className="w-full justify-start py-3"
            >
              <Camera className="h-5 w-5 mr-3" />
              Take Photo with Camera
            </Button>

            <Button
              variant="outline"
              onClick={() => setMode('upload')}
              className="w-full justify-start py-3"
            >
              <Upload className="h-5 w-5 mr-3" />
              Upload Photo from Device
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 