
import { Document, Packer, Paragraph, Table, TableRow, TableCell, ImageRun, WidthType, BorderStyle, PageOrientation, VerticalAlign } from "docx";
import saveAs from "file-saver";
import { PhotoSize } from "../types";

// Convert cm to EMUs (English Metric Units). 1cm = 360,000 EMUs
const CM_TO_EMU = 360000;
// Convert mm to Twips (1/20th of a point). 1mm approx 56.7 twips.
const MM_TO_TWIP = 56.7;

export const generateDocx = async (
  images: string[],
  photoSize: PhotoSize,
  isMixed: boolean
) => {
  if (images.length === 0) return;

  // Configuration based on size
  const photoWidthCm = photoSize === PhotoSize.SIZE_3X4 ? 3 : 4;
  const photoHeightCm = photoSize === PhotoSize.SIZE_3X4 ? 4 : 6;
  const gapMm = 2; // 2mm gap
  
  // A4 Margins: 10mm = 1cm
  const marginMm = 10;
  const marginTwips = marginMm * MM_TO_TWIP;

  // A4 Printable Area (Width: 210mm - 20mm = 190mm)
  // Calculate columns
  const a4WidthMm = 210;
  const a4HeightMm = 297;
  const availableWidthMm = a4WidthMm - (marginMm * 2);
  const availableHeightMm = a4HeightMm - (marginMm * 2);
  
  const photoWidthMm = photoWidthCm * 10;
  const photoHeightMm = photoHeightCm * 10;

  const cols = Math.floor((availableWidthMm + gapMm) / (photoWidthMm + gapMm));
  const rows = Math.floor((availableHeightMm + gapMm) / (photoHeightMm + gapMm));
  const totalSlots = cols * rows;

  // Prepare Image Runs
  // We use a Table to create the grid layout in Word as it's more stable than floating images
  const tableRows: TableRow[] = [];

  for (let r = 0; r < rows; r++) {
    const cells: TableCell[] = [];
    
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      
      // Determine which image to use
      let imageSource = null;
      if (isMixed) {
        // Cycle through images
        imageSource = images[index % images.length];
      } else {
        // Use the first image repeated
        imageSource = images[0];
      }

      if (imageSource) {
        // Convert Base64 to Uint8Array for docx
        const response = await fetch(imageSource);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        const imageRun = new ImageRun({
          data: arrayBuffer,
          transformation: {
            width: photoWidthCm * CM_TO_EMU, // width in EMUs
            height: photoHeightCm * CM_TO_EMU, // height in EMUs
          },
        });

        cells.push(
          new TableCell({
            children: [
                new Paragraph({
                    children: [imageRun],
                    spacing: { before: 0, after: 0, line: 0 }
                })
            ],
            width: {
                size: photoWidthMm * MM_TO_TWIP, // Width in Twips
                type: WidthType.DXA,
            },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
                // Add a thin border to mimic the cut lines (optional, but requested in prompt as 'viền đen mỏng')
                top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
            },
            margins: {
                // Slight margin inside cell? No, we want exact size.
                top: 0, bottom: 0, left: 0, right: 0
            }
          })
        );
      } else {
         // Empty cell placeholder
         cells.push(new TableCell({ children: [] }));
      }
      
      // Add a spacer cell if not the last column
      if (c < cols - 1) {
          cells.push(new TableCell({
              children: [],
              width: { size: gapMm * MM_TO_TWIP, type: WidthType.DXA },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
          }));
      }
    }

    tableRows.push(new TableRow({ children: cells }));
    
    // Add a spacer row if not the last row
    if (r < rows - 1) {
        const spacerCells = [];
        // Determine total colspan or just add empty cells matching structure
        // A simpler way for spacer row: just one cell spanning all? 
        // Tables in docx are rigid. We need to match column structure.
        for(let i=0; i < (cols * 2) - 1; i++) {
            spacerCells.push(new TableCell({
                 children: [],
                 borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
            }));
        }
        
        tableRows.push(new TableRow({
            children: spacerCells,
            height: { value: gapMm * MM_TO_TWIP, rule: "exact" }
        }));
    }
  }

  const table = new Table({
    rows: tableRows,
    width: {
        size: 0, // Auto width based on content
        type: WidthType.AUTO
    },
    borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: "210mm",
              height: "297mm",
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: marginTwips,
              right: marginTwips,
              bottom: marginTwips,
              left: marginTwips,
            },
          },
        },
        children: [table],
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, "AnhThe_A4.docx");
};
