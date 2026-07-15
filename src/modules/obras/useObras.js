import { ETAPAS, GRUPOS_KANBAN } from '@/config/etapas.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';

export const ETAPAS_OPERACIONAL = [
  'pedido_inicial',
  'fabricacao_contramarco',
  'compras',
  'montagem',
  'entrega',
  'instalacao',
  'finalizado',
  'manutencao',
];

export function obrasVisiveis(role, todasObras, usuarioNome) {
  if (role === 'admin' || role === 'supervisor' || role === 'operacional' || role === 'comercial') return todasObras;
  if (role === 'medicao') return todasObras.filter((o) => ['medicao_inicial', 'medicao_final'].includes(o.etapa) || o.responsavel === usuarioNome);
  if (role === 'projetos') return todasObras.filter((o) => ['projeto_contramarco', 'fabricacao_contramarco', 'projeto_final'].includes(o.etapa) || o.responsavel === usuarioNome);
  return [];
}

export function etapasPorPerfil(role, grupo = 'todos') {
  if (role === 'medicao') return ETAPAS.filter((e) => ['medicao_inicial', 'medicao_final'].includes(e.id));
  if (role === 'projetos') return ETAPAS.filter((e) => ['projeto_contramarco', 'fabricacao_contramarco', 'projeto_final'].includes(e.id));
  if (role === 'operacional') {
    const chave = grupo === 'todos' ? 'operacional' : grupo;
    const ids = grupo === 'todos' ? ETAPAS_OPERACIONAL : GRUPOS_KANBAN[chave]?.etapas || ETAPAS_OPERACIONAL;
    return ETAPAS.filter((e) => ids.includes(e.id));
  }
  const ids = GRUPOS_KANBAN[grupo]?.etapas || GRUPOS_KANBAN.todos.etapas;
  return ETAPAS.filter((e) => ids.includes(e.id));
}

export function useObras() {
  const { usuario } = useAuth();
  const { obras, ...acoes } = useObrasContext();
  const visiveis = obrasVisiveis(usuario?.role, obras, usuario?.nome);
  return { obras, obrasVisiveis: visiveis, ...acoes };
}


