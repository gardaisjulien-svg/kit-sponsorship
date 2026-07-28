const form = document.getElementById('dossierForm');
const steps = Array.from(document.querySelectorAll('.step'));
let currentStep = 0;

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const generateBtn = document.getElementById('generateBtn');
const stepIndicator = document.getElementById('stepIndicator');
const genStatus = document.getElementById('genStatus');

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
updateLivePreview();

// ===== Génération IA =====
generateBtn.addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  if (!apiKey){
    genStatus.textContent = "⚠ Ajoutez votre clé API pour générer le texte.";
    return;
  }
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
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok){
      const errText = await response.text();
      throw new Error(`Erreur API (${response.status}) : ${errText.slice(0,200)}`);
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

showStep(0);
