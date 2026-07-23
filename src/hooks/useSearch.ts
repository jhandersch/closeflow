"use client"

import { useEffect, useMemo, useState } from "react"

export function useSearch<T>(
  items: T[],
  search: string,
  matcher: (item: T) => string[]
) {
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 250)

    return () => clearTimeout(timer)
  }, [search])

  const results = useMemo(() => {
    const value = debouncedSearch.trim().toLowerCase()

    if (!value) return items

    return items.filter((item) =>
      matcher(item).some((field) =>
        field.toLowerCase().includes(value)
      )
    )
  }, [items, debouncedSearch, matcher])

  return {
    query: debouncedSearch,
    results,
  }
}