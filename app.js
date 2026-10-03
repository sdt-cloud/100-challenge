/* ============================================
   100 Challenge - Application Logic (Local / No Auth)
   ============================================ */

// ============ State Management ============
const APP_STATE = {
    currentChallenge: null,
    currentFilter: 'all',
    currentYear: new Date().getFullYear().toString(),
    editingItemId: null,
    posterCache: {}
};

// ============ OMDB API Configuration ============
const MOVIE_API = {
    API_KEY: '3e974fca',
    BASE_URL: 'https://www.omdbapi.com',
    TURKISH_TRANSLATIONS: {
        'baba': 'The Godfather',
        'esaretin bedeli': 'The Shawshank Redemption',
        'yüzüklerin efendisi': 'The Lord of the Rings',
        'ucuz roman': 'Pulp Fiction',
        'dövüş kulübü': 'Fight Club',
        'kayıp balık nemo': 'Finding Nemo',
        'kara şövalye': 'The Dark Knight',
        'yıldız savaşları': 'Star Wars',
        'terminatör': 'Terminator',
        'matrix': 'The Matrix',
        'gladyatör': 'Gladiator',
        'forrest gump': 'Forrest Gump',
        'titanik': 'Titanic',
        'aslan kral': 'The Lion King',
        'başlangıç': 'Inception',
        'yedi': 'Se7en',
        'yeşil yol': 'The Green Mile'
    },
    translateToEnglish(turkishName) {
        const lowerName = turkishName.toLowerCase().trim();
        if (this.TURKISH_TRANSLATIONS[lowerName]) {
            return this.TURKISH_TRANSLATIONS[lowerName];
        }
        for (const [tr, en] of Object.entries(this.TURKISH_TRANSLATIONS)) {
            if (lowerName.includes(tr) || tr.includes(lowerName)) {
                return en;
            }
        }
        return null;
    },
    async searchMovie(query) {
        try {
            const parenthesesMatch = query.match(/\(([^)]+)\)\s*$/);
            if (parenthesesMatch) {
                const englishName = parenthesesMatch[1];
                const posterUrl = await this.fetchPoster(englishName);
                if (posterUrl) return posterUrl;
            }
            let posterUrl = await this.fetchPoster(query);
            if (!posterUrl) {
                const englishName = this.translateToEnglish(query);
                if (englishName) {
                    posterUrl = await this.fetchPoster(englishName);
                }
            }
            return posterUrl;
        } catch (error) {
            return null;
        }
    },
    async fetchPoster(query) {
        try {
            const response = await fetch(
                `${this.BASE_URL}/?apikey=${this.API_KEY}&t=${encodeURIComponent(query)}&type=movie`
            );
            if (!response.ok) return null;
            const data = await response.json();
            if (data.Response === 'True' && data.Poster && data.Poster !== 'N/A') {
                return data.Poster;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
};

// ============ Jikan API (Anime) ============
const ANIME_API = {
    BASE_URL: 'https://api.jikan.moe/v4',
    cache: {},
    async searchAnime(query) {
        try {
            const cacheKey = query.toLowerCase().trim();
            if (this.cache[cacheKey]) return this.cache[cacheKey];
            let searchQuery = query;
            const parenthesesMatch = query.match(/\(([^)]+)\)\s*$/);
            if (parenthesesMatch) searchQuery = parenthesesMatch[1];
            
            const response = await fetch(`${this.BASE_URL}/anime?q=${encodeURIComponent(searchQuery)}&limit=1&sfw=true`);
            if (!response.ok) return null;
            const data = await response.json();
            if (data.data && data.data.length > 0) {
                const imageUrl = data.data[0].images?.jpg?.image_url || null;
                this.cache[cacheKey] = imageUrl;
                return imageUrl;
            }
            return null;
        } catch (e) {
            return null;
        }
    }
};

// ============ RAWG API (Games) ============
const GAME_API = {
    BASE_URL: 'https://api.rawg.io/api',
    API_KEY: 'c542e67aec3a4340908f9de9e86038af',
    cache: {},
    async searchGame(query) {
        try {
            const cacheKey = query.toLowerCase().trim();
            if (this.cache[cacheKey]) return this.cache[cacheKey];
            const response = await fetch(`${this.BASE_URL}/games?key=${this.API_KEY}&search=${encodeURIComponent(query)}&page_size=1`);
            if (!response.ok) return null;
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const imageUrl = data.results[0].background_image || null;
                this.cache[cacheKey] = imageUrl;
                return imageUrl;
            }
            return null;
        } catch (e) {
            return null;
        }
    }
};

// ============ Local Storage Data Layer ============
const Storage = {
    KEYS: {
        CHALLENGES: '100challenge_local_lists',
        THEME: '100challenge_theme'
    },
    getData() {
        const data = localStorage.getItem(this.KEYS.CHALLENGES);
        return data ? JSON.parse(data) : {
            '2026': [
                {
                    id: 'sample_1',
                    category: 'films',
                    title: '100 Klasik Film',
                    emoji: '🎬',
                    items: [
                        { id: 'i1', name: 'The Godfather (Baba)', completed: true, note: 'Harika bir başyapıt.' },
                        { id: 'i2', name: 'The Shawshank Redemption (Esaretin Bedeli)', completed: false, note: '' },
                        { id: 'i3', name: 'Pulp Fiction (Ucuz Roman)', completed: false, note: '' }
                    ]
                }
            ]
        };
    },
    saveData(data) {
        localStorage.setItem(this.KEYS.CHALLENGES, JSON.stringify(data));
    }
};

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getCategoryInfo(category) {
    const categories = {
        films: { name: 'Filmler', emoji: '🎬', placeholder: 'Film ekle...', listExample: 'Örn: 100 Klasik Film' },
        books: { name: 'Kitaplar', emoji: '📚', placeholder: 'Kitap ekle...', listExample: 'Örn: Okunacak 100 Kitap' },
        music: { name: 'Müzik', emoji: '🎧', placeholder: 'Müzik ekle...', listExample: 'Örn: Dinlenecek 100 Albüm' },
        anime: { name: 'Anime', emoji: '🎌', placeholder: 'Anime ekle...', listExample: 'Örn: İzlenecek 100 Anime' },
        games: { name: 'Oyunlar', emoji: '🎮', placeholder: 'Oyun ekle...', listExample: 'Örn: Oynanacak 100 Oyun' },
        custom: { name: 'Özel', emoji: '⭐', placeholder: 'Madde ekle...', listExample: 'Örn: 2026 Hedeflerim' }
    };
    return categories[category] || categories.custom;
}

// ============ DOM Elements ============
const DOM = {
    dashboardPage: document.getElementById('dashboard-page'),
    challengePage: document.getElementById('challenge-page'),
    currentYear: document.getElementById('current-year'),
    totalChallenges: document.getElementById('total-challenges'),
    totalCompleted: document.getElementById('total-completed'),
    overallProgress: document.getElementById('overall-progress'),
    challengesGrid: document.getElementById('challenges-grid'),
    emptyState: document.getElementById('empty-state'),
    addChallengeBtn: document.getElementById('add-challenge-btn'),
    backBtn: document.getElementById('back-btn'),
    randomPickBtn: document.getElementById('random-pick-btn'),
    deleteChallengeBtn: document.getElementById('delete-challenge-btn'),
    challengeEmoji: document.getElementById('challenge-emoji'),
    challengeTitle: document.getElementById('challenge-title'),
    challengeProgressBar: document.getElementById('challenge-progress-bar'),
    challengeProgressText: document.getElementById('challenge-progress-text'),
    searchItems: document.getElementById('search-items'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    newItemInput: document.getElementById('new-item-input'),
    addItemBtn: document.getElementById('add-item-btn'),
    itemsList: document.getElementById('items-list'),
    newChallengeModal: document.getElementById('new-challenge-modal'),
    newChallengeForm: document.getElementById('new-challenge-form'),
    randomModal: document.getElementById('random-modal'),
    randomItemName: document.getElementById('random-item-name'),
    randomPoster: document.getElementById('random-poster'),
    editItemModal: document.getElementById('edit-item-modal'),
    editItemForm: document.getElementById('edit-item-form'),
    editItemName: document.getElementById('edit-item-name'),
    editItemNote: document.getElementById('edit-item-note')
};

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
}

// ============ Dashboard & Challenges ============
function getUserChallenges() {
    const data = Storage.getData();
    return data[APP_STATE.currentYear] || [];
}

function setUserChallenges(challenges) {
    const data = Storage.getData();
    data[APP_STATE.currentYear] = challenges;
    Storage.saveData(data);
}

function showDashboard() {
    showPage('dashboard-page');
    DOM.currentYear.textContent = APP_STATE.currentYear;
    renderChallengesList();
    updateStats();
}

function renderChallengesList() {
    const challenges = getUserChallenges();
    if (challenges.length === 0) {
        DOM.challengesGrid.classList.add('hidden');
        DOM.emptyState.classList.remove('hidden');
        return;
    }
    DOM.emptyState.classList.add('hidden');
    DOM.challengesGrid.classList.remove('hidden');

    DOM.challengesGrid.innerHTML = challenges.map((challenge, index) => {
        const completed = challenge.items.filter(i => i.completed).length;
        const total = challenge.items.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        const categoryInfo = getCategoryInfo(challenge.category);

        return `
            <div class="challenge-card" data-id="${challenge.id}" data-index="${index}">
                <div class="challenge-card-header">
                    <span class="challenge-card-emoji">${challenge.emoji || categoryInfo.emoji}</span>
                    <div class="challenge-card-info">
                        <h3 class="challenge-card-title">${escapeHtml(challenge.title)}</h3>
                        <span class="challenge-card-category">${categoryInfo.name}</span>
                    </div>
                </div>
                <div class="challenge-card-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="progress-text">${completed}/${total} tamamlandı (${percentage}%)</span>
                </div>
            </div>
        `;
    }).join('');

    DOM.challengesGrid.querySelectorAll('.challenge-card').forEach(card => {
        card.addEventListener('click', () => {
            openChallenge(card.dataset.id);
        });
    });
}

function updateStats() {
    const challenges = getUserChallenges();
    const totalItems = challenges.reduce((sum, c) => sum + c.items.length, 0);
    const completedItems = challenges.reduce((sum, c) => sum + c.items.filter(i => i.completed).length, 0);
    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    DOM.totalChallenges.textContent = challenges.length;
    DOM.totalCompleted.textContent = completedItems;
    DOM.overallProgress.textContent = percentage + '%';
}

function createChallenge(category, title, emoji) {
    const challenges = getUserChallenges();
    const categoryInfo = getCategoryInfo(category);
    const newChallenge = {
        id: generateId(),
        category: category,
        title: title,
        emoji: emoji || categoryInfo.emoji,
        items: [],
        createdAt: new Date().toISOString()
    };
    challenges.push(newChallenge);
    setUserChallenges(challenges);
    renderChallengesList();
    updateStats();
    return newChallenge;
}

function deleteChallenge(challengeId) {
    if (!confirm('Bu listeyi silmek istediğinizden emin misiniz?')) return;
    let challenges = getUserChallenges();
    challenges = challenges.filter(c => c.id !== challengeId);
    setUserChallenges(challenges);
    showDashboard();
}

function openChallenge(challengeId) {
    const challenges = getUserChallenges();
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) return;

    APP_STATE.currentChallenge = challenge;
    APP_STATE.currentFilter = 'all';
    showPage('challenge-page');
    renderChallengeDetail();
}

function renderChallengeDetail() {
    const challenge = APP_STATE.currentChallenge;
    if (!challenge) return;
    const categoryInfo = getCategoryInfo(challenge.category);

    DOM.challengeEmoji.textContent = challenge.emoji || categoryInfo.emoji;
    DOM.challengeTitle.textContent = challenge.title;
    DOM.newItemInput.placeholder = categoryInfo.placeholder;

    updateChallengeProgress();
    renderItems();
}

function updateChallengeProgress() {
    const challenge = APP_STATE.currentChallenge;
    if (!challenge) return;
    const completed = challenge.items.filter(i => i.completed).length;
    const total = challenge.items.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    DOM.challengeProgressBar.style.width = percentage + '%';
    DOM.challengeProgressText.textContent = `${completed}/${total} tamamlandı (${percentage}%)`;
}

// ============ Items ============
function addItem(name) {
    if (!name.trim() || !APP_STATE.currentChallenge) return;
    const newItem = {
        id: generateId(),
        name: name.trim(),
        completed: false,
        note: '',
        createdAt: new Date().toISOString()
    };
    APP_STATE.currentChallenge.items.push(newItem);
    saveCurrentChallenge();
    renderItems();
    updateChallengeProgress();
}

function toggleItem(itemId) {
    if (!APP_STATE.currentChallenge) return;
    const item = APP_STATE.currentChallenge.items.find(i => i.id === itemId);
    if (item) {
        item.completed = !item.completed;
        saveCurrentChallenge();
        renderItems();
        updateChallengeProgress();
    }
}

function deleteItem(itemId) {
    if (!APP_STATE.currentChallenge) return;
    APP_STATE.currentChallenge.items = APP_STATE.currentChallenge.items.filter(i => i.id !== itemId);
    saveCurrentChallenge();
    renderItems();
    updateChallengeProgress();
}

function updateItem(itemId, name, note) {
    if (!APP_STATE.currentChallenge) return;
    const item = APP_STATE.currentChallenge.items.find(i => i.id === itemId);
    if (item) {
        item.name = name;
        item.note = note;
        saveCurrentChallenge();
        renderItems();
    }
}

function saveCurrentChallenge() {
    if (!APP_STATE.currentChallenge) return;
    const challenges = getUserChallenges();
    const index = challenges.findIndex(c => c.id === APP_STATE.currentChallenge.id);
    if (index !== -1) {
        challenges[index] = APP_STATE.currentChallenge;
        setUserChallenges(challenges);
        updateStats();
    }
}

function renderItems() {
    const challenge = APP_STATE.currentChallenge;
    if (!challenge) return;
    const searchTerm = DOM.searchItems.value.toLowerCase();

    let items = challenge.items.filter(item => {
        if (searchTerm && !item.name.toLowerCase().includes(searchTerm)) return false;
        if (APP_STATE.currentFilter === 'completed' && !item.completed) return false;
        if (APP_STATE.currentFilter === 'pending' && item.completed) return false;
        return true;
    });

    if (items.length === 0) {
        DOM.itemsList.innerHTML = `
            <li class="empty-items">
                <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                    ${searchTerm ? 'Arama sonucu bulunamadı.' : 'Henüz madde eklenmemiş.'}
                </p>
            </li>
        `;
        return;
    }

    const isFilmCategory = challenge.category === 'films';
    const isAnimeCategory = challenge.category === 'anime';
    const isGamesCategory = challenge.category === 'games';
    const showPoster = isFilmCategory || isAnimeCategory || isGamesCategory;

    DOM.itemsList.innerHTML = items.map((item, index) => `
        <li class="item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
            ${showPoster ? `<div class="item-poster loading" data-item-id="${item.id}"></div>` : ''}
            <span class="item-number">${index + 1}.</span>
            <input type="checkbox" class="item-checkbox" ${item.completed ? 'checked' : ''}>
            <div class="item-content">
                <span class="item-name">${escapeHtml(item.name)}</span>
                ${item.note ? `<p class="item-note">${escapeHtml(item.note)}</p>` : ''}
            </div>
            <div class="item-actions">
                <button class="item-action-btn edit" title="Düzenle">✏️</button>
                <button class="item-action-btn delete" title="Sil">🗑️</button>
            </div>
        </li>
    `).join('');

    if (isFilmCategory) loadMoviePosters(items);
    else if (isAnimeCategory) loadAnimePosters(items);
    else if (isGamesCategory) loadGamePosters(items);

    DOM.itemsList.querySelectorAll('.item').forEach(itemEl => {
        const itemId = itemEl.dataset.id;
        itemEl.querySelector('.item-checkbox').addEventListener('change', () => toggleItem(itemId));
        itemEl.querySelector('.edit').addEventListener('click', (e) => { e.stopPropagation(); openEditItemModal(itemId); });
        itemEl.querySelector('.delete').addEventListener('click', (e) => { e.stopPropagation(); deleteItem(itemId); });
    });
}

async function loadMoviePosters(items) {
    for (const item of items) {
        const posterEl = document.querySelector(`.item-poster[data-item-id="${item.id}"]`);
        if (!posterEl) continue;
        if (APP_STATE.posterCache[item.name]) {
            displayPoster(posterEl, APP_STATE.posterCache[item.name]);
            continue;
        }
        const posterUrl = await MOVIE_API.searchMovie(item.name);
        if (posterUrl) {
            APP_STATE.posterCache[item.name] = posterUrl;
            displayPoster(posterEl, posterUrl);
        } else {
            posterEl.classList.remove('loading');
            posterEl.classList.add('no-poster');
            posterEl.textContent = '🎬';
        }
    }
}

async function loadAnimePosters(items) {
    for (const item of items) {
        const posterEl = document.querySelector(`.item-poster[data-item-id="${item.id}"]`);
        if (!posterEl) continue;
        if (APP_STATE.posterCache[item.name]) {
            displayPoster(posterEl, APP_STATE.posterCache[item.name]);
            continue;
        }
        const posterUrl = await ANIME_API.searchAnime(item.name);
        if (posterUrl) {
            APP_STATE.posterCache[item.name] = posterUrl;
            displayPoster(posterEl, posterUrl);
        } else {
            posterEl.classList.remove('loading');
            posterEl.classList.add('no-poster');
            posterEl.textContent = '🎌';
        }
    }
}

async function loadGamePosters(items) {
    for (const item of items) {
        const posterEl = document.querySelector(`.item-poster[data-item-id="${item.id}"]`);
        if (!posterEl) continue;
        if (APP_STATE.posterCache[item.name]) {
            displayPoster(posterEl, APP_STATE.posterCache[item.name]);
            continue;
        }
        const posterUrl = await GAME_API.searchGame(item.name);
        if (posterUrl) {
            APP_STATE.posterCache[item.name] = posterUrl;
            displayPoster(posterEl, posterUrl);
        } else {
            posterEl.classList.remove('loading');
            posterEl.classList.add('no-poster');
            posterEl.textContent = '🎮';
        }
    }
}

function displayPoster(element, url, fallbackEmoji = '🎬') {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Afiş';
    img.className = 'item-poster';
    img.onerror = () => {
        element.classList.remove('loading');
        element.classList.add('no-poster');
        element.textContent = fallbackEmoji;
    };
    img.onload = () => {
        element.replaceWith(img);
    };
}

// ============ Random Pick ============
function pickRandomItem() {
    const challenge = APP_STATE.currentChallenge;
    if (!challenge || challenge.items.length === 0) return;

    const pendingItems = challenge.items.filter(i => !i.completed);
    const pool = pendingItems.length > 0 ? pendingItems : challenge.items;
    const randomItem = pool[Math.floor(Math.random() * pool.length)];

    DOM.randomItemName.textContent = randomItem.name;
    DOM.randomModal.classList.remove('hidden');
}

// ============ Modals ============
function showNewChallengeModal() {
    DOM.newChallengeModal.classList.remove('hidden');
    document.getElementById('challenge-name').focus();
}

function hideNewChallengeModal() {
    DOM.newChallengeModal.classList.add('hidden');
    DOM.newChallengeForm.reset();
}

function hideRandomModal() {
    DOM.randomModal.classList.add('hidden');
}

function openEditItemModal(itemId) {
    const item = APP_STATE.currentChallenge?.items.find(i => i.id === itemId);
    if (!item) return;
    APP_STATE.editingItemId = itemId;
    DOM.editItemName.value = item.name;
    DOM.editItemNote.value = item.note || '';
    DOM.editItemModal.classList.remove('hidden');
    DOM.editItemName.focus();
}

function hideEditItemModal() {
    DOM.editItemModal.classList.add('hidden');
    APP_STATE.editingItemId = null;
    DOM.editItemForm.reset();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ Event Listeners ============
function initEventListeners() {
    // Add challenge btn
    DOM.addChallengeBtn.addEventListener('click', showNewChallengeModal);

    // New challenge form
    DOM.newChallengeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const category = document.getElementById('challenge-category').value;
        const name = document.getElementById('challenge-name').value;
        const emoji = document.getElementById('challenge-emoji-input').value;
        if (name.trim()) {
            createChallenge(category, name.trim(), emoji);
            hideNewChallengeModal();
        }
    });

    // Back btn
    DOM.backBtn.addEventListener('click', () => {
        APP_STATE.currentChallenge = null;
        showDashboard();
    });

    // Delete challenge
    DOM.deleteChallengeBtn.addEventListener('click', () => {
        if (APP_STATE.currentChallenge) {
            deleteChallenge(APP_STATE.currentChallenge.id);
        }
    });

    // Random pick
    DOM.randomPickBtn.addEventListener('click', pickRandomItem);

    // Search items
    DOM.searchItems.addEventListener('input', renderItems);

    // Filter buttons
    DOM.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            APP_STATE.currentFilter = btn.dataset.filter;
            renderItems();
        });
    });

    // Add item form / button
    DOM.addItemBtn.addEventListener('click', () => {
        addItem(DOM.newItemInput.value);
        DOM.newItemInput.value = '';
    });
    DOM.newItemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addItem(DOM.newItemInput.value);
            DOM.newItemInput.value = '';
        }
    });

    // Edit item form
    DOM.editItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (APP_STATE.editingItemId) {
            updateItem(
                APP_STATE.editingItemId,
                DOM.editItemName.value,
                DOM.editItemNote.value
            );
            hideEditItemModal();
        }
    });
}

// ============ Theme Management ============
const Theme = {
    toggle: document.getElementById('theme-toggle'),
    init() {
        const savedTheme = localStorage.getItem(Storage.KEYS.THEME) || 'light';
        this.setTheme(savedTheme);
        this.toggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
            localStorage.setItem(Storage.KEYS.THEME, newTheme);
        });
    },
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }
};

// ============ Initialize App ============
function initApp() {
    Theme.init();
    initEventListeners();
    showDashboard();
}

document.addEventListener('DOMContentLoaded', initApp);
