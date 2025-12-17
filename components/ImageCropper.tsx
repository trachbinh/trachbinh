import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Check, X, ZoomIn, RotateCw } from 'lucide-react';
import { getCroppedImg } from '../utils/cropImage';

interface ImageCropperProps {
  imageSrc: string;
  onCancel: () => void;
  onCropComplete: (croppedImage: string) => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCancel, onCropComplete }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onRotationChange = useCallback((rotation: number) => {
    setRotation(rotation);
  }, []);

  const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
      <div className="relative flex-1 w-full bg-gray-900">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={3 / 4} // Default aspect, user can change if we add props, but usually ID photos are portrait
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteCallback}
          onZoomChange={onZoomChange}
          onRotationChange={onRotationChange}
          objectFit="contain"
        />
      </div>

      <div className="bg-white p-4 pb-8 space-y-4">
        <div className="max-w-xl mx-auto space-y-4">
            {/* Controls */}
            <div className="flex gap-4 items-center text-sm font-medium text-gray-700">
                <div className="flex items-center gap-2 flex-1">
                    <ZoomIn className="w-4 h-4 text-gray-500" />
                    <span className="w-12">Zoom</span>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => onZoomChange(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                <div className="flex items-center gap-2 flex-1">
                    <RotateCw className="w-4 h-4 text-gray-500" />
                    <span className="w-12">Xoay</span>
                    <input
                        type="range"
                        value={rotation}
                        min={0}
                        max={360}
                        step={1}
                        aria-labelledby="Rotation"
                        onChange={(e) => onRotationChange(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
                <button
                    onClick={onCancel}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                    <X className="w-4 h-4" />
                    Hủy bỏ
                </button>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                    <Check className="w-4 h-4" />
                    Áp dụng cắt
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
