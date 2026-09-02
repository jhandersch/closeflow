"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { useLeadsData } from "@/hooks/useLeadsData"
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabase/client"


type CustomerFilter = "all" | "active" | "lost" | "vip"
type CustomerTypeFilter = "all" | "companies" | "private"

type CustomerSummary = {
  id: string
  company: string
  isPrivate?: boolean
  contacts: string[]
  totalRevenue: number
  deals: number
  wonDeals: number
  lostDeals: number
  lastContactAt: string | null
  isVip?: boolean
}

type ImportIssue = {
  row: number
  reason: string
  company: string
  contact: string
}

const escapeCsv = (value: unknown) => {
  const text = String(value ?? "")

  if (
    text.includes(";") ||
    text.includes(",") ||
    text.includes("\n") ||
    text.includes("\r") ||
    text.includes('"')
  ) {
    return `"${text.replaceAll('"', '""')}"`
  }

  return text
}

export default function CustomersPage() {
  const { leads, loading, error, refresh } = useLeadsData({
    activityLimit: 0,
    includeCompleted: true,
  })

  const { language, t } = useAppPreferences()

  const locale = language === "de" ? "de-DE" : "en-US"

  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  })

  const [filter, setFilter] = useState<CustomerFilter>("all")
  const [customerType, setCustomerType] =
    useState<CustomerTypeFilter>("all")
  const [query, setQuery] = useState("")
  const [importingCsv, setImportingCsv] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importIssues, setImportIssues] = useState<ImportIssue[]>([])
  const [deletingCustomer, setDeletingCustomer] = useState<string | null>(null)
  const importMessageTimeoutRef = useRef<number | null>(null)
  const [deletedCustomers, setDeletedCustomers] = useState<Set<string>>(
  () => new Set()
)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
  return () => {
    if (importMessageTimeoutRef.current) {
      window.clearTimeout(
        importMessageTimeoutRef.current
      )
    }
  }
}, [])

  const customers = useMemo(() => {
    const byCustomer = new Map<string, CustomerSummary>()

    for (const lead of leads) {
      if (lead.status !== "won" && lead.status !== "lost") {
        continue
      }

      const company = (lead.company || "").trim()
      const isPrivate = !company
      const key = isPrivate
        ? `private:${lead.id}`
        : company.toLowerCase()

      const existing = byCustomer.get(key)

      const lastActivity =
        lead.last_activity_at ||
        lead.updated_at ||
        lead.created_at ||
        null

      if (!existing) {
        byCustomer.set(key, {
          id: key,
          company: isPrivate ? lead.name : company,
          isPrivate,
          contacts: lead.name ? [lead.name] : [],
          totalRevenue:
            lead.status === "won"
              ? lead.value || 0
              : 0,
          deals: 1,
          wonDeals:
            lead.status === "won"
              ? 1
              : 0,
          lostDeals:
            lead.status === "lost"
              ? 1
              : 0,
          lastContactAt: lastActivity,
          isVip: lead.is_vip === true,
        })

        continue
      }

      if (lead.name && !existing.contacts.includes(lead.name)) {
        existing.contacts.push(lead.name)
      }

      existing.deals += 1
      existing.wonDeals += lead.status === "won" ? 1 : 0
      existing.lostDeals += lead.status === "lost" ? 1 : 0
      if (lead.is_vip === true) {
        existing.isVip = true
      }
      existing.totalRevenue +=
        lead.status === "won" ? lead.value || 0 : 0

      if (
        lastActivity &&
        (!existing.lastContactAt ||
          new Date(lastActivity) > new Date(existing.lastContactAt))
      ) {
        existing.lastContactAt = lastActivity
      }
    }

    return Array.from(byCustomer.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    )
  }, [leads])

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return customers
      .filter((customer) => {
        if (deletedCustomers.has(customer.id)) {
          return false
        }

        if (
          customerType === "companies" &&
          customer.isPrivate
        ) {
          return false
        }

        if (
          customerType === "private" &&
          !customer.isPrivate
        ) {
          return false
        }

        const matchesQuery =
          !normalizedQuery ||
          customer.company.toLowerCase().includes(normalizedQuery)

        if (!matchesQuery) return false

        if (filter === "active") {
          return customer.wonDeals > 0
        }

        if (filter === "lost") {
          return customer.wonDeals === 0 && customer.lostDeals > 0
        }

        if (filter === "vip") {
          return customer.isVip
        }

        return true
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [
    customers,
    customerType,
    filter,
    query,
    deletedCustomers,
  ])


  const getAuthHeaders = async (includeJson = false) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const headers: Record<string, string> = {}

    if (includeJson) {
      headers["Content-Type"] = "application/json"
    }

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }

    return headers
  }

  const deleteCustomer = async (customer: CustomerSummary) => {
    if (deletingCustomer) return

    const confirmed = window.confirm(
      language === "de"
        ? `Möchtest du den Kunden "${customer.company}" wirklich löschen?`
        : `Are you sure you want to delete "${customer.company}"?`
    )

    if (!confirmed) return

    setDeletingCustomer(customer.id)

    try {
      const headers = await getAuthHeaders()

      const customerLeads = leads.filter(
        (lead) =>
          customer.isPrivate
            ? customer.id === `private:${lead.id}`
            : (lead.company || "").trim().toLowerCase() === customer.id
      )

      await Promise.all(
        customerLeads.map(async (lead) => {
          const response = await fetch(
            `/api/leads?id=${encodeURIComponent(lead.id)}`,
            {
              method: "DELETE",
              headers,
            }
          )

          if (!response.ok) {
            const data = await response.json().catch(() => null)

            throw new Error(
              data?.error ||
                (language === "de"
                  ? "Kunde konnte nicht gelöscht werden."
                  : "Customer could not be deleted.")
            )
          }
        })
      )

      // Sofort aus der UI entfernen – kein globaler Loading-State
      setDeletedCustomers((current) => {
        const next = new Set(current)
        next.add(customer.id)
        return next
      })
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : language === "de"
            ? "Löschen fehlgeschlagen."
            : "Delete failed."
      )
    } finally {
      setDeletingCustomer(null)
    }
  }

  const downloadExport = async (format: "csv" | "xlsx") => {
    const response = await fetch(
      `/api/customers/export?format=${format}`,
      {
        headers: await getAuthHeaders(),
      }
    )

    if (!response.ok) {
      setImportMessage(null)

      setImportError(
        t("customers.exportFailed", "Export failed.") +
          ` (${format.toUpperCase()})`
      )

      return
    }

    const buffer = await response.arrayBuffer()

    const blob = new Blob([buffer], {
      type:
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv;charset=utf-8;",
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = `closeflow-customers-${new Date()
      .toISOString()
      .slice(0, 10)}.${format}`

    link.click()

    URL.revokeObjectURL(url)
  }

  const importCsv = async (file: File) => {
    setImportingCsv(true)
    setImportMessage(null)
    setImportError(null)
    setImportIssues([])

    try {
      const lowerName = file.name.toLowerCase()

      const csvText =
        lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")
          ? (() => {
              const parseWorkbook = async () => {
                const workbook = XLSX.read(
                  await file.arrayBuffer(),
                  { type: "array" }
                )

                const firstSheet = workbook.SheetNames[0]

                if (!firstSheet) {
                  throw new Error(
                    t(
                      "customers.importWorkbookNoSheets",
                      "Import failed: workbook has no sheets."
                    )
                  )
                }

                return XLSX.utils.sheet_to_csv(
                  workbook.Sheets[firstSheet]
                )
              }

              return parseWorkbook()
            })()
          : file.text()

      const resolvedCsvText = await csvText

      const response = await fetch("/api/customers/import", {
        method: "POST",
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          csv: resolvedCsvText,
        }),
      })

      if (!response.ok) {
        const text = await response.text()

        setImportError(
          text ||
            t(
              "customers.importFailed",
              "Import failed."
            )
        )

        return
      }

      const data = (await response.json()) as {
        inserted?: number
        skipped?: number
        issues?: ImportIssue[]
      }

      const issues = Array.isArray(data.issues)
        ? data.issues
        : []

      setImportIssues(issues)

      const inserted = data.inserted || 0
      const skipped = data.skipped || 0

      const summary =
        `${t("customers.importDoneStart", "Import done. Added")} ` +
        `${inserted} ` +
        `${t("customers.importDoneMiddle", "customers, skipped")} ` +
        `${skipped}`

      
        const message =
          issues.length
            ? `${summary}. ${issues.length} ${t(
                "customers.importDoneIssuesSuffix",
                "issue(s) available in report."
              )}`
            : `${summary}.`

        setImportError(null)
        setImportMessage(message)

        if (importMessageTimeoutRef.current) {
          window.clearTimeout(
            importMessageTimeoutRef.current
          )
        }

        importMessageTimeoutRef.current =
          window.setTimeout(() => {
            setImportMessage(null)
            importMessageTimeoutRef.current = null
          }, 4000)

        await refresh()



      
    } catch (importError) {
      setImportError(
        importError instanceof Error
          ? importError.message
          : t(
              "customers.importFailed",
              "Import failed."
            )
      )
    } finally {
      setImportingCsv(false)
    }
  }

const downloadImportIssuesReport = () => {
  if (!importIssues.length) return

  const headers = [
    "Row",
    "Company",
    "Contact",
    "Reason",
    "Status",
  ]

  const rows = importIssues.map((issue) => [
    issue.row,
    issue.company,
    issue.contact,
    issue.reason,
    "Skipped",
  ])

  const csv = [
    headers.join(";"),
    ...rows.map((row) =>
      row
        .map(escapeCsv)
        .join(";")
    ),
  ].join("\r\n")

  const blob = new Blob(
    ["\uFEFF", csv],
    {
      type: "text/csv;charset=utf-8;",
    }
  )

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download =
    `closeflow-customers-import-issues-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`

  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}





  return (
    
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">
            {t("customers.header", "Kunden")}
          </p>

          <h1 className="mt-2 text-3xl font-bold text-foreground">
            {t("customers.title", "Kundenverwaltung")}
          </h1>

          <p className="mt-2 text-sm text-foreground/65">
            {t(
              "customers.subtitle",
              "Verwalte aktive Kunden, Abwanderungsrisiken und wichtige VIP-Kunden."
            )}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto_auto_auto]">
          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder={t(
              "customers.searchPlaceholder",
              "Kunden suchen..."
            )}
            className="w-full rounded-xl border border-border-subtle bg-surface-1 px-4 py-2 text-sm text-foreground outline-none"
          />

          <button
            onClick={() => {
              setFilter("all")
              setCustomerType("all")
            }}
            className={`rounded-xl border px-4 py-2 text-sm ${
              filter === "all" && customerType === "all"
                ? "border-foreground bg-foreground text-background"
                : "border-border-subtle text-foreground/80"
            }`}
          >
            {t("customers.filterAll", "All")}
          </button>

          <button
            onClick={() =>
              setFilter((current) =>
                current === "active" ? "all" : "active"
              )
            }
            className={`rounded-xl border px-4 py-2 text-sm ${
              filter === "active"
                ? "border-foreground bg-foreground text-background"
                : "border-border-subtle text-foreground/80"
            }`}
          >
            {t(
              "customers.filterActive",
              "Active Customers"
            )}
          </button>

          <button
            onClick={() =>
              setFilter((current) =>
                current === "lost" ? "all" : "lost"
              )
            }
            className={`rounded-xl border px-4 py-2 text-sm ${
              filter === "lost"
                ? "border-foreground bg-foreground text-background"
                : "border-border-subtle text-foreground/80"
            }`}
          >
            {t(
              "customers.filterLost",
              "Lost Customers"
            )}
          </button>

          <button
            onClick={() =>
              setFilter((current) =>
                current === "vip" ? "all" : "vip"
              )
            }
            className={`rounded-xl border px-4 py-2 text-sm ${
              filter === "vip"
                ? "border-foreground bg-foreground text-background"
                : "border-border-subtle text-foreground/80"
            }`}
          >
            VIP
          </button>

          <button
            onClick={() =>
              setCustomerType((current) =>
                current === "companies" ? "all" : "companies"
              )
            }
            className={`rounded-xl border px-4 py-2 text-sm ${
              customerType === "companies"
                ? "border-foreground bg-foreground text-background"
                : "border-border-subtle text-foreground/80"
            }`}
          >
            Companies
          </button>

          <button
            onClick={() =>
              setCustomerType((current) =>
                current === "private" ? "all" : "private"
              )
            }
            className={`rounded-xl border px-4 py-2 text-sm ${
              customerType === "private"
                ? "border-foreground bg-foreground text-background"
                : "border-border-subtle text-foreground/80"
            }`}
          >
            Private Customers
          </button>

          <button
            onClick={() => {
              setFilter("all")
              setCustomerType("all")
              setQuery("")
            }}
            className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-foreground/80 hover:bg-foreground/5"
          >
            Reset filters
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void downloadExport("csv")}
            className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-2 text-sm text-foreground/80 hover:bg-foreground/5"
          >
            {t(
              "customers.exportCsv",
              "Export CSV"
            )}
          </button>

          <button
            onClick={() => void downloadExport("xlsx")}
            className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-2 text-sm text-foreground/80 hover:bg-foreground/5"
          >
            {t(
              "customers.exportExcel",
              "Export Excel"
            )}
          </button>

          <button
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={importingCsv}
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 disabled:opacity-60"
          >
            {importingCsv
              ? t(
                  "customers.importing",
                  "Import läuft..."
                )
              : t(
                  "customers.importFile",
                  "Datei importieren"
                )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(event) => {
              const file =
                event.target.files?.[0]

              if (file) {
                void importCsv(file)
              }

              event.currentTarget.value = ""
            }}
          />

          {importIssues.length ? (
            <button
              onClick={
                downloadImportIssuesReport
              }
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200"
            >
              {t(
                "customers.downloadImportIssues",
                "Download Import Issues"
              )}
            </button>
          ) : null}

          {importMessage ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
              {importMessage}
            </div>
          ) : null}

          {importError ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
              {importError}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            {t(
              "customers.loadErrorPrefix",
              "Could not load customers:"
            )}{" "}
            {error}
          </div>
        ) : null}

        {loading && customers.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 text-foreground">
            {t(
              "customers.loading",
              "Lädt..."
            )}
          </div>
        ) : filteredCustomers.length === 0 ? (
          customers.length === 0 ? (
            <div className="rounded-2xl border border-border-subtle bg-surface-1 p-10 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                +
              </div>

              <h3 className="mt-4 text-xl font-semibold text-foreground">
                {t(
                  "customers.noCustomersYet",
                  "No customers yet"
                )}
              </h3>

              <p className="mt-2 text-sm text-foreground/65">
                {t(
                  "customers.noCustomersYetDescription",
                  "Customers will appear here once your deals are completed."
                )}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border-subtle bg-surface-1 p-10 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                ×
              </div>

              <h3 className="mt-4 text-xl font-semibold text-foreground">
                {t(
                  "customers.noResults",
                  "No customers found"
                )}
              </h3>

              <p className="mt-2 text-sm text-foreground/65">
                {t(
                  "customers.noResultsDescription",
                  "No customers match your current search or filter."
                )}
              </p>

              <button
                onClick={() => {
                  setQuery("")
                  setFilter("all")
                }}
                className="mt-5 rounded-xl border border-border-subtle bg-surface-2 px-5 py-2 font-medium text-foreground/80 transition hover:bg-foreground/5"
              >
                {t(
                  "customers.clearFilters",
                  "Clear filters"
                )}
              </button>
            </div>
          )
        ) : (
          <div className="space-y-6">
            {(["Companies", "Private Customers"] as const).map((section) => {
              const sectionCustomers = filteredCustomers.filter(
                (customer) =>
                  section === "Private Customers"
                    ? customer.isPrivate
                    : !customer.isPrivate
              )

              if (!sectionCustomers.length) return null

              return (
                <section key={section} className="space-y-3">
                  <h2 className="text-xl font-semibold text-foreground">
                    {section}
                  </h2>

                  {sectionCustomers.map((customer) => (
              <div
                key={customer.id}
                className="rounded-2xl border border-border-subtle bg-surface-1 p-5 transition hover:border-cyan-400/30"
              >
                <div className="flex items-center justify-between gap-4">
                  <Link
                    href={`/customers/${encodeURIComponent(
                      customer.id
                    )}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">
                          {customer.company}
                        </h2>

                        {customer.isVip ? (
                          <span className="mt-2 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                            ★ VIP
                          </span>
                        ) : null}

                        <p className="mt-1 text-sm text-foreground/65">
                          {t(
                            "customers.contacts",
                            "Contacts"
                          )}
                          :{" "}
                          {customer.contacts.join(
                            ", "
                          ) ||
                            t(
                              "customers.na",
                              "n/a"
                            )}
                        </p>
                      </div>

                      <div className="grid gap-3 text-sm md:grid-cols-3">
                        <div>
                          <p className="text-foreground/55">
                            {t(
                              "customers.revenue",
                              "Revenue"
                            )}
                          </p>

                          <p className="font-semibold text-emerald-300">
                            {currencyFormatter.format(
                              customer.totalRevenue
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-foreground/55">
                            {t(
                              "customers.deals",
                              "Deals"
                            )}
                          </p>

                          <p className="font-semibold text-foreground">
                            {customer.deals}
                          </p>
                        </div>

                        <div>
                          <p className="text-foreground/55">
                            {t(
                              "customers.lastContact",
                              "Last Contact"
                            )}
                          </p>

                          <p className="font-semibold text-foreground">
                            {customer.lastContactAt
                              ? new Date(
                                  customer.lastContactAt
                                ).toLocaleDateString(
                                  locale
                                )
                              : t(
                                  "customers.na",
                                  "n/a"
                                )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      void deleteCustomer(
                        customer
                      )
                    }
                    disabled={
                      deletingCustomer ===
                      customer.id
                    }
                    className="shrink-0 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingCustomer ===
                    customer.id
                      ? t(
                          "customers.deleting",
                          "Deleting..."
                        )
                      : t(
                          "customers.delete",
                          "Delete"
                        )}
                  </button>
                </div>
              </div>
                  ))}
                </section>
              )
            })}
          </div>
        )}
      </div>
  )
}
