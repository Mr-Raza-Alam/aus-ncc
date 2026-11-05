import { useAuth } from '../auth/AuthContext';
import './UnitSwitcher.css';

const UNITS = [
  { code: '3AB', label: '3 Assam Bn' },
  { code: '62AB', label: '62 Assam Bn' },
];

export default function UnitSwitcher() {
  const { activeUnit, setActiveUnit, isLeadAdmin } = useAuth();

  if (!isLeadAdmin) return null;

  const handleSwitch = (unitCode) => {
    setActiveUnit(unitCode);
  };

  return (
    <div className="unit-switcher" role="group" aria-label="Unit selector">
      {UNITS.map((unit) => (
        <button
          key={unit.code}
          className={`unit-switcher-btn ${activeUnit === unit.code ? 'active' : ''}`}
          onClick={() => handleSwitch(unit.code)}
          aria-pressed={activeUnit === unit.code}
          title={unit.label}
        >
          {unit.code}
        </button>
      ))}
    </div>
  );
}
