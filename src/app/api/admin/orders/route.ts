import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
    try {
        const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

        const transformedOrders = allOrders.map(order => ({
            id: order.id,
            customer_name: order.customerName,
            customer_email: order.customerEmail,
            product_name: order.productName,
            amount: order.amount / 100,
            status: order.status,
            payment_method: order.paymentMethod || 'cash',
            order_date: order.createdAt?.toISOString() || new Date().toISOString(),
            updated_at: order.updatedAt?.toISOString() || new Date().toISOString(),
            notes: order.notes || '',
        }));

        return NextResponse.json(transformedOrders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const newOrder = await db.insert(orders).values({
            customerName: body.customer_name,
            customerEmail: body.customer_email,
            productName: body.product_name,
            amount: Math.round(body.amount * 100),
            status: body.status || 'pending',
            paymentMethod: body.payment_method || 'cash',
            notes: body.notes || '',
        }).returning();

        return NextResponse.json(newOrder[0]);
    } catch (error) {
        console.error('Error creating order:', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}
