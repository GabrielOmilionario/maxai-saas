const fs = require('fs');

const layoutPath = 'c:/Users/User/Desktop/Max AI 2.0/src/app/[lang]/layout.js';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

// Add import for PwaInstallPrompt
if (!layoutContent.includes('PwaInstallPrompt')) {
  layoutContent = layoutContent.replace(
    "import { getDictionary } from \"@/lib/i18n\";",
    "import { getDictionary } from \"@/lib/i18n\";\nimport PwaInstallPrompt from \"@/components/PwaInstallPrompt\";"
  );
}

// Add viewport export
if (!layoutContent.includes('export const viewport')) {
  layoutContent = layoutContent.replace(
    "export async function generateMetadata",
    "export const viewport = {\n  themeColor: '#000000',\n  width: 'device-width',\n  initialScale: 1,\n  maximumScale: 1,\n};\n\nexport async function generateMetadata"
  );
}

// Add manifest and appleWebApp to metadata
if (!layoutContent.includes('manifest: "/manifest.json"')) {
  layoutContent = layoutContent.replace(
    "alternates: {",
    "manifest: \"/manifest.json\",\n    appleWebApp: {\n      capable: true,\n      statusBarStyle: \"black-translucent\",\n      title: \"MAX AI\",\n    },\n    alternates: {"
  );
}

// Inject PwaInstallPrompt component before closing body
if (!layoutContent.includes('<PwaInstallPrompt />')) {
  layoutContent = layoutContent.replace(
    "{children}\n          </I18nProvider>",
    "{children}\n            <PwaInstallPrompt />\n          </I18nProvider>"
  );
}

fs.writeFileSync(layoutPath, layoutContent);

const pwaPromptPath = 'c:/Users/User/Desktop/Max AI 2.0/src/components/PwaInstallPrompt.js';
let pwaPromptContent = fs.readFileSync(pwaPromptPath, 'utf8');

// Add Service Worker registration to PwaInstallPrompt
if (!pwaPromptContent.includes('navigator.serviceWorker.register')) {
  pwaPromptContent = pwaPromptContent.replace(
    "useEffect(() => {",
    "useEffect(() => {\n    if ('serviceWorker' in navigator) {\n      window.addEventListener('load', () => {\n        navigator.serviceWorker.register('/sw.js').then(\n          (registration) => { console.log('SW registered: ', registration.scope); },\n          (err) => { console.log('SW registration failed: ', err); }\n        );\n      });\n    }\n"
  );
  fs.writeFileSync(pwaPromptPath, pwaPromptContent);
}

console.log('Layout and Prompt updated!');
