import { relations } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { generateId } from "@workspace/shared/utils";

import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "../lib/zod";

import type * as z from "zod";

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "paused",
  "trialing",
  "unpaid",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
]);

export const customer = pgTable(
  "customer",
  {
    id: text().primaryKey().$defaultFn(generateId),
    referenceId: text().notNull(),
    externalId: text().notNull(),
    provider: text().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique().on(t.referenceId, t.provider),
    unique().on(t.externalId, t.provider),
  ],
);

export const subscription = pgTable(
  "subscription",
  {
    id: text().primaryKey().$defaultFn(generateId),
    customerId: text()
      .references(() => customer.id, {
        onDelete: "cascade",
      })
      .notNull(),
    externalId: text().notNull(),
    variantId: text().notNull(),
    status: subscriptionStatusEnum().notNull(),
    store: text().notNull(),
    periodStartsAt: timestamp().notNull(),
    periodEndsAt: timestamp().notNull(),
    trialStartsAt: timestamp(),
    trialEndsAt: timestamp(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique().on(t.externalId, t.store)],
);

export const order = pgTable(
  "order",
  {
    id: text().primaryKey().$defaultFn(generateId),
    customerId: text()
      .references(() => customer.id, {
        onDelete: "cascade",
      })
      .notNull(),
    externalId: text().notNull(),
    variantId: text().notNull(),
    status: paymentStatusEnum().notNull(),
    store: text().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique().on(t.externalId, t.store)],
);

export const customerRelations = relations(customer, ({ many }) => ({
  subscriptions: many(subscription),
  orders: many(order),
}));

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  customer: one(customer, {
    fields: [subscription.customerId],
    references: [customer.id],
  }),
}));

export const orderRelations = relations(order, ({ one }) => ({
  customer: one(customer, {
    fields: [order.customerId],
    references: [customer.id],
  }),
}));

export const insertCustomerSchema = createInsertSchema(customer);
export const selectCustomerSchema = createSelectSchema(customer);
export const updateCustomerSchema = createUpdateSchema(customer);

export const insertSubscriptionSchema = createInsertSchema(subscription);
export const selectSubscriptionSchema = createSelectSchema(subscription);
export const updateSubscriptionSchema = createUpdateSchema(subscription);

export const insertOrderSchema = createInsertSchema(order);
export const selectOrderSchema = createSelectSchema(order);
export const updateOrderSchema = createUpdateSchema(order);

export type SelectCustomer = z.infer<typeof selectCustomerSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;

export type SelectSubscription = z.infer<typeof selectSubscriptionSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type UpdateSubscription = z.infer<typeof updateSubscriptionSchema>;

export type SelectOrder = z.infer<typeof selectOrderSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type UpdateOrder = z.infer<typeof updateOrderSchema>;
