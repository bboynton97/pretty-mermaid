/**
 * Pretty Mermaid - Beautiful Mermaid Diagram Editor
 * Main JavaScript file
 */

// ========================================
// Configuration
// ========================================

const CONFIG = {
  DEBOUNCE_MS: 400,
  STORAGE_KEY_THEME: 'pretty-mermaid-theme',
  STORAGE_KEY_CODE: 'pretty-mermaid-code',
  TOAST_DURATION_MS: 2500,
};

const DEFAULT_DIAGRAM = `flowchart TD
    A[📦 Start Project] --> B{Choose Framework?}
    B -->|React| C[⚛️ Create React App]
    B -->|Vue| D[💚 Vue CLI]
    B -->|Vanilla| E[📝 Plain HTML/CSS/JS]
    
    C --> F[Install Dependencies]
    D --> F
    E --> G[Start Coding!]
    
    F --> H[Configure Build Tools]
    H --> G
    
    G --> I{Tests Passing?}
    I -->|Yes| J[🚀 Deploy!]
    I -->|No| K[🔧 Debug]
    K --> G
    
    J --> L[🎉 Success!]

    style A fill:#6366f1,stroke:#4f46e5,color:#fff
    style L fill:#10b981,stroke:#059669,color:#fff
    style K fill:#f59e0b,stroke:#d97706,color:#fff`;

// ========================================
// DOM Elements
// ========================================

const elements = {
  app: document.querySelector('.app'),
  editor: document.getElementById('editor'),
  preview: document.getElementById('preview'),
  mermaidContainer: document.querySelector('.mermaid'),
  themeSelect: document.getElementById('theme'),
  exportPng: document.getElementById('export-png'),
  exportSvg: document.getElementById('export-svg'),
  copySvg: document.getElementById('copy-svg'),
  errorDisplay: document.getElementById('error-display'),
  toast: document.getElementById('toast'),
};

// ========================================
// State
// ========================================

let currentDiagramId = 0;
let debounceTimer = null;

// ========================================
// Mermaid Configuration
// ========================================

function getMermaidConfig(theme) {
  // Map our themes to Mermaid's built-in themes
  const themeMap = {
    modern: 'default',
    minimal: 'neutral',
    dark: 'dark',
    pastel: 'default',
    corporate: 'default',
  };

  return {
    startOnLoad: false,
    theme: themeMap[theme] || 'default',
    securityLevel: 'loose',
    fontFamily: 'Inter, system-ui, sans-serif',
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      padding: 20,
      nodeSpacing: 50,
      rankSpacing: 50,
    },
    sequence: {
      diagramMarginX: 20,
      diagramMarginY: 20,
      actorMargin: 50,
      boxMargin: 10,
    },
  };
}

// ========================================
// Initialization
// ========================================

function init() {
  // Load saved theme
  const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEY_THEME) || 'modern';
  setTheme(savedTheme);
  elements.themeSelect.value = savedTheme;

  // Load saved code or use default
  const savedCode = localStorage.getItem(CONFIG.STORAGE_KEY_CODE);
  elements.editor.value = savedCode || DEFAULT_DIAGRAM;

  // Initialize Mermaid
  mermaid.initialize(getMermaidConfig(savedTheme));

  // Initial render
  renderDiagram();

  // Setup event listeners
  setupEventListeners();
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
  // Editor input with debouncing
  elements.editor.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      renderDiagram();
      saveCode();
    }, CONFIG.DEBOUNCE_MS);
  });

  // Theme change
  elements.themeSelect.addEventListener('change', (e) => {
    const theme = e.target.value;
    setTheme(theme);
    localStorage.setItem(CONFIG.STORAGE_KEY_THEME, theme);
    
    // Re-initialize mermaid with new theme and re-render
    mermaid.initialize(getMermaidConfig(theme));
    renderDiagram();
  });

  // Export buttons
  elements.exportPng.addEventListener('click', exportAsPng);
  elements.exportSvg.addEventListener('click', exportAsSvg);
  elements.copySvg.addEventListener('click', copySvgToClipboard);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to save (prevent default, we auto-save)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      showToast('Auto-saved!');
    }
    
    // Ctrl/Cmd + Shift + C to copy SVG
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      copySvgToClipboard();
    }
  });
}

// ========================================
// Theme Management
// ========================================

function setTheme(theme) {
  elements.app.setAttribute('data-theme', theme);
}

// ========================================
// Diagram Rendering
// ========================================

async function renderDiagram() {
  const code = elements.editor.value.trim();
  
  if (!code) {
    elements.mermaidContainer.innerHTML = '<p style="color: var(--text-muted);">Enter Mermaid code to see your diagram</p>';
    hideError();
    return;
  }

  try {
    // Validate the diagram syntax
    await mermaid.parse(code);
    hideError();

    // Generate unique ID for this render
    currentDiagramId++;
    const id = `mermaid-diagram-${currentDiagramId}`;

    // Render the diagram
    const { svg } = await mermaid.render(id, code);
    elements.mermaidContainer.innerHTML = svg;

    // Apply additional styling to the rendered SVG
    styleSvg();
  } catch (error) {
    showError(error.message || 'Invalid Mermaid syntax');
  }
}

function styleSvg() {
  const svg = elements.mermaidContainer.querySelector('svg');
  if (!svg) return;

  // Make SVG responsive
  svg.style.maxWidth = '100%';
  svg.style.height = 'auto';

  // Add rounded corners to nodes via inline styles (more reliable)
  svg.querySelectorAll('.node rect').forEach(rect => {
    rect.setAttribute('rx', '10');
    rect.setAttribute('ry', '10');
  });

  // Add subtle shadows (via filter if supported)
  const defs = svg.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  if (!svg.querySelector('defs')) {
    svg.insertBefore(defs, svg.firstChild);
  }

  // Add drop shadow filter
  if (!defs.querySelector('#pretty-shadow')) {
    defs.innerHTML += `
      <filter id="pretty-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.1"/>
      </filter>
    `;
  }

  // Apply shadow to nodes
  svg.querySelectorAll('.node').forEach(node => {
    node.style.filter = 'url(#pretty-shadow)';
  });
}

// ========================================
// Error Handling
// ========================================

function showError(message) {
  elements.errorDisplay.textContent = `⚠️ ${message}`;
  elements.errorDisplay.hidden = false;
}

function hideError() {
  elements.errorDisplay.hidden = true;
  elements.errorDisplay.textContent = '';
}

// ========================================
// Export Functions
// ========================================

function getSvgContent() {
  const svg = elements.mermaidContainer.querySelector('svg');
  if (!svg) {
    showToast('No diagram to export!');
    return null;
  }
  
  // Clone and prepare for export
  const clone = svg.cloneNode(true);
  
  // Add XML declaration and namespace
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  
  // Add background color based on theme
  const bgColor = getComputedStyle(elements.preview).getPropertyValue('--mermaid-bg').trim() || '#ffffff';
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '100%');
  rect.setAttribute('height', '100%');
  rect.setAttribute('fill', bgColor);
  clone.insertBefore(rect, clone.firstChild);
  
  return new XMLSerializer().serializeToString(clone);
}

async function exportAsPng() {
  const svgContent = getSvgContent();
  if (!svgContent) return;

  const svg = elements.mermaidContainer.querySelector('svg');
  const bbox = svg.getBBox();
  const width = bbox.width + 40;
  const height = bbox.height + 40;

  // Create canvas
  const canvas = document.createElement('canvas');
  const scale = 2; // Higher resolution
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Create image from SVG
  const img = new Image();
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  img.onload = () => {
    // Draw background
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--mermaid-bg').trim() || '#ffffff';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw SVG
    ctx.drawImage(img, 20, 20);
    
    // Download
    const link = document.createElement('a');
    link.download = 'diagram.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('PNG downloaded!');
  };

  img.onerror = () => {
    showToast('Failed to generate PNG');
    URL.revokeObjectURL(url);
  };

  img.src = url;
}

function exportAsSvg() {
  const svgContent = getSvgContent();
  if (!svgContent) return;

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.download = 'diagram.svg';
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
  showToast('SVG downloaded!');
}

async function copySvgToClipboard() {
  const svgContent = getSvgContent();
  if (!svgContent) return;

  try {
    await navigator.clipboard.writeText(svgContent);
    showToast('SVG copied to clipboard!');
  } catch (error) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = svgContent;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('SVG copied to clipboard!');
  }
}

// ========================================
// Storage
// ========================================

function saveCode() {
  localStorage.setItem(CONFIG.STORAGE_KEY_CODE, elements.editor.value);
}

// ========================================
// Toast Notifications
// ========================================

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  
  // Trigger reflow for animation
  elements.toast.offsetHeight;
  elements.toast.classList.add('show');
  
  setTimeout(() => {
    elements.toast.classList.remove('show');
    setTimeout(() => {
      elements.toast.hidden = true;
    }, 250);
  }, CONFIG.TOAST_DURATION_MS);
}

// ========================================
// Start the app
// ========================================

document.addEventListener('DOMContentLoaded', init);
