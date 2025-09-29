import { z } from "zod";


export const meetingsInsertSchema = z.object({
    name: z.string().min(1, "Name is required"),
    agentId: z.string().min(1, "AgentId is required"),
});

export const meetingsUpdateSchema = meetingsInsertSchema.extend({
    id: z.string().min(1, { message: "ID is required" }),
});


export const noteInsertSchema = z.object({
    meetingId: z.string(),
    note: z.string().min(3, { message: "Note must be at least 3 characters long." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
});

export const noteUpdateSchema = z.object({
    id: z.string(),
    note: z.string().min(3, { message: "Note must be at least 3 characters long." }),
});

export const noteDeleteSchema = z.object({
    id: z.string(),
});