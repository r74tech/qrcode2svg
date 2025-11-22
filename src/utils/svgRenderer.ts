import type { LogoMaskData } from './types';

export function renderModule(
  x: number,
  y: number,
  size: number,
  color: string,
  type: string
): string {
  switch (type) {
    case 'rounded': {
      const radius = size * 0.25;
      return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${color}"/>`;
    }
    case 'dots': {
      const centerX = x + size / 2;
      const centerY = y + size / 2;
      const dotRadius = size * 0.45;
      return `<circle cx="${centerX}" cy="${centerY}" r="${dotRadius}" fill="${color}"/>`;
    }
    case 'extra-rounded': {
      const extraRadius = size * 0.5;
      return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${extraRadius}" ry="${extraRadius}" fill="${color}"/>`;
    }
    case 'square':
      return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${color}"/>`;
    default:
      return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${color}"/>`;
  }
}

export function isModuleInLogoRegion(
  moduleX: number,
  moduleY: number,
  moduleSize: number,
  logoMaskData: LogoMaskData
): boolean {
  if (logoMaskData.moduleGrid && logoMaskData.gridOrigin && logoMaskData.moduleSize) {
    const { moduleGrid, gridOrigin, moduleSize: logoModuleSize } = logoMaskData;

    const gridX = Math.round((moduleX - gridOrigin.x) / logoModuleSize);
    const gridY = Math.round((moduleY - gridOrigin.y) / logoModuleSize);

    if (gridY >= 0 && gridY < moduleGrid.length && gridX >= 0 && gridX < moduleGrid[0].length) {
      return moduleGrid[gridY][gridX];
    }
    return false;
  }

  const centerX = moduleX + moduleSize / 2;
  const centerY = moduleY + moduleSize / 2;

  const logoMinX = logoMaskData.boundingBox.x;
  const logoMinY = logoMaskData.boundingBox.y;
  const logoMaxX = logoMaskData.boundingBox.x + logoMaskData.boundingBox.width;
  const logoMaxY = logoMaskData.boundingBox.y + logoMaskData.boundingBox.height;

  const ellipseCenterX = (logoMinX + logoMaxX) / 2;
  const ellipseCenterY = (logoMinY + logoMaxY) / 2;
  const radiusX = logoMaskData.boundingBox.width / 2;
  const radiusY = logoMaskData.boundingBox.height / 2;

  const normalizedX = (centerX - ellipseCenterX) / radiusX;
  const normalizedY = (centerY - ellipseCenterY) / radiusY;

  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}
