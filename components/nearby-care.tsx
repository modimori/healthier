"use client";

import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ExternalLink,
  LoaderCircle,
  MapPin,
  Navigation,
  Phone,
  Search,
  Globe,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { useLocale } from "@/components/providers";

type LatLng = {
  lat: number;
  lon: number;
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type Place = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
  address?: string;
  phone?: string;
  website?: string;
  amenity?: string;
  typeLabel: string;
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(R * c * 10) / 10;
}

function buildAddress(tags: Record<string, string> = {}): string | undefined {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
    tags["addr:postcode"],
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return tags["contact:address"] || tags["addr:full"] || undefined;
}

function getTypeLabel(tags: Record<string, string> = {}, locale: string): string {
  if (tags.amenity === "doctors") return locale === "ar" ? "طبيب" : "Doctor";
  if (tags.amenity === "clinic") return locale === "ar" ? "عيادة" : "Clinic";
  if (tags.amenity === "hospital") return locale === "ar" ? "مستشفى" : "Hospital";
  if (tags.amenity === "pharmacy") return locale === "ar" ? "صيدلية" : "Pharmacy";
  if (tags.healthcare === "doctor")
    return locale === "ar" ? "طبيب" : "Doctor";
  if (tags.healthcare === "clinic")
    return locale === "ar" ? "عيادة" : "Clinic";
  if (tags.healthcare === "centre" || tags.healthcare === "center")
    return locale === "ar" ? "مركز طبي" : "Medical center";
  if (tags.healthcare === "hospital")
    return locale === "ar" ? "مستشفى" : "Hospital";
  return locale === "ar" ? "رعاية صحية" : "Healthcare";
}

function buildOverpassQuery(lat: number, lon: number, radiusM: number): string {
  return `[out:json][timeout:25];
(
  node["amenity"~"doctors|clinic|hospital|pharmacy"](around:${radiusM},${lat},${lon});
  way["amenity"~"doctors|clinic|hospital|pharmacy"](around:${radiusM},${lat},${lon});
  relation["amenity"~"doctors|clinic|hospital|pharmacy"](around:${radiusM},${lat},${lon});
  node["healthcare"~"doctor|clinic|centre|center|hospital"](around:${radiusM},${lat},${lon});
  way["healthcare"~"doctor|clinic|centre|center|hospital"](around:${radiusM},${lat},${lon});
  relation["healthcare"~"doctor|clinic|centre|center|hospital"](around:${radiusM},${lat},${lon});
);
out center tags;`;
}

export function NearbyCare() {
  const { locale, t, tn } = useLocale();
  const [position, setPosition] = useState<LatLng | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [places, setPlaces] = useState<Place[]>([]);
  const [status, setStatus] = useState<
    "idle" | "locating" | "searching" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const canLocate = typeof navigator !== "undefined" && "geolocation" in navigator;

  const requestLocation = useCallback(() => {
    if (!canLocate) {
      setError(tn.geolocationUnsupported);
      setStatus("error");
      return;
    }

    setStatus("locating");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (coords) => {
        setPosition({
          lat: coords.coords.latitude,
          lon: coords.coords.longitude,
        });
        setStatus("idle");
      },
      (err) => {
        if (err.code === 1) {
          setError(tn.permissionDenied);
        } else {
          setError(tn.errorGeneric);
        }
        setStatus("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  }, [canLocate, tn]);

  const searchNearby = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!position) {
        requestLocation();
        return;
      }

      setStatus("searching");
      setError(null);
      setPlaces([]);

      const radiusM = Math.round(radiusKm * 1000);
      const query = buildOverpassQuery(position.lat, position.lon, radiusM);

      let lastError: unknown = null;

      for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body: `data=${encodeURIComponent(query)}`,
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error(`overpass_${response.status}`);
          }

          const data = (await response.json()) as {
            elements?: OverpassElement[];
          };

          const elements = data.elements || [];
          const results: Place[] = [];

          for (const element of elements) {
            const tags = element.tags || {};
            const name = tags.name || tags["name:en"] || tags.operator;

            if (!name) continue;

            const lat = element.lat ?? element.center?.lat;
            const lon = element.lon ?? element.center?.lon;

            if (typeof lat !== "number" || typeof lon !== "number") continue;

            const distanceKm = haversineKm(position, { lat, lon });
            const address = buildAddress(tags);
            const phone = tags.phone || tags["contact:phone"] || tags.mobile;
            const website = tags.website || tags["contact:website"] || tags.url;
            const amenity = tags.amenity || tags.healthcare;
            const typeLabel = getTypeLabel(tags, locale);

            results.push({
              id: `${element.type}/${element.id}`,
              name,
              lat,
              lon,
              distanceKm,
              address,
              phone,
              website,
              amenity,
              typeLabel,
            });
          }

          results.sort((a, b) => a.distanceKm - b.distanceKm);
          const deduped = results
            .filter(
              (place, index, array) =>
                array.findIndex((item) => item.name === place.name) === index,
            )
            .slice(0, 40);

          setPlaces(deduped);

          if (deduped.length === 0) {
            setError(tn.noResults);
            setStatus("error");
          } else {
            setStatus("idle");
          }

          return;
        } catch (fetchError) {
          lastError = fetchError;
        }
      }

      console.error("Nearby care search failed:", lastError);
      setError(tn.errorGeneric);
      setStatus("error");
    },
    [locale, position, radiusKm, requestLocation, tn],
  );

  const facebookSearchUrl = useMemo(() => {
    if (places.length === 0) return null;
    const query = encodeURIComponent(places[0].name);
    return `https://www.facebook.com/search/top/?q=${query}`;
  }, [places]);

  return (
    <div className="page nearby-page">
      <header className="page-heading nearby-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-dot" />
            {tn.eyebrow}
          </p>
          <h1>{tn.title}</h1>
          <p className="page-subtitle">{tn.subtitle}</p>
        </div>
      </header>

      <div className="nearby-layout">
        <section className="nearby-panel">
          <form className="nearby-controls" onSubmit={searchNearby}>
            <div className="nearby-control-row">
              <button
                type="button"
                className="button button--dark button--small"
                onClick={requestLocation}
                disabled={status === "locating"}
              >
                {status === "locating" ? (
                  <LoaderCircle size={15} strokeWidth={2} className="spin" />
                ) : (
                  <Navigation size={15} strokeWidth={1.8} />
                )}
                {status === "locating" ? tn.locating : tn.useLocation}
              </button>
              {position && (
                <span className="nearby-coords">
                  <MapPin size={14} strokeWidth={1.8} />
                  {position.lat.toFixed(4)}, {position.lon.toFixed(4)}
                </span>
              )}
            </div>

            <div className="nearby-control-row nearby-control-row--split">
              <label className="nearby-radius">
                <span>{tn.radius}</span>
                <select
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(Number(event.target.value))}
                >
                  <option value={2}>2 {tn.radiusKm}</option>
                  <option value={3}>3 {tn.radiusKm}</option>
                  <option value={5}>5 {tn.radiusKm}</option>
                  <option value={10}>10 {tn.radiusKm}</option>
                  <option value={15}>15 {tn.radiusKm}</option>
                </select>
              </label>
              <button
                type="submit"
                className="button button--light button--small"
                disabled={!position || status === "searching"}
              >
                {status === "searching" ? (
                  <LoaderCircle size={15} strokeWidth={2} className="spin" />
                ) : (
                  <Search size={15} strokeWidth={1.8} />
                )}
                {status === "searching" ? tn.searching : tn.search}
              </button>
            </div>
          </form>

          {error && (
            <div className="nearby-alert" role="status">
              <span>{error}</span>
            </div>
          )}

          {places.length === 0 && status !== "searching" && !error && (
            <div className="nearby-empty">
              <div className="nearby-empty-icon">
                <BrandMark />
              </div>
              <h2>{tn.emptyTitle}</h2>
              <p>{tn.emptyBody}</p>
            </div>
          )}

          {places.length > 0 && (
            <div className="nearby-results">
              <div className="nearby-results-header">
                <h2>
                  {tn.results} <span>({places.length})</span>
                </h2>
                {facebookSearchUrl && (
                  <a
                    className="button button--outline-dark button--small"
                    href={facebookSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span aria-hidden="true">f</span>
                    {tn.searchFacebook}
                  </a>
                )}
              </div>
              <div className="nearby-list">
                {places.map((place) => {
                  const mapUrl = `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=16/${place.lat}/${place.lon}`;
                  const facebookUrl = `https://www.facebook.com/search/top/?q=${encodeURIComponent(place.name)}`;
                  return (
                    <article className="nearby-card" key={place.id}>
                      <div className="nearby-card-top">
                        <div>
                          <div className="nearby-card-badges">
                            <span className="nearby-badge">{place.typeLabel}</span>
                            <span className="nearby-badge nearby-badge--muted">
                              {place.distanceKm} {tn.radiusKm}
                            </span>
                          </div>
                          <h3>{place.name}</h3>
                        </div>
                      </div>
                      {place.address && (
                        <p className="nearby-card-row">
                          <MapPin size={14} strokeWidth={1.8} />
                          <span>{place.address}</span>
                        </p>
                      )}
                      {place.phone && (
                        <p className="nearby-card-row">
                          <Phone size={14} strokeWidth={1.8} />
                          <a href={`tel:${place.phone.replace(/\s+/g, "")}`}>
                            {place.phone}
                          </a>
                        </p>
                      )}
                      {place.website && (
                        <p className="nearby-card-row">
                          <Globe size={14} strokeWidth={1.8} />
                          <a
                            href={place.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {place.website}
                          </a>
                        </p>
                      )}
                      <div className="nearby-card-actions">
                        <a
                          className="button button--dark button--small"
                          href={mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink size={14} strokeWidth={1.8} />
                          {tn.openMap}
                        </a>
                        <a
                          className="button button--outline-dark button--small"
                          href={facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                        <span aria-hidden="true">f</span>
                        {tn.searchFacebook}
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <aside className="nearby-aside">
          <div className="nearby-aside-card">
            <span className="aside-safety-icon">
              <MapPin size={19} strokeWidth={1.7} />
            </span>
            <h3>{tn.howItWorksTitle}</h3>
            <p>{tn.howItWorksBody}</p>
          </div>
          <div className="nearby-aside-card nearby-aside-card--facebook">
            <span className="aside-safety-icon">
              <span style={{ fontWeight: 700, fontSize: 16 }}>f</span>
            </span>
            <h3>{locale === "ar" ? "فيسبوك" : "Facebook"}</h3>
            <p>
              {locale === "ar"
                ? "أغلب العيادات ليها صفحات على فيسبوك. استخدم زر ابحث على فيسبوك عشان تشوف العنوان وأرقام التواصل والتقييمات."
                : "Many clinics have Facebook pages. Use Search on Facebook to check addresses, contact details, and reviews."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
