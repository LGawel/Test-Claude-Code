/**
 * Shared data and utilities for the Music Quiz Leaderboard
 */

// Bekende personen met emoji representatie
const FAMOUS_PERSONS = [
    { id: 'trump', name: 'Donald Trump', emoji: '🍊', color: '#ff6b35' },
    { id: 'einstein', name: 'Albert Einstein', emoji: '🧠', color: '#9c27b0' },
    { id: 'elvis', name: 'Elvis Presley', emoji: '🕺', color: '#e91e63' },
    { id: 'queen', name: 'Queen Elizabeth', emoji: '👑', color: '#ffd700' },
    { id: 'batman', name: 'Batman', emoji: '🦇', color: '#212121' },
    { id: 'marilyn', name: 'Marilyn Monroe', emoji: '💋', color: '#f48fb1' },
    { id: 'bob', name: 'Bob Marley', emoji: '🎸', color: '#4caf50' },
    { id: 'chef', name: 'Gordon Ramsay', emoji: '👨‍🍳', color: '#ff5722' },
    { id: 'elon', name: 'Elon Musk', emoji: '🚀', color: '#2196f3' },
    { id: 'oprah', name: 'Oprah Winfrey', emoji: '⭐', color: '#ff9800' }
];

// Voertuigen met emoji representatie
const VEHICLES = [
    { id: 'motorcycle', name: 'Motor', emoji: '🏍️' },
    { id: 'car', name: 'Auto', emoji: '🚗' },
    { id: 'bicycle', name: 'Fiets', emoji: '🚲' },
    { id: 'rocket', name: 'Raket', emoji: '🚀' },
    { id: 'scooter', name: 'Step', emoji: '🛴' },
    { id: 'skateboard', name: 'Skateboard', emoji: '🛹' },
    { id: 'horse', name: 'Paard', emoji: '🐎' },
    { id: 'tractor', name: 'Tractor', emoji: '🚜' },
    { id: 'boat', name: 'Boot', emoji: '⛵' },
    { id: 'helicopter', name: 'Helikopter', emoji: '🚁' }
];

// LocalStorage keys
const STORAGE_KEYS = {
    TEAMS: 'muziekquiz_teams',
    SETTINGS: 'muziekquiz_settings',
    CURRENT_ROUND: 'muziekquiz_current_round',
    SHOW_WINNER: 'muziekquiz_show_winner'
};

// Default settings
const DEFAULT_SETTINGS = {
    totalRounds: 5,
    maxPointsPerRound: 10,
    soundEnabled: true
};

/**
 * Get data from localStorage
 */
function getData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error reading from localStorage:', e);
        return null;
    }
}

/**
 * Save data to localStorage
 */
function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        // Dispatch event for cross-tab communication
        window.dispatchEvent(new StorageEvent('storage', {
            key: key,
            newValue: JSON.stringify(data)
        }));
        return true;
    } catch (e) {
        console.error('Error saving to localStorage:', e);
        return false;
    }
}

/**
 * Get all teams
 */
function getTeams() {
    return getData(STORAGE_KEYS.TEAMS) || [];
}

/**
 * Save teams
 */
function saveTeams(teams) {
    return saveData(STORAGE_KEYS.TEAMS, teams);
}

/**
 * Get settings
 */
function getSettings() {
    return getData(STORAGE_KEYS.SETTINGS) || DEFAULT_SETTINGS;
}

/**
 * Save settings
 */
function saveSettings(settings) {
    return saveData(STORAGE_KEYS.SETTINGS, settings);
}

/**
 * Get current round
 */
function getCurrentRound() {
    return getData(STORAGE_KEYS.CURRENT_ROUND) || 1;
}

/**
 * Save current round
 */
function saveCurrentRound(round) {
    return saveData(STORAGE_KEYS.CURRENT_ROUND, round);
}

/**
 * Calculate total score for a team
 */
function calculateTotalScore(team) {
    if (!team.scores) return 0;
    return Object.values(team.scores).reduce((sum, score) => sum + (score || 0), 0);
}

/**
 * Get teams sorted by score (highest first)
 */
function getTeamsSortedByScore() {
    const teams = getTeams();
    return teams.sort((a, b) => calculateTotalScore(b) - calculateTotalScore(a));
}

/**
 * Get person by ID
 */
function getPersonById(id) {
    return FAMOUS_PERSONS.find(p => p.id === id);
}

/**
 * Get vehicle by ID
 */
function getVehicleById(id) {
    return VEHICLES.find(v => v.id === id);
}

/**
 * Generate team avatar display (emoji combo)
 */
function getTeamAvatarEmoji(team) {
    const person = getPersonById(team.personId);
    const vehicle = getVehicleById(team.vehicleId);
    return `${person?.emoji || '👤'}${vehicle?.emoji || '🚗'}`;
}

/**
 * Get maximum possible score
 */
function getMaxPossibleScore() {
    const settings = getSettings();
    return settings.totalRounds * settings.maxPointsPerRound;
}

/**
 * Reset all quiz data
 */
function resetQuiz() {
    localStorage.removeItem(STORAGE_KEYS.TEAMS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_ROUND);
    localStorage.removeItem(STORAGE_KEYS.SHOW_WINNER);
    // Keep settings
}

/**
 * Check if winner should be shown
 */
function shouldShowWinner() {
    return getData(STORAGE_KEYS.SHOW_WINNER) === true;
}

/**
 * Set winner display state
 */
function setShowWinner(show) {
    return saveData(STORAGE_KEYS.SHOW_WINNER, show);
}
