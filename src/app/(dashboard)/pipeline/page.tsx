"use client";
import { useEffect, useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult, } from "@hello-pangea/dnd";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase/client";
import { useLeadsData } from "@/hooks/useLeadsData";
import { getVisibleLeadNextAction } from "@/lib/leadNextAction";
import type { Lead } from "@/types";
import toast from "react-hot-toast";
type StageKey = "new" | "contacted" | "proposal" | "won" | "lost";
const stageOrder: Array<{
    key: StageKey;
    label: string;
}> = [
    {
        key: "new",
        label: "NEW",
    },
    {
        key: "contacted",
        label: "CONTACTED",
    },
    {
        key: "proposal",
        label: "PROPOSAL",
    },
    {
        key: "won",
        label: "WON",
    },
    {
        key: "lost",
        label: "LOST",
    },
];
const normalizeStage = (status: string): StageKey => {
    if (status === "contacted")
        return "contacted";
    if (status === "proposal")
        return "proposal";
    if (status === "won")
        return "won";
    if (status === "lost")
        return "lost";
    return "new";
};
const stageStyles: Record<StageKey, { dot: string; badge: string }> = {
    new: { dot: "bg-sky-400", badge: "border-sky-400/20 bg-sky-400/10 text-sky-300" },
    contacted: { dot: "bg-amber-400", badge: "border-amber-400/20 bg-amber-400/10 text-amber-300" },
    proposal: { dot: "bg-violet-400", badge: "border-violet-400/20 bg-violet-400/10 text-violet-300" },
    won: { dot: "bg-emerald-400", badge: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" },
    lost: { dot: "bg-rose-400", badge: "border-rose-400/20 bg-rose-400/10 text-rose-300" },
};
export default function PipelinePage() {
    const { leads, loading, refresh, } = useLeadsData({
        activityLimit: 5,
        includeCompleted: true,
    });
    const [columns, setColumns] = useState<Record<StageKey, Lead[]>>({
        new: [],
        contacted: [],
        proposal: [],
        won: [],
        lost: [],
    });
    useEffect(() => {
        const grouped: Record<StageKey, Lead[]> = {
            new: [],
            contacted: [],
            proposal: [],
            won: [],
            lost: [],
        };
        for (const lead of leads) {
            grouped[normalizeStage(lead.status)].push(lead);
        }
        setColumns(grouped);
    }, [leads]);
    const totalValue = useMemo(() => leads.reduce((sum, lead) => sum + (lead.value || 0), 0), [leads]);
    const handleDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId, } = result;
        if (!destination)
            return;
        if (destination.droppableId === source.droppableId &&
            destination.index === source.index) {
            return;
        }
        const nextStage = destination.droppableId as StageKey;
        const lead = leads.find(item => item.id === draggableId);
        if (!lead)
            return;
        const previousColumns = columns;
        setColumns(current => {
            const next = {
                ...current,
            };
            const sourceStage = source.droppableId as StageKey;
            const destinationStage = destination.droppableId as StageKey;
            const sourceItems = [
                ...next[sourceStage],
            ];
            const destinationItems = sourceStage === destinationStage
                ? sourceItems
                : [
                    ...next[destinationStage],
                ];
            const [moved,] = sourceItems.splice(source.index, 1);
            destinationItems.splice(destination.index, 0, {
                ...moved,
                status: nextStage,
            });
            next[sourceStage] =
                sourceItems;
            next[destinationStage] =
                destinationItems;
            return next;
        });
        try {
            const session = await supabase.auth.getSession();
            const response = await fetch("/api/leads", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.data.session?.access_token ?? ""}`,
                },
                body: JSON.stringify({
                    id: lead.id,
                    status: nextStage,
                }),
            });
            const result = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(result?.error || `Pipeline update failed (${response.status})`);
            }
            await refresh();
            if (result?.warning) toast.error(result.warning);
        }
        catch (error) {
            console.error("Pipeline update error", error);
            setColumns(previousColumns);
            toast.error(error instanceof Error ? error.message : "Pipeline update failed");
        }
    };
    return (<AuthGuard>

      <div className="space-y-6">


        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>

              <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
            Pipeline
          </p>


          <h1 className="mt-2 text-3xl font-bold text-foreground">
            Deal stages and progress
          </h1>


          <p className="mt-2 text-sm text-foreground/60">Open leads and completed deals at a glance.</p>
          </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-foreground/50">Total value</p>
          <p className="mt-1 text-lg font-semibold text-foreground">€{totalValue.toLocaleString("en-US")}</p>
        </div>
        </div>





        {loading ? (<p className="text-foreground/65">
              Loading pipeline...
            </p>) : (<DragDropContext onDragEnd={handleDragEnd}>


              <div className="overflow-x-auto pb-3">
              <div className="grid min-w-[1180px] grid-cols-5 gap-4">


                {stageOrder.map(stage => (<Droppable key={stage.key} droppableId={stage.key}>


                      {(provided, snapshot) => (<div ref={provided.innerRef} {...provided.droppableProps} className={`min-h-[560px] rounded-2xl border p-3 transition-colors ${snapshot.isDraggingOver ? "border-cyan-400/40 bg-cyan-400/[0.04]" : "border-border-subtle bg-gradient-to-b from-surface-1 to-surface-2/40"}`}>


                            <div className="mb-4 flex items-center justify-between">


                              <h2 className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-foreground/75">
                                <span className={`h-2 w-2 rounded-full ${stageStyles[stage.key].dot}`} />
                                {stage.label}

                              </h2>



                              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${stageStyles[stage.key].badge}`}>

                                {columns[stage.key]
                        .length}

                              </span>


                            </div>

                            <p className="-mt-2 mb-4 px-1 text-xs text-foreground/50">
                              €{columns[stage.key].reduce((sum, lead) => sum + Number(lead.value || 0), 0).toLocaleString("en-US")} total value
                            </p>




                            <div className="space-y-3">


                              {columns[stage.key]
                        .map((lead, index) => (<Draggable key={lead.id} draggableId={lead.id} index={index}>


                                      {(draggableProvided, dragSnapshot) => (<article ref={draggableProvided.innerRef} {...draggableProvided.draggableProps} {...draggableProvided.dragHandleProps} className={`rounded-xl border p-4 transition-all duration-200 ${dragSnapshot.isDragging ? "rotate-[1deg] border-cyan-400/50 bg-surface-1 shadow-2xl shadow-cyan-500/10" : "border-border-subtle bg-surface-2/80 hover:-translate-y-0.5 hover:border-cyan-500/25 hover:bg-surface-1 hover:shadow-lg hover:shadow-cyan-500/5"}`}>


                                            <p className="font-semibold text-foreground">

                                              {lead.name ||
                                "Unnamed lead"}

                                            </p>



                                            <p className="mt-1 text-xs text-foreground/55">

                                              {lead.company ||
                                "No company"}

                                            </p>



                                            <p className={`mt-3 inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${stageStyles[stage.key].badge}`}>€{Number(lead.value || 0).toLocaleString("en-US")}</p>

                                            {lead.next_action || lead.status === "won" || lead.status === "lost" ? (
                                              <div className="mt-3 rounded-lg border border-border-subtle/70 bg-surface-1/60 px-3 py-2">
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/45">Next action</p>
                                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-foreground/75">{getVisibleLeadNextAction(lead.status, lead.next_action)}</p>
                                              </div>
                                            ) : null}


                                          </article>)}


                                    </Draggable>))}

                              {columns[stage.key].length === 0 ? (
                                <p className="rounded-xl border border-dashed border-border-subtle px-3 py-8 text-center text-xs text-foreground/40">No deals in this stage</p>
                              ) : null}


                            </div>
                            



                            {provided.placeholder}



                          </div>)}


                    </Droppable>))}


              </div>
              </div>


            </DragDropContext>)}



      </div>


    </AuthGuard>);
}
