import type { Lead } from "@/types";
type Props = {
    lead: Lead;
};
export default function LeadOverview({ lead }: Props) {
    return (<div className="
grid
gap-6
xl:grid-cols-2
">


    <section className="
rounded-xl
border
border-border-subtle
bg-surface-1
p-5
">

    <h2 className="text-lg font-semibold">
    {"Contact"}
    </h2>


    <div className="mt-3 space-y-2 text-sm text-foreground/80">

    <p>
Name:
    {" "}
    {lead.name}
    </p>

    <p>
Email:
    {" "}
    {lead.email || "—"}
    </p>


    <p>
Phone:
    {" "}
    {lead.phone || "—"}
    </p>


    </div>


    </section>



    <section className="
rounded-xl
border
border-border-subtle
bg-surface-1
p-5
">


    <h2 className="text-lg font-semibold">
    {"Deal"}
    </h2>


    <div className="mt-3 space-y-2 text-sm">

    <p>
Value:
    {" "}
EUR {(lead.value ?? 0).toLocaleString()}
    </p>


    <p>
Status:
    {" "}
    {lead.status}
    </p>


    </div>


    </section>


    </div>);
}
