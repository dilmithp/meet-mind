import {createTRPCRouter, protectedProcedure} from "@/trpc/init";
import {db} from "@/db";
import {agent} from "@/db/schema";
import {agentsInsertSchema} from "@/modules/agents/schemas";
import {z} from "zod";
import {eq} from "drizzle-orm";

export const agentsRouter = createTRPCRouter({
    // TODO - get many to protected procedure
    getOne: protectedProcedure.input(z.object({id:z.string()})).query(async ({input}) => {
        const [existingAgent] = await db
            .select()
            .from(agent)
            .where(eq(agent.id, input.id));

        return existingAgent;

    }),
    getMany: protectedProcedure.query(async () => {
        const data = await db
            .select()
            .from(agent);

        return data;

    }),
    create: protectedProcedure
        .input(agentsInsertSchema)
        .mutation(async ({input, ctx}) => {
            const [createdAgent] = await db
                .insert(agent)
                .values(({
                    ...input,
                    userId: ctx.auth.user.id,
                }))
                .returning();

            return createdAgent;
        }),
})