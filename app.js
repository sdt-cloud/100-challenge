/* ============================================
   100 Challenge - Application Logic
   ============================================ */

// ============ State Management ============
const APP_STATE = {
    currentUser: null,
    currentChallenge: null,
    currentFilter: 'all',
    currentYear: new Date().getFullYear().toString(),
    editingItemId: null,
    posterCache: {} // Cache for movie posters
};

// ============ OMDB API Configuration ============
const MOVIE_API = {
    // OMDB Free API key (1000 requests/day)
    API_KEY: '3e974fca',
    BASE_URL: 'https://www.omdbapi.com',

    // Common Turkish-English movie name mappings
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
        'schindler\'in listesi': 'Schindler\'s List',
        'yeşil yol': 'The Green Mile',
        'intikam': 'Oldboy',
        'parazit': 'Parasite',
        'toy story': 'Toy Story',
        'avatar': 'Avatar',
        'joker': 'Joker'
    },

    // Try to find English translation for Turkish movie names
    translateToEnglish(turkishName) {
        const lowerName = turkishName.toLowerCase().trim();

        // Direct match
        if (this.TURKISH_TRANSLATIONS[lowerName]) {
            return this.TURKISH_TRANSLATIONS[lowerName];
        }

        // Partial match
        for (const [tr, en] of Object.entries(this.TURKISH_TRANSLATIONS)) {
            if (lowerName.includes(tr) || tr.includes(lowerName)) {
                return en;
            }
        }

        return null;
    },

    async searchMovie(query) {
        try {
            // First, check if query contains English name in parentheses: "Türkçe (English)"
            const parenthesesMatch = query.match(/\(([^)]+)\)\s*$/);
            if (parenthesesMatch) {
                const englishName = parenthesesMatch[1];
                const posterUrl = await this.fetchPoster(englishName);
                if (posterUrl) return posterUrl;
            }

            // Try with original query (might work if it's already in English)
            let posterUrl = await this.fetchPoster(query);

            // If not found, try English translation from dictionary
            if (!posterUrl) {
                const englishName = this.translateToEnglish(query);
                if (englishName) {
                    posterUrl = await this.fetchPoster(englishName);
                }
            }

            return posterUrl;
        } catch (error) {
            console.log('OMDB API error:', error);
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

// ============ Jikan API Configuration (MyAnimeList) ============
const ANIME_API = {
    BASE_URL: 'https://api.jikan.moe/v4',
    cache: {},
    lastRequestTime: 0,
    MIN_REQUEST_INTERVAL: 350, // Jikan has rate limit of ~3 requests/second

    // Wait to respect rate limits
    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
            await new Promise(resolve =>
                setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
            );
        }
        this.lastRequestTime = Date.now();
    },

    // Search for anime by name
    async searchAnime(query) {
        try {
            // Check cache first
            const cacheKey = query.toLowerCase().trim();
            if (this.cache[cacheKey]) {
                return this.cache[cacheKey];
            }

            // Extract English name from parentheses if present: "Title (English Title)"
            let searchQuery = query;
            const parenthesesMatch = query.match(/\(([^)]+)\)\s*$/);
            if (parenthesesMatch) {
                searchQuery = parenthesesMatch[1];
            }

            // Remove common suffixes for better search
            searchQuery = searchQuery
                .replace(/\s*\(.*?\)\s*/g, '')
                .replace(/:\s*Season\s*\d+/gi, '')
                .replace(/\s+/g, ' ')
                .trim();

            await this.waitForRateLimit();

            const response = await fetch(
                `${this.BASE_URL}/anime?q=${encodeURIComponent(searchQuery)}&limit=1&sfw=true`
            );

            if (!response.ok) {
                console.log('Jikan API error:', response.status);
                return null;
            }

            const data = await response.json();

            if (data.data && data.data.length > 0) {
                const anime = data.data[0];
                const imageUrl = anime.images?.jpg?.image_url ||
                    anime.images?.webp?.image_url ||
                    null;

                // Cache the result
                this.cache[cacheKey] = imageUrl;
                return imageUrl;
            }

            return null;
        } catch (error) {
            console.log('Jikan API error:', error);
            return null;
        }
    }
};

// ============ Data Layer (LocalStorage) ============
const Storage = {
    KEYS: {
        USERS: '100challenge_users',
        CURRENT_USER: '100challenge_current_user',
        THEME: '100challenge_theme'
    },

    getUsers() {
        const data = localStorage.getItem(this.KEYS.USERS);
        return data ? JSON.parse(data) : [];
    },

    saveUsers(users) {
        localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
    },

    getCurrentUserId() {
        return localStorage.getItem(this.KEYS.CURRENT_USER);
    },

    setCurrentUserId(userId) {
        if (userId) {
            localStorage.setItem(this.KEYS.CURRENT_USER, userId);
        } else {
            localStorage.removeItem(this.KEYS.CURRENT_USER);
        }
    },

    findUserByEmail(email) {
        return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    },

    findUserById(id) {
        return this.getUsers().find(u => u.id === id);
    },

    updateUser(user) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
            users[index] = user;
            this.saveUsers(users);
        }
    }
};

// ============ Utility Functions ============
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

function getCategoryInfo(category) {
    const categories = {
        films: { name: 'Filmler', emoji: '🎬', placeholder: 'Film ekle...', listExample: 'Örn: 100 Klasik Film' },
        books: { name: 'Kitaplar', emoji: '📚', placeholder: 'Kitap ekle...', listExample: 'Örn: Okunacak 100 Kitap' },
        music: { name: 'Müzik', emoji: '🎧', placeholder: 'Müzik ekle...', listExample: 'Örn: Dinlenecek 100 Albüm' },
        custom: { name: 'Özel', emoji: '⭐', placeholder: 'Madde ekle...', listExample: 'Örn: 2025 Hedeflerim' }
    };
    return categories[category] || categories.custom;
}

// ============ DOM Elements ============
const DOM = {
    // Pages
    authPage: document.getElementById('auth-page'),
    dashboardPage: document.getElementById('dashboard-page'),
    challengePage: document.getElementById('challenge-page'),

    // Auth
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    authTabs: document.querySelectorAll('.auth-tab'),
    authError: document.getElementById('auth-error'),

    // Dashboard
    currentYear: document.getElementById('current-year'),
    totalChallenges: document.getElementById('total-challenges'),
    totalCompleted: document.getElementById('total-completed'),
    overallProgress: document.getElementById('overall-progress'),
    challengesGrid: document.getElementById('challenges-grid'),
    emptyState: document.getElementById('empty-state'),
    addChallengeBtn: document.getElementById('add-challenge-btn'),
    logoutBtn: document.getElementById('logout-btn'),

    // Challenge Detail
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

    // Modals
    newChallengeModal: document.getElementById('new-challenge-modal'),
    newChallengeForm: document.getElementById('new-challenge-form'),
    randomModal: document.getElementById('random-modal'),
    randomItemName: document.getElementById('random-item-name'),
    editItemModal: document.getElementById('edit-item-modal'),
    editItemForm: document.getElementById('edit-item-form'),
    editItemName: document.getElementById('edit-item-name'),
    editItemNote: document.getElementById('edit-item-note')
};

// ============ Page Navigation ============
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
}

// ============ Authentication ============
function showAuthError(message) {
    DOM.authError.textContent = message;
    DOM.authError.classList.remove('hidden');
}

function hideAuthError() {
    DOM.authError.classList.add('hidden');
}

function handleLogin(email, password) {
    const user = Storage.findUserByEmail(email);

    if (!user) {
        showAuthError('Bu e-posta ile kayıtlı kullanıcı bulunamadı.');
        return false;
    }

    if (user.password !== simpleHash(password)) {
        showAuthError('Şifre hatalı.');
        return false;
    }

    APP_STATE.currentUser = user;
    Storage.setCurrentUserId(user.id);
    hideAuthError();
    showDashboard();
    return true;
}

function handleRegister(email, password, passwordConfirm) {
    if (password.length < 6) {
        showAuthError('Şifre en az 6 karakter olmalıdır.');
        return false;
    }

    if (password !== passwordConfirm) {
        showAuthError('Şifreler eşleşmiyor.');
        return false;
    }

    if (Storage.findUserByEmail(email)) {
        showAuthError('Bu e-posta zaten kullanılıyor.');
        return false;
    }

    const newUser = {
        id: generateId(),
        email: email,
        password: simpleHash(password),
        challenges: {}
    };

    const users = Storage.getUsers();
    users.push(newUser);
    Storage.saveUsers(users);

    APP_STATE.currentUser = newUser;
    Storage.setCurrentUserId(newUser.id);
    hideAuthError();
    showDashboard();
    return true;
}

function handleLogout() {
    APP_STATE.currentUser = null;
    Storage.setCurrentUserId(null);
    showPage('auth-page');
}

// ============ Dashboard ============
function showDashboard() {
    showPage('dashboard-page');
    DOM.currentYear.textContent = APP_STATE.currentYear;
    renderChallengesList();
    updateStats();
}

function getUserChallenges() {
    if (!APP_STATE.currentUser) return [];
    return APP_STATE.currentUser.challenges[APP_STATE.currentYear] || [];
}

function setUserChallenges(challenges) {
    if (!APP_STATE.currentUser) return;
    APP_STATE.currentUser.challenges[APP_STATE.currentYear] = challenges;
    Storage.updateUser(APP_STATE.currentUser);
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
            <div class="challenge-card" data-id="${challenge.id}" data-index="${index}" draggable="true">
                <div class="drag-handle">⋮⋮</div>
                <div class="challenge-card-header">
                    <span class="challenge-card-emoji">${challenge.emoji || categoryInfo.emoji}</span>
                    <div class="challenge-card-info">
                        <h3 class="challenge-card-title">${escapeHtml(challenge.name)}</h3>
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

    // Add click and drag handlers
    DOM.challengesGrid.querySelectorAll('.challenge-card').forEach(card => {
        // Click to open
        card.addEventListener('click', (e) => {
            // Don't open if clicking on drag handle
            if (e.target.classList.contains('drag-handle')) return;
            const id = card.dataset.id;
            openChallenge(id);
        });

        // Drag events
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragenter', handleDragEnter);
        card.addEventListener('dragleave', handleDragLeave);
    });
}

// ============ Drag and Drop ============
let draggedCard = null;

function handleDragStart(e) {
    draggedCard = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.index);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.challenge-card').forEach(card => {
        card.classList.remove('drag-over');
    });
    draggedCard = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    if (this !== draggedCard) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    if (this === draggedCard) return;

    const fromIndex = parseInt(draggedCard.dataset.index);
    const toIndex = parseInt(this.dataset.index);

    // Reorder challenges
    const challenges = getUserChallenges();
    const [movedChallenge] = challenges.splice(fromIndex, 1);
    challenges.splice(toIndex, 0, movedChallenge);

    // Save and re-render
    setUserChallenges(challenges);
    renderChallengesList();
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

// ============ Challenge Operations ============
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

    // Update placeholder based on category
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

// ============ Item Operations ============
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
        // Filter by search
        if (searchTerm && !item.name.toLowerCase().includes(searchTerm)) {
            return false;
        }

        // Filter by status
        if (APP_STATE.currentFilter === 'completed' && !item.completed) {
            return false;
        }
        if (APP_STATE.currentFilter === 'pending' && item.completed) {
            return false;
        }

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
    const showPoster = isFilmCategory || isAnimeCategory;
    const posterEmoji = isAnimeCategory ? '🎌' : '🎬';

    DOM.itemsList.innerHTML = items.map((item, index) => `
        <li class="item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
            ${showPoster ? `<div class="item-poster loading" data-item-id="${item.id}" data-category="${challenge.category}"></div>` : ''}
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

    // Load posters for film or anime category
    if (isFilmCategory) {
        loadMoviePosters(items);
    } else if (isAnimeCategory) {
        loadAnimePosters(items);
    }

    // Add event listeners
    DOM.itemsList.querySelectorAll('.item').forEach(itemEl => {
        const itemId = itemEl.dataset.id;

        itemEl.querySelector('.item-checkbox').addEventListener('change', () => {
            toggleItem(itemId);
        });

        itemEl.querySelector('.edit').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditItemModal(itemId);
        });

        itemEl.querySelector('.delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteItem(itemId);
        });
    });
}

// ============ Movie Poster Loading ============
async function loadMoviePosters(items) {
    for (const item of items) {
        const posterEl = document.querySelector(`.item-poster[data-item-id="${item.id}"]`);
        if (!posterEl) continue;

        // Check cache first
        if (APP_STATE.posterCache[item.name]) {
            displayPoster(posterEl, APP_STATE.posterCache[item.name]);
            continue;
        }

        // Fetch from OMDB API
        const posterUrl = await MOVIE_API.searchMovie(item.name);

        if (posterUrl) {
            APP_STATE.posterCache[item.name] = posterUrl;
            displayPoster(posterEl, posterUrl);
        } else {
            // No poster found - show movie emoji
            posterEl.classList.remove('loading');
            posterEl.classList.add('no-poster');
            posterEl.textContent = '🎬';
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

// ============ Anime Poster Loading ============
async function loadAnimePosters(items) {
    for (const item of items) {
        const posterEl = document.querySelector(`.item-poster[data-item-id="${item.id}"]`);
        if (!posterEl) continue;

        // Check cache first (using ANIME_API cache)
        const cacheKey = item.name.toLowerCase().trim();
        if (ANIME_API.cache[cacheKey]) {
            displayPoster(posterEl, ANIME_API.cache[cacheKey], '🎌');
            continue;
        }

        // Fetch from Jikan API
        const posterUrl = await ANIME_API.searchAnime(item.name);

        if (posterUrl) {
            displayPoster(posterEl, posterUrl, '🎌');
        } else {
            // No poster found - show anime emoji
            posterEl.classList.remove('loading');
            posterEl.classList.add('no-poster');
            posterEl.textContent = '🎌';
        }
    }
}

// ============ Random Pick ============
async function randomPick() {
    if (!APP_STATE.currentChallenge) return;

    const pendingItems = APP_STATE.currentChallenge.items.filter(i => !i.completed);

    if (pendingItems.length === 0) {
        alert('Tebrikler! Tüm maddeler tamamlandı! 🎉');
        return;
    }

    const randomIndex = Math.floor(Math.random() * pendingItems.length);
    const randomItem = pendingItems[randomIndex];

    DOM.randomItemName.textContent = randomItem.name;

    // Handle poster for film category
    const randomPoster = document.getElementById('random-poster');
    const isFilmCategory = APP_STATE.currentChallenge.category === 'films';

    if (isFilmCategory && randomPoster) {
        randomPoster.classList.remove('hidden');
        randomPoster.src = '';
        randomPoster.alt = randomItem.name;

        // Try to get poster from cache or API
        let posterUrl = APP_STATE.posterCache[randomItem.name];

        if (!posterUrl) {
            posterUrl = await MOVIE_API.searchMovie(randomItem.name);
            if (posterUrl) {
                APP_STATE.posterCache[randomItem.name] = posterUrl;
            }
        }

        if (posterUrl) {
            randomPoster.src = posterUrl;
        } else {
            // Show placeholder
            randomPoster.src = '';
            randomPoster.style.display = 'flex';
            randomPoster.style.alignItems = 'center';
            randomPoster.style.justifyContent = 'center';
            randomPoster.innerHTML = '🎬';
        }
    } else if (randomPoster) {
        randomPoster.classList.add('hidden');
    }

    showRandomModal();
}

// ============ Modal Functions ============
function showNewChallengeModal() {
    DOM.newChallengeModal.classList.remove('hidden');
    document.getElementById('challenge-name').focus();
}

function hideNewChallengeModal() {
    DOM.newChallengeModal.classList.add('hidden');
    DOM.newChallengeForm.reset();
}

function showRandomModal() {
    DOM.randomModal.classList.remove('hidden');
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

// ============ Helper Functions ============
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ Event Listeners ============
function initEventListeners() {
    // Auth tabs
    DOM.authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            DOM.authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const isLogin = tab.dataset.tab === 'login';
            DOM.loginForm.classList.toggle('hidden', !isLogin);
            DOM.registerForm.classList.toggle('hidden', isLogin);
            hideAuthError();
        });
    });

    // Login form
    DOM.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        handleLogin(email, password);
    });

    // Register form
    DOM.registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        handleRegister(email, password, passwordConfirm);
    });

    // Logout
    DOM.logoutBtn.addEventListener('click', handleLogout);

    // Add challenge
    DOM.addChallengeBtn.addEventListener('click', showNewChallengeModal);

    // Category change - update placeholder
    const categorySelect = document.getElementById('challenge-category');
    const challengeNameInput = document.getElementById('challenge-name');

    categorySelect.addEventListener('change', () => {
        const categoryInfo = getCategoryInfo(categorySelect.value);
        challengeNameInput.placeholder = categoryInfo.listExample;
    });

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

    // Back button
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
    DOM.randomPickBtn.addEventListener('click', randomPick);

    // Add item
    DOM.addItemBtn.addEventListener('click', () => {
        const name = DOM.newItemInput.value;
        if (name.trim()) {
            addItem(name);
            DOM.newItemInput.value = '';
            DOM.newItemInput.focus();
        }
    });

    DOM.newItemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const name = DOM.newItemInput.value;
            if (name.trim()) {
                addItem(name);
                DOM.newItemInput.value = '';
            }
        }
    });

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

    // Edit item form
    DOM.editItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (APP_STATE.editingItemId) {
            const name = DOM.editItemName.value.trim();
            const note = DOM.editItemNote.value.trim();
            if (name) {
                updateItem(APP_STATE.editingItemId, name, note);
                hideEditItemModal();
            }
        }
    });

    // Modal overlays
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            hideNewChallengeModal();
            hideRandomModal();
            hideEditItemModal();
        });
    });

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideNewChallengeModal();
            hideRandomModal();
            hideEditItemModal();
        }
    });
}

// ============ Curated Lists Module ============
const CuratedLists = {
    cache: {},
    index: null,

    // Load a single curated list JSON file
    async loadList(filename) {
        if (this.cache[filename]) {
            return this.cache[filename];
        }

        try {
            const response = await fetch(`data/${filename}`);
            if (!response.ok) throw new Error(`Failed to load ${filename}`);
            const data = await response.json();
            this.cache[filename] = data;
            return data;
        } catch (error) {
            console.error(`Error loading curated list: ${filename}`, error);
            return null;
        }
    },

    // Load the master index
    async loadIndex() {
        if (this.index) return this.index;

        try {
            const response = await fetch('data/lists-index.json');
            if (!response.ok) throw new Error('Failed to load lists index');
            this.index = await response.json();
            return this.index;
        } catch (error) {
            console.error('Error loading lists index:', error);
            return null;
        }
    },

    // Get category emoji
    getCategoryEmoji(category) {
        const emojis = {
            films: '🎬',
            books: '📚',
            anime: '🎌',
            music: '🎧',
            games: '🎮'
        };
        return emojis[category] || '📋';
    },

    // Render a curated list card
    renderListCard(listData) {
        const itemCount = listData.items?.length || 100;
        const tags = listData.tags?.slice(0, 3) || [];
        const emoji = this.getCategoryEmoji(listData.category);

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
                    <button class="btn btn-primary" onclick="event.stopPropagation(); CuratedLists.addListToCollections('${listData.id}')">+ Koleksiyonuma Ekle</button>
                </div>
            </div>
        `;
    },

    // Load and render lists for a grid
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

    // Initialize explore section with all curated lists
    async initExploreSection() {
        const index = await this.loadIndex();
        if (!index) return;

        // Film lists
        if (index.categories.films?.subcategories) {
            const filmSubs = index.categories.films.subcategories;

            if (filmSubs['must-watch']?.lists) {
                await this.loadAndRenderGrid('films-must-watch-grid', filmSubs['must-watch'].lists);
            }
            if (filmSubs['genre']?.lists) {
                await this.loadAndRenderGrid('films-genre-grid', filmSubs['genre'].lists);
            }
            if (filmSubs['editors']?.lists) {
                await this.loadAndRenderGrid('films-editors-grid', filmSubs['editors'].lists);
            }
            if (filmSubs['geography']?.lists) {
                await this.loadAndRenderGrid('films-geography-grid', filmSubs['geography'].lists);
            }
        }

        // Book lists
        if (index.categories.books?.subcategories) {
            const bookSubs = index.categories.books.subcategories;

            if (bookSubs['turkish']?.lists) {
                await this.loadAndRenderGrid('books-turkish-grid', bookSubs['turkish'].lists);
            }
            if (bookSubs['classics']?.lists) {
                await this.loadAndRenderGrid('books-classics-grid', bookSubs['classics'].lists);
            }
            if (bookSubs['genre']?.lists) {
                await this.loadAndRenderGrid('books-genre-grid', bookSubs['genre'].lists);
            }
        }

        // Anime lists
        if (index.categories.anime?.subcategories) {
            const animeSubs = index.categories.anime.subcategories;

            if (animeSubs['must-watch']?.lists) {
                await this.loadAndRenderGrid('anime-must-watch-grid', animeSubs['must-watch'].lists);
            }
            if (animeSubs['genre']?.lists) {
                await this.loadAndRenderGrid('anime-genre-grid', animeSubs['genre'].lists);
            }
        }
    },

    // Preview a list (show items modal)
    async previewList(listId) {
        // Find the list in cache
        let listData = null;
        for (const key in this.cache) {
            if (this.cache[key].id === listId) {
                listData = this.cache[key];
                break;
            }
        }

        if (!listData) {
            alert('Liste yüklenemedi.');
            return;
        }

        // Create preview modal
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
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
                    ${listData.tags?.map(t => `<span class="tag-badge">${t}</span>`).join('') || ''}
                </div>
                <div class="preview-items-list" style="max-height: 400px; overflow-y: auto;">
                    ${listData.items.slice(0, 25).map((item, i) => {
            const title = item.tr || item.title || item.name;
            const subtitle = item.en || item.originalTitle || '';
            const year = item.year ? ` (${item.year})` : '';
            const creator = item.director || item.author || '';
            return `
                            <div style="padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                                <div style="font-weight: 500;">${i + 1}. ${title}${year}</div>
                                ${subtitle ? `<div style="font-size: 0.8125rem; color: var(--text-secondary);">${subtitle}</div>` : ''}
                                ${creator ? `<div style="font-size: 0.75rem; color: var(--text-tertiary);">${creator}</div>` : ''}
                            </div>
                        `;
        }).join('')}
                    ${listData.items.length > 25 ? `<div style="padding: 1rem; text-align: center; color: var(--text-tertiary);">... ve ${listData.items.length - 25} öğe daha</div>` : ''}
                </div>
                <div style="margin-top: 1rem; text-align: center;">
                    <button class="btn btn-primary" onclick="CuratedLists.addListToCollections('${listId}'); document.getElementById('preview-modal').remove();">+ Koleksiyonuma Ekle</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Show list detail page (redirect to challenge page with curated list)
    async showListDetail(listId) {
        // For now, just trigger preview
        await this.previewList(listId);
    },

    // Add a curated list to user's collections
    async addListToCollections(listId) {
        // Find the list in cache
        let listData = null;
        for (const key in this.cache) {
            if (this.cache[key].id === listId) {
                listData = this.cache[key];
                break;
            }
        }

        if (!listData) {
            alert('Liste yüklenemedi.');
            return;
        }

        // Check if user is logged in
        if (!APP_STATE.currentUser) {
            alert('Lütfen önce giriş yapın.');
            return;
        }

        // Create challenge from curated list
        const challenges = getUserChallenges();

        // Check if already exists
        if (challenges.some(c => c.curatedListId === listId)) {
            alert('Bu liste zaten koleksiyonunuzda!');
            return;
        }

        const newChallenge = {
            id: Date.now().toString(),
            name: listData.title,
            category: listData.category,
            curatedListId: listId,
            createdAt: new Date().toISOString(),
            items: listData.items.map((item, index) => {
                // Get Turkish and English names
                const trName = item.tr || item.title || item.name;
                const enName = item.en || item.originalTitle || '';

                // Format: "Türkçe (English)" for better OMDB poster lookup
                let displayName = trName;
                if (enName && enName !== trName) {
                    displayName = `${trName} (${enName})`;
                }

                return {
                    id: `${Date.now()}-${index}`,
                    name: displayName,
                    originalName: enName,
                    year: item.year || null,
                    creator: item.director || item.author || '',
                    completed: false,
                    notes: ''
                };
            })
        };

        challenges.push(newChallenge);
        setUserChallenges(challenges);

        // Switch to my lists tab
        switchToMyListsTab();
        renderChallengesList();
        updateStats();

        // Show success message
        showToast(`"${listData.title}" koleksiyonunuza eklendi!`);
    }
};

// ============ Dashboard Tab Switching ============
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

    // Load curated lists on first switch
    CuratedLists.initExploreSection();
}

function initDashboardTabs() {
    document.querySelectorAll('.dashboard-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            const targetTab = this.dataset.tab;
            if (targetTab === 'my-lists') {
                switchToMyListsTab();
            } else if (targetTab === 'explore') {
                switchToExploreTab();
            }
        });
    });

    // Category filter in explore section
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const category = this.dataset.category;
            const filmSection = document.getElementById('film-lists-section');
            const bookSection = document.getElementById('book-lists-section');
            const animeSection = document.getElementById('anime-lists-section');

            if (category === 'all') {
                filmSection?.classList.remove('hidden');
                bookSection?.classList.remove('hidden');
                animeSection?.classList.remove('hidden');
            } else if (category === 'films') {
                filmSection?.classList.remove('hidden');
                bookSection?.classList.add('hidden');
                animeSection?.classList.add('hidden');
            } else if (category === 'books') {
                filmSection?.classList.add('hidden');
                bookSection?.classList.remove('hidden');
                animeSection?.classList.add('hidden');
            } else if (category === 'anime') {
                filmSection?.classList.add('hidden');
                bookSection?.classList.add('hidden');
                animeSection?.classList.remove('hidden');
            }
        });
    });
}

// ============ Toast Notification ============
function showToast(message) {
    const existing = document.getElementById('toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        background: var(--accent-gradient);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slideUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============ Theme Management ============
const Theme = {
    toggle: document.getElementById('theme-toggle'),

    init() {
        // Load saved theme or default to light
        const savedTheme = localStorage.getItem(Storage.KEYS.THEME) || 'light';
        this.setTheme(savedTheme);

        // Add click handler
        this.toggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
            localStorage.setItem(Storage.KEYS.THEME, newTheme);
        });

        // Add scroll handler for visual feedback
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                this.toggle.classList.add('scrolled');
            } else {
                this.toggle.classList.remove('scrolled');
            }
        });
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }
};

// ============ Initialize App ============
function initApp() {
    // Initialize theme first
    Theme.init();

    initEventListeners();
    initDashboardTabs();

    // Check for existing session
    const userId = Storage.getCurrentUserId();
    if (userId) {
        const user = Storage.findUserById(userId);
        if (user) {
            APP_STATE.currentUser = user;
            showDashboard();
            return;
        }
    }

    // Show auth page
    showPage('auth-page');
}

// Start the app
document.addEventListener('DOMContentLoaded', initApp);
