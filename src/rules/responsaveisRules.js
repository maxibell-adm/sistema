import { usuarioPorRole } from '@/config/usuarios.js';

export const ROLE_ETAPA = {
  pedido_inicial: 'operacional',
  medicao_inicial: 'medicao',
  projeto_contramarco: 'projetos',
  fabricacao_contramarco: 'operacional',
  medicao_final: 'medicao',
  projeto_final: 'projetos',
  compras: 'operacional',
  montagem: 'operacional',
  entrega: 'operacional',
  instalacao: 'operacional',
  finalizado: null,
  manutencao: 'medicao',
  entrega_cm: 'operacional',
};

export function responsavelDaEtapa(etapa) {
  const role = ROLE_ETAPA[etapa];
  if (!role) return null;
  return usuarioPorRole(role)?.nome || null;
}

export const RESPONSAVEL_ETAPA = new Proxy({}, {
  get(_, etapa) {
    return responsavelDaEtapa(etapa);
  },
});
