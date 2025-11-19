    console.log("SCRIPT INICIADO...!!!");

// Comentario agregado para commit 3

// --------- CONFIGURACIÓN BÁSICA ----------
const API_BASE = "https://www.cheapshark.com/api/1.0";
const PAGE_SIZE = 12;

// Estado de la app
let currentPage = 0;
let currentStore = "";
let currentSort = "";
let currentSearch = "";
let isLoading = false;
let isSearchMode = false;

// --------- REFERENCIAS DOM ----------
const grid = document.getElementById("games-grid");
const loader = document.getElementById("loader");
const statusBox = document.getElementById("status");
const loadMoreBtn = document.getElementById("load-more");

const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const storeSelect = document.getElementById("store-select");
const sortSelect = document.getElementById("sort-select");

const modal = document.getElementById("detail-modal");
const modalBody = document.getElementById("modal-body");
const closeModalBtn = document.getElementById("close-modal");

// --------- UTILIDADES DE UI ----------
function showLoader() {
    loader.classList.remove("hidden");
}
function hideLoader() {
    loader.classList.add("hidden");
}
function showStatus(message, type = "info") {
    const colors = {
        "info": "text-slate-300",
        "error": "text-red-400",
        "success": "text-green-400"
    };
    statusBox.innerHTML = `<p class="${colors[type]} text-sm">${message}</p>`;
}
function clearStatus() {
    statusBox.innerHTML = "";
}

// --------- CREAR TARJETA DE JUEGO ----------
function createGameCard(game) {
    const { title, thumb, normalPrice, salePrice, savings, dealID } = game;
    const hasDiscount = parseFloat(savings) > 0;

    const card = document.createElement("article");
    card.className = `
        bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow 
        flex flex-col hover:border-purple-500/60 hover:-translate-y-1 transition
    `;

    card.innerHTML = `
        <img src="${thumb}" class="w-full h-40 object-cover" />
        <div class="p-4 flex flex-col gap-2 flex-1">
            <h3 class="text-sm font-bold text-slate-50 line-clamp-2">${title}</h3>

            <div class="flex items-baseline gap-2">
                ${
                    hasDiscount
                    ? `<span class="text-lg font-extrabold text-green-400">$${salePrice}</span>
                       <span class="text-xs line-through text-slate-500">$${normalPrice}</span>`
                    : `<span class="text-lg font-extrabold text-slate-100">$${normalPrice}</span>`
                }
            </div>

            ${
                hasDiscount
                ? `<span class="px-2 py-0.5 text-xs rounded-full bg-green-500/15 text-green-400">
                    -${Math.round(savings)}%
                </span>`
                : `<span class="px-2 py-0.5 text-xs rounded-full bg-slate-700/60 text-slate-200">
                    Sin descuento
                </span>`
            }

            <button class="mt-auto bg-purple-600 hover:bg-purple-700 rounded-lg py-2 text-sm font-medium"
                data-dealid="${dealID}">
                Ver detalle
            </button>
        </div>
    `;

    card.querySelector("button").addEventListener("click", () => openDetailModal(game));

    return card;
}

// --------- MODAL DE DETALLE ----------
function openDetailModal(game) {
    const { title, thumb, normalPrice, salePrice, savings, dealID } = game;
    const hasDiscount = parseFloat(savings) > 0;
    const url = `https://www.cheapshark.com/redirect?dealID=${dealID}`;

    modalBody.innerHTML = `
        <div class="flex gap-4">
            <img src="${thumb}" class="w-28 h-28 object-cover rounded-lg" />
            <div>
                <h3 class="text-lg font-bold">${title}</h3>
                <p class="text-sm text-slate-300">Normal: 
                    <span class="line-through text-slate-500">$${normalPrice}</span>
                </p>
                <p class="text-sm text-slate-300">Oferta:
                    <span class="text-green-400 font-semibold">$${salePrice}</span>
                </p>
                <a href="${url}" target="_blank"
                   class="inline-block mt-3 px-3 py-1.5 bg-purple-600 rounded-lg hover:bg-purple-700">
                   Ir a la tienda
                </a>
            </div>
        </div>
    `;

    modal.classList.remove("hidden");
}
function closeModal() {
    modal.classList.add("hidden");
}

// ---------- OBTENER OFERTAS ----------
async function fetchDeals({ page = 0, append = false } = {}) {
    if (isLoading) return;
    isLoading = true;
    clearStatus();
    showLoader();

    try {

        // Construimos la URL manualmente
        let query = `pageNumber=${page}&pageSize=${PAGE_SIZE}&onSale=1`;

        if (currentStore) query += `&storeID=${currentStore}`;
        if (currentSort) query += `&sortBy=${currentSort}`;

        const url = `${API_BASE}/deals?${query}`;

        console.log("URL FINAL:", url);

        const res = await fetch(url);
        const data = await res.json();

        if (!append) grid.innerHTML = "";

        if (!data.length) {
            showStatus("No se encontraron resultados.");
            loadMoreBtn.classList.add("hidden");
            return;
        }

        data.forEach(d => grid.appendChild(createGameCard(d)));

        if (data.length < PAGE_SIZE) loadMoreBtn.classList.add("hidden");
        else loadMoreBtn.classList.remove("hidden");

        showStatus("Ofertas cargadas.", "success");

    } catch (error) {
        showStatus("Error al cargar datos.", "error");
        console.error(error);
    }

    hideLoader();
    isLoading = false;
}

// --------- BÚSQUEDA POR TÍTULO ----------
async function searchGamesByTitle(title) {
    if (!title.trim()) {
        isSearchMode = false;
        fetchDeals({ page: 0 });
        return;
    }

    isSearchMode = true;
    clearStatus();
    showLoader();

    try {
        const params = new URLSearchParams({ title, limit: 20 });
        const res = await fetch(`${API_BASE}/games?${params}`);
        const data = await res.json();

        grid.innerHTML = "";

        if (!data.length) {
            showStatus("No se encontraron juegos con ese título.");
            return;
        }

        const mapped = data.map(g => ({
            title: g.external,
            thumb: g.thumb,
            normalPrice: g.cheapest,
            salePrice: g.cheapest,
            savings: 0,
            dealID: g.gameID
        }));

        mapped.forEach(m => grid.appendChild(createGameCard(m)));

        showStatus("Resultados de búsqueda cargados.", "success");

    } catch {
        showStatus("Error en la búsqueda.", "error");
    }

    hideLoader();
}

// --------- EVENTOS ----------
searchBtn.addEventListener("click", () => {
    searchGamesByTitle(searchInput.value);
});
searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") searchGamesByTitle(searchInput.value);
});
storeSelect.addEventListener("change", () => {
    currentStore = storeSelect.value;
    fetchDeals({ page: 0 });
});
sortSelect.addEventListener("change", () => {
    currentSort = sortSelect.value;
    fetchDeals({ page: 0 });
});
loadMoreBtn.addEventListener("click", () => {
    if (!isSearchMode) fetchDeals({ page: ++currentPage, append: true });
});
closeModalBtn.addEventListener("click", closeModal);
modal.addEventListener("click", e => {
    if (e.target === modal) closeModal();
});
// Ajuste menor para el commit final

// --------- INICIALIZACIÓN ----------
fetchDeals({ page: 0 });    