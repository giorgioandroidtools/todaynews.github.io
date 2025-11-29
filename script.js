document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("notizie-container");
  const dataOggi = document.getElementById("data-oggi");
  const oraSpan = document.getElementById("ora");

  // Data e ora attuali in italiano
  const oggi = new Date();
  const opzioniData = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dataOggi.textContent = oggi.toLocaleDateString('it-IT', opzioniData);
  oraSpan.textContent = oggi.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});

  // Fonti RSS + fallback NewsAPI (funziona anche senza chiave per molte richieste)
  const fonti = [
    "https://www.corriere.it/rss/homepage.xml",
    "https://www.ansa.it/sito/ansait_rss.xml",
    "https://www.repubblica.it/rss/homepage/rss2.0.xml",
    "https://www.ilpost.it/feed/",
    "http://newsrss.bbc.co.uk/rss/newsonline_world_edition/front_page/rss.xml"
  ];

  // Funzione per convertire RSS → JSON usando un proxy gratuito (evita problemi CORS)
  async function caricaNotizie() {
    container.innerHTML = '<div class="loader">Caricamento notizie...</div>';

    let tutteNotizie = [];

    for (let rss of fonti) {
      try {
        const proxy = "https://api.allorigins.win/get?url=";
        const response = await fetch(proxy + encodeURIComponent(rss));
        const data = await response.json();
        const parser = new DOMParser();
        const xml = parser.parseFromString(data.contents, "text/xml");
        const items = xml.querySelectorAll("item");

        items.forEach(item => {
          const titolo = item.querySelector("title")?.textContent || "Senza titolo";
          const link = item.querySelector("link")?.textContent || "#";
          const descrizione = item.querySelector("description")?.textContent.replace(/<.*?>/g, "") || "";
          const pubDate = item.querySelector("pubDate")?.textContent || new Date().toISOString();
          const immagine = item.querySelector("enclosure")?.getAttribute("url") ||
                          item.querySelector("media\\:content, content")?.getAttribute("url") ||
                          "https://via.placeholder.com/800x400/0d47a1/ffffff?text=Notizia";

          tutteNotizie.push({titolo, link, descrizione, pubDate, immagine, fonte: new URL(rss).hostname});
        });
      } catch (e) {
        console.log("Errore caricamento da", rss);
      }
    }

    // Ordina per data (più recenti prima)
    tutteNotizie.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Prendi le prime 30 notizie più fresche
    const ultime = tutteNotizie.slice(0, 30);

    // Mostra le card
    if (ultime.length === 0) {
      container.innerHTML = "<p style='grid-column:1/-1;text-align:center;'>Nessuna notizia al momento. Riprova tra poco.</p>";
      return;
    }

    container.innerHTML = ultime.map(notizia => `
      <a href="${notizia.link}" target="_blank" class="card">
        <img src="${notizia.immagine}" alt="${notizia.titolo}" loading="lazy" onerror="this.src='https://via.placeholder.com/800x400/0d47a1/ffffff?text=No+Image'">
        <div class="card-content">
          <h3>${notizia.titolo}</h3>
          <p>${notizia.descrizione.substring(0, 140)}...</p>
          <div class="source">${notizia.fonte.replace("www.","").split(".")[0]} • ${formattaData(notizia.pubDate)}</div>
        </div>
      </a>
    `).join("");

    // Aggiorna ora di ultimo refresh
    oraSpan.textContent = new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});
  }

  function formattaData(dataString) {
    const opzioni = { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' };
    return new Date(dataString).toLocaleDateString('it-IT', opzioni);
  }

  // Carica subito e poi ogni 10 minuti
  caricaNotizie();
  setInterval(caricaNotizie, 10 * 60 * 1000);
});