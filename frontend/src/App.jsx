import React, { useState, useEffect, useRef } from 'react'
import { 
  Wand2, 
  Image as ImageIcon, 
  SlidersHorizontal, 
  Plus, 
  ChevronUp, 
  ChevronDown 
} from 'lucide-react'

export default function App() {
  const [imageSrc, setImageSrc] = useState('/cat-cutout.png')
  const fileInputRef = useRef(null)

  // Load uploaded image from localStorage on mount
  useEffect(() => {
    const storedImage = localStorage.getItem('uploadedImage')
    if (storedImage) {
      setImageSrc(storedImage)
    }
  }, [])

  // Trigger file browser for direct workspace upload/replace
  const handleAddClick = () => {
    fileInputRef.current?.click()
  }

  // Handle direct file selection in the workspace
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64Src = event.target.result
        setImageSrc(base64Src)
        localStorage.setItem('uploadedImage', base64Src)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle high-resolution image downloads
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = imageSrc
    link.download = 'edited-photo-cutout.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between items-center py-8 font-sans select-none overflow-hidden">
      
      {/* Hidden File Input for the Add button */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* 1. Floating Top Toolbar */}
      <div className="flex items-center justify-between bg-white rounded-full px-5 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100/80 gap-6 w-full max-w-[820px] mx-auto mt-2 animate-fade-slide-in">
        
        {/* Left Tools (Gray text/icons) */}
        <div className="flex items-center gap-6 pl-2">
          {/* Cutout Tool */}
          <button className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors font-medium text-[13.5px]">
            <Wand2 size={16} className="text-gray-500" strokeWidth={2} />
            <span>Cutout</span>
          </button>

          {/* Background Tool */}
          <button className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors font-medium text-[13.5px]">
            <ImageIcon size={16} className="text-gray-500" strokeWidth={2} />
            <span>Background</span>
          </button>

          {/* Effects Tool */}
          <button className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors font-medium text-[13.5px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
              <circle cx="9.5" cy="12" r="5.5" fill="currentColor" fillOpacity="0.12" />
              <circle cx="14.5" cy="12" r="5.5" fill="currentColor" fillOpacity="0.4" />
            </svg>
            <span>Effects</span>
          </button>

          {/* Adjust Tool */}
          <button className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors font-medium text-[13.5px]">
            <SlidersHorizontal size={16} className="text-gray-500" strokeWidth={2} />
            <span>Adjust</span>
          </button>

          {/* Design Tool */}
          <button className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors font-medium text-[13.5px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M10 3v18" />
              <path d="M10 12h11" />
            </svg>
            <span>Design</span>
          </button>
        </div>

        {/* Divider */}
        <div className="h-5 w-[1px] bg-gray-200"></div>

        {/* Right Tools & Download */}
        <div className="flex items-center gap-4 pr-1">
          {/* Split Screen Crop/Compare Icon */}
          <button className="text-gray-600 hover:text-gray-800 transition-colors p-1" title="Compare Split">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M12 3v18" />
            </svg>
          </button>

          {/* Undo Icon (Grayed out/Disabled) */}
          <button className="text-gray-300 cursor-not-allowed p-1" disabled>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>

          {/* Redo Icon (Grayed out/Disabled) */}
          <button className="text-gray-300 cursor-not-allowed p-1" disabled>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
            </svg>
          </button>

          {/* Download Button */}
          <button 
            onClick={handleDownload}
            className="flex items-center gap-1 bg-[#0F70E6] text-white rounded-full px-5 py-2.2 text-[13.5px] font-semibold shadow-[0_4px_12px_rgba(15,112,230,0.22)] hover:bg-[#0A5BC4] hover:shadow-[0_6px_16px_rgba(15,112,230,0.3)] transition-all cursor-pointer"
          >
            <span>Download</span>
            <ChevronDown size={14} className="stroke-[2.5]" />
          </button>
        </div>

      </div>

      {/* 2. Central Canvas Area */}
      <div className="relative w-full max-w-[580px] aspect-square rounded-[36px] overflow-hidden bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-gray-100/60 my-auto flex items-center justify-center select-none">
        
        {/* Transparency Checkerboard Background via CSS conic-gradient */}
        <div 
          className="absolute inset-0 z-0" 
          style={{
            backgroundImage: 'conic-gradient(#ffffff 0.25turn, #f4f5f6 0.25turn 0.5turn, #ffffff 0.5turn 0.75turn, #f4f5f6 0.75turn)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Main Subject Content (Dynamic cutout / uploaded image) */}
        <div key={imageSrc} className="relative z-10 w-[78%] h-[78%] flex items-center justify-center animate-canvas-load">
          <img 
            src={imageSrc} 
            alt="Subject Cutout" 
            className="w-full h-full object-contain pointer-events-none drop-shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
          />
        </div>

        {/* Top Overlay Button: Edit in Canva */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20">
          <button className="flex items-center gap-2 bg-white rounded-full px-4 py-1.8 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-gray-100/50 hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer">
            {/* Canva Gradient Icon */}
            <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#7d2ae8] to-[#00c4cc] flex items-center justify-center shadow-sm">
              <span className="text-white text-[10px] font-bold font-serif leading-none italic -ml-[1.5px] -mt-[0.5px]">C</span>
            </span>
            <span className="text-gray-800 text-[12.5px] font-semibold tracking-tight">Edit in Canva</span>
          </button>
        </div>

        {/* Bottom Overlay Text */}
        <div className="absolute bottom-0 left-0 w-full z-20 bg-gradient-to-t from-black/55 via-black/25 to-transparent pt-16 pb-5 px-6 rounded-b-[36px]">
          <p className="text-white text-[10.5px] text-center font-medium tracking-wide opacity-95">
            By sending your image to Canva you agree to{' '}
            <a href="#" className="underline hover:text-gray-200 transition-colors">
              Canva's Terms of Service.
            </a>
          </p>
        </div>

      </div>

      {/* 3. Bottom Thumbnail Bar */}
      <div className="flex items-center gap-3.5 mt-2 mb-1 z-10 animate-fade-slide-in">
        
        {/* Add Button (+) */}
        <button 
          onClick={handleAddClick}
          className="bg-gray-100 hover:bg-gray-200 rounded-[14px] h-12 w-12 flex items-center justify-center cursor-pointer transition-colors" 
          title="Add/Replace Image"
        >
          <Plus size={18} className="text-gray-700 stroke-[2.5]" />
        </button>

        {/* Active Thumbnail */}
        <div className="h-12 w-12 rounded-[14px] relative cursor-pointer border-[2.2px] border-[#0F70E6] bg-white shadow-sm flex items-center justify-center">
          {/* Inner Thumbnail Content */}
          <div 
            className="w-full h-full rounded-[11px] overflow-hidden" 
            style={{
              backgroundImage: 'conic-gradient(#ffffff 0.25turn, #f4f5f6 0.25turn 0.5turn, #ffffff 0.5turn 0.75turn, #f4f5f6 0.75turn)',
              backgroundSize: '8px 8px',
            }}
          >
            <img 
              src={imageSrc} 
              alt="Thumbnail preview" 
              className="w-full h-full object-contain p-0.5"
            />
          </div>

          {/* Tiny Upward Chevron Circular Badge */}
          <div className="absolute -top-1.5 -right-1.5 bg-gray-900 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center border-[1.5px] border-white shadow-sm">
            <ChevronUp size={11} className="stroke-[3]" />
          </div>
        </div>

      </div>

    </div>
  )
}
