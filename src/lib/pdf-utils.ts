import jsPDF from "jspdf";
import "jspdf-autotable";
import { AgentsGetMany } from "@/modules/agents/types";

export const generateAgentsPdf = async (agents: AgentsGetMany) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const createdAt = new Date();
    const createdAtStr = createdAt.toLocaleString();

    // Try to fetch and rasterize the SVG logo from the public folder.
    let logoDataUrl: string | null = null;
    try {
        const res = await fetch('/logo.svg');
        if (res.ok) {
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = objectUrl;
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject();
            });

            // Draw to canvas to convert SVG -> PNG data URL
            const desiredHeight = 30; // px
            const scale = desiredHeight / (img.height || desiredHeight);
            const canvas = document.createElement('canvas');
            canvas.width = (img.width || desiredHeight) * scale;
            canvas.height = desiredHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                logoDataUrl = canvas.toDataURL('image/png');
            }

            URL.revokeObjectURL(objectUrl);
        }
    } catch (err) {
        // If logo can't be loaded, continue without it
        // eslint-disable-next-line no-console
        console.warn('Could not load logo for PDF header', err);
    }

    // Layout constants
    const margin = 14; // mm
    const headerTop = 6; // mm from top
    const headerHeight = 18; // mm
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Try to read the --primary CSS variable to match site theme; fallback to Tailwind green
    let headerRgb: { r: number; g: number; b: number } | null = null;
    try {
        const temp = document.createElement('div');
        temp.style.background = 'var(--primary)';
        temp.style.display = 'none';
        document.body.appendChild(temp);
        const cs = getComputedStyle(temp).backgroundColor; // e.g. 'rgb(34, 197, 94)'
        document.body.removeChild(temp);
        const match = cs.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (match) {
            headerRgb = { r: parseInt(match[1], 10), g: parseInt(match[2], 10), b: parseInt(match[3], 10) };
        }
    } catch {
        // ignore
    }

    // Ensure header is green if CSS var couldn't be parsed
    if (!headerRgb) {
        headerRgb = { r: 22, g: 163, b: 74 }; // #16a34a
    }

    // Helper to draw header on a given page
    const drawHeader = (pageNum: number) => {
        // Background bar
        doc.setFillColor(headerRgb!.r, headerRgb!.g, headerRgb!.b);
        doc.rect(0, headerTop, pageWidth, headerHeight, 'F');

        // Decide text color for contrast
        const luminance = (0.299 * headerRgb!.r + 0.587 * headerRgb!.g + 0.114 * headerRgb!.b) / 255;
        const useDarkText = luminance > 0.6;
        doc.setTextColor(useDarkText ? 0 : 255, useDarkText ? 0 : 255, useDarkText ? 0 : 255);

        // Logo and site name
        const logoY = headerTop + 3;
        if (logoDataUrl) {
            const logoWidth = 28; // mm
            const logoHeight = 9; // mm
            try {
                doc.addImage(logoDataUrl, 'PNG', margin, logoY, logoWidth, logoHeight);
            } catch {
                // ignore addImage errors
            }
            doc.setFontSize(16);
            doc.setFont(undefined, 'normal');
            doc.text('MeetMind', margin + 34, headerTop + 11);
        } else {
            doc.setFontSize(18);
            doc.setFont(undefined, 'normal');
            doc.text('MeetMind', margin, headerTop + 11);
        }

        // Created datetime on top-right
        doc.setFontSize(9);
        const createdText = `Created: ${createdAtStr}`;
        const createdTextWidth = doc.getTextWidth(createdText);
        doc.text(createdText, pageWidth - margin - createdTextWidth, headerTop + 11);

        // Subtle divider line below header
        doc.setDrawColor(200);
        doc.setLineWidth(0.2);
        doc.line(margin, headerTop + headerHeight + 1, pageWidth - margin, headerTop + headerHeight + 1);
    };

    // Modern title card
    const drawTitle = () => {
        const titleY = headerTop + headerHeight + 10;
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('My Agents Report', margin, titleY);

        // small subtitle right-aligned (optional)
        const subtitle = `Total agents: ${agents.length}`;
        const subtitleWidth = doc.getTextWidth(subtitle);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(subtitle, pageWidth - margin - subtitleWidth, titleY);
    };

    // Prepare table data
    const tableBody = agents.map((a) => [a.name || '', a.instructions || '', String(a.meetingCount ?? '')]);

    // AutoTable options with modern styling
    const pdfWithAutoTable = doc as unknown as { autoTable: (opts: any) => void };
    pdfWithAutoTable.autoTable({
        startY: headerTop + headerHeight + 20,
        margin: { left: margin, right: margin },
        head: [["Name", "Instructions", "Meetings"]],
        body: tableBody,
        styles: {
            font: 'helvetica',
            fontSize: 10,
            cellPadding: 6,
            textColor: 20,
        },
        headStyles: {
            fillColor: [headerRgb.r, headerRgb.g, headerRgb.b],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'left',
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },
        columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 30, halign: 'center' },
        },
        didDrawPage: (data: any) => {
            // Draw header for each page
            drawHeader(data.pageNumber);

            // Draw title on first page only
            if (data.pageNumber === 1) {
                drawTitle();
            }

            // Footer with page number
            const footerY = pageHeight - 10;
            doc.setFontSize(9);
            doc.setTextColor(120);
            const pageText = `Page ${data.pageNumber}`;
            const pageTextWidth = doc.getTextWidth(pageText);
            doc.text(pageText, (pageWidth - pageTextWidth) / 2, footerY);

            // Small left-aligned created datetime in footer too
            doc.text(createdAtStr, margin, footerY);
        },
        // Draw table with subtle borders
        tableLineColor: [220, 220, 220],
        tableLineWidth: 0.3,
    });

    // Save PDF
    const filename = `my-agents-report-${createdAt.toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
};