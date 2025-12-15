"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

interface User {
  id: string;
  email?: string;
}

interface Viewing {
  id: number;
  user_id: string;
  ref_no: string | null;
  city: string | null;
  viewing_date: string | null;
  viewing_time: string | null;
  client_name: string | null;
  client_mobile_no: string | null;
  result: string | null;
  comments: string | null;
  created_at?: string;
}

interface TeamViewing extends Viewing {
  agent_name: string;
}

const teamColumns = [
  "#",
  "Agent Name",
  "Created Date",
  "City",
  "Viewing Date",
  "Viewing Time",
  "Client Name",
  "Result",
  "Comments",
];

const pageSize = 30;

export default function ManagerTeamViewingsClient({ user, dashboardPath = "/manager" }: { user: User; dashboardPath?: string }) {
  const [teamViewings, setTeamViewings] = useState<TeamViewing[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamPage, setTeamPage] = useState(1);
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  const supabase = createClient();

  // Filter states for Team Viewings
  const [filterResult, setFilterResult] = useState('');
  const [filterAgentName, setFilterAgentName] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [isTeamFilterOpen, setIsTeamFilterOpen] = useState(false);

  async function getTeamViewings() {
    setTeamLoading(true);
    if (user?.id) {
      // Get all viewings from all agents
      const { data: viewingsData, error: viewingsError } = await supabase
        .from("viewings")
        .select("*")
        .order("created_at", { ascending: false });

      if (!viewingsError && viewingsData) {
        // Fetch agent names
        const userIds = [...new Set(viewingsData.map((v) => v.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        const profileMap = new Map();
        if (profilesData) {
          profilesData.forEach((p) => {
            profileMap.set(p.user_id, p.full_name);
          });
        }

        const enrichedViewings = viewingsData.map((viewing) => ({
          ...viewing,
          agent_name: profileMap.get(viewing.user_id) || "Unknown",
        }));

        setTeamViewings(enrichedViewings);
      }
    }
    setTeamLoading(false);
  }

  useEffect(() => {
    getTeamViewings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Filter team viewings
  const filteredTeamViewings = teamViewings.filter((viewing) => {
    const matchesResult = !filterResult || viewing.result === filterResult;
    const matchesAgentName = !filterAgentName || 
      (viewing.agent_name && viewing.agent_name.toLowerCase().includes(filterAgentName.toLowerCase()));
    const matchesMonth = !filterMonth ||
      (viewing.viewing_date && viewing.viewing_date.startsWith(filterMonth));
    
    return matchesResult && matchesAgentName && matchesMonth;
  });

  // Pagination for filtered team viewings
  const teamPageCountFiltered = Math.ceil(filteredTeamViewings.length / pageSize);
  const paginatedTeamViewings = filteredTeamViewings.slice(
    (teamPage - 1) * pageSize,
    teamPage * pageSize
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setTeamPage(1);
  }, [filterResult, filterAgentName, filterMonth]);

  // Check if any filters are active
  const hasActiveTeamFilters = filterResult || filterAgentName || filterMonth;

  // Clear all team filters
  const clearTeamFilters = () => {
    setFilterResult('');
    setFilterAgentName('');
    setFilterMonth('');
  };

  // Generate calendar months with slider (previous, current, next)
  const generateMonthsCalendar = () => {
    const today = new Date();
    const months = [];
    
    for (let i = -1; i <= 1; i++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() + currentMonthOffset + i, 1);
      const isMainMonth = i === 0;
      months.push(generateMonthCalendar(monthDate, isMainMonth));
    }
    
    return months;
  };

  const generateMonthCalendar = (monthDate: Date, isMainMonth: boolean = false) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className={`border border-gray-200 ${isMainMonth ? 'h-16 sm:h-20 md:h-24' : 'h-8 sm:h-10 md:h-12'}`}></div>);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const dayViewings = teamViewings.filter((v) => v.viewing_date === dateStr);
      
      const isToday = 
        day === new Date().getDate() && 
        month === new Date().getMonth() && 
        year === new Date().getFullYear();
      
      days.push(
        <div 
          key={day} 
          className={`border border-gray-200 p-0.5 sm:p-1 overflow-y-auto ${isMainMonth ? 'h-16 sm:h-20 md:h-24' : 'h-8 sm:h-10 md:h-12'} ${isToday ? 'bg-purple-50 border-purple-400' : ''}`}
        >
          <div className={`font-semibold text-gray-600 mb-0.5 sm:mb-1 ${isMainMonth ? 'text-[10px] sm:text-xs' : 'text-[8px] sm:text-[10px]'}`}>{day}</div>
          {isMainMonth && dayViewings.map((viewing) => (
            <div
              key={viewing.id}
              className={`text-[10px] sm:text-xs p-0.5 sm:p-1 mb-0.5 sm:mb-1 rounded ${
                viewing.result === 'DEAL' ? 'bg-green-100 text-green-800' :
                viewing.result === 'NO DEAL' ? 'bg-red-100 text-red-800' :
                viewing.result === 'Negotiating' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}
            >
              <div className="font-bold text-[9px] sm:text-[10px]">#{viewing.id}</div>
              <div className="text-[9px] sm:text-[10px]">{viewing.viewing_time ? viewing.viewing_time.substring(0, 5) : ''}</div>
              <div className="truncate text-[9px] sm:text-[10px]">{viewing.ref_no}</div>
              <div className="text-[8px] sm:text-[9px] text-gray-600 italic truncate">{viewing.agent_name}</div>
            </div>
          ))}
          {!isMainMonth && dayViewings.length > 0 && (
            <div className="text-[8px] sm:text-[10px] text-center text-purple-600 font-semibold">
              {dayViewings.length}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div key={monthName} className={`${isMainMonth ? 'min-w-[320px] sm:min-w-[480px] md:min-w-[600px]' : 'min-w-[200px] sm:min-w-[250px] opacity-50'} flex-shrink-0 transition-all`}>
        <h3 className={`font-bold text-center mb-2 ${isMainMonth ? 'text-base sm:text-lg md:text-xl' : 'text-xs sm:text-sm'}`}>{monthName}</h3>
        <div className="grid grid-cols-7 gap-0 border border-gray-300">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={`text-center font-semibold p-0.5 sm:p-1 bg-gray-100 border border-gray-200 ${isMainMonth ? 'text-[10px] sm:text-xs' : 'text-[8px] sm:text-[10px]'}`}>
              {day}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-bold mb-2">Loading...</h2>
        <p className="text-muted-foreground">User info is loading.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-8 lg:px-16">
      <div className="relative mt-8">
        <Link href={dashboardPath} className="absolute -top-10 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 z-10">
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
          </svg>
          Dashboard
        </Link>
        
        {/* Calendar View */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Team Viewing Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="flex items-center justify-between mb-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonthOffset(prev => prev - 1)}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonthOffset(0)}
                  disabled={currentMonthOffset === 0}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonthOffset(prev => prev + 1)}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
              
              <div className="overflow-x-auto">
                <div className="flex gap-2 md:gap-4 items-center justify-start md:justify-center">
                  {generateMonthsCalendar()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Viewings Section */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Viewing Records</CardTitle>
                {hasActiveTeamFilters && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="text-purple-600 font-medium">
                      ({filteredTeamViewings.length} filtered results)
                    </span>
                  </p>
                )}
              </div>
              
              {/* Filter Button */}
              <Popover open={isTeamFilterOpen} onOpenChange={setIsTeamFilterOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant={hasActiveTeamFilters ? "default" : "outline"} 
                    size="sm"
                    className="gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Filter
                    {hasActiveTeamFilters && (
                      <span className="ml-1 bg-white text-purple-600 rounded-full px-2 py-0.5 text-xs font-semibold">
                        {[filterResult, filterAgentName, filterMonth].filter(Boolean).length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Filter Team Viewings</h4>
                      {hasActiveTeamFilters && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearTeamFilters}
                          className="h-auto p-1 text-xs"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>

                    {/* Result Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="filter-result" className="text-xs">Result</Label>
                      <select
                        id="filter-result"
                        value={filterResult}
                        onChange={(e) => setFilterResult(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="">All Results</option>
                        <option value="DEAL">DEAL</option>
                        <option value="NO DEAL">NO DEAL</option>
                        <option value="Negotiating">Negotiating</option>
                        <option value="Scheduled">Scheduled</option>
                      </select>
                    </div>

                    {/* Agent Name Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="filter-agent-name" className="text-xs">Agent Name</Label>
                      <Input
                        id="filter-agent-name"
                        placeholder="e.g. John Doe..."
                        value={filterAgentName}
                        onChange={(e) => setFilterAgentName(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    {/* Month Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="filter-month" className="text-xs">Month</Label>
                      <select
                        id="filter-month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="">All Months</option>
                        <option value="2025-01">January 2025</option>
                        <option value="2025-02">February 2025</option>
                        <option value="2025-03">March 2025</option>
                        <option value="2025-04">April 2025</option>
                        <option value="2025-05">May 2025</option>
                        <option value="2025-06">June 2025</option>
                        <option value="2025-07">July 2025</option>
                        <option value="2025-08">August 2025</option>
                        <option value="2025-09">September 2025</option>
                        <option value="2025-10">October 2025</option>
                        <option value="2025-11">November 2025</option>
                        <option value="2025-12">December 2025</option>
                        <option value="2026-01">January 2026</option>
                        <option value="2026-02">February 2026</option>
                        <option value="2026-03">March 2026</option>
                        <option value="2026-04">April 2026</option>
                        <option value="2026-05">May 2026</option>
                        <option value="2026-06">June 2026</option>
                        <option value="2026-07">July 2026</option>
                        <option value="2026-08">August 2026</option>
                        <option value="2026-09">September 2026</option>
                        <option value="2026-10">October 2026</option>
                        <option value="2026-11">November 2026</option>
                        <option value="2026-12">December 2026</option>
                      </select>
                    </div>

                    <Button 
                      onClick={() => setIsTeamFilterOpen(false)} 
                      className="w-full"
                      size="sm"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-blue-50">
                    {teamColumns.map((col) => (
                      <th key={col} className="px-2 sm:px-3 py-2 text-left font-semibold text-blue-700 border-b text-xs sm:text-sm whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamLoading ? (
                    <tr>
                      <td colSpan={teamColumns.length} className="text-center py-8 text-muted-foreground">
                        Loading team viewings...
                      </td>
                    </tr>
                  ) : teamViewings.length === 0 ? (
                    <tr>
                      <td colSpan={teamColumns.length} className="text-center py-8 text-muted-foreground">
                        No team viewings found.
                      </td>
                    </tr>
                  ) : filteredTeamViewings.length === 0 ? (
                    <tr>
                      <td colSpan={teamColumns.length} className="text-center py-8">
                        <p className="text-muted-foreground mb-4">No viewings match your filters</p>
                        <Button variant="outline" size="sm" onClick={clearTeamFilters}>
                          Clear Filters
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    paginatedTeamViewings.map((viewing, idx: number) => (
                      <tr 
                        key={viewing.id} 
                        className="border-b hover:bg-blue-50"
                      >
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm">{(teamPage - 1) * pageSize + idx + 1}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium">{viewing.agent_name}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                          {viewing.created_at ? new Date(viewing.created_at).toLocaleDateString('en-GB') : ''}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{viewing.city}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                          {viewing.viewing_date ? new Date(viewing.viewing_date).toLocaleDateString('en-GB') : ''}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{viewing.viewing_time ? viewing.viewing_time.substring(0, 5) : ''}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{viewing.client_name}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm">
                          <span 
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              viewing.result === 'DEAL' ? 'bg-green-100 text-green-800' :
                              viewing.result === 'NO DEAL' ? 'bg-red-100 text-red-800' :
                              viewing.result === 'Negotiating' ? 'bg-blue-100 text-blue-800' :
                              viewing.result === 'Scheduled' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {viewing.result}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm max-w-[100px] sm:max-w-[150px] truncate" title={viewing.comments || undefined}>
                          {viewing.comments}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Team Pagination Controls */}
            <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={teamPage === 1} onClick={() => setTeamPage(1)} className="text-xs sm:text-sm px-2 sm:px-3">
                First
              </Button>
              <Button variant="outline" size="sm" disabled={teamPage === 1} onClick={() => setTeamPage(teamPage - 1)} className="text-xs sm:text-sm px-2 sm:px-3">
                Prev
              </Button>
              {Array.from({ length: Math.min(teamPageCountFiltered, 5) }, (_, i) => {
                const pageNum = teamPage <= 3 ? i + 1 : teamPage + i - 2;
                if (pageNum > teamPageCountFiltered) return null;
                return (
                  <Button
                    key={pageNum}
                    variant={teamPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTeamPage(pageNum)}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" disabled={teamPage === teamPageCountFiltered} onClick={() => setTeamPage(teamPage + 1)} className="text-xs sm:text-sm px-2 sm:px-3">
                Next
              </Button>
              <Button variant="outline" size="sm" disabled={teamPage === teamPageCountFiltered} onClick={() => setTeamPage(teamPageCountFiltered)} className="text-xs sm:text-sm px-2 sm:px-3">
                Last
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
