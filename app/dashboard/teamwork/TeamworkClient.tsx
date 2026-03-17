"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, FileText, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDashboardUrl } from '@/lib/hooks/useDashboardUrl';

interface TeamworkListing {
  id: string;
  city: string;
  price: number;
  bedroom: number;
  bathroom: number;
  property_type: string;
  description: string;
  available_date?: string;
  agent_name: string;
  teamwork_date: string;
}

interface TeamworkClient {
  id: string;
  people: string;
  bedroom: string;
  cities: string;
  family_sharing: string;
  nationalities: string;
  jobs: string;
  pet: string;
  budget: string;
  move_in: string;
  agent_name: string;
  teamwork_date: string;
}

export default function TeamworkClient() {
  const { toast } = useToast();
  const { dashboardUrl } = useDashboardUrl();
  
  const [teamworkListings, setTeamworkListings] = useState<TeamworkListing[]>([]);
  const [teamworkClients, setTeamworkClients] = useState<TeamworkClient[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [descModal, setDescModal] = useState<string | null>(null);
  
  // Pagination states
  const [listingsPage, setListingsPage] = useState(1);
  const [clientsPage, setClientsPage] = useState(1);
  const itemsPerPage = 15;

  // Filter states for Listings
  const [filterCity, setFilterCity] = useState('');
  const [filterBedrooms, setFilterBedrooms] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter states for Clients
  const [filterClientCity, setFilterClientCity] = useState('');
  const [filterClientBedroom, setFilterClientBedroom] = useState('');
  const [filterClientBudgetMin, setFilterClientBudgetMin] = useState('');
  const [filterClientBudgetMax, setFilterClientBudgetMax] = useState('');
  const [filterClientAgent, setFilterClientAgent] = useState('');
  const [isClientFilterOpen, setIsClientFilterOpen] = useState(false);

  // Fetch teamwork listings with pagination
  useEffect(() => {
    async function fetchTeamworkListings() {
      setListingsLoading(true);
      try {
        const response = await fetch('/api/teamwork/listings');
        const result = await response.json();
        if (result.success) {
          const allListings = result.data || [];
          setTeamworkListings(allListings);
        }
      } catch (error) {
        console.error('Error fetching teamwork listings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load teamwork listings',
          variant: 'destructive',
        });
      } finally {
        setListingsLoading(false);
      }
    }
    fetchTeamworkListings();
  }, [toast]);

  // Fetch teamwork clients with pagination
  useEffect(() => {
    async function fetchTeamworkClients() {
      setClientsLoading(true);
      try {
        const response = await fetch('/api/teamwork/clients');
        const result = await response.json();
        if (result.success) {
          const allClients = result.data || [];
          setTeamworkClients(allClients);
        }
      } catch (error) {
        console.error('Error fetching teamwork clients:', error);
        toast({
          title: 'Error',
          description: 'Failed to load teamwork clients',
          variant: 'destructive',
        });
      } finally {
        setClientsLoading(false);
      }
    }
    fetchTeamworkClients();
  }, [toast]);

  // Apply filters to listings
  const filteredListings = teamworkListings.filter(listing => {
    // City filter
    if (filterCity && !listing.city?.toLowerCase().includes(filterCity.toLowerCase())) {
      return false;
    }
    
    // Bedrooms filter
    if (filterBedrooms && listing.bedroom !== parseInt(filterBedrooms)) {
      return false;
    }
    
    // Price range filter
    if (filterPriceMin && listing.price < parseInt(filterPriceMin)) {
      return false;
    }
    if (filterPriceMax && listing.price > parseInt(filterPriceMax)) {
      return false;
    }
    
    // Agent filter
    if (filterAgent && !listing.agent_name?.toLowerCase().includes(filterAgent.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Apply filters to clients
  const filteredClients = teamworkClients.filter(client => {
    // City filter (checks if any city in the cities string matches)
    if (filterClientCity && !client.cities?.toLowerCase().includes(filterClientCity.toLowerCase())) {
      return false;
    }
    
    // Bedroom filter
    if (filterClientBedroom && client.bedroom !== filterClientBedroom) {
      return false;
    }
    
    // Budget range filter (parse budget string like "€800-€1000" or "€1200")
    if (filterClientBudgetMin || filterClientBudgetMax) {
      const budgetMatch = client.budget?.match(/€?(\d+)/);
      if (budgetMatch) {
        const clientBudget = parseInt(budgetMatch[1]);
        if (filterClientBudgetMin && clientBudget < parseInt(filterClientBudgetMin)) {
          return false;
        }
        if (filterClientBudgetMax && clientBudget > parseInt(filterClientBudgetMax)) {
          return false;
        }
      }
    }
    
    // Agent filter
    if (filterClientAgent && !client.agent_name?.toLowerCase().includes(filterClientAgent.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setListingsPage(1);
  }, [filterCity, filterBedrooms, filterPriceMin, filterPriceMax, filterAgent]);

  useEffect(() => {
    setClientsPage(1);
  }, [filterClientCity, filterClientBedroom, filterClientBudgetMin, filterClientBudgetMax, filterClientAgent]);

  // Calculate pagination
  const listingsTotalPages = Math.ceil(filteredListings.length / itemsPerPage);
  const clientsTotalPages = Math.ceil(filteredClients.length / itemsPerPage);
  
  const paginatedListings = filteredListings.slice(
    (listingsPage - 1) * itemsPerPage,
    listingsPage * itemsPerPage
  );
  
  const paginatedClients = filteredClients.slice(
    (clientsPage - 1) * itemsPerPage,
    clientsPage * itemsPerPage
  );

  // Clear all filters
  const clearFilters = () => {
    setFilterCity('');
    setFilterBedrooms('');
    setFilterPriceMin('');
    setFilterPriceMax('');
    setFilterAgent('');
  };

  const clearClientFilters = () => {
    setFilterClientCity('');
    setFilterClientBedroom('');
    setFilterClientBudgetMin('');
    setFilterClientBudgetMax('');
    setFilterClientAgent('');
  };

  // Check if any filter is active
  const hasActiveFilters = filterCity || filterBedrooms || filterPriceMin || filterPriceMax || filterAgent;
  const hasActiveClientFilters = filterClientCity || filterClientBedroom || filterClientBudgetMin || filterClientBudgetMax || filterClientAgent;

  return (
    <div className="relative min-h-screen">
      <div className="pt-8 container mx-auto px-4 md:px-8 lg:px-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Teamwork</h1>
          <p className="text-muted-foreground mt-2">
            Collaborate with your teammates and maximize your revenue
          </p>
        </div>

        {/* Teamwork Listings Table */}
        <div className="mb-8 relative">
          <Link href={dashboardUrl} className="absolute -top-14 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 z-10">
            <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
            </svg>
            Dashboard
          </Link>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-6 w-6 text-purple-600" />
                    <span>Teamwork Listings</span>
                  </CardTitle>
                  <CardDescription>
                    Listings shared with you by your team members
                    {hasActiveFilters && (
                      <span className="ml-2 text-purple-600 font-medium">
                        ({filteredListings.length} filtered)
                      </span>
                    )}
                  </CardDescription>
                </div>
                
                {/* Filter Button */}
                <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant={hasActiveFilters ? "default" : "outline"} 
                      size="sm"
                      className="gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      Filter
                      {hasActiveFilters && (
                        <span className="ml-1 bg-white text-purple-600 rounded-full px-2 py-0.5 text-xs font-semibold">
                          {[filterCity, filterBedrooms, filterPriceMin || filterPriceMax, filterAgent].filter(Boolean).length}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Filter Listings</h4>
                        {hasActiveFilters && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={clearFilters}
                            className="h-auto p-1 text-xs"
                          >
                            Clear all
                          </Button>
                        )}
                      </div>

                      {/* City Filter */}
                      <div className="space-y-2">
                        <Label htmlFor="filter-city" className="text-xs">City</Label>
                        <Input
                          id="filter-city"
                          placeholder="e.g. Gzira, Sliema..."
                          value={filterCity}
                          onChange={(e) => setFilterCity(e.target.value)}
                          className="h-9"
                        />
                      </div>

                      {/* Bedrooms Filter */}
                      <div className="space-y-2">
                        <Label htmlFor="filter-bedrooms" className="text-xs">Bedrooms</Label>
                        <Input
                          id="filter-bedrooms"
                          type="number"
                          placeholder="Number of bedrooms"
                          value={filterBedrooms}
                          onChange={(e) => setFilterBedrooms(e.target.value)}
                          className="h-9"
                          min="1"
                        />
                      </div>

                      {/* Price Range Filter */}
                      <div className="space-y-2">
                        <Label className="text-xs">Price Range (€)</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Min"
                            value={filterPriceMin}
                            onChange={(e) => setFilterPriceMin(e.target.value)}
                            className="h-9"
                            min="0"
                          />
                          <Input
                            type="number"
                            placeholder="Max"
                            value={filterPriceMax}
                            onChange={(e) => setFilterPriceMax(e.target.value)}
                            className="h-9"
                            min="0"
                          />
                        </div>
                      </div>

                      {/* Agent Filter */}
                      <div className="space-y-2">
                        <Label htmlFor="filter-agent" className="text-xs">Agent Name</Label>
                        <Input
                          id="filter-agent"
                          placeholder="e.g. John Doe..."
                          value={filterAgent}
                          onChange={(e) => setFilterAgent(e.target.value)}
                          className="h-9"
                        />
                      </div>

                      <Button 
                        onClick={() => setIsFilterOpen(false)} 
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
            {listingsLoading ? (
              <p className="text-muted-foreground">Loading teamwork listings...</p>
            ) : teamworkListings.length === 0 ? (
              <p className="text-muted-foreground">No teamwork listings yet. Your team members will share listings here.</p>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No listings match your filters</p>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Teamwork Date</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Bedrooms</TableHead>
                      <TableHead>Bathrooms</TableHead>
                      <TableHead>Property Type</TableHead>
                      <TableHead>Available Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Agent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedListings.map((listing, index) => (
                      <TableRow key={listing.id}>
                        <TableCell className="font-medium">{(listingsPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          {new Date(listing.teamwork_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{listing.city}</TableCell>
                        <TableCell>€{listing.price?.toLocaleString()}</TableCell>
                        <TableCell>{listing.bedroom}</TableCell>
                        <TableCell>{listing.bathroom}</TableCell>
                        <TableCell>{listing.property_type}</TableCell>
                        <TableCell>
                          {listing.available_date ? new Date(listing.available_date + 'T00:00:00').toLocaleDateString('en-GB') : '—'}
                        </TableCell>
                        <TableCell 
                          className="max-w-xs truncate cursor-pointer hover:text-purple-600"
                          onClick={() => listing.description && setDescModal(listing.description)}
                        >
                          {listing.description}
                        </TableCell>
                        <TableCell>{listing.agent_name || 'Unknown'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Listings Pagination */}
                {listingsTotalPages > 1 && (
                  <div className="flex items-center justify-center space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setListingsPage(1)}
                      disabled={listingsPage === 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setListingsPage(listingsPage - 1)}
                      disabled={listingsPage === 1}
                    >
                      Prev
                    </Button>
                    {Array.from({ length: listingsTotalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={listingsPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setListingsPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setListingsPage(listingsPage + 1)}
                      disabled={listingsPage === listingsTotalPages}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setListingsPage(listingsTotalPages)}
                      disabled={listingsPage === listingsTotalPages}
                    >
                      Last
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Teamwork Clients Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-purple-600" />
                  <span>Teamwork Clients</span>
                </CardTitle>
                <CardDescription>
                  Clients shared with you by your team members
                  {hasActiveClientFilters && (
                    <span className="ml-2 text-purple-600 font-medium">
                      ({filteredClients.length} filtered)
                    </span>
                  )}
                </CardDescription>
              </div>
              
              {/* Filter Button for Clients */}
              <Popover open={isClientFilterOpen} onOpenChange={setIsClientFilterOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant={hasActiveClientFilters ? "default" : "outline"} 
                    size="sm"
                    className="gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Filter
                    {hasActiveClientFilters && (
                      <span className="ml-1 bg-white text-purple-600 rounded-full px-2 py-0.5 text-xs font-semibold">
                        {[filterClientCity, filterClientBedroom, filterClientBudgetMin || filterClientBudgetMax, filterClientAgent].filter(Boolean).length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Filter Clients</h4>
                      {hasActiveClientFilters && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearClientFilters}
                          className="h-auto p-1 text-xs"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>

                    {/* City Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="filter-client-city" className="text-xs">Cities</Label>
                      <Input
                        id="filter-client-city"
                        placeholder="e.g. Gzira, Sliema..."
                        value={filterClientCity}
                        onChange={(e) => setFilterClientCity(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    {/* Bedroom Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="filter-client-bedroom" className="text-xs">Bedroom</Label>
                      <Input
                        id="filter-client-bedroom"
                        placeholder="e.g. 1, 2, 3..."
                        value={filterClientBedroom}
                        onChange={(e) => setFilterClientBedroom(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    {/* Budget Range Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs">Budget Range (€)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={filterClientBudgetMin}
                          onChange={(e) => setFilterClientBudgetMin(e.target.value)}
                          className="h-9"
                          min="0"
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={filterClientBudgetMax}
                          onChange={(e) => setFilterClientBudgetMax(e.target.value)}
                          className="h-9"
                          min="0"
                        />
                      </div>
                    </div>

                    {/* Agent Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="filter-client-agent" className="text-xs">Agent Name</Label>
                      <Input
                        id="filter-client-agent"
                        placeholder="e.g. John Doe..."
                        value={filterClientAgent}
                        onChange={(e) => setFilterClientAgent(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    <Button 
                      onClick={() => setIsClientFilterOpen(false)} 
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
            {clientsLoading ? (
              <p className="text-muted-foreground">Loading teamwork clients...</p>
            ) : teamworkClients.length === 0 ? (
              <p className="text-muted-foreground">No teamwork clients yet. Your team members will share clients here.</p>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No clients match your filters</p>
                <Button variant="outline" size="sm" onClick={clearClientFilters}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Teamwork Date</TableHead>
                      <TableHead>Bedroom</TableHead>
                      <TableHead>Cities</TableHead>
                      <TableHead>Family/Sharing</TableHead>
                      <TableHead>People</TableHead>
                      <TableHead>Nationalities</TableHead>
                      <TableHead className="w-20 max-w-[80px]">Jobs</TableHead>
                      <TableHead>Pet</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Move In</TableHead>
                      <TableHead>Agent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClients.map((client, index) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{(clientsPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          {new Date(client.teamwork_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{client.bedroom}</TableCell>
                        <TableCell>{client.cities}</TableCell>
                        <TableCell>{client.family_sharing}</TableCell>
                        <TableCell>{client.people}</TableCell>
                        <TableCell>{client.nationalities}</TableCell>
                        <TableCell 
                          className="max-w-[80px] truncate cursor-pointer hover:text-purple-600"
                          onClick={() => client.jobs && setDescModal(client.jobs)}
                        >
                          {client.jobs}
                        </TableCell>
                        <TableCell>{client.pet}</TableCell>
                        <TableCell>{client.budget}</TableCell>
                        <TableCell>
                          {client.move_in ? new Date(client.move_in).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>{client.agent_name || 'Unknown'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Clients Pagination */}
                {clientsTotalPages > 1 && (
                  <div className="flex items-center justify-center space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setClientsPage(1)}
                      disabled={clientsPage === 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setClientsPage(clientsPage - 1)}
                      disabled={clientsPage === 1}
                    >
                      Prev
                    </Button>
                    {Array.from({ length: clientsTotalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={clientsPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setClientsPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setClientsPage(clientsPage + 1)}
                      disabled={clientsPage === clientsTotalPages}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setClientsPage(clientsTotalPages)}
                      disabled={clientsPage === clientsTotalPages}
                    >
                      Last
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description Modal */}
      {descModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div 
            className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
              onClick={() => setDescModal(null)}
              aria-label="Close"
            >✕</button>
            <div className="text-base whitespace-pre-line max-h-[60vh] overflow-auto">
              {descModal}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
