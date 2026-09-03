"use client";
import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import AuthGuard from "@/components/AuthGuard";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { supabase } from "@/lib/supabase/client";
import { Plus, X, Calendar, Users, Trash2, } from "lucide-react";
type CalendarEvent = {
    id: string;
    type: "calendar_event";
    activityType: "meeting";
    title: string;
    description: string | null;
    date: string;
    leadId: string | null;
    status: "scheduled" | "completed" | "cancelled";
};
const typeIcon: Record<string, ComponentType<{
    size?: number;
    className?: string;
}>> = {
    meeting: Users,
};
const typeColor: Record<string, string> = {
    meeting: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
};
const groupByDate = (events: CalendarEvent[]) => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
        const date = new Date(event.date)
            .toISOString()
            .slice(0, 10);
        if (!map.has(date)) {
            map.set(date, []);
        }
        map.get(date)!.push(event);
    }
    return map;
};
const formatDate = (iso: string, locale: string) => {
    return new Date(iso)
        .toLocaleDateString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric"
    });
};
const formatTime = (iso: string, locale: string) => {
    const date = new Date(iso);
    if (date.getHours() === 0 &&
        date.getMinutes() === 0) {
        return "All day";
    }
    return date.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit"
    });
};
export default function CalendarPage() {
    const { language } = useAppPreferences();
    const locale = "en-US";
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [newTitle, setNewTitle] = useState("");
    const [newDate, setNewDate] = useState(new Date()
        .toISOString()
        .slice(0, 16));
    const [newDesc, setNewDesc] = useState("");
    const [creating, setCreating] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);
    const getHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
            "Content-Type": "application/json"
        };
        if (session?.access_token) {
            headers.Authorization =
                `Bearer ${session.access_token}`;
        }
        return headers;
    };
    const load = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/calendar/events", {
                headers: await getHeaders(),
                credentials: "include"
            });
            if (response.ok) {
                const data = await response.json();
                const calendarEvents = (data.events || []) as CalendarEvent[];
                setEvents(calendarEvents);
            }
        }
        catch (error) {
            console.error(error);
            toast.error("Could not load calendar.");
        }
        setLoading(false);
    };
    useEffect(() => {
        void load();
    }, []);
    const resetForm = () => {
        setNewTitle("");
        setNewDesc("");
        setNewDate(new Date()
            .toISOString()
            .slice(0, 16));
    };
    const createMeeting = async () => {
        if (!newTitle.trim()) {
            toast.error("Title missing.");
            return;
        }
        setCreating(true);
        const response = await fetch("/api/calendar/events", {
            method: "POST",
            headers: await getHeaders(),
            credentials: "include",
            body: JSON.stringify({
                title: newTitle.trim(),
                scheduled_at: new Date(newDate)
                    .toISOString(),
                description: newDesc.trim()
                    ||
                        null
            })
        });
        if (response.ok) {
            toast.success("Meeting created.");
            setShowNew(false);
            resetForm();
            await load();
        }
        else {
            const data = await response.json();
            toast.error(data.error ||
                ("Creation failed."));
        }
        setCreating(false);
    };
    const startEdit = (event: CalendarEvent) => {
        setEditingEvent(event);
        setNewTitle(event.title);
        setNewDesc(event.description || "");
        setNewDate(new Date(event.date)
            .toISOString()
            .slice(0, 16));
    };
    const saveEdit = async () => {
        if (!editingEvent)
            return;
        setSavingEdit(true);
        const response = await fetch("/api/calendar/events", {
            method: "PUT",
            headers: await getHeaders(),
            credentials: "include",
            body: JSON.stringify({
                id: editingEvent.id,
                title: newTitle.trim(),
                description: newDesc.trim()
                    ||
                        null,
                scheduled_at: new Date(newDate)
                    .toISOString()
            })
        });
        if (response.ok) {
            toast.success("Meeting updated.");
            setEditingEvent(null);
            resetForm();
            await load();
        }
        else {
            toast.error("Save failed.");
        }
        setSavingEdit(false);
    };
    const deleteEvent = async (id: string) => {
        const confirmed = window.confirm("Delete meeting?");
        if (!confirmed)
            return;
        const response = await fetch(`/api/calendar/events?id=${id}`, {
            method: "DELETE",
            headers: await getHeaders(),
            credentials: "include"
        });
        if (response.ok) {
            toast.success("Meeting deleted.");
            setEvents((prev) => prev.filter((event) => event.id !== id));
        }
        else {
            const data = await response.json();
            toast.error(data.error ||
                ("Delete failed."));
        }
    };
    const grouped = groupByDate(events);
    const sortedDays = Array.from(grouped.keys()).sort();
    const today = new Date()
        .toISOString()
        .slice(0, 10);
    return (<AuthGuard>

      <div className="mx-auto max-w-4xl space-y-6">


        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">
              {"Calendar"}
            </p>


            <h1 className="mt-2 text-3xl font-bold text-foreground">
              {"Meetings"}
            </h1>


            <p className="mt-1 text-sm text-foreground/60">
              {events.length}{" "}
              {"scheduled meetings"}
            </p>

          </div>




          <button onClick={() => {
            resetForm();
            setEditingEvent(null);
            setShowNew(true);
        }} className="
              flex
              items-center
              gap-2
              rounded-2xl
              bg-cyan-600
              px-4
              py-2.5
              text-sm
              font-semibold
              text-white
            ">

            <Plus size={15}/>

            {"New Meeting"}

          </button>


        </div>






        {(showNew || editingEvent) && (<div className="
              fixed
              inset-0
              z-50
              flex
              items-center
              justify-center
              bg-black/60
              px-4
            ">

            <div className="
                w-full
                max-w-md
                rounded-3xl
                border
                border-border-subtle
                bg-surface-1
                p-6
              ">


              <div className="mb-5 flex justify-between">

                <h2 className="font-semibold text-foreground">

                  {editingEvent
                ? ("Edit meeting")
                :
                    ("Create meeting")}

                </h2>


                <button onClick={() => {
                setShowNew(false);
                setEditingEvent(null);
            }}>

                  <X size={16}/>

                </button>


              </div>




              <div className="space-y-3">


                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={"Title"} className="
                    w-full
                    rounded-xl
                    border
                    border-border-subtle
                    bg-surface-2
                    px-4
                    py-2.5
                  "/>





                <input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="
                    w-full
                    rounded-xl
                    border
                    border-border-subtle
                    bg-surface-2
                    px-4
                    py-2.5
                  "/>





                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder={"Description"} rows={3} className="
                    w-full
                    rounded-xl
                    border
                    border-border-subtle
                    bg-surface-2
                    px-4
                    py-2.5
                  "/>

              </div>





              <div className="mt-5 flex justify-end gap-2">


                <button onClick={() => {
                setShowNew(false);
                setEditingEvent(null);
            }} className="
                    rounded-xl
                    border
                    border-border-subtle
                    px-4
                    py-2
                  ">

                  {"Cancel"}

                </button>




                <button disabled={creating ||
                savingEdit} onClick={() => editingEvent
                ? void saveEdit()
                : void createMeeting()} className="
                    rounded-xl
                    bg-cyan-600
                    px-5
                    py-2
                    text-white
                  ">

                  {creating ||
                savingEdit
                ? "..."
                :
                    ("Save")}

                </button>


              </div>


            </div>


          </div>)}







        {loading && (<p className="text-sm text-foreground/60">
            {"Loading calendar..."}
          </p>)}







        <div className="space-y-6">


          {sortedDays.map((day) => {
            const dayEvents = grouped.get(day) || [];
            return (<div key={day}>


                <h3 className="mb-3 font-semibold text-foreground">

                  {formatDate(day, locale)}

                </h3>





                <div className="space-y-3">


                  {dayEvents.map((event) => {
                    const Icon = typeIcon[event.activityType]
                        || Calendar;
                    const color = typeColor[event.activityType]
                        || typeColor.meeting;
                    return (<div key={event.id} className={`
                          flex
                          gap-4
                          rounded-2xl
                          border
                          p-4
                          ${color}
                        `}>


                        <Icon size={18}/>




                        <div className="flex-1">


                          <p className="font-semibold text-foreground">

                            {event.title}

                          </p>




                          {event.description &&
                            (<p className="text-sm text-foreground/60">

                                {event.description}

                              </p>)}




                          <p className="mt-1 text-xs text-foreground/50">

                            {formatTime(event.date, locale)}

                          </p>


                        </div>






                        <div className="flex flex-col gap-2">


                          <button onClick={() => startEdit(event)} className="
                              text-xs
                              text-cyan-300
                            ">

                            {"Edit"}

                          </button>





                          <button onClick={() => void deleteEvent(event.id)} className="
                              flex
                              items-center
                              gap-1
                              text-xs
                              text-red-400
                            ">

                            <Trash2 size={12}/>

                            {"Delete"}

                          </button>




                          {event.leadId &&
                            (<Link href={`/leads/${event.leadId}`} className="
                                  text-xs
                                  underline
                                ">

                                {"Lead"}

                              </Link>)}


                        </div>


                      </div>);
                })}


                </div>


              </div>);
        })}


        </div>


      </div>


    </AuthGuard>);
}
