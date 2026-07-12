import { NavLink } from 'react-router-dom';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import QuickActions from './QuickActions.jsx';

export default function Sidebar() {
  const { usuario, logout } = useAuth();

  if (usuario.role === 'supervisor') {
    return (
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-nome">MAXIBELL</div>
          <div className="sidebar-brand-sub">Portas e Janelas</div>
        </div>
        <div className="sidebar-usuario">
          <div className="avatar" style={{ background: usuario.cor }}>{usuario.avatar}</div>
          <div>
            <div className="sidebar-usuario-nome">{usuario.nome}</div>
            <div className="sidebar-usuario-cargo">{usuario.cargo}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-nav-titulo">Menu</div>
          <NavLink to="/" end className={({ isActive }) => `nav-btn ${isActive ? 'ativo' : ''}`}>Painel</NavLink>
          <NavLink to="/ag/max" className={({ isActive }) => `nav-btn ${isActive ? 'ativo' : ''}`}>MAX IA</NavLink>
          <NavLink to="/ag/obras" className={({ isActive }) => `nav-btn ${isActive ? 'ativo' : ''}`}>Central de Obras</NavLink>
          <NavLink to="/ag/agenda" className={({ isActive }) => `nav-btn ${isActive ? 'ativo' : ''}`}>Agenda</NavLink>
        </nav>
        <div className="sidebar-footer">
          <button className="btn-sair" onClick={logout}>Sair</button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-nome">MAXIBELL</div>
        <div className="sidebar-brand-sub">Portas e Janelas</div>
      </div>
      <div className="sidebar-usuario">
        <div className="avatar" style={{ background: usuario.cor }}>{usuario.avatar}</div>
        <div>
          <div className="sidebar-usuario-nome">{usuario.nome}</div>
          <div className="sidebar-usuario-cargo">{usuario.cargo}</div>
        </div>
        {usuario.role === 'admin' && (
          <NavLink
            to="/admin/usuarios"
            style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.6)', fontSize: 16, textDecoration: 'none' }}
            title="Colaboradores"
          >
            ⚙
          </NavLink>
        )}
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-titulo">Operação</div>
        <NavLink to="/" end className={({ isActive }) => `nav-btn ${isActive ? 'ativo' : ''}`}>
          Painel
        </NavLink>
        {!['comercial', 'projetos'].includes(usuario.role) && (
          <NavLink to="/obras" className={({ isActive }) => `nav-btn ${isActive ? 'ativo' : ''}`}>
            Central de Obras
          </NavLink>
        )}
        {usuario.role !== 'projetos' && (
          <NavLink to="/agenda" className={({ isActive }) => `nav-btn ${isActive ? 'ativo' : ''}`}>
            Agenda
          </NavLink>
        )}

        {usuario.role === 'admin' && (
          <NavLink to="/ia" className={({ isActive }) => `nav-btn ${isActive ? 'ativo' : ''}`}>
            MAX IA
          </NavLink>
        )}

        <div className="sidebar-nav-titulo">Atalhos</div>
        <QuickActions inline />

        {usuario.role === 'medicao' && (
          <>
            <a href="https://drive.google.com/drive/folders/1rvvgrds9G25TgHonXke-GeiZ1vIOOKZ1" target="_blank" rel="noopener noreferrer" className="nav-btn">📁 Drive Comercial</a>
            <a href="https://drive.google.com/drive/folders/1Wxv270Mf0ahtmj6sIczT-D9zZMueTQDG?usp=drive_link" target="_blank" rel="noopener noreferrer" className="nav-btn">📁 Drive Projetos</a>
          </>
        )}

        {usuario.role === 'admin' && (
          <>
            <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="nav-btn">Drive</a>
            <NavLink to="/lembretes" className={({ isActive }) => `nav-btn ${isActive ? 'ativo' : ''}`}>
              Lembretes
            </NavLink>
            <a href="https://maxibell-adm.github.io/Maxibell/ana/central-ana-v2.html#followup" target="_blank" rel="noopener noreferrer" className="nav-btn">
              Follow Up
            </a>
            <NavLink to="/biblioteca-ia" className={({ isActive }) => `nav-btn ${isActive ? 'ativo' : ''}`}>
              Biblioteca IA
            </NavLink>
            <a href="https://maxibell-adm.github.io/Maxibell/aplicativos/central-contratos.html" target="_blank" rel="noopener noreferrer" className="nav-btn">
              Gerador de Contratos
            </a>
          </>
        )}

        {usuario.role === 'projetos' && (
          <>
            <NavLink to="/biblioteca-projetos" className={({ isActive }) => `nav-btn ${isActive ? 'ativo' : ''}`}>
              Biblioteca de Projetos
            </NavLink>
            <a href="https://maxibell-adm.github.io/projetos/" target="_blank" rel="noopener noreferrer" className="nav-btn">Projetos</a>
            <a href="https://maxibell-adm.github.io/Maxibell/aplicativos/validacao-projetos.html" target="_blank" rel="noopener noreferrer" className="nav-btn">Conferência</a>
            <a href="https://drive.google.com/drive/folders/1Wxv270Mf0ahtmj6sIczT-D9zZMueTQDG?usp=drive_link" target="_blank" rel="noopener noreferrer" className="nav-btn">📁 Drive Projetos</a>
          </>
        )}

        {usuario.role === 'comercial' && (
          <>
            <a href="https://maxibell-adm.github.io/Maxibell/ana/central-ana-v2.html#followup" target="_blank" rel="noopener noreferrer" className="nav-btn">Follow-up</a>
            <a href="https://maxibell-adm.github.io/Maxibell/ana/central-ana-v2.html#faq" target="_blank" rel="noopener noreferrer" className="nav-btn">FAQ</a>
            <a href="https://drive.google.com/drive/folders/1rvvgrds9G25TgHonXke-GeiZ1vIOOKZ1" target="_blank" rel="noopener noreferrer" className="nav-btn">📁 Drive Comercial</a>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="btn-sair" onClick={logout}>Sair</button>
      </div>
    </aside>
  );
}
