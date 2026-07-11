import { diasParaPrazoCliente } from '@/rules/eventosRules.js';

export const REGRAS_NEGOCIO = [
  {
    id: 'pedido-inicial-vhsys',
    titulo: 'Pedido inicial depende do VHSYS',
    severidade: 'bloqueio',
    verificar: (obra) => obra.etapa === 'pedido_inicial' && !obra.vhsysEsquadria?.trim(),
    sugestao: (obra) => `Cobrar cadastro VHSYS da ${obra.pp} antes de mover a obra.`,
  },
  {
    id: 'prazo-cliente-10-dias',
    titulo: 'Prazo de cliente próximo',
    severidade: 'urgente',
    verificar: (obra) => {
      const dias = diasParaPrazoCliente(obra.prazoCliente);
      return dias !== null && dias <= 10 && obra.etapa !== 'finalizado';
    },
    sugestao: (obra) => `Revisar plano da ${obra.pp}; prazo prometido ao cliente está próximo ou vencido.`,
  },
  {
    id: 'pendencia-aberta',
    titulo: 'Pendência aberta',
    severidade: 'aviso',
    verificar: (obra) => Boolean(obra.pendencia?.aberta),
    sugestao: (obra) => `Resolver pendência da ${obra.pp} antes da próxima etapa.`,
  },
  {
    id: 'condicao-especial',
    titulo: 'Condição especial ativa',
    severidade: 'atenção',
    verificar: (obra) => Boolean(obra.condicaoEspecial?.ativa),
    sugestao: (obra) => `Verificar condição especial da ${obra.pp}: ${obra.condicaoEspecial?.texto}`,
  },
  {
    id: 'ocorrencia-aberta',
    titulo: 'Ocorrência aberta',
    severidade: 'bloqueio',
    verificar: (obra) => (obra.ocorrencias || []).some((oc) => oc.status !== 'resolvida'),
    sugestao: (obra) => `Não finalizar ${obra.pp} antes de resolver todas as ocorrências.`,
  },
];

export const REGRAS_IA = REGRAS_NEGOCIO;

export function verificarRegras(obra) {
  return REGRAS_NEGOCIO
    .filter((regra) => regra.verificar(obra))
    .map((regra) => ({ id: regra.id, titulo: regra.titulo, severidade: regra.severidade, sugestao: regra.sugestao(obra) }));
}

export function avaliarRegrasIA(obra) {
  return verificarRegras(obra);
}
