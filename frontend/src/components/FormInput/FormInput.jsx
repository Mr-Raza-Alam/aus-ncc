export default function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  options = [],
  rows = 4,
}) {
  const id = `field-${name}`;

  const renderInput = () => {
    const commonProps = {
      id,
      name,
      value,
      onChange,
      disabled,
      placeholder,
      'aria-invalid': !!error,
      'aria-describedby': error ? `${id}-error` : undefined,
    };

    if (type === 'textarea') {
      return (
        <textarea
          {...commonProps}
          rows={rows}
          className={`form-control ${error ? 'error' : ''}`}
        />
      );
    }

    if (type === 'select') {
      return (
        <select
          {...commonProps}
          className={`form-control ${error ? 'error' : ''}`}
        >
          <option value="">{placeholder || 'Select…'}</option>
          {options.map((opt) => {
            const optValue = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={optValue} value={optValue}>
                {optLabel}
              </option>
            );
          })}
        </select>
      );
    }

    return (
      <input
        {...commonProps}
        type={type}
        className={`form-control ${error ? 'error' : ''}`}
      />
    );
  };

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {renderInput()}
      {error && (
        <p className="form-error" id={`${id}-error`} role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
