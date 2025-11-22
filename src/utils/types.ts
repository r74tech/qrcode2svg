export interface CustomQROptions {
  dotsColor: string;
  backgroundColor: string;
  dotsType: 'rounded' | 'dots' | 'square' | 'extra-rounded';
  cornersSquareType: 'dot' | 'square' | 'extra-rounded';
  isTransparent: boolean;
  logoImage?: string;
  logoSize?: number;
  debugMode?: boolean;
}

export interface LogoMaskData {
  svgPath: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  hasTransparency: boolean;
  moduleGrid?: boolean[][];
  gridOrigin?: { x: number; y: number };
  moduleSize?: number;
  debugMosaicDataUrl?: string;
  debugPathSvg?: string;
}
