import './style.css';

const STORAGE_KEY = 'trello-clone';

let state = {
    todo: [],
    'in-progress': [],
    done: []
};

let draggedCard = null;
let ghostCard = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let currentDropZone = null;

document.addEventListener('DOMContentLoaded', () => {
    state = loadState();
    renderBoard();
    setupEventListeners();
});


function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                todo: parsed.todo || [],
                'in-progress': parsed['in-progress'] || [],
                done: parsed.done || []
            };
        }
    } catch {}
    return { todo: [], 'in-progress': [], done: [] };
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}


function renderBoard() {
    Object.keys(state).forEach(columnId => {
        const container = document.querySelector(`.cards[data-column="${columnId}"]`);
        container.innerHTML = '';

        state[columnId].forEach((card, index) => {
            const el = createCard(card, columnId, index);
            container.append(el);
        });
    });
}

function createCard(card, columnId, index) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.id = card.id;
    el.dataset.column = columnId;
    el.dataset.index = index;
    el.textContent = card.text;

    const del = document.createElement('span');
    del.className = 'delete-card';
    del.textContent = '✕';
    del.onclick = e => {
        e.stopPropagation();
        state[columnId] = state[columnId].filter(c => c.id !== card.id);
        saveState();
        renderBoard();
    };

    el.append(del);
    el.addEventListener('mousedown', (e) => {
        if (e.target.closest('.delete-card')) return;
        startDrag.call(el, e);
    });

    return el;
}


function addCard(text, columnId) {
    state[columnId].push({
        id: 'card-' + Date.now(),
        text
    });
    saveState();
    renderBoard();
}


function startDrag(e) {
    draggedCard = this;
    document.body.classList.add('dragging');

    const rect = this.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    ghostCard = this.cloneNode(true);
    ghostCard.classList.add('ghost');
    ghostCard.style.width = `${rect.width}px`;
    ghostCard.style.height = `${rect.height}px`;
    ghostCard.style.left = `${rect.left}px`;
    ghostCard.style.top = `${rect.top}px`;

    document.body.append(ghostCard);
    this.style.visibility = 'hidden';

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
}

function onDrag(e) {
    ghostCard.style.left = `${e.pageX - dragOffsetX}px`;
    ghostCard.style.top = `${e.pageY - dragOffsetY}px`;

    const elem = document.elementFromPoint(e.clientX, e.clientY);
    const card = elem?.closest('.card');
    const column = elem?.closest('.cards');

    removeDropZone();

    if (card) {
        const rect = card.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        createDropZone(card, before ? 'before' : 'after');
    } else if (column) {
        createDropZone(column, 'inside');
    }
}

function endDrag(e) {
    document.body.classList.remove('dragging');
    ghostCard.remove();
    draggedCard.style.visibility = 'visible';

    if (currentDropZone) {
        const { toColumn, toIndex } = currentDropZone.dataset;
        moveCard(
            draggedCard.dataset.id,
            draggedCard.dataset.column,
            toColumn,
            Number(toIndex)
        );
    }

    removeDropZone();
    draggedCard = null;

    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
}


function createDropZone(target, position) {
    const dz = document.createElement('div');
    dz.className = 'drop-zone';
    dz.style.height = `${draggedCard.offsetHeight}px`;

    let column, index;

    if (position === 'inside') {
        column = target.dataset.column;
        index = state[column].length;
        target.append(dz);
    } else {
        column = target.dataset.column;
        index = Number(target.dataset.index) + (position === 'after' ? 1 : 0);

        if (position === 'after') {
            target.after(dz);
        } else {
            target.before(dz);
        }
    }

    dz.dataset.toColumn = column;
    dz.dataset.toIndex = index;

    currentDropZone = dz;
}

function removeDropZone() {
    if (currentDropZone) {
        currentDropZone.remove();
        currentDropZone = null;
    }
}


function moveCard(id, from, to, index) {
    const card = state[from].find(c => c.id === id);
    state[from] = state[from].filter(c => c.id !== id);
    state[to].splice(index, 0, card);
    saveState();
    renderBoard();
}


function setupEventListeners() {
    document.querySelectorAll('.add-card-form').forEach(form => {
        const textarea = form.querySelector('textarea');
        const btn = form.previousElementSibling;

        form.onsubmit = e => {
            e.preventDefault();
            if (textarea.value.trim()) {
                addCard(textarea.value.trim(), form.closest('.column').dataset.column);
                textarea.value = '';
                form.style.display = 'none';
                btn.style.display = 'block';
            }
        };
    });

    document.querySelectorAll('.add-card-btn').forEach(btn => {
        btn.onclick = () => {
            btn.style.display = 'none';
            btn.nextElementSibling.style.display = 'block';
            btn.nextElementSibling.querySelector('textarea').focus();
        };
    });

    document.querySelectorAll('.cancel-card-add').forEach(btn => {
        btn.onclick = () => {
            const form = btn.closest('.add-card-form');
            form.style.display = 'none';
            form.previousElementSibling.style.display = 'block';
        };
    });
}