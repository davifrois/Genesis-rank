const fs = require('fs');

async function restore() {
    try {
        const bakContent = fs.readFileSync('src/pages/Dashboard.jsx.bak', 'utf8');
        let currentContent = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

        // 1. Imports
        if (!currentContent.includes('Swords')) {
            currentContent = currentContent.replace('Send\n} from \'lucide-react\';', 'Send,\n    Swords,\n    Plus,\n    X\n} from \'lucide-react\';');
        }

        // 2. ADMIN_SECTION_ROUTES
        if (!currentContent.includes('superfights: \'/admin/lutas-casadas\'')) {
            currentContent = currentContent.replace('activity: \'/admin/atividade\'\n};', 'activity: \'/admin/atividade\',\n    superfights: \'/admin/lutas-casadas\'\n};');
        }

        // 3. nav translations
        if (!currentContent.includes('superfights: \'Luta Casada\'')) {
            // Find English nav
            currentContent = currentContent.replace(
                'activity: \'Activity\'\n                },',
                'activity: \'Activity\',\n                    superfights: \'Super Fights\'\n                },'
            );
            // Find Portuguese nav
            currentContent = currentContent.replace(
                'activity: \'Atividade\'\n                },',
                'activity: \'Atividade\',\n                    superfights: \'Luta Casada\'\n                },'
            );
        }

        // 4. state: superfightForm
        if (!currentContent.includes('const [superfightForm')) {
            currentContent = currentContent.replace(
                'const [userEditPassword, setUserEditPassword] = useState(\'\');',
                'const [userEditPassword, setUserEditPassword] = useState(\'\');\n    const [superfightForm, setSuperfightForm] = useState(null);'
            );
        }

        // 5. navItems
        if (!currentContent.includes('{ id: \'superfights\'')) {
            currentContent = currentContent.replace(
                '{ id: \'schedule\', label: copy.nav.schedule, icon: Clock },\n            { id: \'athletes\'',
                '{ id: \'schedule\', label: copy.nav.schedule, icon: Clock },\n            { id: \'superfights\', label: copy.nav.superfights, icon: Swords },\n            { id: \'athletes\''
            );
        }

        // 6. mobile navItems (if missing)
        if (!currentContent.includes('handleNavClick(\'superfights\')')) {
            // we skip it for now or add it after schedule
        }

        // 7. Event Modal Toggle
        const toggleBlock = `
                                                        {
                                                            label: 'Lutas Casadas',
                                                            desc: 'Ativa o painel de Lutas Casadas para este evento.',
                                                            key: 'superFightsPublished',
                                                            icon: '🗡️',
                                                            activeColor: '#ef4444',
                                                        },`;
        if (!currentContent.includes('label: \'Lutas Casadas\'')) {
            currentContent = currentContent.replace(
                `{
                                                            label: 'Inscrições Abertas',`,
                `${toggleBlock}
                                                        {
                                                            label: 'Inscrições Abertas',`
            );
        }

        // 8. activeSection === 'superfights'
        const superfightsSection = bakContent.substring(
            bakContent.indexOf('{/* 🗡️ LUTAS CASADAS (SUPERFIGHTS) 🗡️ */}'),
            bakContent.indexOf('{/* 📜 ACTIVITY (HISTÓRICO) 📜 */}')
        );
        if (superfightsSection && !currentContent.includes('LUTAS CASADAS (SUPERFIGHTS)')) {
            currentContent = currentContent.replace(
                '{/* 📜 ACTIVITY (HISTÓRICO) 📜 */}',
                superfightsSection + '\n                {/* 📜 ACTIVITY (HISTÓRICO) 📜 */}'
            );
        }

        // 9. Superfight modal
        const superfightModal = bakContent.substring(
            bakContent.indexOf('{/* SUPERFIGHT MODAL */}'),
            bakContent.indexOf('{/* ATHLETE DETAILS MODAL */}')
        );
        if (superfightModal && !currentContent.includes('{/* SUPERFIGHT MODAL */}')) {
            currentContent = currentContent.replace(
                '{/* ATHLETE DETAILS MODAL */}',
                superfightModal + '\n            {/* ATHLETE DETAILS MODAL */}'
            );
        }

        fs.writeFileSync('src/pages/Dashboard.jsx', currentContent, 'utf8');
        console.log("Restoration script completed successfully.");
    } catch (e) {
        console.error("Error running restoration script:", e);
    }
}

restore();
