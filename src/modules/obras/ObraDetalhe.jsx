import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ETAPAS, labelEtapa } from '@/config/etapas.js';
import { usuarioPorRole } from '@/config/usuarios.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import { useObras } from '@/modules/obras/useObras.js';
import { calcPrazo } from '@/rules/prazosRules.js';
import { diasParaPrazoCliente } from '@/rules/eventosRules.js';
import { usuarioPorNome } from '@/rules/alertas.js';
import ArquivosObra from './ArquivosObra.jsx';
import ChecklistCompras from './ChecklistCompras.jsx';
import DiarioInstalacao from './DiarioInstalacao.jsx';
import FasesObra from './FasesObra.jsx';
import HistoricoObra from './HistoricoObra.jsx';
import ModalAvancarEtapa from './ModalAvancarEtapa.jsx';
import ModalIniciarMontagem from './ModalIniciarMontagem.jsx';
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
  const { atualizarVhsys, atualizarObra, gerarNotificacao } = useObrasContext();
  const [modal, setModal] = useState(false);
  const [modalMontagem, setModalMontagem] = useState(false);
  const [confirmarVhsys, setConfirmarVhsys] = useState(null);
  const [modalCondicaoEspecial, setModalCondicaoEspecial] = useState(false);
  const [condicaoTexto, setCondicaoTexto] = useState('');
  const obra = obrasVisiveis.find((o) => o.id === id);

  if (!obra) return <div className="empty-state">Obra não encontrada ou sem permissão de visualização.</div>;
  if (usuario.role === 'projetos') return <ObraDetalheAllana obra={obra} />;

  const etapa = ETAPAS.find((e) => e.id === obra.etapa);
  const prazo = calcPrazo(obra.prazo);
  const diasCliente = diasParaPrazoCliente(obra.prazoCliente);
  const resp = usuarioPorNome(obra.responsavel);
  const verFinanceiro = ['admin', 'supervisor', 'comercial', 'medicao'].includes(usuario.role);
  const podeEditarVhsys = ['admin', 'operacional'].includes(usuario.role);
  const temContramarco = obra.tipo?.includes('COM CONTRAMARCO');
  const podeVerObsInterna = usuario.role === 'admin' || obra.responsavel === usuario.nome;
  const podeRegistrarCondicaoEspecial = usuario.role === 'medicao' && obra.responsavel === usuario.nome;

  function valorVhsys(campo) {
    if (campo === 'vhsysEsquadria') return obra.vhsysEsquadria || obra.vhsysPedidos?.[0] || '';
    return obra.vhsysContramarco || obra.vhsysPedidos?.[1] || '';
  }

  // Estado local para o campo VHSYS durante edição
  const [vhsysLocal, setVhsysLocal] = useState({});

  function handleVhsysChange(campo, novoValor) {
    // Só atualiza o estado local enquanto digita — não salva a cada tecla
    setVhsysLocal((prev) => ({ ...prev, [campo]: novoValor }));
  }

  function handleVhsysBlur(campo) {
    const novoValor = vhsysLocal[campo] ?? valorVhsys(campo);
    const valorAtual = valorVhsys(campo);
    if (novoValor === valorAtual) return; // nada mudou
    if (valorAtual.trim() && novoValor !== valorAtual) {
      // Já tinha valor — pedir confirmação ao sair do campo
      setConfirmarVhsys({ campo, novoValor, valorAtual });
      return;
    }
    // Campo vazio sendo preenchido — salvar direto
    atualizarVhsys(obra.id, campo, novoValor);
    setVhsysLocal((prev) => ({ ...prev, [campo]: undefined }));
  }

  function valorVhsysDisplay(campo) {
    // Mostrar valor local enquanto edita, valor salvo quando não está editando
    return vhsysLocal[campo] ?? valorVhsys(campo);
  }

  function confirmarInicioMontagem() {
    const agora = new Date();
    atualizarObra(obra.id, {
      montagemIniciada: true,
      montagemIniciadaEm: agora.toISOString(),
      historico: [...(obra.historico || []), {
        data: agora.toLocaleDateString('pt-BR'),
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        usuario: usuario.nome,
        acao: 'Montagem iniciada',
        desc: 'Checklist de produção confirmado. Montagem autorizada.',
        tipo: 'etapa',
      }],
    });
    gerarNotificacao({
      para: usuarioPorRole('admin')?.nome,
      texto: `Montagem iniciada: ${obra.pp} — ${obra.cliente}. Checklist de produção confirmado por ${usuario.nome}.`,
      tipo: 'sucesso',
      cor: '#27AE60',
      obraId: obra.id,
    });
    setModalMontagem(false);
  }

  function abrirModalCondicaoEspecial() {
    setCondicaoTexto(obra.condicaoEspecial?.texto || '');
    setModalCondicaoEspecial(true);
  }

  function salvarCondicaoEspecial() {
    const texto = condicaoTexto.trim();
    if (!texto) return;
    const agora = new Date();
    atualizarObra(obra.id, {
      condicaoEspecial: {
        texto,
        registradaEm: agora.toLocaleDateString('pt-BR'),
        registradaPor: usuario.nome,
        ativa: true,
      },
      historico: [...(obra.historico || []), {
        data: agora.toLocaleDateString('pt-BR'),
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        usuario: usuario.nome,
        acao: 'Condição especial registrada',
        desc: texto,
        tipo: 'condicao_especial',
      }],
    });
    setModalCondicaoEspecial(false);
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
                        value={valorVhsysDisplay('vhsysEsquadria')}
                        onChange={(e) => handleVhsysChange('vhsysEsquadria', e.target.value)}
                        onBlur={() => handleVhsysBlur('vhsysEsquadria')}
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
                          value={valorVhsysDisplay('vhsysContramarco')}
                          onChange={(e) => handleVhsysChange('vhsysContramarco', e.target.value)}
                          onBlur={() => handleVhsysBlur('vhsysContramarco')}
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
                {obra.etapa === 'montagem' && !obra.montagemIniciada && ['admin', 'operacional'].includes(usuario.role) && (
                  <Button variant="success" onClick={() => setModalMontagem(true)}>
                    ▶ Iniciar Montagem
                  </Button>
                )}
                {obra.etapa === 'montagem' && obra.montagemIniciada && (
                  <span className="badge badge-ok">✅ Montagem em andamento</span>
                )}
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
            {podeRegistrarCondicaoEspecial && (
              <div style={{ marginTop: 12 }}>
                <Button variant="warning" onClick={abrirModalCondicaoEspecial}>
                  {obra.condicaoEspecial?.ativa ? '⚠ Ver / Editar Condição Especial' : '⚠ Registrar Condição Especial'}
                </Button>
              </div>
            )}
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
          {obra.etapa === 'instalacao' && (
            <>
              {!obra.dataAgendada && (
                <div style={{
                  background: '#FEF3C7', border: '1px solid #F59E0B',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 12,
                  fontSize: 13, color: '#92400E', display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  ⚠️ Instalação ainda sem data agendada. Use o botão Agendar para definir a data.
                </div>
              )}
              {obra.dataAgendada && !obra.instalacaoIniciada && (
                <div style={{
                  background: '#F0FDF4', border: '1px solid var(--verde)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 12,
                  fontSize: 13, color: 'var(--verde)', display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  ✅ Instalação agendada para {obra.dataAgendada}. Preencha o diário ao iniciar no local.
                </div>
              )}
              {obra.instalacaoIniciada && (
                <div style={{ marginBottom: 8 }}>
                  <span className="badge badge-ok">
                    ✅ Instalação em andamento desde {new Date(obra.instalacaoIniciadaEm).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
              <DiarioInstalacao obra={obra} />
            </>
          )}
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
      {modalMontagem && (
        <ModalIniciarMontagem
          obra={obra}
          onClose={() => setModalMontagem(false)}
          onConfirmar={confirmarInicioMontagem}
        />
      )}
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
      {modalCondicaoEspecial && (
        <Modal
          titulo="Registrar Condição Especial"
          onClose={() => setModalCondicaoEspecial(false)}
          footer={<><Button variant="secondary" onClick={() => setModalCondicaoEspecial(false)}>Cancelar</Button><Button variant="warning" disabled={!condicaoTexto.trim()} onClick={salvarCondicaoEspecial}>Registrar</Button></>}
        >
          <p className="fs-12 text-muted mb-12">
            Registre aqui qualquer condição desta obra que a Allana precisa saber antes de projetar. Ex: puxador não definido, porta que mudou de medida, cliente com restrição de horário.
          </p>
          <div className="form-field full">
            <label>Condição especial *</label>
            <textarea
              value={condicaoTexto}
              onChange={(e) => setCondicaoTexto(e.target.value)}
              placeholder="Descreva a condição especial observada nesta obra."
              rows={5}
              autoFocus
            />
          </div>
        </Modal>
      )}
    </>
  );
}
