"use client"

type Tab =
  | "overview"
  | "activities"
  | "notes"
  | "tasks"
  | "meetings"


type Props = {
  active: Tab
  setActive: (tab: Tab) => void
  isDe: boolean
}


export default function LeadTabs({
  active,
  setActive,
  isDe,
}: Props) {


  const tabs = [
    {
      key: "overview",
      label: isDe ? "Übersicht" : "Overview",
    },
    {
      key: "activities",
      label: isDe ? "Aktivitäten" : "Activities",
    },
    {
      key: "notes",
      label: isDe ? "Notizen" : "Notes",
    },
    {
      key: "tasks",
      label: isDe ? "Aufgaben" : "Tasks",
    },
    {
      key: "meetings",
      label: isDe ? "Termine" : "Meetings",
    },
  ] as const


  return (

    <div
      className="
      flex
      flex-wrap
      gap-2
      rounded-2xl
      border
      border-border-subtle
      bg-surface-1
      p-3
      "
    >

      {
        tabs.map((tab)=> (

          <button
            key={tab.key}
            onClick={()=>setActive(tab.key)}
            className={`
              rounded-xl
              px-3
              py-2
              text-sm
              font-medium
              transition

              ${
                active===tab.key
                ?
                "bg-foreground text-background"
                :
                "bg-surface-2/80 text-foreground/80 hover:bg-foreground/10"
              }

            `}
          >

            {tab.label}

          </button>

        ))
      }

    </div>

  )
}