import React from 'react';
import Select, { components } from 'react-select';
import { PlusCircle, Building2 } from 'lucide-react';

const getCustomStyles = (theme = 'dark') => {
  const isLight = theme === 'light';
  return {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
      borderColor: state.isFocused 
        ? 'var(--brand-primary, #00c2cb)' 
        : (isLight ? '#d1d5db' : 'rgba(255, 255, 255, 0.15)'),
      borderRadius: '8px',
      minHeight: '44px',
      color: isLight ? '#111827' : '#ffffff',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(0, 194, 203, 0.2)' : 'none',
      cursor: 'pointer',
      '&:hover': {
        borderColor: 'var(--brand-primary, #00c2cb)'
      }
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: isLight ? '#ffffff' : '#131b2a',
      border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '10px',
      boxShadow: '0 16px 36px rgba(0, 0, 0, 0.35)',
      zIndex: 999999,
      overflow: 'hidden'
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 999999
    }),
    menuList: (provided) => ({
      ...provided,
      padding: '6px',
      maxHeight: '220px',
      backgroundColor: isLight ? '#ffffff' : '#131b2a'
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? 'var(--brand-primary, #00c2cb)' 
        : state.isFocused 
          ? (isLight ? '#f1f5f9' : 'rgba(0, 194, 203, 0.12)') 
          : 'transparent',
      color: state.isSelected ? '#05070b' : (isLight ? '#111827' : '#e2e8f0'),
      fontWeight: state.isSelected ? 700 : 500,
      borderRadius: '6px',
      padding: '10px 14px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      '&:active': {
        backgroundColor: 'var(--brand-primary, #00c2cb)',
        color: '#05070b'
      }
    }),
    singleValue: (provided) => ({
      ...provided,
      color: isLight ? '#111827' : '#ffffff',
      fontWeight: 600
    }),
    input: (provided) => ({
      ...provided,
      color: isLight ? '#111827' : '#ffffff'
    }),
    placeholder: (provided) => ({
      ...provided,
      color: isLight ? '#9ca3af' : '#64748b'
    })
  };
};

const Menu = (props) => {
  const { onRegisterNew, theme = 'dark', inputValue } = props.selectProps;
  const isLight = theme === 'light';

  return (
    <components.Menu {...props}>
      <div>{props.children}</div>
      {onRegisterNew && (
        <div 
          className="academy-select-footer" 
          style={{
            padding: '12px 14px',
            borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: isLight ? '#f8fafc' : '#0f1623',
            borderBottomLeftRadius: '10px',
            borderBottomRightRadius: '10px'
          }}
        >
          <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8', textAlign: 'center', fontWeight: 500 }}>
            {inputValue ? `Não encontrou "${inputValue}"?` : 'Não encontrou a sua academia?'}
          </div>
          <button 
            type="button" 
            style={{ 
              width: '100%',
              padding: '10px 14px',
              background: 'linear-gradient(135deg, #00c2cb 0%, #009ca4 100%)',
              color: '#05070b',
              border: 'none',
              borderRadius: '7px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(0, 194, 203, 0.3)'
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRegisterNew(inputValue || '');
            }}
          >
            <PlusCircle size={16} />
            Cadastrar Nova Academia
          </button>
        </div>
      )}
    </components.Menu>
  );
};

const AcademySelect = ({ 
  academies = [], 
  value, 
  onChange, 
  onRegisterNew, 
  placeholder = 'Buscar ou selecionar academia...', 
  theme = 'dark' 
}) => {
  const options = (academies || []).map(academy => ({
    value: academy.id,
    label: academy.name
  }));

  const selectedOption = options.find(opt => opt.value === value) || null;

  return (
    <Select
      value={selectedOption}
      onChange={(selected) => onChange(selected ? selected.value : '')}
      options={options}
      placeholder={placeholder}
      isClearable
      isSearchable
      styles={getCustomStyles(theme)}
      components={{ Menu }}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      menuPosition="fixed"
      onRegisterNew={onRegisterNew}
      theme={theme}
      noOptionsMessage={({ inputValue }) => (
        <div style={{ padding: '12px 8px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          Nenhuma academia encontrada {inputValue ? `para "${inputValue}"` : ''}
        </div>
      )}
    />
  );
};

export default AcademySelect;
