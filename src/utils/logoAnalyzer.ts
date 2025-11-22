import Pica from 'pica';
import type { LogoMaskData } from './types';

export async function analyzeLogoTransparency(
  logoDataUrl: string,
  svgSize: number,
  logoSize = 0.2
): Promise<LogoMaskData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      const moduleSize = 10;
      const sourceCanvas = document.createElement('canvas');
      const sourceCtx = sourceCanvas.getContext('2d');
      if (!sourceCtx) {
        reject(new Error('Source canvas context not available'));
        return;
      }

      sourceCanvas.width = img.width;
      sourceCanvas.height = img.height;
      sourceCtx.drawImage(img, 0, 0);

      const paddingModules = 2;
      const logoTargetPixels = Math.floor(svgSize * logoSize);
      const gridCountInner = Math.floor(logoTargetPixels / moduleSize);
      const gridCount = gridCountInner + paddingModules * 2;
      const logoPixelSize = gridCount * moduleSize;

      const resizedCanvas = document.createElement('canvas');
      resizedCanvas.width = logoPixelSize;
      resizedCanvas.height = logoPixelSize;

      const pica = new Pica();
      const innerPixelSize = gridCountInner * moduleSize;
      const innerCanvas = document.createElement('canvas');
      innerCanvas.width = innerPixelSize;
      innerCanvas.height = innerPixelSize;

      pica.resize(sourceCanvas, innerCanvas, {
        alpha: true,
        unsharpAmount: 0,
        unsharpRadius: 0,
        unsharpThreshold: 0
      }).then(() => {
        const resizedCtx = resizedCanvas.getContext('2d');
        if (!resizedCtx) {
          reject(new Error('Resized canvas context not available'));
          return;
        }

        resizedCtx.clearRect(0, 0, logoPixelSize, logoPixelSize);
        const offset = paddingModules * moduleSize;
        resizedCtx.drawImage(innerCanvas, offset, offset);

        const logoX = Math.floor((svgSize - logoPixelSize) / 2 / moduleSize) * moduleSize;
        const logoY = Math.floor((svgSize - logoPixelSize) / 2 / moduleSize) * moduleSize;

        const opaqueModules: boolean[][] = [];
        let hasTransparency = false;

        for (let gy = 0; gy < gridCount; gy++) {
          opaqueModules[gy] = [];
          for (let gx = 0; gx < gridCount; gx++) {
            const cellImageData = resizedCtx.getImageData(
              gx * moduleSize,
              gy * moduleSize,
              moduleSize,
              moduleSize
            );
            const cellData = cellImageData.data;

            let alphaSum = 0;
            for (let i = 3; i < cellData.length; i += 4) {
              alphaSum += cellData[i];
            }
            const avgAlpha = alphaSum / (moduleSize * moduleSize);

            if (avgAlpha > 128) {
              opaqueModules[gy][gx] = true;
            } else {
              opaqueModules[gy][gx] = false;
              hasTransparency = true;
            }
          }
        }

        processLogoModules(opaqueModules, gridCount, logoX, logoY, logoPixelSize, moduleSize, hasTransparency, svgSize, resolve);
      }).catch(reject);
    };

    img.onerror = () => {
      reject(new Error('Failed to load logo image'));
    };

    img.src = logoDataUrl;
  });
}

function processLogoModules(
  opaqueModules: boolean[][],
  logoModuleCount: number,
  logoX: number,
  logoY: number,
  logoPixelSize: number,
  moduleSize: number,
  hasTransparency: boolean,
  svgSize: number,
  resolve: (value: LogoMaskData) => void
) {
  const expandPadding = 1;
  const expandedModules: boolean[][] = [];

  for (let my = 0; my < logoModuleCount; my++) {
    expandedModules[my] = [];
    for (let mx = 0; mx < logoModuleCount; mx++) {
      expandedModules[my][mx] = opaqueModules[my][mx];
    }
  }

  for (let my = 0; my < logoModuleCount; my++) {
    for (let mx = 0; mx < logoModuleCount; mx++) {
      if (opaqueModules[my][mx]) {
        for (let dy = -expandPadding; dy <= expandPadding; dy++) {
          for (let dx = -expandPadding; dx <= expandPadding; dx++) {
            const ny = my + dy;
            const nx = mx + dx;
            if (ny >= 0 && ny < logoModuleCount && nx >= 0 && nx < logoModuleCount) {
              expandedModules[ny][nx] = true;
            }
          }
        }
      }
    }
  }

  const expandedModuleCount = logoModuleCount;
  const expandedLogoPixelSize = logoPixelSize;
  const expandedLogoX = logoX;
  const expandedLogoY = logoY;

  const svgPath = gridToContourPath(expandedModules, expandedLogoX, expandedLogoY, moduleSize);

  let actualMinX = Number.POSITIVE_INFINITY;
  let actualMinY = Number.POSITIVE_INFINITY;
  let actualMaxX = Number.NEGATIVE_INFINITY;
  let actualMaxY = Number.NEGATIVE_INFINITY;

  for (let my = 0; my < expandedModuleCount; my++) {
    for (let mx = 0; mx < expandedModuleCount; mx++) {
      if (expandedModules[my][mx]) {
        const x = expandedLogoX + mx * moduleSize;
        const y = expandedLogoY + my * moduleSize;
        actualMinX = Math.min(actualMinX, x);
        actualMinY = Math.min(actualMinY, y);
        actualMaxX = Math.max(actualMaxX, x + moduleSize);
        actualMaxY = Math.max(actualMaxY, y + moduleSize);
      }
    }
  }

  const width = actualMaxX - actualMinX;
  const height = actualMaxY - actualMinY;

  const mosaicCanvas = document.createElement('canvas');
  mosaicCanvas.width = expandedLogoPixelSize;
  mosaicCanvas.height = expandedLogoPixelSize;
  const mosaicCtx = mosaicCanvas.getContext('2d');
  if (!mosaicCtx) {
    return;
  }

  mosaicCtx.fillStyle = '#ffffff';
  mosaicCtx.fillRect(0, 0, expandedLogoPixelSize, expandedLogoPixelSize);

  mosaicCtx.fillStyle = '#000000';
  for (let my = 0; my < expandedModuleCount; my++) {
    for (let mx = 0; mx < expandedModuleCount; mx++) {
      if (expandedModules[my][mx]) {
        mosaicCtx.fillRect(
          mx * moduleSize,
          my * moduleSize,
          moduleSize,
          moduleSize
        );
      }
    }
  }

  const debugMosaicDataUrl = mosaicCanvas.toDataURL();

  const debugPathSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
  <rect width="${svgSize}" height="${svgSize}" fill="#f0f0f0"/>
  <path d="${svgPath}" fill="rgba(255, 0, 0, 0.3)" stroke="red" stroke-width="2"/>
  ${expandedModules.map((row, ry) =>
    row.map((cell, rx) => {
      if (!cell) return '';
      const x = expandedLogoX + rx * moduleSize;
      const y = expandedLogoY + ry * moduleSize;
      return `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="none" stroke="blue" stroke-width="0.5"/>`;
    }).join('')
  ).join('')}
</svg>`;

  resolve({
    svgPath,
    boundingBox: {
      x: actualMinX,
      y: actualMinY,
      width,
      height,
    },
    hasTransparency,
    moduleGrid: expandedModules,
    gridOrigin: { x: expandedLogoX, y: expandedLogoY },
    moduleSize: moduleSize,
    debugMosaicDataUrl,
    debugPathSvg
  });
}

function gridToContourPath(
  grid: boolean[][],
  originX: number,
  originY: number,
  moduleSize: number
): string {
  if (grid.length === 0 || grid[0].length === 0) return '';

  const rows = grid.length;
  const cols = grid[0].length;

  const paths: string[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!grid[row][col]) continue;

      const x = originX + col * moduleSize;
      const y = originY + row * moduleSize;

      paths.push(
        `M ${x},${y} h ${moduleSize} v ${moduleSize} h ${-moduleSize} Z`
      );
    }
  }

  return paths.join(' ');
}
