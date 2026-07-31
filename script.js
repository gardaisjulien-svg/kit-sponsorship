const SUPABASE_URL = 'https://vsynxuegedicgvhdokun.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PgoGihfpdU8W7LLPJ2uN1Q_EqlG-k1L';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById('dossierForm');
const steps = Array.from(document.querySelectorAll('.step'));
let currentStep = 0;

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const generateBtn = document.getElementById('generateBtn');
const stepIndicator = document.getElementById('stepIndicator');
const genStatus = document.getElementById('genStatus');
const saveStatus = document.getElementById('saveStatus');

function showStep(index){
  steps.forEach((s, i) => s.hidden = i !== index);
  prevBtn.disabled = index === 0;
  nextBtn.hidden = index === steps.length - 1;
  generateBtn.hidden = index !== steps.length - 1;
  stepIndicator.textContent = `Étape ${index + 1} / ${steps.length}`;
}

prevBtn.addEventListener('click', () => {
  if (currentStep > 0){ currentStep--; showStep(currentStep); }
});
nextBtn.addEventListener('click', () => {
  if (currentStep < steps.length - 1){ currentStep++; showStep(currentStep); }
});

function getFormData(){
  const fd = new FormData(form);
  const visibility = fd.getAll('visibility');
  return {
    clubName: fd.get('clubName') || '',
    sport: fd.get('sport') || '',
    city: fd.get('city') || '',
    founded: fd.get('founded') || '',
    pitch: fd.get('pitch') || '',
    members: fd.get('members') || '',
    spectators: fd.get('spectators') || '',
    ageRange: fd.get('ageRange') || '',
    social: fd.get('social') || '',
    events: fd.get('events') || '',
    visibility,
    tierBronze: fd.get('tierBronze') || '',
    tierSilver: fd.get('tierSilver') || '',
    tierGold: fd.get('tierGold') || '',
    contact: fd.get('contact') || ''
  };
}

function fmt(n){
  if (!n) return '—';
  return Number(n).toLocaleString('fr-FR');
}

function updateLivePreview(){
  const d = getFormData();
  document.getElementById('prevClubName').textContent = d.clubName || 'Nom du club';
  document.getElementById('prevSport').textContent = d.sport || 'Sport';
  document.getElementById('prevCity').textContent = d.city || 'Ville';
  document.getElementById('prevFounded').textContent = d.founded ? `Fondé en ${d.founded}` : 'Fondé en —';

  document.getElementById('sNumMembers').textContent = fmt(d.members);
  document.getElementById('sNumSpectators').textContent = fmt(d.spectators);
  document.getElementById('sNumSocial').textContent = fmt(d.social);
  document.getElementById('sNumEvents').textContent = fmt(d.events);

  const visList = document.getElementById('prevVisibility');
  visList.innerHTML = '';
  d.visibility.forEach(v => {
    const li = document.createElement('li');
    li.textContent = v;
    visList.appendChild(li);
  });

  const tiersPreview = document.getElementById('tiersPreview');
  tiersPreview.innerHTML = '';
  [['Bronze', d.tierBronze], ['Argent', d.tierSilver], ['Or', d.tierGold]].forEach(([label, amount]) => {
    const card = document.createElement('div');
    card.className = 'tier-card';
    card.innerHTML = `<h4>${label}</h4><div class="amount">${amount ? amount + ' €' : '—'}</div>`;
    tiersPreview.appendChild(card);
  });

  document.getElementById('prevContact').textContent = d.contact || '—';
}

form.addEventListener('input', updateLivePreview);

// ===== Génération IA (via la fonction serveur /api/generate) =====
generateBtn.addEventListener('click', async () => {
  const d = getFormData();
  generateBtn.disabled = true;
  genStatus.textContent = "Rédaction en cours…";

  const prompt = `Tu rédiges un dossier de sponsoring pour un club sportif amateur. Voici les infos brutes fournies par le club :
- Nom : ${d.clubName}
- Sport : ${d.sport}
- Ville : ${d.city}
- Fondé en : ${d.founded}
- Description libre du club : ${d.pitch}
- Licenciés : ${d.members}
- Spectateurs par match : ${d.spectators}
- Tranche d'âge : ${d.ageRange}
- Abonnés réseaux sociaux : ${d.social}
- Événements par an : ${d.events}
- Visibilité offerte : ${d.visibility.join(', ')}

Réponds UNIQUEMENT en JSON valide, sans markdown, avec exactement cette forme :
{"about": "un paragraphe de 3-4 phrases qui présente le club de façon chaleureuse et professionnelle, prêt à être lu par un sponsor potentiel", "why": "un paragraphe de 2-3 phrases qui explique pourquoi sponsoriser ce club est une bonne opportunité pour une entreprise locale, en s'appuyant sur les chiffres fournis"}`;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok){
      const errText = await response.text();
      throw new Error(`Erreur serveur (${response.status}) : ${errText.slice(0,200)}`);
    }

    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('').trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    document.getElementById('prevPitchGenerated').textContent = parsed.about;
    document.getElementById('prevWhyGenerated').textContent = parsed.why;
    genStatus.textContent = "✓ Dossier généré.";
  } catch (err) {
    console.error(err);
    genStatus.textContent = `⚠ ${err.message}`;
  } finally {
    generateBtn.disabled = false;
  }
});

// ===== Export PDF =====
document.getElementById('printBtn').addEventListener('click', () => {
  window.print();
});

// ===== Sauvegarde Supabase =====
document.getElementById('saveBtn').addEventListener('click', async () => {
  const d = getFormData();
  const generatedAbout = document.getElementById('prevPitchGenerated').textContent;
  const generatedWhy = document.getElementById('prevWhyGenerated').textContent;

  saveStatus.textContent = "Sauvegarde en cours…";

  const { data, error } = await supabase.from('dossiers').insert([{
    club_name: d.clubName,
    sport: d.sport,
    city: d.city,
    founded: d.founded || null,
    pitch: d.pitch,
    members: d.members ? parseInt(d.members) : null,
    spectators: d.spectators ? parseInt(d.spectators) : null,
    age_range: d.ageRange,
    social: d.social ? parseInt(d.social) : null,
    events: d.events ? parseInt(d.events) : null,
    visibility: d.visibility,
    tier_bronze: d.tierBronze ? parseFloat(d.tierBronze) : null,
    tier_silver: d.tierSilver ? parseFloat(d.tierSilver) : null,
    tier_gold: d.tierGold ? parseFloat(d.tierGold) : null,
    contact: d.contact,
    generated_about: generatedAbout,
    generated_why: generatedWhy
  }]).select().single();

  if (error){
    console.error(error);
    saveStatus.textContent = "⚠ Erreur de sauvegarde — vérifiez la configuration Supabase.";
    return;
  }

  const shareUrl = `${window.location.origin}${window.location.pathname}?id=${data.id}`;
  window.history.replaceState({}, '', `?id=${data.id}`);
  saveStatus.innerHTML = `✓ Sauvegardé. Lien à conserver : <a href="${shareUrl}">${shareUrl}</a>`;
});

// ===== Chargement d'un dossier existant via ?id=... =====
async function loadFromUrl(){
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) { updateLivePreview(); showStep(0); return; }

  saveStatus.textContent = "Chargement du dossier…";
  const { data, error } = await supabase.from('dossiers').select('*').eq('id', id).single();

  if (error || !data){
    saveStatus.textContent = "⚠ Dossier introuvable.";
    updateLivePreview();
    showStep(0);
    return;
  }

  form.clubName.value = data.club_name || '';
  form.sport.value = data.sport || '';
  form.city.value = data.city || '';
  form.founded.value = data.founded || '';
  form.pitch.value = data.pitch || '';
  form.members.value = data.members || '';
  form.spectators.value = data.spectators || '';
  form.ageRange.value = data.age_range || '';
  form.social.value = data.social || '';
  form.events.value = data.events || '';
  form.contact.value = data.contact || '';
  form.tierBronze.value = data.tier_bronze || '';
  form.tierSilver.value = data.tier_silver || '';
  form.tierGold.value = data.tier_gold || '';

  (data.visibility || []).forEach(v => {
    const cb = Array.from(form.querySelectorAll('input[name="visibility"]')).find(el => el.value === v);
    if (cb) cb.checked = true;
  });

  updateLivePreview();
  document.getElementById('prevPitchGenerated').textContent = data.generated_about || document.getElementById('prevPitchGenerated').textContent;
  document.getElementById('prevWhyGenerated').textContent = data.generated_why || '—';
  saveStatus.textContent = "✓ Dossier chargé.";
  showStep(0);
}

loadFromUrl();
