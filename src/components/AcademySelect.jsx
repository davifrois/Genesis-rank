import React from 'react';
import Select, { components } from 'react-select';

const getCustomStyles = (theme = 'dark') => {
  const isLight = theme === 'light';
  return {
    control: (provided) => ({
      ...provided,
      backgroundColor: isLight ? '#fff' : 'rgba(255, 255, 255, 0.05)',
      borderColor: isLight ? '#ccc' : 'rgba(255, 255, 255, 0.1)',
      color: isLight ? '#333' : '#fff',
      boxShadow: 'none',
      '&:hover': {
        borderColor: 'var(--brand-primary, #646cff)'
      }
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: isLight ? '#fff' : '#1f1f1f',
      border: isLight ? '1px solid #ccc' : '1px solid rgba(255, 255, 255, 0.1)',
      zIndex: 9999
    }),
    menuList: (provided) => ({
      ...provided,
      backgroundColor: isLight ? '#fff' : '#1f1f1f',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? (isLight ? '#f0f0f0' : 'rgba(255, 255, 255, 0.1)') : 'transparent',
      color: isLight ? '#333' : '#fff',
      '&:active': {
        backgroundColor: 'var(--brand-primary, #646cff)'
      }
    }),
    singleValue: (provided) => ({
      ...provided,
      color: isLight ? '#333' : '#fff',
    }),
    input: (provided) => ({
      ...provided,
      color: isLight ? '#333' : '#fff',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: isLight ? '#888' : '#aaa',
    })
  };
};

const MenuList = (props) => {
  const { onRegisterNew } = props.selectProps;
  return (
    <components.MenuList {...props}>
      {props.children}
      {onRegisterNew && (
        <div 
          className="academy-select-footer" 
          style={{
            padding: '10px',
            borderTop: '1px solid var(--border-color, #333)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--surface-color, #1a1a1a)',
            color: 'var(--text-color, #fff)',
            fontSize: '14px'
          }}
        >
          <span>Não consegue encontrar a sua Academia?</span>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            style={{ width: '100%' }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRegisterNew();
            }}
          >
            Inscreva-se novo
          </button>
        </div>
      )}
    </components.MenuList>
  );
};

const AcademySelect = ({ academies, value, onChange, onRegisterNew, placeholder = 'Procurar...', theme = 'dark' }) => {
  const options = academies.map(academy => ({
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
      components={{ MenuList }}
      onRegisterNew={onRegisterNew}
      noOptionsMessage={() => "Nenhuma academia encontrada"}
    />
  );
};

export default AcademySelect;
