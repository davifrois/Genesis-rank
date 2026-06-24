const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'pages', 'MyAccount.jsx');

let code = fs.readFileSync(file, 'utf8');

// 1. Add imports
code = code.replace(
  "import { AlertTriangle, Image, Lock, Save, ShieldCheck, UserRound } from 'lucide-react';",
  "import { AlertTriangle, Image, Lock, Save, ShieldCheck, UserRound, Building2, ChevronDown, Search } from 'lucide-react';"
);

// 2. Add addAcademy to useStore destructuring
code = code.replace(
  "addMemberProfile,\n    deleteMemberProfile\n  } = useStore();",
  "addMemberProfile,\n    deleteMemberProfile,\n    addAcademy\n  } = useStore();"
);

// 3. Add states
const stateInjection = `  const [passwordLoading, setPasswordLoading] = useState(false);

  const [academySearchText, setAcademySearchText] = useState('');
  const [isAcademySearchOpen, setIsAcademySearchOpen] = useState(false);
  const [showCreateAcademyModal, setShowCreateAcademyModal] = useState(false);
  const [showAlreadyHereModal, setShowAlreadyHereModal] = useState(false);
  const [newAcademyName, setNewAcademyName] = useState('');
  const [similarAcademies, setSimilarAcademies] = useState([]);`;

code = code.replace("  const [passwordLoading, setPasswordLoading] = useState(false);", stateInjection);

// 4. Add Logic functions
const logicInjection = `  const currentProfile = useMemo(() => {`;
const logicCode = `
  const filteredAcademies = useMemo(() => {
    if (!academySearchText) return academies.slice(0, 50);
    const lowerSearch = academySearchText.toLowerCase();
    return academies.filter(a => a.name.toLowerCase().includes(lowerSearch));
  }, [academySearchText, academies]);

  const handleCreateAcademyClick = () => {
    setIsAcademySearchOpen(false);
    setShowCreateAcademyModal(true);
    setNewAcademyName(academySearchText);
  };

  const checkSimilarAcademies = () => {
    if (!newAcademyName.trim()) return;
    const lowerName = newAcademyName.toLowerCase();
    const similars = academies.filter(a => {
      const aName = a.name.toLowerCase();
      return aName.includes(lowerName) || lowerName.includes(aName);
    });
    if (similars.length > 0) {
      setSimilarAcademies(similars);
      setShowCreateAcademyModal(false);
      setShowAlreadyHereModal(true);
    } else {
      finalizeCreateAcademy();
    }
  };

  const finalizeCreateAcademy = () => {
    try {
      const newAcc = addAcademy({ name: newAcademyName.trim() });
      setForm(prev => ({ ...prev, academyId: newAcc.id }));
      setShowCreateAcademyModal(false);
      setShowAlreadyHereModal(false);
      setNewAcademyName('');
      setAcademySearchText('');
    } catch (err) {
      setError(err.message || 'Erro ao criar academia');
    }
  };

  const currentProfile = useMemo(() => {`;

code = code.replace(logicInjection, logicCode);

// 5. Replace the "Academia vinculada" article
const articleRegex = /<article className="profile-card profile-card--dark">\s*<div className="profile-card__header profile-card__header--dark"><h2>Academia vinculada<\/h2><\/div>\s*<div className="profile-card__body">\s*<div className="profile-fields profile-fields--single">\s*<div className="profile-field">\s*<label>Academia \*<\/label>\s*<select className="profile-input profile-input--dark" value=\{form\.academyId\} onChange=\{\(event\) => setForm\(\(previous\) => \(\{ \.\.\.previous, academyId: event\.target\.value \}\)\)\}>\s*<option value="">Selecione a academia<\/option>\s*\{academies\.map\(\(academy\) => \(\s*<option value=\{academy\.id\} key=\{academy\.id\}>\{academy\.name\}<\/option>\s*\)\)\}\s*<\/select>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/article>/g;

const newPanels = `          <div className="sc-profile-academy-grid">
            <article className="profile-card profile-card--dark">
              <div className="profile-card__header profile-card__header--dark"><h2>Suas academias</h2></div>
              <div className="profile-card__body" style={{ color: '#d1d5db', fontSize: '0.875rem', lineHeight: '1.6' }}>
                <p>Nesta seção você pode escolher qual academia, ou (em alguns casos) quais academias você representa. Ao afiliar-se a uma academia, você aceita que o professor responsável pela equipe tem o direito de gerenciar as aplicações/cancelamentos, além de pagamentos/ressarcimentos de qualquer competidor dentro do Smoothcomp.</p>
              </div>
            </article>

            <article className="profile-card profile-card--dark" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
              <div className="profile-card__header" style={{ backgroundColor: '#f9fafb', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Junte-se a equipe</h2>
              </div>
              <div className="profile-card__body" style={{ padding: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Academia</label>
                <div className="sc-academy-search-dropdown">
                  <div className="sc-academy-search-input-wrap">
                    <input 
                      type="text" 
                      className="sc-academy-search-input" 
                      placeholder="Procurar..." 
                      value={academySearchText}
                      onChange={(e) => {
                        setAcademySearchText(e.target.value);
                        setIsAcademySearchOpen(true);
                      }}
                      onFocus={() => setIsAcademySearchOpen(true)}
                    />
                    <ChevronDown size={16} className="sc-academy-search-caret" />
                  </div>
                  
                  {isAcademySearchOpen && (
                    <div className="sc-academy-list">
                      {filteredAcademies.length > 0 ? (
                        filteredAcademies.map(acc => (
                          <div 
                            key={acc.id} 
                            className="sc-academy-list-item"
                            onClick={() => {
                              setForm(prev => ({ ...prev, academyId: acc.id }));
                              setAcademySearchText('');
                              setIsAcademySearchOpen(false);
                            }}
                          >
                            {acc.name}
                          </div>
                        ))
                      ) : (
                        <div className="sc-academy-list-empty">The list is empty</div>
                      )}
                      
                      {academySearchText && (
                        <div className="sc-academy-list-empty" style={{ backgroundColor: '#bae6fd', color: '#0369a1' }}>
                          Search for more...
                        </div>
                      )}
                      
                      <div className="sc-academy-list-footer">
                        <span>Não consegue encontrar a sua Academia?</span>
                        <button type="button" className="sc-btn-join-new" onClick={handleCreateAcademyClick}>
                          Inscreva-se novo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div style={{ marginTop: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Afiliação/Equipe</label>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '24px' }}>
                    {form.academyId ? (academies.find(a => a.id === form.academyId)?.name || 'Sem equipe/afiliação') : 'Sem equipe/afiliação'}
                  </div>
                  <button type="button" className="sc-btn-green" onClick={() => {/* Optional sync action */}}>
                    Junte-se a equipe
                  </button>
                </div>
              </div>
            </article>
          </div>`;

code = code.replace(articleRegex, newPanels);

// 6. Add modals at the bottom
const endDivRegex = /      <\/div>\s*<\/div>\s*<\/main>\s*<\/div>\s*\);\s*\};\s*export default MyAccount;/g;

const modalsJSX = `
      {showCreateAcademyModal && (
        <div className="sc-academy-modal-overlay" onClick={() => setShowCreateAcademyModal(false)}>
          <div className="sc-academy-modal" onClick={e => e.stopPropagation()}>
            <Building2 size={48} className="sc-academy-modal-icon" />
            <h3 className="sc-academy-modal-title">Criar Nova Academia</h3>
            <p className="sc-academy-modal-desc">Você deve perguntar ao gestor da academia para registrar a academia.</p>
            <input 
              className="sc-academy-modal-input" 
              placeholder="Nome da academia" 
              value={newAcademyName}
              onChange={e => setNewAcademyName(e.target.value)}
            />
            <button className="sc-btn-green" onClick={checkSimilarAcademies}>Continue</button>
          </div>
        </div>
      )}

      {showAlreadyHereModal && (
        <div className="sc-academy-modal-overlay" onClick={() => setShowAlreadyHereModal(false)}>
          <div className="sc-academy-modal" onClick={e => e.stopPropagation()}>
            <Building2 size={48} className="sc-academy-modal-icon" />
            <h3 className="sc-academy-modal-title">Already Here?</h3>
            <p className="sc-academy-modal-desc">Sure it's not one of these academies?</p>
            
            <div className="sc-similar-list">
              {similarAcademies.map(acc => (
                <div 
                  key={acc.id} 
                  className="sc-similar-item"
                  onClick={() => {
                    setForm(prev => ({ ...prev, academyId: acc.id }));
                    setShowAlreadyHereModal(false);
                    setNewAcademyName('');
                  }}
                >
                  <span className="sc-similar-item-name">{acc.name}</span>
                  <span title="Brasil">🇧🇷</span>
                </div>
              ))}
            </div>

            <div className="sc-modal-actions">
              <button className="sc-btn-green" onClick={finalizeCreateAcademy}>I want to create a new academy</button>
              <button className="sc-btn-gray" onClick={() => {
                setShowAlreadyHereModal(false);
                setShowCreateAcademyModal(true);
              }}>Back</button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  </main>
</div>
  );
};
export default MyAccount;
`;

code = code.replace(endDivRegex, modalsJSX);

fs.writeFileSync(file, code);
console.log('MyAccount updated');
