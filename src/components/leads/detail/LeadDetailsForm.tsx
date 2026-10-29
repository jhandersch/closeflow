"use client";
import { translateText } from "@/lib/i18n";

import { useEffect, useState } from "react";
import { notify } from "@/lib/notifications"
import { getDefaultStatusNextAction, translateLeadNextAction } from "@/lib/leadNextAction";
import type { Lead, LeadSource, LeadStatus, UpdateLeadData } from "@/types";
type Props = {
    lead: Lead;
    saveLead: (
        id: string,
        oldStatus: LeadStatus,
        data: UpdateLeadData,
    ) => Promise<Lead>;
    onSaved: (updatedLead: Lead) => Promise<void>;
    timeZone: string;
};
export default function LeadDetailsForm({ lead, saveLead, onSaved, }: Props) {
    const [name, setName] = useState(lead.name);
    const [company, setCompany] = useState(lead.company);
    const [status, setStatus] = useState<LeadStatus>(lead.status);
    const [value, setValue] = useState(String(lead.value ?? 0));
    const [email, setEmail] = useState(lead.email ?? "");
    const [phone, setPhone] = useState(lead.phone ?? "");
    const [website, setWebsite] = useState(lead.website ?? "");
    const [address, setAddress] = useState(lead.address ?? "");
    const [nextAction, setNextAction] = useState(lead.next_action ?? "");
    const [nextActionDate, setNextActionDate] = useState(lead.next_action_date
        ? lead.next_action_date.slice(0, 10)
        : "");
    const [notes, setNotes] = useState(lead.notes ?? "");
    const [source, setSource] = useState<LeadSource>(lead.source ?? "other");
    const [tags, setTags] = useState((lead.tags ?? []).join(", "));
    const [saving, setSaving] = useState(false);
    const handleStatusChange = (nextStatus: LeadStatus) => {
        setStatus(nextStatus);
        const statusNextAction = getDefaultStatusNextAction(nextStatus);
        setNextAction(translateLeadNextAction(statusNextAction.action));
        setNextActionDate(statusNextAction.actionDate
            ? statusNextAction.actionDate.slice(0, 10)
            : "");
    };
    useEffect(() => {
        setName(lead.name);
        setCompany(lead.company);
        setStatus(lead.status);
        setValue(String(lead.value ?? 0));
        setEmail(lead.email ?? "");
        setPhone(lead.phone ?? "");
        setWebsite(lead.website ?? "");
        setAddress(lead.address ?? "");
        setNextAction(lead.next_action ?? "");
        setNextActionDate(lead.next_action_date
            ? lead.next_action_date.slice(0, 10)
            : "");
        setNotes(lead.notes ?? "");
        setSource(lead.source ?? "other");
        setTags((lead.tags ?? []).join(", "));
    }, [lead]);
    const handleSave = async () => {
        const dealValue = Number(value);
        if (!name.trim()) {
            notify.error(translateText("Name required"));
            return;
        }
        if (Number.isNaN(dealValue)) {
            notify.error(translateText("Invalid value"));
            return;
        }
        setSaving(true);
        try {
            const statusNextAction = lead.status !== status
                ? getDefaultStatusNextAction(status)
                : null;
            const updatedLead = await saveLead(lead.id, lead.status, {
                name,
                company,
                status,
                value: dealValue,
                email,
                phone,
                website,
                address,
                next_action: (statusNextAction?.action ?? nextAction) || undefined,
                next_action_date: (statusNextAction?.actionDate ?? nextActionDate) || undefined,
                notes,
                source,
                tags: tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
            });
            const displayedLead = statusNextAction
                ? {
                    ...updatedLead,
                    status,
                    next_action: translateLeadNextAction(statusNextAction.action),
                    next_action_date: statusNextAction.actionDate,
                }
                : updatedLead;
            if (statusNextAction) {
                setNextAction(translateLeadNextAction(statusNextAction.action));
                setNextActionDate(statusNextAction.actionDate
                    ? statusNextAction.actionDate.slice(0, 10)
                    : "");
            }
            await onSaved(displayedLead);
            notify.success(translateText("Lead saved"), {
                id: "lead-saved",
                })
        }
        catch (error) {
            console.error(error);
            notify.error(translateText("Save failed"));
        }
        finally {
            setSaving(false);
        }
    };
    return (<div id="lead-details" className="
space-y-5
rounded-xl
border
border-border-subtle
bg-surface-1
p-6
">


    <h2 className="text-xl font-semibold">
        {translateText("Lead Details")}
    </h2>



    <div className="
grid
gap-5
md:grid-cols-2
">


    <Input label={"Name"} value={name} setValue={setName}/>


    <Input label={"Company"} value={company} setValue={setCompany}/>


    <Input label={"Lead Value"} value={value} setValue={setValue}/>



    <div>

    <label className="mb-2 block text-sm text-foreground/65">
        {translateText("Status")}
    </label>


    <select value={status} onChange={e => handleStatusChange(e.target.value as LeadStatus)} className="
w-full
rounded-xl
border
border-border-subtle
bg-surface-2
px-4
py-3
">

    <option value="new">
{translateText("New")}</option>

    <option value="contacted">
{translateText("Contacted")}</option>

    <option value="proposal">
{translateText("Proposal")}</option>

    <option value="won">
{translateText("Won")}</option>

    <option value="lost">
{translateText("Lost")}</option>

    </select>

    </div>



    <Input label="Email" value={email} setValue={setEmail}/>


    <Input label="Phone" value={phone} setValue={setPhone}/>


    <Input label="Website" value={website} setValue={setWebsite}/>



    <div className="md:col-span-2">

    <Input label={"Address"} value={address} setValue={setAddress}/>

    </div>

    <div className="grid gap-5 md:grid-cols-2">

  <Input label={"Next Action"} value={nextAction} setValue={setNextAction}/>

  <div>
    <label className="mb-2 block text-sm text-foreground/65">
      {translateText("Due Date")}
    </label>

    <input type="date" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} className="
        w-full
        rounded-xl
        border
        border-border-subtle
        bg-surface-2
        px-4
        py-3
        outline-none
      "/>
  </div>

    </div>



    <div className="md:col-span-2">

    <Input label="Tags" value={tags} setValue={setTags}/>

    </div>



    </div>



    <div>

    <label className="mb-2 block text-sm text-foreground/65">
        {translateText("Notes")}
    </label>


    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="
h-40
w-full
rounded-xl
border
border-border-subtle
bg-surface-2
px-4
py-3
"/>

    </div>




    <button onClick={handleSave} disabled={saving} className="
rounded-xl
bg-foreground
px-6
py-3
font-semibold
text-background
">

        {saving
            ?
                (translateText("Saving..."))
            :
                (translateText("Save Changes"))}

    </button>



    </div>);
}
function Input({ label, value, setValue }: {
    label: string;
    value: string;
    setValue: (v: string) => void;
}) {
    return (<div>


    <label className="
mb-2
block
text-sm
text-foreground/65
">

    {translateText(label)}

    </label>



    <input value={value} onChange={e => setValue(e.target.value)} className="
w-full
rounded-xl
border
border-border-subtle
bg-surface-2
px-4
py-3
outline-none
"/>


    </div>);
}
