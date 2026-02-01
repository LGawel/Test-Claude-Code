/**
 * Leaderboard Display for Music Quiz
 */

// Track previous positions for overtake detection
let previousPositions = {};
let previousScores = {};

document.addEventListener('DOMContentLoaded', () => {
    initLeaderboard();
    startListening();
});

/**
 * Initialize the leaderboard
 */
function initLeaderboard() {
    updateRoundDisplay();
    renderTeams();
    renderScoreboard();
    checkWinner();
}

/**
 * Start listening for localStorage changes
 */
function startListening() {
    // Listen for changes from admin panel
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEYS.TEAMS) {
            handleTeamsUpdate();
        } else if (event.key === STORAGE_KEYS.CURRENT_ROUND) {
            updateRoundDisplay();
        } else if (event.key === STORAGE_KEYS.SHOW_WINNER) {
            checkWinner();
        } else if (event.key === STORAGE_KEYS.SETTINGS) {
            updateRoundDisplay();
        }
    });

    // Also poll for changes (backup for same-tab updates)
    setInterval(() => {
        handleTeamsUpdate();
        updateRoundDisplay();
        checkWinner();
    }, 1000);
}

/**
 * Handle teams data update
 */
function handleTeamsUpdate() {
    const teams = getTeams();
    const currentPositions = {};
    const currentScores = {};

    // Calculate current positions and scores
    const sortedTeams = getTeamsSortedByScore();
    sortedTeams.forEach((team, index) => {
        currentPositions[team.id] = index;
        currentScores[team.id] = calculateTotalScore(team);
    });

    // Detect changes and trigger animations
    teams.forEach(team => {
        const prevPos = previousPositions[team.id];
        const currPos = currentPositions[team.id];
        const prevScore = previousScores[team.id] || 0;
        const currScore = currentScores[team.id];

        // Points gained
        if (currScore > prevScore) {
            const pointsGained = currScore - prevScore;
            triggerPointsAnimation(team.id, pointsGained);
            playSound('points');
        }

        // Position changed (overtake)
        if (prevPos !== undefined && currPos < prevPos) {
            triggerOvertakeAnimation(team.id);
            playSound('overtake');
        }
    });

    // Update tracking
    previousPositions = currentPositions;
    previousScores = currentScores;

    // Re-render
    renderTeams();
    renderScoreboard();
}

/**
 * Update round display
 */
function updateRoundDisplay() {
    const settings = getSettings();
    const currentRound = getCurrentRound();

    document.getElementById('current-round').textContent = currentRound;
    document.getElementById('total-rounds').textContent = settings.totalRounds;
}

/**
 * Render teams on the road
 */
function renderTeams() {
    const road = document.getElementById('road');
    const teams = getTeams();
    const sortedTeams = getTeamsSortedByScore();
    const maxPossibleScore = getMaxPossibleScore();

    // Get or create team markers
    teams.forEach((team, index) => {
        let marker = road.querySelector(`[data-team-id="${team.id}"]`);

        if (!marker) {
            marker = createTeamMarker(team);
            road.appendChild(marker);
        }

        // Calculate position on road (0% to 90%)
        const totalScore = calculateTotalScore(team);
        const progressPercent = maxPossibleScore > 0
            ? Math.min((totalScore / maxPossibleScore) * 90, 90)
            : 0;

        // Calculate vertical position based on ranking to avoid overlap
        const position = sortedTeams.findIndex(t => t.id === team.id);
        const laneHeight = road.offsetHeight / Math.max(teams.length, 1);
        const topPosition = (position * laneHeight) + (laneHeight / 2) - 40;

        // Apply position with animation
        marker.style.left = `${progressPercent}%`;
        marker.style.top = `${topPosition}px`;

        // Update avatar content
        const avatarDiv = marker.querySelector('.team-avatar');
        avatarDiv.textContent = getTeamAvatarEmoji(team);

        // Update color based on person
        const person = getPersonById(team.personId);
        if (person) {
            avatarDiv.style.borderColor = person.color;
            avatarDiv.style.boxShadow = `0 4px 15px ${person.color}40`;
        }
    });

    // Remove markers for deleted teams
    road.querySelectorAll('.team-marker').forEach(marker => {
        const teamId = marker.dataset.teamId;
        if (!teams.find(t => t.id === teamId)) {
            marker.remove();
        }
    });
}

/**
 * Create a team marker element
 */
function createTeamMarker(team) {
    const marker = document.createElement('div');
    marker.className = 'team-marker';
    marker.dataset.teamId = team.id;

    const person = getPersonById(team.personId);

    marker.innerHTML = `
        <div class="team-avatar" style="border-color: ${person?.color || '#fff'}">
            ${getTeamAvatarEmoji(team)}
        </div>
        <div class="team-marker-name">${escapeHtml(team.name)}</div>
    `;

    return marker;
}

/**
 * Render the scoreboard
 */
function renderScoreboard() {
    const scoreboard = document.getElementById('scoreboard');
    const sortedTeams = getTeamsSortedByScore();

    if (sortedTeams.length === 0) {
        scoreboard.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center;">Wachten op teams...</p>';
        return;
    }

    scoreboard.innerHTML = sortedTeams.map((team, index) => {
        const totalScore = calculateTotalScore(team);
        const positionClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        const positionEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const isLeader = index === 0;

        return `
            <div class="score-card ${isLeader ? 'leader' : ''}" data-team-id="${team.id}">
                <div class="position ${positionClass}">${positionEmoji}</div>
                <div class="team-name">${escapeHtml(team.name)}</div>
                <div class="score">${totalScore} <span>pts</span></div>
            </div>
        `;
    }).join('');
}

/**
 * Trigger points animation
 */
function triggerPointsAnimation(teamId, points) {
    const marker = document.querySelector(`.team-marker[data-team-id="${teamId}"]`);
    if (!marker) return;

    // Add bounce animation to marker
    marker.classList.add('scoring');
    setTimeout(() => marker.classList.remove('scoring'), 600);

    // Create floating points popup
    const popup = document.createElement('div');
    popup.className = 'points-popup';
    popup.textContent = `+${points}`;
    popup.style.left = `${marker.offsetLeft + 30}px`;
    popup.style.top = `${marker.offsetTop}px`;

    document.getElementById('road').appendChild(popup);

    setTimeout(() => popup.remove(), 1500);
}

/**
 * Trigger overtake animation
 */
function triggerOvertakeAnimation(teamId) {
    const marker = document.querySelector(`.team-marker[data-team-id="${teamId}"]`);
    if (!marker) return;

    marker.classList.add('overtaking');
    setTimeout(() => marker.classList.remove('overtaking'), 800);
}

/**
 * Check and show winner
 */
function checkWinner() {
    if (!shouldShowWinner()) {
        document.getElementById('winner-overlay').classList.remove('active');
        return;
    }

    const sortedTeams = getTeamsSortedByScore();
    if (sortedTeams.length === 0) return;

    const winner = sortedTeams[0];
    const winnerScore = calculateTotalScore(winner);

    // Update winner display
    const winnerTeamDiv = document.getElementById('winner-team');
    const avatar = getTeamAvatarEmoji(winner);

    winnerTeamDiv.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div>${escapeHtml(winner.name)}</div>
    `;

    document.getElementById('winner-score').textContent = `${winnerScore} punten!`;

    // Show overlay
    document.getElementById('winner-overlay').classList.add('active');

    // Trigger celebrations
    playSound('winner');
    launchConfetti();
    launchFireworks();
}

/**
 * Launch confetti
 */
function launchConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffd700', '#ff6b35'];

    for (let i = 0; i < 150; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
            confetti.style.animationDelay = `${Math.random() * 0.5}s`;

            // Random shapes
            const shapes = ['50%', '0', '50% 0 50% 50%'];
            confetti.style.borderRadius = shapes[Math.floor(Math.random() * shapes.length)];

            container.appendChild(confetti);

            setTimeout(() => confetti.remove(), 4000);
        }, i * 20);
    }
}

/**
 * Launch fireworks
 */
function launchFireworks() {
    const container = document.getElementById('confetti-container');
    const colors = ['#ff0000', '#ffd700', '#00ff00', '#00ffff', '#ff00ff'];

    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            const x = Math.random() * 80 + 10;
            const y = Math.random() * 50 + 10;

            for (let j = 0; j < 20; j++) {
                const firework = document.createElement('div');
                firework.className = 'firework';
                firework.style.left = `${x}%`;
                firework.style.top = `${y}%`;
                firework.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                firework.style.boxShadow = `0 0 10px ${colors[Math.floor(Math.random() * colors.length)]}`;

                container.appendChild(firework);

                setTimeout(() => firework.remove(), 1000);
            }
        }, i * 500);
    }
}

/**
 * Play sound effect
 */
function playSound(type) {
    const settings = getSettings();
    if (!settings.soundEnabled) return;

    // Create audio context for generating sounds
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        switch (type) {
            case 'points':
                playPointsSound(audioContext);
                break;
            case 'overtake':
                playOvertakeSound(audioContext);
                break;
            case 'winner':
                playWinnerSound(audioContext);
                break;
        }
    } catch (e) {
        console.log('Audio not supported:', e);
    }
}

/**
 * Play points sound (happy ding)
 */
function playPointsSound(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialDecayTo = 0.01;
    gain.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
}

/**
 * Play overtake sound (whoosh)
 */
function playOvertakeSound(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.2);
    osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.setValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
}

/**
 * Play winner sound (fanfare)
 */
function playWinnerSound(ctx) {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const duration = 0.3;

    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * duration);

        gain.gain.setValueAtTime(0, ctx.currentTime + i * duration);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * duration + 0.05);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * duration + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + i * duration + duration);

        osc.start(ctx.currentTime + i * duration);
        osc.stop(ctx.currentTime + i * duration + duration);
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
