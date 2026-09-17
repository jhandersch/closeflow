"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useLeadsData } from "@/hooks/useLeadsData";
import { supabase } from "@/lib/supabase/client";

const DEFAULT_TIMEZONE = "Europe/Berlin";

type CustomerActivity = {
    id: string;
    type: string | null;
    title: string | null;
    description: string | null;
    action: string | null;
    created_at: string | null;
};

const formatActivityDate = (
    value: string,
    timeZone: string,
) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone,
    }).format(date);
};

export default function CustomerDetailPage() {
    const locale = "en-US";
    const params = useParams();
    const router = useRouter();

    const [timezone, setTimezone] =
        useState(DEFAULT_TIMEZONE);

    const id =
        typeof params?.id === "string"
            ? decodeURIComponent(params.id)
            : "";

    const isPrivateCustomer =
        id.startsWith("private:");

    const {
        leads,
        loading,
        error,
    } = useLeadsData({
        activityLimit: 25,
        includeCompleted: true,
    });

    const [editedCustomer, setEditedCustomer] =
        useState<{
            company: string;
            website?: string;
            address?: string;
            industry?: string;
            isVip?: boolean;
        } | null>(null);

    const [editing, setEditing] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [deleting, setDeleting] =
        useState(false);

    const [editError, setEditError] =
        useState<string | null>(null);

    const [customerActivities, setCustomerActivities] =
        useState<CustomerActivity[]>([]);

    const [activitiesLoading, setActivitiesLoading] =
        useState(false);

    const [editCompany, setEditCompany] =
        useState("");

    const [editWebsite, setEditWebsite] =
        useState("");

    const [editAddress, setEditAddress] =
        useState("");

    const [editIndustry, setEditIndustry] =
        useState("");

    const [editIsVip, setEditIsVip] =
        useState(false);

    useEffect(() => {
        const loadTimezone = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                return;
            }

            const savedTimezone =
                typeof user.user_metadata?.timezone ===
                    "string" &&
                user.user_metadata.timezone.trim()
                    ? user.user_metadata.timezone
                    : DEFAULT_TIMEZONE;

            try {
                new Intl.DateTimeFormat(
                    "en-US",
                    {
                        timeZone:
                            savedTimezone,
                    },
                );

                setTimezone(savedTimezone);
            } catch {
                setTimezone(
                    DEFAULT_TIMEZONE,
                );
            }
        };

        void loadTimezone();
    }, []);

    const customer = useMemo(() => {
        const companyLeads = leads.filter(
            (lead) =>
                isPrivateCustomer
                    ? lead.id ===
                      id.slice(
                          "private:".length,
                      )
                    : (
                          lead.company ||
                          ""
                      )
                          .trim()
                          .toLowerCase() ===
                      id,
        );

        if (!companyLeads.length) {
            return null;
        }

        const revenue = companyLeads
            .filter(
                (lead) =>
                    lead.status === "won",
            )
            .reduce(
                (sum, lead) =>
                    sum + (lead.value || 0),
                0,
            );

        const contacts = Array.from(
            new Set(
                companyLeads
                    .map(
                        (lead) =>
                            lead.name,
                    )
                    .filter(Boolean),
            ),
        );

        return {
            company:
                editedCustomer?.company ||
                companyLeads[0].company ||
                "",
            contacts,
            revenue,
            leads: companyLeads,
            notes: companyLeads
                .map(
                    (lead) =>
                        lead.notes,
                )
                .filter(Boolean) as string[],
            website:
                editedCustomer?.website ??
                companyLeads.find(
                    (lead) =>
                        lead.website,
                )?.website,
            address:
                editedCustomer?.address ??
                companyLeads.find(
                    (lead) =>
                        lead.address,
                )?.address,
            industry:
                editedCustomer?.industry ??
                companyLeads.find(
                    (lead) =>
                        lead.industry,
                )?.industry ??
                "",
            isVip:
                editedCustomer?.isVip ??
                companyLeads.some(
                    (lead) =>
                        lead.is_vip === true,
                ),
        };
    }, [
        id,
        leads,
        editedCustomer,
        isPrivateCustomer,
    ]);

    const customerLeadIds =
        useMemo(
            () =>
                customer?.leads
                    .map(
                        (lead) =>
                            lead.id,
                    )
                    .sort()
                    .join(",") || "",
            [customer?.leads],
        );

    useEffect(() => {
        if (!customerLeadIds) {
            setCustomerActivities([]);
            setActivitiesLoading(false);
            return;
        }

        let cancelled = false;

        const loadCustomerActivities =
            async () => {
                setActivitiesLoading(true);

                try {
                    const leadIds =
                        customerLeadIds.split(
                            ",",
                        );

                    const {
                        data,
                        error,
                    } = await supabase
                        .from("activities")
                        .select(`
              id,
              type,
              title,
              description,
              action,
              created_at
            `)
                        .in(
                            "lead_id",
                            leadIds,
                        )
                        .order(
                            "created_at",
                            {
                                ascending: false,
                            },
                        )
                        .limit(100);

                    if (cancelled) {
                        return;
                    }

                    if (error) {
                        console.error(
                            "LOAD CUSTOMER ACTIVITIES ERROR:",
                            error,
                        );
                        setCustomerActivities([]);
                        return;
                    }

                    setCustomerActivities(
                        (data ||
                            []) as CustomerActivity[],
                    );
                } catch (loadError) {
                    if (cancelled) {
                        return;
                    }

                    console.error(
                        "CUSTOMER ACTIVITIES CRASH:",
                        loadError,
                    );

                    setCustomerActivities(
                        [],
                    );
                } finally {
                    if (!cancelled) {
                        setActivitiesLoading(
                            false,
                        );
                    }
                }
            };

        void loadCustomerActivities();

        return () => {
            cancelled = true;
        };
    }, [customerLeadIds]);

    const startEditing = () => {
        if (!customer) {
            return;
        }

        setEditCompany(
            isPrivateCustomer
                ? ""
                : customer.company,
        );

        setEditWebsite(
            customer.website || "",
        );

        setEditAddress(
            customer.address || "",
        );

        setEditIndustry(
            customer.industry || "",
        );

        setEditIsVip(
            customer.isVip,
        );

        setEditError(null);
        setEditing(true);
    };

    const deleteCustomer =
        async () => {
            if (!customer || deleting) {
                return;
            }

            const confirmed =
                window.confirm(
                    `Are you sure you want to delete "${customer.company}"?`,
                );

            if (!confirmed) {
                return;
            }

            setDeleting(true);
            setEditError(null);

            try {
                const {
                    data: { session },
                } =
                    await supabase.auth.getSession();

                if (
                    !session?.access_token
                ) {
                    throw new Error(
                        "Not authenticated.",
                    );
                }

                for (const lead of customer.leads) {
                    const response =
                        await fetch(
                            `/api/leads?id=${encodeURIComponent(
                                lead.id,
                            )}`,
                            {
                                method: "DELETE",
                                headers: {
                                    Authorization:
                                        `Bearer ${session.access_token}`,
                                },
                            },
                        );

                    if (!response.ok) {
                        const data =
                            await response
                                .json()
                                .catch(
                                    () => null,
                                );

                        throw new Error(
                            data?.error ||
                                "Customer could not be deleted.",
                        );
                    }
                }

                router.replace(
                    "/customers",
                );
            } catch (deleteError) {
                setDeleting(false);

                setEditError(
                    deleteError instanceof
                        Error
                        ? deleteError.message
                        : "Delete failed.",
                );
            }
        };

    const saveCustomer =
        async () => {
            if (!customer || saving) {
                return;
            }

            const company =
                editCompany.trim();

            if (
                !isPrivateCustomer &&
                !company
            ) {
                setEditError(
                    "Company name is required.",
                );
                return;
            }

            const nextCustomerId =
                isPrivateCustomer
                    ? id
                    : company.toLowerCase();

            setSaving(true);
            setEditError(null);

            try {
                const {
                    data: { session },
                } =
                    await supabase.auth.getSession();

                if (
                    !session?.access_token
                ) {
                    throw new Error(
                        "Not authenticated.",
                    );
                }

                for (const lead of customer.leads) {
                    const response =
                        await fetch(
                            "/api/leads",
                            {
                                method: "PUT",
                                headers: {
                                    "Content-Type":
                                        "application/json",
                                    Authorization:
                                        `Bearer ${session.access_token}`,
                                },
                                body: JSON.stringify(
                                    {
                                        id: lead.id,
                                        company:
                                            isPrivateCustomer
                                                ? null
                                                : company,
                                        website:
                                            editWebsite.trim() ||
                                            null,
                                        address:
                                            editAddress.trim() ||
                                            null,
                                        industry:
                                            editIndustry.trim() ||
                                            null,
                                        is_vip:
                                            editIsVip,
                                    },
                                ),
                            },
                        );

                    if (!response.ok) {
                        const data =
                            await response
                                .json()
                                .catch(
                                    () => null,
                                );

                        throw new Error(
                            data?.error ||
                                "Customer could not be saved.",
                        );
                    }
                }

                setEditedCustomer({
                    company:
                        isPrivateCustomer
                            ? customer.company
                            : company,
                    website:
                        editWebsite.trim(),
                    address:
                        editAddress.trim(),
                    industry:
                        editIndustry.trim(),
                    isVip: editIsVip,
                });

                setEditing(false);

                if (
                    nextCustomerId !== id
                ) {
                    router.replace(
                        `/customers/${encodeURIComponent(
                            nextCustomerId,
                        )}`,
                    );
                }
            } catch (saveError) {
                setEditError(
                    saveError instanceof
                        Error
                        ? saveError.message
                        : "Save failed.",
                );
            } finally {
                setSaving(false);
            }
        };

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">
                        Customer
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                        <h1 className="truncate text-3xl font-bold tracking-tight text-foreground">
                            {customer?.company ||
                                "Customer"}
                        </h1>

                        {customer?.isVip ? (
                            <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                                ★ VIP
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={startEditing}
                        disabled={
                            deleting ||
                            loading ||
                            !customer
                        }
                        className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/15 disabled:opacity-50"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            void deleteCustomer()
                        }
                        disabled={
                            deleting ||
                            loading ||
                            !customer
                        }
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {deleting
                            ? "Deleting..."
                            : "Delete customer"}
                    </button>

                    <Link
                        href="/customers"
                        className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-foreground/75 transition hover:bg-foreground/5"
                    >
                        Back
                    </Link>
                </div>
            </div>

            {error ? (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                    Could not load customer:{" "}
                    {error}
                </div>
            ) : null}

            {loading ? (
                <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 text-foreground">
                    Loading customer...
                </div>
            ) : !customer ? (
                <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 text-foreground/65">
                    Customer not found.
                </div>
            ) : (
                <>
                    {editing ? (
                        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    Edit Customer
                                </h2>

                                <p className="mt-1 text-sm text-foreground/55">
                                    Update this customer's company information.
                                </p>
                            </div>

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-sm text-foreground/65">
                                        Company
                                    </label>

                                    <input
                                        value={
                                            editCompany
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setEditCompany(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-cyan-400/50"
                                        placeholder="Company name"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-foreground/65">
                                        Website
                                    </label>

                                    <input
                                        value={
                                            editWebsite
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setEditWebsite(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-cyan-400/50"
                                        placeholder="https://example.com"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-sm text-foreground/65">
                                        Address
                                    </label>

                                    <input
                                        value={
                                            editAddress
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setEditAddress(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-cyan-400/50"
                                        placeholder="Address"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-foreground/65">
                                        Industry
                                    </label>

                                    <input
                                        value={
                                            editIndustry
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setEditIndustry(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-cyan-400/50"
                                        placeholder="e.g. Software"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-subtle bg-surface-2 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                editIsVip
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setEditIsVip(
                                                    event
                                                        .target
                                                        .checked,
                                                )
                                            }
                                            className="h-4 w-4 rounded border-border-subtle"
                                        />

                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                VIP Customer
                                            </p>

                                            <p className="mt-0.5 text-xs text-foreground/55">
                                                Mark this customer as a VIP customer.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {editError ? (
                                <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
                                    {editError}
                                </div>
                            ) : null}

                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditing(
                                            false,
                                        );
                                        setEditError(
                                            null,
                                        );
                                    }}
                                    disabled={
                                        saving
                                    }
                                    className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-foreground/75 hover:bg-foreground/5 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        void saveCustomer()
                                    }
                                    disabled={
                                        saving
                                    }
                                    className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/15 disabled:opacity-50"
                                >
                                    {saving
                                        ? "Saving..."
                                        : "Save changes"}
                                </button>
                            </div>
                        </section>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
                            <p className="text-xs text-foreground/55">
                                Revenue History
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-emerald-300">
                                EUR{" "}
                                {customer.revenue.toLocaleString(
                                    locale,
                                )}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
                            <p className="text-xs text-foreground/55">
                                Purchased Products
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-foreground">
                                {
                                    customer.leads.filter(
                                        (lead) =>
                                            lead.status ===
                                            "won",
                                    ).length
                                }{" "}
                                deals won
                            </p>
                        </div>

                        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
                            <p className="text-xs text-foreground/55">
                                Contacts
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-foreground">
                                {
                                    customer.contacts
                                        .length
                                }
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
                            <h2 className="text-lg font-semibold text-foreground">
                                Company Profile
                            </h2>

                            {customer.isVip ? (
                                <span className="mt-3 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                                    ★ VIP Customer
                                </span>
                            ) : null}

                            <div className="mt-4 space-y-2 text-sm text-foreground/80">
                                <p>
                                    Industry:{" "}
                                    {customer.industry ||
                                        "n/a"}
                                </p>

                                <p>
                                    Website:{" "}
                                    {customer.website ||
                                        "n/a"}
                                </p>

                                <p>
                                    Address:{" "}
                                    {customer.address ||
                                        "n/a"}
                                </p>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
                            <h2 className="text-lg font-semibold text-foreground">
                                Contacts
                            </h2>

                            <div className="mt-4 space-y-2 text-sm text-foreground/80">
                                {customer.contacts
                                    .length ? (
                                    customer.contacts.map(
                                        (
                                            contact,
                                        ) => (
                                            <p
                                                key={
                                                    contact
                                                }
                                            >
                                                {
                                                    contact
                                                }
                                            </p>
                                        ),
                                    )
                                ) : (
                                    <p className="text-foreground/55">
                                        No contacts available.
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>

                    <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
                        <h2 className="text-lg font-semibold text-foreground">
                            Communication History
                        </h2>

                        <div className="mt-4 space-y-3">
                            {activitiesLoading ? (
                                <p className="text-sm text-foreground/55">
                                    Loading activities...
                                </p>
                            ) : customerActivities.length ? (
                                customerActivities.map(
                                    (
                                        activity,
                                    ) => (
                                        <div
                                            key={
                                                activity.id
                                            }
                                            className="rounded-xl border border-border-subtle bg-surface-2/70 p-3 text-sm text-foreground/80"
                                        >
                                            <p className="font-medium text-foreground">
                                                {activity.title ||
                                                    activity.action ||
                                                    activity.type ||
                                                    "Activity"}
                                            </p>

                                            {activity.description ? (
                                                <p className="mt-1 text-sm text-foreground/60">
                                                    {
                                                        activity.description
                                                    }
                                                </p>
                                            ) : null}

                                            <p className="mt-1 text-xs text-foreground/55">
                                                {activity.created_at
                                                    ? formatActivityDate(
                                                          activity.created_at,
                                                          timezone,
                                                      )
                                                    : "n/a"}
                                            </p>
                                        </div>
                                    ),
                                )
                            ) : (
                                <p className="text-sm text-foreground/55">
                                    No activities available.
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
                        <h2 className="text-lg font-semibold text-foreground">
                            Notes
                        </h2>

                        <div className="mt-4 space-y-2 text-sm text-foreground/80">
                            {customer.notes.length ? (
                                customer.notes.map(
                                    (
                                        note,
                                        index,
                                    ) => (
                                        <p
                                            key={`${note.slice(
                                                0,
                                                20,
                                            )}-${index}`}
                                        >
                                            {note}
                                        </p>
                                    ),
                                )
                            ) : (
                                <p className="text-foreground/55">
                                    No notes available.
                                </p>
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}