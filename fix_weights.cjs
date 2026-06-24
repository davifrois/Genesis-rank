const fs = require('fs');
const file = 'src/components/TournamentRegistrationFlow.jsx';
let content = fs.readFileSync(file, 'utf8');

const dynamicWeightsFunc = `const resolveWeightOptions = (profile, isNoGi, eventOptions) => {
  if (eventOptions && typeof eventOptions === 'string' && eventOptions.trim()) {
    return eventOptions.split('\\n').map(o => o.trim()).filter(Boolean).map(o => ({ value: o, label: o }));
  }

  const age = Number(profile.age) || 30;
  const gender = (profile.gender || profile.genero || '').toLowerCase();
  const isFemale = gender.includes('femi') || gender.includes('mulher');

  if (age <= 15) {
    return [
      { value: 'Galo', label: 'Galo (Infantil/Juvenil)' },
      { value: 'Pluma', label: 'Pluma (Infantil/Juvenil)' },
      { value: 'Pena', label: 'Pena (Infantil/Juvenil)' },
      { value: 'Leve', label: 'Leve (Infantil/Juvenil)' },
      { value: 'Médio', label: 'Médio (Infantil/Juvenil)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (Infantil/Juvenil)' },
      { value: 'Pesado', label: 'Pesado (Infantil/Juvenil)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (Infantil/Juvenil)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (Infantil/Juvenil)' }
    ];
  }

  if (isFemale) {
    if (isNoGi) {
      return [
        { value: 'Galo', label: 'Galo (até 46.5kg)' },
        { value: 'Pluma', label: 'Pluma (até 51.5kg)' },
        { value: 'Pena', label: 'Pena (até 56.5kg)' },
        { value: 'Leve', label: 'Leve (até 61.5kg)' },
        { value: 'Médio', label: 'Médio (até 66.5kg)' },
        { value: 'Meio-Pesado', label: 'Meio-Pesado (até 71.5kg)' },
        { value: 'Pesado', label: 'Pesado (até 76.5kg)' },
        { value: 'Super-Pesado', label: 'Super-Pesado (acima de 76.5kg)' }
      ];
    }
    return [
      { value: 'Galo', label: 'Galo (até 47.5kg)' },
      { value: 'Pluma', label: 'Pluma (até 53.5kg)' },
      { value: 'Pena', label: 'Pena (até 58.5kg)' },
      { value: 'Leve', label: 'Leve (até 64kg)' },
      { value: 'Médio', label: 'Médio (até 69kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 74kg)' },
      { value: 'Pesado', label: 'Pesado (até 79.3kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (acima de 79.3kg)' }
    ];
  }

  if (isNoGi) {
    return [
      { value: 'Galo', label: 'Galo (até 55.5kg)' },
      { value: 'Pluma', label: 'Pluma (até 61.5kg)' },
      { value: 'Pena', label: 'Pena (até 67.5kg)' },
      { value: 'Leve', label: 'Leve (até 73.5kg)' },
      { value: 'Médio', label: 'Médio (até 79.5kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 85.5kg)' },
      { value: 'Pesado', label: 'Pesado (até 91.5kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (até 97.5kg)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (acima de 97.5kg)' }
    ];
  }

  return [
    { value: 'Galo', label: 'Galo (até 57.5kg)' },
    { value: 'Pluma', label: 'Pluma (até 64kg)' },
    { value: 'Pena', label: 'Pena (até 70kg)' },
    { value: 'Leve', label: 'Leve (até 76kg)' },
    { value: 'Médio', label: 'Médio (até 82.3kg)' },
    { value: 'Meio-Pesado', label: 'Meio-Pesado (até 88.3kg)' },
    { value: 'Pesado', label: 'Pesado (até 94.3kg)' },
    { value: 'Super-Pesado', label: 'Super-Pesado (até 100.5kg)' },
    { value: 'Pesadíssimo', label: 'Pesadíssimo (acima de 100.5kg)' }
  ];
};

const buildBeltRegistrationWhatsappUrl =`;

content = content.replace(/const buildBeltRegistrationWhatsappUrl =/, dynamicWeightsFunc);

const weightSelectBlockOld = /<option value="Galo">Galo \(até 57kg\)<\/option>[\s\S]*?<option value="Pesadíssimo">Pesadíssimo \(acima de 100kg\)<\/option>/m;

const weightSelectBlockNew = `{weightOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}`;

content = content.replace(weightSelectBlockOld, weightSelectBlockNew);

const hookOld = "const [absolute, setAbsolute] = useState(false);";
const hookNew = `const [absolute, setAbsolute] = useState(false);
  const weightOptions = useMemo(() => {
    const isNoGiOnly = modalities.length === 1 && modalities[0] === 'NO-GI';
    const eventCustomOptions = isNoGiOnly ? event?.weightTableNoGiOptions : event?.weightTableGiOptions;
    return resolveWeightOptions(profile, isNoGiOnly, eventCustomOptions);
  }, [profile, modalities, event]);`;

content = content.replace(hookOld, hookNew);

fs.writeFileSync(file, content);
