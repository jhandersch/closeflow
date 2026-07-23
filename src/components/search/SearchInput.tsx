"use client"

import { Search as SearchIcon, X } from "lucide-react"
import { useEffect, useRef } from "react"


type SearchInputProps = {
  value: string
  onChange: (value:string)=>void
  onClose: ()=>void
  onEnter: ()=>void
  onArrowDown?: ()=>void
  onArrowUp?: ()=>void
}


export default function SearchInput({
  value,
  onChange,
  onClose,
  onEnter,
  onArrowDown,
  onArrowUp,
}: SearchInputProps) {


  const inputRef = useRef<HTMLInputElement>(null)


  useEffect(()=>{

    inputRef.current?.focus()

  },[])



  const handleKeyDown = (
    event:React.KeyboardEvent<HTMLInputElement>
  )=>{


    if(event.key === "Escape"){

      event.preventDefault()
      onClose()

    }


    if(event.key === "Enter"){

      event.preventDefault()
      onEnter()

    }


    if(event.key === "ArrowDown"){

      event.preventDefault()
      onArrowDown?.()

    }


    if(event.key === "ArrowUp"){

      event.preventDefault()
      onArrowUp?.()

    }

  }



  return (

    <div
      className="
        flex
        items-center
        gap-3
        rounded-2xl
        border
        border-border-subtle
        bg-surface-2
        px-4
        py-3
      "
    >

      <SearchIcon
        size={18}
        className="text-cyan-400"
      />


      <input

        ref={inputRef}

        value={value}

        onChange={(e)=>
          onChange(e.target.value)
        }

        onKeyDown={handleKeyDown}

        placeholder="
          Leads, Kunden, Aufgaben oder Seiten suchen...
        "

        className="
          flex-1
          bg-transparent
          text-sm
          text-foreground
          outline-none
          placeholder:text-foreground/40
        "

      />


      <button

        onClick={onClose}

        className="
          rounded-lg
          p-1
          text-foreground/40
          transition
          hover:bg-foreground/10
          hover:text-foreground
        "

      >

        <X size={16}/>

      </button>


    </div>

  )
}