import {pgTable, text, timestamp, boolean, pgEnum} from "drizzle-orm/pg-core";
import {nanoid} from "nanoid";
import { integer, uuid } from 'drizzle-orm/pg-core';

export const user = pgTable("user", {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').$defaultFn(() => false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
});

export const session = pgTable("session", {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull().references(()=> user.id, { onDelete: 'cascade' })
});

export const account = pgTable("account", {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull().references(()=> user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull()
});

export const verification = pgTable("verification", {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date())
});

export const agent = pgTable("agent", {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => nanoid()),
    name: text('name').notNull(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    instructions: text('instruction').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
});

export const meetingStatus = pgEnum("meeting_status", [
    "upcoming",
    "active",
    "completed",
    "cancelled",
    "processing"
    ]);

export const meetings = pgTable("meetings", {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => nanoid()),
    name: text('name').notNull(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    agentId: text('agent_id')
        .notNull()
        .references(() => agent.id, { onDelete: 'cascade' }),
    status: meetingStatus('status').notNull().default('upcoming'),
    startedAt: timestamp('started_at'),
    endedAt: timestamp('ended_at'),
    transcriptUrl: text('transcript_url'),
    recordingUrl: text('recording_url'),
    summary: text('summary'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
});

export const orders = pgTable('orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    productName: text('product_name').notNull(),
    amount: integer('amount').notNull(), // in cents
    status: text('status', { enum: ['pending', 'completed', 'cancelled'] }).notNull().default('pending'),
    paymentMethod: text('payment_method'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type OrderInsert = typeof orders.$inferInsert;

export const payments = pgTable('payments', {
    id: uuid('id').defaultRandom().primaryKey(),
    polarPaymentId: text('polar_payment_id').unique(),
    polarOrderId: text('polar_order_id'),
    polarCustomerId: text('polar_customer_id'),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    amount: integer('amount').notNull(), // in cents
    currency: text('currency').default('USD'),
    status: text('status', {
        enum: ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded']
    }).notNull().default('pending'),
    paymentMethod: text('payment_method'),
    paymentIntentId: text('payment_intent_id'),
    subscriptionId: text('subscription_id'),
    productName: text('product_name'),
    metadata: text('metadata'), // JSON string
    polarWebhookData: text('polar_webhook_data'), // Store raw webhook data
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    syncedFromPolar: boolean('synced_from_polar').default(false),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
});

export type Payment = typeof payments.$inferSelect;
export type PaymentInsert = typeof payments.$inferInsert;
