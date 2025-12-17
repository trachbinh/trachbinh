
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Check, Loader2, Wand2, User, RefreshCw, AlertCircle, Crop, Trash2, Plus, LayoutGrid, Copy, Shirt, Palette, Upload, XCircle, Image as ImageIcon, Download, FileText, Hash, Minus, Printer, Frame, RectangleVertical, RectangleHorizontal, ZoomIn, ZoomOut, Maximize, FileDown, AlertTriangle, SlidersHorizontal, SunMedium, Contrast, Droplets, Target, MousePointer2, Circle, Sun, Moon, Grid } from 'lucide-react';
import { PhotoSize, UploadedImage, LayoutMode, ProcessingOptions, OutfitImage, PrintConfig, PaperOrientation, ImageAdjustments, RegionalAdjustment } from '../types';
import { processIdPhoto } from '../services/geminiService';
import A4Sheet from './A4Sheet';
import ImageCropper from './ImageCropper';
import { generateSheetPDF, getDimensions } from '../utils/pdfGenerator';

const WEB_COLORS_GROUPS = [
    { name: 'Trắng & Sáng', colors: ['#FFFFFF', '#FFFAFA', '#F0FFF0', '#F5FFFA', '#F0FFFF', '#F0F8FF', '#F8F8FF', '#F5F5DC', '#FDF5E6', '#FFFFF0', '#FAEBD7', '#FAF0E6'] },
    { name: 'Xám & Đen', colors: ['#DCDCDC', '#D3D3D3', '#C0C0C0', '#A9A9A9', '#808080', '#696969', '#778899', '#708090', '#2F4F4F', '#000000'] },
    { name: 'Xanh Dương', colors: ['#E0FFFF', '#AFEEEE', '#ADD8E6', '#87CEEB', '#87CEFA', '#B0C4DE', '#B0E0E6', '#5F9EA0', '#4682B4', '#6495ED', '#00BFFF', '#1E90FF', '#4169E1', '#0000FF', '#0000CD', '#00008B', '#000080', '#191970'] },
    { name: 'Xanh Ngọc / Cyan', colors: ['#00FFFF', '#7FFFD4', '#40E0D0', '#48D1CC', '#00CED1', '#20B2AA', '#008B8B', '#008080'] },
    { name: 'Xanh Lá', colors: ['#ADFF2F', '#7FFF00', '#7CFC00', '#00FF00', '#32CD32', '#98FB98', '#90EE90', '#00FA9A', '#00FF7F', '#3CB371', '#2E8B57', '#228B22', '#008000', '#006400', '#6B8E23', '#808000', '#556B2F'] },
    { name: 'Vàng & Cam', colors: ['#FFFF00', '#FFFFE0', '#FFFACD', '#FAFAD2', '#FFEFD5', '#FFE4B5', '#FFDAB9', '#EEE8AA', '#F0E68C', '#BDB76B', '#FFD700', '#FFA500', '#FF8C00', '#FF7F50', '#FF6347', '#FF4500'] },
    { name: 'Đỏ & Hồng', colors: ['#FFA07A', '#FA8072', '#E9967A', '#F08080', '#CD5C5C', '#DC143C', '#FF0000', '#B22222', '#8B0000', '#FFC0CB', '#FFB6C1', '#FF69B4', '#FF1493', '#C71585', '#DB7093'] },
    { name: 'Tím', colors: ['#E6E6FA', '#D8BFD8', '#DDA0DD', '#EE82EE', '#DA70D6', '#FF00FF', '#BA55D3', '#9370DB', '#8A2BE2', '#9400D3', '#9932CC', '#8B008B', '#800080', '#4B0082', '#6A5ACD', '#483D8B'] },
    { name: 'Nâu', colors: ['#FFF8DC', '#FFEBCD', '#FFE4C4', '#FFDEAD', '#F5DEB3', '#DEB887', '#D2B48C', '#BC8F8F', '#F4A460', '#DAA520', '#B8860B', '#CD853F', '#D2691E', '#8B4513', '#A0522D', '#A52A2A', '#800000'] },
];

const PhotoEditor: React.FC = () => {
  // State
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [outfits, setOutfits] = useState<OutfitImage[]>([]); 
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [frameImage, setFrameImage] = useState<string | null>(null); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);
  
  // Settings
  const [printConfig, setPrintConfig] = useState<PrintConfig>(() => {
    const initial: any = {};
    Object.values(PhotoSize).forEach(s => initial[s] = 0);
    initial[PhotoSize.SIZE_3X4] = 4;
    return initial;
  });
  
  const [activeSize, setActiveSize] = useState<PhotoSize>(PhotoSize.SIZE_3X4);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(LayoutMode.MIXED);
  const [orientation, setOrientation] = useState<PaperOrientation>('portrait');
  const [showCropper, setShowCropper] = useState(false);

  // Editor Mode State
  const [editMode, setEditMode] = useState<'global' | 'local'>('global');
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);

  // Preview Zoom State
  const [zoom, setZoom] = useState<number>(0.5);

  // New Processing Settings
  const [bgColor, setBgColor] = useState<string>('#0099ff'); // Default Blue #0099ff
  const [isCustomColorMode, setIsCustomColorMode] = useState(false);
  const [showWebColors, setShowWebColors] = useState(false); // Toggle for full palette

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outfitInputRef = useRef<HTMLInputElement>(null);
  const frameInputRef = useRef<HTMLInputElement>(null); 
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 

  // Derived
  const selectedImage = useMemo(() => 
    images.find(img => img.id === selectedImageId), 
  [images, selectedImageId]);

  // Handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const id = Math.random().toString(36).substr(2, 9);
          setImages(prev => {
              const newImage: UploadedImage = {
                id,
                original: result,
                cropped: null,
                processed: null,
                status: 'pending',
                adjustments: { brightness: 100, contrast: 100, saturation: 100, shadows: 0, highlights: 0 },
                regionalAdjustments: []
              };
              const updated = [...prev, newImage];
              if (!selectedImageId && updated.length === 1) {
                  setSelectedImageId(id);
              }
              return updated;
          });
        };
        reader.readAsDataURL(file as Blob);
      });
    }
  };

  const handleOutfitUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const id = Math.random().toString(36).substr(2, 9);
          setOutfits(prev => [...prev, { id, original: result }]);
        };
        reader.readAsDataURL(file as Blob);
      });
    }
  };

  const handleFrameUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              const result = e.target?.result as string;
              setFrameImage(result);
          };
          reader.readAsDataURL(file);
      }
  };

  const deleteImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setImages(prev => {
        const next = prev.filter(img => img.id !== id);
        if (selectedImageId === id) {
            setSelectedImageId(next.length > 0 ? next[0].id : null);
        }
        return next;
    });
  };

  const deleteOutfit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOutfits(prev => prev.filter(o => o.id !== id));
    setImages(prev => prev.map(img => img.selectedOutfitId === id ? { ...img, selectedOutfitId: undefined } : img));
  };

  const handleCropComplete = (croppedBase64: string) => {
    if (selectedImageId) {
        setImages(prev => prev.map(img => {
            if (img.id === selectedImageId) {
                return { ...img, cropped: croppedBase64, processed: null, status: 'pending' as const };
            }
            return img;
        }));
    }
    setShowCropper(false);
  };

  const toggleOutfitSelection = (outfitId: string) => {
      if (!selectedImageId) return;
      setImages(prev => prev.map(img => {
          if (img.id === selectedImageId) {
              const newOutfitId = img.selectedOutfitId === outfitId ? undefined : outfitId;
              return { ...img, selectedOutfitId: newOutfitId };
          }
          return img;
      }));
  };

  const updateGlobalAdjustment = (field: keyof ImageAdjustments, value: number) => {
      if (!selectedImageId) return;
      setImages(prev => prev.map(img => {
          if (img.id === selectedImageId) {
              return {
                  ...img,
                  adjustments: { ...img.adjustments, [field]: value }
              };
          }
          return img;
      }));
  };

  const updateRegionalAdjustment = (field: keyof RegionalAdjustment, value: number) => {
      if (!selectedImageId || !activeRegionId) return;
      setImages(prev => prev.map(img => {
          if (img.id === selectedImageId) {
              const updatedRegions = img.regionalAdjustments.map(r => 
                  r.id === activeRegionId ? { ...r, [field]: value } : r
              );
              return { ...img, regionalAdjustments: updatedRegions };
          }
          return img;
      }));
  };

  const resetAdjustments = () => {
    if (!selectedImageId) return;
    setImages(prev => prev.map(img => {
        if (img.id === selectedImageId) {
            if (editMode === 'global') {
                return {
                    ...img,
                    adjustments: { brightness: 100, contrast: 100, saturation: 100, shadows: 0, highlights: 0 }
                };
            } else {
                 return { ...img, regionalAdjustments: [] };
            }
        }
        return img;
    }));
    setActiveRegionId(null);
  };

  const removeActiveRegion = () => {
      if (!selectedImageId || !activeRegionId) return;
      setImages(prev => prev.map(img => {
          if (img.id === selectedImageId) {
              return {
                  ...img,
                  regionalAdjustments: img.regionalAdjustments.filter(r => r.id !== activeRegionId)
              };
          }
          return img;
      }));
      setActiveRegionId(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (editMode !== 'local' || !selectedImageId || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      // Check if clicked existing region
      const existingRegion = selectedImage?.regionalAdjustments.find(r => {
          const dx = r.x - x;
          const dy = r.y - y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          return dist < (r.radius / 2); // approximate hit test
      });

      if (existingRegion) {
          setActiveRegionId(existingRegion.id);
      } else {
          // Create new region
          const newId = Math.random().toString(36).substr(2, 9);
          const newRegion: RegionalAdjustment = {
              id: newId,
              x,
              y,
              radius: 0.15, // Default size 15% width
              brightness: 100,
              contrast: 100,
              saturation: 100,
              shadows: 0,
              highlights: 0
          };
          
          setImages(prev => prev.map(img => {
              if (img.id === selectedImageId) {
                  return { ...img, regionalAdjustments: [...img.regionalAdjustments, newRegion] };
              }
              return img;
          }));
          setActiveRegionId(newId);
      }
  };

  // Helper to normalize color strings
  const normalizeColor = (c: string) => c.toLowerCase();

  // --- RENDERING LOGIC ---
  const clamp = (val: number) => Math.max(0, Math.min(255, val));

  // Pure 8-bit RGB manipulation function
  // Replaces all CSS filters to ensure preview matches exact digital values
  const applyImageFilters = (ctx: CanvasRenderingContext2D, width: number, height: number, adj: ImageAdjustments) => {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      const bFactor = adj.brightness / 100;
      const cFactor = adj.contrast / 100;
      const sFactor = adj.saturation / 100;
      const shFactor = adj.shadows / 100;
      const hlFactor = adj.highlights / 100;

      // Optimization: pre-check if identity
      if (bFactor === 1 && cFactor === 1 && sFactor === 1 && shFactor === 0 && hlFactor === 0) return;

      for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let bl = data[i + 2];

          // 1. Shadows / Highlights (Tone Mapping)
          if (shFactor !== 0 || hlFactor !== 0) {
              const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
              const nLum = lum / 255;
              let adjVal = 0;
              
              if (shFactor !== 0) adjVal += shFactor * Math.pow(1 - nLum, 3) * 255;
              if (hlFactor !== 0) adjVal += hlFactor * Math.pow(nLum, 3) * 255;
              
              r += adjVal;
              g += adjVal;
              bl += adjVal;
          }

          // 2. Brightness (Standard Multiplicative)
          if (bFactor !== 1) {
              r *= bFactor;
              g *= bFactor;
              bl *= bFactor;
          }

          // 3. Contrast (Pivot 128)
          if (cFactor !== 1) {
              r = (r - 128) * cFactor + 128;
              g = (g - 128) * cFactor + 128;
              bl = (bl - 128) * cFactor + 128;
          }

          // 4. Saturation (Gray mix)
          if (sFactor !== 1) {
             const gray = 0.299 * r + 0.587 * g + 0.114 * bl;
             r = gray + (r - gray) * sFactor;
             g = gray + (g - gray) * sFactor;
             bl = gray + (bl - gray) * sFactor;
          }

          // Strict 8-bit clamping
          data[i] = clamp(r);
          data[i + 1] = clamp(g);
          data[i + 2] = clamp(bl);
      }
      ctx.putImageData(imageData, 0, 0);
  };

  const drawCompositeImage = (
      canvas: HTMLCanvasElement, 
      baseImageSrc: string, 
      globalAdj: ImageAdjustments, 
      regions: RegionalAdjustment[]
  ) => {
      return new Promise<void>((resolve) => {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) { resolve(); return; }

          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = canvas.width;
              tempCanvas.height = canvas.height;
              const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
              if (!tCtx) return;

              // 1. Draw Global
              tCtx.drawImage(img, 0, 0);
              applyImageFilters(tCtx, canvas.width, canvas.height, globalAdj);
              
              ctx.drawImage(tempCanvas, 0, 0);

              // 2. Draw Regions
              if (regions && regions.length > 0) {
                  regions.forEach(r => {
                      // Reset temp to original
                      tCtx.drawImage(img, 0, 0);
                      
                      // Calculate Combined Adjustment for Region
                      // We approximate effect combination
                      const combinedAdj: ImageAdjustments = {
                          brightness: (globalAdj.brightness / 100) * (r.brightness / 100) * 100,
                          contrast: (globalAdj.contrast / 100) * (r.contrast / 100) * 100,
                          saturation: (globalAdj.saturation / 100) * (r.saturation / 100) * 100,
                          shadows: Math.max(-100, Math.min(100, globalAdj.shadows + r.shadows)),
                          highlights: Math.max(-100, Math.min(100, globalAdj.highlights + r.highlights))
                      };

                      applyImageFilters(tCtx, canvas.width, canvas.height, combinedAdj);

                      // Create Mask
                      const regionCanvas = document.createElement('canvas');
                      regionCanvas.width = canvas.width;
                      regionCanvas.height = canvas.height;
                      const rCtx = regionCanvas.getContext('2d');
                      if(!rCtx) return;

                      rCtx.drawImage(tempCanvas, 0, 0);

                      rCtx.globalCompositeOperation = 'destination-in';
                      const cx = r.x * canvas.width;
                      const cy = r.y * canvas.height;
                      const radiusPx = r.radius * canvas.width;
                      
                      const grad = rCtx.createRadialGradient(cx, cy, 0, cx, cy, radiusPx);
                      grad.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
                      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)'); 
                      grad.addColorStop(1, 'rgba(255, 255, 255, 0)'); 

                      rCtx.fillStyle = grad;
                      rCtx.fillRect(0, 0, canvas.width, canvas.height);

                      ctx.drawImage(regionCanvas, 0, 0);
                  });
              }
              resolve();
          };
          img.src = baseImageSrc;
      });
  };

  useEffect(() => {
      if (selectedImage && canvasRef.current) {
          const source = selectedImage.processed || selectedImage.cropped || selectedImage.original;
          drawCompositeImage(
              canvasRef.current, 
              source, 
              selectedImage.adjustments, 
              selectedImage.regionalAdjustments
          );
      }
  }, [selectedImage, selectedImageId]);

  const generateFinalImage = async (img: UploadedImage): Promise<string> => {
      const source = img.cropped || img.original;
      const canvas = document.createElement('canvas');
      await drawCompositeImage(canvas, source, img.adjustments, img.regionalAdjustments);
      return canvas.toDataURL('image/jpeg', 0.95);
  };

  const resizeForAI = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
             const MAX_DIM = 1024;
             if (img.width <= MAX_DIM && img.height <= MAX_DIM) {
                 resolve(base64);
                 return;
             }
             const canvas = document.createElement('canvas');
             let w = img.width;
             let h = img.height;
             const ratio = w / h;
             
             if (w > h) {
                 w = MAX_DIM;
                 h = w / ratio;
             } else {
                 h = MAX_DIM;
                 w = h * ratio;
             }
             
             canvas.width = w;
             canvas.height = h;
             const ctx = canvas.getContext('2d');
             if (ctx) {
                 ctx.drawImage(img, 0, 0, w, h);
                 resolve(canvas.toDataURL('image/jpeg', 0.9));
             } else {
                 resolve(base64);
             }
        };
        img.onerror = () => resolve(base64); 
        img.src = base64;
    });
  };

  const processImage = async (img: UploadedImage) => {
      const adjustedSource = await generateFinalImage(img);
      const source = await resizeForAI(adjustedSource);

      const outfitData = img.selectedOutfitId 
        ? outfits.find(o => o.id === img.selectedOutfitId)?.original 
        : undefined;

      const options: ProcessingOptions = {
          color: bgColor,
          outfitImage: outfitData
      };

      try {
          const result = await processIdPhoto(source, options);
          return { success: true, result, usedColor: bgColor };
      } catch (err: any) {
          return { success: false, error: err.message };
      }
  };

  const handleGenerateSelected = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    
    setImages(prev => prev.map(img => img.id === selectedImage.id ? { ...img, status: 'processing' as const, errorMessage: undefined } : img));

    const { success, result, error, usedColor } = await processImage(selectedImage);

    setImages(prev => prev.map(img => {
        if (img.id === selectedImage.id) {
            return {
                ...img,
                status: success ? 'done' as const : 'error' as const,
                processed: success ? result : null,
                errorMessage: error,
                usedColor: success ? usedColor : img.usedColor
            };
        }
        return img;
    }));
    setIsProcessing(false);
  };

  const handleGenerateAll = async () => {
      if (images.length === 0) return;
      setIsProcessing(true);
      
      try {
          setImages(prev => prev.map(img => ({ ...img, status: 'processing' as const, errorMessage: undefined })));

          const imagesToProcess = [...images];
          
          for (let i = 0; i < imagesToProcess.length; i++) {
              const img = imagesToProcess[i];
              const { success, result, error, usedColor } = await processImage(img);
              
              setImages(prev => prev.map(pImg => {
                  if (pImg.id === img.id) {
                      return {
                          ...pImg,
                          status: success ? 'done' as const : 'error' as const,
                          processed: success ? result : null,
                          errorMessage: error,
                          usedColor: success ? usedColor : pImg.usedColor
                      };
                  }
                  return pImg;
              }));

              if (i < imagesToProcess.length - 1) {
                await new Promise(r => setTimeout(r, 3000));
              }
          }
      } catch (e) {
          console.error("Batch processing error:", e);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleDownloadSingle = async () => {
      if (!selectedImage) return;
      
      let imgToDownload = selectedImage.processed;
      if (!imgToDownload) {
           imgToDownload = await generateFinalImage(selectedImage);
      }

      const { width: mmW, height: mmH } = getDimensions(activeSize);
      
      const pixelsPerCm = 300;
      const pxW = Math.round((mmW / 10) * pixelsPerCm);
      const pxH = Math.round((mmH / 10) * pixelsPerCm);

      const canvas = document.createElement('canvas');
      canvas.width = pxW;
      canvas.height = pxH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = imgToDownload;
      await new Promise((resolve) => { img.onload = resolve; });

      const scale = Math.max(pxW / img.width, pxH / img.height);
      const x = (pxW / 2) - (img.width / 2) * scale;
      const y = (pxH / 2) - (img.height / 2) * scale;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      if (frameImage) {
          const frameImg = new Image();
          frameImg.src = frameImage;
          await new Promise((resolve, reject) => { 
              frameImg.onload = resolve;
              frameImg.onerror = () => resolve(null);
          });
          ctx.drawImage(frameImg, 0, 0, pxW, pxH);
      }

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.download = `Photo_${activeSize}_300ppcm_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
      if (imagesForSheet.length === 0) return;
      const totalQty = (Object.values(printConfig) as number[]).reduce((sum, val) => sum + val, 0);
      if (totalQty === 0) {
          alert("Vui lòng nhập số lượng hình cần in.");
          return;
      }

      setIsGeneratingSheet(true);
      try {
          await generateSheetPDF(imagesForSheet, printConfig, frameImage, orientation);
      } catch (error) {
          console.error("Error generating PDF:", error);
          alert("Có lỗi khi tạo PDF.");
      } finally {
          setIsGeneratingSheet(false);
      }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const updateQuantity = (size: PhotoSize, delta: number) => {
      setPrintConfig(prev => {
          const newVal = Math.max(0, (prev[size] || 0) + delta);
          return { ...prev, [size]: newVal };
      });
      setActiveSize(size);
  };

  const setQuantity = (size: PhotoSize, val: string) => {
      const num = parseInt(val) || 0;
      setPrintConfig(prev => ({ ...prev, [size]: Math.max(0, num) }));
      setActiveSize(size);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.2));
  const handleZoomReset = () => setZoom(0.5);

  const imagesForSheet = useMemo(() => {
      if (layoutMode === LayoutMode.FILL_PAGE) {
          if (selectedImage?.processed) return [selectedImage.processed];
          if (selectedImage?.cropped) return [selectedImage.cropped];
          if (selectedImage?.original) return [selectedImage.original];
          return [];
      } else {
          return images.map(img => img.processed || img.cropped || img.original);
      }
  }, [layoutMode, selectedImage, images]);

  const PRESET_COLORS = [
      { val: 'original', label: 'Giữ nền', class: 'bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300', icon: ImageIcon },
      { val: '#0099ff', label: 'Xanh chuẩn', class: 'bg-[#0099ff]' },
      { val: '#3b82f6', label: 'Xanh nhạt', class: 'bg-blue-500' },
      { val: '#ffffff', label: 'Trắng', class: 'bg-white border border-gray-200' },
      { val: '#ef4444', label: 'Đỏ', class: 'bg-red-500' },
      { val: '#9ca3af', label: 'Xám', class: 'bg-gray-400' },
  ];

  const hasColorMismatch = images.some(img => 
      img.status === 'done' && 
      img.usedColor && 
      normalizeColor(img.usedColor) !== normalizeColor(bgColor)
  );

  const activeRegion = selectedImage?.regionalAdjustments.find(r => r.id === activeRegionId);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {showCropper && selectedImage && (
          <ImageCropper 
            imageSrc={selectedImage.original} 
            onCancel={() => setShowCropper(false)}
            onCropComplete={handleCropComplete}
          />
      )}

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 no-print shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
                <User className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">ID Photo Maker AI</h1>
          </div>
          <div className="flex gap-2">
            <button
                onClick={triggerFileUpload}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
            >
                <Plus className="w-4 h-4" />
                Thêm ảnh
            </button>
            {imagesForSheet.length > 0 && (
                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingSheet}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                        title="Tải tất cả các trang thành 1 file PDF"
                    >
                        {isGeneratingSheet ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                        Tải PDF
                    </button>
                </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Controls */}
          <div className="lg:col-span-4 space-y-6 no-print">
            
            {/* 1. Image List / Upload */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 flex justify-between items-center">
                  1. Danh sách người
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{images.length} ảnh</span>
              </h2>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" multiple className="hidden" />
              
              <div className="flex gap-3 overflow-x-auto pb-2 mb-4 scrollbar-thin scrollbar-thumb-gray-300">
                  {images.map((img) => (
                      <div 
                        key={img.id}
                        onClick={() => setSelectedImageId(img.id)}
                        className={`relative flex-shrink-0 w-20 h-24 rounded-lg border-2 cursor-pointer overflow-hidden group transition-all ${selectedImageId === img.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                          {/* Thumbnail */}
                          <img 
                            src={img.processed || img.cropped || img.original} 
                            className="w-full h-full object-cover" 
                            alt="thumbnail"
                            style={!img.processed ? {
                                filter: `brightness(${img.adjustments.brightness}%) contrast(${img.adjustments.contrast}%) saturate(${img.adjustments.saturation}%)`
                            } : undefined}
                          />
                          
                          {img.selectedOutfitId && (
                              <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-0.5 rounded-tl-md">
                                  <Shirt className="w-3 h-3" />
                              </div>
                          )}

                          {img.status === 'processing' && (
                              <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                              </div>
                          )}
                          {img.status === 'error' && (
                              <div className="absolute top-1 right-1">
                                  <AlertCircle className="w-4 h-4 text-red-500 bg-white rounded-full" />
                              </div>
                          )}
                          {img.status === 'done' && (
                              <div className="absolute top-1 right-1">
                                  <Check className="w-4 h-4 text-green-500 bg-white rounded-full p-0.5" />
                              </div>
                          )}
                          
                          {/* Color Mismatch Warning */}
                          {img.status === 'done' && img.usedColor && normalizeColor(img.usedColor) !== normalizeColor(bgColor) && (
                              <div className="absolute top-1 left-1 bg-yellow-400 text-black rounded-full p-0.5 shadow-sm" title="Màu nền không khớp với lựa chọn hiện tại">
                                  <AlertTriangle className="w-3 h-3" />
                              </div>
                          )}

                          <button 
                            onClick={(e) => deleteImage(img.id, e)}
                            className="absolute bottom-1 right-1 bg-white/90 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 shadow-sm"
                          >
                              <Trash2 className="w-3 h-3" />
                          </button>
                      </div>
                  ))}
                  
                  <div 
                    onClick={triggerFileUpload}
                    className="flex-shrink-0 w-20 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors text-gray-400 hover:text-blue-500"
                  >
                      <Plus className="w-6 h-6 mb-1" />
                      <span className="text-xs font-medium">Thêm</span>
                  </div>
              </div>

              {selectedImage ? (
                  <div className="relative rounded-lg border border-gray-200 bg-gray-50 overflow-hidden group shadow-md select-none">
                      {/* Interactive Canvas Preview */}
                      <div className="aspect-[3/4] w-full max-h-[400px] relative">
                          <canvas 
                              ref={canvasRef}
                              className={`w-full h-full object-contain bg-white ${editMode === 'local' ? 'cursor-crosshair' : ''}`}
                              onClick={handleCanvasClick}
                          />
                          
                          {frameImage && (
                              <img src={frameImage} className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10" alt="frame" />
                          )}

                          {/* Render visual indicators for regions in local mode */}
                          {editMode === 'local' && selectedImage.regionalAdjustments.map(region => (
                              <div
                                  key={region.id}
                                  className={`absolute border-2 rounded-full pointer-events-none transition-colors ${region.id === activeRegionId ? 'border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'border-white/50'}`}
                                  style={{
                                      left: `${(region.x * 100) - (region.radius * 100)}%`,
                                      top: `${(region.y * 100) - ((region.radius * (canvasRef.current ? (canvasRef.current.width/canvasRef.current.height) : 0.75)) * 100)}%`,
                                      width: `${region.radius * 200}%`,
                                      height: `${region.radius * 200 * (canvasRef.current ? (canvasRef.current.width/canvasRef.current.height) : 0.75)}%`,
                                      transform: 'translate(0%, 0%)' 
                                  }}
                              />
                          ))}
                      </div>
                      
                      {/* Action Overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-wrap justify-center gap-3 z-20">
                        <button 
                            onClick={() => setShowCropper(true)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-full font-semibold text-sm hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg ring-1 ring-white/20"
                            disabled={isProcessing}
                        >
                            <Crop className="w-4 h-4" /> Cắt ảnh
                        </button>
                        
                        <button
                            onClick={handleDownloadSingle}
                            className="bg-green-600 text-white px-4 py-2 rounded-full font-semibold text-sm hover:bg-green-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg ring-1 ring-white/20"
                            title={`Tải ảnh kích thước ${activeSize} (Chuẩn 300px/cm)`}
                        >
                            <Download className="w-4 h-4" /> Tải về
                        </button>

                        {selectedImage.processed && (
                             <button 
                                onClick={() => setImages(prev => prev.map(img => img.id === selectedImage.id ? { ...img, processed: null, status: 'pending' as const, usedColor: undefined } : img))}
                                className="bg-white text-red-600 px-4 py-2 rounded-full font-semibold text-sm hover:bg-red-50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg"
                             >
                                <RefreshCw className="w-4 h-4" /> Gốc
                            </button>
                        )}
                      </div>
                      
                      {selectedImage.errorMessage && (
                          <div className="absolute top-0 left-0 right-0 bg-red-100 text-red-700 text-xs p-2 text-center z-30">
                              {selectedImage.errorMessage}
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="text-center p-8 text-gray-400 text-sm">
                      Chọn ảnh để chỉnh sửa
                  </div>
              )}
            </div>
            
            {/* Image Adjustments Section */}
            {selectedImage && !selectedImage.processed && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4 border-b pb-3">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4" /> Chỉnh sửa ảnh
                        </h2>
                        <div className="flex gap-2 text-xs">
                             <button 
                                onClick={() => { setEditMode('global'); setActiveRegionId(null); }}
                                className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${editMode === 'global' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
                             >
                                <Target className="w-3 h-3" /> Toàn ảnh
                             </button>
                             <button 
                                onClick={() => setEditMode('local')}
                                className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${editMode === 'local' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
                             >
                                <MousePointer2 className="w-3 h-3" /> Theo vùng
                             </button>
                        </div>
                    </div>

                    {editMode === 'local' && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                             <p className="flex items-center gap-2 mb-2 font-medium">
                                 <MousePointer2 className="w-4 h-4" /> Nhấn vào ảnh để chọn vùng
                             </p>
                             <p className="text-xs text-blue-600 opacity-80">
                                 Click vào khuôn mặt hoặc vị trí cần sửa để tạo vùng chọn.
                             </p>
                        </div>
                    )}
                    
                    {editMode === 'local' && activeRegion && (
                         <div className="mb-4 pb-4 border-b border-gray-100">
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold uppercase text-gray-500">Vùng đang chọn</span>
                                <button onClick={removeActiveRegion} className="text-xs text-red-500 hover:underline">Xóa vùng này</button>
                             </div>
                             <div className="space-y-1">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span className="flex items-center gap-1"><Circle className="w-3 h-3" /> Kích thước vùng</span>
                                    <span className="font-mono text-xs">{Math.round(activeRegion.radius * 100)}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="5" 
                                    max="50" 
                                    value={activeRegion.radius * 100}
                                    onChange={(e) => updateRegionalAdjustment('radius', Number(e.target.value) / 100)}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                />
                             </div>
                         </div>
                    )}

                    <div className={`space-y-4 ${editMode === 'local' && !activeRegion ? 'opacity-50 pointer-events-none' : ''}`}>
                         {/* Controls for current mode */}
                         <div className="flex justify-end mb-2">
                             <button onClick={resetAdjustments} className="text-xs text-blue-600 hover:underline">
                                {editMode === 'global' ? 'Đặt lại toàn bộ' : 'Xóa tất cả vùng'}
                             </button>
                         </div>

                        {/* Brightness */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span className="flex items-center gap-1"><SunMedium className="w-3 h-3" /> Độ sáng</span>
                                <span className="font-mono text-xs">
                                    {editMode === 'global' ? selectedImage.adjustments.brightness : (activeRegion?.brightness || 100)}%
                                </span>
                            </div>
                            <input 
                                type="range" 
                                min="50" 
                                max="150" 
                                value={editMode === 'global' ? selectedImage.adjustments.brightness : (activeRegion?.brightness || 100)}
                                onChange={(e) => editMode === 'global' ? updateGlobalAdjustment('brightness', Number(e.target.value)) : updateRegionalAdjustment('brightness', Number(e.target.value))}
                                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${editMode === 'global' ? 'accent-blue-600' : 'accent-green-600'}`}
                            />
                        </div>

                        {/* Contrast */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span className="flex items-center gap-1"><Contrast className="w-3 h-3" /> Tương phản</span>
                                <span className="font-mono text-xs">
                                    {editMode === 'global' ? selectedImage.adjustments.contrast : (activeRegion?.contrast || 100)}%
                                </span>
                            </div>
                            <input 
                                type="range" 
                                min="50" 
                                max="150" 
                                value={editMode === 'global' ? selectedImage.adjustments.contrast : (activeRegion?.contrast || 100)}
                                onChange={(e) => editMode === 'global' ? updateGlobalAdjustment('contrast', Number(e.target.value)) : updateRegionalAdjustment('contrast', Number(e.target.value))}
                                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${editMode === 'global' ? 'accent-blue-600' : 'accent-green-600'}`}
                            />
                        </div>

                        {/* Saturation */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> Bão hòa</span>
                                <span className="font-mono text-xs">
                                    {editMode === 'global' ? selectedImage.adjustments.saturation : (activeRegion?.saturation || 100)}%
                                </span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="200" 
                                value={editMode === 'global' ? selectedImage.adjustments.saturation : (activeRegion?.saturation || 100)}
                                onChange={(e) => editMode === 'global' ? updateGlobalAdjustment('saturation', Number(e.target.value)) : updateRegionalAdjustment('saturation', Number(e.target.value))}
                                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${editMode === 'global' ? 'accent-blue-600' : 'accent-green-600'}`}
                            />
                        </div>

                        {/* Shadows */}
                        <div className="space-y-1 pt-2 border-t border-dashed border-gray-200">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span className="flex items-center gap-1"><Moon className="w-3 h-3" /> Vùng tối (Shadows)</span>
                                <span className="font-mono text-xs">
                                    {editMode === 'global' ? selectedImage.adjustments.shadows : (activeRegion?.shadows || 0)}
                                </span>
                            </div>
                            <input 
                                type="range" 
                                min="-100" 
                                max="100" 
                                value={editMode === 'global' ? selectedImage.adjustments.shadows : (activeRegion?.shadows || 0)}
                                onChange={(e) => editMode === 'global' ? updateGlobalAdjustment('shadows', Number(e.target.value)) : updateRegionalAdjustment('shadows', Number(e.target.value))}
                                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${editMode === 'global' ? 'accent-blue-600' : 'accent-green-600'}`}
                            />
                        </div>

                        {/* Highlights */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span className="flex items-center gap-1"><Sun className="w-3 h-3" /> Vùng sáng (Highlights)</span>
                                <span className="font-mono text-xs">
                                    {editMode === 'global' ? selectedImage.adjustments.highlights : (activeRegion?.highlights || 0)}
                                </span>
                            </div>
                            <input 
                                type="range" 
                                min="-100" 
                                max="100" 
                                value={editMode === 'global' ? selectedImage.adjustments.highlights : (activeRegion?.highlights || 0)}
                                onChange={(e) => editMode === 'global' ? updateGlobalAdjustment('highlights', Number(e.target.value)) : updateRegionalAdjustment('highlights', Number(e.target.value))}
                                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${editMode === 'global' ? 'accent-blue-600' : 'accent-green-600'}`}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Configuration Section */}
            <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-opacity ${images.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
              <h2 className="text-lg font-semibold mb-4 text-gray-800">2. Cấu hình & Xử lý</h2>
              
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Palette className="w-4 h-4" /> Màu phông nền
                    </label>
                    {hasColorMismatch && (
                        <span className="text-[10px] text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full animate-pulse">
                            Bấm xử lý để áp dụng màu mới
                        </span>
                    )}
                </div>
                <div className="flex gap-2 flex-wrap mb-3">
                    {PRESET_COLORS.map((color) => {
                         const Icon = color.icon;
                         return (
                         <button
                            key={color.val}
                            onClick={() => {
                                setBgColor(color.val);
                                setIsCustomColorMode(false);
                            }}
                            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                                !isCustomColorMode && bgColor === color.val
                                    ? 'ring-2 ring-offset-2 ring-blue-500 scale-105' 
                                    : 'hover:scale-105 opacity-90 hover:opacity-100'
                            } ${color.class}`}
                            title={color.label}
                        >
                            {!isCustomColorMode && bgColor === color.val ? (
                                <Check className={`w-5 h-5 ${color.val === '#ffffff' ? 'text-black' : 'text-white'} ${color.val === 'original' ? 'text-gray-700' : ''}`} />
                            ) : (
                                Icon ? <Icon className="w-5 h-5 text-gray-500" /> : null
                            )}
                        </button>
                    )})}
                    
                     <div className="relative">
                        <button
                            onClick={() => {
                                setShowWebColors(!showWebColors);
                                setIsCustomColorMode(true);
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 ${
                                isCustomColorMode || showWebColors
                                    ? 'ring-2 ring-offset-2 ring-blue-500 scale-105' 
                                    : 'hover:scale-105 opacity-90 hover:opacity-100'
                            }`}
                            title="Mở bảng màu Web"
                        >
                            <Grid className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="relative rounded-md shadow-sm w-32">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">#</span>
                            </div>
                            <input
                            type="text"
                            className={`focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-2 sm:text-sm border-gray-300 rounded-md py-2 border font-mono uppercase ${bgColor === 'original' ? 'bg-gray-100 text-gray-400' : ''}`}
                            placeholder="000000"
                            maxLength={6}
                            disabled={bgColor === 'original'}
                            value={bgColor === 'original' ? 'GỐC' : (bgColor.startsWith('#') ? bgColor.substring(1) : bgColor)}
                            onChange={(e) => {
                                const cleanVal = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                                setBgColor(`#${cleanVal}`);
                                setIsCustomColorMode(true);
                            }}
                            />
                        </div>
                        <span className="text-xs text-gray-500">Hex</span>
                        
                        <div className="h-8 w-8 rounded border border-gray-200" style={{
                                backgroundColor: bgColor === 'original' ? 'transparent' : (bgColor.startsWith('#') ? bgColor : '#'+bgColor),
                                backgroundImage: bgColor === 'original' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                                backgroundSize: '8px 8px',
                                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                                }}>
                        </div>
                        {/* Hidden native input for fallback */}
                        <input
                            ref={colorPickerRef}
                            type="color"
                            value={bgColor.startsWith('#') ? bgColor : '#000000'}
                            onChange={(e) => {
                                setBgColor(e.target.value);
                                setIsCustomColorMode(true);
                            }}
                            className="w-8 h-8 opacity-0 absolute pointer-events-none"
                        />
                         <button 
                            onClick={() => colorPickerRef.current?.click()}
                            className="text-xs text-blue-600 hover:underline"
                         >
                             (Picker)
                         </button>
                    </div>

                    {/* Web Colors Palette */}
                    {showWebColors && (
                        <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                             <div className="bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 border-b border-gray-200 flex justify-between items-center">
                                 <span>Bảng màu Web (Standard Web Colors)</span>
                                 <button onClick={() => setShowWebColors(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-4 h-4" /></button>
                             </div>
                             <div className="p-2 max-h-60 overflow-y-auto bg-white scrollbar-thin">
                                 {WEB_COLORS_GROUPS.map((group) => (
                                     <div key={group.name} className="mb-3">
                                         <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{group.name}</div>
                                         <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
                                             {group.colors.map(color => (
                                                 <button
                                                     key={color}
                                                     onClick={() => {
                                                         setBgColor(color);
                                                         setIsCustomColorMode(true);
                                                     }}
                                                     className={`w-full aspect-square rounded-sm border shadow-sm transition-transform hover:scale-110 hover:z-10 relative group ${bgColor.toLowerCase() === color.toLowerCase() ? 'ring-2 ring-blue-500 ring-offset-1 border-transparent' : 'border-gray-200'}`}
                                                     style={{ backgroundColor: color }}
                                                     title={color}
                                                 >
                                                     {/* Tooltip on hover */}
                                                     <span className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-gray-800 text-white text-[9px] rounded whitespace-nowrap pointer-events-none z-20">
                                                         {color}
                                                     </span>
                                                 </button>
                                             ))}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    )}
                </div>
              </div>

               {/* Frame/Border Section */}
               <div className="mb-6">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Frame className="w-4 h-4" /> Khung ảnh / Viền
                  </label>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                          <div className="relative w-12 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-white cursor-pointer hover:border-blue-500" onClick={() => frameInputRef.current?.click()}>
                             {frameImage ? (
                                 <img src={frameImage} alt="Frame" className="w-full h-full object-contain p-1" />
                             ) : (
                                 <Upload className="w-4 h-4 text-gray-400" />
                             )}
                          </div>
                          <div className="flex-1">
                                <div className="text-xs font-medium text-gray-700 mb-1">Tải lên khung viền (PNG)</div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => frameInputRef.current?.click()} 
                                        className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-100"
                                    >
                                        Chọn file
                                    </button>
                                    {frameImage && (
                                        <button 
                                            onClick={() => setFrameImage(null)} 
                                            className="text-xs text-red-600 hover:underline"
                                        >
                                            Xóa khung
                                        </button>
                                    )}
                                </div>
                                <input type="file" ref={frameInputRef} onChange={handleFrameUpload} accept="image/png,image/jpeg" className="hidden" />
                          </div>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2">
                          * Khung sẽ được phủ lên trên ảnh thẻ. Nên dùng ảnh PNG trong suốt.
                      </p>
                  </div>
               </div>

               {/* Outfit Change Section */}
               <div className="mb-6">
                 <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Shirt className="w-4 h-4" /> Thay đổi trang phục
                 </label>
                 
                 <div className="space-y-4">
                     <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs font-semibold text-gray-600">THƯ VIỆN TRANG PHỤC</span>
                             <button 
                                onClick={() => outfitInputRef.current?.click()}
                                className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
                             >
                                 <Upload className="w-3 h-3" /> Tải thêm
                             </button>
                             <input type="file" ref={outfitInputRef} onChange={handleOutfitUpload} accept="image/*" multiple className="hidden" />
                        </div>
                        
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                             {outfits.length === 0 && (
                                 <div className="text-xs text-gray-400 italic py-2">Chưa có trang phục mẫu.</div>
                             )}
                             {outfits.map(outfit => (
                                 <div 
                                    key={outfit.id} 
                                    className={`relative flex-shrink-0 w-16 h-16 rounded-md border-2 cursor-pointer overflow-hidden ${selectedImage?.selectedOutfitId === outfit.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
                                    onClick={() => toggleOutfitSelection(outfit.id)}
                                    title="Click để chọn cho ảnh hiện tại"
                                 >
                                     <img src={outfit.original} className="w-full h-full object-cover" alt="outfit" />
                                     {selectedImage?.selectedOutfitId === outfit.id && (
                                         <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                             <Check className="w-4 h-4 text-white bg-blue-500 rounded-full p-0.5" />
                                         </div>
                                     )}
                                     <button 
                                        onClick={(e) => deleteOutfit(outfit.id, e)}
                                        className="absolute top-0 right-0 bg-white/80 p-0.5 hover:text-red-500 opacity-0 hover:opacity-100 transition-opacity"
                                     >
                                         <XCircleIcon className="w-3 h-3" />
                                     </button>
                                 </div>
                             ))}
                        </div>
                     </div>
                 </div>
               </div>

              {/* Actions */}
              <div className="space-y-3">
                  <button
                    onClick={handleGenerateSelected}
                    disabled={isProcessing || !selectedImage}
                    className={`w-full py-3 px-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2 shadow-sm transition-all ${
                        isProcessing 
                            ? 'bg-blue-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isProcessing && selectedImage?.status === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    Xử lý ảnh đang chọn
                  </button>
                  
                  {images.length > 1 && (
                      <button
                        onClick={handleGenerateAll}
                        disabled={isProcessing}
                        className={`w-full py-3 px-4 rounded-lg font-medium border flex items-center justify-center gap-2 transition-all ${
                            hasColorMismatch 
                                ? 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 ring-1 ring-yellow-300' 
                                : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                         {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="flex -space-x-1"><Wand2 className="w-4 h-4" /><Wand2 className="w-4 h-4" /></div>}
                         {hasColorMismatch ? 'Cập nhật màu cho tất cả' : `Xử lý tất cả (${images.length} ảnh)`}
                      </button>
                  )}
              </div>

            </div>
          </div>

          {/* Right Panel: Preview & Quantity */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
                 <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h3 className="font-semibold text-gray-800">Cấu hình in ấn (Số lượng mỗi ảnh)</h3>
                            <p className="text-sm text-gray-500">Nhập số lượng cho từng kích thước bạn muốn in.</p>
                        </div>
                        
                         {/* Layout Controls */}
                         <div className="flex gap-3 items-center self-end md:self-auto flex-wrap">
                            {/* Paper Orientation Toggle */}
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setOrientation('portrait')}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-all ${
                                        orientation === 'portrait'
                                            ? 'bg-white text-blue-700 shadow-sm' 
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                    title="Giấy dọc (Portrait)"
                                >
                                    <RectangleVertical className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setOrientation('landscape')}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-all ${
                                        orientation === 'landscape'
                                            ? 'bg-white text-blue-700 shadow-sm' 
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                    title="Giấy ngang (Landscape)"
                                >
                                    <RectangleHorizontal className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Mode Toggle */}
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setLayoutMode(LayoutMode.FILL_PAGE)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                        layoutMode === LayoutMode.FILL_PAGE 
                                            ? 'bg-white text-blue-700 shadow-sm' 
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    <Copy className="w-4 h-4" />
                                    1 Ảnh
                                </button>
                                <button
                                    onClick={() => setLayoutMode(LayoutMode.MIXED)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                        layoutMode === LayoutMode.MIXED
                                            ? 'bg-white text-blue-700 shadow-sm' 
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                    Nhiều ảnh
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Size & Quantity Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                        {Object.values(PhotoSize).map((size) => (
                            <div key={size} className={`flex items-center justify-between p-2 rounded-lg border ${printConfig[size] > 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                                <button 
                                    onClick={() => setActiveSize(size)}
                                    className={`text-sm font-medium ${activeSize === size ? 'text-blue-700 underline' : 'text-gray-700'}`}
                                >
                                    {size.replace('x', ' x ')}
                                </button>
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => updateQuantity(size, -1)}
                                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-600"
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={printConfig[size]}
                                        onChange={(e) => setQuantity(size, e.target.value)}
                                        className="w-8 text-center bg-transparent text-sm font-semibold p-0 border-none focus:ring-0"
                                    />
                                    <button 
                                        onClick={() => updateQuantity(size, 1)}
                                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-600"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>
                 
            {/* The A4 Sheet Preview */}
            <div className="bg-gray-200 p-4 sm:p-8 rounded-xl overflow-hidden min-h-[500px] flex flex-col">
                {/* Zoom Controls */}
                <div className="flex justify-end mb-4">
                     <div className="bg-white rounded-lg shadow-sm p-1 flex items-center gap-1 border border-gray-200">
                         <button onClick={handleZoomOut} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600" title="Thu nhỏ">
                             <ZoomOut className="w-4 h-4" />
                         </button>
                         <span className="text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
                         <button onClick={handleZoomIn} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600" title="Phóng to">
                             <ZoomIn className="w-4 h-4" />
                         </button>
                         <div className="w-px h-4 bg-gray-200 mx-1"></div>
                         <button onClick={handleZoomReset} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600" title="Vừa màn hình">
                             <Maximize className="w-4 h-4" />
                         </button>
                     </div>
                </div>

                <div className="flex-1 overflow-auto flex justify-center items-start">
                    <div 
                        style={{ 
                            transform: `scale(${zoom})`, 
                            transformOrigin: 'top center',
                            transition: 'transform 0.2s ease-out'
                        }}
                    >
                        {imagesForSheet.length > 0 ? (
                            <A4Sheet 
                            images={imagesForSheet} 
                            config={printConfig}
                            frameImage={frameImage}
                            orientation={orientation}
                            />
                        ) : (
                            <div 
                                className="bg-white shadow-lg flex flex-col items-center justify-center text-gray-300 transition-all duration-300"
                                style={{
                                    width: orientation === 'landscape' ? '297mm' : '210mm',
                                    height: orientation === 'landscape' ? '210mm' : '297mm'
                                }}
                            >
                                <User className="w-24 h-24 mb-4 opacity-50" />
                                <p className="text-xl font-medium">Chưa có ảnh nào được chọn</p>
                                <p className="text-sm">Tải ảnh lên và xử lý để xem kết quả</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const XCircleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);

export default PhotoEditor;
