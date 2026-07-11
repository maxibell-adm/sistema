import { labelEtapa } from '@/config/etapas.js';
import { carregarUsuarios, usuarioPorRole } from '@/config/usuarios.js';
import { calcPrazo } from '@/rules/prazosRules.js';

export function usuarioPorNome(nome) {
  return carregarUsuarios().find((u) => u.nome === nome) || { nome, cargo: 'Responsavel', avatar: '??', cor: '#7F8C8D' };
}

export function prazoVencidoEm(prazo) {
  if (!prazo) return '';
  return new Date(`${prazo}T00:00:00`).toLocaleDateString('pt-BR');
}

export function ultimoHistorico(obra) {
  return obra?.historico?.[obra.historico.length - 1] || null;
}

export function atrasosDePrazo(obras) {
  return obras
    .filter((obra) => !['finalizado', 'manutencao'].includes(obra.etapa))
    .map((obra) => ({ obra, prazo: calcPrazo(obra.prazo) }))
    .filter(({ prazo }) => prazo.classe === 'badge-vencido')
    .map(({ obra, prazo }) => ({
      id: `${obra.id}-prazo`,
      tipo: 'prazo',
      obra,
      etapa: labelEtapa(obra.etapa),
      responsavel: usuarioPorNome(obra.responsavel),
      dias: Math.abs(prazo.dias),
      vencimento: prazoVencidoEm(obra.prazo),
    }));
}

export function alertasCriticos(obras) {
  const prazo = atrasosDePrazo(obras).filter((a) => a.dias > 5);
  const compras = obras
    .filter((obra) => obra.etapa === 'compras' && ['vidro', 'acessorios', 'perfil'].some((id) => obra.compras?.[id]?.status !== 'ok'))
    .map((obra) => ({
      id: `${obra.id}-compras`,
      tipo: 'compras',
      obra,
      etapa: labelEtapa(obra.etapa),
      responsavel: usuarioPorNome(obra.responsavel),
      dias: 0,
      ultimaAcao: ultimoHistorico(obra)?.acao || 'Compras sem movimentacao',
    }));
  const instalacoes = obras
    .filter((obra) => obra.etapa === 'instalacao' && obra.pendencias?.some((p) => !p.resolvido))
    .map((obra) => ({
      id: `${obra.id}-instalacao`,
      tipo: 'instalacao',
      obra,
      etapa: labelEtapa(obra.etapa),
      responsavel: usuarioPorNome(obra.responsavel),
      dias: 0,
      ultimaAcao: 'Instalacao com pendencia aberta',
    }));
  const pendencias = obras
    .filter((obra) => obra.pendencia?.aberta)
    .map((obra) => ({
      id: `${obra.id}-pendencia`,
      tipo: 'pendencia',
      obra,
      etapa: labelEtapa(obra.etapa),
      responsavel: usuarioPorNome(obra.pendencia.responsavel),
      dias: 0,
      ultimaAcao: obra.pendencia.tipo,
    }));
  return [...prazo, ...compras, ...instalacoes, ...pendencias];
}

export function alertasPorPerfil(role, nome, alertas) {
  if (role === 'admin') return alertas;
  if (role === 'operacional') {
    const operacional = usuarioPorRole('operacional')?.nome || nome;
    return alertas.filter((a) => a.obra.responsavel === operacional && ['compras', 'montagem', 'entrega', 'instalacao'].includes(a.obra.etapa));
  }
  if (role === 'medicao') {
    return alertas.filter((a) => a.obra.responsavel === nome && ['medicao_inicial', 'medicao_final', 'manutencao'].includes(a.obra.etapa));
  }
  return [];
}
