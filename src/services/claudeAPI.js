import { responderOffline } from '@/modules/ia/motorInsights.js';

export const IA_ATIVA = false;

export async function perguntarIA(pergunta, contexto = {}) {
  if (!IA_ATIVA) {
    return {
      modo: 'offline',
      offline: true,
      tokens: 0,
      texto: responderOffline(pergunta, contexto),
    };
  }

  return {
    modo: 'pendente',
    offline: false,
    tokens: 0,
    texto: 'Chave detectada. A chamada externa deve passar por proxy seguro antes de uso em produção.',
  };
}

export async function perguntarClaude(pergunta, contexto = {}) {
  return perguntarIA(pergunta, contexto);
}

export async function gerarInsightEvento(evento, contexto = {}) {
  if (!IA_ATIVA) return null;
  return perguntarIA(`Analise este evento operacional: ${JSON.stringify(evento)}`, contexto);
}
