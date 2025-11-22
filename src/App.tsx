import { useState } from 'react'
import './App.css'
import QREditor from './components/QREditor'

function App() {
  const [scannedBitmap, setScannedBitmap] = useState<boolean[][]>([])

  const handleScan = (bitmap: boolean[][]) => {
    setScannedBitmap(bitmap)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors flex flex-col">
      <div className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
        <header className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            QRcode to SVG
          </h1>
        </header>

        <QREditor scannedBitmap={scannedBitmap} onScan={handleScan} />
      </div>

      <footer className="mt-16 py-6 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            QRコードは株式会社デンソーウェーブの登録商標です
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
