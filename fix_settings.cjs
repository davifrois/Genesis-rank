const fs = require('fs');

let c = fs.readFileSync('src/pages/Settings.jsx', 'utf8');

const regex = /const currentProfile = useMemo\(\(\) => \{.*?return bestMatches\.length > 0 \? bestMatches\[0\]\.profile : null;\n  \}, \[currentUser, memberProfiles\]\);/s;

const newLogic = `const linkedProfiles = useMemo(() => {
    if (!currentUser || !memberProfiles) return [];
    const username = (currentUser.username || '').toLowerCase();
    
    return memberProfiles.filter(p => {
      const accUser = (p.accountUsername || p.loginUsername || p.username || '').toLowerCase();
      const createdBy = (p.createdByUsername || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      return accUser === username || createdBy === username || email === username || p.id === currentUser.id;
    });
  }, [currentUser, memberProfiles]);

  const currentProfile = useMemo(() => {
    if (!currentUser) return null;
    
    if (linkedProfiles.length === 0) return null;
    const username = (currentUser.username || '').toLowerCase();
    const currentName = (currentUser.name || '').toLowerCase();

    let best = null;
    let bestScore = 0;

    linkedProfiles.forEach(p => {
      let score = 0;
      if ((p.fullName || '').toLowerCase() === currentName) score += 5;
      if ((p.email || '').toLowerCase() === username) score += 3;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    });

    return best || linkedProfiles[0] || null;
  }, [currentUser, linkedProfiles]);`;

c = c.replace(regex, newLogic);

fs.writeFileSync('src/pages/Settings.jsx', c);
console.log('Fixed Settings.jsx successfully!');
