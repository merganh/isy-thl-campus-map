let cachedCampusMapSvg = '';

// Quiz-Inhalt rendern – Dispatcher nach Typ
function renderQuizBody(quiz) {
    if (quiz.content.type === 'memory') return renderMemoryBody(quiz);
    return renderChoiceBody(quiz);
}

// Single/Multi Choice mit modernem Card-Styling
function renderChoiceBody(quiz) {
    const c = quiz.content;
    const inputType = c.type === 'radio' ? 'radio' : 'checkbox';
    const groupName = `quiz-${quiz.id}`;

    const optionsHTML = c.options.map((opt, idx) => `
        <label class="quiz-option">
            <input type="${inputType}" name="${groupName}" value="${idx}">
            <span class="quiz-option-marker"><i class="fas fa-check"></i></span>
            <span class="quiz-option-text">${opt.text}</span>
        </label>
    `).join('');

    return `
        <div class="quiz-container" data-quiz-id="${quiz.id}" data-h5p-id="${quiz.h5pId}" data-quiz-type="${c.type}">
            <p class="quiz-question">${c.question}</p>
            <div class="quiz-options">${optionsHTML}</div>
            <div class="quiz-feedback"></div>
            <div class="quiz-actions">
                <button type="button" class="btn btn-primary quiz-submit-btn">Prüfen</button>
                <button type="button" class="btn btn-outline-secondary quiz-reset-btn" style="display:none;">Nochmal versuchen</button>
            </div>
        </div>
    `;
}

// Memory-Spielfeld (Karten werden in initMemoryGame gemischt + befüllt)
function renderMemoryBody(quiz) {
    const total = quiz.content.pairs.length;
    return `
        <div class="quiz-container memory-container" data-quiz-id="${quiz.id}" data-h5p-id="${quiz.h5pId}" data-quiz-type="memory">
            <div class="memory-status">
                <span class="memory-progress">0 / ${total} Paaren</span>
                <button type="button" class="btn btn-sm btn-outline-secondary memory-reset-btn">
                    <i class="fas fa-redo me-1"></i>Neu mischen
                </button>
            </div>
            <div class="memory-grid"></div>
            <div class="quiz-feedback"></div>
        </div>
    `;
}

// Template-Funktion für Quiz-Modals
function generateQuizModals() {
    const container = document.getElementById('quizModalsContainer');
    quizModals.forEach(quiz => {
        const modalId = `${quiz.id}_modal`;
        const labelId = `${quiz.id}_Label`;
        let campusInfoContent = '';
        if (quiz.campusInfo.hasAccordion) {
            campusInfoContent = `<div class="accordion" id="campusAccordionOverlay">${quiz.campusInfo.accordionItems.map(item => `<div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${item.id}Overlay">${item.title}</button></h2><div id="${item.id}Overlay" class="accordion-collapse collapse" data-bs-parent="#campusAccordionOverlay"><div class="accordion-body"><p>${item.text}</p>${item.link ? `<a href="${item.link.url}" target="_blank" class="erkundungstour-btn"><p>${item.link.text}</p></a>` : ''}</div></div></div>`).join('')}</div>`;
        } else if (quiz.campusInfo.hasMultipleLinks) {
            campusInfoContent = quiz.campusInfo.items.map(item => `<p${item.className ? ` class="${item.className}"` : ''}>${item.text}</p>${item.link ? `<a href="${item.link.url}" target="_blank" class="erkundungstour-btn"><p>${item.link.text}</p></a>` : ''}`).join('');
        } else {
            campusInfoContent = `<p>${quiz.campusInfo.text}</p>${quiz.campusInfo.link ? `<a href="${quiz.campusInfo.link.url}" target="_blank" class="erkundungstour-btn"><p>${quiz.campusInfo.link.text}</p></a>` : ''}`;
        }

        const bodyContent = quiz.content
            ? renderQuizBody(quiz)
            : `<iframe data-src="/wp-admin/admin-ajax.php?action=h5p_embed&id=${quiz.h5pId}" width="100%" height="${quiz.height}" frameborder="0" scrolling="yes" allowfullscreen class="expand-animation"></iframe>`;

        container.insertAdjacentHTML('beforeend', `<div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${labelId}" aria-hidden="true"><div class="modal-dialog modal-dialog-centered modal-fullscreen-md-down modal-lg"><div class="modal-content"><div class="modal-header"><h5 id="${labelId}" class="modal-title">${quiz.title}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body frageModalBody${quiz.bodyClass ? ' ' + quiz.bodyClass : ''}">${quiz.description ? `<p class="mt-0 mb-0">${quiz.description}</p>` : ''}${bodyContent}</div><div class="campus-info-overlay"><div class="info-icon-trigger" data-bs-toggle="collapse" data-bs-target="#campusInfosOverlay" aria-expanded="false"><i class="fas fa-info-circle campus-info-icon"></i></div><div class="collapse mt-2" id="campusInfosOverlay"><div class="card campus-info-card"><div class="card-body p-2">${campusInfoContent}</div></div></div></div></div></div></div>`);
    });
}
generateQuizModals();

// --- Quiz-Engine: Auswahl, Auswertung, Reset ---
function updateQuizOptionStates(container) {
    container.querySelectorAll('.quiz-option').forEach(opt => {
        const input = opt.querySelector('input');
        opt.classList.toggle('selected', input.checked);
    });
}

function evaluateQuiz(container) {
    const quizId = container.dataset.quizId;
    const h5pId = container.dataset.h5pId;
    const quiz = quizModals.find(q => q.id === quizId);
    if (!quiz?.content) return;

    const options = Array.from(container.querySelectorAll('.quiz-option'));
    const allCorrect = options.every((opt, idx) => {
        const input = opt.querySelector('input');
        const expected = quiz.content.options[idx].correct;
        return input.checked === expected;
    });

    options.forEach((opt, idx) => {
        const input = opt.querySelector('input');
        const expected = quiz.content.options[idx].correct;
        opt.classList.add('locked');
        if (expected) {
            opt.classList.add('correct');
        } else if (input.checked) {
            opt.classList.add('incorrect');
        }
    });

    const feedback = container.querySelector('.quiz-feedback');
    const submitBtn = container.querySelector('.quiz-submit-btn');
    const resetBtn = container.querySelector('.quiz-reset-btn');

    if (allCorrect) {
        const msg = quiz.content.successMessage || 'Richtig!';
        feedback.className = 'quiz-feedback show success';
        feedback.innerHTML = `<i class="fas fa-check-circle me-2"></i>${msg}`;
        submitBtn.style.display = 'none';
        resetBtn.style.display = 'none';
        if (addCompletedQuizId(h5pId)) showBadgeNotification();
    } else {
        feedback.className = 'quiz-feedback show error';
        feedback.innerHTML = '<i class="fas fa-times-circle me-2"></i>Leider falsch. Versuche es noch einmal.';
        submitBtn.style.display = 'none';
        resetBtn.style.display = 'inline-block';
    }
}

function resetQuiz(container) {
    if (container.dataset.quizType === 'memory') {
        initMemoryGame(container);
        return;
    }
    container.querySelectorAll('.quiz-option').forEach(opt => {
        opt.classList.remove('selected', 'correct', 'incorrect', 'locked');
        const input = opt.querySelector('input');
        if (input) input.checked = false;
    });
    const feedback = container.querySelector('.quiz-feedback');
    feedback.className = 'quiz-feedback';
    feedback.innerHTML = '';
    container.querySelector('.quiz-submit-btn').style.display = 'inline-block';
    container.querySelector('.quiz-reset-btn').style.display = 'none';
}

// --- Memory-Spiel ---
function initMemoryGame(container) {
    const quizId = container.dataset.quizId;
    const quiz = quizModals.find(q => q.id === quizId);
    if (!quiz?.content?.pairs) return;

    const pairs = quiz.content.pairs;
    const deck = [];
    pairs.forEach((pair, idx) => {
        deck.push({ pairId: idx, image: pair.image, label: pair.label || '' });
        deck.push({ pairId: idx, image: pair.image, label: pair.label || '' });
    });
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const grid = container.querySelector('.memory-grid');
    const deckHTML = deck.map(card => `
        <div class="memory-card" data-pair-id="${card.pairId}">
            <div class="memory-card-inner">
                <div class="memory-card-front"><i class="fas fa-question"></i></div>
                <div class="memory-card-back"><img src="${card.image}" alt="${card.label}"></div>
            </div>
        </div>
    `).join('');

    const feedback = container.querySelector('.quiz-feedback');
    feedback.className = 'quiz-feedback';
    feedback.innerHTML = '';

    container.dataset.memoryMatched = '0';
    const isReshuffle = grid.children.length > 0;

    if (isReshuffle) {
        // Sichtbares Feedback beim Neu-Mischen: kurzes Fade + Icon-Spin
        container.dataset.memoryBusy = '1';
        container.classList.add('shuffling');
        setTimeout(() => {
            grid.innerHTML = deckHTML;
            container.classList.remove('shuffling');
            container.dataset.memoryBusy = '0';
            updateMemoryProgress(container);
        }, 280);
    } else {
        grid.innerHTML = deckHTML;
        container.dataset.memoryBusy = '0';
        updateMemoryProgress(container);
    }
}

function updateMemoryProgress(container) {
    const matched = parseInt(container.dataset.memoryMatched || '0', 10);
    const total = container.querySelectorAll('.memory-card').length / 2;
    const el = container.querySelector('.memory-progress');
    if (el) el.textContent = `${matched} / ${total} Paaren`;
}

function handleMemoryCardClick(card) {
    const container = card.closest('.memory-container');
    if (!container) return;
    if (container.dataset.memoryBusy === '1') return;
    if (card.classList.contains('matched') || card.classList.contains('flipped')) return;

    // Bei dritter Karte: vorheriges nicht-passendes Paar zurückdrehen
    const pending = container.querySelectorAll('.memory-card.flipped:not(.matched)');
    if (pending.length >= 2) {
        pending.forEach(c => c.classList.remove('flipped'));
    }

    card.classList.add('flipped');
    const flipped = container.querySelectorAll('.memory-card.flipped:not(.matched)');

    if (flipped.length === 2) {
        const [a, b] = flipped;
        if (a.dataset.pairId === b.dataset.pairId) {
            // Kurze Sperre, damit die Flip-Animation der zweiten Karte abschließen kann,
            // bevor die Match-Pulse-Animation startet
            container.dataset.memoryBusy = '1';
            setTimeout(() => {
                a.classList.add('matched');
                b.classList.add('matched');
                const matched = parseInt(container.dataset.memoryMatched || '0', 10) + 1;
                container.dataset.memoryMatched = String(matched);
                container.dataset.memoryBusy = '0';
                updateMemoryProgress(container);
                const total = container.querySelectorAll('.memory-card').length / 2;
                if (matched === total) completeMemoryGame(container);
            }, 350);
        }
        // Kein Match: Karten bleiben offen, bis Spieler die dritte Karte klickt
    }
}

function completeMemoryGame(container) {
    const h5pId = container.dataset.h5pId;
    const feedback = container.querySelector('.quiz-feedback');
    feedback.className = 'quiz-feedback show success';
    feedback.innerHTML = '<i class="fas fa-check-circle me-2"></i>Super! Alle Paare gefunden.';
    if (addCompletedQuizId(h5pId)) showBadgeNotification();
}

document.addEventListener('change', (e) => {
    const input = e.target.closest('.quiz-option input');
    if (!input) return;
    const container = input.closest('.quiz-container');
    if (container) updateQuizOptionStates(container);
});

document.addEventListener('click', (e) => {
    const submitBtn = e.target.closest('.quiz-submit-btn');
    if (submitBtn) {
        evaluateQuiz(submitBtn.closest('.quiz-container'));
        return;
    }
    const resetBtn = e.target.closest('.quiz-reset-btn, .memory-reset-btn');
    if (resetBtn) {
        const container = resetBtn.closest('.quiz-container');
        if (container) resetQuiz(container);
        return;
    }
    const memoryCard = e.target.closest('.memory-card');
    if (memoryCard) {
        handleMemoryCardClick(memoryCard);
    }
});

document.addEventListener('shown.bs.modal', (e) => {
    const container = e.target.querySelector('.quiz-container');
    if (container) resetQuiz(container);
});

const filterStyleEl = document.createElement('style');
document.head.appendChild(filterStyleEl);
const filterState = {};

function updateFilterStyles() {
    filters.forEach(({ id }) => {
        const key = Array.isArray(id) ? id.join(',') : id;
        const visible = filterState[key];
        const ids = Array.isArray(id) ? id : [id];

        ids.forEach(singleId => {
            // SVG-Elemente filtern (nach dem Intro)
            document.querySelectorAll(`#lottieMap svg #${singleId} > *`)
                .forEach(el => {
                    el.style.display = visible ? '' : 'none';
                });

            // Lottie/JSON-Elemente filtern (während des Intros)
            if (window.lottieMapInstance) {
                // Methode 1: Über renderer.elements
                if (window.lottieMapInstance.renderer && window.lottieMapInstance.renderer.elements) {
                    window.lottieMapInstance.renderer.elements.forEach(element => {
                        if (element && element.data) {
                            let elementId = element.data.nm || element.data.id;

                            if (singleId === 'Studierende_mit_Fragen' && elementId === 'Studierende mit Fragen') {
                                elementId = singleId;
                            }

                            if (elementId === singleId) {
                                if (element.setVisible) element.setVisible(visible);
                            }
                        }
                    });
                }

                // Methode 2: Über animationData und Layer
                if (window.lottieMapInstance.animationData && window.lottieMapInstance.animationData.layers) {
                    window.lottieMapInstance.animationData.layers.forEach(layer => {
                        let layerId = layer.nm || layer.id;

                        if (singleId === 'Studierende_mit_Fragen' && layerId === 'Studierende mit Fragen') {
                            layerId = singleId;
                        }

                        if (layerId === singleId) {

                            // Layer-Sichtbarkeit direkt in der Animation setzen
                            if (window.lottieMapInstance.renderer && window.lottieMapInstance.renderer.elements) {
                                // ALLE Elemente mit dem gleichen Namen finden (nicht nur das erste)
                                const elements = window.lottieMapInstance.renderer.elements.filter(el => {
                                    if (!el || !el.data) return false;
                                    let elId = el.data.nm || el.data.id;
                                    if (singleId === 'Studierende_mit_Fragen' && elId === 'Studierende mit Fragen') {
                                        elId = singleId;
                                    }
                                    return elId === singleId;
                                });

                                elements.forEach(el => {
                                    if (el.setVisible) el.setVisible(visible);
                                });
                            }
                        }
                    });
                }
            }
        });
    });
}

// Filter-UI initialisieren
function initFilters() {
    const container = document.getElementById('filterOptions');
    if (!container) return;

    // Bestehende Filter löschen, um Duplikate zu vermeiden
    container.innerHTML = '';

    // Gespeicherte Einstellungen laden
    const savedSettings = localStorage.getItem('filter_settings');
    const savedState = savedSettings ? JSON.parse(savedSettings) : {};

    filters.forEach((filter, index) => {
        const key = Array.isArray(filter.id) ? filter.id.join(',') : filter.id;

        // Zustand wiederherstellen oder Standardwert nutzen
        if (savedState.hasOwnProperty(key)) {
            filterState[key] = savedState[key];
        } else {
            filterState[key] = filter.defaultVisible;
        }

        const filterId = `filter-${index}`;
        const isChecked = filterState[key];

        const html = `
      <label class="filter-card ${isChecked ? 'active' : ''}" for="${filterId}">
        <div class="filter-card-content">
          <img src="${filter.icon}" alt="${filter.label}" class="filter-icon">
          <span class="filter-label-text">${filter.label}</span>
        </div>
        <div class="filter-toggle">
          <input type="checkbox" id="${filterId}" ${isChecked ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </div>
      </label>
    `;

        const div = document.createElement('div');
        div.innerHTML = html;
        const labelEl = div.firstElementChild;
        const checkbox = labelEl.querySelector('input');

        checkbox.addEventListener('change', (e) => {
            const checked = e.target.checked;
            filterState[key] = checked;

            if (checked) {
                labelEl.classList.add('active');
            } else {
                labelEl.classList.remove('active');
            }

            // Einstellungen speichern
            localStorage.setItem('filter_settings', JSON.stringify(filterState));

            updateFilterStyles();
            updateToggleAllButton();
        });

        container.appendChild(div);
    });

    // "Alle einblenden" Button Logik
    let toggleAllBtn = document.getElementById('toggleAllBtn');
    if (toggleAllBtn) {
        // Event-Listener bereinigen durch Klonen
        const newBtn = toggleAllBtn.cloneNode(true);
        toggleAllBtn.parentNode.replaceChild(newBtn, toggleAllBtn);
        toggleAllBtn = newBtn;

        toggleAllBtn.addEventListener('click', () => {
            // Prüfen, ob aktuell alles sichtbar ist
            const allVisible = filters.every(filter => {
                const key = Array.isArray(filter.id) ? filter.id.join(',') : filter.id;
                return filterState[key] === true;
            });

            const newState = !allVisible;

            filters.forEach(filter => {
                const key = Array.isArray(filter.id) ? filter.id.join(',') : filter.id;
                filterState[key] = newState;
            });

            // UI aktualisieren
            document.querySelectorAll('#filterOptions input').forEach(cb => {
                cb.checked = newState;
                if (newState) {
                    cb.closest('.filter-card').classList.add('active');
                } else {
                    cb.closest('.filter-card').classList.remove('active');
                }
            });

            localStorage.setItem('filter_settings', JSON.stringify(filterState));
            updateFilterStyles();
            updateToggleAllButton();
        });
    }

    updateToggleAllButton();
    updateFilterStyles();
}

function updateToggleAllButton() {
    const toggleAllBtn = document.getElementById('toggleAllBtn');
    if (!toggleAllBtn) return;

    // Prüfen, ob alles sichtbar ist
    const allVisible = filters.every(filter => {
        const key = Array.isArray(filter.id) ? filter.id.join(',') : filter.id;
        return filterState[key] === true;
    });

    if (allVisible) {
        toggleAllBtn.classList.add('active');
        toggleAllBtn.innerHTML = '<i class="fas fa-eye-slash me-2"></i>Alle ausblenden';
    } else {
        toggleAllBtn.classList.remove('active');
        toggleAllBtn.innerHTML = '<i class="fas fa-eye me-2"></i>Alle einblenden';
    }
}

let interactionType = null;

function buildSelector({ exactMatches = [] }) {
    // genau die IDs selektieren
    return exactMatches
        .map(id => `#${id}`)
        .join(', ');
}//buildSelector

const clickableSelectorMap = buildSelector(CLICKABLE_Geb_CONFIG.lottieMap);

const styleTag = document.createElement('style');

styleTag.textContent = `
/* Map-Ebene: nur unsere inkl.-Selectoren, exkl. Klassen aus excludeMatches */
#lottieMap svg ${clickableSelectorMap},
#lottieMap svg ${clickableSelectorMap} * {
  pointer-events: all !important; cursor: pointer !important;
}
/* Gebäude-Beschriftungen liegen über den Flächen – Events durchreichen */
#lottieMap svg g#Gebaeudebezeichnung,
#lottieMap svg g#Gebaeudebezeichnung * {
  pointer-events: none !important;
}
  `;
document.head.appendChild(styleTag);

//JSON-Lader - Verhindert doppeltes Caching
let jsonCache = new Map(); // Globale Cache-Verwaltung

async function loadJSON(url) {
    // 1. Prüfe ob bereits im Cache
    if (jsonCache.has(url)) {
        return jsonCache.get(url);
    }

    // 2. Lade mit optimierten Headers
    const r = await fetch(url, {
        cache: 'force-cache', // Browser-Cache nutzen
        headers: {
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'max-age=3600' // 1 Stunde Cache
        }
    });

    if (!r.ok) throw new Error(r.status);

    const data = await r.json();
    jsonCache.set(url, data);

    return data;
}

/**
 * Baut den HTML-Inhalt für das Offcanvas komplett neu auf
 * und schreibt ihn in #buildingInfoContent.
 * @param {Object} b – ein Gebäude-Objekt mit den Feldern:
 *    title, images?, description?, featureSections?, openingHours?
 */
function renderBuildingOffcanvas(b) {
    let html = "";


    // 2) Bild(er) (Einzelbild oder Carousel)
    if (b.images?.length === 1) {
        html += `
      <div class="mb-3">
        <img src="${b.images[0]}" class="d-block w-100 mb-0 building-carousel-img">
      </div>`;
    } else if (b.images?.length > 1) {
        html += `
     <div id="carouselBuilding" class="carousel slide carousel-fade mb-3" data-bs-ride="carousel">
        <div class="carousel-inner">
          ${b.images.map((src, i) => `
            <div class="carousel-item${i === 0 ? ' active' : ''}">
              <img src="${src}" class="d-block w-100 mb-0"
                   class="building-carousel-img">
            </div>`).join("")}
        </div>
        <button class="carousel-control-prev" type="button"
                data-bs-target="#carouselBuilding" data-bs-slide="prev">
          <span class="carousel-control-prev-icon"></span>
          <span class="visually-hidden">Zurück</span>
        </button>
        <button class="carousel-control-next" type="button"
                data-bs-target="#carouselBuilding" data-bs-slide="next">
          <span class="carousel-control-next-icon"></span>
          <span class="visually-hidden">Weiter</span>
        </button>
      </div>`;
    }

    // 3) Beschreibung + Icon nebeneinander (3/4 Text, 1/4 Icon)
    if (b.description || b.icon) {
        html += `
      <div class="content-group mb-3 px-sm-0 px-md-4">
        <div class="row align-items-center">
          <div class="col-12 col-md-9 pr-md-0 order-0 order-md-0">
            ${b.description ? `<p class="mb-0-important">${b.description}</p>` : ""}
          </div>
          <div class="col-6 offset-3 col-md-3 offset-md-0 text-center px-0 order-1 order-md-1 mt-3 mt-md-0">
            ${b.icon
                ? `<img 
  src="${b.icon}" 
  alt="${b.title} Icon"
  class="building-icon-img" style="height:${b.iconHeight || 'auto'};">
`
                : ""}
          </div>

        </div>
      </div>`;
    }

    // 4) Feature-Sektionen
    if (b.featureSections) {
        b.featureSections.forEach(sec => {
            html += `
        <div class="content-group mb-3 px-sm-0 px-md-4">
          <p class="fw-bold mb-1 building-section-title" style="color:${sec.color || '#000'}">
            ${sec.heading}
          </p>
          <ul class="mb-0 ps-3">
            ${sec.items.map(item => `<li>${item}</li>`).join("")}
          </ul>
        </div>`;
        });
    }

    // 5) Öffnungszeiten
    if (b.openingHours?.slots) {
        html += `
      <div class="content-group mb-3 px-sm-0 px-md-4 building-hours-container"
           style="background:${b.openingHours.bgColor};">
        <p class="fw-bold mb-2 building-hours-title" style="color:${b.openingHours.color || '#000'}">
          ${b.openingHours.label}
        </p>
        ${b.openingHours.slots.map(s =>
            `<div>
     <strong>${s.label}</strong>
     <p class="d-inline m-0">${s.time}</p>
   </div>`
        ).join("")}

      </div>`;
    }

    // 6) Link-Button (ganz unten)
    if (b.link) {
        html += `
      <div class="content-group mb-3 px-sm-0 px-md-4">
        ${b.link.title ? `<p class="fw-bold mb-2 text-dark">${b.link.title}</p>` : ''}
        <a href="${b.link.url}" target="_blank" class="erkundungstour-btn">
          <p>${b.link.text}</p>
        </a>
      </div>`;
    }

    // 7) Rendern
    document.getElementById('buildingInfoContent').innerHTML = html;
}

/**
 * Holt das passende Objekt aus campusBuildings, rendert es
 * mit renderBuildingOffcanvas() und zeigt das Offcanvas an.
 * @param {string} id – die SVG-ID des angeklickten Gebäudes
 */
function openBuildingInfo(id) {
    const b = campusBuildings.find(x => x.id === id);
    if (!b) return;

    const header = document.getElementById('buildingInfoLabel');
    header.textContent = b.title;
    if (b.titleColor) header.style.color = b.titleColor;

    renderBuildingOffcanvas(b);
    new bootstrap.Offcanvas(document.getElementById('buildingInfoOffcanvas')).show();
}

/**
 * Öffnet ein Bootstrap-Modal mit Lazy-Load für ein iframe.
 * @param {string} id          Die Overlay-ID 
 * @param {string} [modalId]   Modal-ID. 
 * Wenn nicht gesetzt (oder leer), wird aus `id` automatisch `id + '_modal'` abgeleitet.
 */
function openTarget(id, modalId) {
    const mId = modalId && modalId.trim() ? modalId : `${id}_modal`;
    const modalElement = document.getElementById(mId);
    if (!modalElement) {
        console.warn(`Modal mit ID '${mId}' nicht gefunden.`);
        return;
    }


    // 3) Modal anzeigen
    bootstrap.Modal.getOrCreateInstance(modalElement).show();
}
//openTarget


function runIntroZoom(svg, orig, durationMs = 3000) {
    // Mobile-Erkennung
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 768;

    // Für Mobile: längere Dauer (2 Sekunden)
    const actualDuration = isMobile ? 3000 : durationMs;

    const start = performance.now();
    (function anim(now) {
        const t = Math.min(1, (now - start) / actualDuration);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        let z, centerX, centerY;

        if (isMobile) {
            // Für Mobile: von 0.5x auf 2.0x (200%) zoomen
            z = 0.5 + 2.3 * ease;
            // Andere Koordinate für Mobile (z.B. etwas nach rechts und oben)
            centerX = orig.width * 0.62; // 60% von der Breite
            centerY = orig.height * 0.42; // 40% von der Höhe
        } else {
            // Für Desktop: Standard-Verhalten (von 0.5x auf 1.0x in die Mitte)
            z = 0.5 + 0.5 * ease;
            centerX = orig.width / 2;
            centerY = orig.height / 2;
        }

        const vb = svg.viewBox.baseVal;
        const w = orig.width / z;
        const h = orig.height / z;
        vb.width = w;
        vb.height = h;
        vb.x = centerX - w / 2;
        vb.y = centerY - h / 2;

        if (t < 1) requestAnimationFrame(anim);
        else {
            // Nach dem Intro-Zoom: nur bei extremen Werten korrigieren
            setTimeout(() => {
                const vb = svg.viewBox.baseVal;
                const currentZoom = orig.width / vb.width;
                if (currentZoom > 4.0) {
                    // Nur bei extremem Zoom (>4x) auf maxZoom begrenzen
                    const newW = orig.width / 3.5;
                    const newH = orig.height / 3.5;
                    vb.width = newW;
                    vb.height = newH;
                    // Zentrierung beibehalten
                    const centerX = vb.x + vb.width / 2;
                    const centerY = vb.y + vb.height / 2;
                    vb.x = centerX - newW / 2;
                    vb.y = centerY - newH / 2;
                }
            }, 100);
        }
    })(start);
}

const clickGroups = [
    { containerId: 'Frage', prefix: 'Frage', modalSuffix: '_modal', handler: openTarget },
    ...Array.from({ length: 10 }, (_, i) => ({
        containerId: `Frage-${i + 1}`,
        prefix: 'Frage',
        modalSuffix: '_modal',
        handler: openTarget
    })),
    {
        containerId: 'Buttons',
        prefix: '',
        modalSuffix: '_modal',
        handler: (id) => {
            const urls = {
                Button_Innenstadt: 'https://www.luebeck-tourismus.de/altstadt',
                Button_Studium: 'https://www.th-luebeck.de/studium/studienangebot/studiengaenge/',
                Button_Hochschulsport: 'https://www.hochschulsport-luebeck.de/',
                Button_Speiseplan: 'https://studentenwerk.sh/de/mensen-in-luebeck?ort=3&mensa=8#mensaplan',
                Button_FabLab: 'https://www.fablab-luebeck.de/de',
                Button_Erkundungstour: 'https://www.th-luebeck.de/hochschule/aktuelles/neuigkeiten/beitrag/2023-03-13-premiere-neuer-film-zeigt-th-luebeck-als-transferhochschule/'
            };
            if (urls[id]) window.open(urls[id], '_blank');
        }
    },
    { containerId: 'Kaffee', prefix: '', modalSuffix: '', handler: (id) => openBuildingInfo(id) },
    { containerId: 'Logo', prefix: '', modalSuffix: '', handler: () => window.open('https://www.th-luebeck.de/', '_blank') }
];

// Zoom & Pan Setup
function setupZoomPan() {
    const container = document.getElementById('mapContainer');
    const svgs = [
        document.querySelector('#lottieMap svg'),
    ].filter(Boolean);
    const orig = svgs.map(svg => {
        // Verwende die tatsächliche Karten-Größe (1920x1080) als Referenz
        return { width: 1920, height: 1080 };
    });
    const minZoom = 1, maxZoom = 3.5;
    function clamp(vb, oW, oH) {
        vb.x = Math.max(-vb.width / 2, Math.min(oW - vb.width / 2, vb.x));
        vb.y = Math.max(-vb.height / 2, Math.min(oH - vb.height / 2, vb.y));
    }
    function doZoom(scaleAmt, cx, cy) {
        svgs.forEach((svg, i) => {
            const vb = svg.viewBox.baseVal;
            const { width: oW, height: oH } = orig[i];
            const curr = oW / vb.width;
            let nz = curr * scaleAmt;

            // Erlaube Zoom von 1.0x bis 3.5x (einheitlich für alle Geräte)
            nz = Math.min(3.5, Math.max(1.0, nz));

            const newW = oW / nz, newH = oH / nz;
            const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
            const c = pt.matrixTransform(svg.getScreenCTM().inverse());
            vb.x = c.x - (c.x - vb.x) * (newW / vb.width);
            vb.y = c.y - (c.y - vb.y) * (newH / vb.height);
            vb.width = newW; vb.height = newH;
            clamp(vb, oW, oH);
        });
    }

    let lastPtr = null;
    container.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
            e.preventDefault();
            lastPtr = { x: e.clientX, y: e.clientY };
            interactionType = 'tap';
            container.classList.add('grabbing');
        }
    }, { passive: false });
    container.addEventListener('pointermove', e => {
        if ((e.pointerType === 'mouse' || e.pointerType === 'pen') && lastPtr) {
            e.preventDefault();
            const prev = lastPtr, curr = { x: e.clientX, y: e.clientY };
            lastPtr = curr;
            if (Math.hypot(curr.x - prev.x, curr.y - prev.y) > 5) interactionType = 'pan';
            svgs.forEach((svg, i) => {
                const vb = svg.viewBox.baseVal;
                const p1 = svg.createSVGPoint(); p1.x = prev.x; p1.y = prev.y;
                const s1 = p1.matrixTransform(svg.getScreenCTM().inverse());
                const p2 = svg.createSVGPoint(); p2.x = curr.x; p2.y = curr.y;
                const s2 = p2.matrixTransform(svg.getScreenCTM().inverse());
                vb.x -= (s2.x - s1.x);
                vb.y -= (s2.y - s1.y);
                clamp(vb, orig[i].width, orig[i].height);
            });
        }
    }, { passive: false });
    ['pointerup', 'pointercancel'].forEach(evt =>
        container.addEventListener(evt, e => {
            if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
                lastPtr = null;
                container.classList.remove('grabbing');
            }
        })
    );
    const ts = { mode: null, startTouch: null, startDist: 0, startVBs: null };
    container.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.touches;
        interactionType = 'tap';
        if (t.length === 1) {
            ts.mode = 'pan';
            ts.startTouch = { x: t[0].clientX, y: t[0].clientY };
        } else if (t.length === 2) {
            ts.mode = 'pinch';
            interactionType = 'pinch';
            ts.startDist = Math.hypot(
                t[0].clientX - t[1].clientX,
                t[0].clientY - t[1].clientY
            );
            ts.startVBs = svgs.map(svg => ({ ...svg.viewBox.baseVal }));
        }
    }, { passive: false });
    container.addEventListener('touchmove', e => {
        e.preventDefault();
        const t = e.touches;
        if (ts.mode === 'pan' && t.length === 1) {
            const prev = ts.startTouch, curr = { x: t[0].clientX, y: t[0].clientY };
            if (Math.hypot(curr.x - prev.x, curr.y - prev.y) > 5) interactionType = 'pan';
            svgs.forEach((svg, i) => {
                const vb = svg.viewBox.baseVal;
                const p1 = svg.createSVGPoint(); p1.x = prev.x; p1.y = prev.y;
                const s1 = p1.matrixTransform(svg.getScreenCTM().inverse());
                const p2 = svg.createSVGPoint(); p2.x = curr.x; p2.y = curr.y;
                const s2 = p2.matrixTransform(svg.getScreenCTM().inverse());
                vb.x -= (s2.x - s1.x);
                vb.y -= (s2.y - s1.y);
                clamp(vb, orig[i].width, orig[i].height);
            });
            ts.startTouch = curr;
        } else if (ts.mode === 'pinch' && t.length === 2) {
            const dist = Math.hypot(
                t[0].clientX - t[1].clientX,
                t[0].clientY - t[1].clientY
            );
            const scaleAmt = dist / ts.startDist;
            ts.startDist = dist;
            const rect = container.getBoundingClientRect();
            const cx = (t[0].clientX + t[1].clientX) / 2 - rect.left;
            const cy = (t[0].clientY + t[1].clientY) / 2 - rect.top;
            doZoom(scaleAmt, cx, cy);
            interactionType = 'pinch';
        }
    }, { passive: false });
    container.addEventListener('wheel', e => {
        e.preventDefault();
        doZoom(1 - e.deltaY * 0.002, e.offsetX, e.offsetY);
        interactionType = 'pan';
    }, { passive: false }); //wheel



    container.addEventListener('pointerup', e => {
        if (!['mouse', 'touch', 'pen'].includes(e.pointerType) || interactionType !== 'tap') {
            return;
        }

        // 1) Spezieller Logo-Fall (kein Child-Loop)
        const logoEl = document.getElementById('Logo');
        if (logoEl && logoEl.contains(e.target)) {
            // öffnet nur einmal
            window.open('https://www.th-luebeck.de/', '_blank');
            interactionType = null;
            return;
        }

        // 2) Alle anderen clickGroups wie gehabt
        for (const { containerId, prefix, modalSuffix, handler } of clickGroups) {
            if (containerId === 'Logo') continue; // Logo haben wir schon behandelt

            const containerEl = document.getElementById(containerId);
            if (!containerEl) continue;

            // Ersetze die Child-Loop durch direkte Container-Prüfung
            if (containerEl.contains(e.target)) {
                e.stopPropagation();
                interactionType = null;

                // ID aus containerId ableiten
                let itemId;
                if (prefix) {
                    // Für Frage-X: "Frage-5" → "Frage5"
                    itemId = containerId.replace('-', '');
                    const modalId = `${itemId}${modalSuffix}`;
                    handler(itemId, modalId);
                } else {
                    // Für andere Container: Alle direkten Kinder durchgehen
                    for (const child of containerEl.children) {
                        if (child.contains(e.target)) {
                            if (child.id) {
                                const modalId = `${child.id}${modalSuffix}`;
                                handler(child.id, modalId);
                                break;
                            }
                        }
                    }
                }
                return;
            }
        }

        // 3) Gebäude-Offcanvas danach
        const elGeb = e.target.closest(clickableSelectorMap);
        if (elGeb) {
            const gebId = elGeb.id;
            if (campusBuildings.some(b => b.id === gebId)) {
                openBuildingInfo(gebId);
            }
        }
        interactionType = null;
    });
}//setupZoomPan

// OPTIMIERTE Lottie-Initialisierung - Verhindert doppeltes Laden
let lottieInstance = null; // Globale Instanz-Verwaltung

async function initAnimations() {
    if (lottieInstance && !lottieInstance.isDestroyed) {
        return;
    }

    if (lottieInstance) {
        try {
            lottieInstance.destroy();
        } catch (e) {
        }
    }

    document.getElementById('lottieMap').innerHTML = '';

    // 3. JSON nur einmal laden (mit Cache)
    const [dataMap] = await Promise.all([
        loadJSON('assets/campus_map_intro.json')
    ]);

    if (!cachedCampusMapSvg) {
        fetch('assets/campus_map.svg')
            .then(r => r.text())
            .then(svgText => {
                cachedCampusMapSvg = svgText;
            })
            .catch(err => {
            });
    }

    lottieInstance = lottie.loadAnimation({
        container: document.getElementById('lottieMap'),
        renderer: 'svg',
        loop: false,
        autoplay: true,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid meet',
            progressiveLoad: true,
            hideOnTransparent: true,
            className: 'lottie-optimized'
        },
        animationData: dataMap
    });

    window.lottieMapInstance = lottieInstance;

    const durationMs = 5000;

    // 2) Sobald Lottie sein DOM fertig geladen hat:
    window.lottieMapInstance.addEventListener('DOMLoaded', () => {
        const container = document.getElementById('lottieMap');

        // Filter für Intro-Animation anwenden
        updateFilterStyles();


        // 1) Auslagerung des Destroy-&-Insert-Logik in eine Funktion
        function showCampusSVG() {
            if (!window.lottieMapInstance) return;

            // Aktuellen Zoom-Zustand speichern
            const currentSvg = document.querySelector('#lottieMap svg');
            let savedViewBox = null;
            if (currentSvg) {
                const vb = currentSvg.viewBox.baseVal;
                savedViewBox = {
                    x: vb.x,
                    y: vb.y,
                    width: vb.width,
                    height: vb.height
                };
            }

            window.lottieMapInstance.destroy();

            const container = document.getElementById('lottieMap');
            container.innerHTML = cachedCampusMapSvg || '<p>SVG nicht verfügbar.</p>';

            // Zoom-Zustand wiederherstellen, falls vorhanden
            if (savedViewBox) {
                const newSvg = document.querySelector('#lottieMap svg');
                if (newSvg) {
                    const newVb = newSvg.viewBox.baseVal;
                    newVb.x = savedViewBox.x;
                    newVb.y = savedViewBox.y;
                    newVb.width = savedViewBox.width;
                    newVb.height = savedViewBox.height;
                }
            }

            document.getElementById('Button_Pausen')?.remove();

            // Frage-Elemente basierend auf Completion-Status einfärben
            if (typeof window.colorQuizElements === 'function') {
                window.colorQuizElements();
            }

            // Kaffee & Geb hover
            const gebChildren = Array.from(
                document.querySelectorAll('#lottieMap svg g#Gebaeude > g')
            ).map(el => el.id);
            const kaffeeChildren = Array.from(
                document.querySelectorAll('#lottieMap svg g#Kaffee > g')
            ).map(el => el.id);
            const FahrradstationenChildren = Array.from(
                document.querySelectorAll('#lottieMap svg g#Fahrradstationen> g')
            ).map(el => el.id);
            const BushaltestellenChildren = Array.from(
                document.querySelectorAll('#lottieMap svg g#Bushaltestellen> g')
            ).map(el => el.id);

            const hoverSelectors = [
                '#lottieMap svg g#Logo:hover',
                ...CLICKABLE_Geb_CONFIG.lottieMap.exactMatches
                    .filter(id => gebChildren.includes(id))
                    .map(id => `#lottieMap svg g#Gebaeude > g#${id}:hover`),
                ...CLICKABLE_Geb_CONFIG.lottieMap.exactMatches
                    .filter(id => kaffeeChildren.includes(id))
                    .map(id => `#lottieMap svg g#Kaffee > g#${id}:hover`),
                ...CLICKABLE_Geb_CONFIG.lottieMap.exactMatches
                    .filter(id => FahrradstationenChildren.includes(id))
                    .map(id => `#lottieMap svg g#Fahrradstationen> g#${id}:hover`),
                ...CLICKABLE_Geb_CONFIG.lottieMap.exactMatches
                    .filter(id => BushaltestellenChildren.includes(id))
                    .map(id => `#lottieMap svg g#Bushaltestellen> g#${id}:hover`),
            ].join(',\n');


            // Erstelle ein neues <style> und injiziere nur DIESEN Rule-Block
            const hoverStyle = document.createElement('style');
            hoverStyle.textContent = `
    ${hoverSelectors} {
      filter: brightness(0.9);
    }
    `;
            document.head.appendChild(hoverStyle);

            (function makeLogoFullyClickable() {
                const svg = container.querySelector('svg');
                const logoGroup = svg.querySelector('g#Logo');
                if (!logoGroup) return;
                const bbox = logoGroup.getBBox();
                const rect = document.createElementNS(svg.namespaceURI, 'rect');
                rect.setAttribute('x', bbox.x);
                rect.setAttribute('y', bbox.y);
                rect.setAttribute('width', bbox.width);
                rect.setAttribute('height', bbox.height);
                rect.setAttribute('fill', 'transparent');
                rect.setAttribute('pointer-events', 'all');
                // ganz nach oben im <g id="Logo">
                logoGroup.insertBefore(rect, logoGroup.firstChild);
            })();

            // Hover-Styles, viewBox-Klasse, Logo-Hitbox, Zoom/Pan und Filter initialisieren
            document.querySelector('svg')?.classList.add('campus-map-svg');

            setupZoomPan();
            initFilters();
        }

        // 2) Timeout speichern, damit wir ihn abbrechen können
        const introTimeout = setTimeout(() => {
            showCampusSVG();
        }, durationMs);

        // Funktion um zum finalen Zoom-Zustand zu springen
        function jumpToFinalZoom() {
            const svg = document.querySelector('#lottieMap svg');
            if (!svg) return;

            const vb = svg.viewBox.baseVal;
            const orig = { width: 1920, height: 1080 };

            // Mobile-Erkennung
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                window.innerWidth <= 768;

            let finalZoom, centerX, centerY;

            if (isMobile) {
                // Für Mobile: 2.8x Zoom (wie im Intro: 0.5 + 2.3 * 1 = 2.8)
                finalZoom = 2.8;
                centerX = orig.width * 0.62;
                centerY = orig.height * 0.42;
            } else {
                // Für Desktop: 1.0x Zoom (normale Größe)
                finalZoom = 1.0;
                centerX = orig.width / 2;
                centerY = orig.height / 2;
            }

            // Finalen Zoom-Zustand setzen
            const newW = orig.width / finalZoom;
            const newH = orig.height / finalZoom;
            vb.width = newW;
            vb.height = newH;
            vb.x = centerX - newW / 2;
            vb.y = centerY - newH / 2;
        }

        // 3) Skip-Listener für Desktop (Leertaste)
        document.addEventListener('keydown', e => {
            if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                e.preventDefault();
                clearTimeout(introTimeout);
                jumpToFinalZoom();
                showCampusSVG();
            }
        });

        // 4) Skip-Listener für Touchscreen (einmaliger Tap)
        let skipTouchHandled = false;
        function onFirstTouch(e) {
            if (skipTouchHandled) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            skipTouchHandled = true;
            clearTimeout(introTimeout);
            jumpToFinalZoom();
            showCampusSVG();

            // Event-Listener entfernen
            window.removeEventListener('touchstart', onFirstTouch, { passive: false });
            document.removeEventListener('touchstart', onFirstTouch, { passive: false });
        }
        // Event-Listener mit höherer Priorität registrieren
        window.addEventListener('touchstart', onFirstTouch, { passive: false, capture: true });
        document.addEventListener('touchstart', onFirstTouch, { passive: false, capture: true });
    });


    window.lottieMapInstance.addEventListener('complete', () => {
        window.lottieMapInstance.goToAndStop(window.lottieMapInstance.totalFrames - 1, true);
    });

    const mL = new Promise(r => window.lottieMapInstance.addEventListener('DOMLoaded', r));
    const container = document.getElementById('mapContainer');
    // Ein SVG-Element statt eines Arrays
    const svg = document.querySelector('#lottieMap svg');
    const vb = svg.viewBox.baseVal;
    // Ursprungsgröße fest definieren (wie in jumpToFinalZoom und setupZoomPan)
    // Dies verhindert Race-Conditions beim Refresh auf Android
    const orig = {
        width: 1920,
        height: 1080
    };

    Promise.all([mL]).then(() => {
        setupZoomPan();
        runIntroZoom(svg, orig, 3000);
        setTimeout(async () => {
            initFilters();
        }, 300);
    });
}//initAnimations

// 4) DOMContentLoaded: initAnimations + Overlays + Rest
document.addEventListener('DOMContentLoaded', async () => {
    const el = document.getElementById("footer-container");
    if (el) el.remove(); // sofort weg, Inhalt wird nie aufgebaut

    // Starte Lottie & Map
    initAnimations();

    const offcanvasEl = document.getElementById('buildingInfoOffcanvas');
    offcanvasEl.addEventListener('shown.bs.offcanvas', () => {
        const el = document.getElementById('carouselBuilding');
        if (!el) return;

        const inst = bootstrap.Carousel.getOrCreateInstance(el, {
            interval: 3000,
            pause: false,
            wrap: true,
            touch: true
        });
        inst.cycle();

        // Für den nächsten Wechsel alle Transition-Dauern auf 0 setzen
        const disableOnce = () => {
            // sofort vor Bootstrap-Handler aktiv
            el.classList.add('no-anim');
            const onSlid = () => {
                el.classList.remove('no-anim');   // Auto-Wechsel wieder mit Fade
                el.removeEventListener('slid.bs.carousel', onSlid);
            };
            el.addEventListener('slid.bs.carousel', onSlid);
        };

        const prev = el.querySelector('.carousel-control-prev');
        const next = el.querySelector('.carousel-control-next');

        prev?.addEventListener('pointerdown', disableOnce);
        next?.addEventListener('pointerdown', disableOnce);

        // Optional: Tastatur
        el.addEventListener('keydown', e => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') disableOnce();
        });
    });

}); //DOMContentLoaded


// Funktion um Accordion-Toggle zu verwalten
function setupAccordionToggle(modal) {
    const infoIconContainer = modal.querySelector('.info-icon-trigger');
    const infoIcon = modal.querySelector('.info-icon-trigger .fas.fa-info-circle');
    const collapseElement = modal.querySelector('#campusInfosOverlay');

    if (infoIcon && collapseElement && infoIconContainer) {
        // Alle Event-Listener komplett entfernen durch Klonen des Elements
        const newContainer = infoIconContainer.cloneNode(true);
        infoIconContainer.parentNode.replaceChild(newContainer, infoIconContainer);

        // Neue Referenzen holen
        const freshContainer = modal.querySelector('.info-icon-trigger');
        const freshCollapseElement = modal.querySelector('#campusInfosOverlay');

        // Funktion zum Aktualisieren der UI
        function updateUI() {
            if (freshCollapseElement.classList.contains('show')) {
                freshContainer.innerHTML = '<div class="campus-accordion-close"><i class="fas fa-info-circle campus-info-icon"></i><span>Schließen</span></div>';
                freshContainer.style.padding = '10px 12px';

                // Event-Listener für das neue Icon hinzufügen
                const newIcon = freshContainer.querySelector('.fas.fa-info-circle');
                if (newIcon) {
                    newIcon.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        if (freshCollapseElement.classList.contains('show')) {
                            freshCollapseElement.classList.remove('show');
                        } else {
                            freshCollapseElement.classList.add('show');
                        }
                        updateUI();
                    });
                }

                // Event-Listener für den "Schließen"-Text hinzufügen
                const closeText = freshContainer.querySelector('span');
                if (closeText) {
                    closeText.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        if (freshCollapseElement.classList.contains('show')) {
                            freshCollapseElement.classList.remove('show');
                        } else {
                            freshCollapseElement.classList.add('show');
                        }
                        updateUI();
                    });
                }
            } else {
                // Accordion ist geschlossen - nur Icon anzeigen
                freshContainer.innerHTML = '<i class="fas fa-info-circle campus-info-icon"></i>';
                freshContainer.style.padding = '10px';

                // Event-Listener für das neue Icon hinzufügen
                const newIcon = freshContainer.querySelector('.fas.fa-info-circle');
                if (newIcon) {
                    newIcon.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        if (freshCollapseElement.classList.contains('show')) {
                            freshCollapseElement.classList.remove('show');
                        } else {
                            freshCollapseElement.classList.add('show');
                        }
                        updateUI();
                    });
                }
            }
        }

        // Bootstrap-Attribute entfernen
        freshContainer.removeAttribute('data-bs-toggle');
        freshContainer.removeAttribute('data-bs-target');
        freshContainer.removeAttribute('aria-expanded');

        // Event-Listener für das Icon hinzufügen
        const iconElement = freshContainer.querySelector('.fas.fa-info-circle');
        if (iconElement) {
            iconElement.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                // Einfaches Toggle der show-Klasse
                if (freshCollapseElement.classList.contains('show')) {
                    // Schließen
                    freshCollapseElement.classList.remove('show');
                } else {
                    // Öffnen
                    freshCollapseElement.classList.add('show');
                }

                // UI sofort aktualisieren
                updateUI();
            });
        }

        // Initiale UI setzen
        updateUI();
    }
}

// ========================================
// H5P iframe-Überwachung und Event-Handling
// ========================================

// Globale Variable für Quiz-Fortschritt
let completedQuizzesCount = 0;

// Hilfsfunktionen für Local Storage Management
function getCompletedQuizIds() {
    const stored = localStorage.getItem('h5p_completed_ids');
    const ids = stored ? JSON.parse(stored) : [];
    // Konvertiere alle IDs zu Strings für konsistenten Vergleich
    return ids.map(id => String(id));
}

// Globale Funktion zum Einfärben der Frage-Elemente basierend auf Quiz-Completion
window.colorQuizElements = function () {
    const completedIds = getCompletedQuizIds();

    const quizMapping = {
        'Frage': '34',
        'Frage-2': '32',
        'Frage-3': '16',
        'Frage-4': '19',
        'Frage-5': '37',
        'Frage-6': '31',
        'Frage-7': '27',
        'Frage-8': '30',
        'Frage-9': '9',
        'Frage-10': '13'
    };

    Object.keys(quizMapping).forEach(frageId => {
        const h5pId = quizMapping[frageId];
        const isCompleted = completedIds.includes(h5pId);

        const frageGruppe = document.querySelector(`#${frageId}`);

        if (!frageGruppe) {
            return;
        }

        let sprechblase = frageGruppe.querySelector('[id^="Sprechblase"]');

        if (sprechblase) {
            if (isCompleted) {
                if (sprechblase.tagName === 'g') {
                    const pathInGroup = sprechblase.querySelector('path');
                    if (pathInGroup) {
                        pathInGroup.setAttribute('fill', '#4B5459');
                        pathInGroup.setAttribute('stroke', '#4B5459');
                    }
                }
                else if (sprechblase.tagName === 'path') {
                    sprechblase.setAttribute('fill', '#4B5459');
                    sprechblase.setAttribute('stroke', '#4B5459');
                }

                const allPaths = frageGruppe.querySelectorAll('path');

                allPaths.forEach(path => {
                    const currentFill = path.getAttribute('fill');
                    const pathId = path.getAttribute('id');

                    const isSprechblasePath = pathId && pathId.startsWith('Sprechblase');
                    const isInsideSprechblase = path.closest('[id^="Sprechblase"]');

                    if (!isSprechblasePath && !isInsideSprechblase && currentFill === '#4b5459') {
                        path.setAttribute('fill', '#fff');
                    }
                });
            }
        }
    });
}

function addCompletedQuizId(h5pId) {
    const completedIds = getCompletedQuizIds();

    const h5pIdString = String(h5pId);

    if (!completedIds.includes(h5pIdString)) {
        completedIds.push(h5pIdString);
        localStorage.setItem('h5p_completed_ids', JSON.stringify(completedIds));

        completedQuizzesCount++;

        // Frage-Elemente neu einfärben
        if (typeof window.colorQuizElements === 'function') {
            window.colorQuizElements();
        }

        const badgesOffcanvas = document.getElementById('badgesOffcanvas');
        if (badgesOffcanvas && badgesOffcanvas.classList.contains('show')) {
            renderBadgesOverview();
        }

        return true;
    }

    return false;
}

function initCompletedQuizzesCounter() {
    const completedIds = getCompletedQuizIds();
    completedQuizzesCount = completedIds.length;
}

document.addEventListener('DOMContentLoaded', function () {
    initCompletedQuizzesCounter();

    // Badge-Button Event-Listener
    const badgeBtn = document.getElementById('toolboxBadgesBtn');
    if (badgeBtn) {
        badgeBtn.addEventListener('click', function () {
            // Render Badges
            renderBadgesOverview();

            // Öffne Offcanvas
            const badgesOffcanvas = new bootstrap.Offcanvas(document.getElementById('badgesOffcanvas'));
            badgesOffcanvas.show();
        });
    }

    // Entferne Focus von Buttons nach Schließen der Offcanvas
    const badgesOffcanvasEl = document.getElementById('badgesOffcanvas');
    if (badgesOffcanvasEl) {
        badgesOffcanvasEl.addEventListener('hidden.bs.offcanvas', function () {
            if (badgeBtn) badgeBtn.blur();
        });
    }

    const filterOffcanvasEl = document.getElementById('filterOffcanvas');
    const filterBtn = document.querySelector('[data-bs-target="#filterOffcanvas"]');
    if (filterOffcanvasEl && filterBtn) {
        filterOffcanvasEl.addEventListener('hidden.bs.offcanvas', function () {
            filterBtn.blur();
        });
    }

    // Reset Progress Button
    const resetProgressBtn = document.getElementById('resetProgressBtn');
    if (resetProgressBtn) {
        resetProgressBtn.addEventListener('click', function () {
            // Bestätigungs-Dialog
            const confirmed = confirm(
                'Fortschritt zurücksetzen?\n\n' +
                'Möchtest du nochmal von vorne beginnen?\n\n' +
                '• Alle abgeschlossenen Quizze werden zurückgesetzt\n' +
                '• Alle freigeschalteten Badges werden zurückgesetzt\n' +
                '• Du kannst die Badges erneut freischalten\n\n' +
                'Jetzt zurücksetzen?'
            );

            if (confirmed) {
                // Lösche H5P-Daten aus localStorage
                localStorage.removeItem('h5p_completed_ids');
                localStorage.removeItem('h5p_quiz_results');

                // Lösche Filter-Einstellungen
                localStorage.removeItem('filter_settings');

                // Optional: Lösche alle H5P-bezogenen Keys
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key) {
                        if (key.startsWith('h5p')) {
                            keysToRemove.push(key);
                        }
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));

                window.location.reload();
            }
        });
    }
});

// Hilfsfunktion zur Extraktion der Content-ID aus der iframe-URL
function extractContentIdFromUrl(url) {
    const match = url.match(/[?&]id=(\d+)/);
    return match ? parseInt(match[1]) : null;
}

function checkH5PCategory(statement, categoryName) {
    return statement.context?.contextActivities?.category?.some(cat =>
        cat.id !== null && cat.id.includes(categoryName)
    ) || false;
}

function tryAwardBadge(contentId) {
    if (addCompletedQuizId(contentId)) showBadgeNotification();
}

function setupH5PForIframe(h5pInstance, contentId) {
    h5pInstance.externalDispatcher.on('xAPI', function (event) {
        const statement = event.data?.statement;
        if (!statement) return;

        const idFromExtension = statement.object?.definition?.extensions?.['http://h5p.org/x-api/h5p-local-content-id'];
        const fullContentId = idFromExtension || contentId;

        let existing = JSON.parse(localStorage.getItem('h5p_' + fullContentId) || '[]');
        if (!Array.isArray(existing)) existing = [existing];

        const subId = statement.object?.definition?.extensions?.['http://h5p.org/x-api/h5p-subContentId'];
        const objectId = statement.object?.id;

        // Prüfen, ob bereits ein Statement für dieses Objekt existiert
        const index = existing.findIndex(s => {
            const storedSubId = s.object?.definition?.extensions?.['http://h5p.org/x-api/h5p-subContentId'];
            const storedObjId = s.object?.id;
            return (subId && storedSubId === subId) || (!subId && storedObjId === objectId);
        });

        const isMemoryGameInteraction = statement.verb?.id.includes('interacted') && checkH5PCategory(statement, 'MemoryGame');
        const isMemoryGameCompleted = statement.verb?.id.includes('completed') && checkH5PCategory(statement, 'MemoryGame');
        const isFlashcardInteraction = statement.verb?.id.includes('interacted') && checkH5PCategory(statement, 'Flashcards');
        const isFlashcardCompleted = statement.verb?.id.includes('completed') && checkH5PCategory(statement, 'Flashcards');
        const isCrosswordInteraction = statement.verb?.id.includes('interacted') && checkH5PCategory(statement, 'Crossword');
        const isCrosswordCompleted = statement.verb?.id.includes('completed') && checkH5PCategory(statement, 'Crossword');

        const isFlashcard = checkH5PCategory(statement, 'Flashcards');
        const isCrossword = checkH5PCategory(statement, 'Crossword');

        const isNewCorrectAnswer = statement.verb?.id.includes('answered') && statement.result?.success === true && !isFlashcard && !isCrossword;
        const isFlashcardAnsweredCorrect = statement.verb?.id.includes('answered') && isFlashcard &&
            statement.result?.score?.raw > 0 &&
            statement.result.score.raw === statement.result.score.max;
        const isFlashcardInteracted = statement.verb?.id.includes('interacted') && isFlashcard;
        const isCrosswordAnsweredCorrect = statement.verb?.id.includes('answered') && isCrossword && statement.result?.success === true;
        const isCrosswordInteracted = statement.verb?.id.includes('interacted') && isCrossword;
        const isMultipleHotspots = statement.verb?.id.includes('answered') &&
            checkH5PCategory(statement, 'ImageMultipleHotspotQuestion') &&
            statement.result?.score &&
            statement.result.score.raw > 0 &&
            statement.result.score.raw >= statement.result.score.max;

        const shouldAwardBadge = [isNewCorrectAnswer, isFlashcardAnsweredCorrect, isFlashcardCompleted,
            isCrosswordAnsweredCorrect, isCrosswordCompleted, isMultipleHotspots, isMemoryGameCompleted].some(Boolean);
        const shouldUpdate = shouldAwardBadge || [isFlashcardInteracted, isCrosswordInteracted,
            isMemoryGameInteraction, isFlashcardInteraction, isCrosswordInteraction].some(Boolean);

        if (index === -1) {
            existing.push(statement);
            if (shouldAwardBadge) tryAwardBadge(fullContentId);
        } else if (shouldUpdate) {
            const old = existing[index];
            const oldSuccess = old.result?.success === true;
            const oldVerb = old.verb?.id || '';
            const replace = !oldSuccess && (oldVerb.includes('interacted') || oldVerb.includes('attempted') || oldVerb.includes('progressed'));
            const isNewSuccess = statement.result?.success === true;

            if (oldSuccess && !isNewSuccess && !isMultipleHotspots) {
            } else if (!oldSuccess && isNewSuccess) {
                existing[index] = statement;
                tryAwardBadge(fullContentId);
            } else if (isMultipleHotspots) {
                const oldScore = old.result?.score?.raw || 0;
                const newScore = statement.result?.score?.raw || 0;
                if (newScore > oldScore && newScore === statement.result.score.max) {
                    existing[index] = statement;
                    tryAwardBadge(fullContentId);
                } else if (newScore === oldScore) {
                    existing[index] = statement;
                }
            } else if (shouldAwardBadge) {
                existing[index] = statement;
                tryAwardBadge(fullContentId);
            } else if (replace) {
                existing[index] = statement;
            }
        }

        // Speichern nach eventuellem Update
        localStorage.setItem('h5p_' + fullContentId, JSON.stringify(existing));
    });
}

document.addEventListener('shown.bs.modal', (e) => {
    const iframe = e.target.querySelector('iframe[data-src]');
    if (iframe !== null) {
        if (!iframe.src) {
            iframe.src = iframe.dataset.src;

            iframe.addEventListener('load', function () {
                setTimeout(() => {
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        const iframeWindow = iframe.contentWindow;

                        const checkH5P = (window) => {
                            if (window && typeof window.H5P !== 'undefined' && window.H5P.externalDispatcher) {
                                const iframeContentId = extractContentIdFromUrl(iframe.src);
                                if (iframeContentId) {
                                    setupH5PForIframe(window.H5P, iframeContentId);
                                    return true;
                                }
                            }
                            return false;
                        };

                        if (!checkH5P(iframeWindow)) {
                            setTimeout(() => checkH5P(iframeWindow), 2000);
                        }
                    } catch (error) {
                    }
                }, 1000);
            });
        }
    }

    setupAccordionToggle(e.target);
});


function getProgressiveBadge(count) {
    return ALL_BADGES.find(b => b.milestone === count) || null;
}

function renderBadgesOverview() {
    const container = document.getElementById('badgesContent');
    if (!container) return;

    const currentCount = completedQuizzesCount;
    let html = '';

    ALL_BADGES.forEach(badge => {
        const isUnlocked = currentCount >= badge.milestone;
        const progress = Math.min(currentCount, badge.milestone);
        const progressPercent = (progress / badge.milestone) * 100;
        const remaining = badge.milestone - currentCount;

        html += `
  <div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'}">
    <div class="badge-icon-container">
      <img src="${badge.url}" alt="${badge.name}">
    </div>
    <div class="badge-info">
      <h3 class="badge-name">${badge.name}</h3>
      <p class="badge-description">${badge.description}</p>
      <div class="badge-progress">
        <div class="progress-text">
          <span>${progress}/${badge.milestone} Quizze</span>
          <span>${Math.round(progressPercent)}%</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
        </div>
      </div>
      ${isUnlocked
                ? '<div class="badge-date">Erreicht!</div>'
                : remaining > 0
                    ? `<div class="badge-hint">Noch ${remaining} Quiz${remaining === 1 ? '' : 'ze'}!</div>`
                    : ''
            }
    </div>
  </div>
`;
    });

    container.innerHTML = html;
}

function showBadgeNotification() {
    const badge = getProgressiveBadge(completedQuizzesCount);

    if (!badge) return;

    const existingNotification = document.querySelector('.badge-notification');
    if (existingNotification) existingNotification.remove();

    const notification = document.createElement('div');
    notification.className = 'badge-notification';

    notification.innerHTML = `
<div class="badge-content">
  <img src="${badge.url}" alt="Badge" class="badge-svg">
  <div class="badge-text">
    Badge erhalten: <span class="badge-name">${badge.name}</span>
  </div>
</div>
<button class="close-btn" onclick="closeBadgeNotification()">&times;</button>
<div class="countdown-timer" id="countdown-timer"></div>
`;

    document.body.appendChild(notification);

    const badgeContent = notification.querySelector('.badge-content');
    badgeContent.addEventListener('click', function () {
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        });

        closeBadgeNotification();

        setTimeout(() => {
            renderBadgesOverview();
            const badgesOffcanvas = new bootstrap.Offcanvas(document.getElementById('badgesOffcanvas'));
            badgesOffcanvas.show();
        }, 300);
    });

    startCountdownTimer(notification);
}

function startCountdownTimer(notification) {
    const timer = notification.querySelector('#countdown-timer');
    let timeLeft = 10;

    notification.countdownInterval = setInterval(() => {
        timer.style.width = ((timeLeft -= 0.1) / 10 * 100) + '%';
        if (timeLeft <= 0) {
            clearInterval(notification.countdownInterval);
            closeBadgeNotification();
        }
    }, 100);
}

function closeBadgeNotification() {
    const n = document.querySelector('.badge-notification');
    if (n) {
        if (n.countdownInterval) clearInterval(n.countdownInterval);
        n.remove();
    }
}
