import React from 'react';

export type SupportedSettingsFieldType = 'select' | 'color' | 'checkbox' | 'number' | 'range';

export const FieldHeader: React.FC<{ label: string; description?: string }> = ({ label, description }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
    <span style={{ fontSize: '0.85rem' }}>{label}</span>
    {description && (
      <span style={{ fontSize: '0.7rem', color: '#7f8c8d' }}>{description}</span>
    )}
  </div>
);

export const SettingsFieldShell: React.FC<{
  alignItems?: 'center' | 'flex-start';
  gap?: string;
  children: React.ReactNode;
}> = ({
  alignItems = 'center',
  gap = '10px',
  children
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems, gap }}>
    {children}
  </div>
);

export const SettingsFieldRenderer: React.FC<{
  type: SupportedSettingsFieldType;
  fieldKey?: string;
  label: string;
  description?: string;
  value: string | number | boolean;
  onChange: (value: string | number | boolean) => void;
  options?: Array<{ label: string; value: string }>;
  min?: number;
  max?: number;
  step?: number;
  width?: string;
}> = ({
  type,
  fieldKey,
  label,
  description,
  value,
  onChange,
  options = [],
  min,
  max,
  step,
  width
}) => {
  if (type === 'color') {
    return (
      <SettingsFieldShell>
        <FieldHeader label={label} description={description} />
        <input
          type="color"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '44px', height: '28px', padding: 0, border: 'none', background: 'none' }}
        />
      </SettingsFieldShell>
    );
  }

  if (type === 'checkbox') {
    return (
      <SettingsFieldShell>
        <FieldHeader label={label} description={description} />
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      </SettingsFieldShell>
    );
  }

  if (type === 'number') {
    return (
      <SettingsFieldShell>
        <FieldHeader label={label} description={description} />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(value)}
          onChange={(e) => onChange(Math.max(min ?? Number.NEGATIVE_INFINITY, parseInt(e.target.value, 10) || 0))}
          style={{ width: width ?? '70px', padding: '4px', fontSize: '0.8rem' }}
        />
      </SettingsFieldShell>
    );
  }

  if (type === 'range') {
    return (
      <SettingsFieldShell>
        <FieldHeader label={label} description={description} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Number(value)}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          style={{ width: width ?? '110px' }}
        />
      </SettingsFieldShell>
    );
  }

  if (type !== 'select') {
    return (
      <SettingsFieldShell>
        <FieldHeader
          label={label}
          description={description ?? `Unsupported field type: ${type}${fieldKey ? ` (${fieldKey})` : ''}`}
        />
        <div
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid #d0d7de',
            background: '#f6f8fa',
            color: '#7f8c8d',
            fontSize: '0.75rem'
          }}
        >
          Unsupported
        </div>
      </SettingsFieldShell>
    );
  }

  return (
    <SettingsFieldShell>
      <FieldHeader label={label} description={description} />
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: '4px', fontSize: '0.8rem' }}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </SettingsFieldShell>
  );
};
