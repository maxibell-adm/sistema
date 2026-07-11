import { useMemo, useState } from 'react';
import { carregarUsuarios, usuarioPorRole } from '@/config/usuarios.js';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObras } from '@/modules/obras/useObras.js';
import Modal from '@/modules/ui/Modal.jsx';
import Button from '@/modules/ui/Button.jsx';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function indiceDiaSemana(data) {
  const dia = new Date(`${data}T12:00:00`).getDay();
  return dia || 7;
}

export default function ModalManutencao({ onClose }) {
  const { criarAtividade, atividades } = useApp();
  const { usuario } = useAuth();
  const { obras, atualizarObra } = useObras();
  const responsavelPadrao = usuarioPorRole('medicao')?.nome || usuario.nome;
  const usuarios = carregarUsuarios().filter((item) => item.ativo);
  const [form, setForm] = useState({
    pp: '',
    cliente: '',
    cidade: '',
    tipo: 'Manutenção',
    data: '',
    equipe: responsavelPadrao,
    responsavel: responsavelPadrao,
    responsavelExecucao: responsavelPadrao,
    obraOriginalId: '',
    motivo: '',
    obs: '',
  });
  const [buscaObra, setBuscaObra] = useState('');
  const [obraSelecionada, setObraSelecionada] = useState(null);
  const [mostrarBusca, setMostrarBusca] = useState(true);

  const diaSemana = form.data ? DIAS_SEMANA[new Date(`${form.data}T12:00:00`).getDay()] : null;
  const atividadesDoDia = form.data ? (atividades || []).filter((atividade) => atividade.data === form.data) : [];
  const obrasFiltradas = useMemo(() => {
    if (!buscaObra || buscaObra.trim().length < 2) return [];
    const q = buscaObra.toLowerCase();
    return (obras || [])
      .filter((item) => item.pp?.toLowerCase().includes(q) || item.cliente?.toLowerCase().includes(q))
      .slice(0, 6);
  }, [buscaObra, obras]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function selecionarObra(obra) {
    setObraSelecionada(obra);
    setMostrarBusca(false);
    setBuscaObra('');
    setForm((atual) => ({
      ...atual,
      obraOriginalId: obra.id,
      pp: obra.pp,
      cliente: obra.cliente,
      cidade: obra.cidade || '',
    }));
  }

  function trocarObra() {
    setMostrarBusca(true);
    setObraSelecionada(null);
    setForm((atual) => ({ ...atual, obraOriginalId: '' }));
  }

  function salvar() {
    if (!form.cliente.trim() || !form.data) return;
    const atividade = {
      ...form,
      diaSemana,
      diaDaSemana: indiceDiaSemana(form.data),
      criadoPor: usuario.nome,
      obraId: form.obraOriginalId || null,
    };
    criarAtividade(atividade);

    const original = obras.find((obra) => obra.id === form.obraOriginalId);
    if (original) {
      const agora = new Date();
      const manutencao = {
        id: `manut-${Date.now()}`,
        data: form.data,
        motivo: form.motivo || form.obs,
        responsavel: form.responsavelExecucao,
        criadoPor: usuario.nome,
      };
      atualizarObra(original.id, {
        manutencoes: [manutencao, ...(original.manutencoes || [])],
        historico: [...(original.historico || []), {
          data: agora.toLocaleDateString('pt-BR'),
          hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          usuario: usuario.nome,
          acao: 'Manutenção vinculada',
          desc: `${form.motivo || form.obs || 'Manutenção registrada'} - data ${form.data || 'sem data'}`,
          tipo: 'manutencao',
        }],
      });
    }
    onClose();
  }

  return (
    <Modal
      titulo="Registrar Manutenção"
      onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={!form.cliente.trim() || !form.data}>Registrar</Button></>}
    >
      <div className="form-grid">
        {mostrarBusca ? (
          <div className="form-field full" style={{ position: 'relative' }}>
            <label>Buscar obra vinculada (opcional)</label>
            <input
              value={buscaObra}
              onChange={(e) => setBuscaObra(e.target.value)}
              placeholder="Digite PP ou nome do cliente..."
              autoComplete="off"
            />
            {obrasFiltradas.length > 0 && (
              <div className="obra-busca-dropdown">
                {obrasFiltradas.map((obra) => (
                  <button type="button" key={obra.id} className="obra-busca-item" onMouseDown={() => selecionarObra(obra)}>
                    <span className="fw-700">{obra.pp}</span>
                    <span className="ml-8">{obra.cliente}</span>
                    <span className="text-muted fs-11 ml-8">{obra.cidade}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="form-field full">
            <div className="obra-selecionada-resumo">
              <span className="fw-700">{obraSelecionada.pp}</span>
              <span className="ml-8">{obraSelecionada.cliente}</span>
              <span className="text-muted fs-11 ml-8">{obraSelecionada.cidade}</span>
              <button type="button" className="trocar-obra-btn" onClick={trocarObra}>Trocar</button>
            </div>
          </div>
        )}
        <div className="form-field"><label>PP</label><input value={form.pp} onChange={(e) => set('pp', e.target.value)} /></div>
        <div className="form-field"><label>Cliente</label><input value={form.cliente} onChange={(e) => set('cliente', e.target.value)} /></div>
        <div className="form-field"><label>Cidade</label><input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} /></div>
        <div className="form-field">
          <label>Data *</label>
          <input type="date" value={form.data} onChange={(e) => set('data', e.target.value)} />
          {diaSemana && <div className="agenda-dia-label">{diaSemana}</div>}
        </div>
        <div className="form-field">
          <label>Responsável pela execução</label>
          <input
            list="responsaveis-execucao"
            value={form.responsavelExecucao}
            onChange={(e) => {
              set('responsavelExecucao', e.target.value);
              set('responsavel', e.target.value);
              set('equipe', e.target.value);
            }}
          />
        </div>
        {atividadesDoDia.length > 0 && (
          <div className="form-field full">
            <div className="agenda-dia-info">
              <div className="fs-11 fw-700 mb-6">Já agendado para {diaSemana} ({atividadesDoDia.length} item(ns)):</div>
              {atividadesDoDia.map((atividade, index) => (
                <div key={`${atividade.id || atividade.cliente}-${index}`} className="fs-11 text-muted">
                  {atividade.tipo} - {atividade.cliente} ({atividade.cidade || atividade.local || '-'})
                  {atividade.cidade === form.cidade && form.cidade && <span className="ml-6 agenda-mesma-cidade">Mesma cidade</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="form-field full"><label>Motivo da manutenção</label><input value={form.motivo} onChange={(e) => set('motivo', e.target.value)} placeholder="Ex: ajuste de roldana, vedação, revisão de instalação" /></div>
        <div className="form-field full"><label>Pendência / relato</label><textarea value={form.obs} onChange={(e) => set('obs', e.target.value)} /></div>
      </div>
      <datalist id="responsaveis-execucao">{usuarios.map((item) => <option key={item.id}>{item.nome}</option>)}<option>Equipe 1</option><option>Equipe 2</option><option>Motorista</option></datalist>
    </Modal>
  );
}
