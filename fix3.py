import os

file_path = r"c:\Users\davif\OneDrive\Documentos\sitema de rank atletas\src\pages\Home.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# We need to find the end of the hero section:
#               </Link>
#             </div>
#           </div>
#         </div>
#       </section>

# And the start of the surviving news section:
#           <Link className="text-link" to="/noticias">{copy.newsCta}</Link>

import re

# Match the end of hero section
match = re.search(r'(</Link>\s*</div>\s*</div>\s*</div>\s*</section>)', content)
if not match:
    print("Could not find hero end")
    exit(1)

start_index = match.end()

# Match the surviving news section Link
match2 = re.search(r'(<Link className="text-link" to="/noticias">\{copy\.newsCta\}</Link>)', content[start_index:])
if not match2:
    print("Could not find news link")
    exit(1)

end_index = start_index + match2.start()

# The missing block
missing_block = """
      <section className="public-section championships-main">
        <div className="section-heading championships-main__header championships-main__header--minimal">
          <h1 className="championships-main__minimal-title">{copy.eventsKicker}</h1>
          <Link className="text-link" to="/eventos">{copy.fullCalendar}</Link>
        </div>
        <div className="championships-main__grid">
          {featuredEvents.length ? (
            featuredEvents.map((event) => {
              const isRegistrationOpen = event.registrationOpen !== false;
              const eventDate = formatDate(event.parsedDate || event.date, locale, copy.fallbackDate);
              const eventLocation = event.location || copy.locationFallback;
              const daysOffset = resolveDaysOffset(event.parsedDate || event.date);
              const countdown = resolveCountdownLabel(daysOffset, copy);

              return (
                <article className="championship-main-card" key={event.id}>
                  <div className="championship-main-card__poster">
                    {event.posterUrl ? (
                      <img src={event.posterUrl} alt={event.name || copy.eventFallback} loading="lazy" />
                    ) : (
                      <div className="championship-main-card__fallback">
                        <span>{event.name || copy.eventFallback}</span>
                      </div>
                    )}
                    
                    {/* Badge de Data (Canto Superior Esquerdo) */}
                    <div style={{ position: 'absolute', top: 0, left: 0, backgroundColor: 'rgba(37, 99, 235, 0.9)', color: '#fff', padding: '0.4rem 0.8rem', borderBottomRightRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2', zIndex: 2 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {new Date(event.parsedDate || event.date).toLocaleDateString(locale, { month: 'short' }).replace('.', '')} {new Date(event.parsedDate || event.date).getDate() || ''}
                      </span>
                    </div>

                    {/* Lote Atual no topo direito (Quadrado Vermelho) */}
                    <div style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#dc2626', color: '#fff', padding: '0.4rem 0.8rem', borderBottomLeftRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', zIndex: 2 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>Lote Atual</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '800' }}>
                        R$ {event.feeOver15 ? parseFloat(event.feeOver15).toFixed(2).replace('.', ',') : 'Consulte'}
                      </span>
                    </div>
                  </div>
                  <div className="championship-main-card__body">
                    <div className="championship-main-card__badges">
                      <span className={`championship-main-card__status ${isRegistrationOpen ? 'is-open' : 'is-closed'}`}>
                        {isRegistrationOpen ? copy.soon : copy.closedEvent}
                      </span>
                    </div>
                    <h3 className="championship-main-card__title">{event.name || copy.eventFallback}</h3>
                    <span className="championship-main-card__location">
                      <MapPin size={14} />
                      {eventLocation}
                    </span>
                    <div className="championship-main-card__meta">
                      <span>
                        <Calendar size={14} />
                        {eventDate}
                      </span>
                      {countdown && <span className="championship-main-card__meta-countdown">{countdown}</span>}
                    </div>
                    {event.internalRegistration ? (
                      <Link
                        className={`btn ${isRegistrationOpen ? 'btn-event' : 'btn-secondary btn-event--small'}`}
                        to={`/eventos/${event.id}`}
                        onClick={(clickEvent) => {
                          if (!isRegistrationOpen) {
                            clickEvent.preventDefault();
                          }
                        }}
                        aria-disabled={!isRegistrationOpen}
                      >
                        {isRegistrationOpen ? copy.accessEvent : copy.closedEvent}
                      </Link>
                    ) : (
                      <a
                        className={`btn ${isRegistrationOpen ? 'btn-event' : 'btn-secondary btn-event--small'}`}
                        href={event.registrationUrl || '#'}
                        target={event.registrationUrl ? '_blank' : undefined}
                        rel={event.registrationUrl ? 'noreferrer' : undefined}
                        onClick={(clickEvent) => {
                          if (!isRegistrationOpen || !event.registrationUrl) {
                            clickEvent.preventDefault();
                          }
                        }}
                        aria-disabled={!isRegistrationOpen || !event.registrationUrl}
                      >
                        {isRegistrationOpen ? copy.accessEvent : copy.closedEvent}
                      </a>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty-state">{copy.emptyEvents}</div>
          )}
        </div>
      </section>

      <section className="public-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{copy.newsKicker}</span>
            <h2>{copy.newsTitle}</h2>
          </div>
          """

new_content = content[:start_index] + "\n" + missing_block + content[end_index:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Fixed Home.jsx!")
