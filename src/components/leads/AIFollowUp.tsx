"use client"

import { useState } from "react"


export default function AIFollowUp({
  lead,
}:{
  lead:any
}){


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
      lead
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
      action:"AI generated follow-up email",
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
AI Email Assistant
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
? "Generating..."
: "✉ Generate Follow-up Email"
}

</button>



{mail && (

<div className="mt-5 space-y-3">


<h3 className="font-bold text-white">
{mail.subject}
</h3>


<textarea
readOnly
value={mail.email}
className="
h-48
w-full
rounded-xl
bg-black
p-4
text-white
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
  ? "✓ Copied"
  : "Copy Email"
  }
</button>


</div>

)}


</div>

)

}