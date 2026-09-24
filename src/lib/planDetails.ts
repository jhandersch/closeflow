export type Plan = "free" | "pro" | "business";

export type PlanLimits = {
    leadCapacity: number | null;
    aiRequestsMonthly: number;
    exportsMonthly: number;
    teamSeats: number;
};

export type PlanInfo = {
    id: Plan;
    name: string;
    price: string;
    seats: string;
    description: string;
    limits: PlanLimits;
    features: string[];
    benefits: string[];
};

export const planDetails: Record<Plan, PlanInfo> = {
    free: {
        id: "free",
        name: "Free",
        price: "\u20AC0/month",
        seats: "1 team member",
        description: "For individuals getting started with CloseFlow.",
        limits: { leadCapacity: 50, aiRequestsMonthly: 10, exportsMonthly: 5, teamSeats: 1 },
        features: ["Up to 50 active leads", "10 AI requests per month", "5 exports per month", "1 team member", "Lead analytics and six-month revenue history", "Scenario-based forecasts and cost-aware AI insights"],
        benefits: [
            "Manage leads and customers in one organized CRM.",
            "Track deals with pipeline stages, tasks, calendar events, and next actions.",
            "Review lead-level analytics and a six-month revenue history.",
            "Use scenario-based revenue forecasts and AI deal insights, including your recorded deal costs.",
            "Import lead and customer records, then export workspace data within your monthly allowance.",
        ],
    },
    pro: {
        id: "pro",
        name: "Pro",
        price: "\u20AC49/month",
        seats: "Up to 5 team members",
        description: "For growing sales teams that need more capacity.",
        limits: { leadCapacity: null, aiRequestsMonthly: 500, exportsMonthly: 200, teamSeats: 5 },
        features: ["Unlimited active leads", "500 AI requests per month", "200 exports per month", "Up to 5 team members", "Lead analytics and six-month revenue history", "Scenario-based forecasts and cost-aware AI insights"],
        benefits: [
            "Everything in Free, with unlimited active leads.",
            "Share your workspace with up to five team members.",
            "Run up to 500 AI requests and 200 exports each month.",
            "Use the full lead analytics, six-month revenue history, and scenario-based forecasting tools.",
            "Give AI your recorded deal costs for more realistic profitability and prioritization insights.",
        ],
    },
    business: {
        id: "business",
        name: "Business",
        price: "\u20AC149/month",
        seats: "Up to 20 team members",
        description: "For larger teams with maximum CRM capacity.",
        limits: { leadCapacity: null, aiRequestsMonthly: 5000, exportsMonthly: 2000, teamSeats: 20 },
        features: ["Unlimited active leads", "5,000 AI requests per month", "2,000 exports per month", "Up to 20 team members", "Lead analytics and six-month revenue history", "Scenario-based forecasts and cost-aware AI insights"],
        benefits: [
            "Everything in Pro, with workspace access for up to 20 team members.",
            "Run up to 5,000 AI requests and 2,000 exports each month.",
            "Keep larger teams aligned with shared pipeline, activities, tasks, and customer next actions.",
            "Use the same complete analytics, revenue forecasting, and deal-cost-aware AI tools at higher volume.",
        ],
    },
};
