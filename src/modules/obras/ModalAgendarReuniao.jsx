import { useMemo, useState } from 'react';
import { carregarUsuarios, usuarioPorRole } from '@/config/usuarios.js';
import Modal from '@/modules/ui/Modal.jsx';
import Button from '@/modules/ui/Button.jsx';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function indiceDiaSemana(data) {
  const dia = new Date(`${data}T12:00:00`).getDay();
  return dia || 7;
}

export default function ModalAgendarReuniao({ onClose }) {
  const { criarAtividade, atividades } = useApp();
  const { obras } = useObrasContext();
  const { usuario } = useAuth();
  const usuarios = carregarUsuarios().filter((item) => item.ativo);
  const responsavelPadrao = usuarioPorRole('medicao')?.nome || usuario.nome;
  const [form, setForm] = useState({
    pp: '',
    cliente: '',
    local: '',
    data: '',
    hora: '',
    responsavel: responsavelPadrao,
    obs: '',
  });
  const [buscaObra, setBuscaObra] = useState('');
  const [obraSelecionada, setObraSelecionada] = useState(null);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const diaSemana = form.data ? DIAS_SEMANA[new Date(`${form.data}T12:00:00`).getDay()] : null;
  const atividadesDoDia = form.data ? (atividades || []).filter((atividade) => atividade.data === form.data) : [];
  const obrasFiltradas = useMemo(() => {
    if (!buscaObra || buscaObra.trim().length < 2) return [];
    const q = buscaObra.toLowerCase();
    return (obras || [])
      .filter((item) => item.pp?.toLowerCase().includes(q) || item.cliente?.toLowerCase().includes(q))
      .slice(0, 6);
  }, [buscaObra, obras]);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function selecionarObra(item) {
    setObraSelecionada(item);
    setBuscaObra(`${item.pp} - ${item.cliente}`);
    setForm((f) => ({
      ...f,
      pp: item.pp,
      cliente: item.cliente,
      local: item.cidade || '',
    }));
    setMostrarSugestoes(false);
  }

  function salvar() {
    if (!form.cliente.trim() || !form.data) return;
    criarAtividade({
      tipo: 'Reunião Comercial',
      pp: form.pp,
      cliente: form.cliente,
      cidade: form.local,
      local: form.local,
      data: form.data,
      diaSemana,
      diaDaSemana: indiceDiaSemana(form.data),
      hora: form.hora,
      responsavel: form.responsavel,
      responsavelExecucao: form.responsavel,
      obs: form.obs,
      obraId: obraSelecionada?.id || null,
      criadoPor: usuario.nome,
    });
    onClose();
  }

  return (
    <Modal
      titulo="Agendar Reunião Comercial"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="success" onClick={salvar} disabled={!form.cliente.trim() || !form.data}>Agendar</Button>
        </>
      )}
    >
      <div className="form-grid">
        <div className="form-field full" style={{ position: 'relative' }}>
          <label>Buscar obra (opcional)</label>
          <input
            value={buscaObra}
            onChange={(e) => {
              setBuscaObra(e.target.value);
              setMostrarSugestoes(true);
              if (!e.target.value) setObraSelecionada(null);
            }}
            placeholder="Digite PP ou cliente, ou preencha abaixo"
            autoComplete="off"
            onFocus={() => setMostrarSugestoes(true)}
          />
          {mostrarSugestoes && obrasFiltradas.length > 0 && (
            <div className="obra-busca-dropdown">
              {obrasFiltradas.map((item) => (
                <button type="button" key={item.id} className="obra-busca-item" onMouseDown={() => selecionarObra(item)}>
                  <span className="fw-700">{item.pp}</span>
                  <span className="ml-8">{item.cliente}</span>
                  <span className="text-muted fs-11 ml-8">{item.cidade}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="form-field full">
          <label>Cliente / Prospect *</label>
          <input value={form.cliente} onChange={(e) => set('cliente', e.target.value)} placeholder="Nome do cliente ou empresa" autoComplete="off" />
        </div>
        <div className="form-field">
          <label>Local</label>
          <input value={form.local} onChange={(e) => set('local', e.target.value)} placeholder="Cidade ou endereço" autoComplete="off" />
        </div>
        <div className="form-field">
          <label>Data *</label>
          <input type="date" value={form.data} onChange={(e) => set('data', e.target.value)} />
          {diaSemana && <div className="agenda-dia-label">{diaSemana}</div>}
        </div>
        <div className="form-field"><label>Horário</label><input type="time" value={form.hora} onChange={(e) => set('hora', e.target.value)} /></div>
        <div className="form-field full">
          <label>Responsável</label>
          <select value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)}>
            {usuarios.map((item) => <option value={item.nome} key={item.id}>{item.nome}</option>)}
          </select>
        </div>
        {atividadesDoDia.length > 0 && (
          <div className="form-field full">
            <div className="agenda-dia-info">
              <div className="fs-11 fw-700 mb-6">Já agendado para {diaSemana} ({atividadesDoDia.length} item(ns)):</div>
              {atividadesDoDia.map((atividade, index) => (
                <div key={`${atividade.id || atividade.cliente}-${index}`} className="fs-11 text-muted">
                  {atividade.tipo} - {atividade.cliente} ({atividade.cidade || atividade.local || '-'})
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="form-field full">
          <label>Observações</label>
          <textarea value={form.obs} onChange={(e) => set('obs', e.target.value)} placeholder="Pauta, objetivo da reunião..." />
        </div>
      </div>
    </Modal>
  );
}
