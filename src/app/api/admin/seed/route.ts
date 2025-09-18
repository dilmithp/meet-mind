import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';

const dummyOrders = [
    {
        customerName: 'John Smith',
        customerEmail: 'john@example.com',
        productName: 'Premium Meeting Package',
        amount: 9999, // $99.99
        status: 'completed' as const,
        paymentMethod: 'credit_card',
        notes: 'VIP customer - priority support',
    },
    {
        customerName: 'Sarah Johnson',
        customerEmail: 'sarah@company.com',
        productName: 'Basic AI Agent',
        amount: 2999, // $29.99
        status: 'pending' as const,
        paymentMethod: 'paypal',
        notes: 'Corporate account - billing monthly',
    },
    {
        customerName: 'Mike Davis',
        customerEmail: 'mike.davis@startup.io',
        productName: 'Enterprise Solution',
        amount: 49999, // $499.99
        status: 'completed' as const,
        paymentMethod: 'bank_transfer',
        notes: 'Annual subscription - includes premium features',
    },
    {
        customerName: 'Lisa Chen',
        customerEmail: 'lisa.chen@tech.com',
        productName: 'Standard Package',
        amount: 4999, // $49.99
        status: 'cancelled' as const,
        paymentMethod: 'credit_card',
        notes: 'Cancelled due to budget constraints',
    },
    {
        customerName: 'Robert Wilson',
        customerEmail: 'r.wilson@business.net',
        productName: 'Pro Meeting Tools',
        amount: 7999, // $79.99
        status: 'completed' as const,
        paymentMethod: 'stripe',
        notes: 'Upgraded from basic plan',
    },
    {
        customerName: 'Emily Brown',
        customerEmail: 'emily@freelance.com',
        productName: 'Starter Package',
        amount: 1999, // $19.99
        status: 'pending' as const,
        paymentMethod: 'credit_card',
        notes: 'First-time customer',
    },
    {
        customerName: 'David Kim',
        customerEmail: 'david.kim@agency.co',
        productName: 'Agency Bundle',
        amount: 19999, // $199.99
        status: 'completed' as const,
        paymentMethod: 'bank_transfer',
        notes: 'Multi-user license for team',
    },
    {
        customerName: 'Rachel Green',
        customerEmail: 'rachel@consulting.biz',
        productName: 'Professional Package',
        amount: 12999, // $129.99
        status: 'completed' as const,
        paymentMethod: 'paypal',
        notes: 'Monthly recurring subscription',
    },
];

export async function POST() {
    try {
        console.log('🌱 Seeding dummy orders...');

        // Clear existing orders first (optional)
        // await db.delete(orders);

        // Insert dummy orders
        const insertedOrders = [];
        for (const order of dummyOrders) {
            const [inserted] = await db.insert(orders).values(order).returning();
            insertedOrders.push(inserted);
        }

        console.log('✅ Successfully seeded', insertedOrders.length, 'orders');

        return NextResponse.json({
            success: true,
            message: `Successfully seeded ${insertedOrders.length} orders`,
            orders: insertedOrders
        });
    } catch (error) {
        console.error('❌ Error seeding orders:', error);
        return NextResponse.json(
            {
                error: 'Failed to seed orders',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
