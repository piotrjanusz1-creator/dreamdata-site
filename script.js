// Dream Data site — vanilla JS
const TEAM_JSON = "team.json";
const FEED_JSON = "linkedin-feed.json";
const SITE_JSON = "site.json";

function $(sel, root=document){ return root.querySelector(sel); }

function getInitials(name){
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();
}

async function loadJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if(!res.ok) throw new Error(`Nie udało się wczytać ${path} (${res.status})`);
  return res.json();
}

function escapeHTML(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function createTeamCard(member){
  const initials = getInitials(member.name);
  const safeName = escapeHTML(member.name);
  const safeRole = escapeHTML(member.role || "");
  const safeBio  = escapeHTML(member.bio || "");
  const hintFront = "Najedź / dotknij, żeby obrócić";
  const hintBack  = "Kliknij ponownie, aby wrócić";

  // Avatar HTML (img will be injected if exists)
  const avatarId = `av_${Math.random().toString(16).slice(2)}`;

  const html = `
    <article class="team-card" tabindex="0" aria-label="${safeName}">
      <div class="team-card__inner">
        <div class="team-face team-face--front">
          <div class="team-avatar" id="${avatarId}">${initials}</div>
          <h3 class="team-name">${safeName}</h3>
          <p class="team-role">${safeRole}</p>
          <p class="team-hint">${hintFront}</p>
        </div>
        <div class="team-face team-face--back">
          <div class="team-avatar">${initials}</div>
          <h3 class="team-name">${safeName}</h3>
          <p class="team-role">${safeRole}</p>
          <p class="team-bio">${safeBio}</p>
          <p class="team-hint">${hintBack}</p>
        </div>
      </div>
    </article>
  `;

  // After inserting to DOM, we can attempt to load image (fallback stays initials)
  return { html, avatarId };
}

async function renderTeam(){
  const grid = $("#teamGrid");
  if(!grid) return;

  try{
    const team = await loadJSON(TEAM_JSON);
    grid.innerHTML = "";
    const pending = [];

    for(const m of team){
      const { html, avatarId } = createTeamCard(m);
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html.trim();
      const node = wrapper.firstElementChild;
      grid.appendChild(node);

      if(m.image){
        pending.push({ avatarId, src: m.image, alt: m.name });
      }
    }

    // Attach images with error fallback
    for(const p of pending){
      const avatar = document.getElementById(p.avatarId);
      if(!avatar) continue;
      const img = document.createElement("img");
      img.src = p.src;
      img.alt = p.alt;
      img.loading = "lazy";
      img.onerror = () => {
        // keep initials
        img.remove();
      };
      img.onload = () => {
        avatar.textContent = "";
        avatar.appendChild(img);
      };
      // start loading
      avatar.appendChild(img);
    }

    // Mobile: tap toggles focus (works with :focus-within flip)
    grid.querySelectorAll(".team-card").forEach(card => {
      card.addEventListener("click", () => {
        // toggle focus by moving focus on click
        if(document.activeElement === card){
          card.blur();
        } else {
          card.focus();
        }
      });
    });

  } catch(err){
    console.error(err);
    grid.innerHTML = `<div class="card">Nie udało się wczytać zespołu. Sprawdź <code>${TEAM_JSON}</code>.</div>`;
  }
}

function fmtDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleDateString("pl-PL", { year:"numeric", month:"short", day:"2-digit" });
  }catch{
    return iso;
  }
}

async function renderNews(){
  const list = $("#newsList");
  if(!list) return;

  try{
    const items = await loadJSON(FEED_JSON);
    list.innerHTML = "";

    const max = 6;
    items.slice(0, max).forEach(item => {
      const title = escapeHTML(item.title || "Aktualizacja");
      const date  = escapeHTML(fmtDate(item.date || new Date().toISOString()));
      const text  = escapeHTML(item.excerpt || "");
      const url   = item.url || "#";

      const el = document.createElement("article");
      el.className = "news__item";
      el.innerHTML = `
        <div class="news__meta">${date}</div>
        <h3><a href="${url}" target="_blank" rel="noopener">${title}</a></h3>
        <p>${text}</p>
      `;
      list.appendChild(el);
    });

  } catch(err){
    console.error(err);
    list.innerHTML = `<div class="card">Nie udało się wczytać aktualności. Sprawdź <code>${FEED_JSON}</code>.</div>`;
  }
}

async function renderContact(){
  try{
    const site = await loadJSON(SITE_JSON);

    const lead = $("#contactLead");
    const email = $("#contactEmail");
    const phone = $("#contactPhone");
    const li = $("#contactLinkedin");
    const loc = $("#contactLocation");
    const cta = $("#contactCta");

    if(lead) lead.textContent = site.contact?.lead || "Skontaktuj się z nami.";
    if(email){
      email.textContent = site.contact?.email || "—";
      email.href = site.contact?.email ? `mailto:${site.contact.email}` : "#";
    }
    if(phone){
      phone.textContent = site.contact?.phone || "—";
      phone.href = site.contact?.phone ? `tel:${site.contact.phone.replace(/\s+/g,'')}` : "#";
    }
    if(li){
      li.textContent = site.contact?.linkedinLabel || "LinkedIn";
      li.href = site.contact?.linkedinUrl || "#";
    }
    if(loc) loc.textContent = site.contact?.location || "—";
    if(cta){
      cta.textContent = site.contact?.ctaText || "Umów konsultację";
      cta.href = site.contact?.ctaUrl || "#";
    }

    // Mailto form (works on GitHub Pages)
    const form = $("#contactForm");
    if(form && site.contact?.email){
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const subject = encodeURIComponent(site.contact?.formSubject || "Zapytanie — Dream Data");
        const body = encodeURIComponent(
          `Imię: ${fd.get("name")}\nEmail: ${fd.get("email")}\n\nWiadomość:\n${fd.get("message")}\n`
        );
        window.location.href = `mailto:${site.contact.email}?subject=${subject}&body=${body}`;
      });
    }
  } catch(err){
    console.error(err);
    const lead = $("#contactLead");
    if(lead) lead.textContent = "Nie udało się wczytać danych kontaktowych (site.json).";
  }
}

function setupNav(){
  const btn = $(".nav-toggle");
  const nav = $("#nav");
  if(!btn || !nav) return;

  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // close on link click (mobile)
  nav.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    });
  });
}

function setupFooter(){
  const y = $("#year");
  if(y) y.textContent = new Date().getFullYear();

  // Easter egg: subtle + console + toast-like alert
  console.log("%cPowered by Dream Data AI ✨", "color:#38bdf8;font-weight:800;");
  const egg = $("#easter");
  if(egg){
    egg.addEventListener("click", () => {
      alert("Powered by Dream Data AI ✨\n(Obiecujemy: to nie jest kolejny generatywny buzzword. 😄)");
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  setupNav();
  setupFooter();
  await Promise.all([renderTeam(), renderNews(), renderContact()]);
});
