import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const payment = await db
            .select()
            .from(payments)
            .where(eq(payments.id, params.id))
            .limit(1);

        if (payment.length === 0) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        return NextResponse.json(payment[0]);
    } catch (error) {
        console.error('❌ Error fetching payment:', error);
        return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        console.log('📝 Updating payment:', params.id, body);

        const updatedPayment = await db
            .update(payments)
            .set({
                customerName: body.customerName,
                customerEmail: body.customerEmail,
                amount: body.amount ? Math.round(body.amount * 100) : undefined,
                currency: body.currency,
                status: body.status,
                paymentMethod: body.paymentMethod,
                productName: body.productName,
                metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
                updatedAt: new Date(),
            })
            .where(eq(payments.id, params.id))
            .returning();

        console.log('✅ Payment updated:', updatedPayment[0]?.id);
        return NextResponse.json({ success: true, payment: updatedPayment[0] });
    } catch (error) {
        console.error('❌ Error updating payment:', error);
        return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        console.log('🗑️ Deleting payment:', params.id);

        await db
            .delete(payments)
            .where(eq(payments.id, params.id));

        console.log('✅ Payment deleted');
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('❌ Error deleting payment:', error);
        return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
    }
}
