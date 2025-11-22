import { useState, useRef, useEffect, useMemo } from 'react';
import jsQR from 'jsqr';
import { qrBitmapToSvg } from '../utils/qrBitmapToSvg';
import { generateCustomizableSVG, analyzeLogoTransparency } from '../utils/customizableQR';
import type { CustomQROptions, LogoMaskData } from '../utils/types';

interface QREditorProps {
  scannedBitmap: boolean[][];
  onScan: (bitmap: boolean[][]) => void;
}

export default function QREditor({ scannedBitmap, onScan }: QREditorProps) {
  const [error, setError] = useState<string>('');
  const [logoMaskData, setLogoMaskData] = useState<LogoMaskData>();
  const [options, setOptions] = useState<CustomQROptions>({
    dotsColor: '#000000',
    backgroundColor: '#ffffff',
    dotsType: 'square',
    cornersSquareType: 'square',
    isTransparent: false,
    logoImage: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const effectiveLogoMaskData = useMemo(() => {
    return options.logoImage ? logoMaskData : undefined;
  }, [options.logoImage, logoMaskData]);

  const customSvg = useMemo(() => {
    if (scannedBitmap.length === 0) {
      return '';
    }
    return generateCustomizableSVG(scannedBitmap, options, effectiveLogoMaskData);
  }, [scannedBitmap, options, effectiveLogoMaskData]);

  useEffect(() => {
    if (!options.logoImage || scannedBitmap.length === 0) {
      return;
    }

    const size = scannedBitmap.length;
    const padding = 4;
    const totalSize = size + padding * 2;
    const moduleSize = 10;
    const svgSize = totalSize * moduleSize;

    let cancelled = false;

    analyzeLogoTransparency(options.logoImage, svgSize, options.logoSize)
      .then((maskData) => {
        if (!cancelled) {
          setLogoMaskData(maskData);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to analyze logo transparency:', err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [options.logoImage, options.logoSize, scannedBitmap.length]);

  useEffect(() => {
    if (customSvg && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      const svgBlob = new Blob([customSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const svgSize = img.width;
        const scale = window.devicePixelRatio || 1;

        canvas.width = svgSize * scale;
        canvas.height = svgSize * scale;

        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.clearRect(0, 0, svgSize, svgSize);
        ctx.drawImage(img, 0, 0, svgSize, svgSize);

        URL.revokeObjectURL(url);
      };

      img.src = url;
    }
  }, [customSvg]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Canvas コンテキストの取得に失敗しました');
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          const result = qrBitmapToSvg(imageData, code);
          if (result) {
            onScan(result.bitmap);
          }
        } else {
          setError('QRコードが検出できませんでした。画像を確認してください。');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = (format: 'svg' | 'png' | 'jpeg') => {
    if (!customSvg) return;

    if (format === 'svg') {
      const blob = new Blob([customSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qr-code-enhanced.svg';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      const svgBlob = new Blob([customSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        if (format === 'jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (!blob) return;
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `qr-code-enhanced.${format}`;
          a.click();
          URL.revokeObjectURL(downloadUrl);
          URL.revokeObjectURL(url);
        }, `image/${format}`, 1.0);
      };

      img.src = url;
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setOptions({ ...options, logoImage: result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {!customSvg ? (
        <div className="p-8 sm:p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-6 flex justify-center">
              <svg className="w-20 h-20 text-gray-400 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
              QRコード画像をアップロード
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              QRコードをSVGに変換します
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg cursor-pointer transition-all transform hover:scale-105 shadow-lg"
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>ファイルを選択</span>
            </label>
            {error && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded text-left">
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-800">
          {/* プレビュー */}
          <div className="p-8">
            <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">プレビュー</h3>
            <div className="bg-gray-50 dark:bg-gray-950 rounded-xl p-8 flex items-center justify-center min-h-[320px]">
              <canvas
                ref={canvasRef}
                className="w-full max-w-md h-auto"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleDownload('svg')}
                  className="flex-1 min-w-[140px] px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-md"
                >
                  SVG
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('png')}
                  className="flex-1 min-w-[140px] px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-md"
                >
                  PNG
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('jpeg')}
                  className="flex-1 min-w-[140px] px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors shadow-md"
                >
                  JPEG
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  onScan([]);
                  setError('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium rounded-lg transition-colors"
              >
                別の画像を選択
              </button>
            </div>
          </div>

          {/* カスタマイズ */}
          <div className="p-8">
            <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">カスタマイズ</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300" htmlFor="dots-color">ドット色</label>
                <input
                  type="color"
                  value={options.dotsColor}
                  onChange={(e) => setOptions({ ...options, dotsColor: e.target.value })}
                  className="w-20 h-12 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300" htmlFor="background-color">背景色</label>
                <input
                  type="color"
                  value={options.backgroundColor}
                  onChange={(e) => setOptions({ ...options, backgroundColor: e.target.value })}
                  disabled={options.isTransparent}
                  className="w-20 h-12 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-700 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.isTransparent}
                    onChange={(e) => setOptions({ ...options, isTransparent: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">背景を透明にする</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300" htmlFor="dots-type">ドットスタイル</label>
                <select
                  value={options.dotsType}
                  onChange={(e) => setOptions({ ...options, dotsType: e.target.value as CustomQROptions['dotsType'] })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="square">四角</option>
                  <option value="rounded">丸角</option>
                  <option value="dots">ドット</option>
                  <option value="extra-rounded">外接円</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300" htmlFor="corners-square-type">コーナースタイル</label>
                <select
                  value={options.cornersSquareType}
                  onChange={(e) => setOptions({ ...options, cornersSquareType: e.target.value as CustomQROptions['cornersSquareType'] })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="square">四角</option>
                  <option value="dot">ドット</option>
                  <option value="extra-rounded">外接円</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300" htmlFor="logo-image">ロゴ画像</label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-50 file:text-blue-700
                    dark:file:bg-blue-900/20 dark:file:text-blue-400
                    hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30
                    cursor-pointer file:cursor-pointer"
                />
                {options.logoImage && (
                  <>
                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300" htmlFor="logo-size">
                        ロゴサイズ: {Math.round((options.logoSize || 0.2) * 100)}%
                      </label>
                      <select
                        value={(options.logoSize || 0.2) * 100}
                        onChange={(e) => setOptions({ ...options, logoSize: Number.parseInt(e.target.value) / 100 })}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="10">10% (極小)</option>
                        <option value="15">15% (小)</option>
                        <option value="20">20% (標準)</option>
                        <option value="25">25% (中)</option>
                        <option value="30">30% (大)</option>
                        <option value="35">35% (特大)</option>
                        <option value="40">40% (最大)</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOptions({ ...options, logoImage: '', logoSize: 0.2 });
                        if (logoInputRef.current) logoInputRef.current.value = '';
                      }}
                      className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
                    >
                      ロゴを削除
                    </button>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">ロゴ画像の大きさによってはQRコードが読み取れない場合があります。<br />QRコードリーダーなどでの確認をお勧めします。</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
