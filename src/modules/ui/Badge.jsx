export default function Badge({ children, classe = 'badge-info' }) {
  return <span className={`badge ${classe}`}>{children}</span>;
}


