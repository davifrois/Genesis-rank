const fs = require('fs');

async function restoreV3() {
    try {
        const bakLines = fs.readFileSync('src/pages/Dashboard.jsx.bak', 'utf8').split('\n');
        const currLines = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8').split('\n');

        // Extract Superfight Section
        // Lines 7492 to 7747 (0-indexed: 7491 to 7747)
        const superfightSection = bakLines.slice(7491, 7747);

        // Extract Superfight Modal
        // Lines 9357 to 9582 (0-indexed: 9356 to 9582)
        const superfightModal = bakLines.slice(9356, 9582);

        // Find insertion point for Superfight Section
        const activityIndex = currLines.findIndex(line => line.includes("activeSection === 'activity'"));
        if (activityIndex !== -1 && !currLines.some(line => line.includes("LUTAS CASADAS (SUPERFIGHTS)"))) {
            currLines.splice(activityIndex, 0, ...superfightSection);
        }

        // Find insertion point for Superfight Modal
        const lastDivIndex = currLines.findLastIndex(line => line.trim() === '</div>');
        if (lastDivIndex !== -1 && !currLines.some(line => line.includes("SUPERFIGHT MODAL"))) {
            currLines.splice(lastDivIndex, 0, ...superfightModal);
        }

        fs.writeFileSync('src/pages/Dashboard.jsx', currLines.join('\n'), 'utf8');
        console.log("Restoration script v3 completed successfully.");
    } catch (e) {
        console.error("Error running restoration script v3:", e);
    }
}

restoreV3();
