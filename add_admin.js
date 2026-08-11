const fs = require('fs');
const path = require('path');

const files = [
  "c:\\Users\\User\\Desktop\\Max AI 2.0\\maxai-saas\\src\\lib\\plans.js",
  "c:\\Users\\User\\Desktop\\Max AI 2.0\\maxai-saas\\src\\components\\Sidebar.js",
  "c:\\Users\\User\\Desktop\\Max AI 2.0\\maxai-saas\\src\\app\\[lang]\\(authenticated)\\generate-video\\page.js",
  "c:\\Users\\User\\Desktop\\Max AI 2.0\\maxai-saas\\src\\app\\[lang]\\(authenticated)\\generate-image\\page.js",
  "c:\\Users\\User\\Desktop\\Max AI 2.0\\maxai-saas\\src\\app\\[lang]\\(authenticated)\\dashboard\\page.js",
  "c:\\Users\\User\\Desktop\\Max AI 2.0\\maxai-saas\\src\\app\\[lang]\\(authenticated)\\admin\\page.js",
  "c:\\Users\\User\\Desktop\\Max AI 2.0\\maxai-saas\\src\\app\\[lang]\\(authenticated)\\admin\\migrar\\page.js",
  "c:\\Users\\User\\Desktop\\Max AI 2.0\\maxai-saas\\src\\app\\api\\generate-video\\route.js",
  "c:\\Users\\User\\Desktop\\Max AI 2.0\\maxai-saas\\src\\app\\api\\generate-image\\route.js",
  "c:\\Users\\User\\Desktop\\Max AI 2.0\\maxai-saas\\src\\app\\api\\chat\\messages\\route.js",
  "c:\\Users\\User\\Desktop\\Max AI 2.0\\maxai-saas\\src\\app\\api\\admin\\users\\route.js",
  "c:\\Users\\User\\Desktop\\Max AI 2.0\\maxai-saas\\src\\app\\api\\admin\\migrate\\route.js",
  "c:\\Users\\User\\Desktop\\Max AI 2.0\\maxai-saas\\src\\app\\api\\admin\\clean-storage\\route.js"
];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  
  // replace ===
  content = content.replace(/(\w+\??\.email)\s*===\s*'gabrieljesus2030@gmail.com'/g, `['gabrieljesus2030@gmail.com', 'Isah3469520@gmail.com'].includes($1)`);
  
  // replace !==
  content = content.replace(/(\w+\??\.email)\s*!==\s*'gabrieljesus2030@gmail.com'/g, `!['gabrieljesus2030@gmail.com', 'Isah3469520@gmail.com'].includes($1)`);
  
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated: ${file}`);
});
