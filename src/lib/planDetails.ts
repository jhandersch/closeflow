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
        features: ["Up to 50 active leads", "10 AI requests per month", "5 exports per month", "1 team member"],
        benefits: [
            "Keep your sales pipeline organized with the core CloseFlow CRM.",
            "Use AI for a limited number of analyses each month.",
            "Get a clear baseline view of your pipeline forecast.",
        ],
    },
    pro: {
        id: "pro",
        name: "Pro",
        price: "\u20AC49/month",
        seats: "Up to 5 team members",
        description: "For growing sales teams that need more capacity.",
        limits: { leadCapacity: null, aiRequestsMonthly: 500, exportsMonthly: 200, teamSeats: 5 },
        features: ["Unlimited active leads", "500 AI requests per month", "200 exports per month", "Up to 5 team members"],
        benefits: [
            "Give a growing team more room to manage an expanding pipeline.",
            "Use deeper AI insights to support day-to-day sales work.",
            "Work with more advanced forecasting for better pipeline visibility.",
        ],
    },
    business: {
        id: "business",
        name: "Business",
        price: "\u20AC49/month",
        seats: "Up to 20 team members",
        description: "For larger teams with maximum CRM capacity.",
        limits: { leadCapacity: null, aiRequestsMonthly: 5000, exportsMonthly: 2000, teamSeats: 20 },
        features: ["Unlimited active leads", "5,000 AI requests per month", "2,000 exports per month", "Up to 20 team members"],
        benefits: [
            "Manage larger sales operations without the lead and customer limits of the lower plans.",
            "Access the highest level of AI capabilities available in CloseFlow.",
            "Use advanced analytics and forecasting for a deeper view of sales performance.",
        ],
    },
};