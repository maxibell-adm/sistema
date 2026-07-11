import { labelEtapa } from '@/config/etapas.js';
import { carregarUsuarios } from '@/config/usuarios.js';
import { analisarObras } from '@/modules/ia/analiseDados.js';

export function montarContextoIA({ obras = [], atividades = [], usuario = null } = {}) {
  const analise = analisarObras(obras);
  const usuarios = carregarUsuarios().filter((item) => item.ativo);

  return {
    usuario,
    usuarios,
    analise,
    obrasResumo: obras.slice(0, 80).map((obra) => ({
      id: obra.id,
      pp: obra.pp,
      cliente: obra.cliente,
      cidade: obra.cidade,
      etapa: obra.etapa,
      etapaLabel: labelEtapa(obra.etapa),
      responsavel: obra.responsavel,
      prazo: obra.prazo,
      prazoCliente: obra.prazoCliente || null,
      pendencia: obra.pendencia?.aberta ? obra.pendencia : null,
      condicaoEspecial: obra.condicaoEspecial?.ativa ? obra.condicaoEspecial : null,
    })),
    atividadesResumo: atividades.slice(0, 80),
  };
}

export function resumoContextoTexto(contexto) {
  return [
    `Obras ativas: ${contexto.analise.totalAtivas}`,
    `Criticas: ${contexto.analise.criticas.length}`,
    `Prazos de cliente em atencao: ${contexto.analise.prazosCliente.length}`,
    `Usuario: ${contexto.usuario?.nome || 'nao informado'} (${contexto.usuario?.role || 'sem perfil'})`,
  ].join('\n');
}
