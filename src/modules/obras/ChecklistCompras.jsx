import { useState } from 'react';
import { ITENS_COMPRA, STATUS_COMPRA, STATUS_SEPARACAO } from '@/config/constantes.js';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import { usePermissoes } from '@/modules/auth/usePermissoes.js';
import Badge from '@/modules/ui/Badge.jsx';

export default function ChecklistCompras({ obra }) {
  const { podeEditarCompras } = usePermissoes();
  const { atualizarCompra } = useObrasContext();
  const etapasPosMontagem = ['montagem', 'entrega', 'instalacao', 'finalizado', 'manutencao'];
  const somenteLeitura = etapasPosMontagem.includes(obra.etapa) && !obra.ehCardOC;
  const [colapsado, setColapsado] = useState(somenteLeitura);
  if (!['compras', 'montagem', 'entrega', 'instalacao', 'finalizado', 'manutencao'].includes(obra.etapa)) return null;

  const podeEditar = podeEditarCompras && !somenteLeitura;
  const tudoOK = ['vidro', 'acessorios', 'perfil'].every((item) => obra.compras?.[item]?.status === 'ok');

  function itemConfig(itemId) {
    return ITENS_COMPRA.find((item) => item.id === itemId) || { prazo_dias: 0 };
  }

  function statusLabel(status, separacao = false) {
    const lista = separacao ? STATUS_SEPARACAO : STATUS_COMPRA;
    return lista.find((s) => s.id === status)?.label || 'Pendente';
  }

  function statusBlocoVidro(compras) {
    return compras?.vidro?.status === 'ok' ? '✅' : '⬜';
  }

  function statusBlocoAcessorios(compras) {
    const separacaoOk = compras?.acessorios_separacao?.status === 'realizada';
    const compraOk = compras?.acessorios?.status === 'ok';
    return separacaoOk && compraOk ? '✅' : separacaoOk ? '🔄' : '⬜';
  }

  function statusBlocoPerfil(compras) {
    const separacaoOk = compras?.perfil_separacao?.status === 'realizada';
    const compraOk = compras?.perfil?.status === 'ok';
    return separacaoOk && compraOk ? '✅' : separacaoOk ? '🔄' : '⬜';
  }

  function estaAtrasado(compra, itemId) {
    if (compra.status !== 'aguardando_entrega' || !compra.dataPedido) return false;
    const limite = new Date(`${compra.dataPedido}T00:00:00`);
    limite.setDate(limite.getDate() + itemConfig(itemId).prazo_dias);
    return new Date() > limite;
  }

  function setStatus(itemId, novoStatus) {
    const patch = { status: novoStatus };
    if (novoStatus === 'ok' || novoStatus === 'realizada') {
      patch.dataConcluidoEm = new Date().toLocaleDateString('pt-BR');
    }
    if (itemId === 'vidro' && novoStatus === 'aguardando_entrega' && !obra.compras?.vidro?.fornecedor) {
      patch.fornecedor = 'Total Temper';
    }
    atualizarCompra(obra.id, itemId, patch);
  }

  function CardSeparacao({ itemId, label }) {
    const compra = obra.compras?.[itemId] || {};
    const realizada = compra.status === 'realizada';
    const [destravado, setDestravado] = useState(false);
    const podeEditarAgora = podeEditar && (!realizada || destravado);

    return (
      <div className={`checklist-card ${realizada && !destravado ? 'separacao-realizada' : ''}`}>
        <div className="checklist-card-titulo-row">
          <span className="checklist-card-titulo">{label}</span>
          {realizada && (
            <button
              className={`cadeado-btn ${destravado ? 'aberto' : 'fechado'}`}
              onClick={() => setDestravado((valor) => !valor)}
              title={destravado ? 'Bloquear edição' : 'Clique para editar'}
            >
              {destravado ? '🔓' : '🔒'}
            </button>
          )}
        </div>
        {podeEditarAgora ? (
          <div className="compra-campos">
            <select
              value={compra.status || 'pendente'}
              onChange={(e) => {
                const patch = { status: e.target.value };
                if (e.target.value === 'realizada' && !compra.dataRealizacao) {
                  patch.dataRealizacao = new Date().toISOString().split('T')[0];
                }
                atualizarCompra(obra.id, itemId, patch);
                if (e.target.value !== 'realizada') setDestravado(false);
              }}
            >
              {STATUS_SEPARACAO.map((s) => <option value={s.id} key={s.id}>{s.label}</option>)}
            </select>
            <input
              type="text"
              placeholder="Fornecedor (opcional)"
              value={compra.fornecedor || ''}
              autoComplete="off"
              onChange={(e) => atualizarCompra(obra.id, itemId, { fornecedor: e.target.value })}
            />
            <input
              type="date"
              value={compra.dataRealizacao || ''}
              onChange={(e) => atualizarCompra(obra.id, itemId, { dataRealizacao: e.target.value })}
            />
            <textarea
              placeholder="Observação"
              value={compra.obs || ''}
              onChange={(e) => atualizarCompra(obra.id, itemId, { obs: e.target.value })}
            />
          </div>
        ) : (
          <div className="compra-readonly">
            <div className="separacao-ok-display">
              <span className={`badge ${compra.status === 'realizada' ? 'badge-ok' : 'badge-alerta'}`}>
                {compra.status === 'realizada' ? '✓ Realizada' : statusLabel(compra.status, true)}
              </span>
              {compra.dataRealizacao && (
                <span className="fs-11 text-muted">em {new Date(`${compra.dataRealizacao}T00:00:00`).toLocaleDateString('pt-BR')}</span>
              )}
            </div>
            {compra.fornecedor && <div className="fs-11 text-muted">{compra.fornecedor}</div>}
            {compra.obs && <div className="fs-11 text-muted">{compra.obs}</div>}
            {podeEditar && realizada && <div className="fs-10 text-muted mt-4">Clique no 🔒 para editar</div>}
          </div>
        )}
      </div>
    );
  }

  function CardCompra({ itemId, label, bloqueadoPor }) {
    const compra = obra.compras?.[itemId] || {};
    const bloqueado = bloqueadoPor && obra.compras?.[bloqueadoPor]?.status !== 'realizada';
    const atrasado = estaAtrasado(compra, itemId);
    const isVidro = itemId === 'vidro';

    return (
      <div className={`checklist-card ${bloqueado ? 'bloqueado' : ''}`}>
        <div className="checklist-card-titulo">{label}</div>
        {bloqueado ? (
          <div className="fs-11 text-muted">Aguardando separação</div>
        ) : podeEditar ? (
          <div className="compra-campos">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={compra.status || 'pendente'} onChange={(e) => setStatus(itemId, e.target.value)}>
                {STATUS_COMPRA.map((s) => <option value={s.id} key={s.id}>{s.label}</option>)}
              </select>
              {atrasado && <Badge classe="badge-vencido">Atrasado</Badge>}
            </div>
            <input
              type="text"
              placeholder={isVidro ? 'Total Temper' : 'Fornecedor'}
              value={compra.fornecedor || (isVidro ? 'Total Temper' : '')}
              autoComplete="off"
              onChange={(e) => atualizarCompra(obra.id, itemId, { fornecedor: e.target.value })}
            />
            <input
              type="date"
              value={compra.dataPedido || ''}
              onChange={(e) => atualizarCompra(obra.id, itemId, { dataPedido: e.target.value })}
            />
            <textarea
              placeholder="Observação (ex: Previsão 10/07)"
              value={compra.obs || ''}
              onChange={(e) => atualizarCompra(obra.id, itemId, { obs: e.target.value })}
            />
          </div>
        ) : (
          <div className="compra-readonly">
            <Badge classe={compra.status === 'ok' ? 'badge-ok' : 'badge-alerta'}>
              {statusLabel(compra.status)}
            </Badge>
            {(compra.dataConcluidoEm || compra.dataRealizacao) && (
              <div className="fs-10 text-muted" style={{ marginTop: 3 }}>
                ✓ {compra.dataConcluidoEm || compra.dataRealizacao}
              </div>
            )}
            {atrasado && <Badge classe="badge-vencido">Atrasado</Badge>}
            {compra.fornecedor && <div className="fs-11 text-muted">{compra.fornecedor}</div>}
            {compra.dataPedido && <div className="fs-11 text-muted">{compra.dataPedido}</div>}
            {compra.obs && <div className="fs-11 text-muted">{compra.obs}</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className={`detail-section card card-pad ${somenteLeitura ? 'compras-readonly' : ''}`}>
      <div className="section-hdr" style={{ cursor: somenteLeitura ? 'pointer' : 'default' }} onClick={() => somenteLeitura && setColapsado((valor) => !valor)}>
        <div className="section-titulo">{tudoOK ? '✅' : '🔄'} Checklist de Compras</div>
        {somenteLeitura && <span className="fs-11 text-muted">{colapsado ? '▼ ver detalhes' : '▲ ocultar'}</span>}
      </div>

      {!colapsado && (
        <>
      <div className="checklist-bloco">
        <div className="checklist-bloco-titulo">{statusBlocoVidro(obra.compras)} VIDRO</div>
        <CardCompra itemId="vidro" label="Compra / Entrega" />
      </div>

      <div className="checklist-bloco">
        <div className="checklist-bloco-titulo">{statusBlocoAcessorios(obra.compras)} ACESSÓRIOS</div>
        <div className="checklist-cards-row">
          <CardSeparacao itemId="acessorios_separacao" label="Separação" />
          <div className="checklist-seta">→</div>
          <CardCompra itemId="acessorios" label="Compra / Entrega" bloqueadoPor="acessorios_separacao" />
        </div>
      </div>

      <div className="checklist-bloco">
        <div className="checklist-bloco-titulo">{statusBlocoPerfil(obra.compras)} PERFIL DE ALUMÍNIO</div>
        <div className="checklist-cards-row">
          <CardSeparacao itemId="perfil_separacao" label="Separação Estoque" />
          <div className="checklist-seta">→</div>
          <CardCompra itemId="perfil" label="Compra / Entrega" bloqueadoPor="perfil_separacao" />
        </div>
      </div>
        </>
      )}
    </section>
  );
}
