import type { QRCode } from 'jsqr';

export interface QRBitmapResult {
  svg: string;
  bitmap: boolean[][];
}

export function qrBitmapToSvg(imageData: ImageData, qrCode: QRCode): QRBitmapResult | null {
  const { data, width, height } = imageData;
  const modules = qrCode.version * 4 + 17;
  const { topLeftCorner, topRightCorner, bottomLeftCorner } = qrCode.location;
  const bitmap: boolean[][] = [];

  for (let row = 0; row < modules; row++) {
    const bitmapRow: boolean[] = [];
    for (let col = 0; col < modules; col++) {
      const moduleX = (col + 0.5) / modules;
      const moduleY = (row + 0.5) / modules;

      const pixelX = Math.round(
        topLeftCorner.x +
        moduleX * (topRightCorner.x - topLeftCorner.x) +
        moduleY * (bottomLeftCorner.x - topLeftCorner.x)
      );
      const pixelY = Math.round(
        topLeftCorner.y +
        moduleX * (topRightCorner.y - topLeftCorner.y) +
        moduleY * (bottomLeftCorner.y - topLeftCorner.y)
      );

      if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) {
        bitmapRow.push(false);
        continue;
      }

      const pixelIndex = (pixelY * width + pixelX) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];

      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      bitmapRow.push(gray < 127);
    }
    bitmap.push(bitmapRow);
  }

  return {
    svg: bitmapToSvg(bitmap),
    bitmap: bitmap
  };
}

function bitmapToSvg(bitmap: boolean[][]): string {
  const size = bitmap.length;
  const padding = 4;
  const totalSize = size + padding * 2;
  const rectSize = 10;
  const svgSize = totalSize * rectSize;

  let rects = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (bitmap[y][x]) {
        const rectX = (x + padding) * rectSize;
        const rectY = (y + padding) * rectSize;
        rects += `<rect x="${rectX}" y="${rectY}" width="${rectSize}" height="${rectSize}" fill="black"/>`;
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
  <rect width="${svgSize}" height="${svgSize}" fill="white"/>
  ${rects}
</svg>`;
}
