type Task = {
  id: string
  title: string
  priority: string
  due_date: string | null
  completed: boolean
}

type TaskBoardProps = {
  tasks: Task[]
}

export default function TaskBoard({ tasks }: TaskBoardProps) {
  const open = tasks.filter((task) => !task.completed)
  const completed = tasks.filter((task) => task.completed)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
        <h2 className="text-lg font-semibold text-foreground">Open tasks</h2>
        <div className="mt-4 space-y-3">
          {open.length === 0 ? (
            <p className="text-sm text-foreground/55">No open tasks.</p>
          ) : (
            open.map((task) => (
              <div key={task.id} className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
                <p className="font-medium text-foreground">{task.title}</p>
                <p className="mt-1 text-xs text-foreground/55">{task.priority} priority</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
        <h2 className="text-lg font-semibold text-foreground">Completed tasks</h2>
        <div className="mt-4 space-y-3">
          {completed.length === 0 ? (
            <p className="text-sm text-foreground/55">No completed tasks.</p>
          ) : (
            completed.map((task) => (
              <div key={task.id} className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
                <p className="font-medium text-foreground">{task.title}</p>
                <p className="mt-1 text-xs text-foreground/55">Done</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
