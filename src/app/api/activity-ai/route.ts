import { NextResponse } from "next/server"
import OpenAI from "openai"


const openai = new OpenAI({
  apiKey:process.env.OPENAI_API_KEY,
})


export async function POST(req:Request){

try{

const {
  lead,
  activities
}=await req.json()



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

`



const completion =
await openai.chat.completions.create({

model:"gpt-4.1-mini",

messages:[
{
role:"system",
content:
"You are an expert sales operations AI."
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


return NextResponse.json(
{
health:"unknown",
risk:"unknown",
summary:"AI failed",
recommendation:"Review manually",
confidence:0
},
{
status:500
}
)

}


}