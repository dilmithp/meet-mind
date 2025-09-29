"use client";

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { MeetingGetOne } from '@/modules/meetings/types';
import { format } from 'date-fns';
import { formatDuration } from '@/lib/utils';

// Register fonts (optional, but good for consistent look)
// Download Inter font from Google Fonts and place them in your /public folder
Font.register({
    family: 'Inter',
    fonts: [
        { src: '/fonts/Inter-Regular.ttf' },
        { src: '/fonts/Inter-Bold.ttf', fontWeight: 'bold' },
    ],
});

// Create styles for the PDF
const styles = StyleSheet.create({
    page: {
        fontFamily: 'Inter',
        padding: 30,
        fontSize: 11,
        color: '#333333',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#111111',
    },
    metaSection: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 5,
    },
    metaText: {
        fontSize: 10,
        marginBottom: 4,
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eeeeee',
        paddingBottom: 5,
    },
    summaryBody: {
        fontSize: 11,
        lineHeight: 1.5,
    },
    summaryParagraph: {
        marginBottom: 10,
    }
});

interface Props {
    data: MeetingGetOne;
}

export const SummaryPdfDocument = ({ data }: Props) => (
    <Document>
        <Page style={styles.page}>
            <Text style={styles.title}>{data.name}</Text>

            <View style={styles.metaSection}>
                <Text style={styles.metaText}>Agent: {data.agent.name}</Text>
                <Text style={styles.metaText}>Date: {data.startedAt ? format(new Date(data.startedAt), "PPP") : ""}</Text>
                <Text style={styles.metaText}>Duration: {data.duration ? formatDuration(data.duration) : "No duration"}</Text>
            </View>

            <Text style={styles.summaryTitle}>AI Generated Summary</Text>

            <View style={styles.summaryBody}>
                {/* Simple split for paragraphs, as Markdown is not supported directly */}
                {data.summary?.split('\n').map((paragraph, index) => (
                    <Text key={index} style={styles.summaryParagraph}>{paragraph}</Text>
                ))}
            </View>
        </Page>
    </Document>
);