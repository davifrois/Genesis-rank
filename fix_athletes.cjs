const fs = require('fs');
let content = fs.readFileSync('src/pages/Athletes.jsx', 'utf8');

const target1 = "  const [formSuccess, setFormSuccess] = useState('');";
const target2 = "      });";
const target3 = "  }, [athletes, eventsById, memberProfiles]);";

const idx1 = content.indexOf(target1);
const idx3 = content.indexOf(target3) + target3.length;

if (idx1 !== -1 && idx3 !== -1) {
    const replacement = `  const [formSuccess, setFormSuccess] = useState('');

  const eventsById = useMemo(
    () => new Map((Array.isArray(events) ? events : []).map((event) => [event.id, event])),
    [events]
  );

  const athleteCommunityRows = useMemo(() => {
    const profiles = (Array.isArray(memberProfiles) ? memberProfiles : [])
      .filter((profile) => (profile.fullName || '').toString().trim().length > 0);

    const existingNames = new Set(profiles.map(p => normalizeLookup(p.fullName)));
    const virtualProfiles = new Map();

    (Array.isArray(athletes) ? athletes : []).forEach(athlete => {
      const normName = normalizeLookup(athlete.nome);
      if (!normName || existingNames.has(normName)) return;

      if (!virtualProfiles.has(normName)) {
        virtualProfiles.set(normName, {
          id: 'virtual-' + (athlete.id || normName),
          fullName: athlete.nome,
          academyName: athlete.equipe || '',
          belt: athlete.faixa || '',
          country: athlete.countryCode || 'Brasil',
          gender: athlete.sexo || '',
          isVirtual: true,
          photoUrl: athlete.foto || ''
        });
      }
    });

    const allProfiles = [...profiles, ...virtualProfiles.values()];

    return allProfiles
      .map((profile) => resolveProfileMetrics({ profile, athletes, eventsById }))
      .sort((left, right) => {
        if (right.recentGold !== left.recentGold) return right.recentGold - left.recentGold;
        if (right.winRate !== left.winRate) return right.winRate - left.winRate;
        return right.activeScore - left.activeScore;
      });
  }, [athletes, eventsById, memberProfiles]);`;

    content = content.substring(0, idx1) + replacement + content.substring(idx3);
    fs.writeFileSync('src/pages/Athletes.jsx', content);
    console.log("Fixed!");
} else {
    console.log("Not found.");
}
