// In schemas.ts

import {z} from "zod";

export const agentsInsertSchema = z.object({
    name: z.string()
        .min(1, "Name is required")
        .regex(
            /^[a-zA-Z0-9 ]+$/,
            "Name can only contain letters, numbers, and spaces."
        ),
    instructions: z.string().min(1, "Instructions are required"),
});

export const agentsUpdateSchema = agentsInsertSchema.extend({
    id: z.string().min(1, {message: "ID is required"}),
});