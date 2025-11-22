import type { CustomQROptions, LogoMaskData } from './types';
import { renderModule, isModuleInLogoRegion } from './svgRenderer';

export { analyzeLogoTransparency } from './logoAnalyzer';
export type { CustomQROptions, LogoMaskData } from './types';

export function generateCustomizableSVG(
  bitmap: boolean[][],
  options: CustomQROptions,
  logoMaskData?: LogoMaskData
): string {
  const size = bitmap.length;
  const padding = 4;
  const totalSize = size + padding * 2;
  const moduleSize = 10;
  const svgSize = totalSize * moduleSize;

  const bgColor = options.isTransparent ? 'transparent' : options.backgroundColor;

  let shapes = '';

  const finderPositions = [
    { x: 0, y: 0 },
    { x: size - 7, y: 0 },
    { x: 0, y: size - 7 },
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!bitmap[y][x]) continue;

      const posX = (x + padding) * moduleSize;
      const posY = (y + padding) * moduleSize;

      if (logoMaskData && isModuleInLogoRegion(posX, posY, moduleSize, logoMaskData)) {
        continue;
      }

      const isInFinder = finderPositions.some(
        (fp) => x >= fp.x && x < fp.x + 7 && y >= fp.y && y < fp.y + 7
      );

      if (isInFinder) {
        shapes += renderModule(posX, posY, moduleSize, options.dotsColor, options.cornersSquareType);
      } else {
        shapes += renderModule(posX, posY, moduleSize, options.dotsColor, options.dotsType);
      }
    }
  }

  let logoElement = '';
  if (options.logoImage && logoMaskData) {
    const logoSize = options.logoSize || 0.2;
    const logoPixelSize = svgSize * logoSize;
    const logoX = (svgSize - logoPixelSize) / 2;
    const logoY = (svgSize - logoPixelSize) / 2;

    const logoBgFill = logoMaskData.hasTransparency ? bgColor : bgColor;

    logoElement = `
      <path d="${logoMaskData.svgPath}" fill="${logoBgFill}" />
      <image href="${options.logoImage}" x="${logoX}" y="${logoY}" width="${logoPixelSize}" height="${logoPixelSize}" />
    `;
  } else if (options.logoImage) {
    const logoSize = options.logoSize || 0.2;
    const logoPixelSize = svgSize * logoSize;
    const logoX = (svgSize - logoPixelSize) / 2;
    const logoY = (svgSize - logoPixelSize) / 2;
    const bgRadius = logoPixelSize / 2 + moduleSize;

    logoElement = `
      <circle cx="${svgSize / 2}" cy="${svgSize / 2}" r="${bgRadius}" fill="${bgColor}" />
      <image href="${options.logoImage}" x="${logoX}" y="${logoY}" width="${logoPixelSize}" height="${logoPixelSize}" />
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
  <rect width="${svgSize}" height="${svgSize}" fill="${bgColor}"/>
  ${shapes}
  ${logoElement}
</svg>`;
}
