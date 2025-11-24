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
import { Users, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface TeamworkListing {
  id: string;
  city: string;
  price: number;
  bedroom: number;
  bathroom: number;
  property_type: string;
  description: string;
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
  
  const [teamworkListings, setTeamworkListings] = useState<TeamworkListing[]>([]);
  const [teamworkClients, setTeamworkClients] = useState<TeamworkClient[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [descModal, setDescModal] = useState<string | null>(null);
  
  // Pagination states
  const [listingsPage, setListingsPage] = useState(1);
  const [clientsPage, setClientsPage] = useState(1);
  const [totalListings, setTotalListings] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const itemsPerPage = 10;

  // Fetch teamwork listings with pagination
  useEffect(() => {
    async function fetchTeamworkListings() {
      setListingsLoading(true);
      try {
        const response = await fetch('/api/teamwork/listings');
        const result = await response.json();
        if (result.success) {
          const allListings = result.data || [];
          setTotalListings(allListings.length);
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
          setTotalClients(allClients.length);
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

  // Calculate pagination
  const listingsTotalPages = Math.ceil(totalListings / itemsPerPage);
  const clientsTotalPages = Math.ceil(totalClients / itemsPerPage);
  
  const paginatedListings = teamworkListings.slice(
    (listingsPage - 1) * itemsPerPage,
    listingsPage * itemsPerPage
  );
  
  const paginatedClients = teamworkClients.slice(
    (clientsPage - 1) * itemsPerPage,
    clientsPage * itemsPerPage
  );

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
          <Link href="/dashboard" className="absolute -top-14 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 z-10">
            <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
            </svg>
            Dashboard
          </Link>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-6 w-6 text-purple-600" />
                <span>Teamwork Listings</span>
              </CardTitle>
            <CardDescription>
              Listings shared with you by your team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listingsLoading ? (
              <p className="text-muted-foreground">Loading teamwork listings...</p>
            ) : teamworkListings.length === 0 ? (
              <p className="text-muted-foreground">No teamwork listings yet. Your team members will share listings here.</p>
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
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-purple-600" />
              <span>Teamwork Clients</span>
            </CardTitle>
            <CardDescription>
              Clients shared with you by your team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clientsLoading ? (
              <p className="text-muted-foreground">Loading teamwork clients...</p>
            ) : teamworkClients.length === 0 ? (
              <p className="text-muted-foreground">No teamwork clients yet. Your team members will share clients here.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Teamwork Date</TableHead>
                      <TableHead>People</TableHead>
                      <TableHead>Bedroom</TableHead>
                      <TableHead>Cities</TableHead>
                      <TableHead>Family/Sharing</TableHead>
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
                        <TableCell>{client.people}</TableCell>
                        <TableCell>{client.bedroom}</TableCell>
                        <TableCell>{client.cities}</TableCell>
                        <TableCell>{client.family_sharing}</TableCell>
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
