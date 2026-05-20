import './style.css'
import { initAgentation } from './agentation-init.jsx'

// Initialize Agentation (dev only)
initAgentation()

/**
 * Quick Redact - Professional Screenshot Masking Tool
 * Refactored for remove.bg style navigation and editor workflow.
 */

// --- Elements ---
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d', { willReadFrequently: true })
const editorContainer = document.getElementById('editor-container')
const dropZone = document.getElementById('drop-zone')
const controls = document.getElementById('controls')
const overlay = document.getElementById('selection-overlay')
const fileInput = document.getElementById('file-input')
const fileTrigger = document.getElementById('file-trigger')

// Hero Elements (Landing Page)
const heroFileTrigger = document.getElementById('hero-file-trigger')
const heroDropZone = document.getElementById('hero-drop-zone')
const heroFileInput = document.getElementById('hero-file-input')

// Control Buttons
const undoBtn = document.getElementById('undo-btn')
const redoBtn = document.getElementById('redo-btn')
const copyBtn = document.getElementById('copy-btn')
const downloadBtn = document.getElementById('download-btn')
const resetBtn = document.getElementById('reset-btn')
const intensityRange = document.getElementById('intensity-range')
const agentScanBtn = document.getElementById('agent-scan-btn')
const resetBtnTop = document.getElementById('reset-btn-top')
const canvaOverlayBtn = document.getElementById('canva-overlay-btn')
const adjustToggleBtn = document.getElementById('adjust-toggle-btn')
const adjustPopover = document.getElementById('adjust-popover')
const thumbnailStrip = document.getElementById('thumbnail-strip')
const thumbImg = document.getElementById('thumb-img')

// Sections
const sections = document.querySelectorAll('.view')
const navLinks = document.querySelectorAll('.nav-links a')

// --- State ---
let originalImage = null
let redactions = []
let history = []
let redoStack = []

let isInteracting = false
let interactionMode = 'none' // 'draw' | 'move' | 'resize'
let startX, startY
let selectedIndex = -1
let dragOffset = { x: 0, y: 0 }
let activeHandle = null
const HANDLE_SIZE = 12

let currentTool = 'pixelate'
const toolButtons = document.querySelectorAll('#tool-selector .btn-tool')

// --- Initialization ---
function init() {
  // Navigation
  window.addEventListener('hashchange', handleRouting)
  handleRouting() // Initial route

  // One-time cache clear for the v2 transition
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        registration.unregister()
      }
    })
  }

  // Events
  window.addEventListener('paste', handlePaste)
  window.addEventListener('keydown', handleKeydown)
  
  // Main Upload Events
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('active') })
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'))
  dropZone.addEventListener('drop', handleDrop)
  fileTrigger.addEventListener('click', e => { e.stopPropagation(); fileInput.click() })
  fileInput.addEventListener('change', e => e.target.files.length > 0 && loadImage(e.target.files[0]))
  dropZone.addEventListener('click', () => fileInput.click())

  // Hero Upload Events
  if (heroDropZone) {
    heroDropZone.addEventListener('dragover', e => { e.preventDefault(); heroDropZone.classList.add('active') })
    heroDropZone.addEventListener('dragleave', () => heroDropZone.classList.remove('active'))
    heroDropZone.addEventListener('drop', handleDrop)
    heroFileTrigger.addEventListener('click', e => { e.stopPropagation(); heroFileInput.click() })
    heroFileInput.addEventListener('change', e => e.target.files.length > 0 && loadImage(e.target.files[0]))
    heroDropZone.addEventListener('click', () => heroFileInput.click())
  }

  // Interaction
  canvas.addEventListener('mousedown', handleMouseDown)
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)

  // Controls
  undoBtn?.addEventListener('click', undo)
  redoBtn?.addEventListener('click', redo)
  copyBtn?.addEventListener('click', copyToClipboard)
  downloadBtn?.addEventListener('click', downloadImage)
  resetBtn?.addEventListener('click', resetEditor)
  
  intensityRange?.addEventListener('input', (e) => {
    if (selectedIndex !== -1) {
      redactions[selectedIndex].intensity = parseInt(e.target.value)
      render()
    }
  })

  // Adjust Popover Toggle
  adjustToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    adjustPopover?.classList.toggle('hidden')
    adjustToggleBtn.classList.toggle('active', !adjustPopover?.classList.contains('hidden'))
  })

  document.addEventListener('click', (e) => {
    if (adjustPopover && !adjustPopover.contains(e.target) && e.target !== adjustToggleBtn) {
      adjustPopover.classList.add('hidden')
      adjustToggleBtn?.classList.remove('active')
    }
  })

  // Tool Switching
  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool))
  })

  // Agent Scan
  agentScanBtn?.addEventListener('click', runAgentScan)

  // Reset Top
  resetBtnTop?.addEventListener('click', () => {
    resetEditor()
    switchView('home')
    
    const standaloneWrapper = document.querySelector('.standalone-upload-wrapper')
    if (standaloneWrapper) {
      standaloneWrapper.classList.remove('editor-active')
    }
  })

  // Sample Image Clicks
  document.querySelectorAll('.sample-img').forEach(img => {
    img.addEventListener('click', async () => {
      try {
        const response = await fetch(img.src)
        const blob = await response.blob()
        const file = new File([blob], "sample.jpg", { type: "image/jpeg" })
        loadImage(file)
      } catch (err) {
        showToast("Failed to load sample image", "❌")
      }
    })
  })

  // --- SaaS Hub Modal Listeners ---
  if (modalClose) {
    modalClose.addEventListener('click', closeSaaSModal)
  }
  
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeSaaSModal()
    })
  }

  modalTabTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      switchSaaSTab(trigger.dataset.tab)
    })
  })

  // Navbar premium triggers
  const navBulkBtn = document.getElementById('nav-bulk-btn')
  const navApiBtn = document.getElementById('nav-api-btn')
  const navPluginsBtn = document.getElementById('nav-plugins-btn')
  const navPricingBtn = document.getElementById('nav-pricing-btn')
  const navLoginBtn = document.getElementById('nav-login-btn')
  const navSignupBtn = document.getElementById('nav-signup-btn')

  if (navBulkBtn) navBulkBtn.addEventListener('click', e => { e.preventDefault(); openSaaSModal('bulk') })
  if (navApiBtn) navApiBtn.addEventListener('click', e => { e.preventDefault(); openSaaSModal('api') })
  if (navPluginsBtn) navPluginsBtn.addEventListener('click', e => { e.preventDefault(); openSaaSModal('plugins') })
  if (navPricingBtn) navPricingBtn.addEventListener('click', e => { e.preventDefault(); openSaaSModal('pricing') })
  if (navLoginBtn) navLoginBtn.addEventListener('click', e => { e.preventDefault(); openSaaSModal('auth-login') })
  if (navSignupBtn) navSignupBtn.addEventListener('click', e => { e.preventDefault(); openSaaSModal('auth-signup') })

  // Inline switches in auth panels
  const linkSwitchToSignup = document.getElementById('link-switch-to-signup')
  const linkSwitchToLogin = document.getElementById('link-switch-to-login')
  if (linkSwitchToSignup) linkSwitchToSignup.addEventListener('click', () => switchSaaSTab('auth-signup'))
  if (linkSwitchToLogin) linkSwitchToLogin.addEventListener('click', () => switchSaaSTab('auth-login'))

  // Simulated button interactions in modal
  const copyApiKeyBtn = document.getElementById('copy-api-key-btn')
  if (copyApiKeyBtn) {
    copyApiKeyBtn.addEventListener('click', () => {
      const keyField = document.getElementById('sandbox-key-field')
      if (keyField) {
        keyField.select()
        navigator.clipboard.writeText(keyField.value)
        showToast("✅ Copied censored image to clipboard!")
      }
    })
  }

  const bulkTryBtn = document.getElementById('bulk-try-btn')
  if (bulkTryBtn) {
    bulkTryBtn.addEventListener('click', () => {
      showToast("Thank you for your interest! Bulk Redaction trial starting... 🚀")
      closeSaaSModal()
    })
  }

  const pricingProBtn = document.getElementById('pricing-pro-btn')
  if (pricingProBtn) {
    pricingProBtn.addEventListener('click', () => {
      showToast("Upgrading to Pro... Redirecting to secure checkout! 💎")
      closeSaaSModal()
    })
  }

  // Simulated form submits
  const loginForm = document.getElementById('login-form')
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault()
      const email = document.getElementById('login-email').value
      showToast(`Welcome back, ${email.split('@')[0]}! 👋`)
      closeSaaSModal()
    })
  }

  const signupForm = document.getElementById('signup-form')
  if (signupForm) {
    signupForm.addEventListener('submit', e => {
      e.preventDefault()
      const name = document.getElementById('signup-name').value
      showToast(`Account successfully created for ${name}! ✨`)
      closeSaaSModal()
    })
  }

  // Staggered Scroll-Triggered Feature Card Reveals
  const stepCards = document.querySelectorAll('.step-card')
  if (stepCards.length > 0) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          stepCards.forEach((card, index) => {
            setTimeout(() => {
              card.classList.add('animate-fade-slide-in')
            }, index * 150)
          })
          obs.disconnect() // Only trigger once
        }
      })
    }, { threshold: 0.15 })
    
    const stepsGrid = document.querySelector('.steps-grid')
    if (stepsGrid) observer.observe(stepsGrid)
  }
}

// --- SaaS Hub Modal Controllers ---
const modal = document.getElementById('saas-hub-modal')
const modalClose = document.getElementById('modal-close-btn')
const modalTabTriggers = document.querySelectorAll('.modal-tab-trigger')
const modalTabContents = document.querySelectorAll('.modal-tab-content')

function openSaaSModal(targetTab = 'bulk') {
  if (!modal) return
  modal.classList.remove('hidden')
  switchSaaSTab(targetTab)
}

function closeSaaSModal() {
  if (!modal) return
  modal.classList.add('hidden')
}

function switchSaaSTab(tabId) {
  modalTabTriggers.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId)
  })
  modalTabContents.forEach(content => {
    content.classList.toggle('active', content.id === `tab-content-${tabId}`)
  })
}

// --- Navigation / Routing ---
function handleRouting() {
  const hash = window.location.hash || '#home'
  sections.forEach(section => {
    section.classList.toggle('active', `#${section.id}` === hash)
  })
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === hash)
  })
}

function switchView(view) {
  window.location.hash = `#${view}`
}

function setTool(tool) {
  if (tool === 'agent') return // Agent is a process, not a tool
  currentTool = tool
  toolButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === tool)
  })
  
  if (adjustPopover) {
    adjustPopover.classList.add('hidden')
    adjustToggleBtn?.classList.remove('active')
  }

  if (selectedIndex !== -1) {
    redactions[selectedIndex].type = tool
    saveToHistory()
    render()
  }
  showToast(`Tool: ${tool}`)
}

// --- AI Agent Functions ---
async function runAgentScan() {
  if (!originalImage || isInteracting) return
  
  showToast("Agent Scanning...")
  
  // Create scanning animation
  const scanLine = document.createElement('div')
  scanLine.className = 'scanning-line'
  editorContainer.appendChild(scanLine)
  
  // Wait for "AI" to process
  await new Promise(r => setTimeout(r, 2000))
  
  // Mock detection logic: find a few random areas that look like text/data
  // In a real app, this would use a model or OCR
  const mockDetections = [
    { x: canvas.width * 0.1, y: canvas.height * 0.2, w: 200, h: 40 },
    { x: canvas.width * 0.5, y: canvas.height * 0.6, w: 150, h: 30 },
    { x: canvas.width * 0.3, y: canvas.height * 0.8, w: 180, h: 35 }
  ]

  mockDetections.forEach(d => {
    // Only add if within bounds
    if (d.x + d.w < canvas.width && d.y + d.h < canvas.height) {
      redactions.push({
        ...d,
        type: 'blur',
        intensity: 20
      })
    }
  })

  scanLine.remove()
  saveToHistory()
  render()
  showToast("Scan Complete: 3 sensitive areas masked", "✨")
}

// --- Coordinate Helpers ---
function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  }
}

function getOverlayCoords(e) {
  const rect = editorContainer.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

// --- Image Handling ---
async function handlePaste(e) {
  // 1. Check for files in clipboardData (e.g. copying a file from file explorer)
  if (e.clipboardData.files && e.clipboardData.files.length > 0) {
    for (let file of e.clipboardData.files) {
      if (file.type.startsWith('image/')) {
        loadImage(file)
        return
      }
    }
  }

  // 2. Check for clipboard items (e.g. Snipping tool screenshots, browser right-click "Copy Image")
  const items = e.clipboardData.items
  if (items) {
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          loadImage(file)
          return
        }
      }
    }
  }

  // 3. Check for pasted text (Image URL or Base64 data string)
  const pastedText = e.clipboardData.getData('text')
  if (pastedText) {
    const trimmed = pastedText.trim()
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
      try {
        showToast("Fetching image from URL...")
        const response = await fetch(trimmed)
        const blob = await response.blob()
        if (blob.type.startsWith('image/')) {
          const file = new File([blob], "url-image.png", { type: blob.type })
          loadImage(file)
        } else {
          showToast("URL is not a valid image", "❌")
        }
      } catch (err) {
        // Fallback: load directly via HTMLImageElement to handle CORS/local strings
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = img.width
            tempCanvas.height = img.height
            const tempCtx = tempCanvas.getContext('2d')
            tempCtx.drawImage(img, 0, 0)
            tempCanvas.toBlob(blob => {
              const file = new File([blob], "url-image.png", { type: "image/png" })
              loadImage(file)
            })
          }
          img.onerror = () => showToast("Failed to load image from URL", "❌")
          img.src = trimmed
        } catch (fallbackErr) {
          showToast("Failed to load image from URL", "❌")
        }
      }
    }
  }
}

async function handleDrop(e) {
  e.preventDefault(); dropZone.classList.remove('active')
  const files = e.dataTransfer.files
  if (files.length > 0 && files[0].type.startsWith('image/')) loadImage(files[0])
}

async function loadImage(file) {
  try {
    const reader = new FileReader()
    reader.onload = function(e) {
      localStorage.setItem('uploadedImage', e.target.result)
      window.location.href = '/replica.html'
    }
    reader.readAsDataURL(file)
  } catch (err) {
    showToast("Failed to load image", "❌")
  }
}

// --- Interaction Logic ---
function handleMouseDown(e) {
  if (!originalImage || e.button !== 0) return
  
  const canvasCoords = getCanvasCoords(e)
  const overlayCoords = getOverlayCoords(e)
  
  interactionMode = 'none'
  activeHandle = null
  
  // Check for handle clicks first if something is selected
  if (selectedIndex !== -1) {
    const r = redactions[selectedIndex]
    activeHandle = getHandleAt(canvasCoords, r)
    if (activeHandle) {
      interactionMode = 'resize'
      isInteracting = true
      return
    }
  }

  // Check if clicked on existing redaction
  let foundIndex = -1
  for (let i = redactions.length - 1; i >= 0; i--) {
    const r = redactions[i]
    if (canvasCoords.x >= r.x && canvasCoords.x <= r.x + r.w &&
        canvasCoords.y >= r.y && canvasCoords.y <= r.y + r.h) {
      foundIndex = i
      break
    }
  }

  if (foundIndex !== -1) {
    interactionMode = 'move'
    selectedIndex = foundIndex
    dragOffset = {
      x: canvasCoords.x - redactions[selectedIndex].x,
      y: canvasCoords.y - redactions[selectedIndex].y
    }
    intensityRange.value = redactions[selectedIndex].intensity
    setTool(redactions[selectedIndex].type)
  } else {
    interactionMode = 'draw'
    selectedIndex = -1
    startX = canvasCoords.x
    startY = canvasCoords.y
    window.rawStartX = overlayCoords.x
    window.rawStartY = overlayCoords.y
    
    overlay.style.display = 'block'
    overlay.style.left = `${overlayCoords.x}px`
    overlay.style.top = `${overlayCoords.y}px`
    overlay.style.width = '0px'
    overlay.style.height = '0px'
  }
  
  isInteracting = true
  render()
}

function handleMouseMove(e) {
  if (!isInteracting) return
  
  const canvasCoords = getCanvasCoords(e)
  const overlayCoords = getOverlayCoords(e)
  
  if (interactionMode === 'draw') {
    const width = overlayCoords.x - window.rawStartX
    const height = overlayCoords.y - window.rawStartY
    overlay.style.width = `${Math.abs(width)}px`
    overlay.style.height = `${Math.abs(height)}px`
    overlay.style.left = `${width < 0 ? overlayCoords.x : window.rawStartX}px`
    overlay.style.top = `${height < 0 ? overlayCoords.y : window.rawStartY}px`
  } else if (interactionMode === 'move') {
    const r = redactions[selectedIndex]
    r.x = canvasCoords.x - dragOffset.x
    r.y = canvasCoords.y - dragOffset.y
    render()
  } else if (interactionMode === 'resize') {
    resizeRedaction(redactions[selectedIndex], canvasCoords)
    render()
  }
}

function getHandleAt(coords, r) {
  const hs = HANDLE_SIZE / 2
  if (Math.abs(coords.x - r.x) < hs && Math.abs(coords.y - r.y) < hs) return 'tl'
  if (Math.abs(coords.x - (r.x + r.w)) < hs && Math.abs(coords.y - r.y) < hs) return 'tr'
  if (Math.abs(coords.x - r.x) < hs && Math.abs(coords.y - (r.y + r.h)) < hs) return 'bl'
  if (Math.abs(coords.x - (r.x + r.w)) < hs && Math.abs(coords.y - (r.y + r.h)) < hs) return 'br'
  return null
}

function resizeRedaction(r, coords) {
  const minSize = 10
  if (activeHandle === 'br') {
    r.w = Math.max(minSize, coords.x - r.x)
    r.h = Math.max(minSize, coords.y - r.y)
  } else if (activeHandle === 'bl') {
    const oldRight = r.x + r.w
    r.x = Math.min(oldRight - minSize, coords.x)
    r.w = oldRight - r.x
    r.h = Math.max(minSize, coords.y - r.y)
  } else if (activeHandle === 'tr') {
    const oldBottom = r.y + r.h
    r.y = Math.min(oldBottom - minSize, coords.y)
    r.h = oldBottom - r.y
    r.w = Math.max(minSize, coords.x - r.x)
  } else if (activeHandle === 'tl') {
    const oldRight = r.x + r.w
    const oldBottom = r.y + r.h
    r.x = Math.min(oldRight - minSize, coords.x)
    r.y = Math.min(oldBottom - minSize, coords.y)
    r.w = oldRight - r.x
    r.h = oldBottom - r.y
  }
}

function handleMouseUp(e) {
  if (!isInteracting) return
  isInteracting = false
  
  if (interactionMode === 'draw') {
    overlay.style.display = 'none'
    const canvasCoords = getCanvasCoords(e)
    const w = Math.abs(canvasCoords.x - startX)
    const h = Math.abs(canvasCoords.y - startY)
    
    if (w > 5 && h > 5) {
      redactions.push({
        x: Math.min(startX, canvasCoords.x),
        y: Math.min(startY, canvasCoords.y),
        w: w, h: h,
        type: currentTool,
        intensity: parseInt(intensityRange.value)
      })
      selectedIndex = redactions.length - 1
      saveToHistory()
      flashCanvas()
      redoStack = []
    }
  } else {
    saveToHistory()
    redoStack = []
  }
  
  interactionMode = 'none'
  render()
  updateHistoryButtons()
}

// --- Rendering ---
function render() {
  if (!originalImage) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(originalImage, 0, 0)
  
  redactions.forEach((r, index) => {
    applyRedaction(r)
    if (index === selectedIndex) {
      ctx.save()
      ctx.strokeStyle = '#0F70E6'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(r.x, r.y, r.w, r.h)
      
      ctx.fillStyle = '#0F70E6'
      ctx.setLineDash([])
      const hs = HANDLE_SIZE
      ctx.fillRect(r.x - hs/2, r.y - hs/2, hs, hs)
      ctx.fillRect(r.x + r.w - hs/2, r.y - hs/2, hs, hs)
      ctx.fillRect(r.x - hs/2, r.y + r.h - hs/2, hs, hs)
      ctx.fillRect(r.x + r.w - hs/2, r.y + r.h - hs/2, hs, hs)
      ctx.restore()
    }
  })
}

function applyRedaction(r) {
  if (r.type === 'pixelate') {
    const pSize = r.intensity
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = Math.max(1, r.w / pSize)
    tempCanvas.height = Math.max(1, r.h / pSize)
    const tempCtx = tempCanvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    tempCtx.drawImage(canvas, r.x, r.y, r.w, r.h, 0, 0, tempCanvas.width, tempCanvas.height)
    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, r.x, r.y, r.w, r.h)
  } else if (r.type === 'blur') {
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip()
    ctx.filter = `blur(${r.intensity}px)`; ctx.drawImage(canvas, 0, 0)
    ctx.restore(); ctx.filter = 'none'
  } else if (r.type === 'solid') {
    ctx.fillStyle = '#000'; ctx.fillRect(r.x, r.y, r.w, r.h)
  }
}

// --- History ---
function saveToHistory() {
  history.push(JSON.stringify(redactions))
  if (history.length > 50) history.shift()
}

function flashCanvas() {
  canvas.classList.add('canvas-flash')
  setTimeout(() => canvas.classList.remove('canvas-flash'), 250)
}

function undo() {
  if (history.length <= 1) return
  redoStack.push(history.pop())
  redactions = JSON.parse(history[history.length - 1])
  selectedIndex = -1; render(); flashCanvas(); updateHistoryButtons()
}

function redo() {
  if (redoStack.length === 0) return
  const next = redoStack.pop()
  history.push(next); redactions = JSON.parse(next)
  selectedIndex = -1; render(); flashCanvas(); updateHistoryButtons()
}

function updateHistoryButtons() {
  undoBtn.disabled = history.length <= 1
  redoBtn.disabled = redoStack.length === 0
}

// --- Utilities ---
function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo() }
  if (e.key === 'Escape') resetEditor()
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedIndex !== -1) { redactions.splice(selectedIndex, 1); selectedIndex = -1; saveToHistory(); render() }
  }
  if (!e.ctrlKey && !e.metaKey) {
    if (e.key.toLowerCase() === 'p') setTool('pixelate')
    if (e.key.toLowerCase() === 'b') setTool('blur')
    if (e.key.toLowerCase() === 's') setTool('solid')
    if (e.key.toLowerCase() === 'a') runAgentScan()
  }
}

function showToast(message, type = '') {
  let toast = document.querySelector('.toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.className = 'toast'
    toast.setAttribute('role', 'alert')
    document.body.appendChild(toast)
  }
  
  // Clean the message and identify icon type
  let cleanMsg = message
  let iconType = type

  // If no explicit type, check if the message starts with a known emoji
  if (!iconType) {
    if (cleanMsg.startsWith('✅')) {
      iconType = 'success'
      cleanMsg = cleanMsg.replace(/^✅\s*/, '')
    } else if (cleanMsg.startsWith('❌')) {
      iconType = 'error'
      cleanMsg = cleanMsg.replace(/^❌\s*/, '')
    } else if (cleanMsg.startsWith('✨') || cleanMsg.startsWith('🚀') || cleanMsg.startsWith('🤖')) {
      iconType = 'sparkle'
      cleanMsg = cleanMsg.replace(/^[✨🚀🤖]\s*/, '')
    } else if (cleanMsg.startsWith('💡')) {
      iconType = 'info'
      cleanMsg = cleanMsg.replace(/^💡\s*/, '')
    } else {
      iconType = 'info'
    }
  } else {
    // Map emoji in type to standard types
    if (iconType === '✅') iconType = 'success'
    else if (iconType === '❌') iconType = 'error'
    else if (iconType === '✨' || iconType === '🚀' || iconType === '🤖') iconType = 'sparkle'
    else if (iconType === '💡') iconType = 'info'
  }

  // Create standard SVG icon based on the iconType
  let svgIcon = ''
  if (iconType === 'success') {
    svgIcon = `<svg class="toast-icon success" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
  } else if (iconType === 'error') {
    svgIcon = `<svg class="toast-icon error" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
  } else if (iconType === 'sparkle') {
    svgIcon = `<svg class="toast-icon sparkle" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F70E6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"></path></svg>`
  } else {
    svgIcon = `<svg class="toast-icon info" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
  }

  toast.innerHTML = `<div class="toast-content">${svgIcon}<span class="toast-text">${cleanMsg}</span></div>`
  toast.classList.add('show')
  
  if (window.toastTimeout) clearTimeout(window.toastTimeout)
  window.toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000)
}

function copyToClipboard() {
  selectedIndex = -1; render()
  const origText = copyBtn.innerHTML
  copyBtn.classList.add('btn-success')
  copyBtn.innerHTML = '<span>Copied!</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-left: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>'
  setTimeout(() => {
    copyBtn.classList.remove('btn-success')
    copyBtn.innerHTML = origText
  }, 1500)
  canvas.toBlob(async blob => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
      showToast("✅ Copied censored image to clipboard!")
    } catch (err) { showToast("Copy failed", "❌") }
  })
}

function downloadImage() {
  selectedIndex = -1; render()
  const link = document.createElement('a')
  link.download = `redacted-${Date.now()}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function resetEditor() {
  if (originalImage && !confirm("Clear work?")) return
  originalImage = null; redactions = []; history = []; redoStack = []
  
  // Reset visibility
  canvas.classList.add('hidden')
  overlay.classList.add('hidden')
  controls.classList.add('hidden')
  dropZone.classList.remove('hidden')
  
  if (canvaOverlayBtn) canvaOverlayBtn.classList.add('hidden')
  if (thumbnailStrip) thumbnailStrip.classList.add('hidden')
  
  updateHistoryButtons()
  switchView('home')
}

init()
