import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, ExternalLink, CalendarDays } from "lucide-react";

const BRAZIL_MAP_SRC =
  "https://maps.google.com/maps?q=Brasil&output=embed&z=5&t=m&hl=pt-BR";

const formatEventDate = (value) => {
  if (!value) return null;
  let d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

const resolveLocation = (event) => {
  const parts = [event?.city || "", event?.state || ""]
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length) return parts.join(", ");
  return (event?.location || "").toString().trim() || "Local a confirmar";
};

const buildMapsSearch = (event) => {
  const q = [resolveLocation(event), event?.country || "Brasil"]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

// Group events by city for the sidebar
const groupByCity = (events) => {
  const map = new Map();
  events.forEach((e) => {
    const key = resolveLocation(e);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  });
  return [...map.entries()];
};

export default function EventsMapView({ events = [], copy = {} }) {
  const [activeCity, setActiveCity] = useState(null);
  const groups = useMemo(() => groupByCity(events), [events]);

  // Build a search URL for the active city or brazil overview
  const iframeSrc = useMemo(() => {
    if (activeCity) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(activeCity + ", Brasil")}&output=embed&z=12&hl=pt-BR`;
    }
    return BRAZIL_MAP_SRC;
  }, [activeCity]);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 320px",
      gap: "0",
      height: "560px",
      borderRadius: "16px",
      overflow: "hidden",
      border: "1px solid rgba(0,194,203,0.18)",
      boxShadow: "0 8px 40px rgba(0,194,203,0.1)",
      background: "rgba(10,14,24,0.9)",
    }}>
      {/* Map iframe */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        {/* Neon top edge */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "2px", zIndex: 2,
          background: "linear-gradient(90deg, transparent, #00c2cb, #38f9d7, transparent)"
        }} />
        <iframe
          title="Mapa de eventos Genesis"
          src={iframeSrc}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ width: "100%", height: "100%", border: "none", display: "block", filter: "invert(0.85) hue-rotate(180deg) saturate(1.2)" }}
        />
        {/* overlay tip */}
        {activeCity && (
          <div style={{
            position: "absolute", bottom: 16, left: 16,
            background: "rgba(10,14,24,0.9)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(0,194,203,0.3)", borderRadius: "10px",
            padding: "8px 14px", fontSize: "0.78rem", color: "#38f9d7",
            fontWeight: 700, zIndex: 3, display: "flex", alignItems: "center", gap: "6px"
          }}>
            <MapPin size={13} />
            {activeCity}
          </div>
        )}
        {/* Reset to Brazil view */}
        {activeCity && (
          <button
            type="button"
            onClick={() => setActiveCity(null)}
            style={{
              position: "absolute", top: 16, left: 16, zIndex: 3,
              background: "rgba(10,14,24,0.9)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "8px", padding: "6px 12px", color: "#e4e4e7",
              fontSize: "0.75rem", cursor: "pointer", fontWeight: 600,
              display: "flex", alignItems: "center", gap: "6px"
            }}
          >
            ← Ver todo Brasil
          </button>
        )}
      </div>

      {/* Sidebar: event list grouped by city */}
      <div style={{
        background: "rgba(14,18,28,0.97)",
        borderLeft: "1px solid rgba(0,194,203,0.12)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(0,194,203,0.04)"
        }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#00c2cb", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            📍 {groups.length} locais
          </div>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", marginTop: "4px" }}>
            {events.length} evento{events.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* City groups */}
        {groups.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>
            Nenhum evento com os filtros atuais
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            {groups.map(([city, cityEvents]) => (
              <div key={city}>
                {/* City row — clickable to zoom map */}
                <button
                  type="button"
                  onClick={() => setActiveCity(activeCity === city ? null : city)}
                  style={{
                    width: "100%", textAlign: "left",
                    border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)",
                    padding: "12px 20px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "10px",
                    transition: "background 0.15s",
                    background: activeCity === city ? "rgba(0,194,203,0.08)" : "transparent",
                  }}
                >
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                    background: activeCity === city ? "#00c2cb" : "rgba(0,194,203,0.45)",
                    boxShadow: activeCity === city ? "0 0 8px #00c2cb" : "none",
                    transition: "all 0.2s"
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: activeCity === city ? "#38f9d7" : "#e2e8f0", truncate: "true", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {city}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: "1px" }}>
                      {cityEvents.length} evento{cityEvents.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <a
                    href={buildMapsSearch(cityEvents[0])}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0, transition: "color 0.2s" }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#00c2cb"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}
                    aria-label="Abrir no Google Maps"
                    title="Abrir no Google Maps"
                  >
                    <ExternalLink size={13} />
                  </a>
                </button>

                {/* Events in this city (expanded when active) */}
                {activeCity === city && cityEvents.map((event) => {
                  const isExternal = event.internalRegistration === false && Boolean(event.registrationUrl);
                  const Tag = isExternal ? "a" : Link;
                  const linkProps = isExternal
                    ? { href: event.registrationUrl, target: "_blank", rel: "noreferrer" }
                    : { to: `/eventos/${event.id}` };
                  return (
                    <Tag
                      key={event.id}
                      {...linkProps}
                      style={{
                        display: "block", padding: "10px 20px 10px 38px",
                        textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.03)",
                        background: "rgba(0,194,203,0.04)", transition: "background 0.15s"
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#e2e8f0", lineHeight: 1.3, marginBottom: "4px" }}>
                        {event.name || "Evento"}
                      </div>
                      {(event.parsedDate || event.date) && (
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>
                          <CalendarDays size={11} />
                          {formatEventDate(event.parsedDate || event.date)}
                        </div>
                      )}
                    </Tag>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

