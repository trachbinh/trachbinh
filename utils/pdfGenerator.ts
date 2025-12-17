
import { jsPDF } from "jspdf";
import { PhotoSize, PrintConfig, PaperOrientation } from "../types";

// Helper to get dimensions in mm
export const getDimensions = (size: PhotoSize) => {
  switch (size) {
    case PhotoSize.SIZE_2X3: return { width: 20, height: 30 };
    case PhotoSize.SIZE_3X4: return { width: 30, height: 40 };
    case PhotoSize.SIZE_4X6: return { width: 40, height: 60 };
    case PhotoSize.SIZE_6X9: return { width: 60, height: 90 };
    case PhotoSize.SIZE_9X12: return { width: 90, height: 120 };
    case PhotoSize.SIZE_10X15: return { width: 100, height: 150 };
    case PhotoSize.SIZE_13X18: return { width: 130, height: 180 };
    case PhotoSize.SIZE_15X21: return { width: 150, height: 210 };
    case PhotoSize.SIZE_20X30: return { width: 200, height: 300 };
    default: return { width: 30, height: 40 };
  }
};

interface RenderItem {
  img: string;
  w: number;
  h: number;
  x: number;
  y: number;
  page: number;
}

// 300 DPI Standard: 1mm = 11.811 pixels
const DPI = 300;
const MM_TO_INCH = 0.0393701;
const PX_PER_MM = DPI * MM_TO_INCH; // ~11.81

export const generateSheetPDF = async (
  images: string[],
  config: PrintConfig,
  frameImage?: string | null,
  orientation: PaperOrientation = 'portrait'
) => {
  if (images.length === 0) return;

  // A4 Dimensions & Config (mm)
  const isLandscape = orientation === 'landscape';
  const PAGE_W_MM = isLandscape ? 297 : 210;
  const PAGE_H_MM = isLandscape ? 210 : 297;
  
  const MARGIN_MM = 10;
  const GAP_MM = 2; 

  const startX = MARGIN_MM;
  const startY = MARGIN_MM;
  const maxW = PAGE_W_MM - MARGIN_MM; 
  const maxH = PAGE_H_MM - MARGIN_MM; 

  // --- Phase 1: Layout Calculation ---
  const itemsToRender: RenderItem[] = [];
  const rawQueue: { img: string, w: number, h: number }[] = [];
  
  for (const img of images) {
      for (const [sizeKey, qty] of Object.entries(config)) {
          if (Number(qty) > 0) {
              const { width, height } = getDimensions(sizeKey as PhotoSize);
              for (let i = 0; i < Number(qty); i++) {
                  rawQueue.push({ img, w: width, h: height });
              }
          }
      }
  }

  // SORTING: Prioritize smaller images first (Area Ascending)
  rawQueue.sort((a, b) => (a.w * a.h) - (b.w * b.h));

  let cursorX = startX;
  let cursorY = startY;
  let currentPage = 1;
  let rowHeight = 0;

  for (const item of rawQueue) {
      // Line Wrap
      if (cursorX + item.w > maxW + 0.1) { // 0.1 tolerance
          cursorX = startX;
          cursorY += rowHeight + GAP_MM;
          rowHeight = 0;
      }

      // Page Wrap
      if (cursorY + item.h > maxH + 0.1) {
          currentPage++;
          cursorX = startX;
          cursorY = startY;
          rowHeight = 0;
      }

      itemsToRender.push({
          img: item.img,
          w: item.w,
          h: item.h,
          x: cursorX,
          y: cursorY,
          page: currentPage
      });

      rowHeight = Math.max(rowHeight, item.h);
      cursorX += item.w + GAP_MM;
  }

  // --- Phase 2: PDF Generation (via Canvas for Quality) ---
  const totalPages = currentPage;
  
  // Load frame image once if it exists
  let frameObj: HTMLImageElement | null = null;
  if (frameImage) {
      try {
          frameObj = await loadImage(frameImage);
      } catch (e) {
          console.warn("Could not load frame image");
      }
  }

  // Initialize PDF
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4',
  });

  for (let p = 1; p <= totalPages; p++) {
      // Create a temporary canvas to render the page at high resolution
      const canvas = document.createElement('canvas');
      const canvasWidth = Math.ceil(PAGE_W_MM * PX_PER_MM);
      const canvasHeight = Math.ceil(PAGE_H_MM * PX_PER_MM);
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      // Fill White Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Get items for this page
      const pageItems = itemsToRender.filter(i => i.page === p);

      for (const item of pageItems) {
          // Convert mm layout to pixels
          const xPx = Math.round(item.x * PX_PER_MM);
          const yPx = Math.round(item.y * PX_PER_MM);
          const wPx = Math.round(item.w * PX_PER_MM);
          const hPx = Math.round(item.h * PX_PER_MM);

          // Load Image
          const imgObj = await loadImage(item.img);
          
          // Smart Crop Logic (Object Fit: Cover)
          const imgRatio = imgObj.width / imgObj.height;
          const targetRatio = wPx / hPx;

          let renderW, renderH, offsetX, offsetY;

          if (imgRatio > targetRatio) {
              // Image is wider: Fill Height
              renderH = hPx;
              renderW = hPx * imgRatio;
              offsetX = (wPx - renderW) / 2;
              offsetY = 0;
          } else {
              // Image is taller: Fill Width
              renderW = wPx;
              renderH = wPx / imgRatio;
              offsetX = 0;
              offsetY = (hPx - renderH) / 2;
          }

          // Draw with Clipping
          ctx.save();
          ctx.beginPath();
          ctx.rect(xPx, yPx, wPx, hPx);
          ctx.clip();
          
          // Draw Image centered
          ctx.drawImage(imgObj, xPx + offsetX, yPx + offsetY, renderW, renderH);
          
          ctx.restore();

          // Draw Frame Overlay (if exists)
          if (frameObj) {
              ctx.drawImage(frameObj, xPx, yPx, wPx, hPx);
          }

          // Draw Border (Thin line on top of everything for cutting guide)
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = Math.max(1, 2 * (DPI / 96)); // Scale border thickness
          ctx.strokeRect(xPx, yPx, wPx, hPx);
      }

      // Convert Canvas to Image Data
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Add to PDF
      if (p > 1) {
          doc.addPage();
      }
      doc.addImage(imgData, 'JPEG', 0, 0, PAGE_W_MM, PAGE_H_MM);
  }

  // Save PDF
  doc.save(`ID_Photos_${orientation}_${Date.now()}.pdf`);
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};
