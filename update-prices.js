const fs = require('fs');

function updateJson(filePath, prices) {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  data.plans.INICIANTE.price = prices.INICIANTE;
  data.plans.CRIADOR.price = prices.CRIADOR;
  data.plans.EMPRESAS.price = prices.EMPRESAS;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

updateJson('c:/Users/User/Desktop/Max AI 2.0/src/locales/pt.json', {
  INICIANTE: 'R$ 39,90',
  CRIADOR: 'R$ 67,90',
  EMPRESAS: 'R$ 119,90'
});

updateJson('c:/Users/User/Desktop/Max AI 2.0/src/locales/es.json', {
  INICIANTE: '$ 9.90',
  CRIADOR: '$ 14.90',
  EMPRESAS: '$ 19.90'
});

const plansModalPath = 'c:/Users/User/Desktop/Max AI 2.0/src/components/PlansModal.js';
let pmContent = fs.readFileSync(plansModalPath, 'utf8');

pmContent = pmContent.replace(
  "price: 'R$ 39,90'",
  "price: pt.INICIANTE?.price || 'R$ 39,90'"
);
pmContent = pmContent.replace(
  "price: 'R$ 67,90'",
  "price: pt.CRIADOR?.price || 'R$ 67,90'"
);
pmContent = pmContent.replace(
  "price: 'R$ 119,90'",
  "price: pt.EMPRESAS?.price || 'R$ 119,90'"
);

fs.writeFileSync(plansModalPath, pmContent);

const plansMetaPath = 'c:/Users/User/Desktop/Max AI 2.0/src/lib/plans-meta.js';
let pmetaContent = fs.readFileSync(plansMetaPath, 'utf8');

// I will set the 'es' links to placeholders since I don't have the real links yet.
// Wait! The user said "E crie outros links de pagamento na stripe. Plano iniciante: 9,90 dolares".
// If I can't create them, I'll just set them to `#`.
pmetaContent = pmetaContent.replace(
  "es: 'https://buy.stripe.com/4gM3cu4bHfUY8200K693y04' // replace later",
  "es: '#' // POR FAVOR, CRIE O LINK NO STRIPE E COLOQUE AQUI"
);
pmetaContent = pmetaContent.replace(
  "es: 'https://buy.stripe.com/14AeVcdMh5gkcig1Oa93y05' // replace later",
  "es: '#' // POR FAVOR, CRIE O LINK NO STRIPE E COLOQUE AQUI"
);
pmetaContent = pmetaContent.replace(
  "es: 'https://buy.stripe.com/00wcN40ZvbEIfusgJ493y06' // replace later",
  "es: '#' // POR FAVOR, CRIE O LINK NO STRIPE E COLOQUE AQUI"
);

fs.writeFileSync(plansMetaPath, pmetaContent);

console.log('Prices and plans updated successfully!');
