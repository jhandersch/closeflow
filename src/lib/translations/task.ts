import type { TaskPriority } from "@/types"


export function translatePriority(
  priority: TaskPriority | null | undefined,
  isDe: boolean
) {
  const value = priority || "medium"


  if (!isDe) {
    return value.charAt(0).toUpperCase() + value.slice(1)
  }


  switch (value.toLowerCase()) {
    case "high":
      return "Hoch"

    case "medium":
      return "Mittel"

    case "low":
      return "Niedrig"

    default:
      return value
  }
}



export function translateTaskStatus(
  completed: boolean,
  isDe: boolean
) {

  return completed
    ? (isDe ? "erledigt" : "Done")
    : (isDe ? "offen" : "Open")

}