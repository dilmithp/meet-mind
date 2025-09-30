import {AgentGetOne} from "@/modules/agents/types";
import {useTRPC} from "@/trpc/client";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {agentsInsertSchema} from "@/modules/agents/schemas";
import {zodResolver} from "@hookform/resolvers/zod";
import {GeneratedAvatar} from "@/components/generated-avatar";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Button} from "@/components/ui/button";
import {toast} from "sonner";
import {useRouter} from "next/navigation";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

interface AgentFromProps {
    onSuccess?: () => void;
    onCancel?: () => void;
    initialValues?: AgentGetOne;
};

const AVAILABLE_MODELS = [
    "gpt-4-turbo",
    "gpt-3.5-turbo",
    "claude-3-opus",
    "gemini-1.5-pro"
] as const;

// 1. We create a NEW schema HERE, only for this form.
const agentFormSchema = agentsInsertSchema.extend({
    model: z.enum(AVAILABLE_MODELS)
});


export const AgentForm = ({onSuccess, onCancel, initialValues}: AgentFromProps) => {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const router = useRouter();

    const createAgent = useMutation(
        trpc.agents.create.mutationOptions({
            onSuccess: async () => {
                await queryClient.invalidateQueries(
                    trpc.agents.getMany.queryOptions({}),
                );
                await queryClient.invalidateQueries(
                    trpc.premium.getFreeUsage.queryOptions(),
                );
                onSuccess?.();
            },
            onError: (error) => {
                toast.error(error.message);
                if(error.data?.code === "FORBIDDEN"){
                    router.push('/upgrade')
                }
            },
        }),
    );
    const updateAgent = useMutation(
        trpc.agents.update.mutationOptions({
            onSuccess: async () => {
                await queryClient.invalidateQueries(
                    trpc.agents.getMany.queryOptions({}),
                );
                if(initialValues?.id){
                    await queryClient.invalidateQueries(
                        trpc.agents.getOne.queryOptions({id: initialValues.id}),
                    )
                }
                onSuccess?.();
            },
            onError: (error) => {
                toast.error(error.message);
            },
        }),
    );

    // 2. We use our NEW form-only schema here.
    const form = useForm<z.infer<typeof agentFormSchema>>({
        resolver: zodResolver(agentFormSchema),
        // 3. This permanently fixes the 'model' does not exist error.
        defaultValues: {
            name: initialValues?.name ?? "",
            instructions: initialValues?.instructions ?? "",
            model: AVAILABLE_MODELS[0],
        },
    });
    const isEdit = !!initialValues?.id;
    const isPending = createAgent.isPending || updateAgent.isPending;


    const onSubmit = (values: z.infer<typeof agentFormSchema>) => {
        const valuesForBackend = {
            name: values.name,
            instructions: values.instructions,
        };

        if (isEdit) {
            updateAgent.mutate({
                ...valuesForBackend,
                id: initialValues.id
            });
        } else {
            createAgent.mutate(valuesForBackend);
        }
    }

    return(
        <Form {...form}>
            <form className={'space-y-4'} onSubmit={form.handleSubmit(onSubmit)}>
                <GeneratedAvatar seed={form.watch("name") ?? ""} variant={"botttsNeutral"} className={'border size-16'}/>
                <FormField
                    name={'name'}
                    control={form.control}
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input {...field} placeholder={'e.g: Math Helper'}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Model</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a model" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {AVAILABLE_MODELS.map((model) => (
                                        <SelectItem key={model} value={model}>
                                            {model}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    name={'instructions'}
                    control={form.control}
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Instructions</FormLabel>
                            <FormControl>
                                <Textarea {...field} placeholder={'You are a helpful math assistant that can answer questions and help with tasks.'}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className={'flex justify-between gap-x-2'}>
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
                        className={'ml-auto'}
                    >
                        {isEdit ? "Update Agent" : "Create Agent"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}