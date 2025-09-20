import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments } from '@/db/schema';
import { desc, eq, like, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        let query = db.select().from(payments);

        // Add filters
        const conditions = [];

        if (search) {
            conditions.push(
                or(
                    like(payments.customerName, `%${search}%`),
                    like(payments.customerEmail, `%${search}%`),
                    like(payments.productName, `%${search}%`),
                    like(payments.polarPaymentId, `%${search}%`)
                )
            );
        }

        if (status && status !== 'all') {
            conditions.push(eq(payments.status, status));
        }

        if (conditions.length > 0) {
            query = query.where(conditions.length === 1 ? conditions[0] : or(...conditions));
        }

        const allPayments = await query
            .orderBy(desc(payments.createdAt))
            .limit(limit)
            .offset(offset);

        // Get total count
        const totalCount = await db.select().from(payments);

        console.log(`📊 Returning ${allPayments.length} payments`);

        return NextResponse.json({
            payments: allPayments,
            total: totalCount.length,
            limit,
            offset
        });
    } catch (error) {
        console.error('❌ Error fetching payments:', error);
        return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('➕ Creating manual payment:', body);

        const newPayment = await db
            .insert(payments)
            .values({
                customerName: body.customerName,
                customerEmail: body.customerEmail,
                amount: Math.round(body.amount * 100), // Convert to cents
                currency: body.currency || 'USD',
                status: body.status || 'pending',
                paymentMethod: body.paymentMethod || 'manual',
                productName: body.productName,
                metadata: body.metadata ? JSON.stringify(body.metadata) : null,
                syncedFromPolar: false,
            })
            .returning();

        console.log('✅ Manual payment created:', newPayment[0].id);
        return NextResponse.json(newPayment[0]);
    } catch (error) {
        console.error('❌ Error creating payment:', error);
        return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
    }
}
