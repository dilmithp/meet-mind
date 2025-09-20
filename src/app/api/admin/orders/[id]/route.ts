import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();

        const updatedOrder = await db.update(orders)
            .set({
                customerName: body.customer_name,
                customerEmail: body.customer_email,
                productName: body.product_name,
                amount: body.amount ? Math.round(body.amount * 100) : undefined,
                status: body.status,
                paymentMethod: body.payment_method,
                notes: body.notes,
                updatedAt: new Date(),
            })
            .where(eq(orders.id, params.id))
            .returning();

        return NextResponse.json({ success: true, order: updatedOrder[0] });
    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await db.delete(orders).where(eq(orders.id, params.id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting order:', error);
        return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
    }
}
