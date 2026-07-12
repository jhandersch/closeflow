"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

export default function SettingsPage() {

  const router = useRouter()

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)


  useEffect(() => {

    const loadUser = async () => {

      const {
        data:{user}
      } = await supabase.auth.getUser()


      if(user){

        setEmail(user.email || "")

        setName(
          user.user_metadata?.name || ""
        )

      }

      setLoading(false)

    }


    loadUser()

  },[])



  async function saveProfile(){

    setSaving(true)


    const {
      error
    } = await supabase.auth.updateUser({

      data:{
        name
      }

    })


    if(error){

      toast.error("Could not save profile")

    } else {

      toast.success("Profile updated")

    }


    setSaving(false)

  }



  async function logout(){

    await supabase.auth.signOut()

    router.push("/login")

  }



  if(loading){

    return (
      <div className="text-white">
        Loading settings...
      </div>
    )

  }



  return (

    <div className="mx-auto max-w-3xl space-y-6">


      <div>

        <h1 className="text-3xl font-bold text-white">
          Settings
        </h1>

        <p className="mt-2 text-zinc-400">
          Manage your CloseFlow account.
        </p>

      </div>




      <div className="rounded-2xl border border-white/10 bg-[#111] p-6">


        <h2 className="text-xl font-semibold text-white">
          Profile
        </h2>



        <div className="mt-5 space-y-4">


          <div>

            <label className="text-sm text-zinc-400">
              Name
            </label>


            <input

              value={name}

              onChange={(e)=>setName(e.target.value)}

              placeholder="Your name"

              className="
              mt-2
              w-full
              rounded-xl
              border
              border-white/10
              bg-black
              px-4
              py-3
              text-white
              outline-none
              focus:border-cyan-400
              "

            />

          </div>



          <div>

            <label className="text-sm text-zinc-400">
              Email
            </label>


            <div className="
            mt-2
            rounded-xl
            border
            border-white/10
            bg-black
            px-4
            py-3
            text-zinc-300
            ">

              {email}

            </div>


          </div>



          <button

          onClick={saveProfile}

          disabled={saving}

          className="
          rounded-xl
          bg-white
          px-5
          py-3
          font-semibold
          text-black
          disabled:opacity-50
          "

          >

          {saving ? "Saving..." : "Save profile"}

          </button>


        </div>


      </div>





      <div className="rounded-2xl border border-white/10 bg-[#111] p-6">


        <h2 className="text-xl font-semibold text-white">
          Security
        </h2>


        <p className="mt-2 text-sm text-zinc-400">
          Password management will be available here.
        </p>


        <button

        className="
        mt-4
        rounded-xl
        border
        border-white/10
        px-5
        py-3
        text-white
        hover:bg-white/5
        "

        >

        Change password

        </button>


      </div>





      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">


        <h2 className="text-xl font-semibold text-red-300">
          Account
        </h2>


        <p className="mt-2 text-sm text-zinc-400">
          Sign out from this workspace.
        </p>


        <button

        onClick={logout}

        className="
        mt-4
        rounded-xl
        bg-red-600
        px-5
        py-3
        font-semibold
        text-white
        "

        >

        Logout

        </button>


      </div>



    </div>

  )

}