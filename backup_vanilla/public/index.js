/* ==========================================================================
   MAX AI - CLIENT STATE MANAGEMENT
   ========================================================================== */

const state = {
  activeModel: 'grok', // 'grok' | 'veo' | 'gpt-image'
  uploadedFiles: [],   // Array of { file: File, base64: string }
  sessions: [],        // Array of chat sessions
  activeSessionId: null, // Current active session ID
  profile: {
    name: 'Alex Silva',
    email: 'alex.silva@maxai.com',
    plan: 'VIP Max Pro',
    nextBilling: '17 de Julho de 2026',
    creditLimit: 1000,
    creditUsed: 120,
    useMock: true
  },
  modelSettings: {
    grok: {
      resolution: '480p',
      aspect_ratio: 'landscape',
      duration: '6',
      mode: 'custom'
    },
    veo: {
      model: 'veo-3.1',
      resolution: '720p',
      duration: '8',
      aspect_ratio: '16:9',
      mode_image: 'frame'
    },
    'gpt-image': {
      model: 'gpt-image-2-text-to-image',
      aspect_ratio: 'auto'
    }
  },
  activeExtendRef: null, // Stores { uuid: string, model: string } for video extension
  cameraStream: null
};

// Client-side mock tasks storage (used in file:// mode or forced mock mode)
const localMockTasks = {};

// Curated stock content for simulation outputs
const mockContent = {
  video: [
    {
      keywords: ['city', 'cyberpunk', 'futuristic', 'neon', 'car', 'flying'],
      url: 'https://cdn.pixabay.com/video/2021/04/17/71360-539606822_large.mp4',
      title: 'Futuristic Cyberpunk City'
    },
    {
      keywords: ['nature', 'sunset', 'lake', 'mountain', 'serene', 'calm', 'water'],
      url: 'https://cdn.pixabay.com/video/2020/09/24/51048-463870876_large.mp4',
      title: 'Serene Sunset Mountain Lake'
    },
    {
      keywords: ['space', 'cosmic', 'portal', 'galaxy', 'universe', 'star'],
      url: 'https://cdn.pixabay.com/video/2021/10/11/91629-617865249_large.mp4',
      title: 'Cosmic Starfield'
    },
    {
      keywords: ['abstract', 'color', 'fluid', 'animation', 'art'],
      url: 'https://cdn.pixabay.com/video/2020/09/21/50821-463286082_large.mp4',
      title: 'Abstract Fluid Motion'
    }
  ],
  image: [
    {
      keywords: ['city', 'cyberpunk', 'futuristic', 'neon', 'car', 'flying'],
      url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      title: 'Cyberpunk Neon Street'
    },
    {
      keywords: ['nature', 'sunset', 'lake', 'mountain', 'serene', 'calm', 'water'],
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      title: 'Tropical Sunset Beach'
    },
    {
      keywords: ['space', 'cosmic', 'portal', 'galaxy', 'universe', 'star'],
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
      title: 'Cosmic Galaxy'
    },
    {
      keywords: ['abstract', 'color', 'fluid', 'animation', 'art'],
      url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80',
      title: 'Vibrant Abstract Color'
    }
  ]
};

// Select mock item based on prompt keywords matching
function getMockMediaUrl(type, prompt) {
  const list = mockContent[type];
  const lowerPrompt = (prompt || '').toLowerCase();
  for (const item of list) {
    if (item.keywords.some(keyword => lowerPrompt.includes(keyword))) {
      return item.url;
    }
  }
  // Default fallbacks
  return type === 'video' 
    ? 'https://cdn.pixabay.com/video/2021/04/17/71360-539606822_large.mp4' 
    : 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80';
}

// DOM Elements cache
const DOM = {
  sidebar: document.getElementById('sidebar'),
  sidebarToggle: document.getElementById('sidebar-toggle-btn'),
  closeSidebar: document.getElementById('close-sidebar-btn'),
  newChatBtn: document.getElementById('new-chat-btn'),
  galleryBtn: document.getElementById('gallery-btn'),
  galleryContainer: document.getElementById('gallery-container'),
  galleryGrid: document.getElementById('gallery-grid'),
  galleryLoading: document.getElementById('gallery-loading'),
  galleryEmpty: document.getElementById('gallery-empty'),
  historyList: document.getElementById('history-list'),
  sidebarProfile: document.getElementById('sidebar-profile-btn'),
  profileNameDisplay: document.getElementById('profile-name-display'),
  profilePlanDisplay: document.getElementById('profile-plan-display'),
  
  // Header
  activeModelBadge: document.getElementById('active-model-badge'),
  activeModelText: document.getElementById('active-model-text'),
  settingsQuickBtn: document.getElementById('settings-quick-btn'),
  
  // Chat spaces
  chatArea: document.getElementById('chat-area'),
  welcomeContainer: document.getElementById('welcome-container'),
  messagesList: document.getElementById('messages-list'),
  
  // Input section
  paramsSummaryBar: document.getElementById('params-summary-bar'),
  paramsSummaryText: document.getElementById('params-summary-text'),
  paramsEditBtn: document.getElementById('params-edit-btn'),
  attachmentPreviewRow: document.getElementById('attachment-preview-row'),
  plusMenuBtn: document.getElementById('plus-menu-btn'),
  plusPopover: document.getElementById('plus-popover'),
  promptInput: document.getElementById('prompt-input'),
  sendBtn: document.getElementById('send-btn'),
  fileUploader: document.getElementById('file-uploader'),
  
  // Modals
  profileModal: document.getElementById('profile-modal'),
  profileModalClose: document.getElementById('profile-modal-close'),
  profileModalSave: document.getElementById('profile-modal-save'),
  profileModalCancel: document.getElementById('profile-modal-cancel'),
  profileModalLogout: document.getElementById('profile-modal-logout'),
  profileNameInput: document.getElementById('profile-name-input'),
  profileEmailInput: document.getElementById('profile-email-input'),
  mockToggle: document.getElementById('mock-toggle'),
  profileModalPlan: document.getElementById('profile-modal-plan'),
  profileModalBilling: document.getElementById('profile-modal-billing'),
  profileModalPayment: document.getElementById('profile-modal-payment'),
  profileModalCredits: document.getElementById('profile-modal-credits'),
  profileModalCreditsBar: document.getElementById('profile-modal-credits-bar'),
  
  paramsModal: document.getElementById('params-modal'),
  paramsModalTitle: document.getElementById('params-modal-title'),
  paramsModalClose: document.getElementById('params-modal-close'),
  paramsModalSave: document.getElementById('params-modal-save'),
  paramsGrokPanel: document.getElementById('params-panel-grok'),
  paramsVeoPanel: document.getElementById('params-panel-veo'),
  paramsGptPanel: document.getElementById('params-panel-gpt-image'),
  
  cameraModal: document.getElementById('camera-modal'),
  cameraModalClose: document.getElementById('camera-modal-close'),
  cameraModalCancel: document.getElementById('camera-modal-cancel'),
  cameraModalCapture: document.getElementById('camera-modal-capture'),
  cameraStream: document.getElementById('camera-stream'),
  cameraCanvas: document.getElementById('camera-canvas'),
  
  lightbox: document.getElementById('lightbox'),
  lightboxClose: document.getElementById('lightbox-close'),
  lightboxImg: document.getElementById('lightbox-img'),
  lightboxDownload: document.getElementById('lightbox-download')
};

/* ==========================================================================
   INITIALIZATION & BOOTSTRAP
   ========================================================================== */

/* ==========================================================================
   AUTHENTICATION WORKFLOW & SESSION HEADERS
   ========================================================================== */

function getAuthHeaders() {
  const token = localStorage.getItem('max_ai_session_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function checkAuthState() {
  const token = localStorage.getItem('max_ai_session_token');
  const isDemo = localStorage.getItem('max_ai_demo_mode') === 'true';

  const authContainer = document.getElementById('auth-container');
  const appContainer = document.getElementById('app-container');

  if (token || isDemo) {
    authContainer.style.display = 'none';
    appContainer.style.display = 'flex';
    return true;
  } else {
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
    return false;
  }
}

function setupAuthEvents() {
  const tabLogin = document.getElementById('tab-login-btn');
  const tabRegister = document.getElementById('tab-register-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const demoBtn = document.getElementById('auth-demo-btn');
  const errorBadge = document.getElementById('auth-error-badge');
  const errorMessage = document.getElementById('auth-error-message');

  // Tab switching
  tabLogin.onclick = () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
    errorBadge.style.display = 'none';
  };

  tabRegister.onclick = () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.style.display = 'flex';
    loginForm.style.display = 'none';
    errorBadge.style.display = 'none';
  };

  // Demo mode
  demoBtn.onclick = () => {
    localStorage.setItem('max_ai_demo_mode', 'true');
    localStorage.removeItem('max_ai_session_token');
    checkAuthState();
    bootstrapApp();
  };

  // Login submit
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    errorBadge.style.display = 'none';
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const submitBtn = document.getElementById('login-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha no login');
      }

      if (data.session && data.session.access_token) {
        localStorage.setItem('max_ai_session_token', data.session.access_token);
        localStorage.removeItem('max_ai_demo_mode');
        checkAuthState();
        await bootstrapApp();
      } else {
        throw new Error('Sessão não retornada pelo servidor.');
      }
    } catch (err) {
      errorMessage.textContent = err.message;
      errorBadge.style.display = 'flex';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
    }
  };

  // Register submit
  registerForm.onsubmit = async (e) => {
    e.preventDefault();
    errorBadge.style.display = 'none';
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    const submitBtn = document.getElementById('register-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando conta...';

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha no cadastro');
      }

      if (data.session && data.session.access_token) {
        localStorage.setItem('max_ai_session_token', data.session.access_token);
        localStorage.removeItem('max_ai_demo_mode');
        checkAuthState();
        await bootstrapApp();
      } else {
        alert('Cadastro realizado com sucesso! Faça login para continuar.');
        tabLogin.click();
        document.getElementById('login-email').value = email;
        document.getElementById('login-password').focus();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar Conta';
      }
    } catch (err) {
      errorMessage.textContent = err.message;
      errorBadge.style.display = 'flex';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Criar Conta';
    }
  };
}

async function bootstrapApp() {
  // Load data from backend
  await fetchProfile();
  await fetchHistory();
  
  // Register all DOM events
  registerEvents();
  
  // Set initial model settings display
  updateActiveModelUI();
  
  // Refresh Lucide icons initially
  lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', async () => {
  setupAuthEvents();

  if (checkAuthState()) {
    await bootstrapApp();
  } else {
    // Render Lucide icons for auth screen
    lucide.createIcons();
  }
});

/* ==========================================================================
   BACKEND CLIENT COMMUNICATOR WITH LOCAL FALLBACKS
   ========================================================================== */

function isLocalFileMode() {
  return window.location.protocol === 'file:';
}

async function fetchProfile() {
  if (isLocalFileMode()) {
    loadProfileLocal();
    return;
  }
  try {
    const res = await fetch('/api/profile', {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      state.profile = await res.json();
      // Ensure local state represents mock toggle state correctly
      if (state.profile.useMock === undefined) {
        state.profile.useMock = localStorage.getItem('max_ai_session_token') ? false : true;
      }
      updateProfileUI();
    } else {
      loadProfileLocal();
    }
  } catch (e) {
    loadProfileLocal();
  }
}

function loadProfileLocal() {
  const local = localStorage.getItem('max_ai_profile');
  if (local) {
    state.profile = JSON.parse(local);
  } else {
    state.profile = {
      name: 'Alex Silva',
      email: 'alex.silva@maxai.com',
      plan: 'VIP Max Pro',
      nextBilling: '17 de Julho de 2026',
      creditLimit: 1000,
      creditUsed: 120,
      useMock: true
    };
  }
  updateProfileUI();
}

async function fetchHistory() {
  if (isLocalFileMode()) {
    loadHistoryLocal();
    return;
  }
  try {
    const res = await fetch('/api/history', {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      state.sessions = await res.json();
      renderHistoryList();
    } else {
      loadHistoryLocal();
    }
  } catch (e) {
    loadHistoryLocal();
  }
}

function loadHistoryLocal() {
  const local = localStorage.getItem('max_ai_history');
  if (local) {
    state.sessions = JSON.parse(local);
  } else {
    state.sessions = [];
  }
  renderHistoryList();
}

async function saveHistoryToBackend() {
  if (isLocalFileMode()) {
    saveHistoryLocal();
    return;
  }
  try {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(state.sessions)
    });
    if (!res.ok) {
      saveHistoryLocal();
    }
  } catch (e) {
    saveHistoryLocal();
  }
}

function saveHistoryLocal() {
  localStorage.setItem('max_ai_history', JSON.stringify(state.sessions));
}

async function saveProfileToBackend() {
  if (isLocalFileMode()) {
    saveProfileLocal();
    return;
  }
  try {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(state.profile)
    });
    if (res.ok) {
      state.profile = await res.json();
      updateProfileUI();
    } else {
      saveProfileLocal();
    }
  } catch (e) {
    saveProfileLocal();
  }
}

function saveProfileLocal() {
  localStorage.setItem('max_ai_profile', JSON.stringify(state.profile));
  updateProfileUI();
}

/* ==========================================================================
   UI DISPLAY UPDATES
   ========================================================================== */

function updateProfileUI() {
  DOM.profileNameDisplay.textContent = state.profile.name;
  DOM.profilePlanDisplay.textContent = state.profile.plan;
  
  // Update inputs inside profile modal
  DOM.profileNameInput.value = state.profile.name;
  DOM.profileEmailInput.value = state.profile.email;
  DOM.mockToggle.checked = state.profile.useMock;
  DOM.profileModalPlan.textContent = state.profile.plan;
  DOM.profileModalBilling.textContent = state.profile.nextBilling;
  DOM.profileModalPayment.textContent = state.profile.paymentMethod || 'Cartão de Crédito';
  
  const creditsText = `${state.profile.creditUsed} / ${state.profile.creditLimit} créditos`;
  DOM.profileModalCredits.textContent = creditsText;
  
  const percentage = (state.profile.creditUsed / state.profile.creditLimit) * 100;
  DOM.profileModalCreditsBar.style.width = `${percentage}%`;
}

function updateActiveModelUI() {
  // Update badges
  DOM.activeModelBadge.className = `active-model-badge ${state.activeModel}`;
  
  let modelLabel = 'Grok - Vídeo';
  let badgeIcon = 'video';
  
  if (state.activeModel === 'veo') {
    modelLabel = 'Veo 3 - Vídeo';
    badgeIcon = 'sparkles';
  } else if (state.activeModel === 'gpt-image') {
    modelLabel = 'GPT - Imagem';
    badgeIcon = 'image';
  }
  
  DOM.activeModelText.textContent = modelLabel;
  DOM.activeModelBadge.querySelector('.badge-icon').setAttribute('data-lucide', badgeIcon);
  
  // Update input placeholder text
  let inputPlaceholder = 'Mensagem para o MAX (Grok Vídeo)...';
  if (state.activeModel === 'veo') inputPlaceholder = 'Descreva o vídeo que você quer gerar com Veo 3...';
  if (state.activeModel === 'gpt-image') inputPlaceholder = 'Descreva a imagem que deseja criar com GPT Image...';
  DOM.promptInput.placeholder = inputPlaceholder;

  // Render parameter summary text
  let summary = '';
  if (state.activeModel === 'grok') {
    const s = state.modelSettings.grok;
    summary = `Grok-3 • ${s.resolution} • ${s.duration}s • Proporção: ${s.aspect_ratio}`;
  } else if (state.activeModel === 'veo') {
    const s = state.modelSettings.veo;
    summary = `${s.model} • ${s.resolution} • ${s.duration}s • Proporção: ${s.aspect_ratio}`;
  } else {
    const s = state.modelSettings['gpt-image'];
    const mLabel = s.model === 'gpt-image-2-text-to-image' ? 'GPT Image 2' : 'GPT Image 1.5';
    summary = `${mLabel} • Proporção: ${s.aspect_ratio}`;
  }

  // Handle visual extension summary override
  if (state.activeExtendRef) {
    summary += ` | ESTENDENDO VÍDEO (${state.activeExtendRef.uuid.substring(0,8)})`;
  }
  
  DOM.paramsSummaryText.textContent = summary;
  lucide.createIcons();
}

/* ==========================================================================
   EVENT HANDLERS & REGISTRATION
   ========================================================================== */

function registerEvents() {
  // Sidebar actions
  DOM.sidebarToggle.addEventListener('click', () => DOM.sidebar.classList.add('active'));
  DOM.closeSidebar.addEventListener('click', () => DOM.sidebar.classList.remove('active'));
  
  // Click outside sidebar on mobile closes it
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 1024) {
      if (!DOM.sidebar.contains(e.target) && !DOM.sidebarToggle.contains(e.target) && DOM.sidebar.classList.contains('active')) {
        DOM.sidebar.classList.remove('active');
      }
    }
  });

  // Settings Quick Trigger
  DOM.settingsQuickBtn.addEventListener('click', openParamsModal);
  DOM.paramsEditBtn.addEventListener('click', openParamsModal);
  DOM.paramsModalClose.addEventListener('click', () => DOM.paramsModal.classList.remove('active'));
  DOM.paramsModalSave.addEventListener('click', saveParamsSettings);

  // New Chat session
  DOM.newChatBtn.addEventListener('click', () => {
    startNewChatSession();
    if (window.innerWidth < 1024) DOM.sidebar.classList.remove('active');
  });

  // Gallery button
  DOM.galleryBtn.addEventListener('click', () => {
    openGallery();
    if (window.innerWidth < 1024) DOM.sidebar.classList.remove('active');
  });

  // Gallery start creating button
  const galleryStartBtn = document.getElementById('gallery-start-btn');
  if (galleryStartBtn) {
    galleryStartBtn.addEventListener('click', () => {
      closeGallery();
    });
  }

  // Gallery filter buttons
  const galleryFilterBtns = document.querySelectorAll('.gallery-filter-btn');
  galleryFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      galleryFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      filterGallery(filter);
    });
  });

  // Profile modal toggles
  DOM.sidebarProfile.addEventListener('click', () => {
    DOM.profileModal.classList.add('active');
  });
  DOM.profileModalClose.addEventListener('click', () => DOM.profileModal.classList.remove('active'));
  DOM.profileModalCancel.addEventListener('click', () => DOM.profileModal.classList.remove('active'));
  DOM.sidebarProfile.addEventListener('click', () => {
    DOM.profileModal.classList.add('active');
  });
  DOM.profileModalSave.addEventListener('click', saveProfileSettings);
  DOM.profileModalLogout.addEventListener('click', () => {
    localStorage.removeItem('max_ai_session_token');
    localStorage.removeItem('max_ai_demo_mode');
    window.location.reload();
  });

  // Plus Action Dropdown Trigger
  DOM.plusMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    DOM.plusPopover.classList.toggle('active');
  });

  document.addEventListener('click', () => {
    DOM.plusPopover.classList.remove('active');
  });

  DOM.plusPopover.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Select Model inside plus popover
  const popoverItems = DOM.plusPopover.querySelectorAll('[data-action="select-model"]');
  popoverItems.forEach(item => {
    item.addEventListener('click', () => {
      const selectedModel = item.getAttribute('data-model');
      changeModel(selectedModel);
      DOM.plusPopover.classList.remove('active');
    });
  });

  // Select suggestion cards
  const suggestionCards = document.querySelectorAll('.suggestion-card');
  suggestionCards.forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      const model = card.getAttribute('data-model');
      
      changeModel(model);
      DOM.promptInput.value = prompt;
      autoResizePromptInput();
      DOM.sendBtn.disabled = false;
      DOM.promptInput.focus();
    });
  });

  // Media Attachment trigger
  DOM.plusPopover.querySelector('[data-action="upload-image"]').addEventListener('click', () => {
    DOM.fileUploader.click();
    DOM.plusPopover.classList.remove('active');
  });

  DOM.fileUploader.addEventListener('change', handleFileUpload);

  // Camera Capture trigger
  DOM.plusPopover.querySelector('[data-action="open-camera"]').addEventListener('click', () => {
    openCameraModal();
    DOM.plusPopover.classList.remove('active');
  });

  DOM.cameraModalClose.addEventListener('click', closeCameraModal);
  DOM.cameraModalCancel.addEventListener('click', closeCameraModal);
  DOM.cameraModalCapture.addEventListener('click', captureCameraPhoto);

  // Textarea resizing & enter to send
  DOM.promptInput.addEventListener('input', () => {
    autoResizePromptInput();
    DOM.sendBtn.disabled = DOM.promptInput.value.trim() === '';
  });

  DOM.promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (DOM.promptInput.value.trim() !== '') {
        submitPromptMessage();
      }
    }
  });

  // Send action
  DOM.sendBtn.addEventListener('click', submitPromptMessage);

  // Lightbox Close
  DOM.lightboxClose.addEventListener('click', () => DOM.lightbox.classList.remove('active'));
  DOM.lightbox.addEventListener('click', (e) => {
    if (e.target === DOM.lightbox) DOM.lightbox.classList.remove('active');
  });

  // Veo model options changes (resolutions etc constraints)
  const veoModelSelect = document.getElementById('veo-model');
  veoModelSelect.addEventListener('change', handleVeoModelConstraints);
}

/* ==========================================================================
   MODEL CONFIGURATIONS WIDGETS LOGIC
   ========================================================================== */

function openParamsModal() {
  DOM.paramsModal.classList.add('active');
  
  // Hide all panels
  DOM.paramsGrokPanel.style.display = 'none';
  DOM.paramsVeoPanel.style.display = 'none';
  DOM.paramsGptPanel.style.display = 'none';
  
  // Show active model configurations panel
  if (state.activeModel === 'grok') {
    DOM.paramsModalTitle.textContent = 'Configurações: Grok Vídeo';
    DOM.paramsGrokPanel.style.display = 'block';
    setupPillsSelection('grok-resolution', state.modelSettings.grok.resolution);
    setupPillsSelection('grok-aspect', state.modelSettings.grok.aspect_ratio);
    setupPillsSelection('grok-duration', state.modelSettings.grok.duration);
    setupPillsSelection('grok-mode', state.modelSettings.grok.mode);
  } else if (state.activeModel === 'veo') {
    DOM.paramsModalTitle.textContent = 'Configurações: Veo 3 Vídeo';
    DOM.paramsVeoPanel.style.display = 'block';
    document.getElementById('veo-model').value = state.modelSettings.veo.model;
    handleVeoModelConstraints(); // Update limits on duration/resolution/aspect
  } else {
    DOM.paramsModalTitle.textContent = 'Configurações: GPT Imagem';
    DOM.paramsGptPanel.style.display = 'block';
    document.getElementById('gpt-model').value = state.modelSettings['gpt-image'].model;
    setupPillsSelection('gpt-aspect', state.modelSettings['gpt-image'].aspect_ratio);
  }
}

// Utility to highlight active parameter pills
function setupPillsSelection(containerId, value) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const buttons = container.querySelectorAll('.pill-btn');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-val') === value.toString());
    btn.onclick = () => {
      container.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });
}

function handleVeoModelConstraints() {
  const model = document.getElementById('veo-model').value;
  const res1080 = document.getElementById('veo-res-1080');
  const dur10 = document.getElementById('veo-dur-10');
  const aspect916 = document.getElementById('veo-aspect-916');
  
  const resHelper = document.getElementById('veo-res-helper');
  const durHelper = document.getElementById('veo-dur-helper');
  const aspectHelper = document.getElementById('veo-aspect-helper');
  
  // Set defaults initially
  res1080.style.display = 'inline-block';
  dur10.style.display = 'none';
  aspect916.style.display = 'none';
  
  resHelper.style.display = 'none';
  durHelper.textContent = '';
  aspectHelper.textContent = '';
  
  let activeRes = state.modelSettings.veo.resolution;
  let activeDur = state.modelSettings.veo.duration;
  let activeAspect = state.modelSettings.veo.aspect_ratio;
  
  if (model === 'veo-3.1' || model === 'veo-3.1-fast' || model === 'veo-3.1-lite') {
    durHelper.textContent = 'Nota: Veo 3.1 tem duração fixa de 8s.';
    aspectHelper.textContent = 'Nota: Veo 3.1 suporta apenas proporção 16:9.';
    activeDur = '8';
    activeAspect = '16:9';
  } else if (model === 'veo-2') {
    res1080.style.display = 'none'; // Only 720p
    aspect916.style.display = 'inline-block'; // Supports portrait 9:16
    resHelper.style.display = 'block';
    resHelper.textContent = 'Nota: Veo 2 suporta apenas resolução 720p.';
    activeRes = '720p';
    activeDur = '8'; // Veo 2 has fixed duration 8s in geminigen
  } else if (model === 'omni-flash') {
    dur10.style.display = 'inline-block';
    aspect916.style.display = 'inline-block';
    durHelper.textContent = 'Omni Flash suporta 10s.';
  }
  
  // Setup selectors
  setupPillsSelection('veo-resolution', activeRes);
  setupPillsSelection('veo-duration', activeDur);
  setupPillsSelection('veo-aspect', activeAspect);
  setupPillsSelection('veo-mode-image', state.modelSettings.veo.mode_image);
}

function saveParamsSettings() {
  if (state.activeModel === 'grok') {
    state.modelSettings.grok.resolution = DOM.paramsGrokPanel.querySelector('#grok-resolution .active').getAttribute('data-val');
    state.modelSettings.grok.aspect_ratio = DOM.paramsGrokPanel.querySelector('#grok-aspect .active').getAttribute('data-val');
    state.modelSettings.grok.duration = DOM.paramsGrokPanel.querySelector('#grok-duration .active').getAttribute('data-val');
    state.modelSettings.grok.mode = DOM.paramsGrokPanel.querySelector('#grok-mode .active').getAttribute('data-val');
  } else if (state.activeModel === 'veo') {
    state.modelSettings.veo.model = document.getElementById('veo-model').value;
    state.modelSettings.veo.resolution = DOM.paramsVeoPanel.querySelector('#veo-resolution .active').getAttribute('data-val');
    state.modelSettings.veo.duration = DOM.paramsVeoPanel.querySelector('#veo-duration .active').getAttribute('data-val');
    state.modelSettings.veo.aspect_ratio = DOM.paramsVeoPanel.querySelector('#veo-aspect .active').getAttribute('data-val');
    state.modelSettings.veo.mode_image = DOM.paramsVeoPanel.querySelector('#veo-mode-image .active').getAttribute('data-val');
  } else {
    state.modelSettings['gpt-image'].model = document.getElementById('gpt-model').value;
    state.modelSettings['gpt-image'].aspect_ratio = DOM.paramsGptPanel.querySelector('#gpt-aspect .active').getAttribute('data-val');
  }
  
  updateActiveModelUI();
  DOM.paramsModal.classList.remove('active');
}

function saveProfileSettings() {
  state.profile.name = DOM.profileNameInput.value.trim() || state.profile.name;
  state.profile.email = DOM.profileEmailInput.value.trim() || state.profile.email;
  state.profile.useMock = DOM.mockToggle.checked;
  
  saveProfileToBackend();
  DOM.profileModal.classList.remove('active');
}

/* ==========================================================================
   MODEL SELECTION WIDGETS
   ========================================================================== */

function changeModel(model) {
  state.activeModel = model;
  
  // Highlight active selector in popover
  const popoverItems = DOM.plusPopover.querySelectorAll('[data-action="select-model"]');
  popoverItems.forEach(item => {
    const itemModel = item.getAttribute('data-model');
    item.classList.toggle('active', itemModel === model);
  });
  
  updateActiveModelUI();
}

/* ==========================================================================
   MEDIA INPUTS (UPLOAD & CAMERA)
   ========================================================================== */

function handleFileUpload(e) {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (event) => {
      addUploadedFile(file, event.target.result);
    };
    reader.readAsDataURL(file);
  });
  DOM.fileUploader.value = ''; // Clear input for next selection
}

function addUploadedFile(file, dataUrl) {
  state.uploadedFiles.push({ file, base64: dataUrl });
  renderUploadedPreviews();
}

function removeUploadedFile(index) {
  state.uploadedFiles.splice(index, 1);
  renderUploadedPreviews();
}

// Camera capturing functions
async function openCameraModal() {
  DOM.cameraModal.classList.add('active');
  try {
    state.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false
    });
    DOM.cameraStream.srcObject = state.cameraStream;
  } catch (e) {
    console.error('Camera access failed:', e);
    alert('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    DOM.cameraModal.classList.remove('active');
  }
}

function closeCameraModal() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
  }
  DOM.cameraStream.srcObject = null;
  DOM.cameraModal.classList.remove('active');
}

function captureCameraPhoto() {
  if (!state.cameraStream) return;
  
  const video = DOM.cameraStream;
  const canvas = DOM.cameraCanvas;
  const ctx = canvas.getContext('2d');
  
  // Set canvas dimension based on feed aspect
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  
  // Draw current frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Convert frame to data URL
  const dataUrl = canvas.toDataURL('image/jpeg');
  
  // Create File object
  fetch(dataUrl)
    .then(res => res.blob())
    .then(blob => {
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      addUploadedFile(file, dataUrl);
    });
    
  closeCameraModal();
}

/* ==========================================================================
   CHAT SESSION SYSTEM (HISTORY MANAGEMENT)
   ========================================================================== */

function startNewChatSession() {
  state.activeSessionId = null;
  state.activeExtendRef = null; // Clear extend context
  
  DOM.welcomeContainer.style.display = 'flex';
  DOM.messagesList.style.display = 'none';
  DOM.messagesList.innerHTML = '';
  
  // Unselect active history sidebar items
  const items = DOM.historyList.querySelectorAll('.history-item');
  items.forEach(i => i.classList.remove('active'));
  
  updateActiveModelUI();
}

function loadSession(sessionId) {
  state.activeSessionId = sessionId;
  state.activeExtendRef = null; // Clear extend reference when shifting
  
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session) return;
  
  // Set current selected model based on last message or default
  if (session.messages.length > 0) {
    const lastAI = [...session.messages].reverse().find(m => m.role === 'assistant');
    if (lastAI) {
      if (lastAI.mediaType === 'image') changeModel('gpt-image');
      else {
        // Decide if it was grok or veo based on text or model name
        if (lastAI.text.includes('Veo') || (lastAI.modelName && lastAI.modelName.includes('veo'))) changeModel('veo');
        else changeModel('grok');
      }
    }
  }

  DOM.welcomeContainer.style.display = 'none';
  DOM.messagesList.style.display = 'flex';
  DOM.messagesList.innerHTML = '';
  
  session.messages.forEach(msg => {
    appendMessageHTML(msg);
    // Restart polling if session was loaded while generating
    if (msg.status === 'generating') {
      if (msg.taskId && msg.taskId.startsWith('local-mock-')) {
        pollLocalMockTask(msg.mediaType, msg.taskId, msg.id);
      } else if (msg.uuid && msg.uuid.startsWith('local-mock-')) {
        pollLocalMockTask(msg.mediaType, msg.uuid, msg.id);
      } else {
        pollTaskStatus(msg.mediaType, msg.taskId || msg.uuid, msg.id);
      }
    }
  });
  
  // Highlight in sidebar
  const items = DOM.historyList.querySelectorAll('.history-item');
  items.forEach(i => {
    const isCurrent = i.getAttribute('data-id') === sessionId.toString();
    i.classList.toggle('active', isCurrent);
  });
  
  // Scroll to bottom
  DOM.chatArea.scrollTop = DOM.chatArea.scrollHeight;
  updateActiveModelUI();
}

function renderHistoryList() {
  if (state.sessions.length === 0) {
    DOM.historyList.innerHTML = '<div class="history-empty">Nenhuma conversa recente</div>';
    return;
  }
  
  DOM.historyList.innerHTML = state.sessions.map(s => {
    const icon = s.model === 'gpt-image' ? 'image' : 'video';
    const activeClass = s.id === state.activeSessionId ? 'active' : '';
    return `
      <div class="history-item ${activeClass}" data-id="${s.id}">
        <div class="history-title-wrapper" onclick="loadSession('${s.id}')">
          <i data-lucide="${icon}"></i>
          <span>${s.title}</span>
        </div>
        <button class="history-delete-btn" onclick="deleteSession(event, '${s.id}')">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    `;
  }).join('');
  
  lucide.createIcons();
}

function deleteSession(e, sessionId) {
  e.stopPropagation();
  state.sessions = state.sessions.filter(s => s.id !== sessionId);
  
  if (state.activeSessionId === sessionId) {
    startNewChatSession();
  }
  
  renderHistoryList();
  saveHistoryToBackend();
}

/* ==========================================================================
   PROMPT SUBMISSION & API PROXYING
   ========================================================================== */

async function submitPromptMessage() {
  const prompt = DOM.promptInput.value.trim();
  if (!prompt) return;
  
  // Setup Session if first message
  if (!state.activeSessionId) {
    const newSessionId = 'session-' + Date.now();
    const cleanTitle = prompt.length > 28 ? prompt.substring(0, 28) + '...' : prompt;
    const newSession = {
      id: newSessionId,
      title: cleanTitle,
      model: state.activeModel,
      messages: []
    };
    state.sessions.unshift(newSession);
    state.activeSessionId = newSessionId;
    renderHistoryList();
  }
  
  const currentSession = state.sessions.find(s => s.id === state.activeSessionId);
  
  // Save references list
  const userAttachments = state.uploadedFiles.map(f => f.base64);
  
  // Add User Message
  const userMsgId = 'msg-' + Date.now();
  const userMsg = {
    id: userMsgId,
    role: 'user',
    text: prompt,
    attachments: userAttachments
  };
  currentSession.messages.push(userMsg);
  appendMessageHTML(userMsg);
  
  // Clear input area immediately
  DOM.promptInput.value = '';
  autoResizePromptInput();
  DOM.sendBtn.disabled = true;
  DOM.welcomeContainer.style.display = 'none';
  DOM.messagesList.style.display = 'flex';
  DOM.chatArea.scrollTop = DOM.chatArea.scrollHeight;
  
  // Add Assistant Loading/Generating Message
  const assistantMsgId = 'msg-' + (Date.now() + 1);
  const mediaType = state.activeModel === 'gpt-image' ? 'image' : 'video';
  const assistantMsg = {
    id: assistantMsgId,
    role: 'assistant',
    text: `Gerando ${mediaType === 'image' ? 'imagem' : 'vídeo'}...`,
    status: 'generating',
    progress: 0,
    mediaType: mediaType,
    modelName: state.activeModel
  };
  currentSession.messages.push(assistantMsg);
  appendMessageHTML(assistantMsg);
  DOM.chatArea.scrollTop = DOM.chatArea.scrollHeight;

  // DIRECT BROWSER fallback or Forced Mock mode
  if (isLocalFileMode() || state.profile.useMock) {
    const taskId = 'local-mock-' + Math.random().toString(36).substring(2, 15);
    localMockTasks[taskId] = {
      progress: 0,
      type: mediaType,
      prompt: prompt,
      resultUrl: getMockMediaUrl(mediaType, prompt)
    };
    
    if (mediaType === 'image') {
      assistantMsg.taskId = taskId;
    } else {
      assistantMsg.uuid = taskId;
    }
    
    // Clear files previews
    state.uploadedFiles = [];
    renderUploadedPreviews();
    saveHistoryToBackend();
    
    pollLocalMockTask(mediaType, taskId, assistantMsgId);
    return;
  }
  
  // Prepare payload FormData
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('useMock', state.profile.useMock.toString());
  
  // Handle file uploads attachments
  state.uploadedFiles.forEach(item => {
    formData.append('files', item.file);
  });
  
  // Clear frontend uploaded reference files cache
  state.uploadedFiles = [];
  renderUploadedPreviews();
  
  let endpoint = '';
  
  if (state.activeModel === 'grok') {
    // If extending video
    if (state.activeExtendRef) {
      endpoint = '/api/video-extend/grok';
      formData.append('ref_history', state.activeExtendRef.uuid);
      state.activeExtendRef = null; // Reset references
    } else {
      endpoint = '/api/generate/grok';
      const s = state.modelSettings.grok;
      formData.append('resolution', s.resolution);
      formData.append('aspect_ratio', s.aspect_ratio);
      formData.append('duration', s.duration);
      formData.append('mode', s.mode);
    }
  } else if (state.activeModel === 'veo') {
    if (state.activeExtendRef) {
      endpoint = '/api/video-extend/veo';
      formData.append('ref_history', state.activeExtendRef.uuid);
      state.activeExtendRef = null;
    } else {
      endpoint = '/api/generate/veo';
      const s = state.modelSettings.veo;
      formData.append('model', s.model);
      formData.append('resolution', s.resolution);
      formData.append('duration', s.duration);
      formData.append('aspect_ratio', s.aspect_ratio);
      formData.append('mode_image', s.mode_image);
    }
  } else {
    endpoint = '/api/generate/gpt-image';
    const s = state.modelSettings['gpt-image'];
    formData.append('aspect_ratio', s.aspect_ratio);
  }
  
  updateActiveModelUI(); // Reset visual extend pills
  saveHistoryToBackend();
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });
    
    if (!response.ok) throw new Error('API server returned error code');
    
    const result = await response.json();
    
    // Extract task ID and update state
    const taskId = result.uuid || result.taskId || result.task_id || (result.data ? (result.data.taskId || result.data.task_id) : '');
    
    if (!taskId) throw new Error('No Task UUID returned by proxy endpoint');
    
    // Update msg details
    if (mediaType === 'image') {
      assistantMsg.taskId = taskId;
    } else {
      assistantMsg.uuid = taskId;
    }
    
    assistantMsg.modelName = result.model_name || assistantMsg.modelName;
    
    // Start Polling loop
    if (taskId.startsWith('mock-')) {
      pollLocalMockTask(mediaType, taskId, assistantMsgId);
    } else {
      pollTaskStatus(mediaType, taskId, assistantMsgId);
    }
    
  } catch (error) {
    console.error('Request submission failed, falling back to local simulation:', error);
    // Auto fallback to client simulation if connection fails
    const taskId = 'local-mock-' + Math.random().toString(36).substring(2, 15);
    localMockTasks[taskId] = {
      progress: 0,
      type: mediaType,
      prompt: prompt,
      resultUrl: getMockMediaUrl(mediaType, prompt)
    };
    
    if (mediaType === 'image') {
      assistantMsg.taskId = taskId;
    } else {
      assistantMsg.uuid = taskId;
    }
    saveHistoryToBackend();
    pollLocalMockTask(mediaType, taskId, assistantMsgId);
  }
}

/* ==========================================================================
   GALLERY SYSTEM
   ========================================================================== */

let allGalleryItems = [];

function openGallery() {
  // Show gallery container, hide chat
  DOM.galleryContainer.style.display = 'flex';
  const welcomeContainer = document.getElementById('welcome-container');
  const messagesList = document.getElementById('messages-list');
  if (welcomeContainer) welcomeContainer.style.display = 'none';
  if (messagesList) messagesList.style.display = 'none';

  // Reset filter
  document.querySelectorAll('.gallery-filter-btn').forEach(b => b.classList.remove('active'));
  const allBtn = document.querySelector('.gallery-filter-btn[data-filter="all"]');
  if (allBtn) allBtn.classList.add('active');

  lucide.createIcons();
  loadGallery();
}

function closeGallery() {
  DOM.galleryContainer.style.display = 'none';
  startNewChatSession();
}

async function loadGallery() {
  DOM.galleryLoading.style.display = 'flex';
  DOM.galleryEmpty.style.display = 'none';
  // Clear existing cards but keep loader
  const existingCards = DOM.galleryGrid.querySelectorAll('.gallery-card');
  existingCards.forEach(c => c.remove());

  if (isLocalFileMode()) {
    allGalleryItems = JSON.parse(localStorage.getItem('max_ai_gallery') || '[]');
    renderGalleryItems(allGalleryItems);
    return;
  }

  try {
    const res = await fetch('/api/media-history', {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const json = await res.json();
      allGalleryItems = json.data || [];
    } else {
      allGalleryItems = JSON.parse(localStorage.getItem('max_ai_gallery') || '[]');
    }
  } catch (e) {
    allGalleryItems = JSON.parse(localStorage.getItem('max_ai_gallery') || '[]');
  }

  renderGalleryItems(allGalleryItems);
}

function filterGallery(filter) {
  const items = filter === 'all' ? allGalleryItems : allGalleryItems.filter(i => i.media_type === filter);
  const existingCards = DOM.galleryGrid.querySelectorAll('.gallery-card');
  existingCards.forEach(c => c.remove());
  DOM.galleryLoading.style.display = 'none';
  renderGalleryItems(items);
}

function renderGalleryItems(items) {
  DOM.galleryLoading.style.display = 'none';

  if (!items || items.length === 0) {
    DOM.galleryEmpty.style.display = 'flex';
    return;
  }
  DOM.galleryEmpty.style.display = 'none';

  items.forEach(item => {
    const card = createGalleryCard(item);
    DOM.galleryGrid.appendChild(card);
  });

  lucide.createIcons();
}

function createGalleryCard(item) {
  const card = document.createElement('div');
  card.className = 'gallery-card';
  card.setAttribute('data-type', item.media_type);
  card.setAttribute('data-id', item.id);

  const date = new Date(item.created_at);
  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const typeLabel = item.media_type === 'video' ? 'Vídeo' : 'Imagem';
  const mediaEl = item.media_type === 'video'
    ? `<video src="${item.media_url}" muted loop preload="metadata"></video>`
    : `<img src="${item.media_url}" alt="${escapeHTML(item.prompt)}" loading="lazy">`;

  card.innerHTML = `
    <div class="gallery-card-thumb">
      ${mediaEl}
      <div class="gallery-card-type-badge ${item.media_type}">${typeLabel}</div>
      <div class="gallery-card-overlay">
        <button class="gallery-card-action-btn" onclick="openGalleryMedia('${item.media_url}', '${item.media_type}')" title="Visualizar">
          <i data-lucide="eye"></i>
        </button>
        <a href="${item.media_url}" download class="gallery-card-action-btn" title="Baixar">
          <i data-lucide="download"></i>
        </a>
        <button class="gallery-card-action-btn" onclick="deleteGalleryItem('${item.id}')" title="Excluir" style="color: #f87171; border-color: rgba(239,68,68,0.3);">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
    <div class="gallery-card-info">
      <div class="gallery-card-model">${item.model_name.toUpperCase()}</div>
      <div class="gallery-card-prompt">${escapeHTML(item.prompt)}</div>
      <div class="gallery-card-date">${dateStr}</div>
    </div>
  `;

  // Hover video play
  if (item.media_type === 'video') {
    const vid = card.querySelector('video');
    card.addEventListener('mouseenter', () => vid.play().catch(() => {}));
    card.addEventListener('mouseleave', () => { vid.pause(); vid.currentTime = 0; });
  }

  return card;
}

function openGalleryMedia(url, type) {
  if (type === 'image') {
    triggerLightbox(url);
  } else {
    // Open video in a new tab for full playback
    window.open(url, '_blank');
  }
}

async function deleteGalleryItem(id) {
  if (!confirm('Excluir esta geração da galeria?')) return;

  // Remove from local state
  allGalleryItems = allGalleryItems.filter(i => i.id !== id);
  const card = DOM.galleryGrid.querySelector(`[data-id="${id}"]`);
  if (card) card.remove();

  if (allGalleryItems.length === 0) {
    DOM.galleryEmpty.style.display = 'flex';
  }

  // Sync local storage fallback
  const stored = JSON.parse(localStorage.getItem('max_ai_gallery') || '[]');
  localStorage.setItem('max_ai_gallery', JSON.stringify(stored.filter(i => i.id !== id)));

  // Delete from backend
  try {
    await fetch(`/api/media-history/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  } catch (e) { /* silent fail */ }
}

async function saveMediaToGallery({ media_type, model_name, prompt, media_url, session_id, message_id }) {
  if (!media_url || !prompt) return;

  const entry = {
    id: 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    media_type, model_name, prompt, media_url, session_id, message_id,
    created_at: new Date().toISOString()
  };

  // Save locally for instant access
  const stored = JSON.parse(localStorage.getItem('max_ai_gallery') || '[]');
  stored.unshift(entry);
  localStorage.setItem('max_ai_gallery', JSON.stringify(stored.slice(0, 500)));

  // Persist to backend
  if (!isLocalFileMode()) {
    try {
      await fetch('/api/media-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ media_type, model_name, prompt, media_url, session_id, message_id })
      });
    } catch (e) { /* silent fail — local copy already saved */ }
  }
}

/* ==========================================================================
   POLLING WORKER (SERVER CONNECTED)
   ========================================================================== */

function pollTaskStatus(mediaType, taskId, msgId) {
  const pollInterval = 3000;
  
  const interval = setInterval(async () => {
    const session = state.sessions.find(s => s.id === state.activeSessionId);
    if (!session) {
      clearInterval(interval);
      return;
    }
    const msg = session.messages.find(m => m.id === msgId);
    if (!msg || msg.status !== 'generating') {
      clearInterval(interval);
      return;
    }
    
    try {
      const endpoint = mediaType === 'image' 
        ? `/api/status/image/${taskId}`
        : `/api/status/video/${taskId}`;
        
      const res = await fetch(endpoint, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Status server error');
      
      const data = await res.json();
      
      if (mediaType === 'video') {
        const status = data.status; // 1: processing, 2: completed, 3: failed
        const percentage = data.status_percentage || 0;
        
        updateMessageStatus(msgId, { progress: percentage });
        
        if (status === 2) {
          clearInterval(interval);
          const videoUrl = data.video_url || data.url || data.media_url || data.file_url || data.result;
          
          if (videoUrl) {
            updateMessageStatus(msgId, {
              status: 'success',
              progress: 100,
              mediaUrl: videoUrl,
              text: `Vídeo gerado com sucesso usando **${data.model_name || 'Grok-3'}**!`
            });
            saveMediaToGallery({
              media_type: 'video',
              model_name: data.model_name || 'grok-3',
              prompt: msg.prompt || '',
              media_url: videoUrl,
              session_id: state.activeSessionId,
              message_id: msgId
            });
            state.profile.creditUsed += 20;
            saveProfileToBackend();
          } else {
            updateMessageStatus(msgId, {
              status: 'failed',
              error: 'Vídeo completou, mas nenhuma URL de vídeo foi retornada pela API.'
            });
          }
        } else if (status === 3) {
          clearInterval(interval);
          updateMessageStatus(msgId, {
            status: 'failed',
            error: data.error_message || 'Falha na geração do vídeo através do servidor remoto.'
          });
        }
      } else {
        const taskData = data.data || data;
        const stateStr = taskData.state; // success, generating, fail
        
        let progress = msg.progress || 0;
        if (stateStr === 'generating') {
          progress = Math.min(progress + 15, 90);
          updateMessageStatus(msgId, { progress: progress });
        }
        
        if (stateStr === 'success') {
          clearInterval(interval);
          
          let resultUrl = '';
          if (taskData.resultUrls && taskData.resultUrls.length > 0) {
            resultUrl = taskData.resultUrls[0];
          } else if (taskData.result && taskData.result.resultUrls && taskData.result.resultUrls.length > 0) {
            resultUrl = taskData.result.resultUrls[0];
          } else if (taskData.resultJson) {
            try {
              const parsed = typeof taskData.resultJson === 'string' ? JSON.parse(taskData.resultJson) : taskData.resultJson;
              if (parsed && parsed.resultUrls && parsed.resultUrls.length > 0) {
                resultUrl = parsed.resultUrls[0];
              }
            } catch (e) {}
          }
          
          if (resultUrl) {
            updateMessageStatus(msgId, {
              status: 'success',
              progress: 100,
              mediaUrl: resultUrl,
              text: 'Imagem gerada com sucesso usando **GPT Image**!'
            });
            saveMediaToGallery({
              media_type: 'image',
              model_name: taskData.model || 'gpt-image-2-text-to-image',
              prompt: msg.prompt || '',
              media_url: resultUrl,
              session_id: state.activeSessionId,
              message_id: msgId
            });
            state.profile.creditUsed += 5;
            saveProfileToBackend();
          } else {
            updateMessageStatus(msgId, {
              status: 'failed',
              error: 'Imagem concluída, mas nenhuma URL foi encontrada no payload.'
            });
          }
        } else if (stateStr === 'fail') {
          clearInterval(interval);
          updateMessageStatus(msgId, {
            status: 'failed',
            error: taskData.error_message || 'Falha na geração da imagem pelo modelo GPT Image.'
          });
        }
      }
    } catch (e) {
      console.warn('Polling check error:', e);
    }
  }, pollInterval);
}

/* ==========================================================================
   CLIENT-SIDE MOCK POLLING SIMULATOR (OFFLINE / FILE:// PROTOCOL)
   ========================================================================== */

function pollLocalMockTask(mediaType, taskId, msgId) {
  const pollInterval = 1500; // Faster simulation on frontend
  
  const interval = setInterval(() => {
    const session = state.sessions.find(s => s.id === state.activeSessionId);
    if (!session) {
      clearInterval(interval);
      return;
    }
    const msg = session.messages.find(m => m.id === msgId);
    if (!msg || msg.status !== 'generating') {
      clearInterval(interval);
      return;
    }
    
    // Increment local task mock details
    const task = localMockTasks[taskId];
    if (!task) {
      clearInterval(interval);
      return;
    }
    
    task.progress += 20 + Math.floor(Math.random() * 10);
    
    if (task.progress >= 100) {
      task.progress = 100;
      clearInterval(interval);
      
      updateMessageStatus(msgId, {
        status: 'success',
        progress: 100,
        mediaUrl: task.resultUrl,
        text: mediaType === 'image'
          ? 'Imagem gerada com sucesso usando **GPT Image (Simulador)**!'
          : `Vídeo gerado com sucesso usando **${msg.modelName === 'veo' ? 'Veo 3' : 'Grok-3'} (Simulador)**!`
      });
      
      saveMediaToGallery({
        media_type: mediaType,
        model_name: mediaType === 'image' ? 'gpt-image-2-text-to-image' : (msg.modelName === 'veo' ? 'veo-3.1' : 'grok-3'),
        prompt: msg.prompt || '',
        media_url: task.resultUrl,
        session_id: state.activeSessionId,
        message_id: msgId
      });
      
      state.profile.creditUsed += mediaType === 'image' ? 5 : 20;
      saveProfileLocal();
    } else {
      updateMessageStatus(msgId, { progress: task.progress });
    }
    
  }, pollInterval);
}

function updateMessageStatus(msgId, updates) {
  const session = state.sessions.find(s => s.id === state.activeSessionId);
  if (!session) return;
  
  const msg = session.messages.find(m => m.id === msgId);
  if (!msg) return;
  
  // Merge updates
  Object.assign(msg, updates);
  
  // Refresh HTML element
  const msgElement = document.getElementById(msgId);
  if (msgElement) {
    const parent = msgElement.parentElement;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = getSingleMessageHTML(msg);
    parent.replaceChild(tempDiv.firstElementChild, msgElement);
    
    // Re-bind Lucide icons
    lucide.createIcons();
  }
  
  // Save updated session list
  saveHistoryToBackend();
}

/* ==========================================================================
   VIDEO EXTENSION WORKER
   ========================================================================== */

function triggerVideoExtend(uuid, model) {
  state.activeExtendRef = { uuid, model };
  
  changeModel(model);
  
  DOM.promptInput.value = 'Continue a cena com mais ação...';
  autoResizePromptInput();
  DOM.sendBtn.disabled = false;
  DOM.promptInput.focus();
  DOM.promptInput.select();
  
  updateActiveModelUI();
}

/* ==========================================================================
   LIGHTBOX SYSTEM
   ========================================================================== */

function triggerLightbox(url) {
  DOM.lightboxImg.src = url;
  DOM.lightboxDownload.href = url;
  DOM.lightbox.classList.add('active');
}

/* ==========================================================================
   HTML BUBBLES RENDERING ENGINE
   ========================================================================== */

function appendMessageHTML(msg) {
  const html = getSingleMessageHTML(msg);
  DOM.messagesList.insertAdjacentHTML('beforeend', html);
  lucide.createIcons();
}

function getSingleMessageHTML(msg) {
  const isAI = msg.role === 'assistant';
  const avatarText = isAI ? 'M' : 'U';
  const roleClass = isAI ? 'ai' : 'user';
  
  let innerBody = '';
  
  if (msg.role === 'user') {
    innerBody = `
      <div class="message-bubble">
        <p>${escapeHTML(msg.text)}</p>
        ${msg.attachments && msg.attachments.length > 0 ? `
          <div class="message-attachments">
            ${msg.attachments.map(url => `<img src="${url}" class="bubble-attachment-img" onclick="triggerLightbox('${url}')">`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  } else {
    // Assistant message bubble
    let bubbleContent = '';
    
    if (msg.status === 'generating') {
      bubbleContent = `
        <div class="loading-box">
          <div class="loading-header">
            <span>MAX está processando (${msg.modelName.toUpperCase()})...</span>
            <div class="loader-animation"></div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${msg.progress}%;"></div>
          </div>
          <div style="font-size: 0.72rem; text-align: right; color: var(--text-muted);">${msg.progress}% concluído</div>
        </div>
      `;
    } else if (msg.status === 'failed') {
      bubbleContent = `
        <div class="error-message-box">
          <i data-lucide="alert-circle" class="error-icon"></i>
          <div>
            <strong>Geração Falhou:</strong>
            <p>${escapeHTML(msg.error)}</p>
          </div>
        </div>
      `;
    } else {
      // Completed output success
      const outputHTML = msg.mediaType === 'video'
        ? `
          <div class="media-output-container">
            <video src="${msg.mediaUrl}" controls autoplay loop></video>
            <div class="media-actions-bar">
              <span class="media-badge">Vídeo ${msg.modelName.toUpperCase()}</span>
              <div class="media-controls">
                <button class="action-btn extend-btn" onclick="triggerVideoExtend('${msg.uuid || msg.taskId}', '${msg.modelName}')">
                  <i data-lucide="arrow-right-circle"></i> Estender
                </button>
                <a href="${msg.mediaUrl}" download class="action-btn">
                  <i data-lucide="download"></i> Baixar
                </a>
              </div>
            </div>
          </div>
        `
        : `
          <div class="media-output-container">
            <img src="${msg.mediaUrl}" alt="Generated artwork" onclick="triggerLightbox('${msg.mediaUrl}')">
            <div class="media-actions-bar">
              <span class="media-badge">Imagem GPT</span>
              <div class="media-controls">
                <a href="${msg.mediaUrl}" download class="action-btn">
                  <i data-lucide="download"></i> Baixar
                </a>
              </div>
            </div>
          </div>
        `;
        
      bubbleContent = `
        <div class="message-bubble">
          <p>${formatMarkdown(msg.text)}</p>
          ${outputHTML}
        </div>
      `;
    }
    
    innerBody = `
      <div class="message-bubble-content">
        <span class="message-meta">MAX AI</span>
        ${bubbleContent}
      </div>
    `;
  }

  return `
    <div class="message-wrapper ${roleClass}" id="${msg.id}">
      <div class="message-avatar">${avatarText}</div>
      ${innerBody}
    </div>
  `;
}

/* ==========================================================================
   TEXT FORMATTERS UTILITIES
   ========================================================================== */

function autoResizePromptInput() {
  const textarea = DOM.promptInput;
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

function escapeHTML(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMarkdown(text) {
  if (!text) return '';
  let html = escapeHTML(text);
  
  // Format bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Format italic (*text*)
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Format single backticks inline code (`code`)
  html = html.replace(/`(.*?)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>');
  
  // Format link paragraphs
  html = html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: var(--primary-purple); text-decoration: underline;">$1</a>');
  
  return html;
}
