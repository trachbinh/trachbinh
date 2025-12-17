
import React, { useMemo } from 'react';
import { PhotoSize, PrintConfig, PaperOrientation } from '../types';

interface A4SheetProps {
  images: string[];
  config: PrintConfig;
  className?: string;
  frameImage?: string | null;
  orientation?: PaperOrientation;
}

// Margins (Requested: 1cm = 10mm on all sides)
const MARGIN_MM = 10;
const GAP_MM = 2; // Gap between photos

const getDimensions = (size: PhotoSize) => {
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
    src: string;
    width: number;
    height: number;
    x: number;
    y: number;
    page: number;
    label: string;
}

const A4Sheet: React.FC<A4SheetProps> = ({ images, config, className, frameImage, orientation = 'portrait' }) => {
  
  // A4 Dimensions in mm depending on orientation
  const isLandscape = orientation === 'landscape';
  const PAGE_WIDTH_MM = isLandscape ? 297 : 210;
  const PAGE_HEIGHT_MM = isLandscape ? 210 : 297;

  // Layout Calculation Logic
  const pages = useMemo(() => {
    // 1. Flatten Request
    const rawItems: { src: string, w: number, h: number, label: string }[] = [];
    
    for (const img of images) {
        for (const [sizeKey, qtyVal] of Object.entries(config)) {
            const size = sizeKey as PhotoSize;
            const qty = Number(qtyVal);
            if (qty > 0) {
                const dims = getDimensions(size);
                for (let i = 0; i < qty; i++) {
                    rawItems.push({
                        src: img,
                        w: dims.width,
                        h: dims.height,
                        label: size
                    });
                }
            }
        }
    }

    // 2. Sort Smallest First
    rawItems.sort((a, b) => (a.w * a.h) - (b.w * b.h));

    // 3. Calculate Positions (Cursor Algorithm)
    const computedItems: RenderItem[] = [];
    
    const startX = MARGIN_MM;
    const startY = MARGIN_MM;
    const maxW = PAGE_WIDTH_MM - MARGIN_MM;
    const maxH = PAGE_HEIGHT_MM - MARGIN_MM;

    let cursorX = startX;
    let cursorY = startY;
    let currentPage = 1;
    let rowHeight = 0;

    for (const item of rawItems) {
        // Line Wrap
        if (cursorX + item.w > maxW + 0.1) {
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

        computedItems.push({
            src: item.src,
            width: item.w,
            height: item.h,
            x: cursorX,
            y: cursorY,
            page: currentPage,
            label: item.label
        });

        rowHeight = Math.max(rowHeight, item.h);
        cursorX += item.w + GAP_MM;
    }

    // 4. Group by Page
    const totalPages = Math.max(1, currentPage); // At least 1 page even if empty
    const groupedPages: RenderItem[][] = Array.from({ length: totalPages }, () => []);
    
    computedItems.forEach(item => {
        groupedPages[item.page - 1].push(item);
    });
    
    // If no items, ensure at least one empty page exists
    if (computedItems.length === 0) {
        return [[]]; 
    }

    return groupedPages;

  }, [images, config, orientation, PAGE_WIDTH_MM, PAGE_HEIGHT_MM]);


  return (
    <div className={`flex flex-col gap-8 ${className}`}>
        {pages.map((pageItems, pageIndex) => (
            <div 
                key={pageIndex}
                className="bg-white shadow-lg relative overflow-hidden transition-all duration-300 mx-auto"
                style={{
                    width: `${PAGE_WIDTH_MM}mm`,
                    height: `${PAGE_HEIGHT_MM}mm`,
                    // We don't use padding here because items are absolutely positioned
                }}
            >
                {pageItems.map((item, i) => (
                    <div 
                        key={`${pageIndex}-${i}`} 
                        className="absolute overflow-hidden bg-gray-50 flex items-center justify-center border border-black box-border"
                        style={{
                            left: `${item.x}mm`,
                            top: `${item.y}mm`,
                            width: `${item.width}mm`,
                            height: `${item.height}mm`,
                            borderWidth: '1px'
                        }}
                    >
                        <img 
                            src={item.src} 
                            alt="ID Photo"
                            className="w-full h-full object-cover object-center" 
                        />
                        
                        {frameImage && (
                            <img 
                                src={frameImage}
                                alt="Frame"
                                className="absolute inset-0 w-full h-full object-fill z-10 pointer-events-none"
                            />
                        )}
                    </div>
                ))}
                
                {pageItems.length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm italic">
                        Cấu hình số lượng để xem trước
                    </div>
                )}

                <div className="absolute bottom-2 right-4 text-xs text-gray-400 no-print pointer-events-none">
                    Page {pageIndex + 1}/{pages.length} - {orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                </div>
            </div>
        ))}
    </div>
  );
};

export default A4Sheet;
