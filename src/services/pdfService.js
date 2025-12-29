import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { rankAthletes } from './scoringService';

export const generateRankingPDF = (athletes) => {
    const doc = new jsPDF();

    // Header with Genesis branding
    doc.setFillColor(211, 47, 47); // Genesis Red
    doc.rect(0, 0, 210, 40, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('GENESIS ESPORTES', 14, 25);

    doc.setFontSize(10);
    doc.text('RELATÓRIO OFICIAL DE RANKING 2025', 14, 32);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Documento gerado em: ${new Date().toLocaleString()}`, 14, 50);

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

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 55,
        theme: 'grid',
        headStyles: {
            fillColor: [31, 41, 55],
            textColor: [255, 255, 255],
            fontSize: 8,
            halign: 'center'
        },
        styles: { fontSize: 8 },
        columnStyles: {
            0: { halign: 'center', fontStyle: 'bold' },
            5: { halign: 'center', fontStyle: 'bold', textColor: [211, 47, 47] }
        }
    });

    doc.save(`Ranking_Genesis_Oficial.pdf`);
};

export const generateEventResultsPDF = (eventName, podiums) => {
    const doc = new jsPDF();

    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, 210, 30, 'F');

    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(`RESULTADOS: ${eventName.toUpperCase()}`, 14, 20);

    let currentY = 40;

    podiums.forEach(p => {
        doc.setFontSize(12);
        doc.setTextColor(211, 47, 47);
        doc.text(`${p.category} - ${p.belt}`, 14, currentY);

        currentY += 5;

        const rows = [
            ["1º LUGAR", p.first.nome, p.first.academia],
            ["2º LUGAR", p.second.nome, p.second.academia],
            ["3º LUGAR", p.third?.nome || '-', p.third?.academia || '-'],
        ];

        doc.autoTable({
            body: rows,
            startY: currentY,
            theme: 'striped',
            styles: { fontSize: 9 }
        });

        currentY = doc.lastAutoTable.finalY + 15;
    });

    doc.save(`Boletim_${eventName}.pdf`);
};
