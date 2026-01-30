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
            // First try with original query
            let posterUrl = await this.fetchPoster(query);

            // If not found, try English translation
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

    DOM.itemsList.innerHTML = items.map((item, index) => `
        <li class="item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
            ${isFilmCategory ? `<div class="item-poster loading" data-item-id="${item.id}"></div>` : ''}
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

    // Load movie posters for film category
    if (isFilmCategory) {
        loadMoviePosters(items);
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

function displayPoster(element, url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Film Afişi';
    img.className = 'item-poster';
    img.onerror = () => {
        element.classList.remove('loading');
        element.classList.add('no-poster');
        element.textContent = '🎬';
    };
    img.onload = () => {
        element.replaceWith(img);
    };
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
