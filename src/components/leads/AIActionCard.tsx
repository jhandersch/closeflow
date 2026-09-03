"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
type Props = {
    leadId: string;
    action: string;
    description: string;
};
export default function AIActionCard({ leadId, action, description, }: Props) {
    const [done, setDone] = useState(false);
    const [loading, setLoading] = useState(false);
    const completeAction = async () => {
        setLoading(true);
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) {
            setLoading(false);
            return;
        }
        await supabase
            .from("leads")
            .update({
            next_action_completed: true,
        })
            .eq("id", leadId);
        await supabase
            .from("activities")
            .insert([
            {
                lead_id: leadId,
                user_id: user.id,
                action: `AI action completed: ${action}`,
                type: "ai",
            },
        ]);
        setDone(true);
        setLoading(false);
    };
    return (<div className="
      rounded-2xl
      border
      border-cyan-500/20
      bg-gradient-to-br
      from-cyan-500/10
      to-transparent
      p-5
      ">

      <p className="text-xs uppercase tracking-widest text-cyan-400">
        AI Recommended Action
      </p>


      <h3 className="mt-2 text-xl font-bold text-foreground">
        {action}
      </h3>


      <p className="mt-2 text-sm text-foreground/65">
        {description}
      </p>


      <button disabled={loading || done} onClick={completeAction} className="
        mt-4
        rounded-xl
        bg-white
        px-4
        py-2
        text-sm
        font-semibold
        text-black
        disabled:opacity-50
        ">
        {loading
            ? "Saving..."
            : done
                ? "Completed"
                : "Mark completed"}

      </button>


    </div>);
}
