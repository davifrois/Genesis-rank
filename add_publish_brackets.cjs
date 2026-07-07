const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, 'src', 'pages', 'Dashboard.jsx');
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// 1. Add import for formatCategoryWithAge and generateSchedulePDF
if (!dashboardContent.includes('formatCategoryWithAge')) {
    dashboardContent = dashboardContent.replace(
        `import { buildFileSafeName, downloadCsv } from '../services/exportService';`,
        `import { buildFileSafeName, downloadCsv } from '../services/exportService';\nimport { formatCategoryWithAge } from '../utils/ageCategories';`
    );
}

// 2. Add handlePublishAndGeneratePDF function before handleExportBracketsPdf
const functionRegex = /const handleExportBracketsPdf = useCallback\(async \(\) => \{/;

const newFunction = `const handlePublishAndGeneratePDF = useCallback(async () => {
        if (!orderedFilteredBrackets.length) {
            showFeedback('error', copy.feedback.noBracketForPdf);
            return;
        }

        const eventMeta = events.find((event) => event.id === bracketEventId);

        try {
            // "Publish" by generating the PDF with age formatting
            let currentMinute = 540; // 09:00 AM in minutes
            const defaultFightMinutes = 5;

            const scheduleRows = orderedFilteredBrackets.map((bracket, index) => {
                const athletesCount = (bracket.seedIds || []).length;
                const fightsCount = Math.max(1, athletesCount - 1);
                const duration = fightsCount * defaultFightMinutes;
                
                const startStr = formatMinutesToClock(currentMinute);
                currentMinute += duration;
                const endStr = formatMinutesToClock(currentMinute);

                const labelWithAge = formatCategoryWithAge(bracket.label || 'Categoria');

                return {
                    order: index + 1,
                    bracketNumber: bracket.number || '-',
                    label: labelWithAge,
                    startLabel: startStr,
                    endLabel: endStr,
                    typeLabel: isEnglish ? 'FIGHT' : 'LUTA'
                };
            });

            const filename = buildFileSafeName(eventMeta?.name || 'Chaves_e_Cronograma', 'pdf');

            await generateSchedulePDF(scheduleRows, {
                eventName: eventMeta?.name || 'Campeonato',
                eventDate: eventMeta?.date || '',
                eventLocation: eventMeta?.location || '',
                posterUrl: eventMeta?.imageUrl || eventMeta?.posterUrl || '', // Championship image
                layout: 'table',
                totalFights: scheduleRows.length,
                startTime: '09:00'
            }, filename);

            showFeedback('success', isEnglish ? 'Brackets published and PDF generated.' : 'Chaves publicadas e PDF gerado com sucesso!');
        } catch (err) {
            showFeedback('error', err?.message || 'Erro ao gerar o PDF publicado.');
        }
    }, [
        bracketEventId,
        events,
        orderedFilteredBrackets,
        showFeedback,
        isEnglish
    ]);

    const handleExportBracketsPdf = useCallback(async () => {`;

if (dashboardContent.match(functionRegex)) {
    dashboardContent = dashboardContent.replace(functionRegex, newFunction);
    console.log('Injected handlePublishAndGeneratePDF');
} else {
    console.log('Could not find handleExportBracketsPdf to inject before');
}

// 3. Add the button to bracketsPanel
// We look for onClick={handleExportBracketsPdf} button
const bracketPdfButtonRegex = /<button\s+type="button"\s+className="btn btn-secondary"\s+onClick=\{handleExportBracketsPdf\}\s+disabled=\{\!orderedFilteredBrackets\.length\}\s*>\s*<Download size=\{14\} \/>\s*\{copy\.bracketsPanel\.exportPdf\}\s*<\/button>/;

const newBracketButtons = `<button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handlePublishAndGeneratePDF}
                                    disabled={!orderedFilteredBrackets.length}
                                    style={{ marginRight: '8px' }}
                                >
                                    <Download size={14} />
                                    {isEnglish ? 'Publish & Schedule PDF' : 'Publicar e Gerar PDF'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleExportBracketsPdf}
                                    disabled={!orderedFilteredBrackets.length}
                                >
                                    <Download size={14} />
                                    {copy.bracketsPanel.exportPdf}
                                </button>`;

if (dashboardContent.match(bracketPdfButtonRegex)) {
    dashboardContent = dashboardContent.replace(bracketPdfButtonRegex, newBracketButtons);
    console.log('Injected Publicar e Gerar PDF button');
} else {
    console.log('Could not find bracketPdf button to inject before');
}

fs.writeFileSync(dashboardPath, dashboardContent, 'utf8');
console.log('Dashboard updated with Publish Bracket Feature');
