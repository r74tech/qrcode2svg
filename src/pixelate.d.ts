declare module 'pica' {
  export default class Pica {
    constructor(options?: { features?: string[] });
    resize(
      from: HTMLCanvasElement | HTMLImageElement,
      to: HTMLCanvasElement,
      options?: {
        alpha?: boolean;
        unsharpAmount?: number;
        unsharpRadius?: number;
        unsharpThreshold?: number;
      }
    ): Promise<HTMLCanvasElement>;
  }
}
