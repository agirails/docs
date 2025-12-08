import { useState } from 'react';
import { Method, FormValues } from '../../types/playground';
import { validateForm, ValidationErrors } from '../../lib/validation';

interface ParameterFormProps {
  method: Method;
  values: FormValues;
  onChange: (values: FormValues) => void;
  onSimulate: () => void;
  isSimulating: boolean;
}

export default function ParameterForm({
  method,
  values,
  onChange,
  onSimulate,
  isSimulating,
}: ParameterFormProps) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const fee = values.amount ? (parseFloat(values.amount) * 0.01).toFixed(2) : '0.00';
  const descriptionLength = values.description?.length || 0;

  const getValuesAsRecord = (): Record<string, string> => ({
    provider: values.provider || '',
    amount: values.amount || '',
    deadlineValue: values.deadlineValue || '',
    deadlineUnit: values.deadlineUnit || 'hours',
    description: values.description || '',
    txId: values.txId || '',
    newState: values.newState || '',
    escrowAddress: values.escrowAddress || '',
    reason: values.reason || '',
    resolution: values.resolution || '',
  });

  const updateValue = (key: keyof FormValues, value: string) => {
    onChange({ ...values, [key]: value });
    setTouched(prev => ({ ...prev, [key]: true }));
  };

  const handleBlur = (key: string) => {
    setTouched(prev => ({ ...prev, [key]: true }));
    const newErrors = validateForm(method.id, getValuesAsRecord());
    setErrors(newErrors);
  };

  const handleSimulate = () => {
    const allTouched: Record<string, boolean> = {};
    method.params.forEach(p => {
      allTouched[p.name] = true;
    });
    setTouched(allTouched);

    const newErrors = validateForm(method.id, getValuesAsRecord());
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSimulate();
    }
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return touched[fieldName] ? errors[fieldName] : undefined;
  };

  return (
    <div className="pg-form">
      <div className="pg-form-header">
        <h3 className="pg-form-title">{method.name}</h3>
        <p className="pg-form-subtitle">{method.description}</p>
      </div>

      <div className="pg-form-fields">
        {method.params.map((param) => {
          const error = getFieldError(param.name);
          const hasError = !!error;

          return (
            <div key={param.name} className="pg-field">
              <label className="pg-label">
                {param.label}
                {param.required && <span style={{ color: 'var(--pg-error)', marginLeft: '4px' }}>*</span>}
              </label>

              {param.type === 'address' && (
                <>
                  <input
                    type="text"
                    placeholder={param.placeholder}
                    value={values[param.name as keyof FormValues] || ''}
                    onChange={(e) => updateValue(param.name as keyof FormValues, e.target.value)}
                    onBlur={() => handleBlur(param.name)}
                    className={`pg-input ${hasError ? 'pg-input-error' : ''}`}
                  />
                  {hasError && <span className="pg-error-msg">{error}</span>}
                </>
              )}

              {param.type === 'number' && (
                <>
                  <input
                    type="number"
                    placeholder={param.placeholder}
                    value={values.amount || ''}
                    onChange={(e) => updateValue('amount', e.target.value)}
                    onBlur={() => handleBlur('amount')}
                    className={`pg-input ${hasError ? 'pg-input-error' : ''}`}
                  />
                  {hasError ? (
                    <span className="pg-error-msg">{error}</span>
                  ) : param.name === 'amount' && values.amount && (
                    <span className="pg-help-text">Minimum: $0.05 | Fee: ${fee} (1%)</span>
                  )}
                </>
              )}

              {param.type === 'deadline' && (
                <>
                  <div className="pg-input-row">
                    <input
                      type="number"
                      placeholder="24"
                      value={values.deadlineValue || ''}
                      onChange={(e) => updateValue('deadlineValue', e.target.value)}
                      onBlur={() => handleBlur('deadlineValue')}
                      className={`pg-input ${getFieldError('deadlineValue') ? 'pg-input-error' : ''}`}
                    />
                    <select
                      value={values.deadlineUnit || 'hours'}
                      onChange={(e) => updateValue('deadlineUnit', e.target.value as 'hours' | 'days')}
                      className="pg-select"
                    >
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                    </select>
                  </div>
                  {getFieldError('deadlineValue') ? (
                    <span className="pg-error-msg">{getFieldError('deadlineValue')}</span>
                  ) : (
                    <span className="pg-help-text">Provider must accept before deadline</span>
                  )}
                </>
              )}

              {param.type === 'text' && param.name === 'description' && (
                <>
                  <textarea
                    placeholder={param.placeholder}
                    value={values.description || ''}
                    onChange={(e) => updateValue('description', e.target.value)}
                    onBlur={() => handleBlur('description')}
                    maxLength={280}
                    className={`pg-input pg-textarea ${getFieldError('description') ? 'pg-input-error' : ''}`}
                    rows={3}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {getFieldError('description') ? (
                      <span className="pg-error-msg">{getFieldError('description')}</span>
                    ) : <span />}
                    <span className="pg-help-text">{descriptionLength}/280</span>
                  </div>
                </>
              )}

              {param.type === 'text' && param.name !== 'description' && (
                <>
                  <input
                    type="text"
                    placeholder={param.placeholder}
                    value={values[param.name as keyof FormValues] || ''}
                    onChange={(e) => updateValue(param.name as keyof FormValues, e.target.value)}
                    onBlur={() => handleBlur(param.name)}
                    className={`pg-input ${hasError ? 'pg-input-error' : ''}`}
                  />
                  {hasError && <span className="pg-error-msg">{error}</span>}
                </>
              )}

              {param.type === 'select' && param.options && (
                <select
                  value={values[param.name as keyof FormValues] || ''}
                  onChange={(e) => updateValue(param.name as keyof FormValues, e.target.value)}
                  className={`pg-select ${hasError ? 'pg-input-error' : ''}`}
                >
                  <option value="">Select...</option>
                  {param.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}

        {method.params.length === 0 && (
          <p className="pg-help-text" style={{ padding: '1rem 0' }}>
            This method has no parameters.
          </p>
        )}
      </div>

      <div className="pg-form-actions">
        <button
          onClick={handleSimulate}
          disabled={isSimulating}
          className="pg-btn pg-btn-primary"
          style={{ width: '100%' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 3h6l1 7-4 2-4-2 1-7z" />
            <path d="M5 13l4 2v6l-5-3v-4l1-1z" />
            <path d="M19 13l-4 2v6l5-3v-4l-1-1z" />
          </svg>
          {isSimulating ? 'Simulating...' : 'Simulate Transaction'}
        </button>
      </div>
    </div>
  );
}
