import { NextResponse } from 'next/server';
import { db } from '@/db';
import { payments } from '@/db/schema';
import { eq, or } from 'drizzle-orm';

export async function POST() {
    try {
        console.log('📦 Starting ORDERS-ONLY Polar sync...');

        const token = process.env.POLAR_ACCESS_TOKEN;
        if (!token) {
            throw new Error('Polar access token not configured');
        }

        let syncedCount = 0;
        let newCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let debugInfo = [];

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        // Track processed IDs to avoid duplicates
        const processedOrderIds = new Set();

        // ONLY GET ORDERS - NO SUBSCRIPTIONS!
        console.log('📦 Fetching ORDERS ONLY...');
        try {
            const ordersResponse = await fetch('https://sandbox-api.polar.sh/v1/orders?organization_id=0306569d-30de-43af-ab82-bf19c982fbb0&limit=100', {
                headers
            });

            if (ordersResponse.ok) {
                const ordersData = await ordersResponse.json();
                debugInfo.push({
                    method: 'orders_only',
                    success: true,
                    count: ordersData.items?.length || 0,
                    data: ordersData.items?.slice(0, 2) || []
                });
                console.log(`📦 Found ${ordersData.items?.length || 0} orders`);

                if (ordersData.items && ordersData.items.length > 0) {
                    for (const order of ordersData.items) {
                        if (!processedOrderIds.has(order.id)) {
                            const result = await processPolarOrder(order);
                            processedOrderIds.add(order.id);

                            if (result === 'created') {
                                newCount++;
                                syncedCount++;
                                console.log(`✨ NEW order: ${order.product?.name || 'Unknown'}`);
                            } else if (result === 'updated') {
                                updatedCount++;
                                syncedCount++;
                                console.log(`🔄 UPDATED order: ${order.product?.name || 'Unknown'}`);
                            } else if (result === 'skipped') {
                                skippedCount++;
                                console.log(`⏭️ SKIPPED order: ${order.product?.name || 'Unknown'}`);
                            }
                        }
                    }
                }
            } else {
                const errorText = await ordersResponse.text();
                debugInfo.push({
                    method: 'orders_only',
                    success: false,
                    status: ordersResponse.status,
                    error: errorText
                });
                console.log(`❌ Orders fetch failed: ${ordersResponse.status} ${errorText}`);
            }
        } catch (error) {
            debugInfo.push({
                method: 'orders_only',
                success: false,
                error: error?.message
            });
            console.error(`❌ Order sync error:`, error);
        }

        async function processPolarOrder(order: any): Promise<'created' | 'updated' | 'skipped'> {
            try {
                console.log(`🔍 Processing order: ${order.id} - ${order.product?.name || 'Unknown Product'}`);

                // Check if order already exists in database
                const existing = await db
                    .select()
                    .from(payments)
                    .where(
                        or(
                            eq(payments.polarOrderId, order.id),
                            eq(payments.polarPaymentId, order.id)
                        )
                    )
                    .limit(1);

                // Clean product name - keep it simple
                const productName = order.product?.name || 'Unknown Product';

                const paymentData = {
                    polarOrderId: order.id,
                    polarCustomerId: order.customer_id || order.customerId || null,
                    customerName: order.customer?.name || order.user?.name || order.user?.email || 'Unknown Customer',
                    customerEmail: order.customer?.email || order.user?.email || order.user_email || 'unknown@example.com',
                    amount: order.amount || order.total || 0,
                    currency: order.currency || 'USD',
                    status: mapOrderStatus(order.status || 'pending'),
                    productName: productName, // Clean product name
                    paymentMethod: 'order', // Always order
                    metadata: JSON.stringify({
                        orderId: order.id,
                        productId: order.product_id || order.productId,
                        customerId: order.customer_id || order.customerId,
                        status: order.status,
                        type: 'order' // Mark as order
                    }),
                    polarWebhookData: JSON.stringify(order),
                    syncedFromPolar: true,
                    lastSyncAt: new Date(),
                };

                console.log(`💾 Payment data:`, {
                    id: order.id,
                    productName: paymentData.productName,
                    amount: paymentData.amount / 100,
                    status: paymentData.status,
                    customer: paymentData.customerName
                });

                if (existing.length > 0) {
                    // Update existing record
                    await db
                        .update(payments)
                        .set({
                            ...paymentData,
                            updatedAt: new Date()
                        })
                        .where(eq(payments.id, existing[0].id));

                    console.log(`✅ Updated order payment: ${order.id}`);
                    return 'updated';
                } else {
                    // Create new record
                    await db.insert(payments).values(paymentData);
                    console.log(`✅ Created new order payment: ${order.id}`);
                    return 'created';
                }
            } catch (error) {
                console.error(`❌ Error processing order ${order.id}:`, error);
                return 'skipped';
            }
        }

        function mapOrderStatus(status: string): string {
            const statusMap: Record<string, string> = {
                'pending': 'pending',
                'processing': 'processing',
                'succeeded': 'succeeded',
                'paid': 'succeeded',
                'completed': 'succeeded',
                'failed': 'failed',
                'canceled': 'cancelled',
                'cancelled': 'cancelled'
            };
            return statusMap[status.toLowerCase()] || 'pending';
        }

        const result = {
            success: true,
            message: `📦 Orders-only sync completed! ${newCount} new, ${updatedCount} updated, ${skippedCount} skipped`,
            stats: {
                totalProcessed: syncedCount,
                newPayments: newCount,
                updatedPayments: updatedCount,
                skippedDuplicates: skippedCount,
                ordersOnly: true,
                timestamp: new Date().toISOString()
            },
            debug: {
                organizationId: '0306569d-30de-43af-ab82-bf19c982fbb0',
                organizationName: 'Meet Mind AI',
                methods: debugInfo,
                processedOrders: Array.from(processedOrderIds),
                note: 'Subscriptions excluded - orders only!'
            }
        };

        console.log('📦 ORDERS-ONLY SYNC COMPLETE:', JSON.stringify(result, null, 2));
        return NextResponse.json(result);

    } catch (error) {
        console.error('💥 ORDERS SYNC FAILED:', error);
        return NextResponse.json({
            success: false,
            error: 'Orders sync failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
