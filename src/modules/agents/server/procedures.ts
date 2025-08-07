import {baseProcedure, createTRPCRouter} from "@/trpc/init";
import {db} from "@/db";
import {agent} from "@/db/schema";

export const agentsRouter = createTRPCRouter({
    getMany: baseProcedure.query(async () => {
        const data = await db
            .select()
            .from(agent);

        // await new Promise(resolve => setTimeout(resolve, 5000));
        // throw new TRPCError({code:"BAD_REQUEST"});
        return data;

    })
})