type KpiCardProps = {
    label: string;
    value: string;
    hint?: string;
    accent?: "amber" | "emerald" | "cyan" | "purple" | "blue" | "red";
};
const accentColors = {
    cyan: "text-cyan-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    purple: "text-purple-300",
    blue: "text-blue-300",
    red: "text-red-300",
};
const accentGlow = {
    cyan: "bg-cyan-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    purple: "bg-purple-500",
    blue: "bg-blue-500",
    red: "bg-red-500",
};
export default function KpiCard({ label, value, hint, accent = "cyan", }: KpiCardProps) {
    return (<div className="cf-card cf-enter p-5">

      <div className="flex items-center gap-2">

        <span className={`
            h-2
            w-2
            rounded-full
            ${accentGlow[accent]}
          `}/>

        <p className="cf-label">
          {label}
        </p>

      </div>


      <p className="
        cf-kpi
        mt-3
        text-3xl
        font-semibold
        text-foreground
      ">
        {value}
      </p>


      {hint && (<p className={`
            mt-2
            text-sm
            ${accentColors[accent]}
          `}>
          {hint}
        </p>)}

    </div>);
}
