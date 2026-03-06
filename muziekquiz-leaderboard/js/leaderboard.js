/**
 * Leaderboard Display – rijbanen stijl (paardenrace)
 */

let previousScores = {};
let previousRanks  = {};

/* ─── Team Catchphrases ────────────────────────────────── */
const TEAM_CATCHPHRASES = {
    // Bad Bunny
    'bad bunny': ['Yeh yeh yeh!', 'Bad Bunny baby!', 'Está cabrón!'],
    'bad bunnies': ['Yeh yeh yeh!', 'Bad Bunny baby!', 'Está cabrón!'],

    // Pitbull
    'pitbull': ['Mister Worldwide!', 'Dale!', 'Uno dos tres cuatro!'],
    'quizter worldwide': ['Mister Worldwide!', 'Dale!', 'Uno dos tres cuatro!'],
    'mr worldwide': ['Mister Worldwide!', 'Dale!', 'Uno dos tres cuatro!'],

    // Dave Grohl / Foo Fighters
    'dave grohl': ['Rock and Roll!', 'Best of you!', 'There goes my hero!'],
    'foo fighters': ['Rock and Roll!', 'Best of you!', 'There goes my hero!'],
    'variā statūrā': ['Rock and Roll!', 'Best of you!', 'There goes my hero!'],
    'varia statura': ['Rock and Roll!', 'Best of you!', 'There goes my hero!'],

    // Justin Bieber
    'justin bieber': ['Baby baby baby ooh!', 'Never say never!', 'Belieeeve!'],
    'bieber': ['Baby baby baby ooh!', 'Never say never!', 'Belieeeve!'],
    'beebs': ['Baby baby baby ooh!', 'Never say never!', 'Belieeeve!'],
    'the beebs babes': ['Baby baby baby ooh!', 'Never say never!', 'Belieeeve!'],

    // Marco Borsato
    'marco borsato': ['Rood!', 'Dromen zijn bedrog!', 'Wat zou je doen!'],
    'borsato': ['Rood!', 'Dromen zijn bedrog!', 'Wat zou je doen!'],
    'rooie rakkers': ['Rood!', 'Dromen zijn bedrog!', 'Wat zou je doen!']
};

function getTeamCatchphrase(teamName) {
    const name = teamName.toLowerCase();
    for (const [key, phrases] of Object.entries(TEAM_CATCHPHRASES)) {
        if (name.includes(key) || key.includes(name)) {
            return phrases[Math.floor(Math.random() * phrases.length)];
        }
    }
    return null;
}

function speakCatchphrase(phrase) {
    if (!getSettings().soundEnabled) return;
    if ('speechSynthesis' in window) {
        // Stop any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.rate = 1.1;
        utterance.pitch = 1.2;
        utterance.volume = 0.8;

        // Try to find a good voice
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith('en') || v.lang.startsWith('nl'));
        if (preferredVoice) utterance.voice = preferredVoice;

        speechSynthesis.speak(utterance);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateRoundDisplay();
    renderLanes();
    checkWinner();
    startListening();
});

/* ─── Luisteren naar admin-wijzigingen ─────────────────── */
function startListening() {
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEYS.TEAMS)        { handleUpdate(); }
        else if (event.key === STORAGE_KEYS.CURRENT_ROUND) { updateRoundDisplay(); }
        else if (event.key === STORAGE_KEYS.SHOW_WINNER)   { checkWinner(); }
        else if (event.key === STORAGE_KEYS.SETTINGS)      { updateRoundDisplay(); }
    });

    // Polling als backup (zelfde tabblad)
    setInterval(() => {
        handleUpdate();
        updateRoundDisplay();
        checkWinner();
    }, 800);
}

function handleUpdate() {
    const teams = getTeams();
    const sortedTeams = getTeamsSortedByScore();

    // Bereken huidige ranks en scores
    const currentRanks  = {};
    const currentScores = {};
    sortedTeams.forEach((team, idx) => {
        currentRanks[team.id]  = idx + 1;
        currentScores[team.id] = calculateTotalScore(team);
    });

    // Detecteer wijzigingen per team
    teams.forEach(team => {
        const prevScore = previousScores[team.id] ?? null;
        const currScore = currentScores[team.id] ?? 0;
        const prevRank  = previousRanks[team.id]  ?? null;
        const currRank  = currentRanks[team.id]  ?? 0;

        if (prevScore !== null && currScore > prevScore) {
            triggerScoreAnim(team.id, currScore - prevScore);
            playSound('points');

            // Team-specific catchphrase
            const catchphrase = getTeamCatchphrase(team.name);
            if (catchphrase) {
                setTimeout(() => speakCatchphrase(catchphrase), 300);
            }
        }
        if (prevRank !== null && currRank < prevRank) {
            triggerOvertakeAnim(team.id);
            playSound('overtake');
            playSound('crowd'); // Crowd cheering for position change
        }
    });

    previousScores = currentScores;
    previousRanks  = currentRanks;

    renderLanes();
}

/* ─── Ronde weergave ───────────────────────────────────── */
function updateRoundDisplay() {
    const settings = getSettings();
    document.getElementById('current-round').textContent = getCurrentRound();
    document.getElementById('total-rounds').textContent  = settings.totalRounds;
}

/* ─── Rijbanen renderen ────────────────────────────────── */
function renderLanes() {
    const container   = document.getElementById('lanes-container');
    const teams       = getTeams();
    const sortedTeams = getTeamsSortedByScore();
    const maxScore    = getMaxPossibleScore();

    if (teams.length === 0) {
        container.innerHTML = '<div class="waiting-text">Wachten op teams...</div>';
        return;
    }

    // Maak rijbanen aan als ze nog niet bestaan
    teams.forEach((team) => {
        let lane = container.querySelector(`.lane[data-team-id="${team.id}"]`);
        if (!lane) {
            lane = createLane(team);
            container.appendChild(lane);
        }
        updateLane(lane, team, sortedTeams, maxScore);
    });

    // Verwijder rijbanen van teams die weg zijn
    container.querySelectorAll('.lane').forEach(lane => {
        if (!teams.find(t => t.id === lane.dataset.teamId)) {
            lane.remove();
        }
    });
}

function createLane(team) {
    const lane = document.createElement('div');
    lane.className = 'lane';
    lane.dataset.teamId = team.id;

    const color = team.color || '#667eea';
    const photoHtml = team.image
        ? `<img class="racer-photo" src="${team.image}" alt="${escapeHtml(team.name)}">`
        : `<div class="racer-photo-placeholder">🏎️</div>`;

    lane.innerHTML = `
        <div class="racer" data-racer="${team.id}">
            <div class="leader-crown">👑</div>
            <div class="racer-img-wrap">
                ${photoHtml}
                <span class="racer-score-badge" style="background:${color};">0 pts</span>
            </div>
            <div class="racer-name" style="border: 2px solid ${color};">${escapeHtml(team.name)}</div>
        </div>
    `;

    return lane;
}

function updateLane(lane, team, sortedTeams, maxScore) {
    const color   = team.color || '#667eea';
    const score   = calculateTotalScore(team);
    const rank    = sortedTeams.findIndex(t => t.id === team.id) + 1;
    const racer   = lane.querySelector('.racer');
    const badge   = lane.querySelector('.racer-score-badge');
    const nameDiv = lane.querySelector('.racer-name');
    const crown   = lane.querySelector('.leader-crown');

    // Positie op de baan: 5% = start, 90% = vlak voor finish
    const pct = maxScore > 0 ? 5 + (score / maxScore) * 85 : 5;
    racer.style.left = `${Math.min(pct, 90)}%`;

    // Score badge
    badge.textContent = `${score} pts`;

    // Kleur badge groen als leider, anders teamkleur
    badge.style.background = rank === 1 ? '#ffd700' : color;
    badge.style.color       = rank === 1 ? '#000' : '#fff';

    // Naam border kleur
    nameDiv.style.borderColor = color;

    // Kroon alleen voor de leider (en alleen als score > 0)
    if (crown) {
        crown.classList.toggle('visible', rank === 1 && score > 0);
    }

    // Kleur baan licht op basis van rank (subtiel)
    lane.style.background = rank === 1
        ? 'rgba(255,215,0,0.05)'
        : 'transparent';
}

/* ─── Animaties ────────────────────────────────────────── */
function triggerScoreAnim(teamId, points) {
    const racer = document.querySelector(`.racer[data-racer="${teamId}"]`);
    if (!racer) return;

    racer.classList.remove('scoring');
    void racer.offsetWidth; // reflow
    racer.classList.add('scoring');
    setTimeout(() => racer.classList.remove('scoring'), 700);

    // Zwevende "+N" popup
    const popup = document.createElement('div');
    popup.className = 'points-popup';
    popup.textContent = `+${points}`;
    popup.style.left = racer.style.left;
    popup.style.top  = '10px';
    racer.closest('.lane').appendChild(popup);
    setTimeout(() => popup.remove(), 1500);
}

function triggerOvertakeAnim(teamId) {
    const racer = document.querySelector(`.racer[data-racer="${teamId}"]`);
    if (!racer) return;
    racer.classList.remove('overtaking');
    void racer.offsetWidth;
    racer.classList.add('overtaking');
    setTimeout(() => racer.classList.remove('overtaking'), 900);
}

/* ─── Winnaar ──────────────────────────────────────────── */
function checkWinner() {
    const overlay = document.getElementById('winner-overlay');
    if (!shouldShowWinner()) { overlay.classList.remove('active'); return; }

    const sorted = getTeamsSortedByScore();
    if (sorted.length === 0) return;

    const winner = sorted[0];
    const score  = calculateTotalScore(winner);
    const avatarHtml = winner.image
        ? `<img src="${winner.image}" alt="${escapeHtml(winner.name)}">`
        : '🏆';

    document.getElementById('winner-team').innerHTML = `
        <div class="avatar" style="border-color:${winner.color||'#ffd700'}">${avatarHtml}</div>
        <div>${escapeHtml(winner.name)}</div>
    `;
    document.getElementById('winner-score').textContent = `${score} punten!`;

    overlay.classList.add('active');
    playSound('winner');
    launchConfetti();
    launchFireworks();
}

/* ─── Confetti ─────────────────────────────────────────── */
function launchConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#ff0000','#00e676','#2979ff','#ffd700','#ff4081','#00e5ff','#ff6d00'];
    for (let i = 0; i < 160; i++) {
        setTimeout(() => {
            const el = document.createElement('div');
            el.className = 'confetti';
            el.style.left = `${Math.random() * 100}%`;
            el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            el.style.animationDuration = `${2 + Math.random() * 2}s`;
            el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            el.style.width  = `${6 + Math.random() * 8}px`;
            el.style.height = `${6 + Math.random() * 8}px`;
            container.appendChild(el);
            setTimeout(() => el.remove(), 4000);
        }, i * 18);
    }
}

/* ─── Vuurwerk ─────────────────────────────────────────── */
function launchFireworks() {
    const container = document.getElementById('confetti-container');
    const colors = ['#ff0000','#ffd700','#00e676','#00e5ff','#ff4081'];
    for (let i = 0; i < 12; i++) {
        setTimeout(() => {
            const x = Math.random() * 80 + 10;
            const y = Math.random() * 50 + 5;
            for (let j = 0; j < 15; j++) {
                const fw = document.createElement('div');
                fw.className = 'firework';
                fw.style.left = `${x}%`;
                fw.style.top  = `${y}%`;
                fw.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                container.appendChild(fw);
                setTimeout(() => fw.remove(), 1000);
            }
        }, i * 400);
    }
}

/* ─── Geluid ───────────────────────────────────────────── */
function playSound(type) {
    if (!getSettings().soundEnabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (type === 'points')   playPointsSound(ctx);
        if (type === 'overtake') playOvertakeSound(ctx);
        if (type === 'winner')   playWinnerSound(ctx);
        if (type === 'crowd')    playCrowdSound(ctx);
    } catch(e) {}
}

function playPointsSound(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
}

function playOvertakeSound(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.2);
    osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.setValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
}

function playWinnerSound(ctx) {
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.3;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
        gain.gain.setValueAtTime(0.3, t + 0.25);
        gain.gain.linearRampToValueAtTime(0.01, t + 0.3);
        osc.start(t); osc.stop(t + 0.3);
    });
}

function playCrowdSound(ctx) {
    // Simulate crowd "ooooh!" cheering with filtered noise
    const duration = 0.8;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate noise
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to make it sound more like a crowd
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + duration);
}

/* ─── Utility ──────────────────────────────────────────── */
function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}
