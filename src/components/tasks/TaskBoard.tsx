"use client"

import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { translatePriority, translateTaskStatus } from "@/lib/translations/task"
import type { Task } from "@/types"

type TaskBoardProps = {
  tasks: Task[]
  onToggleTask: (task: Task) => Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
  locale: string
  isDe: boolean
}

export default function TaskBoard({ tasks, onToggleTask, onDeleteTask, locale, isDe }: TaskBoardProps) {

  const { language } = useAppPreferences()
  const resolvedIsDe = isDe || language === "de"

  const open = tasks.filter((task) => !task.completed)
  const completed = tasks.filter((task) => task.completed)

  return (
    <div className="grid gap-4 md:grid-cols-2">

      <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5">

        <h2 className="text-lg font-semibold text-foreground">
          {resolvedIsDe ? "Offene Aufgaben" : "Open tasks"}
        </h2>

        <div className="mt-4 space-y-3">

          {open.length === 0 ? (

            <p className="text-sm text-foreground/55">
              {resolvedIsDe ? "Keine offenen Aufgaben." : "No open tasks."}
            </p>

          ) : (

            open.map((task) => (

              <div
                key={task.id}
                className="rounded-xl border border-border-subtle bg-surface-2/70 p-4"
              >

                <p className="font-medium text-foreground">
                  {task.title}
                </p>

                <p className="mt-1 text-xs text-foreground/55">
                  {translatePriority(task.priority as any, resolvedIsDe)}{" "}
                  {resolvedIsDe ? "Prioritaet" : "priority"}
                </p>

                <p className="mt-1 text-xs text-foreground/55">
                  {task.due_date
                    ? `${resolvedIsDe ? "Faellig" : "Due"}: ${new Date(task.due_date).toLocaleDateString(locale)}`
                    : resolvedIsDe
                      ? "Kein Faelligkeitsdatum"
                      : "No due date"}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleTask(task)}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300"
                  >
                    {resolvedIsDe ? "Erledigen" : "Complete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300"
                  >
                    {resolvedIsDe ? "Loeschen" : "Delete"}
                  </button>
                </div>

              </div>

            ))

          )}

        </div>

      </section>


      <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5">

        <h2 className="text-lg font-semibold text-foreground">
          {resolvedIsDe ? "Erledigte Aufgaben" : "Completed tasks"}
        </h2>


        <div className="mt-4 space-y-3">

          {completed.length === 0 ? (

            <p className="text-sm text-foreground/55">
              {resolvedIsDe ? "Keine erledigten Aufgaben." : "No completed tasks."}
            </p>

          ) : (

            completed.map((task) => (

              <div
                key={task.id}
                className="rounded-xl border border-border-subtle bg-surface-2/70 p-4"
              >

                <p className="font-medium text-foreground">
                  {task.title}
                </p>

                <p className="mt-1 text-xs text-foreground/55">
                  {translateTaskStatus(true, resolvedIsDe)}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleTask(task)}
                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300"
                  >
                    {resolvedIsDe ? "Wieder oeffnen" : "Reopen"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300"
                  >
                    {resolvedIsDe ? "Loeschen" : "Delete"}
                  </button>
                </div>

              </div>

            ))

          )}

        </div>

      </section>

    </div>
  )
}