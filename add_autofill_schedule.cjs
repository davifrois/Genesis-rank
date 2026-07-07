const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, 'src', 'pages', 'Dashboard.jsx');
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

const functionHook = `    const handleAddManualScheduleItem = useCallback(() => {`;

const autoFillFunction = `
    const handleAutoFillScheduleFromBrackets = useCallback(() => {
        if (!scheduleEventId) {
            showFeedback('error', isEnglish ? 'Select an event first.' : 'Selecione um evento primeiro.');
            return;
        }

        const eventBrackets = brackets.filter(b => b.eventId === scheduleEventId);
        if (eventBrackets.length === 0) {
            showFeedback('warning', isEnglish ? 'No brackets generated for this event.' : 'Nenhuma chave gerada para este evento.');
            return;
        }

        // Sort brackets by number/label
        eventBrackets.sort((a, b) => (a.number || 0) - (b.number || 0));

        let currentMinute = parseClockToMinutes(scheduleDraft.start || '09:00');
        const defaultFightMinutes = 5;

        const newRows = eventBrackets.map((bracket, index) => {
            const athletesCount = (bracket.seedIds || []).length;
            const fightsCount = Math.max(1, athletesCount - 1);
            const duration = fightsCount * defaultFightMinutes;
            
            const startStr = formatMinutesToClock(currentMinute);
            currentMinute += duration;
            const endStr = formatMinutesToClock(currentMinute);

            return normalizeManualScheduleEntry({
                title: bracket.label || 'Categoria Sem Nome',
                type: 'FIGHT',
                area: scheduleDraft.area || 'Area 1',
                start: startStr,
                end: endStr,
                notes: \`\${athletesCount} atleta(s) - \${fightsCount} luta(s)\`,
                order: index + 1
            }, index);
        });

        updateManualScheduleRows(scheduleEventId, () => newRows);
        
        showFeedback('success', isEnglish ? 'Schedule generated from brackets!' : 'Cronograma gerado a partir das chaves!');
    }, [
        scheduleEventId,
        brackets,
        scheduleDraft,
        updateManualScheduleRows,
        showFeedback,
        isEnglish
    ]);

    const handleAddManualScheduleItem = useCallback(() => {`;

if (dashboardContent.includes(functionHook) && !dashboardContent.includes('handleAutoFillScheduleFromBrackets')) {
    dashboardContent = dashboardContent.replace(functionHook, autoFillFunction);
    console.log('Injected handleAutoFillScheduleFromBrackets');
} else {
    console.log('Failed to inject function or already injected.');
}

// Now insert the button
const buttonHook = `                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleAddManualScheduleItem}
                                >
                                    {copy.schedulePanel.addItemAction}
                                </button>`;

const newButtons = `                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleAutoFillScheduleFromBrackets}
                                >
                                    {isEnglish ? 'Auto-fill from Brackets' : 'Gerar das Chaves'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleAddManualScheduleItem}
                                >
                                    {copy.schedulePanel.addItemAction}
                                </button>`;

if (dashboardContent.includes(buttonHook)) {
    dashboardContent = dashboardContent.replace(buttonHook, newButtons);
    console.log('Injected auto fill button');
} else {
    console.log('Failed to inject button');
}

fs.writeFileSync(dashboardPath, dashboardContent, 'utf8');
console.log('Updated Dashboard.jsx');
