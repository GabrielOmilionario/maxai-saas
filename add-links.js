const fs = require('fs');
const plansMetaPath = 'c:/Users/User/Desktop/Max AI 2.0/src/lib/plans-meta.js';
let pmetaContent = fs.readFileSync(plansMetaPath, 'utf8');

pmetaContent = pmetaContent.replace(
  "es: '#' // POR FAVOR, CRIE O LINK NO STRIPE E COLOQUE AQUI",
  "es: 'https://buy.stripe.com/fZuaEW6jPbEIgyw1Oa93y07'"
);
pmetaContent = pmetaContent.replace(
  "es: '#' // POR FAVOR, CRIE O LINK NO STRIPE E COLOQUE AQUI",
  "es: 'https://buy.stripe.com/9B6bJ0cIdbEIeqo50m93y08'"
);
pmetaContent = pmetaContent.replace(
  "es: '#' // POR FAVOR, CRIE O LINK NO STRIPE E COLOQUE AQUI",
  "es: 'https://buy.stripe.com/dRmfZg9w1fUY5TScsO93y09'"
);

fs.writeFileSync(plansMetaPath, pmetaContent);
console.log('Links adicionados com sucesso!');
