/* ============================================
   100 Challenge - Application Logic (Local-First + Curated + Backup/Restore)
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
        if (this.TURKISH_TRANSLATIONS[lowerName]) return this.TURKISH_TRANSLATIONS[lowerName];
        for (const [tr, en] of Object.entries(this.TURKISH_TRANSLATIONS)) {
            if (lowerName.includes(tr) || tr.includes(lowerName)) return en;
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
                if (englishName) posterUrl = await this.fetchPoster(englishName);
            }
            return posterUrl;
        } catch (error) {
            return null;
        }
    },
    async fetchPoster(query) {
        try {
            const response = await fetch(`${this.BASE_URL}/?apikey=${this.API_KEY}&t=${encodeURIComponent(query)}&type=movie`);
            if (!response.ok) return null;
            const data = await response.json();
            if (data.Response === 'True' && data.Poster && data.Poster !== 'N/A') return data.Poster;
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
        CHALLENGES: '100challenge_local_challenges',
        THEME: '100challenge_theme'
    },
    getData() {
        const data = localStorage.getItem(this.KEYS.CHALLENGES);
        if (data) {
            try { return JSON.parse(data); } catch (e) { /* fall through to migration */ }
        }
        // Migrate data saved by the previous local APK version; never discard it.
        const legacy = localStorage.getItem('100challenge_local_lists');
        if (legacy) {
            try {
                const migrated = JSON.parse(legacy);
                const seeded = buildSeedData();
                const year = new Date().getFullYear().toString();
                const oldYear = Object.keys(migrated).find(k => Array.isArray(migrated[k]));
                const oldLists = oldYear ? migrated[oldYear] : [];
                const curatedIds = new Set(oldLists.map(c => c.curatedListId).filter(Boolean));
                seeded[year] = [...oldLists, ...(seeded[year] || []).filter(c => !curatedIds.has(c.curatedListId))];
                this.saveData(seeded);
                return seeded;
            } catch (e) { /* malformed legacy data; seed cleanly */ }
        }
        // First run: seed ALL curated lists into the user's collection.
        const seed = buildSeedData();
        this.saveData(seed);
        return seed;
    },
    ensureCuratedLists() {
        const data = this.getData();
        const year = new Date().getFullYear().toString();
        const current = data[year] || [];
        const known = new Set(current.map(c => c.curatedListId).filter(Boolean));
        const seeds = buildSeedData()[year] || [];
        const missing = seeds.filter(c => c.curatedListId && !known.has(c.curatedListId));
        if (missing.length) {
            data[year] = [...current, ...missing];
            this.saveData(data);
        }
        return data;
    },

    saveData(data) {
        localStorage.setItem(this.KEYS.CHALLENGES, JSON.stringify(data));
    }
};

// Build the initial collection from every curated list in the data bundle.
function buildSeedData() {
    const year = new Date().getFullYear().toString();
    const challenges = [];

    const bundle = window.CURATED_DATA || {};
    const all = [];
    for (const filename in bundle) {
        if (filename === 'lists-index.json') continue;
        const list = bundle[filename];
        if (!list || !Array.isArray(list.items)) continue;
        all.push(list);
    }

    // Curated category order for a nicer first impression
    const order = { films: 0, books: 1, anime: 2, games: 3, music: 4, custom: 5 };
    all.sort((a, b) => (order[a.category] ?? 9) - (order[b.category] ?? 9));

    for (const list of all) {
        challenges.push({
            id: 'curated_' + (list.id || list.title),
            title: list.title || 'Liste',
            category: list.category || 'custom',
            emoji: null,
            curatedListId: list.id || list.title,
            createdAt: new Date().toISOString(),
            items: list.items.map((item, index) => ({
                id: `${list.id || list.title}-${index}`,
                name: item.tr || item.title || item.name || String(item),
                completed: false,
                note: ''
            }))
        });
    }

    // Fallback: if no bundle is available, keep a small starter list.
    if (challenges.length === 0) {
        challenges.push({
            id: 'sample_1', category: 'films', title: '100 Klasik Film', emoji: '🎬',
            items: [
                { id: 'i1', name: 'The Godfather (Baba)', completed: false, note: '' }
            ]
        });
    }

    return { [year]: challenges };
}

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
    // Add curated collections missing from the current local data without overwriting user lists.
    const updated = Storage.ensureCuratedLists();
    const yearLists = updated[APP_STATE.currentYear] || [];
    if (yearLists.length !== (getUserChallenges() || []).length) {
        // Store any newly discovered catalog lists for this selected year.
        updated[APP_STATE.currentYear] = yearLists;
        Storage.saveData(updated);
    }
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
        const title = challenge.title || challenge.name || 'İsimsiz Liste';

        return `
            <div class="challenge-card" data-id="${challenge.id}" data-index="${index}">
                <div class="challenge-card-header">
                    <span class="challenge-card-emoji">${challenge.emoji || categoryInfo.emoji}</span>
                    <div class="challenge-card-info">
                        <h3 class="challenge-card-title">${escapeHtml(title)}</h3>
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
    DOM.challengeTitle.textContent = challenge.title || challenge.name;
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

// Add multiple items in bulk
function addBulkItems(text) {
    if (!text.trim() || !APP_STATE.currentChallenge) return;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let addedCount = 0;
    lines.forEach(line => {
        APP_STATE.currentChallenge.items.push({
            id: generateId(),
            name: line,
            completed: false,
            note: '',
            createdAt: new Date().toISOString()
        });
        addedCount++;
    });
    saveCurrentChallenge();
    renderItems();
    updateChallengeProgress();
    showToast(`${addedCount} madde toplu olarak eklendi!`);
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
function randomPick() {
    const challenge = APP_STATE.currentChallenge;
    if (!challenge || challenge.items.length === 0) return;

    const pendingItems = challenge.items.filter(i => !i.completed);
    const pool = pendingItems.length > 0 ? pendingItems : challenge.items;
    const randomItem = pool[Math.floor(Math.random() * pool.length)];

    DOM.randomItemName.textContent = randomItem.name;
    DOM.randomModal.classList.remove('hidden');
}

// ============ Curated Lists Module ============
const CuratedLists = {
    cache: {},
    index: null,
    async loadList(filename) {
        if (this.cache[filename]) return this.cache[filename];
        // 1) Prefer the embedded bundle (works offline in APK / file://)
        if (window.CURATED_DATA && window.CURATED_DATA[filename]) {
            this.cache[filename] = window.CURATED_DATA[filename];
            return this.cache[filename];
        }
        // 2) Fallback to fetching the JSON file (works on web servers)
        try {
            const response = await fetch(`data/${filename}`);
            if (!response.ok) throw new Error(`Failed to load ${filename}`);
            const data = await response.json();
            this.cache[filename] = data;
            return data;
        } catch (error) {
            return null;
        }
    },
    async loadIndex() {
        if (this.index) return this.index;
        // 1) Prefer the embedded bundle
        if (window.CURATED_DATA && window.CURATED_DATA['lists-index.json']) {
            this.index = window.CURATED_DATA['lists-index.json'];
            return this.index;
        }
        // 2) Fallback to fetch
        try {
            const response = await fetch('data/lists-index.json');
            if (!response.ok) throw new Error('Failed to load lists index');
            this.index = await response.json();
            return this.index;
        } catch (error) {
            return null;
        }
    },
    getCategoryEmoji(category) {
        const emojis = { films: '🎬', books: '📚', anime: '🎌', music: '🎧', games: '🎮' };
        return emojis[category] || '📋';
    },
    renderListCard(listData) {
        const itemCount = listData.items?.length || 100;
        const tags = listData.tags?.slice(0, 3) || [];
        const emoji = this.getCategoryEmoji(listData.category);
        const alreadyAdded = getUserChallenges().some(c => c.curatedListId === listData.id);

        return `
            <div class="curated-list-card" data-list-id="${listData.id}" onclick="CuratedLists.showListDetail('${listData.id}')">
                <div class="curated-list-header">
                    <span class="curated-list-emoji">${emoji}</span>
                    <div class="curated-list-info">
                        <h4 class="curated-list-title">${listData.title}</h4>
                        <p class="curated-list-description">${listData.description}</p>
                    </div>
                </div>
                <div class="curated-list-meta">
                    <div class="curated-list-tags">
                        ${tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('')}
                    </div>
                    <span class="curated-list-count">${itemCount} öğe</span>
                </div>
                <div class="curated-list-actions">
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); CuratedLists.previewList('${listData.id}')">👁️ Önizle</button>
                    ${alreadyAdded
                        ? `<button class="btn btn-ghost curated-added-btn" onclick="event.stopPropagation(); CuratedLists.openInCollection('${listData.id}')">✓ Listelerimde — Aç</button>`
                        : `<button class="btn btn-primary" onclick="event.stopPropagation(); CuratedLists.addListToCollections('${listData.id}')">+ Koleksiyonuma Ekle</button>`}
                </div>
            </div>
        `;
    },
    openInCollection(listId) {
        const challenge = getUserChallenges().find(c => c.curatedListId === listId);
        if (!challenge) return;
        switchToMyListsTab();
        openChallenge(challenge.id);
    },
    async loadAndRenderGrid(gridId, listFiles) {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        grid.innerHTML = '<div class="loading-indicator">Yükleniyor...</div>';
        const lists = [];
        for (const file of listFiles) {
            const data = await this.loadList(file);
            if (data) lists.push(data);
        }
        if (lists.length === 0) {
            grid.innerHTML = '<p class="no-lists">Liste bulunamadı.</p>';
            return;
        }
        grid.innerHTML = lists.map(list => this.renderListCard(list)).join('');
    },
    async initExploreSection() {
        const index = await this.loadIndex();
        if (!index) return;
        if (index.categories.films?.subcategories) {
            const filmSubs = index.categories.films.subcategories;
            if (filmSubs['must-watch']?.lists) await this.loadAndRenderGrid('films-must-watch-grid', filmSubs['must-watch'].lists);
            if (filmSubs['genre']?.lists) await this.loadAndRenderGrid('films-genre-grid', filmSubs['genre'].lists);
            if (filmSubs['editors']?.lists) await this.loadAndRenderGrid('films-editors-grid', filmSubs['editors'].lists);
            if (filmSubs['geography']?.lists) await this.loadAndRenderGrid('films-geography-grid', filmSubs['geography'].lists);
        }
        if (index.categories.books?.subcategories) {
            const bookSubs = index.categories.books.subcategories;
            if (bookSubs['turkish']?.lists) await this.loadAndRenderGrid('books-turkish-grid', bookSubs['turkish'].lists);
            if (bookSubs['classics']?.lists) await this.loadAndRenderGrid('books-classics-grid', bookSubs['classics'].lists);
            if (bookSubs['genre']?.lists) await this.loadAndRenderGrid('books-genre-grid', bookSubs['genre'].lists);
        }
        if (index.categories.anime?.subcategories) {
            const animeSubs = index.categories.anime.subcategories;
            if (animeSubs['must-watch']?.lists) await this.loadAndRenderGrid('anime-must-watch-grid', animeSubs['must-watch'].lists);
            if (animeSubs['genre']?.lists) await this.loadAndRenderGrid('anime-genre-grid', animeSubs['genre'].lists);
        }
        if (index.categories.games?.subcategories) {
            const gameSubs = index.categories.games.subcategories;
            if (gameSubs['must-play']?.lists) await this.loadAndRenderGrid('games-must-play-grid', gameSubs['must-play'].lists);
            if (gameSubs['genre']?.lists) await this.loadAndRenderGrid('games-genre-grid', gameSubs['genre'].lists);
            if (gameSubs['platform']?.lists) await this.loadAndRenderGrid('games-platform-grid', gameSubs['platform'].lists);
        }
    },
    async previewList(listId) {
        let listData = null;
        for (const key in this.cache) {
            if (this.cache[key].id === listId) {
                listData = this.cache[key];
                break;
            }
        }
        if (!listData) { alert('Liste yüklenemedi.'); return; }
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'preview-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>${listData.title}</h3>
                    <button class="modal-close" onclick="document.getElementById('preview-modal').remove()">×</button>
                </div>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">${listData.description}</p>
                <div class="preview-items-list" style="max-height: 400px; overflow-y: auto;">
                    ${listData.items.slice(0, 25).map((item, i) => `
                        <div style="padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                            <div style="font-weight: 500;">${i + 1}. ${item.tr || item.title || item.name}</div>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 1rem; text-align: center;">
                    <button class="btn btn-primary" onclick="CuratedLists.addListToCollections('${listId}'); document.getElementById('preview-modal').remove();">+ Koleksiyonuma Ekle</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    async showListDetail(listId) { await this.previewList(listId); },
    async addListToCollections(listId) {
        let listData = null;
        for (const key in this.cache) {
            if (this.cache[key].id === listId) {
                listData = this.cache[key];
                break;
            }
        }
        if (!listData) { alert('Liste yüklenemedi.'); return; }
        const challenges = getUserChallenges();
        if (challenges.some(c => c.curatedListId === listId)) {
            this.openInCollection(listId);
            return;
        }
        const newChallenge = {
            id: Date.now().toString(),
            title: listData.title,
            category: listData.category,
            curatedListId: listId,
            createdAt: new Date().toISOString(),
            items: listData.items.map((item, index) => ({
                id: `${Date.now()}-${index}`,
                name: item.tr || item.title || item.name,
                completed: false,
                note: ''
            }))
        };
        challenges.push(newChallenge);
        setUserChallenges(challenges);
        switchToMyListsTab();
        renderChallengesList();
        updateStats();
        showToast(`"${listData.title}" koleksiyonunuza eklendi!`);
    }
};

// ============ Dashboard Tabs ============
function switchToMyListsTab() {
    document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.dashboard-tab[data-tab="my-lists"]')?.classList.add('active');
    document.getElementById('my-lists-section')?.classList.remove('hidden');
    document.getElementById('explore-section')?.classList.add('hidden');
}

function switchToExploreTab() {
    document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.dashboard-tab[data-tab="explore"]')?.classList.add('active');
    document.getElementById('my-lists-section')?.classList.add('hidden');
    document.getElementById('explore-section')?.classList.remove('hidden');
    CuratedLists.initExploreSection();
}

function initDashboardTabs() {
    document.querySelectorAll('.dashboard-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            if (this.dataset.tab === 'my-lists') switchToMyListsTab();
            else if (this.dataset.tab === 'explore') switchToExploreTab();
        });
    });

    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const cat = this.dataset.category;
            const f = document.getElementById('film-lists-section');
            const b = document.getElementById('book-lists-section');
            const a = document.getElementById('anime-lists-section');
            const g = document.getElementById('games-lists-section');

            if (cat === 'all') { f?.classList.remove('hidden'); b?.classList.remove('hidden'); a?.classList.remove('hidden'); g?.classList.remove('hidden'); }
            else if (cat === 'films') { f?.classList.remove('hidden'); b?.classList.add('hidden'); a?.classList.add('hidden'); g?.classList.add('hidden'); }
            else if (cat === 'books') { f?.classList.add('hidden'); b?.classList.remove('hidden'); a?.classList.add('hidden'); g?.classList.add('hidden'); }
            else if (cat === 'anime') { f?.classList.add('hidden'); b?.classList.add('hidden'); a?.classList.remove('hidden'); g?.classList.add('hidden'); }
            else if (cat === 'games') { f?.classList.add('hidden'); b?.classList.add('hidden'); a?.classList.add('hidden'); g?.classList.remove('hidden'); }
        });
    });
}

function showToast(message) {
    const existing = document.getElementById('toast-notification');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = 'position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); background: var(--accent-gradient); color: white; padding: 1rem 1.5rem; border-radius: var(--radius-md); box-shadow: var(--shadow-lg); z-index: 10000;';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============ Backup & Restore (Export / Import) ============
function exportData() {
    const data = Storage.getData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `100-challenge-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('Yedek başarıyla indirildi!');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            const valid = parsed && typeof parsed === 'object' && Object.values(parsed).some(v => Array.isArray(v));
            if (!valid) throw new Error('Invalid backup shape');
            Storage.saveData(parsed);
            showDashboard();
            showToast('Yedek başarıyla yüklendi!');
        } catch (err) {
            alert('Geçersiz yedek dosyası!');
        }
    };
    reader.readAsText(file);
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
    DOM.addChallengeBtn.addEventListener('click', showNewChallengeModal);

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

    DOM.backBtn.addEventListener('click', () => {
        APP_STATE.currentChallenge = null;
        showDashboard();
    });

    DOM.deleteChallengeBtn.addEventListener('click', () => {
        if (APP_STATE.currentChallenge) {
            deleteChallenge(APP_STATE.currentChallenge.id);
        }
    });

    DOM.randomPickBtn.addEventListener('click', randomPick);

    DOM.addItemBtn.addEventListener('click', () => {
        const text = DOM.newItemInput.value;
        if (text.includes('\n')) {
            addBulkItems(text);
        } else if (text.trim()) {
            addItem(text);
        }
        DOM.newItemInput.value = '';
    });

    DOM.newItemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const text = DOM.newItemInput.value;
            if (text.includes('\n')) {
                addBulkItems(text);
            } else if (text.trim()) {
                addItem(text);
            }
            DOM.newItemInput.value = '';
        }
    });

    DOM.searchItems.addEventListener('input', renderItems);

    DOM.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            APP_STATE.currentFilter = btn.dataset.filter;
            renderItems();
        });
    });

    DOM.editItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (APP_STATE.editingItemId) {
            updateItem(APP_STATE.editingItemId, DOM.editItemName.value, DOM.editItemNote.value);
            hideEditItemModal();
        }
    });

    // Backup & Restore
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importInput = document.getElementById('import-input');
    if (exportBtn) exportBtn.addEventListener('click', exportData);
    if (importBtn) importBtn.addEventListener('click', () => importInput.click());
    if (importInput) importInput.addEventListener('change', importData);
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
    initDashboardTabs();
    showDashboard();
}

document.addEventListener('DOMContentLoaded', initApp);
