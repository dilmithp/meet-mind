"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { noteInsertSchema, noteUpdateSchema } from "@/modules/meetings/schemas";
import { format } from "date-fns";
import { toast } from "sonner";
import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, TrashIcon, EditIcon } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingState } from "@/components/loading-state";

type BaseNote = inferProcedureOutput<AppRouter['meetings']['getNotes']>[number];
type Note = Omit<BaseNote, 'createdAt'> & {
    createdAt: string | null;
};

type NoteFormValues = z.infer<typeof noteInsertSchema>;
type NoteUpdateFormValues = z.infer<typeof noteUpdateSchema>;
interface MeetingNotesProps {
    meetingId: string;
}

export const MeetingNotes = ({ meetingId }: MeetingNotesProps) => {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const { data: session } = authClient.useSession();

    const { data: notes, isLoading } = useQuery(trpc.meetings.getNotes.queryOptions({ meetingId }));

    const createNoteMutation = useMutation(trpc.meetings.createNote.mutationOptions());
    const updateNoteMutation = useMutation(trpc.meetings.updateNote.mutationOptions());
    const deleteNoteMutation = useMutation(trpc.meetings.deleteNote.mutationOptions());

    const createForm = useForm<NoteFormValues>({
        resolver: zodResolver(noteInsertSchema),
        defaultValues: {
            meetingId,
            note: "",
            email: session?.user?.email ?? "",
        },
    });

    const handleCreateSubmit = (values: NoteFormValues) => {
        createNoteMutation.mutate(values, {
            onSuccess: () => {
                toast.success("Note added!");
                void queryClient.invalidateQueries({ queryKey: trpc.meetings.getNotes.queryKey({ meetingId }) });
                createForm.reset();
            },
            onError: (error) => {
                toast.error("Failed to add note", { description: error.message });
            },
        });
    };

    const updateForm = useForm<NoteUpdateFormValues>({
        resolver: zodResolver(noteUpdateSchema),
    });

    const handleUpdateSubmit = (values: NoteUpdateFormValues) => {
        updateNoteMutation.mutate(values, {
            onSuccess: () => {
                toast.success("Note updated!");
                void queryClient.invalidateQueries({ queryKey: trpc.meetings.getNotes.queryKey({ meetingId }) });
                setIsEditDialogOpen(false);
            },
            onError: (error) => {
                toast.error("Failed to update note", { description: error.message });
            },
        });
    };

    const handleEditClick = (note: Note) => {
        updateForm.reset({ id: note.id, note: note.note });
        setIsEditDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (!noteToDelete) return;
        deleteNoteMutation.mutate({ id: noteToDelete.id }, {
            onSuccess: () => {
                toast.success("Note deleted!");
                void queryClient.invalidateQueries({ queryKey: trpc.meetings.getNotes.queryKey({ meetingId }) });
                setNoteToDelete(null);
            },
            onError: (error) => {
                toast.error("Failed to delete note", { description: error.message });
            },
        });
    };

    if (isLoading) {
        return <LoadingState title="Loading notes..." description="Please wait a moment." />;
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-xl font-semibold">Notes ({notes?.length || 0})</h3>
                    {notes && notes.length > 0 ? (
                        notes.map((note) => (
                            <Card key={note.id}>
                                <CardHeader className="flex flex-row items-center justify-between p-4">
                                    <div className="flex items-center gap-x-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={note.author.image ?? undefined} />
                                            <AvatarFallback>{note.author.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium">{note.author.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {note.createdAt ? format(new Date(note.createdAt), "PPP") : ""}
                                            </p>
                                        </div>
                                    </div>
                                    {session?.user?.id === note.author.id && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleEditClick(note as Note)}>
                                                    <EditIcon className="mr-2 h-4 w-4" />
                                                    <span>Edit</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-500"
                                                    onClick={() => setNoteToDelete(note as Note)}
                                                >
                                                    <TrashIcon className="mr-2 h-4 w-4" />
                                                    <span>Delete</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                                    <p className="text-xs text-blue-500 mt-2">{note.email}</p>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">No notes have been added yet.</p>
                    )}
                </div>
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Add a Note</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...createForm}>
                                <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                                    <FormField
                                        control={createForm.control}
                                        name="note"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Note</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Share your thoughts..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={createForm.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="name@example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" disabled={createNoteMutation.isPending}>
                                        {createNoteMutation.isPending ? "Adding Note..." : "Add Note"}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Note</DialogTitle>
                    </DialogHeader>
                    <Form {...updateForm}>
                        <form onSubmit={updateForm.handleSubmit(handleUpdateSubmit)} className="space-y-4">
                            <FormField
                                control={updateForm.control}
                                name="note"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Note</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Edit your note..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">Cancel</Button>
                                </DialogClose>
                                <Button type="submit" disabled={updateNoteMutation.isPending}>
                                    {updateNoteMutation.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!noteToDelete} onOpenChange={() => setNoteToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this note?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteNoteMutation.isPending}>
                            {deleteNoteMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};