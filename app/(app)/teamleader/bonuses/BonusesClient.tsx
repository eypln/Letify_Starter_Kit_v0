"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Cell,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email?: string;
}

interface Revenue {
  id: number;
  user_id: string;
  ref_no: string | null;
  client_name: string | null;
  rent_amount: number | null;
  landlord_fee: number | null;
  client_fee: number | null;
  listing_fee: number | null;
  agent_income: number | null;
  agent_tax: number | null;
  landlord_discount: boolean;
  client_discount: boolean;
  has_listing_fee: boolean;
  vat_type: string;
  deal_type?: string;
  date_rented: string | null;
  date_signed: string | null;
  date_move_in: string | null;
  landlord_paid_date: string | null;
  client_paid_date: string | null;
  collaboration_with: string | null;
  inform_boss_after_both_sides_paid: boolean;
  created_at?: string;
}

interface Profile {
  user_id: string;
  full_name: string;
  role: string;
}

interface DealWithAgent extends Revenue {
  agent_name: string;
  effective_rent: number;
  completion_date: string; // YYYY-MM format
  is_leader_deal: boolean;
  is_team_deal: boolean;
  is_external_deal: boolean;
  is_collaboration_external: boolean;
  deal_listing_fee: number; // listing_fee from DB
}

interface MonthlyBonus {
  month: string;
  monthLabel: string;
  totalRevenue: number;
  leaderRevenue: number;
  teamRevenue: number;
  tier: number;
  leaderRate: number;
  teamRate: number;
  leaderEarnings: number;
  teamBonus: number;
  listingFee: number;
  totalEarnings: number;
}

interface AgentPerformance {
  name: string;
  totalRent: number;
  dealCount: number;
  color: string;
}

// ─── Bonus Tier Logic ────────────────────────────────────────────────────────

function getBonusTier(totalRevenue: number): {
  tier: number;
  leaderRate: number;
  teamRate: number;
  label: string;
} {
  if (totalRevenue >= 15000) {
    return { tier: 4, leaderRate: 0.37, teamRate: 0.10, label: "Tier 4 (€15,000+)" };
  } else if (totalRevenue >= 10000) {
    return { tier: 3, leaderRate: 0.37, teamRate: 0.075, label: "Tier 3 (€10K-€15K)" };
  } else if (totalRevenue >= 5000) {
    return { tier: 2, leaderRate: 0.37, teamRate: 0.05, label: "Tier 2 (€5K-€10K)" };
  } else {
    return { tier: 1, leaderRate: 0.32, teamRate: 0, label: "Tier 1 (€0-€5K)" };
  }
}

const TIER_COLORS = {
  1: "#94a3b8",  // gray
  2: "#60a5fa",  // blue
  3: "#a78bfa",  // purple
  4: "#f59e0b",  // gold
};

const AGENT_COLORS = [
  "#8b5cf6", "#ec4899", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#6366f1", "#14b8a6", "#f97316", "#84cc16",
];

// Helper: Check if a profile name indicates an external/generic agent (not a real team member)
function isExternalAgentName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return normalized === "agent" || normalized === "unknown agent";
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function getCompletionMonth(deal: Revenue): string {
  const landlordDate = deal.landlord_paid_date ? new Date(deal.landlord_paid_date) : null;
  const clientDate = deal.client_paid_date ? new Date(deal.client_paid_date) : null;

  // If either date is missing → pending deal → use current month
  if (!landlordDate || !clientDate) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  // Take the later of the two dates
  const completionDate = landlordDate > clientDate ? landlordDate : clientDate;
  return `${completionDate.getFullYear()}-${String(completionDate.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function formatCurrency(amount: number): string {
  return `€${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Linked Agent Accounts ───────────────────────────────────────────────────
// Map teamleader auth IDs to their agent account user_ids.
// Used when a teamleader also operates as an individual agent under a
// separate Supabase auth account.
const LEADER_AGENT_ACCOUNTS: Record<string, string[]> = {
  // Erhan Yurdakul: teamleader account → agent account
  "c75e2b9a-aeda-415d-bbfd-b7c90e6e54e1": ["9bd6f7bc-0041-4c8c-8c48-c4726b7ed008"],
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BonusesClient({ user }: { user: User }) {
  const supabase = createClient();
  const [allRevenues, setAllRevenues] = useState<Revenue[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [leaderProfile, setLeaderProfile] = useState<Profile | null>(null);
  const [leaderUserIds, setLeaderUserIds] = useState<Set<string>>(new Set());
  const [agentIds, setAgentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // ─── Data Loading ────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // Fetch all revenue records
      const { data: revenueData } = await supabase
        .from("revenue")
        .select("*")
        .order("created_at", { ascending: false });

      // Fetch all profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, role");

      if (revenueData) setAllRevenues(revenueData);
      if (profilesData) {
        setProfiles(profilesData);

        // Find leader profile
        const leader = profilesData.find((p) => p.user_id === user.id);
        if (leader) {
          setLeaderProfile(leader);

          // Collect ALL user_ids that belong to the teamleader:
          // 1. Name-matched accounts (same full_name)
          // 2. Explicitly linked agent accounts (LEADER_AGENT_ACCOUNTS map)
          const nameMatchedIds = profilesData
            .filter(
              (p) =>
                p.full_name?.trim().toLowerCase() ===
                leader.full_name?.trim().toLowerCase()
            )
            .map((p) => p.user_id);

          const linkedAgentIds = LEADER_AGENT_ACCOUNTS[user.id] || [];

          const leaderIds = new Set([...nameMatchedIds, ...linkedAgentIds]);
          setLeaderUserIds(leaderIds);
        }

        // Collect agent user_ids (role='agent')
        const agentSet = new Set(
          profilesData.filter((p) => p.role === "agent").map((p) => p.user_id)
        );
        setAgentIds(agentSet);
      }

      setLoading(false);
    }
    loadData();
  }, [supabase, user.id]);

  // ─── Profile Lookup Map ──────────────────────────────────────────────────

  const profileMap = useMemo(() => {
    const map = new Map<string, Profile>();
    profiles.forEach((p) => map.set(p.user_id, p));
    return map;
  }, [profiles]);

  // ─── Process Deals ──────────────────────────────────────────────────────

  const processedDeals = useMemo((): DealWithAgent[] => {
    return allRevenues.map((deal) => {
      const profile = profileMap.get(deal.user_id);
      const agentName = profile?.full_name || "Unknown Agent";
      // Leader match: check against ALL user_ids that belong to the teamleader
      // (covers the case where teamleader has a separate agent account)
      const isLeader = leaderUserIds.has(deal.user_id);

      // External agent = user with role='agent' whose name is "Agent" (generic placeholder)
      // These are NOT team members - their deals only generate listing fee income
      const isExternal = isExternalAgentName(agentName);

      // Team agent = role='agent' user who is NOT the leader and NOT the generic "Agent"
      const isTeamAgent = agentIds.has(deal.user_id) && !isLeader && !isExternal;

      // Check if there is any collaboration partner
      const collabName = deal.collaboration_with?.trim() || "";
      const hasCollaboration = collabName !== "";
      const isCollabExternal = hasCollaboration && isExternalAgentName(collabName);

      const rentAmount = deal.rent_amount || 0;

      // Effective rent for bonus calculations
      let effectiveRent = rentAmount;
      if (isExternal) {
        // External agent deal: rent excluded from bonus, only listing fee matters
        effectiveRent = 0;
      } else if (hasCollaboration) {
        // ANY collaboration (internal team or external): halve the rent
        // The revenue is split 50/50 between the deal owner and the collaborator
        effectiveRent = rentAmount / 2;
      }

      return {
        ...deal,
        agent_name: agentName,
        effective_rent: effectiveRent,
        completion_date: getCompletionMonth(deal),
        is_leader_deal: isLeader,
        is_team_deal: isTeamAgent,
        is_external_deal: isExternal,
        is_collaboration_external: isCollabExternal,
        deal_listing_fee: deal.listing_fee || 0,
      };
    });
  }, [allRevenues, profileMap, agentIds, leaderUserIds]);

  // ─── Monthly Bonus Calculation ──────────────────────────────────────────

  const monthlyBonuses = useMemo((): MonthlyBonus[] => {
    // Group deals by completion month
    const monthGroups = new Map<string, DealWithAgent[]>();
    processedDeals.forEach((deal) => {
      const month = deal.completion_date;
      if (!monthGroups.has(month)) monthGroups.set(month, []);
      monthGroups.get(month)!.push(deal);
    });

    const results: MonthlyBonus[] = [];

    monthGroups.forEach((deals, month) => {
      // Calculate leader revenue (effective rent from leader's deals)
      const leaderRevenue = deals
        .filter((d) => d.is_leader_deal)
        .reduce((sum, d) => sum + d.effective_rent, 0);

      // Calculate team revenue (effective rent from team agent deals)
      const teamRevenue = deals
        .filter((d) => d.is_team_deal)
        .reduce((sum, d) => sum + d.effective_rent, 0);

      // Total revenue for tier calculation = leader + team
      const totalRevenue = leaderRevenue + teamRevenue;

      // Personal rate is determined by leaderRevenue alone
      // Team rate is determined by totalRevenue (leader + team combined)
      const personalTier = getBonusTier(leaderRevenue);
      const teamTier = getBonusTier(totalRevenue);

      const leaderRate = personalTier.leaderRate;
      const teamRate = teamTier.teamRate;
      const tier = teamTier.tier; // overall tier for display

      // Calculate earnings
      const leaderEarnings = leaderRevenue * leaderRate;
      const teamBonus = teamRevenue * teamRate;

      // Listing fee: use listing_fee field from DB for ALL deals that have it
      // External agent deals: listing_fee = 5% of rent (already calculated in DB)
      // Team/leader deals with has_listing_fee checked: also captured in DB
      const listingFee = deals
        .reduce((sum, d) => sum + d.deal_listing_fee, 0);

      results.push({
        month,
        monthLabel: formatMonthLabel(month),
        totalRevenue,
        leaderRevenue,
        teamRevenue,
        tier,
        leaderRate,
        teamRate,
        leaderEarnings,
        teamBonus,
        listingFee,
        totalEarnings: leaderEarnings + teamBonus + listingFee,
      });
    });

    // Sort by month
    return results.sort((a, b) => a.month.localeCompare(b.month));
  }, [processedDeals]);

  // ─── Agent Performance Data ─────────────────────────────────────────────

  const agentPerformance = useMemo((): AgentPerformance[] => {
    const filteredDeals = selectedMonth
      ? processedDeals.filter((d) => d.completion_date === selectedMonth)
      : processedDeals;

    // Only include leader + real team agent deals (exclude external "Agent" users)
    const relevantDeals = filteredDeals.filter(
      (d) => (d.is_leader_deal || d.is_team_deal) && !isExternalAgentName(d.agent_name)
    );

    // Group by agent
    const agentMap = new Map<string, { totalRent: number; dealCount: number }>();
    relevantDeals.forEach((deal) => {
      const existing = agentMap.get(deal.agent_name) || { totalRent: 0, dealCount: 0 };
      existing.totalRent += deal.effective_rent;
      existing.dealCount += 1;
      agentMap.set(deal.agent_name, existing);
    });

    // Convert to array and sort descending
    return Array.from(agentMap.entries())
      .map(([name, data], idx) => ({
        name,
        totalRent: Math.round(data.totalRent * 100) / 100,
        dealCount: data.dealCount,
        color: AGENT_COLORS[idx % AGENT_COLORS.length],
      }))
      .sort((a, b) => b.totalRent - a.totalRent);
  }, [processedDeals, selectedMonth]);

  // ─── Generate month options ─────────────────────────────────────────────

  const monthOptions = useMemo(() => {
    const months = [...new Set(processedDeals.map((d) => d.completion_date))].sort();
    return months.map((m) => ({
      value: m,
      label: formatMonthLabel(m),
    }));
  }, [processedDeals]);

  // ─── Chart data for team bonus ──────────────────────────────────────────

  const bonusChartData = useMemo(() => {
    return monthlyBonuses.map((mb) => ({
      month: mb.monthLabel.replace(/(\w+)\s(\d{4})/, (_, m, y) => {
        const shortNames: Record<string, string> = {
          January: "Jan", February: "Feb", March: "Mar", April: "Apr",
          May: "May", June: "Jun", July: "Jul", August: "Aug",
          September: "Sep", October: "Oct", November: "Nov", December: "Dec",
        };
        return `${shortNames[m] || m} ${y}`;
      }),
      "Personal Earnings": Math.round(mb.leaderEarnings * 100) / 100,
      "Team Bonus": Math.round(mb.teamBonus * 100) / 100,
      "Listing Fee": Math.round(mb.listingFee * 100) / 100,
      tier: mb.tier,
      totalRevenue: mb.totalRevenue,
      totalEarnings: Math.round(mb.totalEarnings * 100) / 100,
    }));
  }, [monthlyBonuses]);

  // ─── Current month summary ─────────────────────────────────────────────

  const currentMonthSummary = useMemo(() => {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return monthlyBonuses.find((mb) => mb.month === currentKey) || null;
  }, [monthlyBonuses]);

  // ─── Overall totals ────────────────────────────────────────────────────

  const overallTotals = useMemo(() => {
    return {
      totalLeaderEarnings: monthlyBonuses.reduce((s, m) => s + m.leaderEarnings, 0),
      totalTeamBonus: monthlyBonuses.reduce((s, m) => s + m.teamBonus, 0),
      totalListingFee: monthlyBonuses.reduce((s, m) => s + m.listingFee, 0),
      totalEarnings: monthlyBonuses.reduce((s, m) => s + m.totalEarnings, 0),
    };
  }, [monthlyBonuses]);

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-8 lg:px-16">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 text-lg">Loading bonus data...</div>
        </div>
      </div>
    );
  }

  const leaderName = leaderProfile?.full_name || "Team Leader";

  // Determine dashboard link based on user's role
  const dashboardHref = leaderProfile?.role === "boss"
    ? "/boss"
    : leaderProfile?.role === "manager"
      ? "/manager"
      : "/teamleader";

  return (
    <div className="container mx-auto py-8 px-4 md:px-8 lg:px-16">
      {/* Header */}
      <div className="relative mt-8">
        <Link
          href={dashboardHref}
          className="absolute -top-10 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 z-10"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor" />
          </svg>
          Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2 mt-4">Bonuses & Performance</h1>
      <p className="text-muted-foreground mb-8">
        Track your leadership bonuses, team performance and earnings overview
      </p>

      {/* ─── Current Month Summary Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Current Tier */}
        <Card className="border-2" style={{ borderColor: TIER_COLORS[currentMonthSummary?.tier as keyof typeof TIER_COLORS || 1] }}>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 mb-1">Current Month Tier</div>
            <div className="text-2xl font-bold" style={{ color: TIER_COLORS[currentMonthSummary?.tier as keyof typeof TIER_COLORS || 1] }}>
              {currentMonthSummary ? getBonusTier(currentMonthSummary.totalRevenue).label : "No Data"}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Revenue: {formatCurrency(currentMonthSummary?.totalRevenue || 0)}
            </div>
          </CardContent>
        </Card>

        {/* Personal Earnings */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 mb-1">Personal Earnings (This Month)</div>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(currentMonthSummary?.leaderEarnings || 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Rate: {((currentMonthSummary?.leaderRate || 0.32) * 100).toFixed(0)}% · Rev: {formatCurrency(currentMonthSummary?.leaderRevenue || 0)}
            </div>
          </CardContent>
        </Card>

        {/* Team Bonus */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 mb-1">Team Bonus (This Month)</div>
            <div className="text-2xl font-bold text-pink-600">
              {formatCurrency(currentMonthSummary?.teamBonus || 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Rate: {((currentMonthSummary?.teamRate || 0) * 100).toFixed(1)}% · Rev: {formatCurrency(currentMonthSummary?.teamRevenue || 0)}
            </div>
          </CardContent>
        </Card>

        {/* Total Earnings */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 mb-1">Total Earnings (This Month)</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(currentMonthSummary?.totalEarnings || 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Listing Fee: {formatCurrency(currentMonthSummary?.listingFee || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Tier Progress Bar ───────────────────────────────────────────── */}
      {currentMonthSummary && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Tier Progress This Month</h3>
              <span className="text-sm text-gray-500">
                {formatCurrency(currentMonthSummary.totalRevenue)} / €15,000
              </span>
            </div>
            <div className="relative w-full h-8 bg-gray-100 rounded-full overflow-hidden">
              {/* Tier markers */}
              <div className="absolute top-0 left-[33.3%] w-px h-full bg-gray-300 z-10" title="€5,000" />
              <div className="absolute top-0 left-[66.6%] w-px h-full bg-gray-300 z-10" title="€10,000" />
              {/* Progress fill */}
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, (currentMonthSummary.totalRevenue / 15000) * 100)}%`,
                  background: `linear-gradient(90deg, ${TIER_COLORS[1]}, ${TIER_COLORS[2]}, ${TIER_COLORS[3]}, ${TIER_COLORS[4]})`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-400">
              <span>€0</span>
              <span>€5,000</span>
              <span>€10,000</span>
              <span>€15,000+</span>
            </div>
            <div className="flex gap-4 mt-3 text-xs">
              {[1, 2, 3, 4].map((t) => (
                <div key={t} className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: TIER_COLORS[t as keyof typeof TIER_COLORS] }}
                  />
                  <span className={currentMonthSummary.tier === t ? "font-bold" : "text-gray-500"}>
                    Tier {t}: {t === 1 ? "32% / 0%" : t === 2 ? "37% / 5%" : t === 3 ? "37% / 7.5%" : "37% / 10%"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Section 1: Leadership Performance Chart ─────────────────────── */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>🏆 Leadership Performance</CardTitle>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Period:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Time</option>
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {agentPerformance.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No performance data available for this period.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(300, agentPerformance.length * 60)}>
                <BarChart
                  data={agentPerformance}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `€${(v / 1000).toFixed(1)}k`}
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={140}
                    style={{ fontSize: "13px", fontWeight: 500 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    labelFormatter={(label) => `Agent: ${label}`}
                    contentStyle={{ backgroundColor: "rgba(255,255,255,0.97)", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                  />
                  <Bar dataKey="totalRent" name="Effective Revenue" radius={[0, 8, 8, 0]}>
                    {agentPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Rankings Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-purple-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">Agent</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase">Deals</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {agentPerformance.map((agent, idx) => (
                      <tr
                        key={agent.name}
                        className={`${idx === 0 ? "bg-yellow-50" : idx === 1 ? "bg-gray-50" : idx === 2 ? "bg-orange-50" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-4 py-3 text-sm font-bold">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agent.color }} />
                          {agent.name}
                          {agent.name === leaderName && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">You</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">{agent.dealCount}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(agent.totalRent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 2: Monthly Earnings Breakdown ───────────────────────── */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>💰 Monthly Earnings Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {bonusChartData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              No earnings data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart
                data={bonusChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  tickFormatter={(v) => `€${v}`}
                  style={{ fontSize: "12px" }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label) => `Month: ${label}`}
                  contentStyle={{ backgroundColor: "rgba(255,255,255,0.97)", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
                <Bar dataKey="Personal Earnings" stackId="earnings" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Team Bonus" stackId="earnings" fill="#ec4899" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Listing Fee" stackId="earnings" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="totalEarnings"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  name="Total Earnings"
                  dot={{ fill: "#f59e0b", r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 3: Detailed Monthly Bonus Table ─────────────────────── */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>📊 Detailed Bonus Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase whitespace-nowrap">Month</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase whitespace-nowrap">Total Revenue</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-purple-700 uppercase whitespace-nowrap">Tier</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase whitespace-nowrap">
                    Personal Revenue
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase whitespace-nowrap">
                    Personal Earnings
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase whitespace-nowrap">Team Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase whitespace-nowrap">Team Bonus</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase whitespace-nowrap">Listing Fee</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-green-700 uppercase whitespace-nowrap">
                    Total Earnings
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthlyBonuses.map((mb) => (
                  <tr key={mb.month} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{mb.monthLabel}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(mb.totalRevenue)}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: TIER_COLORS[mb.tier as keyof typeof TIER_COLORS] }}
                      >
                        Tier {mb.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatCurrency(mb.leaderRevenue)}
                      <span className="text-xs text-gray-400 ml-1">×{(mb.leaderRate * 100).toFixed(0)}%</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-purple-700">
                      {formatCurrency(mb.leaderEarnings)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatCurrency(mb.teamRevenue)}
                      <span className="text-xs text-gray-400 ml-1">×{(mb.teamRate * 100).toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-pink-600">
                      {formatCurrency(mb.teamBonus)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-teal-600">
                      {formatCurrency(mb.listingFee)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                      {formatCurrency(mb.totalEarnings)}
                    </td>
                  </tr>
                ))}

                {/* Totals Row */}
                {monthlyBonuses.length > 0 && (
                  <tr className="bg-gradient-to-r from-purple-100/50 to-pink-100/50 font-bold">
                    <td className="px-4 py-3 text-sm">TOTAL</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatCurrency(monthlyBonuses.reduce((s, m) => s + m.totalRevenue, 0))}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-sm text-right">
                      {formatCurrency(monthlyBonuses.reduce((s, m) => s + m.leaderRevenue, 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-purple-700">
                      {formatCurrency(overallTotals.totalLeaderEarnings)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatCurrency(monthlyBonuses.reduce((s, m) => s + m.teamRevenue, 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-pink-600">
                      {formatCurrency(overallTotals.totalTeamBonus)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-teal-600">
                      {formatCurrency(overallTotals.totalListingFee)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">
                      {formatCurrency(overallTotals.totalEarnings)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Bonus Rules Reference Card ──────────────────────────────────── */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>📋 Bonus Tier Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { tier: 1, range: "€0 – €5,000", leader: "32%", team: "0%", desc: "Base rate, no team bonus" },
              { tier: 2, range: "€5,000 – €10,000", leader: "37%", team: "5%", desc: "+5% personal bonus + team earnings" },
              { tier: 3, range: "€10,000 – €15,000", leader: "37%", team: "7.5%", desc: "+5% personal bonus + higher team earnings" },
              { tier: 4, range: "€15,000+", leader: "37%", team: "10%", desc: "Maximum bonus tier" },
            ].map((t) => (
              <div
                key={t.tier}
                className="p-4 rounded-lg border-2 transition-all"
                style={{
                  borderColor: TIER_COLORS[t.tier as keyof typeof TIER_COLORS],
                  backgroundColor: currentMonthSummary?.tier === t.tier ? `${TIER_COLORS[t.tier as keyof typeof TIER_COLORS]}15` : "transparent",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: TIER_COLORS[t.tier as keyof typeof TIER_COLORS] }}
                  />
                  <span className="font-bold">Tier {t.tier}</span>
                  {currentMonthSummary?.tier === t.tier && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Current</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-2">{t.range}</div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Personal:</span>{" "}
                    <span className="font-semibold text-purple-600">{t.leader}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Team:</span>{" "}
                    <span className="font-semibold text-pink-600">{t.team}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2">{t.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-800 mb-2">📌 Important Notes</h4>
            <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
              <li>
                <strong>Completion Date:</strong> A deal is considered complete when BOTH landlord and client have paid. 
                The later payment date determines which month the deal falls into.
              </li>
              <li>
                <strong>Pending Deals:</strong> Deals with missing payment dates are automatically included in the current month.
              </li>
              <li>
                <strong>External Collaboration:</strong> When a deal has collaboration with an external agent (&quot;Agent&quot;), 
                only 50% of the rent amount is counted towards bonus calculations.
              </li>
              <li>
                <strong>Internal Collaboration:</strong> When two team members collaborate, the full rent amount counts 
                since both contribute to the team total.
              </li>
              <li>
                <strong>External Agent Deals:</strong> Deals by the generic &quot;Agent&quot; user only generate listing fee income 
                (5% of rent, stored in the deal record). They are excluded from bonus tier calculations.
              </li>
              <li>
                <strong>Listing Fee:</strong> Uses the listing_fee field from each deal record. Applies to deals 
                with the listing fee checkbox enabled and to external agent deals.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
