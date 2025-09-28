import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '@/db';
import { meetings, agent, user } from '@/db/schema';
import { eq, desc, getTableColumns } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        // Get session using the auth server
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all meetings for the current user
        const userMeetings = await db
            .select({
                ...getTableColumns(meetings),
                agentName: agent.name,
                userName: user.name,
                userEmail: user.email,
            })
            .from(meetings)
            .innerJoin(agent, eq(meetings.agentId, agent.id))
            .innerJoin(user, eq(meetings.userId, user.id))
            .where(eq(meetings.userId, session.user.id))
            .orderBy(desc(meetings.createdAt));

        // Create PDF with A4 landscape orientation for better table display
        const doc = new jsPDF('landscape', 'mm', 'a4');

        // Set document properties
        doc.setProperties({
            title: 'MeetMind AI - Meetings Report',
            subject: 'Generated Meetings Report',
            author: 'MeetMind AI',
            creator: 'MeetMind AI System'
        });

        // Colors
        const primaryColor = [37, 99, 235]; // Blue
        const secondaryColor = [100, 116, 139]; // Gray
        const accentColor = [16, 185, 129]; // Green

        // Add background header
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 297, 40, 'F');

        // Add MeetMind AI logo/header text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('MeetMind AI', 20, 20);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.text('Meetings Report', 20, 30);

        // Add date on the right
        doc.setFontSize(12);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })}`, 200, 25);

        // Reset text color for body content
        doc.setTextColor(40, 40, 40);

        // Add user information section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Report Details', 20, 55);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`User: ${session.user.name || 'N/A'}`, 20, 65);
        doc.text(`Email: ${session.user.email}`, 20, 73);
        doc.text(`Total Records: ${userMeetings.length}`, 20, 81);

        // Add separator line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(20, 90, 277, 90);

        // Prepare table data with better formatting
        const tableData = userMeetings.map((meeting, index) => [
            index + 1,
            meeting.name || 'Untitled Meeting',
            meeting.agentName || 'Unknown Agent',
            meeting.status?.charAt(0).toUpperCase() + meeting.status?.slice(1) || 'Unknown',
            meeting.createdAt ? new Date(meeting.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }) : 'N/A',
            meeting.createdAt ? new Date(meeting.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) : 'N/A',
            meeting.startedAt ? new Date(meeting.startedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }) : 'Not Started',
            meeting.endedAt ? new Date(meeting.endedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }) : 'Not Ended',
            meeting.startedAt && meeting.endedAt
                ? `${Math.round((new Date(meeting.endedAt).getTime() - new Date(meeting.startedAt).getTime()) / (1000 * 60))} min`
                : 'N/A'
        ]);

        // Add enhanced table with better spacing and design
        autoTable(doc, {
            head: [['#', 'Meeting Name', 'Agent Name', 'Status', 'Created Date', 'Created Time', 'Started Date', 'Ended Date', 'Duration']],
            body: tableData,
            startY: 100,
            theme: 'striped',
            styles: {
                fontSize: 9,
                cellPadding: 4,
                overflow: 'linebreak',
                halign: 'center',
                valign: 'middle',
                lineColor: [220, 220, 220],
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: primaryColor,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 10,
                cellPadding: 6,
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 15 }, // #
                1: { halign: 'left', cellWidth: 45 },   // Meeting Name
                2: { halign: 'left', cellWidth: 35 },   // Agent Name
                3: { halign: 'center', cellWidth: 25 }, // Status
                4: { halign: 'center', cellWidth: 30 }, // Created Date
                5: { halign: 'center', cellWidth: 25 }, // Created Time
                6: { halign: 'center', cellWidth: 30 }, // Started Date
                7: { halign: 'center', cellWidth: 30 }, // Ended Date
                8: { halign: 'center', cellWidth: 20 }, // Duration
            },
            margin: { left: 20, right: 20 },
            didDrawPage: function (data) {
                // Add page numbers
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(
                    `Page ${data.pageNumber}`,
                    doc.internal.pageSize.width - 30,
                    doc.internal.pageSize.height - 10
                );
            },
        });

        // Get final Y position after table
        const finalY = (doc as any).lastAutoTable.finalY || 100;

        // Add summary section with better styling
        if (finalY < doc.internal.pageSize.height - 80) {
            // Add summary background
            doc.setFillColor(248, 250, 252);
            doc.rect(20, finalY + 15, 257, 50, 'F');

            // Add summary border
            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setLineWidth(1);
            doc.rect(20, finalY + 15, 257, 50);

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text('Meeting Summary', 25, finalY + 28);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 40, 40);
            doc.text(`Total Meetings: ${userMeetings.length}`, 25, finalY + 38);

            // Status breakdown
            const statusCounts = userMeetings.reduce((acc, meeting) => {
                const status = meeting.status || 'unknown';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            let xPos = 25;
            let yPos = finalY + 48;

            Object.entries(statusCounts).forEach(([status, count], index) => {
                const text = `${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`;
                doc.text(text, xPos, yPos);
                xPos += 60;

                // Move to next line if needed
                if ((index + 1) % 4 === 0) {
                    xPos = 25;
                    yPos += 10;
                }
            });
        }

        // Add footer with branding
        const pageHeight = doc.internal.pageSize.height;
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, pageHeight - 15, 297, 15, 'F');

        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'normal');
        doc.text('Generated by MeetMind AI Platform', 20, pageHeight - 5);
        doc.text('meetmindai.online', 220, pageHeight - 5);

        // Generate PDF buffer
        const pdfBuffer = doc.output('arraybuffer');

        // Create response with PDF
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="MeetMind-Meetings-Report-${new Date().toISOString().split('T')[0]}.pdf"`,
                'Content-Length': pdfBuffer.byteLength.toString(),
            },
        });

    } catch (error) {
        console.error('Error generating PDF report:', error);
        return NextResponse.json(
            { error: 'Failed to generate report' },
            { status: 500 }
        );
    }
}
