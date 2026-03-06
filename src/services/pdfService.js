import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { rankAthletes } from './scoringService';
import { nextPowerOfTwo } from './bracketService';

const BRAND_PRIMARY = [11, 52, 84];
const BRAND_SECONDARY = [24, 96, 152];
const BRAND_ACCENT = [235, 168, 58];
const BRAND_TEXT = [20, 32, 48];
const BRAND_MUTED = [88, 105, 128];
const BRAND_LINE = [210, 222, 236];
const BRAND_ALT_ROW = [246, 250, 255];
const DEFAULT_LOGO_URL = '/genesis-logo.png';

const formatDate = (dateString) => {
    if (!dateString) return '';
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return dateString;
    return parsed.toLocaleDateString('pt-BR');
};

const formatDateTime = (date = new Date()) => (
    date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
);

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

const logoCache = new Map();

const loadLogo = async (logoUrl = DEFAULT_LOGO_URL) => {
    const source = (logoUrl || DEFAULT_LOGO_URL).toString().trim() || DEFAULT_LOGO_URL;
    if (logoCache.has(source)) {
        return logoCache.get(source);
    }
    try {
        const logo = await loadImage(source);
        logoCache.set(source, logo);
        return logo;
    } catch {
        logoCache.set(source, null);
        return null;
    }
};

const buildMetaLine = (parts) => (
    (Array.isArray(parts) ? parts : [])
        .map((part) => (part || '').toString().trim())
        .filter(Boolean)
        .join(' | ')
);

const drawBrandHeader = (doc, {
    logo = null,
    title = 'GENESIS ESPORTES',
    subtitle = '',
    metaLine = ''
} = {}) => {
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(...BRAND_PRIMARY);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setFillColor(...BRAND_SECONDARY);
    doc.rect(0, 20, pageWidth, 2, 'F');

    if (logo) {
        doc.addImage(logo, 'PNG', 9, 3, 26, 14);
    }

    const textX = logo ? 38 : 12;
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, textX, 10.5, { baseline: 'middle' });

    if (subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(subtitle, textX, 16, { baseline: 'middle' });
    }

    if (metaLine) {
        doc.setTextColor(...BRAND_MUTED);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        const wrapped = doc.splitTextToSize(metaLine, pageWidth - 24);
        doc.text(wrapped, 12, 28);
    }
};

const drawBrandFooter = (doc, pageNumber, totalPages) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(...BRAND_LINE);
    doc.setLineWidth(0.25);
    doc.line(10, pageHeight - 11, pageWidth - 10, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.setTextColor(...BRAND_MUTED);
    doc.text('Genesis Esportes - Documento oficial', 10, pageHeight - 6.6);
    doc.text(`Pagina ${pageNumber}/${totalPages}`, pageWidth - 10, pageHeight - 6.6, { align: 'right' });
};

const applyBrandFrameToAllPages = (doc, headerOptions) => {
    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        drawBrandHeader(doc, headerOptions);
        drawBrandFooter(doc, page, totalPages);
    }
};

const createTableTheme = (columnStyles = {}) => ({
    theme: 'grid',
    margin: { left: 12, right: 12, top: 36, bottom: 16 },
    headStyles: {
        fillColor: BRAND_PRIMARY,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
    },
    bodyStyles: {
        fontSize: 8,
        textColor: BRAND_TEXT
    },
    alternateRowStyles: {
        fillColor: BRAND_ALT_ROW
    },
    styles: {
        lineColor: BRAND_LINE,
        lineWidth: 0.15,
        cellPadding: 1.8
    },
    columnStyles
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

        doc.setTextColor(...BRAND_TEXT);
        doc.setFontSize(nameFontSize);
        const nameText = fitText(doc, name, nameWidth - 4);
        doc.text(nameText, nameX, y - lineOffset, {
            align: alignRight ? 'right' : 'left',
            baseline: 'middle'
        });

        if (academy) {
            doc.setTextColor(...BRAND_MUTED);
            doc.setFontSize(academyFontSize);
            const academyText = fitText(doc, academy, nameWidth - 4);
            doc.text(academyText, nameX, y + lineOffset, {
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
        logoUrl = DEFAULT_LOGO_URL,
        modeLabel = ''
    } = options;

    if (!Array.isArray(brackets) || brackets.length === 0) {
        throw new Error('Nenhuma chave encontrada para exportar.');
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const logo = await loadLogo(logoUrl);
    const athletesMap = new Map((athletes || []).map((athlete) => [athlete.id, athlete]));
    const totalPages = brackets.length;

    brackets.forEach((bracket, index) => {
        if (index > 0) {
            doc.addPage('a4', 'landscape');
        }

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const metaLine = buildMetaLine([
            eventName ? `Evento: ${eventName}` : '',
            eventDate ? `Data: ${formatDate(eventDate)}` : '',
            eventLocation ? `Local: ${eventLocation}` : '',
            modeLabel ? `Modalidade: ${modeLabel}` : ''
        ]);

        drawBrandHeader(doc, {
            logo,
            title: 'CHAVEAMENTO OFICIAL',
            subtitle: bracket.label || `Chave ${bracket.number || '-'}`,
            metaLine
        });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.8);
        doc.setTextColor(...BRAND_TEXT);
        doc.text(`Chave ${bracket.number || '-'}`, 12, 36);
        doc.text(bracket.label || 'Categoria', pageWidth / 2, 36, { align: 'center' });

        const size = nextPowerOfTwo(bracket.seedIds?.length || 0, 2);
        const seeds = Array.from({ length: size }, (_, slotIndex) => {
            const athleteId = bracket.seedIds?.[slotIndex];
            const athlete = athleteId ? athletesMap.get(athleteId) : null;
            if (!athlete) {
                return { name: 'BYE', academy: '' };
            }
            return {
                name: athlete?.nome || 'Atleta',
                academy: athlete?.academia || 'Sem academia'
            };
        });

        const topMargin = 44;
        const footerPadding = 4;
        const footerHeight = 38;
        const bottomMargin = footerHeight + footerPadding;
        const leftMargin = 11;
        const rightMargin = 11;
        const centerGap = 22;
        const nameWidth = 59;
        const totalHeight = pageHeight - topMargin - bottomMargin;
        const sideSlots = size / 2;
        const slotHeight = totalHeight / sideSlots;
        const seedY = Array.from({ length: sideSlots }, (_, slotIndex) => (
            topMargin + slotHeight / 2 + slotIndex * slotHeight
        ));

        const rounds = Math.max(1, Math.log2(size));
        const sideRounds = Math.max(0, rounds - 1);
        const bracketWidth = (pageWidth - leftMargin - rightMargin - (2 * nameWidth) - centerGap) / 2;
        const roundStep = sideRounds > 0 ? bracketWidth / sideRounds : 0;
        const leftRoundX = Array.from({ length: sideRounds }, (_, roundIndex) => (
            leftMargin + nameWidth + 4 + roundStep * roundIndex
        ));
        const rightRoundX = Array.from({ length: sideRounds }, (_, roundIndex) => (
            pageWidth - rightMargin - nameWidth - 4 - roundStep * roundIndex
        ));
        const centerLeftX = pageWidth / 2 - centerGap / 2;
        const centerRightX = pageWidth / 2 + centerGap / 2;

        const leftSeeds = seeds.slice(0, sideSlots);
        const rightSeeds = seeds.slice(sideSlots);
        const leftCenters = computeRoundCenters(sideSlots, seedY, sideRounds);
        const rightCenters = computeRoundCenters(sideSlots, seedY, sideRounds);

        doc.setDrawColor(...BRAND_SECONDARY);
        doc.setLineWidth(0.3);
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
        doc.setFillColor(...BRAND_ACCENT);
        doc.circle(pageWidth / 2, finalY, 3.8, 'F');

        const footerTop = pageHeight - footerHeight;
        doc.setTextColor(...BRAND_MUTED);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Podio', pageWidth / 2, footerTop + 5, { align: 'center' });

        const podiumRows = ['1o', '2o', '3o'];
        const podiumLineStartX = pageWidth / 2 - 4;
        const podiumLineEndX = pageWidth / 2 + 22;
        podiumRows.forEach((row, rowIndex) => {
            const y = footerTop + 10 + rowIndex * 6;
            doc.setFont('helvetica', 'bold');
            doc.text(row, pageWidth / 2 - 10, y, { align: 'center', baseline: 'middle' });
            doc.setDrawColor(...BRAND_LINE);
            doc.line(podiumLineStartX, y, podiumLineEndX, y);
        });

        const baiaCount = 10;
        const baiaBoxWidth = 10;
        const baiaBoxHeight = 6;
        const baiaGap = 2;
        const baiaTotalWidth = baiaCount * baiaBoxWidth + (baiaCount - 1) * baiaGap;
        const baiaStartX = (pageWidth - baiaTotalWidth) / 2;
        const baiaY = footerTop + 24;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...BRAND_TEXT);
        for (let i = 0; i < baiaCount; i += 1) {
            const x = baiaStartX + i * (baiaBoxWidth + baiaGap);
            doc.setDrawColor(...BRAND_LINE);
            doc.roundedRect(x, baiaY, baiaBoxWidth, baiaBoxHeight, 1, 1);
            doc.text(String(i + 1), x + baiaBoxWidth / 2, baiaY + baiaBoxHeight / 2 + 1.4, {
                align: 'center',
                baseline: 'middle'
            });
        }

        const signLineY = footerTop + 35;
        const signWidth = 44;
        doc.setDrawColor(...BRAND_LINE);
        doc.line(leftMargin, signLineY, leftMargin + signWidth, signLineY);
        doc.line(pageWidth - rightMargin - signWidth, signLineY, pageWidth - rightMargin, signLineY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...BRAND_MUTED);
        doc.text('Chamador', leftMargin + signWidth / 2, signLineY + 3.8, { align: 'center' });
        doc.text('Mesario', pageWidth - rightMargin - signWidth / 2, signLineY + 3.8, { align: 'center' });

        drawBrandFooter(doc, index + 1, totalPages);
    });

    const fileName = `Chaves_${buildFileSafeName(eventName)}_${buildFileSafeName(modeLabel || 'geral')}.pdf`;
    doc.save(fileName);
};

export const generateRankingPDF = async (athletes, options = {}) => {
    const {
        eventName = '',
        eventDate = '',
        eventLocation = '',
        logoUrl = DEFAULT_LOGO_URL
    } = options;

    const doc = new jsPDF();
    const logo = await loadLogo(logoUrl);
    const rankedAthletes = rankAthletes(Array.isArray(athletes) ? athletes : []);
    const generatedAt = formatDateTime();

    const tableColumns = ['POS', 'ATLETA', 'FAIXA', 'CATEGORIA', 'ACADEMIA', 'PTS'];
    const tableRows = rankedAthletes.map((athlete, index) => [
        index + 1,
        (athlete?.nome || '').toUpperCase(),
        athlete?.faixa || '-',
        athlete?.categoria || '-',
        athlete?.academia || '-',
        athlete?.pontos ?? 0
    ]);

    runAutoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: 38,
        ...createTableTheme({
            0: { halign: 'center', fontStyle: 'bold', cellWidth: 12 },
            5: { halign: 'center', fontStyle: 'bold', textColor: BRAND_ACCENT, cellWidth: 14 }
        })
    });

    const metaLine = buildMetaLine([
        eventName ? `Evento: ${eventName}` : '',
        eventDate ? `Data: ${formatDate(eventDate)}` : '',
        eventLocation ? `Local: ${eventLocation}` : '',
        `Gerado em: ${generatedAt}`
    ]);

    applyBrandFrameToAllPages(doc, {
        logo,
        title: 'RANKING OFICIAL',
        subtitle: eventName || 'Genesis Esportes',
        metaLine
    });

    const fileName = `Ranking_Genesis_${buildFileSafeName(eventName)}.pdf`;
    doc.save(fileName);
};

export const generateFilteredRankingPDF = async ({ groups = [], winners = [], options = {} }) => {
    const {
        eventName = '',
        eventDate = '',
        eventLocation = '',
        modeLabel = '',
        searchTerm = '',
        logoUrl = DEFAULT_LOGO_URL
    } = options;

    const doc = new jsPDF();
    const logo = await loadLogo(logoUrl);
    const pageHeight = doc.internal.pageSize.getHeight();
    const generatedAt = formatDateTime();
    let cursorY = 38;

    if (modeLabel && modeLabel.toUpperCase().includes('GERAL')) {
        const tableColumns = ['POS', 'ATLETA', 'CATEGORIA', 'ACADEMIA', 'PTS'];
        const tableRows = (Array.isArray(winners) ? winners : []).map((item, index) => [
            index + 1,
            item?.athlete?.nome || '',
            item?.label || '',
            item?.athlete?.academia || '',
            item?.athlete?.pontos ?? ''
        ]);

        runAutoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: cursorY,
            ...createTableTheme({
                0: { halign: 'center', fontStyle: 'bold', cellWidth: 12 },
                4: { halign: 'center', fontStyle: 'bold', textColor: BRAND_ACCENT, cellWidth: 14 }
            })
        });
    } else {
        const tableColumns = ['POS', 'ATLETA', 'ACADEMIA', 'FAIXA', 'PESO', 'PTS'];
        (Array.isArray(groups) ? groups : []).forEach((group) => {
            if (!group || !Array.isArray(group.entries) || group.entries.length === 0) return;

            if (cursorY > pageHeight - 30) {
                doc.addPage();
                cursorY = 38;
            }

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...BRAND_TEXT);
            doc.setFontSize(10);
            doc.text(group.label || 'Categoria', 12, cursorY);
            cursorY += 5;

            const tableRows = group.entries.map((athlete, index) => [
                index + 1,
                athlete?.nome || '',
                athlete?.academia || '',
                athlete?.faixa || '',
                athlete?.peso || '',
                athlete?.pontos ?? ''
            ]);

            runAutoTable(doc, {
                head: [tableColumns],
                body: tableRows,
                startY: cursorY,
                ...createTableTheme({
                    0: { halign: 'center', fontStyle: 'bold', cellWidth: 12 },
                    5: { halign: 'center', fontStyle: 'bold', textColor: BRAND_ACCENT, cellWidth: 14 }
                })
            });

            cursorY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 8 : cursorY + 8;
        });
    }

    const metaLine = buildMetaLine([
        eventName ? `Evento: ${eventName}` : '',
        eventDate ? `Data: ${formatDate(eventDate)}` : '',
        eventLocation ? `Local: ${eventLocation}` : '',
        modeLabel ? `Modalidade: ${modeLabel}` : '',
        searchTerm ? `Filtro: ${searchTerm}` : '',
        `Gerado em: ${generatedAt}`
    ]);

    applyBrandFrameToAllPages(doc, {
        logo,
        title: 'RANKING FILTRADO',
        subtitle: eventName || 'Genesis Esportes',
        metaLine
    });

    const fileName = `Ranking_Filtrado_${buildFileSafeName(eventName)}_${buildFileSafeName(modeLabel || 'geral')}.pdf`;
    doc.save(fileName);
};

export const generateEventResultsPDF = async (eventName, podiums, options = {}) => {
    const {
        eventDate = '',
        eventLocation = '',
        logoUrl = DEFAULT_LOGO_URL
    } = options;

    const doc = new jsPDF();
    const logo = await loadLogo(logoUrl);
    let currentY = 38;

    (Array.isArray(podiums) ? podiums : []).forEach((podium) => {
        if (currentY > doc.internal.pageSize.getHeight() - 45) {
            doc.addPage();
            currentY = 38;
        }

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND_TEXT);
        doc.setFontSize(11);
        doc.text(`${podium?.category || '-'} - ${podium?.belt || '-'}`, 12, currentY);
        currentY += 4;

        const rows = [
            ['1o LUGAR', podium?.first?.nome || '-', podium?.first?.academia || '-'],
            ['2o LUGAR', podium?.second?.nome || '-', podium?.second?.academia || '-'],
            ['3o LUGAR', podium?.third?.nome || '-', podium?.third?.academia || '-']
        ];

        runAutoTable(doc, {
            head: [['POSICAO', 'ATLETA', 'ACADEMIA']],
            body: rows,
            startY: currentY,
            ...createTableTheme({
                0: { fontStyle: 'bold', textColor: BRAND_SECONDARY, cellWidth: 28 }
            })
        });

        currentY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 8 : currentY + 8;
    });

    const metaLine = buildMetaLine([
        eventName ? `Evento: ${eventName}` : '',
        eventDate ? `Data: ${formatDate(eventDate)}` : '',
        eventLocation ? `Local: ${eventLocation}` : '',
        `Gerado em: ${formatDateTime()}`
    ]);

    applyBrandFrameToAllPages(doc, {
        logo,
        title: 'BOLETIM OFICIAL DE RESULTADOS',
        subtitle: eventName || 'Genesis Esportes',
        metaLine
    });

    doc.save(`Boletim_${buildFileSafeName(eventName)}.pdf`);
};
