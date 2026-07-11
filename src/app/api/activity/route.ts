import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"


export async function POST(
 request:NextRequest
){

try{


const {
 leadId,
 action,
 type
}=await request.json()


const {
 data:userData
}=await supabase.auth.getUser()


const user=userData.user


if(!user){
 return NextResponse.json(
  {error:"No user"},
  {status:401}
 )
}


const {error}=await supabase
.from("activities")
.insert([
{
 lead_id:leadId,
 user_id:user.id,
 action,
 type
}
])


if(error)
 throw error


return NextResponse.json({
 success:true
})


}
catch(error){

return NextResponse.json(
{
error:"Activity failed"
},
{
status:500
}
)

}


}