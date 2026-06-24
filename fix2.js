import fs from 'fs';
const file = 'src/components/TournamentRegistrationFlow.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `  useEffect(() => {
    if (selectedProfile && event?.id) {
      const state = {
        profileId: selectedProfile.id,
        profileSnapshot: selectedProfile,
        data: registrationData,
        step: step
      };
      localStorage.setItem(\`registration_progress_\${event.id}\`, JSON.stringify(state));
    }
  }, [selectedProfile, registrationData, step, event?.id]);`;

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

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log("REPLACED EXACTLY");
} else {
    // try to find with windows line endings
    const targetWin = target.replace(/\n/g, '\r\n');
    if (content.includes(targetWin)) {
        content = content.replace(targetWin, replacement);
        fs.writeFileSync(file, content);
        console.log("REPLACED EXACTLY WITH CRLF");
    } else {
        console.log("TARGET NOT FOUND");
    }
}
