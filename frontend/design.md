# Design System Guidance: Quick Redact

## Context and Goals
Quick Redact is a privacy-first, zero-upload micro-utility designed for rapid censorship of sensitive data in screenshots. Millions of remote workers, software developers, gamers, and students need to strip API keys, emails, passwords, and private identifiers before sharing images to platforms like Slack, Discord, GitHub, or X.

The primary goal of this design system is to facilitate an instantaneous, low-friction, and exceptionally secure user flow. The interface must prioritize a clipboard-first desktop interaction (Ctrl + V) and client-side browser canvas manipulation, delivering immediate visual feedback without relying on server-side processing or multi-step uploading wizards.

---

## Design Tokens and Foundations

### Typography
- **Primary Font Family:** `font.family.primary = Outfit`
- **Fallback Font Stack:** `font.family.stack = Outfit, system-ui, sans-serif`
- **Base Metrics:** `font.size.base = 16px`, `font.weight.base = 400`, `font.lineHeight.base = 24px`

#### Typography Scale
- `font.size.xs = 11px` (Contextual micro-copy, file dimensions)
- `font.size.sm = 12px` (Labels, tooltips, keyboard shortcuts tags)
- `font.size.md = 14px` (Secondary button text, descriptive helper text)
- `font.size.lg = 16px` (Body text, system status messages)
- `font.size.xl = 20px` (Sub-headings, card titles)
- `font.size.2xl = 24px` (Section headers)
- `font.size.3xl = 32px` (Primary feature callouts)
- `font.size.4xl = 48px` (Hero metrics, primary marketing headers)

### Color Palette

#### Text Tokens
- `color.text.primary = #111827` (High-contrast charcoal for core headers and primary copy)
- `color.text.secondary = #4B5563` (Slate gray for secondary instructions and side labels)
- `color.text.muted = #9CA3AF` (Light gray for fallback watermarks and micro-metadata)
- `color.text.inverse = #FFFFFF` (Pure white for dark surfaces and action button text)
- `color.text.accent = #5843E8` (Deep electric indigo for interactive states and brand emphasis)

#### Surface Tokens
- `color.surface.base = #FFFFFF` (Pure white primary background)
- `color.surface.raised = #F9FAFB` (Subtle off-white for secondary cards, panels, and controls)
- `color.surface.muted = #F3F4F6` (Light gray canvas wrapper background)
- `color.surface.dark = #111827` (Deep slate black reserved for dark-mode toolbar nodes)
- `color.surface.overlay = rgba(17, 24, 39, 0.05)` (Soft tint for drag-selection bounds)

#### Status Tokens
- `color.status.success = #10B981` (Emerald green for "Copied to Clipboard!" updates)
- `color.status.error = #EF4444` (Red for invalid file or broken clipboard actions)
- `color.status.focus = #3B82F6` (Accessible blue ring for focus-visible elements)

### Spacing Scale
- `space.1 = 4px`
- `space.2 = 8px`
- `space.3 = 12px`
- `space.4 = 16px`
- `space.5 = 24px`
- `space.6 = 32px`
- `space.7 = 48px`
- `space.8 = 72px`

### Structural Tokens
- **Border Radius:** `radius.xs = 4px` (Keyboard tags), `radius.sm = 8px` (Control buttons), `radius.md = 16px` (Canvas view box), `radius.lg = 9999px` (Pill toggles)
- **Shadows:** `shadow.1 = 0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06)`
- **Motion Durations:** `motion.duration.instant = 100ms`, `motion.duration.fast = 200ms`, `motion.duration.normal = 400ms`

---

## Component-Level Rules

### 1. The Dynamic Drop/Paste Zone (`CanvasWrapper`)
#### Anatomy
The drop/paste zone consists of an outer container (`space.5` padding), a dashed border indicating interactivity, a central layout engine housing helper typography (`font.size.xl`), an explicit keyboard shortcut indicator badge, and an unrendered HTML5 `<canvas>` node that dynamically initializes upon image receipt.

#### Variants & States
- **Default (Empty State):** Surface must be `color.surface.raised`. Dashed border must use `color.text.muted`. Interaction copy must be visible.
- **Hover/Drag-Over State:** Surface must transition to `color.surface.muted` using `motion.duration.fast`. Dashed border must change to `color.text.accent`.
- **Active (Image Populated):** Outer dashed boundaries must disappear. The surface must dynamically shrink to wrap the inner canvas aspect ratio tightly. Central text must be hidden.

#### Interaction Behavior
- **Pointer/Touch:** Clicking the empty zone must trigger the native system file selector fallback. Dropping an image file directly onto the surface must load it into the canvas frame instantly.
- **Keyboard:** The viewport must continuously listen for global window `Paste` events. Pressing `Ctrl + V` (or `Cmd + V`) anywhere on the surface must parse the system clipboard, catch the binary image block, and map it directly to the canvas context without intermediate configurations.

### 2. The Censorship Selection Tool (`CanvasEditor`)
#### Anatomy
Once an image is drawn to the active `<canvas>`, the pointer crosshair changes to `crosshair`. Dragging your pointer maps geometric vectors ($X, Y, \text{Width}, \text{Height}$) across the canvas bounds.

#### Interaction & Component States
- **Pointer Down / Start Drag:** The application must cache the starting coordinate ($X_1, Y_1$). As the pointer shifts, a selection bounding rectangle must be drawn using `color.surface.overlay` with a fine outline matching `color.text.accent`.
- **Pointer Up / Release Drag:** The bounding rectangle coordinates must immediately execute a local pixelation function. The script must downscale the selection sub-region onto a secondary internal low-resolution grid, then scale it back up with `ctx.imageSmoothingEnabled = false`, processing the censorship instantly.
- **Error State:** If an asset cannot be mutated due to cross-origin security context markers, an error notification component using `color.status.error` text must surface above the workspace.

---

## Accessibility Requirements

### WCAG 2.2 AA Compliance Checklist
- **Contrast Check:** Every textual asset, button label, and status indicator must maintain a contrast ratio of at least 4.5:1 against its underlying surface background color token.
- **Focus Indicators:** Interactive control utilities, buttons, and input modules must show a clear focus-visible outline token using `color.status.focus` with a minimum thickness of `2px` when tabbed into via keyboard controls.
- **Keyboard Access:** Users must be able to clear, reset, or download files purely via standard keyboard paths if they cannot utilize mouse-based drag selection controls.
- **Screen Reader Labels:** All buttons lacking written display text (e.g., an icon-only undo toggle) must feature an explicit, non-ambiguous `aria-label` or `accessibilityLabel` attribute describing the direct outcome of the interaction (e.g., `aria-label="Undo last redaction operation"`).

---

## Content and Tone Standards

### Tone Structure
The writing style across all Quick Redact interfaces must remain **concise, confident, and implementation-focused**. Avoid verbose onboarding strings or vague marketing descriptors. State precisely what the utility does and emphasize the safety of local on-device client processing.

### Approved Interface Copy Examples
- **Primary Hero Header:** "Quickly blur private data out of screenshots."
- **Privacy Assurance Callout:** "100% Private. Your files are processed locally in your browser and never touch an external server."
- **Success Action Trigger:** "✅ Copied censored image to clipboard!"

### Prohibited Interface Copy Examples
- **Vague & Wordy:** "Welcome to our platform! We help you clean things up easily by letting you upload your screenshots and modifying them so people don't see bad things."
- **Ambiguous Actions:** "Process Image" or "Submit Content" (Use specific actions like "Copy Redacted Image" instead).

---

## Anti-Patterns and Prohibited Implementations

- **No Remote Server Uploads:** Images must never be transmitted via API requests to backend storage infrastructure for rendering operations. All canvas manipulation actions must execute locally inside the browser memory loop.
- **No Cumulative Destructive Blurs:** Do not chain repeated standard CSS blur filters directly over identical canvas sub-coordinates, as this causes cumulative bleeding artifacts that can leak pixel text shapes. Use true pixelation scale manipulation.
- **No Obstructive Interstitial Layouts:** Do not insert sign-up blockades, account registration modals, or multi-tiered upload confirmation checks mid-way through the clipboard paste-to-blur production sequence.

---

## QA Checklist

- [ ] Verify that pressing `Ctrl + V` or `Cmd + V` successfully initializes and renders clipboard image content from empty, initialized, or active application states.
- [ ] Confirm that redacting a canvas section runs completely client-side while network connectivity is completely severed (offline mode test).
- [ ] Ensure text element visibility across all status fields meets the minimum 4.5:1 contrast requirement using a formal WCAG auditing tool.
- [ ] Validate that copying the redacted image writes clean binary PNG data back onto the system clipboard container, allowing single-tap pasting directly into platforms like Slack or Discord.
- [ ] Check that keyboard layout navigation safely isolates focus rings around buttons without skipping functional DOM interactive components.