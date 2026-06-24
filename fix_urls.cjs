const fs = require('fs');
const files = [
  'src/services/api.js',
  'src/services/authService.js',
  'src/services/bracketRealtimeService.js',
  'src/services/coachNotificationService.js',
  'src/services/eventAdminService.js',
  'src/services/publicRegistrationService.js',
  'src/services/socialMediaService.js'
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/import\.meta\.env\.VITE_API_BASE_URL/g, '""');
    fs.writeFileSync(f, c);
  }
});
console.log('Fixed URLs');
