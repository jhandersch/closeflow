import { getIntlLocale, translateText  } from "@/lib/i18n";
type EngagementCardProps = {
  contactedCount: number;
  proposalCount: number;
  forecastDelta: number;
};

export default function EngagementCard({
  contactedCount,
  proposalCount,
  forecastDelta,
}: EngagementCardProps) {
  const locale = getIntlLocale();

  return (
    <section
      className="
        rounded-2xl
        border
        border-border-subtle
        bg-surface-1
        p-6
      "
    >
      <div>
        <p className="text-sm text-foreground/65">{translateText("Sales Engagement")}</p>

        <h2
          className="
            text-lg
            font-semibold
            text-foreground
          "
        >
          {translateText("Customer momentum")}</h2>
      </div>

      <div className="mt-5 space-y-3">
        <div
          className="
            rounded-xl
            border
            border-orange-500/20
            bg-orange-500/10
            p-4
          "
        >
          <div className="flex items-center gap-3">
            <span
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-full
                bg-orange-500/20
              "
            >
              📞
            </span>

            <div>
              <p className="text-sm text-orange-300">
                {translateText("Follow-up required")}</p>

              <p
                className="
                  mt-1
                  text-xl
                  font-bold
                  text-foreground
                "
              >
                {contactedCount}
              </p>
            </div>
          </div>

          <p
            className="
              mt-3
              text-sm
              text-foreground/70
            "
          >
            {translateText("Leads contacted but waiting for the next sales action.")}</p>
        </div>

        <div
          className="
            rounded-xl
            border
            border-cyan-500/20
            bg-cyan-500/10
            p-4
          "
        >
          <div className="flex items-center gap-3">
            <span
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-full
                bg-cyan-500/20
              "
            >
              📄
            </span>

            <div>
              <p className="text-sm text-cyan-300">
                {translateText("Proposal opportunities")}</p>

              <p
                className="
                  mt-1
                  text-xl
                  font-bold
                  text-foreground
                "
              >
                {proposalCount}
              </p>
            </div>
          </div>

          <p
            className="
              mt-3
              text-sm
              text-foreground/70
            "
          >
            {translateText("Deals currently closest to conversion.")}</p>
        </div>

        <div
          className="
            rounded-xl
            border
            border-emerald-500/20
            bg-emerald-500/10
            p-4
          "
        >
          <div className="flex items-center gap-3">
            <span
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-full
                bg-emerald-500/20
              "
            >
              📈
            </span>

            <div>
              <p className="text-sm text-emerald-300">
                {translateText("Revenue upside")}</p>

              <p
                className="
                  mt-1
                  text-xl
                  font-bold
                  text-foreground
                "
              >
                €{forecastDelta.toLocaleString(locale)}
              </p>
            </div>
          </div>

          <p
            className="
              mt-3
              text-sm
              text-foreground/70
            "
          >
            {translateText("Additional forecasted revenue compared to closed deals.")}</p>
        </div>
      </div>
    </section>
  );
}