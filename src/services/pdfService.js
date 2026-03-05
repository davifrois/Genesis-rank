import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { rankAthletes } from './scoringService';
import { nextPowerOfTwo } from './bracketService';

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
    throw new Error('Módulo de tabela do PDF não está disponível.');
};

const loadImage = (src) => new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
        reject(new Error('Ambiente sem suporte a imagens.'));
        return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar imagem.'));
    img.src = src;
});

const fitText = (doc, text, maxWidth) => {
    if (!text) return '';
    if (doc.getTextWidth(text) <= maxWidth) return text;
    let trimmed = text;
    while (trimmed.length > 0 && doc.getTextWidth(`${trimmed}...`) > maxWidth) {
        trimmed = trimmed.slice(0, -1);
    }
    return trimmed.length ? `${trimmed}...` : text;
};

const computeRoundCenters = (slotCount, seedY, rounds) => {
    const centers = [];
    for (let r = 0; r < rounds; r += 1) {
        const groupSize = 2 ** (r + 1);
        const matchCount = slotCount / groupSize;
        const roundCenters = [];
        for (let m = 0; m < matchCount; m += 1) {
            const start = m * groupSize;
            const end = start + groupSize - 1;
            roundCenters.push((seedY[start] + seedY[end]) / 2);
        }
        centers.push(roundCenters);
    }
    return centers;
};

const drawBracketSide = ({
    doc,
    seeds,
    seedY,
    slotHeight,
    roundCenters,
    roundX,
    nameX,
    nameWidth,
    lineStartX,
    finalX,
    alignRight
}) => {
    const sideRounds = roundCenters.length;
    const nameFontSize = slotHeight >= 8 ? 7.2 : 6.2;
    const academyFontSize = Math.max(5, nameFontSize - 1.4);
    const lineOffset = Math.min(1.6, slotHeight * 0.3);
    doc.setFont('helvetica', 'normal');

    seeds.forEach((seed, index) => {
        const y = seedY[index];
        const name = seed?.name || 'BYE';
        const academy = seed?.academy || '';

        doc.setTextColor(20);
        doc.setFontSize(nameFontSize);
        const nameText = fitText(doc, name, nameWidth - 4);
        doc.text(nameText, alignRight ? nameX : nameX, y - lineOffset, {
            align: alignRight ? 'right' : 'left',
            baseline: 'middle'
        });

        if (academy) {
            doc.setTextColor(90);
            doc.setFontSize(academyFontSize);
            const academyText = fitText(doc, academy, nameWidth - 4);
            doc.text(academyText, alignRight ? nameX : nameX, y + lineOffset, {
                align: alignRight ? 'right' : 'left',
                baseline: 'middle'
            });
        }
        if (sideRounds === 0) {
            doc.line(lineStartX, y, finalX, y);
        } else {
            doc.line(lineStartX, y, roundX[0], y);
        }
    });

    if (sideRounds === 0) return;

    for (let r = 0; r < sideRounds; r += 1) {
        const currentCenters = roundCenters[r];
        const x = roundX[r];
        const nextX = r < sideRounds - 1 ? roundX[r + 1] : finalX;
        currentCenters.forEach((centerY, matchIndex) => {
            const child1 = r === 0
                ? seedY[matchIndex * 2]
                : roundCenters[r - 1][matchIndex * 2];
            const child2 = r === 0
                ? seedY[matchIndex * 2 + 1]
                : roundCenters[r - 1][matchIndex * 2 + 1];
            doc.line(x, child1, x, child2);
            doc.line(x, centerY, nextX, centerY);
        });
    }
};

export const generateBracketsPDF = async (brackets, athletes, options = {}) => {
    const {
        eventName = '',
        eventDate = '',
        eventLocation = '',
        logoUrl = '/genesis-logo.png',
        modeLabel = ''
    } = options;

    if (!Array.isArray(brackets) || brackets.length === 0) {
        throw new Error('Nenhuma chave encontrada para exportar.');
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const logo = await loadImage(logoUrl).catch(() => null);
    const athletesMap = new Map(athletes.map((athlete) => [athlete.id, athlete]));

    brackets.forEach((bracket, index) => {
        if (index > 0) {
            doc.addPage('a4', 'landscape');
        }

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setFillColor(...BRAND_PRIMARY);
        doc.rect(0, 0, pageWidth, 18, 'F');

        if (logo) {
            doc.addImage(logo, 'PNG', 10, 3, 26, 12);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text('GENESIS ESPORTES - CHAVEAMENTO', 40, 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(40);

        const metaParts = [
            eventName ? `Evento: ${eventName}` : '',
            eventDate ? `Data: ${formatDate(eventDate)}` : '',
            eventLocation ? `Local: ${eventLocation}` : '',
            modeLabel ? `Modalidade: ${modeLabel}` : ''
        ].filter(Boolean);

        doc.text(metaParts.join(' | '), 10, 26);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(20);
        doc.text(`Chave ${bracket.number || '-'}`, 10, 34);
        doc.text(bracket.label || 'Categoria', pageWidth / 2, 34, { align: 'center' });

        const size = nextPowerOfTwo(bracket.seedIds?.length || 0, 2);
        const seeds = Array.from({ length: size }, (_, idx) => {
            const id = bracket.seedIds?.[idx];
            const athlete = id ? athletesMap.get(id) : null;
            if (!athlete) {
                return { name: 'BYE', academy: '' };
            }
            return {
                name: athlete?.nome || 'Atleta',
                academy: athlete?.academia || 'Sem academia'
            };
        });

        const topMargin = 42;
        const footerPadding = 6;
        const footerHeight = 38;
        const bottomMargin = footerHeight + footerPadding;
        const leftMargin = 10;
        const rightMargin = 10;
        const centerGap = 22;
        const nameWidth = 60;
        const totalHeight = pageHeight - topMargin - bottomMargin;
        const sideSlots = size / 2;
        const slotHeight = totalHeight / sideSlots;
        const seedY = Array.from({ length: sideSlots }, (_, idx) => (
            topMargin + slotHeight / 2 + idx * slotHeight
        ));

        const rounds = Math.max(1, Math.log2(size));
        const sideRounds = Math.max(0, rounds - 1);
        const bracketWidth = (pageWidth - leftMargin - rightMargin - 2 * nameWidth - centerGap) / 2;
        const roundStep = sideRounds > 0 ? bracketWidth / sideRounds : 0;
        const leftRoundX = Array.from({ length: sideRounds }, (_, r) => (
            leftMargin + nameWidth + 4 + roundStep * r
        ));
        const rightRoundX = Array.from({ length: sideRounds }, (_, r) => (
            pageWidth - rightMargin - nameWidth - 4 - roundStep * r
        ));
        const centerLeftX = pageWidth / 2 - centerGap / 2;
        const centerRightX = pageWidth / 2 + centerGap / 2;

        const leftSeeds = seeds.slice(0, sideSlots);
        const rightSeeds = seeds.slice(sideSlots);

        const leftCenters = computeRoundCenters(sideSlots, seedY, sideRounds);
        const rightCenters = computeRoundCenters(sideSlots, seedY, sideRounds);

        doc.setDrawColor(40);
        drawBracketSide({
            doc,
            seeds: leftSeeds,
            seedY,
            slotHeight,
            roundCenters: leftCenters,
            roundX: leftRoundX,
            nameX: leftMargin,
            nameWidth,
            lineStartX: leftMargin + nameWidth,
            finalX: centerLeftX,
            alignRight: false
        });

        drawBracketSide({
            doc,
            seeds: rightSeeds,
            seedY,
            slotHeight,
            roundCenters: rightCenters,
            roundX: rightRoundX,
            nameX: pageWidth - rightMargin,
            nameWidth,
            lineStartX: pageWidth - rightMargin - nameWidth,
            finalX: centerRightX,
            alignRight: true
        });

        const finalY = topMargin + totalHeight / 2;
        doc.setDrawColor(80);
        doc.circle(pageWidth / 2, finalY, 4, 'S');

        const footerTop = pageHeight - footerHeight;
        const podiumStartY = footerTop + 4;
        const podiumGap = 6;
        const podiumLineStartX = pageWidth / 2 - 4;
        const podiumLineEndX = pageWidth / 2 + 18;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30);
        doc.text('1º', pageWidth / 2 - 10, podiumStartY, { align: 'center', baseline: 'middle' });
        doc.text('2º', pageWidth / 2 - 10, podiumStartY + podiumGap, { align: 'center', baseline: 'middle' });
        doc.text('3º', pageWidth / 2 - 10, podiumStartY + podiumGap * 2, { align: 'center', baseline: 'middle' });
        doc.setDrawColor(120);
        doc.line(podiumLineStartX, podiumStartY, podiumLineEndX, podiumStartY);
        doc.line(podiumLineStartX, podiumStartY + podiumGap, podiumLineEndX, podiumStartY + podiumGap);
        doc.line(podiumLineStartX, podiumStartY + podiumGap * 2, podiumLineEndX, podiumStartY + podiumGap * 2);

        const baiaCount = 10;
        const baiaBoxWidth = 10;
        const baiaBoxHeight = 6;
        const baiaGap = 2;
        const baiaTotalWidth = baiaCount * baiaBoxWidth + (baiaCount - 1) * baiaGap;
        const baiaStartX = (pageWidth - baiaTotalWidth) / 2;
        const baiaY = footerTop + 18;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(40);
        for (let i = 0; i < baiaCount; i += 1) {
            const x = baiaStartX + i * (baiaBoxWidth + baiaGap);
            doc.roundedRect(x, baiaY, baiaBoxWidth, baiaBoxHeight, 1, 1);
            doc.text(String(i + 1), x + baiaBoxWidth / 2, baiaY + baiaBoxHeight / 2 + 1.5, {
                align: 'center',
                baseline: 'middle'
            });
        }

        const signLineY = footerTop + 28;
        const signWidth = 42;
        doc.setDrawColor(80);
        doc.line(leftMargin, signLineY, leftMargin + signWidth, signLineY);
        doc.line(pageWidth - rightMargin - signWidth, signLineY, pageWidth - rightMargin, signLineY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(50);
        doc.text('Chamador', leftMargin + signWidth / 2, signLineY + 4, { align: 'center' });
        doc.text('Mesário', pageWidth - rightMargin - signWidth / 2, signLineY + 4, { align: 'center' });
    });

    const fileName = `Chaves_${buildFileSafeName(eventName)}_${buildFileSafeName(modeLabel || 'geral')}.pdf`;
    doc.save(fileName);
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
    doc.text('RELATÓRIO OFICIAL DE RANKING 2025', 14, 32);

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

export const generateFilteredRankingPDF = ({ groups = [], winners = [], options = {} }) => {
    const {
        eventName = '',
        eventDate = '',
        eventLocation = '',
        modeLabel = '',
        searchTerm = ''
    } = options;
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(...BRAND_PRIMARY);
    doc.rect(0, 0, 210, 34, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('GENESIS ESPORTES', 14, 21);

    doc.setFontSize(9);
    doc.text('RELATÓRIO DE RANKING FILTRADO', 14, 28);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90);
    let cursorY = 42;
    doc.text(`Documento gerado em: ${new Date().toLocaleString()}`, 14, cursorY);
    cursorY += 6;

    if (eventName) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20);
        doc.text(`Evento: ${eventName}`, 14, cursorY);
        cursorY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(90);
    }

    const metaParts = [
        eventDate ? `Data: ${formatDate(eventDate)}` : '',
        eventLocation ? `Local: ${eventLocation}` : '',
        modeLabel ? `Modalidade: ${modeLabel}` : '',
        searchTerm ? `Filtro: ${searchTerm}` : ''
    ].filter(Boolean);

    if (metaParts.length) {
        doc.text(metaParts.join(' | '), 14, cursorY);
        cursorY += 6;
    }

    if (modeLabel && modeLabel.toUpperCase().includes('GERAL')) {
        const tableColumn = ['POS', 'ATLETA', 'CATEGORIA', 'ACADEMIA', 'PTS'];
        const tableRows = (winners || []).map((item, index) => [
            index + 1,
            item.athlete?.nome || '',
            item.label || '',
            item.athlete?.academia || '',
            item.athlete?.pontos ?? ''
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
                4: { halign: 'center', fontStyle: 'bold', textColor: BRAND_ACCENT }
            }
        });
    } else {
        const tableColumn = ['POS', 'ATLETA', 'ACADEMIA', 'FAIXA', 'PESO', 'PTS'];
        (groups || []).forEach((group) => {
            if (!group || !Array.isArray(group.entries) || group.entries.length === 0) return;
            if (cursorY > pageHeight - 30) {
                doc.addPage();
                cursorY = 20;
            }

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(20);
            doc.setFontSize(11);
            doc.text(group.label || 'Categoria', 14, cursorY);
            cursorY += 4;

            const tableRows = group.entries.map((athlete, index) => [
                index + 1,
                athlete?.nome || '',
                athlete?.academia || '',
                athlete?.faixa || '',
                athlete?.peso || '',
                athlete?.pontos ?? ''
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

            if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
                cursorY = doc.lastAutoTable.finalY + 8;
            } else {
                cursorY += 8;
            }
        });
    }

    const fileName = `Ranking_Filtrado_${buildFileSafeName(eventName)}_${buildFileSafeName(modeLabel || 'geral')}.pdf`;
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
