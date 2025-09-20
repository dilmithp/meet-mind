import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "summary";
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
            default:
                return NextResponse.json(
                    { error: "Invalid report type. Use: summary, detailed, or analytics" },
                    { status: 400 }
                );
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
        console.error("[REPORTS_API] Error generating report:", error);
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
    const baseQuery = db.select({
        status: payments.status,
        count: sql<number>`count(*)`,
        total: sql<number>`sum(cast(${payments.amount} as decimal))`,
        currency: payments.currency
    })
        .from(payments)
        .groupBy(payments.status, payments.currency);

    // Add date filtering if provided
    let query = baseQuery;
    if (startDate && endDate) {
        query = query.where(
            sql`${payments.createdAt} >= ${startDate} AND ${payments.createdAt} <= ${endDate}`
        );
    }

    const results = await query;

    return {
        payment_summary: results,
        total_transactions: results.reduce((sum, row) => sum + row.count, 0),
        total_revenue: results.reduce((sum, row) => row.status === "succeeded" ? sum + row.total : sum, 0)
    };
}

async function generateDetailedReport(startDate: string | null, endDate: string | null) {
    let query = db.select({
        id: payments.id,
        userId: payments.userId,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        createdAt: payments.createdAt
    })
        .from(payments)
        .orderBy(payments.createdAt);

    if (startDate && endDate) {
        query = query.where(
            sql`${payments.createdAt} >= ${startDate} AND ${payments.createdAt} <= ${endDate}`
        );
    }

    const transactions = await query;

    return {
        transactions,
        transaction_count: transactions.length,
        date_range: {
            start: startDate,
            end: endDate
        }
    };
}

async function generateAnalyticsReport(startDate: string | null, endDate: string | null) {
    // Daily revenue analytics
    const dailyRevenueQuery = db.select({
        date: sql<string>`DATE(${payments.createdAt})`,
        revenue: sql<number>`sum(case when ${payments.status} = 'succeeded' then cast(${payments.amount} as decimal) else 0 end)`,
        transaction_count: sql<number>`count(*)`
    })
        .from(payments)
        .groupBy(sql`DATE(${payments.createdAt})`)
        .orderBy(sql`DATE(${payments.createdAt})`);

    // Status distribution
    const statusDistribution = await db.select({
        status: payments.status,
        count: sql<number>`count(*)`,
        percentage: sql<number>`round(count(*) * 100.0 / sum(count(*)) over(), 2)`
    })
        .from(payments)
        .groupBy(payments.status);

    // Add date filtering if provided
    let dailyQuery = dailyRevenueQuery;
    if (startDate && endDate) {
        dailyQuery = dailyQuery.where(
            sql`${payments.createdAt} >= ${startDate} AND ${payments.createdAt} <= ${endDate}`
        );
    }

    const dailyRevenue = await dailyQuery;

    return {
        daily_revenue: dailyRevenue,
        status_distribution: statusDistribution,
        analytics_period: {
            start_date: startDate,
            end_date: endDate,
            total_days: dailyRevenue.length
        }
    };
}
