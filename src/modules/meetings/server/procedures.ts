import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { db } from "@/db";
// Import the new transcriptNote table
import { agent, meetings, user, transcriptNote } from "@/db/schema";
import { z } from "zod";
import { and, count, desc, eq, getTableColumns, ilike, inArray, InferInsertModel, sql } from "drizzle-orm";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_SIZE } from "@/constants";
import { TRPCError } from "@trpc/server";

// Import the updated meeting and new note schemas
import {
    meetingsInsertSchema,
    meetingsUpdateSchema,
    noteDeleteSchema,
    noteInsertSchema,
    noteUpdateSchema
} from "@/modules/meetings/schemas";
import { MeetingStatus, StreamTranscriptItem } from "@/modules/meetings/types";
import { streamVideo } from "@/lib/stream-video";
import { generateAvatarUri } from "@/lib/avatar";
import { streamChat } from "@/lib/stream-chat";
import JSONL from "jsonl-parse-stringify";

export const meetingsRouter = createTRPCRouter({
    // --- Procedures for Notes ---

    getNotes: protectedProcedure
        .input(z.object({ meetingId: z.string() }))
        .query(async ({ input }) => {
            const notes = await db
                .select({
                    id: transcriptNote.id,
                    note: transcriptNote.note,
                    email: transcriptNote.email,
                    createdAt: transcriptNote.createdAt,
                    author: {
                        id: user.id,
                        name: user.name,
                        image: user.image,
                    },
                })
                .from(transcriptNote)
                .innerJoin(user, eq(transcriptNote.userId, user.id))
                .where(eq(transcriptNote.meetingId, input.meetingId))
                .orderBy(desc(transcriptNote.createdAt));

            return notes;
        }),

    createNote: protectedProcedure
        .input(noteInsertSchema)
        .mutation(async ({ input, ctx }) => {
            const [newNote] = await db
                .insert(transcriptNote)
                .values({
                    meetingId: input.meetingId,
                    note: input.note,
                    email: input.email,
                    userId: ctx.auth.user.id,
                })
                .returning();

            return newNote;
        }),

    updateNote: protectedProcedure
        .input(noteUpdateSchema)
        .mutation(async ({ input, ctx }) => {
            const [note] = await db.select().from(transcriptNote).where(eq(transcriptNote.id, input.id));
            if (note?.userId !== ctx.auth.user.id) {
                throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own notes." });
            }

            const [updatedNote] = await db
                .update(transcriptNote)
                .set({ note: input.note,
                    updatedAt: new Date() })
                .where(eq(transcriptNote.id, input.id))
                .returning();

            return updatedNote;
        }),

    deleteNote: protectedProcedure
        .input(noteDeleteSchema)
        .mutation(async ({ input, ctx }) => {
            const [note] = await db.select().from(transcriptNote).where(eq(transcriptNote.id, input.id));
            if (note?.userId !== ctx.auth.user.id) {
                throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own notes." });
            }

            const [deletedNote] = await db
                .delete(transcriptNote)
                .where(eq(transcriptNote.id, input.id))
                .returning();

            return deletedNote;
        }),

    // --- Original Procedures for Meetings ---

    getTranscript: protectedProcedure
        .input(z.object({id:z.string()}))
        .query(async ({input,ctx})=>{
            const [existingMeeting] = await db
                .select()
                .from(meetings)
                .where(
                    and(eq(meetings.id, input.id), eq(meetings.userId, ctx.auth.user.id))
                );
            if (!existingMeeting.transcriptUrl) {
                return[];
            }
            const transcript = await fetch(existingMeeting.transcriptUrl)
                .then((res) => res.text())
                .then((text) => JSONL.parse<StreamTranscriptItem>(text))
                .catch(()=>{
                    return[]
                });
            const speakerIds = [
                ...new Set (transcript.map((item)=> item.speaker_Id)),
            ];
            const userSpeakers = await db
                .select()
                .from(user)
                .where(inArray(user.id, speakerIds))
                .then((users) =>
                    users.map((user) => ({
                        ...user,
                        image:
                            user.image ??
                            generateAvatarUri({seed: user.name, variant: "initials"}),
                    }))
                );
            const agentSpeakers = await db
                .select()
                .from(agent)
                .where(inArray(agent.id, speakerIds))
                .then((agents) =>
                    agents.map((agent) => ({
                        ...agent,
                        image: generateAvatarUri({
                            seed: agent.name,
                            variant: "botttsNeutral"
                        }),
                    }))
                );
            const speakers = [...userSpeakers, ...agentSpeakers];
            const transcriptWithSpeakers = transcript.map((item) => {
                const speaker  = speakers.find(
                    (speaker) => speaker.id === item.speaker_Id
                );
                if(!speaker) {
                    return {
                        ...item,
                        user: {
                            name: "Unknown",
                            image: generateAvatarUri({
                                seed: "Unknown",
                                variant: "initials",
                            })
                        },
                    };
                }
                return {
                    ...item,
                    user: {
                        name: speaker.name,
                        image: speaker.image,
                    },
                };
            })

            return transcriptWithSpeakers;
        }),

    generateToken: protectedProcedure.mutation(async ({ctx}) => {
        await streamVideo.upsertUsers([
            {
                id: ctx.auth.user.id,
                name: ctx.auth.user.name,
                image: ctx.auth.user.image ?? generateAvatarUri({seed: ctx.auth.user.name, variant: "initials"}),
                role: 'admin',
            },
        ]);

        const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        const issuedAt = Math.floor(Date.now() / 1000) - 60;

        const token = streamVideo.generateUserToken({
            user_id: ctx.auth.user.id,
            exp: expirationTime,
            validity_in_seconds: issuedAt,
        });
        return token;
    }),

    generateChatToken: protectedProcedure.mutation(async ({ctx})=>{
        const token = streamChat.createToken(ctx.auth.user.id);
        await streamChat.upsertUser({
            id: ctx.auth.user.id,
            role: "admin",
        });
        return token;
    }),

    remove: protectedProcedure
        .input(z.object({id: z.string()}))
        .mutation(async ({input, ctx}) => {
            const [removedMeeting] = await db
                .delete(meetings)
                .where(
                    and(
                        eq(meetings.id, input.id),
                        eq(meetings.userId, ctx.auth.user.id),
                    ),
                )
                .returning();
            if (!removedMeeting) {
                throw new TRPCError({code: 'NOT_FOUND', message: 'Meeting not found'});
            }
            return removedMeeting;
        }),

    update: protectedProcedure
        .input(meetingsUpdateSchema)
        .mutation(async ({input, ctx}) => {
            const [updatedMeeting] = await db
                .update(meetings)
                .set(input)
                .where(
                    and(
                        eq(meetings.id, input.id),
                        eq(meetings.userId, ctx.auth.user.id),
                    ),
                )
                .returning();
            if (!updatedMeeting) {
                throw new TRPCError({code: 'NOT_FOUND', message: 'Meeting not found'});
            }
            return updatedMeeting;
        }),

    create: protectedProcedure
        .input(meetingsInsertSchema)
        .mutation(async ({input, ctx}) => {
            const [createdMeeting] = await db
                .insert(meetings)
                .values({
                    ...input,
                    userId: ctx.auth.user.id,
                } as InferInsertModel<typeof meetings>)
                .returning();
            const call = streamVideo.video.call("default", createdMeeting.id);
            await call.create({
                data: {
                    created_by_id: ctx.auth.user.id,
                    custom: {
                        meetingId: createdMeeting.id,
                        meetingName: createdMeeting.name,
                    },
                    settings_override: {
                        transcription: {
                            language: "en",
                            mode: "auto-on",
                            closed_caption_mode: "auto-on",
                        },
                        recording: {
                            mode: "auto-on",
                            quality: "1080p",
                        },
                    },
                },
            });
            const [existingAgent] = await db
                .select()
                .from(agent)
                .where(eq(agent.id, createdMeeting.agentId));
            if (!existingAgent) {
                throw new TRPCError({code: 'NOT_FOUND', message: 'Agent not found'});
            }
            await streamVideo.upsertUsers([
                {
                    id: existingAgent.id,
                    name: existingAgent.name,
                    image: generateAvatarUri({seed: existingAgent.name, variant: "botttsNeutral"}),
                    role: 'user',
                },
            ])
            return createdMeeting;
        }),

    getOne: protectedProcedure.input(z.object({id:z.string()})).query(async ({input, ctx}) => {
        const [existingMeeting] = await db
            .select({
                ...getTableColumns(meetings),
                agent: agent,
                duration:sql<number>`EXTRACT(EPOCH FROM(ended_at - started_at))`.as('duration'),
            })
            .from(meetings)
            .innerJoin(agent, eq(meetings.agentId,agent.id))
            .where(
                and(
                    eq(meetings.id, input.id),
                    eq(meetings.userId, ctx.auth.user.id),
                )
            );
        if(!existingMeeting) {
            throw new TRPCError({code: 'NOT_FOUND', message: 'meetings not found'});
        }

        return existingMeeting;
    }),

    getMany: protectedProcedure
        .input(z.object({
            page: z.number().default(DEFAULT_PAGE),
            pageSize: z
                .number()
                .min(MIN_PAGE_SIZE)
                .max(MAX_PAGE_SIZE)
                .default(DEFAULT_PAGE_SIZE),
            search: z.string().nullish(),
            agentId: z.string().nullish(),
            status:z
                .enum([
                    MeetingStatus.Upcoming,
                    MeetingStatus.Active,
                    MeetingStatus.Completed,
                    MeetingStatus.Cancelled,
                    MeetingStatus.Processing,
                ])
                .nullish(),
        }))
        .query(async ({ctx,input}) => {

            const {page, pageSize, search, status, agentId} = input;
            const data = await db
                .select({
                    ...getTableColumns(meetings),
                    agent:agent,
                    duration:sql<number>`EXTRACT(EPOCH FROM(ended_at - started_at))`.as('duration'),
                })
                .from(meetings)
                .innerJoin(agent,eq(meetings.agentId, agent.id))
                .where(
                    and(
                        eq(meetings.userId, ctx.auth.user.id),
                        search ? ilike(meetings.name,`%${search}%`) : undefined,
                        status ? eq(meetings.status, status) : undefined,
                        agentId ? eq(meetings.agentId, agentId) : undefined,
                    )
                )
                .orderBy(desc(meetings.createdAt),desc(meetings.id))
                .limit(pageSize)
                .offset((page - 1) * pageSize);
            const [total] = await db
                .select({count: count()})
                .from(meetings)
                .innerJoin(agent,eq(meetings.agentId, agent.id))
                .where(
                    and(
                        eq(meetings.userId, ctx.auth.user.id),
                        search ? ilike(meetings.name,`%${search}%`) : undefined,
                        status ? eq(meetings.status, status) : undefined,
                        agentId ? eq(meetings.agentId, agentId)
                            : undefined,
                    )
                )
            const totalPages = Math.ceil(total.count / pageSize);
            return {
                items: data,
                total: total.count,
                totalPages,
            };
        }),
});