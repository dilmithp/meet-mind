"use client";

import { Document, Page, Text, View, StyleSheet, Font, Image, Svg, Path } from '@react-pdf/renderer';
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
const BRAND_GREEN = '#16a34a'; // Tailwind green-600 default; adjust if your site uses a different shade
const BRAND_GREEN_ACCENT = '#22c55e'; // green-500 accent

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Inter',
        fontSize: 11,
        color: '#333333',
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BRAND_GREEN,
        padding: 20,
        marginBottom: 25,
        borderRadius: 8,
    },
    logo: {
        width: 40,
        height: 40,
        marginRight: 15,
    },
    headerText: {
        flex: 1,
    },
    appName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 2,
    },
    tagline: {
        fontSize: 12,
        color: '#e2e8f0',
    },
    content: {
        padding: 30,
        paddingTop: 0,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 25,
        color: '#1e293b',
        textAlign: 'center',
        paddingBottom: 10,
        borderBottomWidth: 3,
        borderBottomColor: BRAND_GREEN_ACCENT,
    },
    metaSection: {
        marginBottom: 25,
        padding: 20,
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    metaRow: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'center',
    },
    metaLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#475569',
        width: 80,
    },
    metaValue: {
        fontSize: 11,
        color: '#1e293b',
        flex: 1,
    },
    summaryContainer: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        overflow: 'hidden',
    },
    summaryHeader: {
        backgroundColor: BRAND_GREEN_ACCENT,
        padding: 15,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
    },
    summaryBody: {
        padding: 20,
        backgroundColor: '#ffffff',
        fontSize: 11,
        lineHeight: 1.6,
    },
    summaryParagraph: {
        marginBottom: 12,
        textAlign: 'justify',
    },
    summarySubheading: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#1e293b',
        marginTop: 15,
        marginBottom: 8,
    },
    footer: {
        marginTop: 30,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        textAlign: 'center',
    },
    footerText: {
        fontSize: 9,
        color: '#64748b',
    },
    generatedDate: {
        fontSize: 9,
        color: '#94a3b8',
        marginTop: 5,
    },
});

interface Props {
    data: MeetingGetOne;
}

export const SummaryPdfDocument = ({ data }: Props) => (
    <Document>
        <Page style={styles.page}>
            {/* Header with Logo and App Name */}
            <View style={styles.header}>
                {/* Inline SVG logo to ensure it renders in PDF */}
                <View style={{ marginRight: 15 }}>
                    <Svg width={40} height={40} viewBox="0 0 109 43" preserveAspectRatio="xMidYMid meet">
                        <Path d="M64.9315 11.4284C62.1883 8.6852 58.9316 6.5091 55.3475 5.0245C51.7633 3.5399 47.9219 2.7758 44.0424 2.7758C40.1629 2.7758 36.3215 3.5399 32.7373 5.0245C29.1532 6.5091 25.8965 8.6852 23.1533 11.4284L44.0424 32.3174L64.9315 11.4284Z" fill="#FFD200" />
                        <Path d="M44.0686 32.3475C46.8118 35.0907 50.0684 37.2667 53.6526 38.7513C57.2367 40.2359 61.0782 41 64.9577 41C68.837 41 72.679 40.2359 76.263 38.7513C79.847 37.2667 83.104 35.0907 85.847 32.3475L64.9577 11.4584L44.0686 32.3475Z" fill="#06E07F" />
                        <Path d="M44.017 32.3429C41.2738 35.0861 38.0171 37.2621 34.433 38.7467C30.8488 40.2313 27.0074 40.9954 23.1279 40.9954C19.2484 40.9954 15.407 40.2313 11.8228 38.7467C8.2387 37.2621 4.982 35.0861 2.2388 32.3429L23.1279 11.4538L44.017 32.3429Z" fill="#E3073C" />
                        <Path d="M64.9831 11.433C67.726 8.6898 70.983 6.5138 74.567 5.0292C78.151 3.5446 81.993 2.7805 85.872 2.7805C89.752 2.7805 93.593 3.5446 97.177 5.0292C100.761 6.5138 104.018 8.6898 106.761 11.433L85.872 32.3221L64.9831 11.433Z" fill="#1F84EF" />
                    </Svg>
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.appName}>MeetMind</Text>
                    <Text style={styles.tagline}>Professional Meeting Assistant</Text>
                </View>
            </View>

            <View style={styles.content}>
                {/* Meeting Title */}
                <Text style={styles.title}>{data.name}</Text>

                {/* Meeting Metadata */}
                <View style={styles.metaSection}>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Agent:</Text>
                        <Text style={styles.metaValue}>{data.agent.name}</Text>
                    </View>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Date:</Text>
                        <Text style={styles.metaValue}>
                            {data.startedAt ? format(new Date(data.startedAt), "PPPP") : "Not specified"}
                        </Text>
                    </View>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Duration:</Text>
                        <Text style={styles.metaValue}>
                            {data.duration ? formatDuration(data.duration) : "No duration recorded"}
                        </Text>
                    </View>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Status:</Text>
                        <Text style={styles.metaValue}>{data.status || "Completed"}</Text>
                    </View>
                </View>

                {/* Summary Section */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryHeader}>
                        <Text style={styles.summaryTitle}>Summary</Text>
                    </View>

                    <View style={styles.summaryBody}>
                        {data.summary ? (
                            data.summary.split('\n').map((line, index) => {
                                // Remove ### and #### tags and make them bold headings
                                if (line.startsWith('### ')) {
                                    return (
                                        <Text key={index} style={styles.summarySubheading}>
                                            {line.replace('### ', '')}
                                        </Text>
                                    );
                                } else if (line.startsWith('#### ')) {
                                    return (
                                        <Text key={index} style={styles.summarySubheading}>
                                            {line.replace('#### ', '')}
                                        </Text>
                                    );
                                } else if (line.trim() !== '') {
                                    return (
                                        <Text key={index} style={styles.summaryParagraph}>
                                            {line.trim()}
                                        </Text>
                                    );
                                }
                                return null;
                            })
                        ) : (
                            <Text style={styles.summaryParagraph}>
                                No summary available for this meeting.
                            </Text>
                        )}
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Generated by MeetMind - Your Professional Meeting Assistant
                    </Text>
                    <Text style={styles.generatedDate}>
                        Report generated on {format(new Date(), "PPP 'at' p")}
                    </Text>
                </View>
            </View>
        </Page>
    </Document>
);