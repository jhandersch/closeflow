import { getIntlLocale, translateText  } from "@/lib/i18n";
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
    {translateText("Contact")}
    </h2>


    <div className="mt-3 space-y-2 text-sm text-foreground/80">

    <p>
{translateText("Name:")}{" "}
    {lead.name}
    </p>

    <p>
{translateText("Email:")}{" "}
    {lead.email || "—"}
    </p>


    <p>
{translateText("Phone:")}{" "}
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
    {translateText("Lead")}
    </h2>


    <div className="mt-3 space-y-2 text-sm">

    <p>
{translateText("Value:")}{" "}
{translateText("EUR")}{(lead.value ?? 0).toLocaleString(getIntlLocale())}
    </p>


    <p>
{translateText("Status:")}{" "}
    {translateText(lead.status)}
    </p>


    </div>


    </section>


    </div>);
}
