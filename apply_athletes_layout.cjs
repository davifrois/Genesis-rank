const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Athletes.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const anchorStr = 'return (\\n    <div className="public-page athlete-community-page">';
const startIndex = content.indexOf(anchorStr);

if (startIndex === -1) {
    // try finding with slightly different spacing
    const regex = /return\s*\(\s*<div\s+className="public-page athlete-community-page">/;
    const match = content.match(regex);
    if (!match) {
        console.error("Could not find anchor string in Athletes.jsx");
        process.exit(1);
    }
    content = content.substring(0, match.index);
} else {
    content = content.substring(0, startIndex);
}

const replacement = `return (
    <div className="public-page athlete-community-page" style={{ padding: 0 }}>
      {/* HEADER SECTION */}
      <div className="athletes-ajp-header-section">
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
        </h2>
        
        <div className="athlete-community-columns">
          {renderTopList(topGold, 'gold')}
          {renderTopList(topWinRate, 'winrate')}
          {renderTopList(topActive, 'active')}
        </div>
      </section>

      {/* GLOBAL LIST */}
      <section className="public-section athlete-community-list" style={{ marginTop: '20px' }}>
        <header className="public-section-header" style={{ borderBottom: '1px solid #333' }}>
          <div className="header-left">
            <span className="badge">
              {isEnglish ? 'COMMUNITY RANKING' : 'RANKING DA COMUNIDADE'}
            </span>
            <h2 className="title">
              {isEnglish ? 'All athletes' : 'Todos os atletas'}
            </h2>
          </div>
          <div className="header-right">
            <span className="metric">{filteredProfiles.length} {isEnglish ? 'profiles' : 'perfis'}</span>
          </div>
        </header>

        <div className="athlete-community-grid">
          {filteredProfiles.length === 0 ? (
            <div className="empty-state">
              <p className="empty-message">
                {isEnglish ? 'No community athletes found matching filters.' : 'Nenhum atleta encontrado com esses filtros.'}
              </p>
            </div>
          ) : (
            filteredProfiles.map((item, index) => {
              const profile = item.profile;
              const shareCode = buildProfileShareCode(profile);
              return (
                <article className="athlete-community-card" key={profile.id}>
                  <div className="athlete-community-card__head">
                    <div className="athlete-community-card__avatar">
                      {profile.photoUrl ? <img src={profile.photoUrl} alt={profile.fullName || 'Atleta'} loading="lazy" style={{width: 45, height: 45, borderRadius: '50%', objectFit: 'cover'}} /> : getInitials(profile.fullName)}
                    </div>
                    <div className="athlete-community-card__title">
                      <h3>{profile.fullName || 'Atleta'}</h3>
                      <p>
                        {flagFromCountry(profile.country)} {profile.academyName || (isEnglish ? 'No academy' : 'Sem academia')}
                      </p>
                    </div>
                  </div>

                  <div className="athlete-community-card__status">
                    <span className={\`status-badge \${normalizeLookup(profile.joinStatus || 'approved')}\`}>
                      {normalizeLookup(profile.joinStatus || 'approved') === 'pending'
                        ? (isEnglish ? 'Pending coach approval' : 'Aguardando professor')
                        : normalizeLookup(profile.joinStatus || 'approved') === 'rejected'
                          ? (isEnglish ? 'Rejected' : 'Recusado')
                          : (isEnglish ? 'Approved' : 'Aprovado')}
                    </span>
                  </div>

                  <div className="athlete-community-card__meta">
                    <span><Trophy size={14} /> {item.recentGold} {isEnglish ? 'gold (100d)' : 'ouro (100d)'}</span>
                    <span><Medal size={14} /> {item.podiums} {isEnglish ? 'podiums' : 'pódios'}</span>
                    <span><Activity size={14} /> {item.winRate}% win rate</span>
                    <span><Users size={14} /> {item.eventsCount} {isEnglish ? 'events' : 'eventos'}</span>
                  </div>

                  <div className="athlete-community-card__tags">
                    {profile.belt ? <span className="tag">{profile.belt}</span> : null}
                    {profile.country ? <span className="tag">{profile.country}</span> : null}
                    {profile.city ? <span className="tag">{profile.city}</span> : null}
                    {profile.age !== '' && profile.age !== undefined && profile.age !== null ? (
                      <span className="tag">{profile.age} {isEnglish ? 'years' : 'anos'}</span>
                    ) : null}
                  </div>

                  <div className="athlete-community-card__events">
                    {item.upcomingEvents.length === 0 ? (
                      <small>{isEnglish ? 'No upcoming events linked.' : 'Sem próximos eventos vinculados.'}</small>
                    ) : item.upcomingEvents.map((event) => (
                      <small key={\`event-\${profile.id}-\${event.id}\`}>
                        <Calendar size={12} /> {event.name} - {formatDate(event.date, locale)}
                      </small>
                    ))}
                  </div>

                  <Link className="btn btn-secondary" to={\`/perfil-publico?codigo=\${encodeURIComponent(shareCode)}\`}>
                    {isEnglish ? 'Open public profile' : 'Abrir perfil público'}
                  </Link>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default Athletes;
`;

fs.writeFileSync(filePath, content + replacement, 'utf8');
console.log("Athletes.jsx layout injected successfully.");
