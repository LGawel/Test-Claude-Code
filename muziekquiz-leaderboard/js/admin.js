/**
 * Admin Panel for Music Quiz Leaderboard
 */

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initTeamForm();
    initScoresTab();
    initSettingsTab();
    loadTeamsList();
    updateScoresInput();
});

/**
 * Tab Navigation
 */
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            // Update active states
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');

            // Refresh data when switching tabs
            if (tabId === 'scores') {
                updateScoresInput();
            }
        });
    });
}

/**
 * Team Form Initialization
 */
function initTeamForm() {
    // Populate person dropdown
    const personSelect = document.getElementById('team-person');
    FAMOUS_PERSONS.forEach(person => {
        const option = document.createElement('option');
        option.value = person.id;
        option.textContent = `${person.emoji} ${person.name}`;
        personSelect.appendChild(option);
    });

    // Populate vehicle dropdown
    const vehicleSelect = document.getElementById('team-vehicle');
    VEHICLES.forEach(vehicle => {
        const option = document.createElement('option');
        option.value = vehicle.id;
        option.textContent = `${vehicle.emoji} ${vehicle.name}`;
        vehicleSelect.appendChild(option);
    });

    // Add team button
    document.getElementById('add-team-btn').addEventListener('click', addTeam);

    // Clear teams button
    document.getElementById('clear-teams-btn').addEventListener('click', () => {
        if (confirm('Weet je zeker dat je alle teams wilt verwijderen?')) {
            saveTeams([]);
            loadTeamsList();
            updateScoresInput();
        }
    });
}

/**
 * Add a new team
 */
function addTeam() {
    const nameInput = document.getElementById('team-name');
    const personSelect = document.getElementById('team-person');
    const vehicleSelect = document.getElementById('team-vehicle');

    const name = nameInput.value.trim();
    const personId = personSelect.value;
    const vehicleId = vehicleSelect.value;

    // Validation
    if (!name) {
        alert('Vul een teamnaam in!');
        nameInput.focus();
        return;
    }

    if (!personId) {
        alert('Kies een bekend persoon!');
        personSelect.focus();
        return;
    }

    if (!vehicleId) {
        alert('Kies een voertuig!');
        vehicleSelect.focus();
        return;
    }

    const teams = getTeams();

    if (teams.length >= 6) {
        alert('Maximum aantal teams (6) bereikt!');
        return;
    }

    // Check for duplicate name
    if (teams.some(t => t.name.toLowerCase() === name.toLowerCase())) {
        alert('Er bestaat al een team met deze naam!');
        return;
    }

    // Create new team
    const newTeam = {
        id: Date.now().toString(),
        name: name,
        personId: personId,
        vehicleId: vehicleId,
        scores: {}
    };

    teams.push(newTeam);
    saveTeams(teams);

    // Reset form
    nameInput.value = '';
    personSelect.value = '';
    vehicleSelect.value = '';

    // Refresh list
    loadTeamsList();
    updateScoresInput();
}

/**
 * Load and display teams list
 */
function loadTeamsList() {
    const teams = getTeams();
    const container = document.getElementById('teams-list');
    const countSpan = document.getElementById('team-count');

    countSpan.textContent = teams.length;

    if (teams.length === 0) {
        container.innerHTML = '<p class="no-teams">Nog geen teams aangemaakt.</p>';
        return;
    }

    container.innerHTML = teams.map(team => {
        const person = getPersonById(team.personId);
        const vehicle = getVehicleById(team.vehicleId);
        const avatarEmoji = getTeamAvatarEmoji(team);

        return `
            <div class="team-item" data-team-id="${team.id}">
                <div class="avatar">${avatarEmoji}</div>
                <div class="info">
                    <div class="name">${escapeHtml(team.name)}</div>
                    <div class="details">${person?.name || 'Onbekend'} op ${vehicle?.name || 'Onbekend'}</div>
                </div>
                <button class="delete-btn" onclick="deleteTeam('${team.id}')" title="Verwijder team">×</button>
            </div>
        `;
    }).join('');
}

/**
 * Delete a team
 */
function deleteTeam(teamId) {
    if (!confirm('Weet je zeker dat je dit team wilt verwijderen?')) {
        return;
    }

    let teams = getTeams();
    teams = teams.filter(t => t.id !== teamId);
    saveTeams(teams);

    loadTeamsList();
    updateScoresInput();
}

/**
 * Initialize Scores Tab
 */
function initScoresTab() {
    const settings = getSettings();
    const roundSelect = document.getElementById('select-round');

    // Populate round selector based on settings
    roundSelect.innerHTML = '';
    for (let i = 1; i <= settings.totalRounds; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Ronde ${i}`;
        roundSelect.appendChild(option);
    }

    // Set current round
    roundSelect.value = getCurrentRound();

    // Round change handler
    roundSelect.addEventListener('change', () => {
        saveCurrentRound(parseInt(roundSelect.value));
        updateScoresInput();
    });

    // Publish scores button
    document.getElementById('publish-scores-btn').addEventListener('click', publishScores);

    // Finish quiz button
    document.getElementById('finish-quiz-btn').addEventListener('click', finishQuiz);
}

/**
 * Update scores input form
 */
function updateScoresInput() {
    const teams = getTeams();
    const container = document.getElementById('scores-input');
    const currentRound = getCurrentRound();
    const settings = getSettings();

    if (teams.length === 0) {
        container.innerHTML = '<p class="no-teams">Voeg eerst teams toe in het "Teams Beheren" tabblad.</p>';
        return;
    }

    container.innerHTML = teams.map(team => {
        const avatarEmoji = getTeamAvatarEmoji(team);
        const totalScore = calculateTotalScore(team);
        const roundScore = team.scores?.[currentRound] || 0;

        return `
            <div class="score-input-item" data-team-id="${team.id}">
                <div class="avatar">${avatarEmoji}</div>
                <div class="team-info">
                    <div class="name">${escapeHtml(team.name)}</div>
                    <div class="current-score">Totaal: ${totalScore} punten</div>
                </div>
                <div class="points-input">
                    <input type="number"
                           class="round-score-input"
                           data-team-id="${team.id}"
                           value="${roundScore}"
                           min="0"
                           max="${settings.maxPointsPerRound}">
                    <span>/ ${settings.maxPointsPerRound}</span>
                </div>
            </div>
        `;
    }).join('');

    // Add input change handlers for live saving
    container.querySelectorAll('.round-score-input').forEach(input => {
        input.addEventListener('change', saveRoundScore);
        input.addEventListener('input', saveRoundScore);
    });
}

/**
 * Save individual round score
 */
function saveRoundScore(event) {
    const input = event.target;
    const teamId = input.dataset.teamId;
    const currentRound = getCurrentRound();
    const settings = getSettings();

    let score = parseInt(input.value) || 0;
    score = Math.max(0, Math.min(score, settings.maxPointsPerRound));
    input.value = score;

    const teams = getTeams();
    const team = teams.find(t => t.id === teamId);

    if (team) {
        if (!team.scores) team.scores = {};
        team.scores[currentRound] = score;
        saveTeams(teams);

        // Update total score display
        const container = input.closest('.score-input-item');
        const totalDisplay = container.querySelector('.current-score');
        totalDisplay.textContent = `Totaal: ${calculateTotalScore(team)} punten`;
    }
}

/**
 * Publish scores to leaderboard
 */
function publishScores() {
    const teams = getTeams();

    if (teams.length === 0) {
        alert('Voeg eerst teams toe!');
        return;
    }

    // Trigger storage event for leaderboard to pick up
    saveTeams(teams);
    saveCurrentRound(getCurrentRound());

    // Visual feedback
    const btn = document.getElementById('publish-scores-btn');
    const originalText = btn.textContent;
    btn.textContent = '✅ Gepubliceerd!';
    btn.disabled = true;

    setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
    }, 2000);
}

/**
 * Finish quiz and show winner
 */
function finishQuiz() {
    const teams = getTeams();

    if (teams.length === 0) {
        alert('Er zijn geen teams!');
        return;
    }

    if (!confirm('Weet je zeker dat je de quiz wilt afronden en de winnaar wilt tonen?')) {
        return;
    }

    // Set winner display flag
    setShowWinner(true);

    // Visual feedback
    const btn = document.getElementById('finish-quiz-btn');
    btn.textContent = '🎉 Winnaar wordt getoond!';
    btn.disabled = true;
}

/**
 * Initialize Settings Tab
 */
function initSettingsTab() {
    const settings = getSettings();

    // Load current settings
    document.getElementById('total-rounds-input').value = settings.totalRounds;
    document.getElementById('max-points-input').value = settings.maxPointsPerRound;
    document.getElementById('sound-enabled').checked = settings.soundEnabled;

    // Save settings button
    document.getElementById('save-settings-btn').addEventListener('click', () => {
        const newSettings = {
            totalRounds: parseInt(document.getElementById('total-rounds-input').value) || 5,
            maxPointsPerRound: parseInt(document.getElementById('max-points-input').value) || 10,
            soundEnabled: document.getElementById('sound-enabled').checked
        };

        saveSettings(newSettings);

        // Refresh round selector
        initScoresTab();

        alert('Instellingen opgeslagen!');
    });

    // Reset quiz button
    document.getElementById('reset-quiz-btn').addEventListener('click', () => {
        if (confirm('Weet je HEEL zeker? Dit verwijdert alle teams en scores!')) {
            resetQuiz();
            loadTeamsList();
            updateScoresInput();
            alert('Quiz is gereset!');
        }
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
