export function translateActivity(action: string) {
    const map: Record<string, string> = {
        "Lead created": "Lead erstellt",
        "Task completed": "Task abgeschlossen",
    };
    return translateText(map[action] ?? action);
}
import { translateText } from "@/lib/i18n";

