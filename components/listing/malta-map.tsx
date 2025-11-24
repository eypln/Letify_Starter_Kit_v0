"use client";

import { useEffect, useRef, useState } from 'react';

// Malta cities coordinates
const MALTA_CITIES: Record<string, { lat: number; lng: number }> = {
  "Attard": { lat: 35.8897, lng: 14.4425 },
  "Balzan": { lat: 35.9003, lng: 14.4553 },
  "Birgu": { lat: 35.8875, lng: 14.5219 },
  "Birkirkara": { lat: 35.8972, lng: 14.4611 },
  "Birżebbuġa": { lat: 35.8258, lng: 14.5278 },
  "Bormla": { lat: 35.8878, lng: 14.5169 },
  "Dingli": { lat: 35.8614, lng: 14.3828 },
  "Fgura": { lat: 35.8719, lng: 14.5136 },
  "Floriana": { lat: 35.8958, lng: 14.5058 },
  "Għargħur": { lat: 35.9236, lng: 14.4522 },
  "Għaxaq": { lat: 35.8511, lng: 14.5158 },
  "Gudja": { lat: 35.8492, lng: 14.5025 },
  "Gżira": { lat: 35.9069, lng: 14.4958 },
  "Ħamrun": { lat: 35.8844, lng: 14.4889 },
  "Iklin": { lat: 35.9092, lng: 14.4558 },
  "Isla": { lat: 35.8869, lng: 14.5133 },
  "Kalkara": { lat: 35.8908, lng: 14.5314 },
  "Kirkop": { lat: 35.8422, lng: 14.4853 },
  "Lija": { lat: 35.9008, lng: 14.4472 },
  "Luqa": { lat: 35.8589, lng: 14.4881 },
  "Marsa": { lat: 35.8797, lng: 14.4969 },
  "Marsaskala": { lat: 35.8619, lng: 14.5647 },
  "Marsaxlokk": { lat: 35.8419, lng: 14.5431 },
  "Mdina": { lat: 35.8867, lng: 14.4031 },
  "Mellieħa": { lat: 35.9564, lng: 14.3622 },
  "Mġarr": { lat: 35.9206, lng: 14.3669 },
  "Mosta": { lat: 35.9094, lng: 14.4256 },
  "Mqabba": { lat: 35.8461, lng: 14.4681 },
  "Msida": { lat: 35.8967, lng: 14.4878 },
  "Mtarfa": { lat: 35.8886, lng: 14.3989 },
  "Bugibba": { lat: 35.9478, lng: 14.4128 },
  "Naxxar": { lat: 35.9122, lng: 14.4436 },
  "Paola": { lat: 35.8733, lng: 14.5031 },
  "Pembroke": { lat: 35.9311, lng: 14.4764 },
  "Pietà": { lat: 35.8947, lng: 14.4953 },
  "Qawra": { lat: 35.9506, lng: 14.4194 },
  "Qormi": { lat: 35.8764, lng: 14.4714 },
  "Qrendi": { lat: 35.8347, lng: 14.4522 },
  "Rabat": { lat: 35.8822, lng: 14.3994 },
  "Safi": { lat: 35.8353, lng: 14.4864 },
  "San Ġiljan": { lat: 35.9186, lng: 14.4911 },
  "San Ġwann": { lat: 35.9089, lng: 14.4756 },
  "San Pawl il-Baħar": { lat: 35.9503, lng: 14.4158 },
  "Santa Luċija": { lat: 35.8625, lng: 14.5078 },
  "Santa Venera": { lat: 35.8906, lng: 14.4758 },
  "Siġġiewi": { lat: 35.8550, lng: 14.4369 },
  "Sliema": { lat: 35.9125, lng: 14.5019 },
  "St. Julian's": { lat: 35.9186, lng: 14.4911 },
  "St. Paul's Bay": { lat: 35.9503, lng: 14.4158 },
  "Swieqi": { lat: 35.9222, lng: 14.4808 },
  "Ta' Xbiex": { lat: 35.8994, lng: 14.4953 },
  "Tarxien": { lat: 35.8656, lng: 14.5139 },
  "Valletta": { lat: 35.8989, lng: 14.5147 },
  "Xagħra": { lat: 36.0506, lng: 14.2653 },
  "Xewkija": { lat: 36.0336, lng: 14.2589 },
  "Xgħajra": { lat: 35.8858, lng: 14.5469 },
  "Żabbar": { lat: 35.8761, lng: 14.5403 },
  "Żebbuġ": { lat: 35.8728, lng: 14.4403 },
  "Żejtun": { lat: 35.8558, lng: 14.5342 },
  "Żurrieq": { lat: 35.8314, lng: 14.4742 }
};

interface MaltaMapProps {
  listings: Array<{
    id: string;
    city: string;
    title: string;
    availability: 'Available' | 'Rented' | 'Soon';
  }>;
}

interface Marker extends google.maps.Marker {
  infoWindow?: google.maps.InfoWindow;
}

export default function MaltaMap({ listings }: MaltaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load Google Maps script only once
    if (typeof window === 'undefined') return;
    
    if (!window.google) {
      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => setIsLoaded(true));
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsLoaded(true);
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
      };
      document.head.appendChild(script);
    } else if (window.google.maps) {
      // Google Maps already loaded - schedule state update
      Promise.resolve().then(() => setIsLoaded(true));
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    // Initialize map centered on Malta
    if (!googleMapRef.current) {
      googleMapRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: 35.9, lng: 14.45 },
        zoom: 11,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Group listings by city
    const listingsByCity: Record<string, typeof listings> = {};
    listings
      .filter(listing => listing.availability === 'Available' || listing.availability === 'Soon')
      .forEach(listing => {
        if (!listingsByCity[listing.city]) {
          listingsByCity[listing.city] = [];
        }
        listingsByCity[listing.city].push(listing);
      });

    // Create markers for each city with listings
    Object.entries(listingsByCity).forEach(([city, cityListings]) => {
      const coords = MALTA_CITIES[city];
      if (!coords) return;

      // Determine marker color based on availability mix
      const hasAvailable = cityListings.some(l => l.availability === 'Available');
      const hasSoon = cityListings.some(l => l.availability === 'Soon');
      
      let markerColor = '#10b981'; // green for Available
      if (hasAvailable && hasSoon) {
        markerColor = '#3b82f6'; // blue if mixed
      } else if (hasSoon && !hasAvailable) {
        markerColor = '#3b82f6'; // blue for Soon only
      }

      // Create marker
      const marker = new google.maps.Marker({
        position: coords,
        map: googleMapRef.current,
        title: city,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: markerColor,
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      // Create info window with listing details
      const infoContent = `
        <div style="padding: 8px; max-width: 200px;">
          <h3 style="font-weight: bold; margin-bottom: 8px; color: #7c3aed;">${city}</h3>
          <div style="font-size: 12px;">
            ${cityListings.map(listing => {
              const bgColor = listing.availability === 'Available' ? '#d1fae5' : '#dbeafe';
              const textColor = listing.availability === 'Available' ? '#065f46' : '#1e40af';
              return `
                <div style="margin-bottom: 4px; padding: 4px; background: ${bgColor}; border-radius: 4px;">
                  <span style="font-weight: 600; color: ${textColor};">${listing.title}</span>
                  <span style="margin-left: 4px; color: ${textColor}; font-size: 10px;">(${listing.availability})</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: infoContent,
      });

      marker.addListener('click', () => {
        // Close all other info windows
        markersRef.current.forEach((m) => {
          if (m.infoWindow) {
            m.infoWindow.close();
          }
        });
        infoWindow.open(googleMapRef.current, marker);
      });

      // Store info window reference
      const markerWithInfo = marker as Marker;
      markerWithInfo.infoWindow = infoWindow;

      markersRef.current.push(markerWithInfo);
    });
  }, [isLoaded, listings]);

  return (
    <div className="w-full h-[400px] sm:h-[500px] md:h-[600px] rounded-lg overflow-hidden border border-gray-300 shadow-lg">
      {!isLoaded && (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Malta Map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
