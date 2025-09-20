import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { sql, desc, and, gte, lte } from "drizzle-orm";
import PDFDocument from 'pdfkit';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "summary";
    const format = searchParams.get("format") || "json";
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    try {
        let reportData;

        switch (reportType) {
            case "summary":
                reportData = await generateSummaryReport(startDate, endDate);
                break;
            case "detailed":
                reportData = await generateDetailedReport(startDate, endDate);
                break;
            case "analytics":
                reportData = await generateAnalyticsReport(startDate, endDate);
                break;
            case "financial":
                reportData = await generateFinancialReport(startDate, endDate);
                break;
            default:
                return NextResponse.json(
                    { error: "Invalid report type. Use: summary, detailed, analytics, or financial" },
                    { status: 400 }
                );
        }

        if (format === "pdf") {
            const pdfBuffer = await generatePDFReport(reportData, reportType, startDate, endDate);

            return new NextResponse(pdfBuffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="payment-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf"`
                }
            });
        }

        return NextResponse.json({
            report_type: reportType,
            generated_at: new Date().toISOString(),
            period: {
                start_date: startDate,
                end_date: endDate
            },
            data: reportData
        });

    } catch (error) {
        console.error("[PAYMENT_REPORTS_API] Error generating report:", error);
        return NextResponse.json(
            {
                error: "Report generation failed",
                message: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}

async function generateSummaryReport(startDate: string | null, endDate: string | null) {
    const baseQuery = db.select().from(payments);

    // Apply date filtering if provided
    let query = baseQuery;
    if (startDate && endDate) {
        query = baseQuery.where(
            and(
                gte(payments.createdAt, startDate),
                lte(payments.createdAt, endDate)
            )
        );
    }

    const allPayments = await query;

    // Summary statistics
    const totalPayments = allPayments.length;
    const succeededPayments = allPayments.filter(p => p.status === 'succeeded');
    const pendingPayments = allPayments.filter(p => p.status === 'pending');
    const failedPayments = allPayments.filter(p => p.status === 'failed');

    const totalRevenue = succeededPayments.reduce((sum, p) => sum + p.amount, 0);
    const averageTransactionValue = succeededPayments.length > 0 ? totalRevenue / succeededPayments.length : 0;

    // Status distribution
    const statusDistribution = {
        succeeded: succeededPayments.length,
        pending: pendingPayments.length,
        failed: failedPayments.length,
        processing: allPayments.filter(p => p.status === 'processing').length,
        cancelled: allPayments.filter(p => p.status === 'cancelled').length,
        refunded: allPayments.filter(p => p.status === 'refunded').length,
    };

    // Currency breakdown
    const currencyBreakdown = allPayments.reduce((acc, payment) => {
        acc[payment.currency] = (acc[payment.currency] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Payment method analysis
    const paymentMethodStats = allPayments.reduce((acc, payment) => {
        const method = payment.paymentMethod || 'unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return {
        overview: {
            total_payments: totalPayments,
            total_revenue: totalRevenue,
            average_transaction_value: averageTransactionValue,
            success_rate: totalPayments > 0 ? (succeededPayments.length / totalPayments * 100).toFixed(2) : 0
        },
        status_distribution: statusDistribution,
        currency_breakdown: currencyBreakdown,
        payment_methods: paymentMethodStats,
        period_summary: {
            start_date: startDate,
            end_date: endDate,
            days_analyzed: startDate && endDate ?
                Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : null
        }
    };
}

async function generateDetailedReport(startDate: string | null, endDate: string | null) {
    let query = db.select().from(payments).orderBy(desc(payments.createdAt));

    if (startDate && endDate) {
        query = query.where(
            and(
                gte(payments.createdAt, startDate),
                lte(payments.createdAt, endDate)
            )
        );
    }

    const paymentRecords = await query.limit(1000); // Limit for performance

    // Group by date for daily analysis
    const dailyStats = paymentRecords.reduce((acc, payment) => {
        const date = payment.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
            acc[date] = {
                total_transactions: 0,
                total_amount: 0,
                succeeded: 0,
                failed: 0,
                pending: 0
            };
        }

        acc[date].total_transactions++;
        acc[date].total_amount += payment.amount;
        acc[date][payment.status as keyof typeof acc[typeof date]] =
            (acc[date][payment.status as keyof typeof acc[typeof date]] as number) + 1;

        return acc;
    }, {} as Record<string, any>);

    return {
        transactions: paymentRecords.slice(0, 100), // First 100 for detailed view
        daily_statistics: dailyStats,
        transaction_count: paymentRecords.length,
        largest_transaction: paymentRecords.reduce((max, p) =>
            p.amount > max.amount ? p : max, paymentRecords[0] || { amount: 0 }),
        recent_failures: paymentRecords.filter(p => p.status === 'failed').slice(0, 10)
    };
}

async function generateAnalyticsReport(startDate: string | null, endDate: string | null) {
    let query = db.select().from(payments);

    if (startDate && endDate) {
        query = query.where(
            and(
                gte(payments.createdAt, startDate),
                lte(payments.createdAt, endDate)
            )
        );
    }

    const allPayments = await query;

    // Hourly distribution
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
        const count = allPayments.filter(p =>
            p.createdAt.getHours() === hour
        ).length;
        return { hour, count };
    });

    // Daily trend (last 30 days or date range)
    const dailyTrend = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayPayments = allPayments.filter(p =>
            p.createdAt.toISOString().split('T')[0] === dateStr
        );

        return {
            date: dateStr,
            count: dayPayments.length,
            revenue: dayPayments.filter(p => p.status === 'succeeded')
                .reduce((sum, p) => sum + p.amount, 0)
        };
    }).reverse();

    // Customer analysis
    const customerStats = allPayments.reduce((acc, payment) => {
        const email = payment.customerEmail;
        if (!acc[email]) {
            acc[email] = {
                total_payments: 0,
                total_spent: 0,
                last_payment: payment.createdAt
            };
        }
        acc[email].total_payments++;
        if (payment.status === 'succeeded') {
            acc[email].total_spent += payment.amount;
        }
        if (payment.createdAt > acc[email].last_payment) {
            acc[email].last_payment = payment.createdAt;
        }
        return acc;
    }, {} as Record<string, any>);

    // Top customers
    const topCustomers = Object.entries(customerStats)
        .sort(([,a], [,b]) => (b as any).total_spent - (a as any).total_spent)
        .slice(0, 10)
        .map(([email, stats]) => ({ email, ...(stats as any) }));

    return {
        hourly_distribution: hourlyDistribution,
        daily_trend: dailyTrend,
        customer_analytics: {
            total_unique_customers: Object.keys(customerStats).length,
            top_customers: topCustomers,
            repeat_customers: Object.values(customerStats).filter(
                (stats: any) => stats.total_payments > 1
            ).length
        },
        conversion_funnel: {
            pending_to_success: allPayments.filter(p => p.status === 'pending').length,
            processing_to_success: allPayments.filter(p => p.status === 'processing').length,
            total_successful: allPayments.filter(p => p.status === 'succeeded').length
        }
    };
}

async function generateFinancialReport(startDate: string | null, endDate: string | null) {
    let query = db.select().from(payments);

    if (startDate && endDate) {
        query = query.where(
            and(
                gte(payments.createdAt, startDate),
                lte(payments.createdAt, endDate)
            )
        );
    }

    const allPayments = await query;
    const successfulPayments = allPayments.filter(p => p.status === 'succeeded');

    // Revenue calculations
    const grossRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
    const refundedAmount = allPayments
        .filter(p => p.status === 'refunded')
        .reduce((sum, p) => sum + p.amount, 0);

    const netRevenue = grossRevenue - refundedAmount;

    // Monthly breakdown
    const monthlyRevenue = successfulPayments.reduce((acc, payment) => {
        const month = payment.createdAt.toISOString().substring(0, 7); // YYYY-MM
        acc[month] = (acc[month] || 0) + payment.amount;
        return acc;
    }, {} as Record<string, number>);

    // Currency-wise revenue
    const currencyRevenue = successfulPayments.reduce((acc, payment) => {
        acc[payment.currency] = (acc[payment.currency] || 0) + payment.amount;
        return acc;
    }, {} as Record<string, number>);

    return {
        revenue_summary: {
            gross_revenue: grossRevenue,
            refunded_amount: refundedAmount,
            net_revenue: netRevenue,
            total_transactions: allPayments.length,
            successful_transactions: successfulPayments.length
        },
        monthly_breakdown: monthlyRevenue,
        currency_revenue: currencyRevenue,
        average_values: {
            average_transaction: successfulPayments.length > 0 ? grossRevenue / successfulPayments.length : 0,
            median_transaction: calculateMedian(successfulPayments.map(p => p.amount))
        },
        payment_volume: {
            daily_average: calculateDailyAverage(successfulPayments, startDate, endDate),
            peak_day: findPeakDay(successfulPayments)
        }
    };
}

function calculateMedian(amounts: number[]): number {
    const sorted = amounts.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

function calculateDailyAverage(payments: any[], startDate: string | null, endDate: string | null): number {
    if (!startDate || !endDate) return 0;

    const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? payments.length / days : 0;
}

function findPeakDay(payments: any[]): { date: string; count: number; revenue: number } {
    const dailyStats = payments.reduce((acc, payment) => {
        const date = payment.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
            acc[date] = { count: 0, revenue: 0 };
        }
        acc[date].count++;
        acc[date].revenue += payment.amount;
        return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    const peak = Object.entries(dailyStats)
        .sort(([,a], [,b]) => b.revenue - a.revenue)[0];

    return peak ? { date: peak[0], ...peak[1] } : { date: '', count: 0, revenue: 0 };
}

async function generatePDFReport(data: any, reportType: string, startDate: string | null, endDate: string | null): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('MeetMind AI - Payment Report', { align: 'center' });
        doc.fontSize(14).text(`Report Type: ${reportType.toUpperCase()}`, { align: 'center' });
        doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

        if (startDate && endDate) {
            doc.text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
        }

        doc.moveDown(2);

        // Content based on report type
        switch (reportType) {
            case 'summary':
                addSummaryContent(doc, data);
                break;
            case 'detailed':
                addDetailedContent(doc, data);
                break;
            case 'analytics':
                addAnalyticsContent(doc, data);
                break;
            case 'financial':
                addFinancialContent(doc, data);
                break;
        }

        doc.end();
    });
}

function addSummaryContent(doc: any, data: any) {
    doc.fontSize(16).text('Overview', { underline: true });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Total Payments: ${data.overview.total_payments}`);
    doc.text(`Total Revenue: $${(data.overview.total_revenue / 100).toFixed(2)}`);
    doc.text(`Average Transaction: $${(data.overview.average_transaction_value / 100).toFixed(2)}`);
    doc.text(`Success Rate: ${data.overview.success_rate}%`);

    doc.moveDown();
    doc.fontSize(14).text('Status Distribution', { underline: true });
    doc.moveDown();

    Object.entries(data.status_distribution).forEach(([status, count]) => {
        doc.text(`${status}: ${count}`);
    });
}

function addDetailedContent(doc: any, data: any) {
    doc.fontSize(16).text('Transaction Details', { underline: true });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Total Transactions Analyzed: ${data.transaction_count}`);

    if (data.largest_transaction) {
        doc.text(`Largest Transaction: $${(data.largest_transaction.amount / 100).toFixed(2)}`);
    }

    doc.moveDown();
    doc.text('Recent Failed Transactions:');
    data.recent_failures.slice(0, 5).forEach((failure: any, index: number) => {
        doc.text(`${index + 1}. ${failure.customerEmail} - $${(failure.amount / 100).toFixed(2)} - ${failure.createdAt}`);
    });
}

function addAnalyticsContent(doc: any, data: any) {
    doc.fontSize(16).text('Analytics Overview', { underline: true });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Total Unique Customers: ${data.customer_analytics.total_unique_customers}`);
    doc.text(`Repeat Customers: ${data.customer_analytics.repeat_customers}`);

    doc.moveDown();
    doc.text('Top 5 Customers:');
    data.customer_analytics.top_customers.slice(0, 5).forEach((customer: any, index: number) => {
        doc.text(`${index + 1}. ${customer.email} - $${(customer.total_spent / 100).toFixed(2)}`);
    });
}

function addFinancialContent(doc: any, data: any) {
    doc.fontSize(16).text('Financial Summary', { underline: true });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Gross Revenue: $${(data.revenue_summary.gross_revenue / 100).toFixed(2)}`);
    doc.text(`Refunded Amount: $${(data.revenue_summary.refunded_amount / 100).toFixed(2)}`);
    doc.text(`Net Revenue: $${(data.revenue_summary.net_revenue / 100).toFixed(2)}`);
    doc.text(`Average Transaction: $${(data.average_values.average_transaction / 100).toFixed(2)}`);
    doc.text(`Median Transaction: $${(data.average_values.median_transaction / 100).toFixed(2)}`);
}
