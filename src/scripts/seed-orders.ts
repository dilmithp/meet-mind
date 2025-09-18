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
];

async function seedOrders() {
    try {
        console.log('🌱 Seeding dummy orders...');

        for (const order of dummyOrders) {
            await db.insert(orders).values(order);
        }

        console.log('✅ Successfully seeded', dummyOrders.length, 'orders');
    } catch (error) {
        console.error('❌ Error seeding orders:', error);
    }
}

seedOrders();
