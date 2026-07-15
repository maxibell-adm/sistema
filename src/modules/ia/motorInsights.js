import { analisarObras } from '@/modules/ia/analiseDados.js';

function insight(id, tipo, titulo, texto, prioridade = 2) {
  return { id, tipo, titulo, texto, prioridade };
}

export function gerarInsights(obras = [], atividades = [], biblioteca = []) {
  const analise = analisarObras(obras);
  const insights = [];

  if (analise.criticas.length) {
    const principal = analise.criticas[0];
    insights.push(insight('obras-criticas', 'risco', `${analise.criticas.length} obra(s) críticas`, `Priorize ${principal.obra.pp} - ${principal.obra.cliente}. Saúde ${principal.saude.valor}%.`, 1));
  }

  const prazoClienteCritico = analise.prazosCliente.filter((item) => item.dias <= 10);
  if (prazoClienteCritico.length) {
    insights.push(insight('prazo-cliente', 'prazo', `${prazoClienteCritico.length} prazo(s) de cliente em atenção`, `Mais urgente: ${prazoClienteCritico[0].obra.pp}, ${prazoClienteCritico[0].dias} dia(s).`, 1));
  }

  if (analise.retrabalho.length) {
    const maior = analise.retrabalho[0];
    insights.push(insight('retrabalho', 'risco', `Retrabalho: ${maior.total} ocorrência(s) em ${maior.tipo}`, 'Revisar padrão de causa antes de novas liberações.', 2));
  }

  const paradas = analise.ativas.filter((obra) => {
    const data = obra.atualizadoEm || obra.criadoEm;
    if (!data) return false;
    return (Date.now() - new Date(data).getTime()) / 86400000 >= 7;
  });
  if (paradas.length) {
    insights.push(insight('obras-paradas', 'prazo', `${paradas.length} obra(s) sem movimentação há 7+ dias`, `Primeira: ${paradas[0].pp} - ${paradas[0].cliente}.`, 2));
  }

  if (analise.riscosAtraso.length) {
    const risco = analise.riscosAtraso[0];
    insights.push(insight('risco-futuro', 'risco', 'Risco de atraso antes de vencer', `${risco.obra.pp} tem risco ${risco.risco}% e está parada há ${risco.parada} dia(s).`, 1));
  }

  if (analise.sobrecarga.length) {
    const mes = analise.sobrecarga[0];
    insights.push(insight('sobrecarga', 'capacidade', `Sobrecarga prevista em ${mes.label}`, `${mes.carga} item(ns) projetados para capacidade mensal de 3.`, 1));
  }

  if (new Date().getDay() === 5 && analise.resumoSemanal.totalEventos) {
    insights.push(insight('resumo-semanal', 'agenda', 'Resumo semanal pronto', `${analise.resumoSemanal.obrasMovimentadas} obra(s) movimentadas e ${analise.resumoSemanal.finalizadas} finalizada(s).`, 3));
  }

  if (new Date().getDate() === 1) {
    insights.push(insight('indicadores-mensais', 'ok', 'Indicadores mensais', `${analise.indicadoresMensais.finalizadas} finalizadas, ${analise.indicadoresMensais.retrabalhos} retrabalhos no mês.`, 3));
  }

  biblioteca.slice(0, 2).forEach((item) => {
    insights.push(insight(`biblioteca-${item.id}`, 'biblioteca', `Biblioteca: ${item.titulo}`, item.texto, 4));
  });

  const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const agendaAmanha = atividades.filter((a) => a.data === amanha);
  if (agendaAmanha.length) {
    insights.push(insight('agenda-amanha', 'agenda', `${agendaAmanha.length} atividade(s) amanhã`, 'Confira comunicação com clientes e equipes antes do fim do dia.', 2));
  }

  if (!insights.length) {
    insights.push(insight('ok', 'ok', 'Operação estável', 'Nenhum alerta crítico calculado agora.', 5));
  }

  return insights.sort((a, b) => a.prioridade - b.prioridade);
}

export function responderOffline(pergunta, contexto = {}) {
  const base = gerarInsights(contexto.obras || [], contexto.atividades || [], contexto.biblioteca || []);
  const principal = base[0];
  return `[IA em modo offline]\n\nVocê perguntou: "${pergunta}".\n\n${principal.titulo}. ${principal.texto}\n\nQuando a integração for ativada, vou cruzar obras, agenda, biblioteca e histórico completo antes de responder.`;
}
