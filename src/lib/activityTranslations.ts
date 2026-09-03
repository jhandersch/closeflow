export function translateActivity(action: string) {
    const map: Record<string, string> = {
        "Lead created": "Lead erstellt",
        "Task completed": "Task abgeschlossen",
    };
    return map[action] ?? action;
}
