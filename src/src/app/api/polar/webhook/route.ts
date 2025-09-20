import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;

function verifyPolarWebhook(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload, "utf8")
        .digest("hex");

    return crypto.timingSafeEqual(
        Buffer.from(signature.replace("sha256=", "")),
        Buffer.from(expectedSignature)
    );
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const body = await request.text();
        const headersList = headers();
        const signature = headersList.get("x-polar-signature");

        // Professional logging
        const logData = {
            timestamp: new Date().toISOString(),
            bodyLength: body.length,
            hasSignature: !!signature,
            userAgent: headersList.get("user-agent"),
            contentType: headersList.get("content-type")
        };

        console.log("[POLAR_WEBHOOK] Received webhook", logData);

        if (POLAR_WEBHOOK_SECRET && signature) {
            const isValid = verifyPolarWebhook(body, signature, POLAR_WEBHOOK_SECRET);
            if (!isValid) {
                console.error("[POLAR_WEBHOOK] Invalid signature verification");
                return NextResponse.json(
                    { error: "Invalid webhook signature", timestamp: new Date().toISOString() },
                    { status: 401 }
                );
            }
        }

        let event;
        try {
            event = JSON.parse(body);
        } catch (error) {
            console.error("[POLAR_WEBHOOK] JSON parsing failed:", error);
            return NextResponse.json(
                { error: "Invalid JSON payload", timestamp: new Date().toISOString() },
                { status: 400 }
            );
        }

        const eventLog = {
            eventId: event.id,
            eventType: event.type,
            timestamp: event.created_at || new Date().toISOString(),
            dataKeys: Object.keys(event.data || {})
        };

        console.log("[POLAR_WEBHOOK] Processing event", eventLog);

        let result;
        switch (event.type) {
            case "subscription.created":
            case "order.created":
                result = await handlePaymentCreated(event.data);
                break;

            case "subscription.updated":
            case "order.paid":
                result = await handlePaymentSuccess(event.data);
                break;

            case "subscription.cancelled":
                result = await handlePaymentCancelled(event.data);
                break;

            case "order.refunded":
                result = await handlePaymentRefunded(event.data);
                break;

            default:
                console.log("[POLAR_WEBHOOK] Unhandled event type:", event.type);
                result = { status: "ignored", reason: "unsupported_event_type" };
                break;
        }

        const processingTime = Date.now() - startTime;
        console.log("[POLAR_WEBHOOK] Event processed successfully", {
            eventType: event.type,
            processingTimeMs: processingTime,
            result: result
        });

        return NextResponse.json({
            received: true,
            event_type: event.type,
            event_id: event.id,
            processing_time_ms: processingTime,
            timestamp: new Date().toISOString(),
            result: result
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error("[POLAR_WEBHOOK] Processing error:", {
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            processingTimeMs: processingTime
        });

        return NextResponse.json(
            {
                error: "Webhook processing failed",
                message: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}

async function handlePaymentCreated(data: any) {
    console.log("[POLAR_WEBHOOK] Processing payment creation:", data.id);

    try {
        const existingPayment = await db.query.payments.findFirst({
            where: eq(payments.id, data.id)
        });

        if (!existingPayment) {
            await db.insert(payments).values({
                userId: data.customer_id || data.customer?.id,
                amount: data.amount ? (data.amount / 100).toString() : "0",
                currency: data.currency || "USD",
                status: "pending",
                createdAt: new Date()
            });

            return { status: "created", action: "payment_record_created" };
        } else {
            return { status: "exists", action: "no_action_required" };
        }
    } catch (error) {
        console.error("[POLAR_WEBHOOK] Payment creation error:", error);
        throw error;
    }
}

async function handlePaymentSuccess(data: any) {
    console.log("[POLAR_WEBHOOK] Processing payment success:", data.id);

    try {
        const payment = await db.query.payments.findFirst({
            where: eq(payments.id, data.id)
        });

        if (payment) {
            await db.update(payments)
                .set({
                    status: "succeeded",
                    createdAt: new Date()
                })
                .where(eq(payments.id, payment.id));

            return { status: "updated", action: "payment_status_updated_to_succeeded" };
        } else {
            return { status: "not_found", action: "payment_record_not_found" };
        }
    } catch (error) {
        console.error("[POLAR_WEBHOOK] Payment success error:", error);
        throw error;
    }
}

async function handlePaymentCancelled(data: any) {
    console.log("[POLAR_WEBHOOK] Processing payment cancellation:", data.id);

    try {
        const payment = await db.query.payments.findFirst({
            where: eq(payments.id, data.id)
        });

        if (payment) {
            await db.update(payments)
                .set({
                    status: "failed",
                    createdAt: new Date()
                })
                .where(eq(payments.id, payment.id));

            return { status: "updated", action: "payment_status_updated_to_cancelled" };
        } else {
            return { status: "not_found", action: "payment_record_not_found" };
        }
    } catch (error) {
        console.error("[POLAR_WEBHOOK] Payment cancellation error:", error);
        throw error;
    }
}

async function handlePaymentRefunded(data: any) {
    console.log("[POLAR_WEBHOOK] Processing payment refund:", data.id);

    try {
        const payment = await db.query.payments.findFirst({
            where: eq(payments.id, data.id)
        });

        if (payment) {
            await db.update(payments)
                .set({
                    status: "failed",
                    createdAt: new Date()
                })
                .where(eq(payments.id, payment.id));

            return { status: "updated", action: "payment_status_updated_to_refunded" };
        } else {
            return { status: "not_found", action: "payment_record_not_found" };
        }
    } catch (error) {
        console.error("[POLAR_WEBHOOK] Payment refund error:", error);
        throw error;
    }
}
