import React, { useState, useEffect, useRef } from 'react'
import { 
  Wand2, 
  Image as ImageIcon, 
  SlidersHorizontal, 
  Plus, 
  ChevronUp, 
  ChevronDown,
  X,
  Copy,
  Download,
  Share2,
  Trash2,
  Sparkles,
  Layers,
  Droplet,
  Grid,
  RotateCcw,
  Check
} from 'lucide-react'

export default function App() {
  // Core Image State
  const [imageSrc, setImageSrc] = useState('/cat-cutout.png')
  const [imgObj, setImgObj] = useState(null)
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)

  // Layout & Navigation States
  const [isUtilityOpen, setIsUtilityOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('tools') // 'tools' | 'layers' | 'smart-scan'

  // Redaction Engine States
  const [redactions, setRedactions] = useState([])
  const [activeTool, setActiveTool] = useState('blur') // 'blur' | 'pixelate' | 'solid'
  const [brushIntensity, setBrushIntensity] = useState(15) // blur radius or pixel size
  const [solidColor, setSolidColor] = useState('#000000') // for blackout
  const [hoveredRedactId, setHoveredRedactId] = useState(null)

  // Drawing Coordinate States
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 })

  // History State for Undo/Redo
  const [history, setHistory] = useState([JSON.stringify([])])
  const [historyIndex, setHistoryIndex] = useState(0)

  // AI Smart Scan Mock Toggles
  const [scanTargets, setScanTargets] = useState({
    creditCards: true,
    emails: true,
    usernames: true,
    passwords: false,
    faces: true
  })
  const [isScanning, setIsScanning] = useState(false)

  // Copy success indicator
  const [copySuccess, setCopySuccess] = useState(false)

  // Load uploaded image from localStorage on mount
  useEffect(() => {
    const storedImage = localStorage.getItem('uploadedImage')
    if (storedImage) {
      setImageSrc(storedImage)
    }
  }, [])

  // Pillar 1: Global Clipboard Paste Handler
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
              const base64Src = event.target.result
              setImageSrc(base64Src)
              localStorage.setItem('uploadedImage', base64Src)
              // Reset workspace for new image
              setRedactions([])
              const initialHistory = JSON.stringify([])
              setHistory([initialHistory])
              setHistoryIndex(0)
            }
            reader.readAsDataURL(file)
          }
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  // Load image object when source changes
  useEffect(() => {
    if (!imageSrc) return
    const img = new Image()
    
    // Set onload and onerror BEFORE setting src so cached or data URLs load reliably
    img.onload = () => {
      setImgObj(img)
    }
    img.onerror = (err) => {
      console.error("QuickRedact Canvas: Failed to load source image into canvas object:", err)
    }

    // Set crossOrigin strictly for external absolute HTTP/HTTPS URLs to prevent tainted canvas
    const isBase64OrRelative = imageSrc.startsWith('data:') || imageSrc.startsWith('blob:') || imageSrc.startsWith('/')
    if (!isBase64OrRelative && (imageSrc.startsWith('http://') || imageSrc.startsWith('https://'))) {
      img.crossOrigin = 'anonymous'
    }

    img.src = imageSrc
  }, [imageSrc])

  // Canvas Drawing & Rendering loop
  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !imgObj) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fit canvas resolution exactly to original image dimensions
    canvas.width = imgObj.width
    canvas.height = imgObj.height

    // 1. Draw main screenshot background
    ctx.drawImage(imgObj, 0, 0)

    // 2. Render all active redaction regions
    redactions.forEach((redact) => {
      const { x, y, w, h, tool, intensity, color } = redact
      if (w <= 0 || h <= 0) return

      if (tool === 'solid') {
        // Blackout box
        ctx.fillStyle = color || '#000000'
        ctx.fillRect(x, y, w, h)
      } else if (tool === 'pixelate') {
        // Chunky pixelated blocks
        try {
          const tempCanvas = document.createElement('canvas')
          const tempCtx = tempCanvas.getContext('2d')
          tempCanvas.width = w
          tempCanvas.height = h
          tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h)

          // Downscale to make pixels chunkier (higher intensity = chunkier)
          const scale = Math.max(0.01, 1 / (intensity || 15))
          const sw = Math.max(1, Math.round(w * scale))
          const sh = Math.max(1, Math.round(h * scale))

          const smallCanvas = document.createElement('canvas')
          const smallCtx = smallCanvas.getContext('2d')
          smallCanvas.width = sw
          smallCanvas.height = sh
          smallCtx.drawImage(tempCanvas, 0, 0, w, h, 0, 0, sw, sh)

          // Upscale back without smoothing for crispy pixelated look
          ctx.save()
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(smallCanvas, 0, 0, sw, sh, x, y, w, h)
          ctx.restore()
        } catch (err) {
          console.error('Pixelation failed:', err)
        }
      } else if (tool === 'blur') {
        // Smooth Gaussian Blur
        try {
          ctx.save()
          ctx.beginPath()
          ctx.rect(x, y, w, h)
          ctx.clip()
          ctx.filter = `blur(${intensity || 15}px)`
          ctx.drawImage(imgObj, 0, 0)
          ctx.restore()
        } catch (err) {
          // Fallback: draw opaque fill if hardware-accelerated filter fails
          ctx.fillStyle = 'rgba(128,128,128,0.95)'
          ctx.fillRect(x, y, w, h)
        }
      }
    })

    // 3. Highlight selected redaction layer on hover
    if (hoveredRedactId) {
      const active = redactions.find(r => r.id === hoveredRedactId)
      if (active) {
        ctx.save()
        ctx.strokeStyle = '#0F70E6'
        ctx.lineWidth = Math.max(2.5, canvas.width / 350)
        ctx.setLineDash([6, 3])
        ctx.strokeRect(active.x, active.y, active.w, active.h)
        
        // Inner translucent overlay
        ctx.fillStyle = 'rgba(15, 112, 230, 0.15)'
        ctx.fillRect(active.x, active.y, active.w, active.h)
        ctx.restore()
      }
    }

    // 4. Render active mouse dragging outline
    if (isDrawing && startPos && currentPos) {
      const rx = Math.min(startPos.x, currentPos.x)
      const ry = Math.min(startPos.y, currentPos.y)
      const rw = Math.abs(currentPos.x - startPos.x)
      const rh = Math.abs(currentPos.y - startPos.y)

      ctx.save()
      ctx.strokeStyle = '#0F70E6'
      ctx.lineWidth = Math.max(2, canvas.width / 400)
      ctx.setLineDash([5, 3])
      ctx.strokeRect(rx, ry, rw, rh)
      ctx.fillStyle = 'rgba(15, 112, 230, 0.12)'
      ctx.fillRect(rx, ry, rw, rh)
      ctx.restore()
    }
  }

  // Draw on states change
  useEffect(() => {
    drawCanvas()
  }, [imgObj, redactions, isDrawing, startPos, currentPos, hoveredRedactId, activeTool, brushIntensity, solidColor])

  // Mouse coordinate mapping logic (Relative to image bounds)
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    
    // Scale client mouse positions to relative canvas pixel coordinates
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height
    
    // Constrain coordinates to image boundary
    const constrainedX = Math.max(0, Math.min(canvas.width, x))
    const constrainedY = Math.max(0, Math.min(canvas.height, y))
    
    return { x: constrainedX, y: constrainedY }
  }

  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e)
    if (!coords) return
    setIsDrawing(true)
    setStartPos(coords)
    setCurrentPos(coords)
  }

  const handleMouseMove = (e) => {
    if (!isDrawing) return
    const coords = getCanvasCoords(e)
    if (!coords) return
    setCurrentPos(coords)
  }

  const handleMouseUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    const x = Math.min(startPos.x, currentPos.x)
    const y = Math.min(startPos.y, currentPos.y)
    const w = Math.abs(currentPos.x - startPos.x)
    const h = Math.abs(currentPos.y - startPos.y)

    // Bypass minimal accidental clicks (less than 4px width/height)
    if (w > 4 && h > 4) {
      const newRedact = {
        id: Date.now().toString(),
        x,
        y,
        w,
        h,
        tool: activeTool,
        intensity: brushIntensity,
        color: solidColor
      }
      
      const nextRedactions = [...redactions, newRedact]
      setRedactions(nextRedactions)

      // Add to Undo/Redo history stack
      const newHistory = history.slice(0, historyIndex + 1)
      setHistory([...newHistory, JSON.stringify(nextRedactions)])
      setHistoryIndex(newHistory.length)
    }
  }

  // Pillar 1: Drag-and-Drop Image Handler
  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64Src = event.target.result
        setImageSrc(base64Src)
        localStorage.setItem('uploadedImage', base64Src)
        setRedactions([])
        setHistory([JSON.stringify([])])
        setHistoryIndex(0)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64Src = event.target.result
        setImageSrc(base64Src)
        localStorage.setItem('uploadedImage', base64Src)
        setRedactions([])
        setHistory([JSON.stringify([])])
        setHistoryIndex(0)
      }
      reader.readAsDataURL(file)
    }
  }

  // Undo/Redo Engine handlers
  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1
      setHistoryIndex(nextIndex)
      setRedactions(JSON.parse(history[nextIndex]))
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1
      setHistoryIndex(nextIndex)
      setRedactions(JSON.parse(history[nextIndex]))
    }
  }

  // Pillar 3: Export to Clipboard (Modern PNG Blob)
  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ])
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      }, 'image/png')
    } catch (err) {
      alert('Your browser does not support modern image clipboard copying. Downloading the file instead.')
      handleDownload()
    }
  }

  // Pillar 3: Local Device Download
  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = 'quickredact-screenshot.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Pillar 3: Web Share API Integration
  const handleShare = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return
        const file = new File([blob], 'redacted-screenshot.png', { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Redacted Screenshot',
            text: 'Censored securely using QuickRedact.'
          })
        } else {
          // Native share fallback
          handleCopyToClipboard()
          alert('Native sharing is unavailable. The redacted image has been copied to your clipboard!')
        }
      }, 'image/png')
    } catch (err) {
      console.error('Sharing failed:', err)
    }
  }

  // Remove individual redaction layer
  const deleteRedaction = (id) => {
    const updated = redactions.filter(r => r.id !== id)
    setRedactions(updated)
    const newHistory = history.slice(0, historyIndex + 1)
    setHistory([...newHistory, JSON.stringify(updated)])
    setHistoryIndex(newHistory.length)
  }

  // Clear all layers
  const clearAllRedactions = () => {
    if (redactions.length === 0) return
    setRedactions([])
    const newHistory = history.slice(0, historyIndex + 1)
    setHistory([...newHistory, JSON.stringify([])])
    setHistoryIndex(newHistory.length)
  }

  // AI Smart Auto-Redactor Simulation
  const triggerSmartScan = () => {
    if (!imgObj) return
    setIsScanning(true)
    
    // Simulate smart parsing delay
    setTimeout(() => {
      setIsScanning(false)
      const foundRedacts = []
      
      // Calculate responsive bounding boxes relative to active image dimensions
      if (scanTargets.creditCards) {
        // Simulated Credit Card area (horizontal mid-top)
        foundRedacts.push({
          id: `ai-cc-${Date.now()}`,
          x: imgObj.width * 0.15,
          y: imgObj.height * 0.28,
          w: imgObj.width * 0.7,
          h: imgObj.height * 0.08,
          tool: 'pixelate',
          intensity: 22,
          color: '#000000'
        })
      }
      if (scanTargets.emails) {
        // Simulated Email/ID fields (middle area)
        foundRedacts.push({
          id: `ai-email-${Date.now()}`,
          x: imgObj.width * 0.25,
          y: imgObj.height * 0.44,
          w: imgObj.width * 0.5,
          h: imgObj.height * 0.06,
          tool: 'blur',
          intensity: 18,
          color: '#000000'
        })
      }
      if (scanTargets.usernames) {
        // Simulated Usernames & Names (bottom left text fields / labels)
        foundRedacts.push({
          id: `ai-username-${Date.now()}`,
          x: imgObj.width * 0.08,
          y: imgObj.height * 0.72,
          w: imgObj.width * 0.28,
          h: imgObj.height * 0.05,
          tool: 'blur',
          intensity: 15,
          color: '#000000'
        })
      }
      if (scanTargets.faces) {
        // Simulated Avatar picture (top right)
        foundRedacts.push({
          id: `ai-face-${Date.now()}`,
          x: imgObj.width * 0.75,
          y: imgObj.height * 0.1,
          w: imgObj.width * 0.15,
          h: imgObj.height * 0.15,
          tool: 'solid',
          intensity: 15,
          color: '#000000'
        })
      }

      if (foundRedacts.length > 0) {
        const nextRedactions = [...redactions, ...foundRedacts]
        setRedactions(nextRedactions)
        const newHistory = history.slice(0, historyIndex + 1)
        setHistory([...newHistory, JSON.stringify(nextRedactions)])
        setHistoryIndex(newHistory.length)
      }
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-[#FAFBFD] flex flex-col justify-between items-center py-6 px-4 font-sans select-none overflow-hidden relative">
      

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* 1. Floating Top Toolbar */}
      <div className="relative z-10 flex items-center justify-between bg-white rounded-full px-6 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-gray-100/90 gap-6 w-full max-w-[820px] mx-auto mt-2 animate-fade-slide-in">
        
        {/* Left Section: Active Tool Display */}
        <div className="flex items-center gap-5 pl-1">
          <div className="flex items-center gap-2 text-gray-900 bg-gray-50 border border-gray-100 rounded-full px-4.5 py-2 transition-all font-semibold text-[13px]">
            <Wand2 size={14} className="text-primary stroke-[2.5]" />
            <span className="capitalize">{activeTool} Redaction Active</span>
          </div>

          <div className="text-xs text-gray-400 font-medium hidden sm:inline-block">
            💡 Paste a screenshot (Ctrl+V) or click-and-drag to mask!
          </div>
        </div>

        {/* Divider */}
        <div className="h-5 w-[1px] bg-gray-200"></div>

        {/* Right Section: Undo / Redo Actions */}
        <div className="flex items-center gap-4 pr-1">
          {/* Undo */}
          <button 
            onClick={handleUndo}
            disabled={historyIndex === 0}
            className={`p-1.5 rounded-full cursor-pointer transition-all ${
              historyIndex === 0 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>

          {/* Redo */}
          <button 
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1}
            className={`p-1.5 rounded-full cursor-pointer transition-all ${
              historyIndex === history.length - 1 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
            </svg>
          </button>

          {/* Export Actions Shortcut */}
          <button 
            onClick={handleDownload}
            className="flex items-center gap-1.5 bg-primary text-white rounded-full px-5 py-2.2 text-[13px] font-bold shadow-[0_4px_12px_rgba(15,112,230,0.22)] hover:bg-primary-hover hover:shadow-[0_6px_16px_rgba(15,112,230,0.3)] transition-all cursor-pointer"
          >
            <Download size={14} className="stroke-[2.5]" />
            <span>Save PNG</span>
          </button>
        </div>

      </div>

      {/* 2. Main Centered Workspace Area (Canvas & Right Sidebar Panel side-by-side) */}
      <div className="relative z-10 w-full max-w-[1200px] my-auto flex flex-col md:flex-row items-center justify-center gap-6 px-4">
        
        {/* Left Side: Real-time Interactive Redaction Canvas Container */}
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`relative aspect-[1.48] rounded-[28px] overflow-hidden glass-stage-container flex items-center justify-center select-none cursor-crosshair group ${
            isUtilityOpen ? 'w-full md:max-w-[700px]' : 'w-full md:max-w-[820px]'
          }`}
        >
          {/* Dense Transparency Checkerboard Background */}
          <div 
            className="absolute inset-0 z-0" 
            style={{
              backgroundImage: 'conic-gradient(#ffffff 0.25turn, #eef0F2 0.25turn 0.5turn, #ffffff 0.5turn 0.75turn, #eef0F2 0.75turn)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Hidden Offscreen / Display Interactive Canvas */}
          <div className="relative z-10 w-[84%] h-[84%] flex items-center justify-center animate-canvas-load">
            <canvas 
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="max-w-full max-h-full object-contain shadow-sm rounded-lg"
            />
          </div>
        </div>

        {/* Right Side: Toggleable Redaction Utility Drawer */}
        {isUtilityOpen && (
          <div className="w-full md:w-[360px] h-[520px] glass-utility-sidebar rounded-[28px] p-6 flex flex-col justify-between overflow-y-auto animate-fade-slide-in relative z-20">
            
            {/* Sidebar Header */}
            <div>
              <div className="flex items-center justify-between border-b border-gray-100/50 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-soft to-purple-500/10 border border-primary/10 flex items-center justify-center shadow-sm">
                    <Sparkles size={16} className="text-primary animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-[15px] leading-tight">Redact Panel</h3>
                    <p className="text-[11px] text-gray-400 font-medium">Protect sensitive elements</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsUtilityOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sidebar Tabs */}
              <div className="glass-tabs-track mb-4">
                <button 
                  onClick={() => setActiveTab('tools')}
                  className={`flex-1 glass-tab-btn cursor-pointer ${
                    activeTab === 'tools' ? 'active' : ''
                  }`}
                >
                  Tools
                </button>
                <button 
                  onClick={() => setActiveTab('layers')}
                  className={`flex-1 glass-tab-btn cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'layers' ? 'active' : ''
                  }`}
                >
                  <span>Layers</span>
                  {redactions.length > 0 && (
                    <span className="px-1.5 py-0.2 text-[9px] bg-primary text-white rounded-full font-bold shadow-[0_2px_6px_rgba(15,112,230,0.3)]">
                      {redactions.length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('smart-scan')}
                  className={`flex-1 glass-tab-btn cursor-pointer ${
                    activeTab === 'smart-scan' ? 'active' : ''
                  }`}
                >
                  AI Scan
                </button>
              </div>

              {/* Tab 1 Content: Redaction Drawing Tools */}
              {activeTab === 'tools' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Blur Card */}
                    <button 
                      onClick={() => setActiveTool('blur')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl cursor-pointer text-center group premium-tool-card ${
                        activeTool === 'blur' ? 'active' : ''
                      }`}
                    >
                      <Droplet size={18} className={`mb-1.5 transition-colors ${activeTool === 'blur' ? 'text-primary' : 'text-gray-400'}`} />
                      <span className="text-[11.5px] tracking-tight">Blur</span>
                    </button>

                    {/* Pixelate Card */}
                    <button 
                      onClick={() => setActiveTool('pixelate')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl cursor-pointer text-center group premium-tool-card ${
                        activeTool === 'pixelate' ? 'active' : ''
                      }`}
                    >
                      <Grid size={18} className={`mb-1.5 transition-colors ${activeTool === 'pixelate' ? 'text-primary' : 'text-gray-400'}`} />
                      <span className="text-[11.5px] tracking-tight">Pixelate</span>
                    </button>

                    {/* Blackout Card */}
                    <button 
                      onClick={() => setActiveTool('solid')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl cursor-pointer text-center group premium-tool-card ${
                        activeTool === 'solid' ? 'active' : ''
                      }`}
                    >
                      <span className="font-bold text-[18px] mb-0.5 leading-none block -mt-0.5">⬛</span>
                      <span className="text-[11.5px] tracking-tight">Blackout</span>
                    </button>
                  </div>

                  {/* Tool-specific customization settings */}
                  <div className="glass-slider-wrapper space-y-3.5">
                    {activeTool !== 'solid' ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11.5px] font-bold text-gray-800 tracking-tight">Redact Intensity</span>
                          <span className="text-[11px] font-extrabold text-primary bg-primary-soft px-2 py-0.5 rounded-full">{brushIntensity}px</span>
                        </div>
                        <input 
                          type="range"
                          min="5"
                          max="40"
                          value={brushIntensity}
                          onChange={(e) => setBrushIntensity(Number(e.target.value))}
                          className="glass-slider cursor-pointer"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-[11.5px] font-bold text-gray-800 block tracking-tight">Blackout Solid Color</span>
                        <div className="flex items-center gap-2.5">
                          {[
                            { hex: '#000000', name: 'Black' },
                            { hex: '#ffffff', name: 'White' },
                            { hex: '#ef4444', name: 'Red' },
                            { hex: '#3b82f6', name: 'Blue' }
                          ].map((col) => (
                            <button
                              key={col.hex}
                              onClick={() => setSolidColor(col.hex)}
                              className={`w-6.5 h-6.5 rounded-full border transition-all cursor-pointer flex items-center justify-center shadow-sm ${
                                solidColor === col.hex 
                                  ? 'ring-2 ring-primary ring-offset-2 scale-105 border-transparent' 
                                  : 'border-white/80 hover:border-gray-300'
                              }`}
                              style={{ backgroundColor: col.hex }}
                              title={col.name}
                            >
                              {solidColor === col.hex && (
                                <span className={`text-[9px] font-bold ${col.hex === '#ffffff' ? 'text-black' : 'text-white'}`}>✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2 Content: Active Redaction Layers */}
              {activeTab === 'layers' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 px-1">
                    <span>{redactions.length} Masks Applied</span>
                    {redactions.length > 0 && (
                      <button 
                        onClick={clearAllRedactions}
                        className="text-red-500 hover:text-red-600 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 size={11} />
                        Clear All
                      </button>
                    )}
                  </div>

                  {redactions.length === 0 ? (
                    <div className="border border-dashed border-gray-200/80 rounded-2xl p-6 text-center text-gray-400 space-y-2.5">
                      <p className="text-[12px] font-medium leading-relaxed">No active redactions yet.</p>
                      <p className="text-[10px] text-gray-300">Click and drag inside the canvas to create your first mask.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[185px] overflow-y-auto pr-1">
                      {redactions.map((redact, idx) => (
                        <div
                          key={redact.id}
                          onMouseEnter={() => setHoveredRedactId(redact.id)}
                          onMouseLeave={() => setHoveredRedactId(null)}
                          className="flex items-center justify-between p-2.5 glass-item-card rounded-xl transition-all duration-200"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[11.5px] font-bold text-gray-700">#{idx + 1}</span>
                            <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/80 border border-white/60 text-gray-600 uppercase shadow-sm">
                              {redact.tool}
                            </div>
                            <span className="text-[10.5px] text-gray-400 font-medium">
                              {Math.round(redact.w)}x{Math.round(redact.h)}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => deleteRedaction(redact.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                            title="Remove Redaction"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3 Content: AI Auto-Scan Panel */}
              {activeTab === 'smart-scan' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-tr from-primary-soft to-purple-500/5 border border-primary/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-primary">
                      <Sparkles size={14} className="stroke-[2.5]" />
                      <span className="text-[12.5px] font-bold tracking-tight">Auto-Scan Categories</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      Toggle targets to automatically scan and mask credentials locally.
                    </p>

                    <div className="space-y-2 pt-1 border-t border-gray-100/30">
                      {[
                        { key: 'creditCards', label: 'Credit Card Numbers' },
                        { key: 'emails', label: 'Emails & Addresses' },
                        { key: 'usernames', label: 'Usernames & Names' },
                        { key: 'faces', label: 'Profiles & Avatars' }
                      ].map((target) => (
                        <label key={target.key} className="glass-checkbox-row cursor-pointer select-none">
                          <span className="text-[11.5px] font-semibold text-gray-700">{target.label}</span>
                          <input 
                            type="checkbox"
                            checked={scanTargets[target.key]}
                            onChange={(e) => setScanTargets({ ...scanTargets, [target.key]: e.target.checked })}
                            className="w-4.5 h-4.5 text-primary border-gray-200/80 rounded focus:ring-primary accent-primary cursor-pointer"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* AI Scan CTA Button */}
                  <button
                    onClick={triggerSmartScan}
                    disabled={isScanning}
                    className="w-full py-3.5 bg-gradient-to-tr from-primary to-[#7d2ae8] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles size={14} className={isScanning ? 'animate-spin' : ''} />
                    <span>{isScanning ? 'Scanning Screenshot...' : 'AI Auto-Redact'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Pillar 3: Sidebar Instant Export Actions */}
            <div className="border-t border-gray-100/50 pt-4 space-y-2.5 mt-auto">
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block">Instant Export Options</span>
              
              <div className="grid grid-cols-3 gap-2">
                {/* Copy to Clipboard */}
                <button
                  onClick={handleCopyToClipboard}
                  className={`py-3 px-1 rounded-xl text-[11.5px] font-bold flex items-center justify-center gap-1 glass-export-btn cursor-pointer ${
                    copySuccess 
                      ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-md' 
                      : 'bg-primary text-white shadow-primary-soft shadow-md hover:bg-primary-hover'
                  }`}
                >
                  {copySuccess ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                </button>

                {/* Download */}
                <button
                  onClick={handleDownload}
                  className="py-3 px-1 bg-indigo-600 text-white rounded-xl text-[11.5px] font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-700 glass-export-btn cursor-pointer shadow-indigo-600/10 shadow-md"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>

                {/* Native Share */}
                <button
                  onClick={handleShare}
                  className="py-3 px-1 bg-gray-900 text-white rounded-xl text-[11.5px] font-bold flex items-center justify-center gap-1.5 hover:bg-black glass-export-btn cursor-pointer"
                >
                  <Share2 size={13} />
                  <span>Share</span>
                </button>
              </div>

              {/* Clean manual file drop info */}
              <div className="text-[10px] text-gray-400 text-center font-medium flex items-center justify-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-gray-400 inline-block -mt-0.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>100% Secure local processing • Images never leave your device</span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* 3. Bottom Thumbnail strip & Direct uploads */}
      <div className="relative z-10 flex items-center gap-3.5 mt-2 mb-2 animate-fade-slide-in">
        
        {/* Add File button (+ icon) */}
        <button 
          onClick={handleAddClick}
          className="bg-gray-100 hover:bg-gray-200 rounded-[14px] h-12 w-12 flex items-center justify-center cursor-pointer transition-colors" 
          title="Add/Replace Screenshot"
        >
          <Plus size={18} className="text-gray-700 stroke-[2.5]" />
        </button>

        {/* Active preview thumbnail */}
        <div className="h-12 w-12 rounded-[14px] relative cursor-pointer border-[2px] border-primary bg-white flex items-center justify-center p-0.5 shadow-sm">
          <div 
            className="w-full h-full rounded-[10px] overflow-hidden" 
            style={{
              backgroundImage: 'conic-gradient(#ffffff 0.25turn, #eef0F2 0.25turn 0.5turn, #ffffff 0.5turn 0.75turn, #eef0F2 0.75turn)',
              backgroundSize: '6px 6px',
            }}
          >
            <img 
              src={imageSrc} 
              alt="Thumbnail preview" 
              className="w-full h-full object-contain p-0.5"
            />
          </div>

          {/* Selection indicator chevron */}
          <div className="absolute -top-1.5 -right-1.5 bg-primary text-white rounded-full w-4.5 h-4.5 flex items-center justify-center border border-white shadow-sm">
            <ChevronUp size={11} className="stroke-[3]" />
          </div>
        </div>

      </div>

      <button 
        onClick={() => setIsUtilityOpen(!isUtilityOpen)}
        className={`absolute bottom-6 right-6 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer active:scale-95 ${
          isUtilityOpen 
            ? 'bg-gray-900 text-white hover:bg-black' 
            : 'bg-primary text-white hover:bg-primary-hover'
        }`}
        title="Toggle Redact Controls"
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={`transition-transform duration-300 ${isUtilityOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

    </div>
  )
}
