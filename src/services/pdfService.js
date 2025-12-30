import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { rankAthletes } from './scoringService';

const BRAND_PRIMARY = [15, 58, 95];
const BRAND_ACCENT = [26, 95, 161];

const formatDate = (dateString) => {
    if (!dateString) return '';
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return dateString;
    return parsed.toLocaleDateString('pt-BR');
};

const buildFileSafeName = (value) => (
    (value || 'Geral')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 60)
);

const runAutoTable = (doc, config) => {
    if (doc && typeof doc.autoTable === 'function') {
        doc.autoTable(config);
        return;
    }
    if (typeof autoTable === 'function') {
        autoTable(doc, config);
        return;
    }
    throw new Error('Modulo de tabela do PDF nao esta disponivel.');
};

export const generateRankingPDF = (athletes, options = {}) => {
    const {
        eventName = '',
        eventDate = '',
        eventLocation = ''
    } = options;
    const doc = new jsPDF();

    // Header with Genesis branding
    doc.setFillColor(...BRAND_PRIMARY);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('GENESIS ESPORTES', 14, 25);

    doc.setFontSize(10);
    doc.text('RELATORIO OFICIAL DE RANKING 2025', 14, 32);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(90);

    let cursorY = 50;
    doc.text(`Documento gerado em: ${new Date().toLocaleString()}`, 14, cursorY);
    cursorY += 6;

    if (eventName) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(20);
        doc.text(`Evento: ${eventName}`, 14, cursorY);
        cursorY += 6;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(90);
    }

    const metaParts = [
        eventDate ? `Data: ${formatDate(eventDate)}` : '',
        eventLocation ? `Local: ${eventLocation}` : ''
    ].filter(Boolean);

    if (metaParts.length) {
        doc.text(metaParts.join(' | '), 14, cursorY);
        cursorY += 6;
    }

    const tableColumn = ["POS", "ATLETA", "FAIXA", "CATEGORIA", "ACADEMIA", "PTS"];
    const tableRows = rankAthletes(athletes)
        .map((a, index) => [
            index + 1,
            a.nome.toUpperCase(),
            a.faixa,
            a.categoria,
            a.academia,
            a.pontos
        ]);

    runAutoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: cursorY + 2,
        theme: 'grid',
        headStyles: {
            fillColor: BRAND_PRIMARY,
            textColor: [255, 255, 255],
            fontSize: 8,
            halign: 'center'
        },
        styles: { fontSize: 8 },
        columnStyles: {
            0: { halign: 'center', fontStyle: 'bold' },
            5: { halign: 'center', fontStyle: 'bold', textColor: BRAND_ACCENT }
        }
    });

    const fileName = `Ranking_Genesis_${buildFileSafeName(eventName)}.pdf`;
    doc.save(fileName);
};

export const generateEventResultsPDF = (eventName, podiums) => {
    const doc = new jsPDF();

    doc.setFillColor(...BRAND_PRIMARY);
    doc.rect(0, 0, 210, 30, 'F');

    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(`RESULTADOS: ${eventName.toUpperCase()}`, 14, 20);

    let currentY = 40;

    podiums.forEach(p => {
        doc.setFontSize(12);
        doc.setTextColor(...BRAND_ACCENT);
        doc.text(`${p.category} - ${p.belt}`, 14, currentY);

        currentY += 5;

        const rows = [
            ["1º LUGAR", p.first.nome, p.first.academia],
            ["2º LUGAR", p.second.nome, p.second.academia],
            ["3º LUGAR", p.third?.nome || '-', p.third?.academia || '-'],
        ];

        runAutoTable(doc, {
            body: rows,
            startY: currentY,
            theme: 'striped',
            styles: { fontSize: 9 }
        });

        currentY = doc.lastAutoTable.finalY + 15;
    });

    doc.save(`Boletim_${eventName}.pdf`);
};
