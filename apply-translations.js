const fs = require('fs');

const dashboardPath = 'c:/Users/User/Desktop/Max AI 2.0/src/app/[lang]/(authenticated)/dashboard/page.js';
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// Add import
if (!dashboardContent.includes('useI18n')) {
  dashboardContent = dashboardContent.replace(
    "import { useAuth } from '@/context/AuthContext'",
    "import { useAuth } from '@/context/AuthContext'\nimport { useI18n } from '@/context/I18nContext'"
  );
}

// Add hook
if (!dashboardContent.includes('const { dict } = useI18n()')) {
  dashboardContent = dashboardContent.replace(
    "const { profile, refreshProfile, sidebarOpen, setSidebarOpen } = useAuth()",
    "const { profile, refreshProfile, sidebarOpen, setSidebarOpen } = useAuth()\n  const { dict } = useI18n()"
  );
}

// Replace Strings
dashboardContent = dashboardContent.replace(
  /O que você quer criar hoje\?/g,
  "{dict.dashboard.whatToCreate}"
);

dashboardContent = dashboardContent.replace(
  /Descreva sua ideia e deixe o MAX transformar em realidade\./g,
  "{dict.dashboard.describeIdea}"
);

dashboardContent = dashboardContent.replace(
  /'Descreva o que deseja criar\.\.\.'/g,
  "dict.dashboard.describePromptVideo"
);

dashboardContent = dashboardContent.replace(
  /'Descreva a imagem que deseja gerar\.\.\.'/g,
  "dict.dashboard.describePromptImage"
);

dashboardContent = dashboardContent.replace(
  /O MAX pode cometer erros\. Confira informações importantes\./g,
  "{dict.dashboard.disclaimer}"
);

// Fix QUICK_ACTIONS mapping
dashboardContent = dashboardContent.replace(
  /<span>{text}<\/span>/g,
  "<span>{model === 'gpt-image' ? dict.dashboard.createImageBtn : dict.dashboard.createVideoBtn}</span>"
);

fs.writeFileSync(dashboardPath, dashboardContent);

const sidebarPath = 'c:/Users/User/Desktop/Max AI 2.0/src/components/Sidebar.js';
let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

if (!sidebarContent.includes('useI18n')) {
  sidebarContent = sidebarContent.replace(
    "import { useAuth } from '@/context/AuthContext'",
    "import { useAuth } from '@/context/AuthContext'\nimport { useI18n } from '@/context/I18nContext'"
  );
}

if (!sidebarContent.includes('const { dict } = useI18n()')) {
  sidebarContent = sidebarContent.replace(
    "const {\n    user, profile, loading",
    "const { dict } = useI18n()\n  const {\n    user, profile, loading"
  );
}

// Replace Sidebar Strings
sidebarContent = sidebarContent.replace(
  />Novo chat</g,
  ">{dict.buttons.newChat}<"
);
sidebarContent = sidebarContent.replace(
  />Recentes</g,
  ">{dict.dashboard.recent}<"
);
sidebarContent = sidebarContent.replace(
  />Nenhuma conversa ainda</g,
  ">{dict.dashboard.noConversations}<"
);
sidebarContent = sidebarContent.replace(
  />Nova Imagem</g,
  ">{dict.buttons.newImage}<"
);
sidebarContent = sidebarContent.replace(
  />Novo Vídeo</g,
  ">{dict.buttons.newVideo}<"
);
sidebarContent = sidebarContent.replace(
  />Sair da conta</g,
  ">{dict.buttons.logout}<"
);
sidebarContent = sidebarContent.replace(
  />Painel do Administrador</g,
  ">{dict.dashboard.adminPanel}<"
);
sidebarContent = sidebarContent.replace(
  />Chat</g,
  ">{dict.dashboard.chatTab}<"
);
sidebarContent = sidebarContent.replace(
  />Imagens</g,
  ">{dict.dashboard.imagesTab}<"
);
sidebarContent = sidebarContent.replace(
  />Vídeos</g,
  ">{dict.dashboard.videosTab}<"
);
sidebarContent = sidebarContent.replace(
  /créditos restantes/g,
  "{dict.dashboard.remainingCredits}"
);

// Replace empty states using dangerouslySetInnerHTML or standard text.
// Actually, I can just replace the strings inside the paragraphs.
sidebarContent = sidebarContent.replace(
  /Suas imagens geradas aparecerão aqui\.<br \/>\s*Use o chat para criar imagens com GPT\./g,
  "<span dangerouslySetInnerHTML={{ __html: dict.dashboard.imagesEmpty }} />"
);

sidebarContent = sidebarContent.replace(
  /Seus vídeos gerados aparecerão aqui\.<br \/>\s*Use o chat para criar vídeos com Grok-3\./g,
  "<span dangerouslySetInnerHTML={{ __html: dict.dashboard.videosEmpty }} />"
);

// Fix tabs text. Oh wait, tabs are defined as an array:
/*
  const tabs = [
    { key: 'chat', label: 'Chat', icon: MessageSquare },
    { key: 'images', label: 'Imagens', icon: ImageIcon },
    { key: 'videos', label: 'Vídeos', icon: Video },
  ]
*/
// It's inside the component, so I can just change it.
sidebarContent = sidebarContent.replace(
  /label: 'Chat'/g,
  "label: dict.dashboard.chatTab"
);
sidebarContent = sidebarContent.replace(
  /label: 'Imagens'/g,
  "label: dict.dashboard.imagesTab"
);
sidebarContent = sidebarContent.replace(
  /label: 'Vídeos'/g,
  "label: dict.dashboard.videosTab"
);

sidebarContent = sidebarContent.replace(
  />Carregando\.\.\.</g,
  ">{dict.dashboard.loading}<"
);

fs.writeFileSync(sidebarPath, sidebarContent);
console.log('Translations applied successfully!');
