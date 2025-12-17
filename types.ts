
export enum PhotoSize {
  SIZE_2X3 = '2x3',
  SIZE_3X4 = '3x4',
  SIZE_4X6 = '4x6',
  SIZE_6X9 = '6x9',
  SIZE_9X12 = '9x12',
  SIZE_10X15 = '10x15',
  SIZE_13X18 = '13x18',
  SIZE_15X21 = '15x21',
  SIZE_20X30 = '20x30',
}

export enum LayoutMode {
  FILL_PAGE = 'fill_page', // Repeat one image
  MIXED = 'mixed',         // Show all images
}

export type PaperOrientation = 'portrait' | 'landscape';

export type PrintConfig = Record<PhotoSize, number>;

export interface ProcessingOptions {
  color: string; // Can be enum value or hex code
  outfitImage?: string; // Optional image reference outfit (base64)
  customPrompt?: string; // Full custom prompt override
}

export interface ImageAdjustments {
  brightness: number; // 0-200, default 100
  contrast: number;   // 0-200, default 100
  saturation: number; // 0-200, default 100
  shadows: number;    // -100 to 100, default 0
  highlights: number; // -100 to 100, default 0
}

export interface RegionalAdjustment extends ImageAdjustments {
  id: string;
  x: number; // Normalized 0-1 (Relative to image width)
  y: number; // Normalized 0-1 (Relative to image height)
  radius: number; // Normalized 0-1 (Relative to image width)
}

export interface UploadedImage {
  id: string;
  original: string; // base64
  cropped: string | null; // base64 (if cropped)
  processed: string | null; // base64 (result from AI)
  status: 'pending' | 'processing' | 'done' | 'error';
  errorMessage?: string;
  selectedOutfitId?: string; // ID of the outfit image to apply
  usedColor?: string; // Track which background color was used for the processed result
  adjustments: ImageAdjustments; // Global Image correction settings
  regionalAdjustments: RegionalAdjustment[]; // List of spot edits
}

export interface OutfitImage {
  id: string;
  original: string; // base64
}
