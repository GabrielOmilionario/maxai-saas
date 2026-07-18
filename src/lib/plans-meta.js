export const PLANS = {
  FREE: {
    name: 'Free',
    price: 'R$ 0',
    badge: 'Gratuito',
    description: 'Para testar a plataforma.',
    credits: '100 créditos de bônus no cadastro',
    tools: 'GROK (Vídeo), GPT IMAGEM',
    limit: 'Sem recargas mensais',
    accent: 'border-zinc-800 bg-zinc-950/20 text-zinc-400',
    highlight: false,
    checkoutLinks: {
      pt: null,
      es: null
    }
  },
  INICIANTE: {
    name: 'Iniciante',
    price: 'R$ 39,90',
    badge: 'Popular',
    description: 'Para criadores casuais.',
    credits: '3.000 créditos por mês',
    tools: 'Grok, GPT IMAGEM',
    limit: 'Limite: 10 vídeos/dia, 150/mês',
    accent: 'border-brand-blue/30 bg-brand-blue/5 text-brand-blue',
    highlight: false,
    checkoutLinks: {
      pt: 'https://buy.stripe.com/4gM3cu4bHfUY8200K693y04',
      es: 'https://buy.stripe.com/fZuaEW6jPbEIgyw1Oa93y07'
    }
  },
  CRIADOR: {
    name: 'Criador',
    price: 'R$ 67,90',
    badge: 'Melhor Custo-Benefício',
    description: 'Para profissionais e criativos.',
    credits: '6.000 créditos por mês',
    tools: 'Grok, GPT IMAGEM',
    limit: 'Sem limite diário de criação',
    accent: 'border-amber-500/40 bg-amber-500/5 text-amber-500',
    highlight: true,
    checkoutLinks: {
      pt: 'https://buy.stripe.com/14AeVcdMh5gkcig1Oa93y05',
      es: 'https://buy.stripe.com/9B6bJ0cIdbEIeqo50m93y08'
    }
  },
  EMPRESAS: {
    name: 'Empresas',
    price: 'R$ 119,90',
    badge: 'Ilimitado',
    description: 'Para agências e negócios.',
    credits: '20.000 créditos por mês',
    tools: 'Grok, GPT IMAGEM',
    limit: 'Sem limite diário de criação',
    accent: 'border-brand-purple/40 bg-brand-purple/5 text-brand-purple',
    highlight: false,
    checkoutLinks: {
      pt: 'https://buy.stripe.com/00wcN40ZvbEIfusgJ493y06',
      es: 'https://buy.stripe.com/dRmfZg9w1fUY5TScsO93y09'
    }
  }
}
