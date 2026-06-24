const fs = require('fs');

let content = fs.readFileSync('src/pages/MyAccount.jsx', 'utf8');

// Insert isPt definition
content = content.replace('const renderSettingsPage = ({ embedded = false } = {}) => (', \const renderSettingsPage = ({ embedded = false } = {}) => {
  const isPt = locale === 'pt' || locale === 'pt-BR' || locale.startsWith('pt');
  
  const txt = {
    profileSettings: isPt ? 'CONFIGURAÇÕES DO PERFIL' : 'PROFILE SETTINGS',
    myProfile: isPt ? 'Meu Perfil' : 'My Profile',
    sharedUserData: isPt ? 'Dados compartilhados' : 'Shared user data',
    userDetails: isPt ? 'Detalhes do Usuário' : 'User details',
    firstName: isPt ? 'Primeiro nome' : 'First name',
    middleName: isPt ? 'Nome do meio' : 'Middle name',
    lastName: isPt ? 'Sobrenome' : 'Last name',
    email: isPt ? 'E-mail' : 'Email',
    password: isPt ? 'Senha' : 'Password',
    edit: isPt ? 'editar' : 'edit',
    nationality: isPt ? 'Nacionalidade' : 'Nationality',
    selectCountry: isPt ? 'Selecione o país' : 'Select country',
    birthDate: isPt ? 'Data de nascimento' : 'Birthdate',
    gender: isPt ? 'Gênero' : 'Gender',
    selectGender: isPt ? 'Selecione o gênero' : 'Select gender',
    male: isPt ? 'Masculino' : 'Male',
    female: isPt ? 'Feminino' : 'Female',
    other: isPt ? 'Outro' : 'Other',
    language: isPt ? 'Idioma' : 'Language',
    selectLanguage: isPt ? 'Selecione o idioma' : 'Select language',
    contactAndResidence: isPt ? 'Contato e Residência' : 'Contact & residence',
    phone: isPt ? 'Telefone' : 'Phone',
    address: isPt ? 'Endereço' : 'Address',
    zip: isPt ? 'CEP' : 'ZIP',
    city: isPt ? 'Cidade' : 'City',
    province: isPt ? 'Estado/Província' : 'Province/State',
    countryOfResidence: isPt ? 'País de residência' : 'Country of residence',
    visibility: isPt ? 'Visibilidade' : 'Visibility',
    hidePublicProfile: isPt ? 'Ocultar perfil público' : 'Hide public profile',
    visibilityText: isPt ? 'Esta configuração oculta sua página de perfil público, mas seu nome continuará aparecendo nas listas de resultados dos eventos que você participou.' : 'This setting hides your public profile page, however your name will still appear in the results list of events you have participated in.',
    profileImage: isPt ? 'Imagem de perfil' : 'Profile image',
    coverImage: isPt ? 'Imagem de capa' : 'Cover image',
    beltSkill: isPt ? 'Faixa / Nível' : 'Belt / Skill level',
    selectBelt: isPt ? 'Selecione a faixa' : 'Select belt',
    notSet: isPt ? 'Não definido' : 'Not set',
    addBelt: isPt ? '+ Adicionar faixa' : '+ Add belt/level',
    history: isPt ? 'Histórico' : 'History',
    deleteAccount: isPt ? 'Excluir conta' : 'Delete Account',
    deleteAccountBtn: isPt ? 'Excluir conta' : 'Delete account',
    yourAcademies: isPt ? 'Suas academias' : 'Your academies',
    academiesHelp: isPt ? 'Nesta seção você pode selecionar qual academia, ou em alguns casos quais academias você representa. Ao adicionar uma academia a esta lista, você aceita que o treinador responsável dessa academia tem o direito de gerenciar suas inscrições.' : 'In this section you can select which academy, or be some cases which academics that you represent. By adding an academy to this list you accept that the responsible coach of that academy has the right to modify your application formalities and any restrictions for any competitions for the Genesis teams.',
    statusPending: isPt ? 'Aprovação Pendente' : 'Pending Approval',
    statusApproved: isPt ? 'Aprovado' : 'Approved',
    joinAcademy: isPt ? 'Vincular a uma academia' : 'Join academy',
    academyClub: isPt ? 'Academia/Clube' : 'Academy/Club',
    search: isPt ? 'Buscar...' : 'Search...',
    noAcademiesFound: isPt ? 'Nenhuma academia encontrada' : 'No academies found',
    cantFindAcademy: isPt ? 'Não encontrou sua Academia?' : \"Can't find your Academy?\",
    registerNew: isPt ? 'Cadastrar nova' : 'Register new',
    affiliationTeam: isPt ? 'Equipe/Afiliação' : 'Affiliation/Team',
    noTeamAssociation: isPt ? 'Sem equipe/associação' : 'No team/association',
    joinAcademyBtn: isPt ? 'Vincular' : 'Join academy',
    linkedAccounts: isPt ? 'Contas vinculadas' : 'Linked accounts',
    add: isPt ? 'Adicionar' : 'Add',
    saveChanges: isPt ? 'Salvar alterações' : 'Save changes'
  };

  return (
\);

// Replace text occurrences in renderSettingsPage
// I will use regex or direct replace for exact strings in the JSX block

const replacements = [
  ["<h1>PROFILE SETTINGS</h1>", "<h1>{txt.profileSettings}</h1>"],
  [">My Profile</Link>", ">{txt.myProfile}</Link>"],
  [">Shared user data</button>", ">{txt.sharedUserData}</button>"],
  ["<h2>User details</h2>", "<h2>{txt.userDetails}</h2>"],
  ["'First name'", "txt.firstName"],
  ["'Middle name'", "txt.middleName"],
  ["'Last name'", "txt.lastName"],
  ["'Email'", "txt.email"],
  ["<span>Password</span>", "<span>{txt.password}</span>"],
  [">edit</button>", ">{txt.edit}</button>"],
  ["'Nationality'", "txt.nationality"],
  ["'Select country'", "txt.selectCountry"],
  ["'Birthdate'", "txt.birthDate"],
  ["'Gender'", "txt.gender"],
  ["'Select gender'", "txt.selectGender"],
  ["label: 'Male'", "label: txt.male"],
  ["label: 'Female'", "label: txt.female"],
  ["label: 'Other'", "label: txt.other"],
  ["<span>Language</span>", "<span>{txt.language}</span>"],
  [">Select language</option>", ">{txt.selectLanguage}</option>"],
  ["<h2>Contact &amp; residence</h2>", "<h2>{txt.contactAndResidence}</h2>"],
  ["'Phone'", "txt.phone"],
  ["'Address'", "txt.address"],
  ["'ZIP'", "txt.zip"],
  ["'City'", "txt.city"],
  ["'Province/State'", "txt.province"],
  ["'Country of residence'", "txt.countryOfResidence"],
  ["<h2>Visibility</h2>", "<h2>{txt.visibility}</h2>"],
  ["Hide public profile\\n                </label>", "{txt.hidePublicProfile}\\n                </label>"],
  ["<p>This setting hides your public profile page, however your name will still appear in the results list of events you have participated in.</p>", "<p>{txt.visibilityText}</p>"],
  ["<h2>Profile image <label>Edit", "<h2>{txt.profileImage} <label>{txt.edit}"],
  ["<h2>Cover image <label>Select image", "<h2>{txt.coverImage} <label>{txt.edit}"],
  ["<h2>Belt / Skill level</h2>", "<h2>{txt.beltSkill}</h2>"],
  [">Select belt</option>", ">{txt.selectBelt}</option>"],
  ["<span>{form.belt || 'Not set'}</span>", "<span>{form.belt || txt.notSet}</span>"],
  [">+ Add belt/level</button>", ">{txt.addBelt}</button>"],
  [">History</button>", ">{txt.history}</button>"],
  ["<h2>Delete Account</h2>", "<h2>{txt.deleteAccount}</h2>"],
  [">Delete account</button>", ">{txt.deleteAccountBtn}</button>"],
  ["<div className=\\"ps-card__title\\">Your academies</div>", "<div className=\\"ps-card__title\\">{txt.yourAcademies}</div>"],
  ["In this section you can select which academy, or be some cases which academics that you represent. By adding an academy to this list you accept that the responsible coach of that academy has the right to modify your application formalities and any restrictions for any competitions for the Genesis teams.", "{txt.academiesHelp}"],
  ["Status: {currentProfile?.joinStatus === 'pending' ? 'Pending Approval' : 'Approved'}", "Status: {currentProfile?.joinStatus === 'pending' ? txt.statusPending : txt.statusApproved}"],
  ["<div className=\\"ps-card__title\\">Join academy</div>", "<div className=\\"ps-card__title\\">{txt.joinAcademy}</div>"],
  ["<label className=\\"ps-label\\">Academy/Club</label>", "<label className=\\"ps-label\\">{txt.academyClub}</label>"],
  ["placeholder=\\"Search...\\"", "placeholder={txt.search}"],
  [">No academies found</div>", ">{txt.noAcademiesFound}</div>"],
  [">Can&#39;t find your Academy?</span>", ">{txt.cantFindAcademy}</span>"],
  [">Register new</button>", ">{txt.registerNew}</button>"],
  ["<label className=\\"ps-label\\">Affiliation/Team</label>", "<label className=\\"ps-label\\">{txt.affiliationTeam}</label>"],
  ["'No team/association'", "txt.noTeamAssociation"],
  ["\\n                Join academy\\n              </button>", "\\n                {txt.joinAcademyBtn}\\n              </button>"],
  ["<div className=\\"ps-card__title\\">Linked accounts</div>", "<div className=\\"ps-card__title\\">{txt.linkedAccounts}</div>"],
  ["className=\\"ps-add-btn\\">Add</button>", "className=\\"ps-add-btn\\">{txt.add}</button>"],
  [">Save changes</button>", ">{txt.saveChanges}</button>"]
];

replacements.forEach(([oldStr, newStr]) => {
  content = content.replace(oldStr, newStr);
});

// Since we changed renderSettingsPage from arrow expression returning JSX ... => (...) 
// to ... => { ... return (...); }, we need to find the matching closing parenthesis.
// It ends around line 1063.
content = content.replace('    </form>\\n  );', '    </form>\\n  );\\n};');

fs.writeFileSync('src/pages/MyAccount.jsx', content);
console.log('done');
