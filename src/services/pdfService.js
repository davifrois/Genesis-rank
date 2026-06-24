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
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar imagem.'));
    img.src = src;
});

const logoCache = new Map();

const resolveLogoCandidates = (logoUrl) => {
    const requested = (logoUrl || DEFAULT_LOGO_URL).toString().trim() || DEFAULT_LOGO_URL;
    const withoutDotSlash = requested.replace(/^\.\//, '');
    const leadingSlash = withoutDotSlash.startsWith('/') ? withoutDotSlash : `/${withoutDotSlash}`;
    return [...new Set([
        requested,
        leadingSlash,
        DEFAULT_LOGO_URL
    ])];
};

const loadLogo = async (logoUrl = DEFAULT_LOGO_URL) => {
    const candidates = resolveLogoCandidates(logoUrl);
    for (const source of candidates) {
        if (logoCache.has(source)) {
            const cached = logoCache.get(source);
            if (cached) return cached;
            continue;
        }
        try {
            const logo = await loadImage(source);
            logoCache.set(source, logo);
            return logo;
        } catch {
            logoCache.set(source, null);
        }
    }
    return null;
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
        const subtitleLines = doc.splitTextToSize(subtitle, pageWidth - textX - 10).slice(0, 2);
        doc.text(subtitleLines, textX, 14.9, { baseline: 'middle' });
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
    alignRight,
    showAcademy,
    photoCache
}) => {
    const sideRounds = roundCenters.length;
    const cardHeight = Math.min(14, slotHeight * 0.9);
    const showPhoto = slotHeight >= 8.5;
    
    doc.setFont('helvetica', 'normal');

    seeds.forEach((seed, index) => {
        const y = seedY[index];
        const isBye = !seed.athleteId;
        const name = seed?.name || 'BYE';
        const academy = seed?.academy || '';

        // Draw Card - Light Theme
        const boxColor = isBye ? [245, 245, 245] : [255, 255, 255]; // light gray for BYE, white for athlete
        const borderColor = isBye ? [220, 220, 220] : [200, 205, 215]; // subtle borders
        const textColor = isBye ? [160, 160, 160] : [30, 40, 50]; // muted for BYE, dark for athlete
        const academyColor = isBye ? [180, 180, 180] : [100, 110, 130];
        
        doc.setDrawColor(...borderColor);
        doc.setFillColor(...boxColor);
        doc.setLineWidth(0.3);
        const topY = y - cardHeight / 2;
        const boxX = alignRight ? nameX - nameWidth : nameX;
        doc.roundedRect(boxX, topY, nameWidth, cardHeight, 1.5, 1.5, 'FD');

        const hasPhoto = !!seed.athleteId && photoCache.has(seed.athleteId);
        const imgSize = cardHeight - 2;
        
        let textX = alignRight ? boxX + nameWidth - 4 : boxX + 4;
        let maxTextWidth = nameWidth - 8;

        if (showPhoto && hasPhoto) {
            const photo = photoCache.get(seed.athleteId);
            const imgX = alignRight ? boxX + nameWidth - imgSize - 1 : boxX + 1;
            try {
                doc.addImage(photo, 'JPEG', imgX, topY + 1, imgSize, imgSize);
            } catch {
                // Ignore draw error
            }
            if (alignRight) {
                textX -= (imgSize + 2);
            } else {
                textX += (imgSize + 2);
            }
            maxTextWidth -= (imgSize + 2);
        }

        const fontSize = Math.max(5, Math.min(8, cardHeight * 0.45));
        doc.setTextColor(...textColor);
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBye ? 'normal' : 'bold');
        
        const lineOffset = (showAcademy && academy && cardHeight >= 7.4) ? 1.6 : 0;
        const nameText = fitText(doc, name, maxTextWidth);
        doc.text(nameText, textX, y - lineOffset, {
            align: alignRight ? 'right' : 'left',
            baseline: 'middle'
        });

        if (showAcademy && academy && cardHeight >= 7.4) {
            doc.setTextColor(...academyColor);
            doc.setFontSize(Math.max(4.5, fontSize - 1.5));
            doc.setFont('helvetica', 'normal');
            const academyText = fitText(doc, academy, maxTextWidth);
            doc.text(academyText, textX, y + 1.8, {
                align: alignRight ? 'right' : 'left',
                baseline: 'middle'
            });
        }

        if (sideRounds === 0) {
            doc.setDrawColor(200, 205, 215);
            doc.line(lineStartX, y, finalX, y);
        } else {
            doc.setDrawColor(200, 205, 215);
            doc.line(lineStartX, y, roundX[0], y);
        }
    });

    if (sideRounds === 0) return;

    for (let r = 0; r < sideRounds; r += 1) {
        const currentCenters = roundCenters[r];
        const x = roundX[r];
        const nextX = r < sideRounds - 1 ? roundX[r + 1] : finalX;
        doc.setDrawColor(200, 205, 215);
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

    const maxBracketSize = Math.max(
        2,
        ...brackets.map((bracket) => nextPowerOfTwo(bracket?.seedIds?.length || 0, 2))
    );
    const maxSideSlots = Math.max(1, Math.floor(maxBracketSize / 2));
    const pdfFormat = maxSideSlots > 8 ? 'a3' : 'a4';
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: pdfFormat });
    const logo = await loadLogo(logoUrl);
    const athletesMap = new Map((athletes || []).map((athlete) => [athlete.id, athlete]));
    
    // Load athlete photos
    const photoCache = new Map();
    const preloadPromises = Array.from(athletesMap.values()).map(async (athlete) => {
        const url = athlete?.photoUrl || athlete?.profileImageUrl;
        if (url && typeof url === 'string' && url.trim().length > 5) {
            try {
                const img = await loadImage(url);
                if (img) photoCache.set(athlete.id, img);
            } catch {
                // Ignore missing photos
            }
        }
    });
    await Promise.all(preloadPromises);

    const totalPages = brackets.length;

    brackets.forEach((bracket, index) => {
        if (index > 0) {
            doc.addPage(pdfFormat, 'landscape');
        }

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // White background for the entire page
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        const metaLine = buildMetaLine([
            eventName ? `Evento: ${eventName}` : '',
            eventDate ? `Data: ${formatDate(eventDate)}` : '',
            eventLocation ? `Local: ${eventLocation}` : '',
            modeLabel ? `Modalidade: ${modeLabel}` : ''
        ]);

        // --- BEAUTIFIED HEADER ---
        // Top colored bar
        doc.setFillColor(24, 96, 152); // Genesis Blue
        doc.rect(0, 0, pageWidth, 28, 'F');
        
        // Logo
        if (logo) {
            // Draw a white rounded box behind the logo to make it pop
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(8, 4, 30, 20, 2, 2, 'F');
            doc.addImage(logo, 'PNG', 10, 6, 26, 16);
        }

        const headerTextX = logo ? 44 : 12;
        
        // Main Title
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('CHAVEAMENTO OFICIAL', headerTextX, 10, { baseline: 'middle' });
        
        // Bracket Name / Division
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(235, 168, 58); // Genesis Accent Orange
        doc.text(bracket.label || `Chave ${bracket.number || '-'}`, headerTextX, 16, { baseline: 'middle' });
        
        // Meta Line
        doc.setFontSize(8);
        doc.setTextColor(220, 230, 240);
        doc.text(metaLine, headerTextX, 22, { baseline: 'middle' });

        // A separator line below the header
        doc.setDrawColor(235, 168, 58); // Accent orange line
        doc.setLineWidth(1);
        doc.line(0, 28, pageWidth, 28);
        // ------------------------

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 40, 50);
        doc.text(`Chave ${bracket.number || '-'}`, 12, 38);

        const size = nextPowerOfTwo(bracket.seedIds?.length || 0, 2);
        const seeds = Array.from({ length: size }, (_, slotIndex) => {
            const athleteId = bracket.seedIds?.[slotIndex];
            const athlete = athleteId ? athletesMap.get(athleteId) : null;
            if (!athlete) {
                return { name: 'BYE', academy: '', athleteId: null };
            }
            return {
                name: athlete?.nome || 'Atleta',
                academy: athlete?.academia || 'Sem academia',
                athleteId: athlete.id
            };
        });

        const topMargin = 48; // Adjusted for taller header
        const footerPadding = 4;
        const leftMargin = 11;
        const rightMargin = 11;
        const centerGap = 22;
        const nameWidth = 59;
        const sideSlots = size / 2;

        const computeSlotHeight = (footerHeight) => {
            const totalHeight = pageHeight - topMargin - (footerHeight + footerPadding);
            return totalHeight / sideSlots;
        };

        let footerHeight = 65; // Much larger footer for the big podio
        let slotHeight = computeSlotHeight(footerHeight);
        if (slotHeight < 10) {
            footerHeight = 55;
            slotHeight = computeSlotHeight(footerHeight);
        }
        if (slotHeight < 7) {
            footerHeight = 45;
            slotHeight = computeSlotHeight(footerHeight);
        }

        const showAcademy = slotHeight >= 7.4;
        const bottomMargin = footerHeight + footerPadding;
        const totalHeight = pageHeight - topMargin - bottomMargin;
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
        doc.setLineWidth(slotHeight < 6 ? 0.24 : 0.3);
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
            alignRight: false,
            showAcademy,
            photoCache
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
            alignRight: true,
            showAcademy,
            photoCache
        });

        // Draw Round Headers
        const ROUND_NAMES = ['Final', 'Semi-final', 'Quartas de final', 'Oitavas de final', '16-avos', '32-avos', '64-avos'];
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(120, 130, 140); 
        
        doc.text('Final', pageWidth / 2, topMargin - 4, { align: 'center' });
        
        const seedRoundName = ROUND_NAMES[sideRounds] || 'Classificatória';
        doc.text(seedRoundName, leftMargin + nameWidth / 2, topMargin - 4, { align: 'center' });
        doc.text(seedRoundName, pageWidth - rightMargin - nameWidth / 2, topMargin - 4, { align: 'center' });
        
        for (let r = 0; r < sideRounds; r++) {
            const roundName = ROUND_NAMES[sideRounds - r - 1] || 'Rodada';
            doc.text(roundName, leftRoundX[r], topMargin - 4, { align: 'center' });
            doc.text(roundName, rightRoundX[r], topMargin - 4, { align: 'center' });
        }

        const finalY = topMargin + totalHeight / 2;
        doc.setFillColor(235, 168, 58); // Genesis Accent Orange
        doc.circle(pageWidth / 2, finalY, 3.8, 'F');

        // --- ENLARGED PODIO ---
        const footerTop = pageHeight - footerHeight + 4;
        
        // Draw a subtle background for the podio area
        const podioWidth = 140;
        const podioX = pageWidth / 2 - podioWidth / 2;
        doc.setFillColor(250, 252, 255);
        doc.setDrawColor(220, 230, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(podioX, footerTop, podioWidth, footerHeight - 16, 2, 2, 'FD');

        doc.setTextColor(30, 40, 50);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('PODIO OFICIAL', pageWidth / 2, footerTop + 6, { align: 'center' });

        const podiumRows = ['1o LUGAR', '2o LUGAR', '3o LUGAR'];
        const podiumLineStartX = pageWidth / 2 - 40;
        const podiumLineEndX = pageWidth / 2 + 60;
        
        // Larger gaps and longer lines for writing names
        const lineSpacing = (footerHeight - 30) / 3;
        
        podiumRows.forEach((row, rowIndex) => {
            const y = footerTop + 14 + rowIndex * lineSpacing;
            
            // Highlight the 1st place with a different color text
            if (rowIndex === 0) {
                doc.setTextColor(218, 165, 32); // Gold color for 1o LUGAR
            } else if (rowIndex === 1) {
                doc.setTextColor(130, 140, 150); // Silver color
            } else {
                doc.setTextColor(184, 115, 51); // Bronze color
            }
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(row, podiumLineStartX - 4, y, { align: 'right', baseline: 'middle' });
            
            doc.setDrawColor(180, 190, 200);
            doc.setLineWidth(0.5);
            doc.line(podiumLineStartX, y + 2, podiumLineEndX, y + 2);
            
            // Small hint text below the line
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(6);
            doc.setTextColor(180, 180, 180);
            doc.text('Nome do Atleta / Academia', podiumLineStartX, y + 5);
        });
        // ----------------------

        // Removed Baia Boxes
        // Removed Mesario signature

        // Keep only Chamador signature, maybe moved slightly
        const signLineY = pageHeight - 16;
        const signWidth = 50;
        doc.setDrawColor(150, 160, 170);
        doc.setLineWidth(0.3);
        // Centered signature line on the left side
        doc.line(leftMargin + 10, signLineY, leftMargin + 10 + signWidth, signLineY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 110, 120);
        doc.text('Chamador (Staff)', leftMargin + 10 + signWidth / 2, signLineY + 4, { align: 'center' });

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

const normalizeRegistrationMode = (value) => {
    const raw = (value || '')
        .toString()
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    if (raw.includes('NO-GI') || raw.includes('NOGI')) return 'NO-GI';
    return 'GI';
};

const normalizeReportRows = (rows = []) => (
    (Array.isArray(rows) ? rows : [])
        .map((item) => ({
            athleteName: (item?.athleteName || item?.nome || '').toString().trim(),
            academyName: (item?.academyName || item?.academia || '').toString().trim() || 'Sem academia',
            gender: (item?.gender || item?.genero || '').toString().trim() || '-',
            belt: (item?.belt || item?.faixa || '').toString().trim() || '-',
            category: (item?.category || item?.categoria || '').toString().trim() || '-',
            weight: (item?.weight || item?.peso || '').toString().trim() || '-',
            mode: normalizeRegistrationMode(item?.mode || item?.modalidade || '')
        }))
        .filter((item) => item.athleteName)
);

const buildDivisionLabel = (row) => (
    [
        row.gender || '-',
        row.belt || '-',
        row.category || '-',
        row.weight || '-'
    ].map((part) => (part || '').toString().trim() || '-').join(' / ')
);

export const generateRegistrationListingPDF = async (rows = [], options = {}) => {
    const {
        eventName = '',
        eventDate = '',
        eventLocation = '',
        mode = 'GI',
        reportType = 'academy',
        logoUrl = DEFAULT_LOGO_URL,
        template = 'brand',
        updatedAtLabel = 'Atualizado em',
        updatedAtValue = formatDateTime()
    } = options;

    const normalizedRows = normalizeReportRows(rows)
        .filter((item) => item.mode === normalizeRegistrationMode(mode));

    if (!normalizedRows.length) {
        throw new Error('Nenhum atleta encontrado para gerar o relatório.');
    }

    const grouped = new Map();
    if (reportType === 'category') {
        normalizedRows.forEach((row) => {
            const key = buildDivisionLabel(row);
            const group = grouped.get(key) || [];
            group.push(row);
            grouped.set(key, group);
        });
    } else {
        normalizedRows.forEach((row) => {
            const key = row.academyName || 'Sem academia';
            const group = grouped.get(key) || [];
            group.push(row);
            grouped.set(key, group);
        });
    }

    const sortedGroups = [...grouped.entries()]
        .map(([label, entries]) => ({
            label,
            entries: entries.slice().sort((a, b) => a.athleteName.localeCompare(b.athleteName))
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

    const doc = new jsPDF();
    const reportTitle = reportType === 'category'
        ? 'RELACAO DE ATLETAS POR CATEGORIA'
        : 'RELACAO DE ATLETAS POR ACADEMIA';
    const modeLabel = normalizeRegistrationMode(mode);
    const useClassicWhite = (template || '').toString().trim().toLowerCase() === 'classic-white';

    if (useClassicWhite) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const eventLabel = eventName || 'Evento';
        const eventMeta = buildMetaLine([
            eventDate ? formatDate(eventDate) : '',
            eventLocation || ''
        ]);
        const headerTitle = reportType === 'category'
            ? 'RELACAO DE ATLETAS POR CATEGORIA'
            : 'RELACAO DE ATLETAS POR ACADEMIA';

        const drawHeader = () => {
            doc.setTextColor(22, 30, 46);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10.5);
            doc.text(eventLabel, 12, 12);

            if (modeLabel === 'NO-GI') {
                doc.setTextColor(220, 38, 38);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text('NO GI', 12, 17);
            }

            doc.setTextColor(12, 22, 36);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12.5);
            doc.text(headerTitle, pageWidth / 2, 15.5, { align: 'center' });

            doc.setTextColor(55, 65, 81);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`${updatedAtLabel} ${updatedAtValue}`, pageWidth - 12, 11.5, { align: 'right' });

            if (eventMeta) {
                doc.text(eventMeta, 12, 22);
            }

            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.line(12, 24.5, pageWidth - 12, 24.5);
        };

        const ensureSpace = (cursorY, neededHeight = 18) => {
            if (cursorY <= pageHeight - neededHeight) return cursorY;
            doc.addPage();
            drawHeader();
            return 30;
        };

        drawHeader();
        let cursorY = 30;

        sortedGroups.forEach((group) => {
            cursorY = ensureSpace(cursorY, 20);

            doc.setTextColor(0, 93, 172);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text((group.label || '-').toString().toUpperCase(), 12, cursorY);
            cursorY += 5;

            doc.setTextColor(31, 41, 55);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.2);
            doc.text(`Total de atletas: ${group.entries.length}`, 12, cursorY);
            cursorY += 1.5;

            const tableBody = group.entries.map((row) => (
                reportType === 'category'
                    ? [row.athleteName, row.academyName]
                    : [row.athleteName, buildDivisionLabel(row)]
            ));

            runAutoTable(doc, {
                head: [reportType === 'category' ? ['ATLETA', 'ACADEMIA'] : ['ATLETA', 'DIVISAO']],
                body: tableBody,
                startY: cursorY,
                theme: 'plain',
                margin: { left: 60, right: 12, top: 30, bottom: 12 },
                headStyles: {
                    fillColor: false,
                    textColor: [17, 24, 39],
                    fontSize: 8,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    textColor: [17, 24, 39],
                    fontSize: 8
                },
                styles: {
                    cellPadding: 0.7
                },
                columnStyles: {
                    0: { cellWidth: 65 },
                    1: { cellWidth: 62 }
                },
                didDrawPage: drawHeader
            });

            cursorY = (doc.lastAutoTable?.finalY || cursorY) + 5;
        });

        const filenameClassic = `Relacao_${reportType === 'category' ? 'categoria' : 'academia'}_${buildFileSafeName(eventName)}_${buildFileSafeName(modeLabel)}.pdf`;
        doc.save(filenameClassic);
        return;
    }

    const logo = await loadLogo(logoUrl);

    let cursorY = 38;
    const pageHeight = doc.internal.pageSize.getHeight();
    const ensureSpace = (neededHeight = 22) => {
        if (cursorY <= pageHeight - neededHeight) return;
        doc.addPage();
        cursorY = 38;
    };

    sortedGroups.forEach((group) => {
        ensureSpace(26);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...BRAND_SECONDARY);
        doc.text(group.label || '-', 12, cursorY);
        cursorY += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...BRAND_MUTED);
        doc.text(`Total de atletas: ${group.entries.length}`, 12, cursorY);
        cursorY += 3;

        const tableBody = group.entries.map((row) => (
            reportType === 'category'
                ? [
                    row.athleteName,
                    row.academyName
                ]
                : [
                    row.athleteName,
                    buildDivisionLabel(row)
                ]
        ));

        runAutoTable(doc, {
            head: [reportType === 'category' ? ['ATLETA', 'ACADEMIA'] : ['ATLETA', 'DIVISAO']],
            body: tableBody,
            startY: cursorY,
            ...createTableTheme({
                0: { cellWidth: 90 },
                1: { cellWidth: 86 }
            }),
            margin: { left: 12, right: 12, top: 36, bottom: 16 }
        });

        cursorY = (doc.lastAutoTable?.finalY || cursorY) + 7;
    });

    const metaLine = buildMetaLine([
        eventName ? `Evento: ${eventName}` : '',
        eventDate ? `Data: ${formatDate(eventDate)}` : '',
        eventLocation ? `Local: ${eventLocation}` : '',
        `Modalidade: ${modeLabel}`,
        `Atualizado em: ${formatDateTime()}`
    ]);

    applyBrandFrameToAllPages(doc, {
        logo,
        title: reportTitle,
        subtitle: eventName || 'Genesis Esportes',
        metaLine
    });

    const filename = `Relacao_${reportType === 'category' ? 'categoria' : 'academia'}_${buildFileSafeName(eventName)}_${buildFileSafeName(modeLabel)}.pdf`;
    doc.save(filename);
};

export const generateSchedulePDF = async (rows = [], options = {}) => {
    const {
        eventName = '',
        eventDate = '',
        eventLocation = '',
        modeLabel = '',
        layout = 'table',
        tvMode = false,
        startTime = '',
        fightStartTime = '',
        openingCeremonyTime = '',
        fightDurationMinutes = 0,
        transitionMinutes = 0,
        areaCount = 1,
        totalFights = 0,
        totalDurationLabel = '',
        estimatedEnd = '',
        posterUrl = '',
        arrivalNotice = '',
        fightTimeLegend = [],
        logoUrl = DEFAULT_LOGO_URL
    } = options;

    const normalizedRows = (Array.isArray(rows) ? rows : [])
        .map((row, index) => ({
            order: Number.isFinite(Number(row?.order)) ? Number(row.order) : index + 1,
            bracketNumber: row?.bracketNumber ?? '-',
            label: (row?.label || '-').toString(),
            mode: (row?.mode || '-').toString(),
            participants: Number.isFinite(Number(row?.participants)) ? Number(row.participants) : 0,
            fights: Number.isFinite(Number(row?.fightCount)) ? Number(row.fightCount) : 0,
            start: (row?.startLabel || '--:--').toString(),
            end: (row?.endLabel || '--:--').toString(),
            duration: (row?.durationLabel || '-').toString(),
            category: (row?.category || row?.label || '-').toString(),
            belt: (row?.belt || '-').toString(),
            gender: (row?.gender || '-').toString(),
            area: (row?.area || row?.bracketNumber || '-').toString(),
            type: (row?.type || 'FIGHT').toString(),
            fightDurationMinutes: Number.isFinite(Number(row?.fightDurationMinutes)) ? Number(row.fightDurationMinutes) : 0
        }))
        .sort((a, b) => a.order - b.order);

    if (!normalizedRows.length) {
        throw new Error('Nenhum dado de cronograma disponivel para exportacao.');
    }

    const isTvLayout = tvMode || ['tv', 'wall', 'presentation'].includes((layout || '').toString().trim().toLowerCase());
    const doc = new jsPDF({ orientation: isTvLayout ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    const logo = await loadLogo(logoUrl);
    const poster = posterUrl ? await loadLogo(posterUrl).catch(() => null) : null;
    const generatedAt = formatDateTime();

    const metaLine = buildMetaLine([
        eventName ? `Evento: ${eventName}` : '',
        eventDate ? `Data: ${formatDate(eventDate)}` : '',
        eventLocation ? `Local: ${eventLocation}` : '',
        modeLabel ? `Modalidade: ${modeLabel}` : '',
        openingCeremonyTime ? `Abertura/solenidades: ${openingCeremonyTime}` : '',
        (fightStartTime || startTime) ? `Inicio das lutas: ${fightStartTime || startTime}` : '',
        estimatedEnd ? `Termino previsto: ${estimatedEnd}` : '',
        `Areas: ${Math.max(1, Number(areaCount) || 1)}`,
        `Duracao luta: ${Math.max(1, Number(fightDurationMinutes) || 1)} min`,
        `Intervalo: ${Math.max(0, Number(transitionMinutes) || 0)} min`,
        `Lutas estimadas: ${Math.max(0, Number(totalFights) || 0)}`,
        totalDurationLabel ? `Duracao total: ${totalDurationLabel}` : '',
        `Gerado em: ${generatedAt}`
    ]);

    if (isTvLayout) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const left = 10;
        const right = 10;
        const top = 36;
        const bottom = 16;
        const sectionGap = 5;
        const cardGapX = 5;
        const cardGapY = 4.2;
        const columnCount = 2;
        const cardWidth = (pageWidth - left - right - (cardGapX * (columnCount - 1))) / columnCount;
        const statGap = 4;
        const statCount = 5;
        const statWidth = (pageWidth - left - right - (statGap * (statCount - 1))) / statCount;
        const safeAreaCount = Math.max(1, Number(areaCount) || 1);
        const safeFightDuration = Math.max(1, Number(fightDurationMinutes) || 1);
        const safeTransition = Math.max(0, Number(transitionMinutes) || 0);
        const safeTotalFights = Math.max(0, Number(totalFights) || 0);
        const availableBottom = pageHeight - bottom;

        const drawBox = (x, y, width, height, fillColor = null, strokeColor = BRAND_LINE) => {
            if (fillColor) {
                doc.setFillColor(...fillColor);
            }
            doc.setDrawColor(...strokeColor);
            if (typeof doc.roundedRect === 'function') {
                doc.roundedRect(x, y, width, height, 2.5, 2.5, fillColor ? 'FD' : 'S');
            } else {
                doc.rect(x, y, width, height, fillColor ? 'FD' : 'S');
            }
        };

        const drawOverview = (continuation = false) => {
            let cursor = top;

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...BRAND_PRIMARY);
            doc.setFontSize(16);
            doc.text(continuation ? 'CRONOGRAMA OFICIAL - CONTINUACAO' : 'CRONOGRAMA OFICIAL - MODO TV', left, cursor);
            cursor += 6;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...BRAND_MUTED);
            doc.setFontSize(9);
            const eventInfo = buildMetaLine([
                eventName ? `Evento: ${eventName}` : '',
                modeLabel ? `Modalidade: ${modeLabel}` : '',
                eventDate ? `Data: ${formatDate(eventDate)}` : '',
                eventLocation ? `Local: ${eventLocation}` : ''
            ]);
            doc.text(eventInfo || 'Genesis Esportes', left, cursor);
            cursor += 5.2;

            const stats = [
                { label: 'Inicio', value: startTime || '--:--' },
                { label: 'Termino previsto', value: estimatedEnd || '--:--' },
                { label: 'Areas ativas', value: `${safeAreaCount}` },
                { label: 'Lutas estimadas', value: `${safeTotalFights}` },
                { label: 'Ritmo medio', value: `${safeFightDuration}+${safeTransition} min` }
            ];

            stats.forEach((item, index) => {
                const x = left + (index * (statWidth + statGap));
                const y = cursor;
                drawBox(x, y, statWidth, 16, [246, 250, 255], BRAND_LINE);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...BRAND_SECONDARY);
                doc.setFontSize(7.4);
                doc.text((item.label || '').toUpperCase(), x + 2.6, y + 5.3);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...BRAND_TEXT);
                doc.setFontSize(12.6);
                doc.text(item.value || '-', x + 2.6, y + 12.4);
            });

            cursor += 16 + sectionGap;

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...BRAND_TEXT);
            doc.setFontSize(10.5);
            doc.text('SEQUENCIA DE LUTAS (TELAO / IMPRESSAO DE PAREDE)', left, cursor);
            cursor += 4.6;

            doc.setDrawColor(...BRAND_LINE);
            doc.setLineWidth(0.28);
            doc.line(left, cursor, pageWidth - right, cursor);
            cursor += 3.6;
            return cursor;
        };

        const buildCardHeight = (row) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11.8);
            const titleLines = doc.splitTextToSize(row.label || '-', cardWidth - 10).slice(0, 3);
            const titleHeight = Math.max(1, titleLines.length) * 4.45;
            return 21 + titleHeight + 10;
        };

        const drawScheduleCard = (row, x, y, width, height) => {
            drawBox(x, y, width, height, [250, 253, 255], BRAND_LINE);
            doc.setFillColor(...BRAND_PRIMARY);
            doc.rect(x, y, width, 8, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8.4);
            doc.text(`ORDEM ${row.order}  |  CHAVE ${row.bracketNumber}`, x + 2.8, y + 5.2);
            doc.text(`${row.start} - ${row.end}`, x + width - 2.8, y + 5.2, { align: 'right' });

            const modeMeta = `${row.mode} | ${row.participants} atletas | ${row.fights} lutas`;
            const titleTop = y + 13.3;
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...BRAND_TEXT);
            doc.setFontSize(11.8);
            const titleLines = doc.splitTextToSize(row.label || '-', width - 10).slice(0, 3);
            doc.text(titleLines, x + 3, titleTop);

            const titleHeight = Math.max(1, titleLines.length) * 4.45;
            const metaY = titleTop + titleHeight + 1.8;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...BRAND_MUTED);
            doc.setFontSize(8.7);
            doc.text(modeMeta, x + 3, metaY);

            const badgeWidth = 34;
            const badgeHeight = 5.6;
            const badgeX = x + width - badgeWidth - 3;
            const badgeY = y + height - badgeHeight - 2.4;
            drawBox(badgeX, badgeY, badgeWidth, badgeHeight, BRAND_ACCENT, [216, 156, 43]);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.text(row.duration || '-', badgeX + badgeWidth / 2, badgeY + 3.85, { align: 'center' });
        };

        let cursorY = drawOverview(false);
        let pointer = 0;

        while (pointer < normalizedRows.length) {
            const rowItems = normalizedRows.slice(pointer, pointer + columnCount);
            const rowHeight = Math.max(...rowItems.map(buildCardHeight));

            if (cursorY + rowHeight > availableBottom) {
                doc.addPage();
                cursorY = drawOverview(true);
            }

            rowItems.forEach((item, index) => {
                const x = left + (index * (cardWidth + cardGapX));
                drawScheduleCard(item, x, cursorY, cardWidth, rowHeight);
            });

            cursorY += rowHeight + cardGapY;
            pointer += columnCount;
        }

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.4);
        doc.setTextColor(...BRAND_MUTED);
        doc.text(
            `Gerado em ${generatedAt} | Formato visual para telao, chamada e impressao em parede.`,
            left,
            pageHeight - 13.2
        );
    } else {
        let cursorY = 36;
        const pageWidth = doc.internal.pageSize.getWidth();
        if (poster) {
            const maxWidth = pageWidth - 40;
            const targetWidth = Math.min(120, maxWidth);
            const ratio = poster.width > 0 ? (poster.height / poster.width) : 0.45;
            const targetHeight = Math.max(28, targetWidth * ratio);
            const x = (pageWidth - targetWidth) / 2;
            doc.addImage(poster, 'PNG', x, cursorY, targetWidth, targetHeight);
            cursorY += targetHeight + 5;
        }

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND_SECONDARY);
        doc.setFontSize(14);
        doc.text(`CRONOGRAMA - ${formatDate(eventDate) || eventDate || ''}`, pageWidth / 2, cursorY, { align: 'center' });
        cursorY += 6;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BRAND_TEXT);
        doc.setFontSize(10.2);
        const openingLine = openingCeremonyTime
            ? `Abertura do evento / solenidades: ${openingCeremonyTime}`
            : '';
        const fightsLine = (fightStartTime || startTime)
            ? `Inicio das lutas: ${fightStartTime || startTime}`
            : '';
        if (openingLine) {
            doc.text(openingLine, 14, cursorY);
            cursorY += 5;
        }
        if (fightsLine) {
            doc.setFont('helvetica', 'bold');
            doc.text(fightsLine, 14, cursorY);
            doc.setFont('helvetica', 'normal');
            cursorY += 5;
        }

        const rowsForTable = normalizedRows.some((row) => row.type.toUpperCase() === 'FIGHT')
            ? normalizedRows.filter((row) => row.type.toUpperCase() === 'FIGHT')
            : normalizedRows;
        const tableBody = rowsForTable
            .map((row) => ([
                `${row.start} - ${row.end}`,
                row.category || row.label,
                row.belt || '-',
                row.gender || '-',
                row.area || row.bracketNumber || '-'
            ]));

        runAutoTable(doc, {
            head: [[
                'HORARIO',
                'CATEGORIA',
                'FAIXA',
                'GENERO',
                'AREA'
            ]],
            body: tableBody,
            startY: cursorY,
            ...createTableTheme({
                0: { halign: 'center', cellWidth: 34, fontStyle: 'bold' },
                1: { cellWidth: 78, fontStyle: 'bold' },
                2: { halign: 'center', cellWidth: 30 },
                3: { halign: 'center', cellWidth: 28 },
                4: { halign: 'center', cellWidth: 20, fontStyle: 'bold' }
            }),
            margin: { left: 12, right: 12, top: 36, bottom: 18 }
        });

        const finalY = (doc.lastAutoTable?.finalY || cursorY) + 6;
        const safeNotice = (arrivalNotice || '').toString().trim()
            || 'Os atletas deverao chegar com no minimo 40 minutos de antecedencia do horario previsto da categoria.';

        doc.setTextColor(220, 38, 38);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        const wrappedNotice = doc.splitTextToSize(safeNotice, pageWidth - 26);
        doc.text(wrappedNotice, 14, finalY);

        const legendSource = Array.isArray(fightTimeLegend) && fightTimeLegend.length
            ? fightTimeLegend
            : [];
        const legendY = finalY + (wrappedNotice.length * 4.2) + 5;

        if (legendSource.length > 0) {
            doc.setTextColor(...BRAND_TEXT);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.2);
            doc.text('Tempos de luta', 14, legendY);

            const legendBody = legendSource.map((item) => ([
                (item?.label || '').toString().trim() || '-',
                `${Math.max(1, Number(item?.durationMinutes) || 0)} min`
            ]));

            runAutoTable(doc, {
                head: [['Categoria / faixa', 'Duracao']],
                body: legendBody,
                startY: legendY + 2,
                ...createTableTheme({
                    0: { cellWidth: 120 },
                    1: { halign: 'center', cellWidth: 30, fontStyle: 'bold' }
                }),
                margin: { left: 12, right: 12, top: 36, bottom: 18 }
            });
        }
    }

    applyBrandFrameToAllPages(doc, {
        logo,
        title: isTvLayout ? 'CRONOGRAMA OFICIAL - MODO TV' : 'CRONOGRAMA OFICIAL',
        subtitle: eventName || 'Genesis Esportes',
        metaLine
    });

    const fileName = isTvLayout
        ? `Cronograma_ModoTV_${buildFileSafeName(eventName)}_${buildFileSafeName(modeLabel || 'geral')}.pdf`
        : `Cronograma_${buildFileSafeName(eventName)}_${buildFileSafeName(modeLabel || 'geral')}.pdf`;
    doc.save(fileName);
};
