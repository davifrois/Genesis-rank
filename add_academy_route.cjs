const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Import
const importToAdd = "import AcademyProfileSettings from './pages/AcademyProfileSettings';\n";
if (!content.includes('import AcademyProfileSettings')) {
    // Find last import
    const lastImportIndex = content.lastIndexOf('import ');
    const endOfLastImport = content.indexOf('\n', lastImportIndex) + 1;
    content = content.substring(0, endOfLastImport) + importToAdd + content.substring(endOfLastImport);
}

// 2. Change account menu link path
content = content.replace(
    "{ label: copy.accountMenu.academy, path: '/academia', icon: Users },",
    "{ label: copy.accountMenu.academy, path: '/perfil-academia', icon: Users },"
);

// 3. Add Route
const routeToAdd = '<Route path="/perfil-academia" element={<AcademyProfileSettings />} />\n                    ';
if (!content.includes('path="/perfil-academia"')) {
    content = content.replace(
        '<Route path="/academia" element={<Membership />} />',
        '<Route path="/academia" element={<Membership />} />\n                    ' + routeToAdd
    );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("App.jsx updated with AcademyProfileSettings route and menu link.");
