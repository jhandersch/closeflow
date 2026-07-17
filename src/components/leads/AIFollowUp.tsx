"use client"

import { useState } from "react"
import { useAppPreferences } from "@/components/AppPreferencesProvider"


export default function AIFollowUp({
  lead,
}:{
  lead:any
}){
const { language } = useAppPreferences()


const [loading,setLoading]=useState(false)
const [mail,setMail]=useState<any>(null)
const [copied, setCopied] = useState(false)



async function generate(){

 setLoading(true)


 const res = await fetch(
  "/api/follow-up-ai",
  {
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      lead,
      language,
    })
  }
 )


 const data = await res.json()

 setMail(data)

  await fetch("/api/activity", {
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      leadId: lead.id,
      action: language === "de" ? "KI hat eine Follow-up-E-Mail erstellt" : "AI generated follow-up email",
      type:"ai"
    })
  })

 setLoading(false)

}

async function copyEmail(){

 if(!mail) return

 await navigator.clipboard.writeText(
 `
${mail.subject}

${mail.email}
 `
 )

 setCopied(true)

 setTimeout(()=>{
  setCopied(false)
 },2000)

}



return (

<div className="
rounded-2xl
border
border-purple-500/20
bg-purple-500/10
p-5
">

<p className="text-xs uppercase text-purple-300">
{language === "de" ? "KI-E-Mail-Assistent" : "AI Email Assistant"}
</p>


<button
onClick={generate}
className="
mt-3
rounded-xl
bg-white
px-4
py-2
text-black
font-semibold
"
>
{
loading
? (language === "de" ? "Wird generiert..." : "Generating...")
: (language === "de" ? "Follow-up-E-Mail generieren" : "Generate Follow-up Email")
}

</button>



{mail && (

<div className="mt-5 space-y-3">


<h3 className="font-bold text-foreground">
{mail.subject}
</h3>


<textarea
readOnly
value={mail.email}
className="
h-48
w-full
rounded-xl
bg-surface-2
p-4
text-foreground
"
/>

<button
  onClick={copyEmail}
  className="
  mt-3
  rounded-xl
  border
  border-cyan-400/30
  bg-cyan-400/10
  px-4
  py-2
  text-cyan-300
  "
  >
  {
  copied
  ? (language === "de" ? "Kopiert" : "Copied")
  : (language === "de" ? "E-Mail kopieren" : "Copy Email")
  }
</button>


</div>

)}


</div>

)

}
