import fs from 'fs';
const file = 'src/components/TournamentRegistrationFlow.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /  useEffect\(\(\) => \{[\s\S]*?if \(selectedProfile && event\?\.id\) \{[\s\S]*?const state = \{[\s\S]*?profileId: selectedProfile\.id,[\s\S]*?profileSnapshot: selectedProfile,[\s\S]*?data: registrationData,[\s\S]*?step: step[\s\S]*?\};[\s\S]*?localStorage\.setItem\(`registration_progress_\$\{event\.id\}`\, JSON\.stringify\(state\)\);[\s\S]*?\}[\s\S]*?\}, \[selectedProfile, registrationData, step, event\?\.id\]\);/;

const replacement = `  useEffect(() => {
    if (selectedProfile && event?.id) {
      const safeProfile = { ...selectedProfile };
      if (typeof safeProfile.photoUrl === 'string' && safeProfile.photoUrl.startsWith('data:image')) {
          safeProfile.photoUrl = '';
      }
      if (typeof safeProfile.coverUrl === 'string' && safeProfile.coverUrl.startsWith('data:image')) {
          safeProfile.coverUrl = '';
      }
      
      const state = {
        profileId: selectedProfile.id,
        profileSnapshot: safeProfile,
        data: registrationData,
        step: step
      };
      
      try {
        localStorage.setItem(\`registration_progress_\${event.id}\`, JSON.stringify(state));
      } catch (err) {
        console.warn('Quota exceeded in localStorage', err);
      }
    }
  }, [selectedProfile, registrationData, step, event?.id]);`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content);
    console.log("REPLACED EXACTLY WITH REGEX");
} else {
    console.log("TARGET NOT FOUND WITH REGEX");
}
