import { useMemo, useState } from 'react';
import { buscarItemBiblioteca, listarItensBiblioteca, salvarItemBiblioteca } from '@/services/bibliotecaService.js';

export default function BibliotecaIA() {
  const [busca, setBusca] = useState('');
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [categoria, setCategoria] = useState('operacional');
  const [versao, setVersao] = useState(0);
  const itens = useMemo(() => (busca ? buscarItemBiblioteca(busca) : listarItensBiblioteca()), [busca, versao]);

  function salvar() {
    if (!titulo.trim() || !texto.trim()) return;
    salvarItemBiblioteca({ titulo, texto, categoria });
    setTitulo('');
    setTexto('');
    setCategoria('operacional');
    setVersao((v) => v + 1);
  }

  return (
    <div>
      <div className="page-title">Biblioteca IA</div>
      <div className="text-muted fs-12 mb-16">Base local de procedimentos, scripts e regras usadas pelo painel de IA.</div>

      <section className="biblioteca-toolbar">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por titulo, categoria ou texto" />
      </section>

      <section className="biblioteca-form">
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Titulo" />
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="operacional">Operacional</option>
          <option value="comercial">Comercial</option>
          <option value="instalacao">Instalacao</option>
          <option value="projetos">Projetos</option>
        </select>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Conteudo da orientacao" />
        <button className="btn btn-primary" onClick={salvar}>Salvar item</button>
      </section>

      <div className="biblioteca-grid">
        {itens.map((item) => (
          <article className="biblioteca-card" key={item.id}>
            <span>{item.categoria}</span>
            <strong>{item.titulo}</strong>
            <p>{item.texto}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
