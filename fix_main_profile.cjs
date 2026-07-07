const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

c = c.replace(
  `    linkedProfiles.forEach(p => {
      let score = 0;
      if ((p.fullName || '').toLowerCase() === currentName) score += 5;
      if ((p.email || '').toLowerCase() === username) score += 3;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    });

    return bestScore > 0 ? best : null;
  }, [currentUser, linkedProfiles]);`,
  `    linkedProfiles.forEach(p => {
      let score = 0;
      if ((p.fullName || '').toLowerCase() === currentName) score += 5;
      if ((p.email || '').toLowerCase() === username) score += 3;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    });

    return best || linkedProfiles[0] || null;
  }, [currentUser, linkedProfiles]);`
);

fs.writeFileSync('src/App.jsx', c);
console.log('Fixed mainProfile fallback!');
