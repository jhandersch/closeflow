"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { useMeetings } from "@/hooks/useMeetings";
type Props = {
    leadId: string;
};
export default function LeadMeetings({ leadId }: Props) {
    const { meetings, loading, addMeeting, deleteMeeting } = useMeetings(leadId);
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [description, setDescription] = useState("");
    async function create() {
        if (!title || !date)
            return;
        try {
            await addMeeting({
                title,
                description,
                starts_at: new Date(date).toISOString()
            });
            setTitle("");
            setDate("");
            setDescription("");
            toast.success("Meeting created");
        }
        catch (error) {
            console.error(error);
            toast.error("Could not create meeting");
        }
    }
    return (<div className="
space-y-5
rounded-xl
border
border-border-subtle
bg-surface-1
p-6
">


    <h2 className="text-xl font-semibold">
        {"Meetings"}
    </h2>



    <div className="space-y-3">


    <input value={title} onChange={e => setTitle(e.target.value)} placeholder={"Title"} className="
w-full
rounded-xl
border
border-border-subtle
bg-surface-2
px-4
py-3
"/>



    <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="
w-full
rounded-xl
border
border-border-subtle
bg-surface-2
px-4
py-3
"/>



    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={"Description"} className="
h-24
w-full
rounded-xl
border
border-border-subtle
bg-surface-2
px-4
py-3
"/>



    <button onClick={create} className="
rounded-xl
bg-foreground
px-5
py-3
font-semibold
text-background
">
        {"Create meeting"}
    </button>


    </div>




    <div className="space-y-3">


        {loading
            ?
                <p>
Loading...
                </p>
            :
                meetings.map(meeting => (<div key={meeting.id} className="
rounded-xl
border
border-border-subtle
bg-surface-2
p-4
">


                <h3 className="font-semibold">
                {meeting.title}
                </h3>


                <p className="text-sm text-foreground/60">
                    {new Date(meeting.starts_at)
                        .toLocaleString("en-US")}
                </p>


                    {meeting.description &&
                        <p className="mt-2 text-sm">
                        {meeting.description}
                        </p>}



                <button onClick={() => deleteMeeting(meeting.id)} className="
mt-3
text-sm
text-red-400
">
Delete
                </button>


                </div>))}


    </div>



    </div>);
}
