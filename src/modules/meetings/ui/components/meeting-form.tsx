import {useTRPC} from "@/trpc/client";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Button} from "@/components/ui/button";
import {toast} from "sonner";
import {MeetingGetOne} from "@/modules/meetings/types";
import {meetingsInsertSchema} from "@/modules/meetings/schemas";
import {useState} from "react";
import {CommandSelect} from "@/components/command-select";
import {GeneratedAvatar} from "@/components/generated-avatar";
import {NewAgentDialog} from "@/modules/agents/ui/components/new-agent-dialog";
import {useRouter} from "next/navigation";
import {CalendarIcon} from "lucide-react";
import {Calendar} from "@/components/ui/calendar";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {format as formatDate} from "date-fns";
import {cn} from "@/lib/utils";

// Extended schema with new optional fields with validations
const extendedMeetingsInsertSchema = meetingsInsertSchema.extend({
    description: z.string()
        .max(500, { message: "Description must not exceed 500 characters" })
        .optional(),
    scheduledDate: z.date().optional(),
    scheduledTime: z.string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Please enter a valid time format" })
        .optional()
        .or(z.literal("")),
    duration: z.string()
        .regex(/^[1-9]\d*\s*(minutes?|mins?|hours?|hrs?|h|m)$/i, {
            message: "Please enter a valid duration (e.g., 30 minutes, 1 hour)"
        })
        .optional()
        .or(z.literal("")),
    participants: z.string()
        .regex(/^\d+$/, { message: "Please enter only numbers" })
        .refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), {
            message: "Number of participants must be between 1 and 10"
        })
        .optional()
        .or(z.literal("")),
});

interface MeetingFromProps {
    onSuccess?: (id?:string) => void;
    onCancel?: () => void;
    initialValues?: MeetingGetOne;
};

export const MeetingForm = ({onSuccess, onCancel, initialValues}: MeetingFromProps) => {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const router = useRouter();
    const [openNewAgentDialog, setOpenNewAgentDialog] = useState(false);
    const [agentSearch, setAgentSearch] = useState("");

    const agents = useQuery(
        trpc.agents.getMany.queryOptions({
            pageSize:100,
            search: agentSearch,
        }),
    );

    const createMeeting = useMutation(
        trpc.meetings.create.mutationOptions({
            onSuccess: async (data) => {
                await queryClient.invalidateQueries(
                    trpc.meetings.getMany.queryOptions({}),
                );
                await queryClient.invalidateQueries(
                    trpc.premium.getFreeUsage.queryOptions(),
                );
                onSuccess?.(data.id);
            },
            onError: (error) => {
                toast.error(error.message);
                if(error.data?.code === "FORBIDDEN"){
                    router.push('/upgrade')
                }
            },
        }),
    );
    const updateMeetings = useMutation(
        trpc.meetings.update.mutationOptions({
            onSuccess: async () => {
                await queryClient.invalidateQueries(
                    trpc.meetings.getMany.queryOptions({}),
                );

                if(initialValues?.id){
                    await queryClient.invalidateQueries(
                        trpc.meetings.getOne.queryOptions({id: initialValues.id}),
                    )
                }
                onSuccess?.();
            },
            onError: (error) => {
                toast.error(error.message);
            },
        }),
    );
    const form = useForm<z.infer<typeof extendedMeetingsInsertSchema>>({
        resolver: zodResolver(extendedMeetingsInsertSchema),
        defaultValues: {
            name: initialValues?.name ?? "",
            agentId: initialValues?.agentId ?? "",
            description: "",
            scheduledDate: undefined,
            scheduledTime: "",
            duration: "",
            participants: "",
        },
    });
    const isEdit = !!initialValues?.id;
    const isPending = createMeeting.isPending || updateMeetings.isPending;

    const onSubmit = (values: z.infer<typeof extendedMeetingsInsertSchema>) => {
        // Extract only the fields that the backend expects
        const { name, agentId } = values;

        if (isEdit && initialValues?.id) {
            updateMeetings.mutate({
                name,
                agentId,
                id: initialValues.id
            });
        } else {
            createMeeting.mutate({ name, agentId });
        }
    };

    return(
        <>
            <NewAgentDialog open={openNewAgentDialog} onOpenChange={setOpenNewAgentDialog} />
            <Form {...form}>
                <form className={'space-y-4'} onSubmit={form.handleSubmit(onSubmit)}>
                    <div className={isEdit ? '' : 'max-h-[50vh] overflow-y-auto px-1 space-y-4'}>
                        <FormField
                            name={'name'}
                            control={form.control}
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder={'e.g: Interview Consultation'}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            name={'agentId'}
                            control={form.control}
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Agent <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <CommandSelect
                                            options={(agents.data?.items ?? []).map((agent) => ({
                                                id: agent.id,
                                                value: agent.id,
                                                children:(
                                                    <div className={'flex items-center gap-x-2'}>
                                                        <GeneratedAvatar seed={agent.name} variant={'botttsNeutral'} className={'border size-6'}/>
                                                        <span>{agent.name}</span>
                                                    </div>
                                                )
                                            }))}
                                            onSelect={field.onChange}
                                            onSearch={setAgentSearch}
                                            value={field.value}
                                            placeholder={'Select an agent'}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Not found what you are looking for?{" "}
                                        <button
                                            type={'button'}
                                            className={'text-primary hover:underline'}
                                            onClick={() => setOpenNewAgentDialog(true)}
                                        >
                                            Create a new agent
                                        </button>
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {!isEdit && (
                            <>
                                <FormField
                                    name={'description'}
                                    control={form.control}
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder={'Brief description of the meeting purpose...'}
                                                    className="min-h-[80px] resize-none"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name={'scheduledDate'}
                                    control={form.control}
                                    render={({field}) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Scheduled Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                formatDate(field.value, "PPP")
                                                            ) : (
                                                                <span>Pick a date</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) =>
                                                            date < new Date(new Date().setHours(0, 0, 0, 0))
                                                        }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name={'scheduledTime'}
                                    control={form.control}
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Scheduled Time</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="time"
                                                    placeholder={'e.g: 10:00 AM'}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name={'duration'}
                                    control={form.control}
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Expected Duration</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder={'e.g: 30 minutes, 1 hour, 2 hours'}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name={'participants'}
                                    control={form.control}
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Number of Participants</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    placeholder={'e.g: 5'}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}
                    </div>
                    <div className={'flex justify-end gap-x-2'}>
                        {onCancel && (
                            <Button
                                variant={'ghost'}
                                type={'button'}
                                disabled={isPending}
                                onClick={() => onCancel()}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            disabled={isPending}
                            type={'submit'}
                        >
                            {isEdit ? "Update Meeting" : "Create Meeting"}
                        </Button>
                    </div>
                </form>
            </Form>
        </>
    )
}