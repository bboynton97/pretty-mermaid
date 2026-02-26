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
  STORAGE_KEY_CUSTOM: 'pretty-mermaid-custom-theme',
  TOAST_DURATION_MS: 2500,
};

const PRESET_COLORS = {
  modern:    { primaryFill: '#6366f1', secondaryFill: '#f1f5f9', borderColor: '#c7d2fe', edgeColor: '#94a3b8', textColor: '#1e293b' },
  minimal:   { primaryFill: '#171717', secondaryFill: '#f5f5f5', borderColor: '#d4d4d4', edgeColor: '#737373', textColor: '#171717' },
  dark:      { primaryFill: '#818cf8', secondaryFill: '#334155', borderColor: '#64748b', edgeColor: '#94a3b8', textColor: '#f1f5f9' },
  pastel:    { primaryFill: '#f0abfc', secondaryFill: '#fbcfe8', borderColor: '#e879f9', edgeColor: '#c084fc', textColor: '#701a75' },
  corporate: { primaryFill: '#3182ce', secondaryFill: '#e2e8f0', borderColor: '#90cdf4', edgeColor: '#4a5568', textColor: '#1a365d' },
};

function getDefaultCustomTheme(preset) {
  const colors = PRESET_COLORS[preset] || PRESET_COLORS.modern;
  return {
    primaryFill: colors.primaryFill,
    secondaryFill: colors.secondaryFill,
    borderColor: colors.borderColor,
    edgeColor: colors.edgeColor,
    textColor: colors.textColor,
    borderRadius: 10,
    font: 'Inter, system-ui, sans-serif',
    nodeSpacing: 50,
    edgeStyle: 'basis',
  };
}

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
  exportPng: document.getElementById('export-png'),
  exportSvg: document.getElementById('export-svg'),
  copySvg: document.getElementById('copy-svg'),
  errorDisplay: document.getElementById('error-display'),
  toast: document.getElementById('toast'),
  // Theme panel
  toggleThemePanel: document.getElementById('toggle-theme-panel'),
  themePanel: document.getElementById('theme-panel'),
  closeThemePanel: document.getElementById('close-theme-panel'),
  themePreset: document.getElementById('theme-preset'),
  customPrimaryFill: document.getElementById('custom-primary-fill'),
  customSecondaryFill: document.getElementById('custom-secondary-fill'),
  customBorderColor: document.getElementById('custom-border-color'),
  customEdgeColor: document.getElementById('custom-edge-color'),
  customTextColor: document.getElementById('custom-text-color'),
  customBorderRadius: document.getElementById('custom-border-radius'),
  borderRadiusValue: document.getElementById('border-radius-value'),
  customFont: document.getElementById('custom-font'),
  customNodeSpacing: document.getElementById('custom-node-spacing'),
  nodeSpacingValue: document.getElementById('node-spacing-value'),
  customEdgeStyle: document.getElementById('custom-edge-style'),
  resetCustomTheme: document.getElementById('reset-custom-theme'),
  // Zoom controls
  zoomIn: document.getElementById('zoom-in'),
  zoomOut: document.getElementById('zoom-out'),
  zoomReset: document.getElementById('zoom-reset'),
  zoomLevel: document.getElementById('zoom-level'),
};

// ========================================
// State
// ========================================

let currentDiagramId = 0;
let debounceTimer = null;
let customTheme = null;

// Zoom & pan state
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;

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

  const ct = customTheme || getDefaultCustomTheme(theme);
  const spacing = ct.nodeSpacing;

  return {
    startOnLoad: false,
    theme: themeMap[theme] || 'default',
    securityLevel: 'loose',
    fontFamily: ct.font,
    flowchart: {
      htmlLabels: true,
      curve: ct.edgeStyle,
      padding: 20,
      nodeSpacing: spacing,
      rankSpacing: spacing,
    },
    sequence: {
      diagramMarginX: 20,
      diagramMarginY: 20,
      actorMargin: spacing,
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
  elements.themePreset.value = savedTheme;

  // Load saved custom overrides or init from preset
  const savedCustom = localStorage.getItem(CONFIG.STORAGE_KEY_CUSTOM);
  customTheme = savedCustom ? JSON.parse(savedCustom) : getDefaultCustomTheme(savedTheme);
  populatePanel(customTheme);

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

  // Theme panel toggle
  elements.toggleThemePanel.addEventListener('click', toggleThemePanel);
  elements.closeThemePanel.addEventListener('click', toggleThemePanel);

  // Preset theme change
  elements.themePreset.addEventListener('change', (e) => {
    const theme = e.target.value;
    setTheme(theme);
    localStorage.setItem(CONFIG.STORAGE_KEY_THEME, theme);
    // Reset custom overrides to match preset
    customTheme = getDefaultCustomTheme(theme);
    populatePanel(customTheme);
    saveCustomTheme();
    mermaid.initialize(getMermaidConfig(theme));
    renderDiagram();
  });

  // Color pickers
  const colorInputs = [
    { el: elements.customPrimaryFill, key: 'primaryFill' },
    { el: elements.customSecondaryFill, key: 'secondaryFill' },
    { el: elements.customBorderColor, key: 'borderColor' },
    { el: elements.customEdgeColor, key: 'edgeColor' },
    { el: elements.customTextColor, key: 'textColor' },
  ];
  colorInputs.forEach(({ el, key }) => {
    el.addEventListener('input', (e) => {
      customTheme[key] = e.target.value;
      applyCustomThemeAndRender();
    });
  });

  // Border radius slider
  elements.customBorderRadius.addEventListener('input', (e) => {
    customTheme.borderRadius = parseInt(e.target.value, 10);
    elements.borderRadiusValue.textContent = customTheme.borderRadius + 'px';
    applyCustomThemeAndRender();
  });

  // Font selector
  elements.customFont.addEventListener('change', (e) => {
    customTheme.font = e.target.value;
    applyCustomThemeAndRender();
  });

  // Node spacing slider
  elements.customNodeSpacing.addEventListener('input', (e) => {
    customTheme.nodeSpacing = parseInt(e.target.value, 10);
    elements.nodeSpacingValue.textContent = customTheme.nodeSpacing;
    applyCustomThemeAndRender();
  });

  // Edge style selector
  elements.customEdgeStyle.addEventListener('change', (e) => {
    customTheme.edgeStyle = e.target.value;
    applyCustomThemeAndRender();
  });

  // Reset button
  elements.resetCustomTheme.addEventListener('click', () => {
    const preset = elements.themePreset.value;
    customTheme = getDefaultCustomTheme(preset);
    populatePanel(customTheme);
    saveCustomTheme();
    mermaid.initialize(getMermaidConfig(preset));
    renderDiagram();
    showToast('Reset to preset defaults');
  });

  // Zoom controls
  elements.zoomIn.addEventListener('click', () => {
    zoomLevel = Math.min(zoomLevel * 1.25, 5);
    updateZoomTransform();
  });
  elements.zoomOut.addEventListener('click', () => {
    zoomLevel = Math.max(zoomLevel / 1.25, 0.1);
    updateZoomTransform();
  });
  elements.zoomReset.addEventListener('click', resetZoom);

  // Scroll-to-zoom on preview
  elements.preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoomLevel = Math.min(Math.max(zoomLevel * factor, 0.1), 5);
    updateZoomTransform();
  }, { passive: false });

  // Click-drag panning on preview
  elements.preview.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isPanning = true;
    panStartX = e.clientX - panX;
    panStartY = e.clientY - panY;
    elements.preview.classList.add('panning');
  });
  document.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = e.clientX - panStartX;
    panY = e.clientY - panStartY;
    updateZoomTransform();
  });
  document.addEventListener('mouseup', () => {
    if (!isPanning) return;
    isPanning = false;
    elements.preview.classList.remove('panning');
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

    // Escape to close theme panel
    if (e.key === 'Escape' && elements.themePanel.classList.contains('open')) {
      toggleThemePanel();
    }
  });
}

// ========================================
// Theme Management
// ========================================

function setTheme(theme) {
  elements.app.setAttribute('data-theme', theme);
}

function toggleThemePanel() {
  const isOpen = elements.themePanel.classList.toggle('open');
  elements.themePanel.hidden = false;
  elements.app.classList.toggle('panel-open', isOpen);
  if (!isOpen) {
    // Allow transition to finish before hiding
    setTimeout(() => {
      if (!elements.themePanel.classList.contains('open')) {
        elements.themePanel.hidden = true;
      }
    }, 300);
  }
}

function populatePanel(ct) {
  elements.customPrimaryFill.value = ct.primaryFill;
  elements.customSecondaryFill.value = ct.secondaryFill;
  elements.customBorderColor.value = ct.borderColor;
  elements.customEdgeColor.value = ct.edgeColor;
  elements.customTextColor.value = ct.textColor;
  elements.customBorderRadius.value = ct.borderRadius;
  elements.borderRadiusValue.textContent = ct.borderRadius + 'px';
  elements.customFont.value = ct.font;
  elements.customNodeSpacing.value = ct.nodeSpacing;
  elements.nodeSpacingValue.textContent = ct.nodeSpacing;
  elements.customEdgeStyle.value = ct.edgeStyle;
}

function saveCustomTheme() {
  localStorage.setItem(CONFIG.STORAGE_KEY_CUSTOM, JSON.stringify(customTheme));
}

function applyCustomThemeAndRender() {
  saveCustomTheme();
  const theme = elements.themePreset.value;
  mermaid.initialize(getMermaidConfig(theme));
  renderDiagram();
}

// ========================================
// Zoom & Pan
// ========================================

function updateZoomTransform() {
  elements.mermaidContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
  elements.zoomLevel.textContent = Math.round(zoomLevel * 100) + '%';
}

function resetZoom() {
  zoomLevel = 1;
  panX = 0;
  panY = 0;
  updateZoomTransform();
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

    // Reapply current zoom/pan transform
    updateZoomTransform();
  } catch (error) {
    showError(error.message || 'Invalid Mermaid syntax');
  }
}

function styleSvg() {
  const svg = elements.mermaidContainer.querySelector('svg');
  if (!svg) return;

  const ct = customTheme || getDefaultCustomTheme('modern');
  const r = ct.borderRadius;

  // Make SVG responsive
  svg.style.maxWidth = '100%';
  svg.style.height = 'auto';

  // Apply custom border radius to nodes
  svg.querySelectorAll('.node rect').forEach(rect => {
    rect.setAttribute('rx', String(r));
    rect.setAttribute('ry', String(r));
  });

  // Apply custom colors to nodes
  svg.querySelectorAll('.node rect, .node circle, .node ellipse, .node polygon').forEach(shape => {
    shape.setAttribute('stroke', ct.borderColor);
  });

  // Default/secondary node fills
  svg.querySelectorAll('.node.default > rect, .node.default > polygon').forEach(shape => {
    shape.setAttribute('fill', ct.secondaryFill);
  });

  // Labels / text
  svg.querySelectorAll('.nodeLabel, .label, .edgeLabel span').forEach(label => {
    label.style.color = ct.textColor;
  });
  svg.querySelectorAll('text').forEach(t => {
    t.setAttribute('fill', ct.textColor);
  });

  // Edges
  svg.querySelectorAll('.edgePath .path, .flowchart-link').forEach(path => {
    path.setAttribute('stroke', ct.edgeColor);
  });

  // Arrowheads
  svg.querySelectorAll('marker path, .marker').forEach(m => {
    m.setAttribute('fill', ct.edgeColor);
    m.setAttribute('stroke', ct.edgeColor);
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
