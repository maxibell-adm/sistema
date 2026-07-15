import { useMemo, useState } from 'react';
import { carregarUsuarios, usuarioPorRole } from '@/config/usuarios.js';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import Modal from '@/modules/ui/Modal.jsx';
import Button from '@/modules/ui/Button.jsx';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function indiceDiaSemana(data) {
  const dia = new Date(`${data}T12:00:00`).getDay();
  return dia || 7;
}

export default function ModalAgendarMedicao({ onClose, tipoInicial = 'Medição Inicial', obra = null }) {
  const { criarAtividade, atividades } = useApp();
  const { obras } = useObrasContext();
  const { usuario } = useAuth();
  const usuarios = carregarUsuarios().filter((item) => item.ativo);
  const medidor = usuarioPorRole('medicao')?.nome || 'Matheus';
  const [form, setForm] = useState({
    pp: obra?.pp || '',
    cliente: obra?.cliente || '',
    cidade: obra?.cidade || '',
    tipo: tipoInicial,
    data: '',
    equipe: medidor,
    responsavel: medidor,
    responsavelExecucao: medidor,
    obs: '',
  });
  const [buscaObra, setBuscaObra] = useState(obra ? `${obra.pp} - ${obra.cliente}` : '');
  const [obraSelecionada, setObraSelecionada] = useState(obra);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const ehFinal = form.tipo === 'Medição Final';
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
      cidade: item.cidade || '',
    }));
    setMostrarSugestoes(false);
  }

  function salvar() {
    if (!form.cliente.trim() || !form.data) return;
    criarAtividade({
      ...form,
      diaSemana,
      diaDaSemana: indiceDiaSemana(form.data),
      equipe: form.responsavel,
      responsavelExecucao: form.responsavel,
      obraId: obraSelecionada?.id || null,
      criadoPor: usuario.nome,
    });
    onClose();
  }

  return (
    <Modal
      titulo={`Agendar ${form.tipo}`}
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
          <label>{ehFinal ? 'Obra *' : 'Buscar obra (opcional)'}</label>
          <input
            value={buscaObra}
            onChange={(e) => {
              setBuscaObra(e.target.value);
              setMostrarSugestoes(true);
              if (!e.target.value) {
                setObraSelecionada(null);
                setForm((f) => ({ ...f, pp: '', cliente: '', cidade: '' }));
              }
            }}
            placeholder={ehFinal ? 'Digite PP ou nome do cliente para buscar...' : 'Digite PP ou cliente, ou preencha abaixo se obra nova'}
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
          {obraSelecionada && (
            <div className="fs-11 text-muted mt-4">Selecionada: {obraSelecionada.pp} - {obraSelecionada.cidade}</div>
          )}
        </div>

        {!ehFinal && (
          <>
            <div className="form-field">
              <label>PP</label>
              <input value={form.pp} onChange={(e) => set('pp', e.target.value)} placeholder="PP-9999" autoComplete="off" />
            </div>
            <div className="form-field">
              <label>Cliente</label>
              <input value={form.cliente} onChange={(e) => set('cliente', e.target.value)} placeholder="Nome do cliente" autoComplete="off" />
            </div>
          </>
        )}

        <div className="form-field">
          <label>Cidade</label>
          <input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="Cidade" autoComplete="off" />
        </div>
        <div className="form-field">
          <label>Data *</label>
          <input type="date" value={form.data} onChange={(e) => set('data', e.target.value)} />
          {diaSemana && <div className="agenda-dia-label">{diaSemana}</div>}
        </div>
        <div className="form-field">
          <label>Tipo</label>
          <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
            <option value="Medição Inicial">Medição Inicial</option>
            <option value="Medição Final">Medição Final</option>
            <option value="Vistoria">Vistoria</option>
          </select>
        </div>
        <div className="form-field">
          <label>Responsável</label>
          <select value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)}>
            {usuarios.map((item) => <option key={item.id} value={item.nome}>{item.nome}</option>)}
          </select>
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

        <div className="form-field full">
          <label>Observações</label>
          <textarea value={form.obs} onChange={(e) => set('obs', e.target.value)} placeholder="Informações adicionais..." rows={2} />
        </div>
      </div>
    </Modal>
  );
}
