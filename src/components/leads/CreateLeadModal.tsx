"use client";
import { translateText } from "@/lib/i18n";

import { useState } from "react";
import toast from "react-hot-toast";
import type { LeadSource, LeadStatus, LeadSortBy } from "@/types";
type CreateLeadModalProps = {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
};
export default function CreateLeadModal({ open, onClose, onCreated, }: CreateLeadModalProps) {
    const [name, setName] = useState("");
    const [company, setCompany] = useState("");
    const [value, setValue] = useState("");
    const [status, setStatus] = useState<LeadStatus>("new");
    const [source, setSource] = useState<LeadSource>("other");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [website, setWebsite] = useState("");
    const [address, setAddress] = useState("");
    const [tagsInput, setTagsInput] = useState("");
    const [notes, setNotes] = useState("");
    const [nextAction, setNextAction] = useState("");
    const [nextActionDate, setNextActionDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [duplicateConfirmationKey, setDuplicateConfirmationKey] = useState<
        string | null
    >(null);
    const resetForm = () => {
        setName("");
        setCompany("");
        setValue("");
        setStatus("new");
        setSource("other");
        setEmail("");
        setPhone("");
        setWebsite("");
        setAddress("");
        setTagsInput("");
        setNotes("");
        setNextAction("");
        setNextActionDate("");
        setError(null);
        setDuplicateConfirmationKey(null);
    };
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        if (!name.trim()) {
            setError("Name is required");
            return;
        }
        try {
            setLoading(true);
            const duplicateKey = `${name.trim().toLowerCase()}::${company.trim().toLowerCase()}`;
            const response = await fetch("/api/leads", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    company,
                    allowDuplicate: duplicateConfirmationKey === duplicateKey,
                    value: Number(value) || 0,
                    status,
                    source,
                    email,
                    phone,
                    website,
                    address,
                    tags: tagsInput
                        .split(",")
                        .map(tag => tag.trim())
                        .filter(Boolean),
                    notes,
                    next_action: nextAction,
                    next_action_date: nextActionDate
                })
            });
            const result: {
                duplicateLeadId?: unknown;
                error?: unknown;
            } = await response.json();
            if (
                response.status === 409 &&
                typeof result.duplicateLeadId === "string"
            ) {
                setDuplicateConfirmationKey(duplicateKey);
                setError("A lead with this name and company already exists. Click 'Create anyway' only if adding a separate lead is intentional.");
                return;
            }
            if (!response.ok) {
                throw new Error(
                    typeof result.error === "string"
                        ? result.error
                        : "Could not create lead",
                );
            }
            toast.success(translateText("Lead created"));
            resetForm();
            onCreated();
            onClose();
        }
        catch (error) {
            console.error(error);
            setError(error instanceof Error
                ? error.message
                : ("Something went wrong"));
        }
        finally {
            setLoading(false);
        }
    };
    if (!open) {
        return null;
    }
    return (<div className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/60
        p-4
      ">


      <div className="
          w-full
          max-w-3xl
          max-h-[90vh]
          overflow-y-auto
          rounded-3xl
          border
          border-border-subtle
          bg-surface-1
          p-6
          shadow-2xl
        ">
        <form onSubmit={handleSubmit}>


        <div className="
            flex
            items-center
            justify-between
          ">

          <div>

            <p className="
                text-sm
                text-foreground/60
              ">
              {translateText("Lead-Management")}</p>


            <h2 className="
                text-2xl
                font-semibold
                text-foreground
              ">
              {translateText("Create new lead")}</h2>

          </div>



          <button onClick={() => {
            resetForm();
            onClose();
        }} className="
              rounded-xl
              border
              border-border-subtle
              px-3
              py-2
              text-sm
              text-foreground/70
              transition
              hover:bg-foreground/5
            ">

            {translateText("Close")}</button>


        </div>




        <div className="
            mt-6
            grid
            gap-5
            md:grid-cols-2
          ">



          <div>

            <label className="
                mb-2
                block
                text-sm
                text-foreground/65
              ">
              {translateText("Kontaktname *")}</label>


            <input value={name} onChange={(event) => {
                setName(event.target.value);
                setDuplicateConfirmationKey(null);
                setError(null);
            }} placeholder={translateText("John Smith")} className="
                w-full
                rounded-2xl
                border
                border-border-subtle
                bg-surface-2
                px-4
                py-3
                text-foreground
                outline-none
                transition
                focus:border-cyan-400/50
              "/>

          </div>





          <div>

            <label className="
                mb-2
                block
                text-sm
                text-foreground/65
              ">
              {translateText("Firma *")}</label>


            <input value={company} onChange={(event) => {
                setCompany(event.target.value);
                setDuplicateConfirmationKey(null);
                setError(null);
            }} placeholder={translateText("Firmenname")} className="
                w-full
                rounded-2xl
                border
                border-border-subtle
                bg-surface-2
                px-4
                py-3
                text-foreground
                outline-none
                transition
                focus:border-cyan-400/50
              "/>

          </div>





          <div>

            <label className="
                mb-2
                block
                text-sm
                text-foreground/65
              ">
              {translateText("Deal-Wert (€)")}</label>


            <input value={value} onChange={(event) => setValue(event.target.value)} type="number" placeholder="5000" className="
                w-full
                rounded-2xl
                border
                border-border-subtle
                bg-surface-2
                px-4
                py-3
                text-foreground
                outline-none
                transition
                focus:border-cyan-400/50
              "/>

          </div>




          <div>

            <label className="
                mb-2
                block
                text-sm
                text-foreground/65
              ">
              {translateText("Pipeline-Stufe")}</label>


            <select value={status} onChange={(event) => setStatus(event.target.value as LeadStatus)} className="
                w-full
                rounded-2xl
                border
                border-border-subtle
                bg-surface-2
                px-4
                py-3
                text-foreground
                outline-none
                transition
                focus:border-cyan-400/50
              ">

              <option value="new">
                {translateText("Neu")}</option>

              <option value="contacted">
                {translateText("Kontaktiert")}</option>

              <option value="proposal">
                {translateText("Angebot")}</option>

              <option value="won">
                {translateText("Gewonnen")}</option>

              <option value="lost">
                {translateText("Verloren")}</option>


            </select>


          </div>
                    <div>

            <label className="
                mb-2
                block
                text-sm
                text-foreground/65
              ">
              {translateText("Lead source")}</label>

            <select value={source} onChange={(event) => setSource(event.target.value as LeadSource)} className="
                w-full
                rounded-2xl
                border
                border-border-subtle
                bg-surface-2
                px-4
                py-3
                text-foreground
                outline-none
                transition
                focus:border-cyan-400/50
              ">

              <option value="website">
                {translateText("Website")}</option>

              <option value="recommendation">
                {translateText("Empfehlung")}</option>

              <option value="phone">
                {translateText("Phone")}</option>

              <option value="advertising">
                {translateText("Werbung")}</option>

              <option value="other">
                {translateText("Sonstiges")}</option>

            </select>

          </div>



          <div>

            <label className="
                mb-2
                block
                text-sm
                text-foreground/65
              ">
              {translateText("Email")}</label>


            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder={translateText("customer@example.com")} className="
                w-full
                rounded-2xl
                border
                border-border-subtle
                bg-surface-2
                px-4
                py-3
                text-foreground
                outline-none
                transition
                focus:border-cyan-400/50
              "/>

          </div>




          <div>

            <label className="
                mb-2
                block
                text-sm
                text-foreground/65
              ">
              {translateText("Phone")}</label>


            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+49..." className="
                w-full
                rounded-2xl
                border
                border-border-subtle
                bg-surface-2
                px-4
                py-3
                text-foreground
                outline-none
                transition
                focus:border-cyan-400/50
              "/>

          </div>




          <div>

            <label className="
                mb-2
                block
                text-sm
                text-foreground/65
              ">
              {translateText("Website")}</label>


            <input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder={translateText("https://company.com")} className="
                w-full
                rounded-2xl
                border
                border-border-subtle
                bg-surface-2
                px-4
                py-3
                text-foreground
                outline-none
                transition
                focus:border-cyan-400/50
              "/>

          </div>




          <div>

            <label className="
                mb-2
                block
                text-sm
                text-foreground/65
              ">
              {translateText("Adresse")}</label>


            <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder={translateText("Street, city")} className="
                w-full
                rounded-2xl
                border
                border-border-subtle
                bg-surface-2
                px-4
                py-3
                text-foreground
                outline-none
                transition
                focus:border-cyan-400/50
              "/>

          </div>




          <div>

            <label className="
                mb-2
                block
                text-sm
                text-foreground/65
              ">
              {translateText("Tags")}</label>


            <input value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder={translateText("enterprise, hot-lead")} className="
                w-full
                rounded-2xl
                border
                border-border-subtle
                bg-surface-2
                px-4
                py-3
                text-foreground
                outline-none
                transition
                focus:border-cyan-400/50
              "/>

          </div>




          <div>

            <label className="
                mb-2
                block
                text-sm
                text-foreground/65
              ">
              {translateText("Next action")}</label>


            <input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder={translateText("Customers anrufen")} className="
                w-full
                rounded-2xl
                border
                border-border-subtle
                bg-surface-2
                px-4
                py-3
                text-foreground
                outline-none
                transition
                focus:border-cyan-400/50
              "/>

          </div>




          <div>

            <label className="
                mb-2
                block
                text-sm
                text-foreground/65
              ">
              {translateText("Next action date")}</label>


            <input value={nextActionDate} onChange={(event) => setNextActionDate(event.target.value)} type="date" className="
                w-full
                rounded-2xl
                border
                border-border-subtle
                bg-surface-2
                px-4
                py-3
                text-foreground
                outline-none
                transition
                focus:border-cyan-400/50
              "/>

          </div>


        </div>



        <div className="mt-5">

          <label className="
              mb-2
              block
              text-sm
              text-foreground/65
            ">
            {translateText("Notizen")}</label>


          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={translateText("Add notes about this opportunity...")} className="
              h-32
              w-full
              rounded-2xl
              border
              border-border-subtle
              bg-surface-2
              px-4
              py-3
              text-foreground
              outline-none
              transition
              focus:border-cyan-400/50
            "/>

        </div>
              {error && (<div className="
            mt-4
            rounded-2xl
            border
            border-rose-500/20
            bg-rose-500/10
            px-4
            py-3
            text-sm
            text-rose-200
          ">
          {translateText(error)}
        </div>)}



      <div className="
          mt-6
          flex
          justify-end
          gap-3
        ">

        <button type="button" onClick={() => {
            resetForm();
            onClose();
        }} disabled={loading} className="
            rounded-xl
            border
            border-border-subtle
            px-5
            py-3
            text-sm
            font-semibold
            text-foreground/80
            transition
            hover:bg-foreground/5
            disabled:opacity-50
          ">
          {translateText("Cancel")}</button>



        <button type="submit" disabled={loading} className="
            rounded-xl
            bg-foreground
            px-6
            py-3
            text-sm
            font-semibold
            text-background
            transition
            hover:opacity-90
            disabled:opacity-50
          ">
          {loading
            ? translateText("Erstelle...")
            : duplicateConfirmationKey === `${name.trim().toLowerCase()}::${company.trim().toLowerCase()}`
              ? translateText("Create anyway")
              : translateText("Create lead")}
        </button>


      </div>

    </form>
    


  </div>


    </div>);
}
