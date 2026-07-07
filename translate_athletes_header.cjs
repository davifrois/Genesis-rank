const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Athletes.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// The exact block to replace
const targetStr = `<div className="athletes-ajp-header-section">
        <h1 className="athletes-ajp-title">
          {isEnglish ? 'Genesis Athlete Community' : 'ATHLETES COMMUNITY'}
        </h1>
        
        <div className="athletes-ajp-filters-row">
          <input
            type="search"
            className="athletes-ajp-input"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={isEnglish ? 'Search...' : 'Search...'}
          />
          <select className="athletes-ajp-select" value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
            <option value="all">Select country</option>
            {Array.from(new Set(memberProfiles.map(p => p.country).filter(Boolean))).sort().map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className="athletes-ajp-select" value={beltFilter} onChange={(event) => setBeltFilter(event.target.value)}>
            <option value="all">- Continent -</option>
          </select>
          <select className="athletes-ajp-select" value={academyFilter} onChange={(event) => setAcademyFilter(event.target.value)}>
            <option value="all">Academy</option>
            {availableAcademies.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select className="athletes-ajp-select" value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)}>
            <option value="all">- Gender -</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
          </select>
          
          <button className="athletes-ajp-btn-filter" onClick={() => {}}>
            Filter
          </button>
          <button className="athletes-ajp-btn-share" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert(isEnglish ? 'Link copied!' : 'Link copiado!');
          }}>
            Share toplist
          </button>
        </div>
      </div>

      {/* TOP ATHLETES SECTION */}
      <section className="athletes-ajp-top-section">
        <h2 className="athletes-ajp-top-title">
          TOP ATHLETES <span className="muted">LAST 100 DAYS</span>
        </h2>`;

const replacement = `<div className="athletes-ajp-header-section">
        <h1 className="athletes-ajp-title">
          {isEnglish ? 'ATHLETES COMMUNITY' : 'COMUNIDADE DE ATLETAS'}
        </h1>
        
        <div className="athletes-ajp-filters-row">
          <input
            type="search"
            className="athletes-ajp-input"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={isEnglish ? 'Search...' : 'Pesquisar...'}
          />
          <select className="athletes-ajp-select" value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
            <option value="all">{isEnglish ? 'Select country' : 'Selecione o país'}</option>
            {Array.from(new Set(memberProfiles.map(p => p.country).filter(Boolean))).sort().map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className="athletes-ajp-select" value={beltFilter} onChange={(event) => setBeltFilter(event.target.value)}>
            <option value="all">{isEnglish ? '- Continent -' : '- Continente -'}</option>
          </select>
          <select className="athletes-ajp-select" value={academyFilter} onChange={(event) => setAcademyFilter(event.target.value)}>
            <option value="all">{isEnglish ? 'Academy' : 'Academia'}</option>
            {availableAcademies.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select className="athletes-ajp-select" value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)}>
            <option value="all">{isEnglish ? '- Gender -' : '- Gênero -'}</option>
            <option value="Masculino">{isEnglish ? "Men's" : "Masculino"}</option>
            <option value="Feminino">{isEnglish ? "Women's" : "Feminino"}</option>
          </select>
          
          <button className="athletes-ajp-btn-filter" onClick={() => {}}>
            {isEnglish ? 'FILTER' : 'FILTRAR'}
          </button>
          <button className="athletes-ajp-btn-share" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert(isEnglish ? 'Link copied!' : 'Link copiado!');
          }}>
            {isEnglish ? 'SHARE TOPLIST' : 'COMPARTILHAR'}
          </button>
        </div>
      </div>

      {/* TOP ATHLETES SECTION */}
      <section className="athletes-ajp-top-section">
        <h2 className="athletes-ajp-top-title">
          {isEnglish ? 'TOP ATHLETES' : 'PRINCIPAIS ATLETAS'} <span className="muted">{isEnglish ? 'LAST 100 DAYS' : 'ÚLTIMOS 100 DIAS'}</span>
        </h2>`;

if (content.includes(targetStr)) {
    fs.writeFileSync(filePath, content.replace(targetStr, replacement), 'utf8');
    console.log("Translations applied.");
} else {
    console.log("Target string not found.");
}
