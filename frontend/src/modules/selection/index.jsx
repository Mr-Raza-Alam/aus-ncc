export default function SelectionModule() {
  return (
    <div className="card" style={{ marginTop: '24px', textAlign: 'center', padding: '48px 24px' }}>
      <h2 style={{ color: 'var(--navy)', marginBottom: '8px' }}>Cadet Selection Module</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 24px' }}>
        Phase 4 development: Porting the existing standalone Selection Portal into the AUS-NCC unified modular architecture.
      </p>
      <div className="badge badge-info" style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(79, 195, 247, 0.2)', color: 'var(--sky-blue-dark)' }}>
        Existing Portal Remains Active
      </div>
    </div>
  );
}
