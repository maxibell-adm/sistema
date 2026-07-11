import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ETAPAS, labelEtapa } from '@/config/etapas.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import { useObras } from '@/modules/obras/useObras.js';
import { calcPrazo } from '@/rules/prazosRules.js';
import { calcularSaudeObra, diasParaPrazoCliente } from '@/rules/eventosRules.js';
import { usuarioPorNome } from '@/rules/alertas.js';
import ArquivosObra from './ArquivosObra.jsx';
import ChecklistCompras from './ChecklistCompras.jsx';
import DiarioInstalacao from './DiarioInstalacao.jsx';
import FasesObra from './FasesObra.jsx';
import HistoricoObra from './HistoricoObra.jsx';
import ModalAvancarEtapa from './ModalAvancarEtapa.jsx';
import ObraDetalheAllana from './ObraDetalheAllana.jsx';
import ProximaAcao from './ProximaAcao.jsx';
import Badge from '@/modules/ui/Badge.jsx';
import BotaoVoltar from '@/modules/ui/BotaoVoltar.jsx';
import Button from '@/modules/ui/Button.jsx';
import Modal from '@/modules/ui/Modal.jsx';

function ObsInterna({ obra }) {
  const { salvarObsInterna } = useObrasContext();
  const chave = `maxibell.obs.${obra.id}.${obra.etapa}`;
  const [obs, setObs] = useState(() => localStorage.getItem(chave) || '');

  function salvar(valor) {
    setObs(valor);
    salvarObsInterna(obra.id, obra.etapa, valor);
  }

  const [salvo, setSalvo] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        className="obs-interna-textarea"
        value={obs}
        onChange={(e) => { setObs(e.target.value); setSalvo(false); }}
        placeholder="Anote aqui observações, pendências ou lembretes desta etapa. Este campo se apaga quando a etapa avançar."
        rows={3}
      />
      <button
        className="btn btn-primary btn-sm"
        style={{ alignSelf: 'flex-end' }}
        onClick={() => { salvar(obs); setSalvo(true); setTimeout(() => setSalvo(false), 2000); }}
        disabled={!obs.trim()}
      >
        {salvo ? '✓ Salvo' : 'Salvar'}
      </button>
    </div>
  );
}

export default function ObraDetalhe() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const { obrasVisiveis } = useObras();
  const { atualizarVhsys, atualizarObra } = useObrasContext();
  const [modal, setModal] = useState(false);
  const [confirmarVhsys, setConfirmarVhsys] = useState(null);
  const obra = obrasVisiveis.find((o) => o.id === id);

  if (!obra) return <div className="empty-state">Obra não encontrada ou sem permissão de visualização.</div>;
  if (usuario.role === 'projetos') return <ObraDetalheAllana obra={obra} />;

  const etapa = ETAPAS.find((e) => e.id === obra.etapa);
  const prazo = calcPrazo(obra.prazo);
  const saude = calcularSaudeObra(obra);
  const diasCliente = diasParaPrazoCliente(obra.prazoCliente);
  const resp = usuarioPorNome(obra.responsavel);
  const verFinanceiro = ['admin', 'supervisor', 'comercial', 'medicao'].includes(usuario.role);
  const podeEditarVhsys = ['admin', 'operacional'].includes(usuario.role);
  const temContramarco = obra.tipo?.includes('COM CONTRAMARCO');
  const podeVerObsInterna = usuario.role === 'admin' || obra.responsavel === usuario.nome;

  function valorVhsys(campo) {
    if (campo === 'vhsysEsquadria') return obra.vhsysEsquadria || obra.vhsysPedidos?.[0] || '';
    return obra.vhsysContramarco || obra.vhsysPedidos?.[1] || '';
  }

  function handleVhsysChange(campo, novoValor) {
    const valorAtual = valorVhsys(campo);
    if (valorAtual.trim() && novoValor !== valorAtual) {
      setConfirmarVhsys({ campo, novoValor, valorAtual });
      return;
    }
    atualizarVhsys(obra.id, campo, novoValor);
  }

  return (
    <>
      <div className="detalhe-grid">
        <div>
          <section className="card obra-header" style={{ borderTopColor: obra.pendencia?.aberta ? 'var(--laranja)' : etapa?.cor }}>
            <BotaoVoltar para="/obras" />
            <div className="obra-header-main">
              <div>
                <div className="obra-cliente">{obra.pp} - {obra.cliente}</div>
                <div className="obra-vhsys-row">
                  <div className="vhsys-card vhsys-esquadria">
                    <div className="vhsys-card-label">VHSYS <span className="vhsys-badge vhsys-e">E</span></div>
                    {podeEditarVhsys ? (
                      <input
                        className="vhsys-input"
                        placeholder="Nº do pedido"
                        value={valorVhsys('vhsysEsquadria')}
                        onChange={(e) => handleVhsysChange('vhsysEsquadria', e.target.value)}
                      />
                    ) : (
                      <div className="vhsys-numero">{obra.vhsysEsquadria || obra.vhsysPedidos?.[0] || 'Pendente'}</div>
                    )}
                  </div>
                  {temContramarco && (
                    <div className="vhsys-card vhsys-contramarco">
                      <div className="vhsys-card-label">VHSYS <span className="vhsys-badge vhsys-cm">CM</span></div>
                      {podeEditarVhsys ? (
                        <input
                          className="vhsys-input"
                          placeholder="Nº do contramarco"
                          value={valorVhsys('vhsysContramarco')}
                          onChange={(e) => handleVhsysChange('vhsysContramarco', e.target.value)}
                        />
                      ) : (
                        <div className="vhsys-numero">{obra.vhsysContramarco || obra.vhsysPedidos?.[1] || 'Pendente'}</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-muted">{obra.cidade} - {obra.tipo}</div>
                <div className="obra-responsavel-destaque">
                  <span className="fs-12 text-muted">Com quem está:</span>
                  <span className="avatar grande" style={{ background: resp.cor }}>{resp.avatar}</span>
                  <span><b>{resp.nome}</b><small>{resp.cargo}</small></span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {obra.pendencia?.aberta && <Badge classe="badge-alerta">Pendência</Badge>}
                <Badge classe="badge-info">{labelEtapa(obra.etapa)}</Badge>
                <Badge classe={prazo.classe}>{prazo.label}</Badge>
              </div>
            </div>
            <div className="obra-meta-line">
              {verFinanceiro && <span>Valor: {obra.valor || '-'}</span>}
              {verFinanceiro && <span>Pagamento: {obra.pagamento || '-'}</span>}
              <span>Fechamento: {obra.fechamento || '-'}</span>
              {obra.prazoCliente && (
                <span className={`prazo-cliente-badge ${diasCliente <= 10 ? 'critico' : diasCliente <= 20 ? 'atencao' : 'ok'}`}>
                  Prazo cliente: {new Date(`${obra.prazoCliente}T00:00:00`).toLocaleDateString('pt-BR')}
                  {diasCliente <= 10 && <span> - {diasCliente}d restantes</span>}
                </span>
              )}
            </div>
            <div className={`saude-obra saude-${saude.nivel}`}>
              <div className="saude-obra-top">
                <span>Termômetro da obra</span>
                <strong>{saude.valor}%</strong>
              </div>
              <div className="saude-barra"><span style={{ width: `${saude.valor}%` }} /></div>
            </div>
            {obra.condicaoEspecial?.ativa && (
              <div className="condicao-especial-box">
                <div className="section-titulo">Condição especial</div>
                <div className="text-muted fs-11">Registrada em {obra.condicaoEspecial.registradaEm}</div>
                <div className="condicao-especial-texto">{obra.condicaoEspecial.texto}</div>
                {usuario.role === 'admin' && (
                  <button className="btn btn-secondary btn-sm mt-8" onClick={() => atualizarObra(obra.id, { condicaoEspecial: { ...obra.condicaoEspecial, ativa: false } })}>
                    Marcar como resolvida
                  </button>
                )}
              </div>
            )}
          </section>
          <FasesObra obra={obra} />
          {!!(obra.manutencoes || []).length && (
            <section className="card card-pad mb-16">
              <div className="section-titulo mb-12">Histórico de manutenções</div>
              {(obra.manutencoes || []).map((manutencao) => (
                <div className="manutencao-vinculada-item" key={manutencao.id}>
                  <strong>{manutencao.data || 'Sem data'} - {manutencao.motivo}</strong>
                  <span>{manutencao.responsavel} - registrado por {manutencao.criadoPor}</span>
                </div>
              ))}
            </section>
          )}
          <div className="detail-section"><ProximaAcao obra={obra} onAvancar={() => setModal(true)} /></div>
          {obra.etapa === 'instalacao' && <DiarioInstalacao obra={obra} />}
          <ChecklistCompras obra={obra} />
          <ArquivosObra obra={obra} />
          {podeVerObsInterna && (
            <section className="detail-section card card-pad">
              <div className="section-hdr">
                <div className="section-titulo">Rascunho interno</div>
                <div className="fs-11 text-muted">Visível só para você e Álvaro. Apaga ao avançar a etapa.</div>
              </div>
              <ObsInterna obra={obra} />
            </section>
          )}
        </div>
        <aside>
          <HistoricoObra obra={obra} />
        </aside>
      </div>
      {modal && <ModalAvancarEtapa obra={obra} onClose={() => setModal(false)} />}
      {confirmarVhsys && (
        <Modal
          titulo="Alterar número VHSYS"
          onClose={() => setConfirmarVhsys(null)}
          footer={<><Button variant="secondary" onClick={() => setConfirmarVhsys(null)}>Cancelar</Button><Button variant="warning" onClick={() => { atualizarVhsys(obra.id, confirmarVhsys.campo, confirmarVhsys.novoValor); setConfirmarVhsys(null); }}>Confirmar alteração</Button></>}
        >
          <p>O número atual é <strong>{confirmarVhsys.valorAtual}</strong>.</p>
          <p className="mt-8">Tem certeza que deseja alterar para <strong>{confirmarVhsys.novoValor}</strong>?</p>
          <p className="mt-8 text-muted fs-11">Esta alteração será registrada no histórico da obra.</p>
        </Modal>
      )}
    </>
  );
}
