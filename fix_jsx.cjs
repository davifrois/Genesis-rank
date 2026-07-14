const fs = require('fs');
const path = 'src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const target1 = "{canManagePanel && activeSection === 'overview' && (\n                <section style={{ display: 'grid'";
const replacement1 = `{canManagePanel && activeSection === 'overview' && (
                <div style={{ position: 'relative', minHeight: '800px' }}>
                    {/* Background Orbs Effect */}
                    <div style={{ position: 'absolute', top: '-5%', left: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(60px)', zIndex: 0, borderRadius: '50%' }}></div>
                    <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(60px)', zIndex: 0, borderRadius: '50%' }}></div>
                    
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <section style={{ display: 'grid'`;

const target2 = `                {/* FIM NOVOS WIDGETS TECNOLÓGICOS */}
                )}`;
const replacement2 = `                {/* FIM NOVOS WIDGETS TECNOLÓGICOS */}
                    </div>
                </div>
                )}`;

if (content.includes(target1) && content.includes(target2)) {
    content = content.replace(target1, replacement1);
    content = content.replace(target2, replacement2);
    fs.writeFileSync(path, content, 'utf8');
    console.log("JSX fixed and Orbs added.");
} else {
    console.error("Targets not found!");
}
