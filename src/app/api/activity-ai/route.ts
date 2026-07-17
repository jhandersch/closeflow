import { NextResponse } from "next/server"
import OpenAI from "openai"

const fallbackResponse = (locale: "de" | "en") => ({
  health: locale === "de" ? "unbekannt" : "unknown",
  risk: locale === "de" ? "unbekannt" : "unknown",
  summary: locale === "de" ? "KI-Analyse fehlgeschlagen" : "AI failed",
  recommendation: locale === "de" ? "Manuell prüfen" : "Review manually",
  confidence: 0,
})


export async function POST(req:Request){

let locale: "de" | "en" = "de"

try{

const {
  lead,
  activities,
  language,
}=await req.json()

locale = language === "en" ? "en" : "de"

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
return NextResponse.json(fallbackResponse(locale))
}



const history =
activities
.map(
(a:any)=>
`${a.created_at}: ${a.action}`
)
.join("\n")



const prompt=`

You are an AI sales analyst.

Analyze CRM activity.

Lead:

Name:
${lead.name}

Company:
${lead.company}

Stage:
${lead.status}

Value:
€${lead.value}


Activities:

${history || "No activity"}


Return JSON only:

{
"health":"string",
"risk":"string",
"summary":"string",
"recommendation":"string",
"confidence":0.0
}


Analyze:

- inactivity
- momentum
- pipeline movement
- customer engagement
- sales risk
- next action
- Write all text values in ${locale === "de" ? "German" : "English"}

`


const openai = new OpenAI({ apiKey })


const completion =
await openai.chat.completions.create({

model:"gpt-4.1-mini",

messages:[
{
role:"system",
content:
`You are an expert sales operations AI. Return valid JSON only and write all text values in ${locale === "de" ? "German" : "English"}.`
},
{
role:"user",
content:prompt
}
],

response_format:{
type:"json_object"
}

})


const result =
JSON.parse(
completion.choices[0]
.message
.content || "{}"
)


return NextResponse.json(result)


}
catch(error){

console.error(error)

const openAiLikeError = error as { status?: number; code?: string; type?: string } | undefined
const recoverable =
openAiLikeError?.status === 429 ||
openAiLikeError?.status === 401 ||
openAiLikeError?.code === "insufficient_quota" ||
openAiLikeError?.type === "insufficient_quota" ||
openAiLikeError?.code === "rate_limit_exceeded"

if (recoverable) {
return NextResponse.json(fallbackResponse(locale))
}


return NextResponse.json(
fallbackResponse(locale),
{
status:500
}
)

}


}