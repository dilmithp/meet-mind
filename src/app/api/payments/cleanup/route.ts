import { NextResponse } from 'next/server';
import { db } from '@/db';
import { payments } from '@/db/schema';
import { eq, isNotNull, sql } from 'drizzle-orm';

export async function POST() {
    try {
        console.log('🧹 Starting duplicate cleanup...');

        let deletedCount = 0;

        // Find duplicates by subscription ID
        const subscriptionDuplicates = await db
            .select({
                subscriptionId: payments.subscriptionId,
                count: sql<number>`count(*)`,
                ids: sql<string[]>`array_agg(id ORDER BY created_at ASC)`
            })
            .from(payments)
            .where(isNotNull(payments.subscriptionId))
            .groupBy(payments.subscriptionId)
            .having(sql`count(*) > 1`);

        console.log(`Found ${subscriptionDuplicates.length} subscription groups with duplicates`);

        // Delete duplicates (keep the first one)
        for (const duplicate of subscriptionDuplicates) {
            const idsToDelete = duplicate.ids.slice(1); // Keep first, delete rest

            for (const id of idsToDelete) {
                await db.delete(payments).where(eq(payments.id, id));
                deletedCount++;
                console.log(`🗑️ Deleted duplicate payment: ${id}`);
            }
        }

        // Find duplicates by order ID
        const orderDuplicates = await db
            .select({
                orderId: payments.polarOrderId,
                count: sql<number>`count(*)`,
                ids: sql<string[]>`array_agg(id ORDER BY created_at ASC)`
            })
            .from(payments)
            .where(isNotNull(payments.polarOrderId))
            .groupBy(payments.polarOrderId)
            .having(sql`count(*) > 1`);

        console.log(`Found ${orderDuplicates.length} order groups with duplicates`);

        // Delete order duplicates
        for (const duplicate of orderDuplicates) {
            const idsToDelete = duplicate.ids.slice(1); // Keep first, delete rest

            for (const id of idsToDelete) {
                await db.delete(payments).where(eq(payments.id, id));
                deletedCount++;
                console.log(`🗑️ Deleted duplicate order payment: ${id}`);
            }
        }

        return NextResponse.json({
            success: true,
            message: `🧹 Cleanup complete! Deleted ${deletedCount} duplicates`,
            stats: {
                deletedCount,
                subscriptionGroups: subscriptionDuplicates.length,
                orderGroups: orderDuplicates.length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        return NextResponse.json({
            success: false,
            error: 'Cleanup failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
