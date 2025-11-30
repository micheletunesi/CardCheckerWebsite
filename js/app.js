// Shared application functions for CardChecker pages

// Navigation helper used by buttons
window.navigateTo = function(page) {
    window.location.href = page;
};

// FAQ loading functionality
window.loadFAQs = function() {
    const container = document.getElementById('faq-container');
    if (!container) return; // not on FAQ page

    fetch('../data/faq.json')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load FAQ data');
            return response.json();
        })
        .then(data => {
            container.innerHTML = ''; // clear placeholder
            if (data.faqs && Array.isArray(data.faqs)) {
                data.faqs.forEach(item => {
                    const faqItem = document.createElement('div');
                    faqItem.className = 'faq-item';
                    faqItem.innerHTML = `
                        <h3 class="faq-question">${item.question}</h3>
                        <p class="faq-answer">${item.answer}</p>
                    `;
                    container.appendChild(faqItem);
                });
            }
        })
        .catch(err => {
            console.error('Error loading FAQs:', err);
            container.innerHTML = '<p style="color:#a33;">Errore nel caricamento delle FAQ.</p>';
        });
};

// Load FAQs when the page loads (if on FAQ page)
document.addEventListener('DOMContentLoaded', function() {
    window.loadFAQs();
    // also load site credits if present
    if (window.loadCredits) window.loadCredits();
});

// Load credits (from data/credits.json) into any footer container with id `siteCredits`
window.loadCredits = function() {
    const el = document.getElementById('siteCredits');
    if (!el) return;
    // choose path depending on page location
    const path = location.pathname.includes('/pages/') ? '../data/credits.json' : 'data/credits.json';
    fetch(path)
        .then(r => { if (!r.ok) throw new Error('Failed to load credits'); return r.json(); })
        .then(data => {
            const author = data.author || '';
            const year = data.year || '';
            const version = data.version || '';
            el.innerHTML = `<p>created by ${author}, ${year}<br><br>Website version ${version}</p>`;
        })
        .catch(err => {
            console.error('Error loading credits:', err);
            // fallback: static text
            el.innerHTML = '<p>created by Michele Tunesi, 2025<br><br>Website version V0.1</p>';
        });
};

// Crea-lista functionality
window.generateList = function() {
    const cardCountEl = document.getElementById('cardCount');
    if (!cardCountEl) return;

    const cardCount = parseInt(cardCountEl.value);
    if (isNaN(cardCount) || cardCount < 1) {
        alert('Per favore, inserisci un numero valido');
        return;
    }

    const carteList = [];
    for (let i = 1; i <= cardCount; i++) carteList.push(i);

    const now = new Date();
    const dateTimeString = now.toLocaleString('it-IT');

    const output = `Carte mancanti:\n${carteList.join(' -- ')}\n\nCarte doppie:\n\n\nUltima modifica: ${dateTimeString}`;

    const outEl = document.getElementById('listOutput');
    if (outEl) {
        outEl.value = output;
    }

    const outputSection = document.getElementById('output');
    if (outputSection) outputSection.style.display = 'block';
};

// Generic copy helper (works for pages that use `listOutput` textarea)
window.copyToClipboard = function() {
    const textarea = document.getElementById('listOutput');
    if (!textarea) return;
    textarea.select();
    try {
        document.execCommand('copy');
        alert('Lista copiata negli appunti!');
    } catch (e) {
        alert('Impossibile copiare automaticamente. Seleziona e copia manualmente.');
    }
};

// Aggiorna-lista functionality
(function () {
    // internal state
    let currentMissing = [];
    let currentDoubles = [];
    // originals (immutable copy of the pasted list)
    let originalMissing = [];
    let originalDoubles = [];
    // keep track of recent conflicts so we can highlight them in the preview
    let lastConflictDoubles = [];
    let lastInvalidRemovals = [];

    function parseSections(text) {
        const missingMatch = text.match(/Carte mancanti:\s*([\s\S]*?)\s*Carte doppie:/i);
        const doublesMatch = text.match(/Carte doppie:\s*([\s\S]*?)\s*(?:Ultima modifica:|$)/i);

        const missingStr = missingMatch ? missingMatch[1].trim() : '';
        const doublesStr = doublesMatch ? doublesMatch[1].trim() : '';

        const parseNumList = (s) => {
            if (!s) return [];
            return s.split(/--|,|;|\s+/).map(x => x.trim()).filter(x => x !== '').map(x => parseInt(x)).filter(n => !isNaN(n));
        };

        return {
            missing: parseNumList(missingStr),
            doubles: parseNumList(doublesStr)
        };
    }

    function renderOutput() {
        const now = new Date();
        const dateTimeString = now.toLocaleString('it-IT');
        const missingLine = currentMissing.length ? currentMissing.join(' -- ') : '';
        const doublesLine = currentDoubles.length ? currentDoubles.join(' -- ') : '';

        const out = `Carte mancanti:\n${missingLine}\n\nCarte doppie:\n${doublesLine}\n\nUltima modifica: ${dateTimeString}`;

        // update editable textarea
        const outEl = document.getElementById('listOutput');
        if (outEl) outEl.value = out;

        // update original preview (highlights removed in red and added in green)
        const originalEl = document.getElementById('originalPreview');
        if (originalEl) {
            // build missing HTML based on originalMissing
            const currentMissingSet = new Set(currentMissing);
            const missingHtml = originalMissing.map(n => {
                const cls = currentMissingSet.has(n) ? '' : 'removed';
                return `<span class="num ${cls}" data-type="missing" data-num="${n}">${n}</span>`;
            }).join(' <span class="sep">--</span> ');

            // build doubles HTML preserving original occurrences and mark removed occurrences
            const currentCounts = {};
            currentDoubles.forEach(n => currentCounts[n] = (currentCounts[n] || 0) + 1);
            const originalCounts = {};
            originalDoubles.forEach(n => originalCounts[n] = (originalCounts[n] || 0) + 1);

            // render original occurrences and mark removed ones
            const seen = {};
            const origDoublesHtmlParts = [];
            originalDoubles.forEach(n => {
                seen[n] = (seen[n] || 0) + 1;
                const remaining = currentCounts[n] || 0;
                // if seen[n] <= remaining -> this occurrence still present
                const cls = (seen[n] <= remaining) ? '' : 'removed';
                origDoublesHtmlParts.push(`<span class="num ${cls}" data-type="double" data-num="${n}">${n}</span>`);
            });

            // append added doubles (those present in current but with count > original)
            Object.keys(currentCounts).forEach(key => {
                const k = parseInt(key);
                const origC = originalCounts[k] || 0;
                const currC = currentCounts[k] || 0;
                if (currC > origC) {
                    for (let i = 0; i < currC - origC; i++) {
                        origDoublesHtmlParts.push(`<span class="num added" data-type="double" data-num="${k}">${k}</span>`);
                    }
                }
            });

            const doublesHtml = origDoublesHtmlParts.join(' <span class="sep">--</span> ');

            const previewHtml = `Carte mancanti:\n${missingHtml || ''}\n\nCarte doppie:\n${doublesHtml || ''}\n\nUltima modifica: ${dateTimeString}`;
            originalEl.innerHTML = previewHtml;

            // make numbers clickable: delegate click
            originalEl.onclick = function(e) {
                const target = e.target;
                if (target && target.classList && target.classList.contains('num')) {
                    const num = parseInt(target.dataset.num);
                    const typ = target.dataset.type;
                    if (typ === 'missing') {
                        // remove this missing number
                        removeMissingNumber(num);
                    } else if (typ === 'double') {
                        // remove one occurrence of this double
                        removeDoubleNumber(num);
                    }
                }
            };
        }
    }

    // Remove helpers used by preview click
    function removeMissingNumber(n) {
        const idx = currentMissing.indexOf(n);
        if (idx !== -1) {
            currentMissing.splice(idx, 1);
            lastInvalidRemovals = [];
            showWarningMissing('');
        } else {
            lastInvalidRemovals = [n];
            showWarningMissing('I seguenti numeri non erano presenti nei mancanti (già rimossi o non presenti): ' + n);
        }
        renderOutput();
    }

    function removeDoubleNumber(n) {
        const idx = currentDoubles.indexOf(n);
        if (idx !== -1) {
            currentDoubles.splice(idx, 1);
            showWarningDoubles('');
        } else {
            showWarningRemoveDoubles('I seguenti numeri non erano presenti nella lista delle doppie: ' + n);
        }
        renderOutput();
    }

    function showWarningMissing(msg) {
        const el = document.getElementById('warning-missing');
        if (!el) return;
        if (!msg) { el.style.display = 'none'; el.textContent = ''; }
        else { el.style.display = 'block'; el.textContent = msg; }
    }

    function showWarningDoubles(msg) {
        const el = document.getElementById('warning-doubles');
        if (!el) return;
        if (!msg) { el.style.display = 'none'; el.textContent = ''; }
        else { el.style.display = 'block'; el.textContent = msg; }
    }

    function showWarningRemoveDoubles(msg) {
        const el = document.getElementById('warning-remove-doubles');
        if (!el) return;
        if (!msg) { el.style.display = 'none'; el.textContent = ''; }
        else { el.style.display = 'block'; el.textContent = msg; }
    }

    // Expose functions to global scope so buttons can call them
        window.loadFromPaste = function() {
        const text = document.getElementById('pasteInput')?.value || '';
        if (!text.trim()) {
            alert('Incolla prima la lista generata da Crea lista.');
            return;
        }

        const parsed = parseSections(text);
            // set originals and current state
            originalMissing = parsed.missing.slice();
            originalDoubles = parsed.doubles.slice();
            currentMissing = parsed.missing.slice();
            currentDoubles = parsed.doubles.slice();
        renderOutput();
                // clear both warnings and conflict markers
                lastConflictDoubles = [];
                lastInvalidRemovals = [];
                showWarningMissing('');
                showWarningDoubles('');
    };

        window.applyFoundMissing = function() {
        const input = document.getElementById('missingFoundInput')?.value.trim() || '';
        if (!input) return;

        const items = input.split(/[,;\s]+/).map(x => parseInt(x)).filter(n => !isNaN(n));
            const invalid = [];

            items.forEach(n => {
                const idx = currentMissing.indexOf(n);
                if (idx !== -1) {
                    currentMissing.splice(idx, 1);
                } else {
                    // already removed or never existed
                    invalid.push(n);
                }
            });

            lastInvalidRemovals = invalid.slice();

            if (invalid.length) showWarningMissing('I seguenti numeri non erano presenti nei mancanti (già rimossi o non presenti): ' + invalid.join(', '));
            else showWarningMissing('');

            renderOutput();
    };

        window.addDoubles = function() {
        const input = document.getElementById('doublesInput')?.value.trim() || '';
        if (!input) return;
        const items = input.split(/[,;\s]+/).map(x => parseInt(x)).filter(n => !isNaN(n));
        const conflicts = [];

        // Insert each item preserving ascending order and duplicates adjacent, unless it's still in missing
        items.forEach(item => {
            if (currentMissing.indexOf(item) !== -1) {
                // cannot add a double that is still marked missing
                    conflicts.push(item);
                    return;
            }

            // find first element greater than item
            let idx = currentDoubles.findIndex(x => x > item);
            if (idx === -1) {
                // no greater element, append to the end
                currentDoubles.push(item);
            } else {
                // insert before the first greater element
                currentDoubles.splice(idx, 0, item);
            }
        });

        lastConflictDoubles = conflicts.slice();

        if (conflicts.length) showWarningDoubles('I seguenti numeri sono ancora nella lista dei mancanti e non possono essere aggiunti come doppie: ' + conflicts.join(', '));
        else showWarningDoubles('');

        renderOutput();
    };

    // clear warning helpers exposed to the page
    window.clearWarningMissing = function() {
        lastInvalidRemovals = [];
        showWarningMissing('');
        renderOutput();
    };

    window.clearWarningDoubles = function() {
        lastConflictDoubles = [];
        showWarningDoubles('');
        renderOutput();
    };

    window.removeDoubles = function() {
        const input = document.getElementById('removeDoublesInput')?.value.trim() || '';
        if (!input) return;

        const items = input.split(/[,;\s]+/).map(x => parseInt(x)).filter(n => !isNaN(n));
        const notFound = [];

        // Remove each item (only first occurrence)
        items.forEach(n => {
            const idx = currentDoubles.indexOf(n);
            if (idx !== -1) {
                currentDoubles.splice(idx, 1);
            } else {
                notFound.push(n);
            }
        });

        if (notFound.length) showWarningRemoveDoubles('I seguenti numeri non erano presenti nella lista delle doppie: ' + notFound.join(', '));
        else showWarningRemoveDoubles('');

        renderOutput();
    };

    window.clearWarningRemoveDoubles = function() {
        showWarningRemoveDoubles('');
        renderOutput();
    };

    // If the page has a textarea that is editable by the user, update the timestamp when it changes
    document.addEventListener('input', function (e) {
        if (e.target && e.target.id === 'listOutput') {
            // When the user edits the textarea manually, parse the content to update state and update the 'Ultima modifica' line
            const val = e.target.value;
            const parts = val.split(/Ultima modifica:/i);
            const content = parts[0].trim();

            // parse sections from the edited content to keep internal state roughly in sync
            const parsed = parseSections(content + '\n\nUltima modifica:');
            currentMissing = parsed.missing.slice();
            currentDoubles = parsed.doubles.slice();

            // clear conflict markers when the user edits manually
            lastConflictDoubles = [];
            lastInvalidRemovals = [];
            showWarningMissing('');
            showWarningDoubles('');

            const now = new Date().toLocaleString('it-IT');
            e.target.value = content + '\n\nUltima modifica: ' + now;

            // update preview
            renderOutput();
        }
    });
})();

// Attach Enter key handler for cardCount if present
document.addEventListener('DOMContentLoaded', function () {
    const cardCountEl = document.getElementById('cardCount');
    if (cardCountEl) {
        cardCountEl.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') generateList();
        });
    }
});

// Compara-lista functionality
(function () {
    function parseSections(text) {
        const missingMatch = text.match(/Carte mancanti:\s*([\s\S]*?)\s*Carte doppie:/i);
        const doublesMatch = text.match(/Carte doppie:\s*([\s\S]*?)\s*(?:Ultima modifica:|$)/i);

        const missingStr = missingMatch ? missingMatch[1].trim() : '';
        const doublesStr = doublesMatch ? doublesMatch[1].trim() : '';

        const parseNumList = (s) => {
            if (!s) return [];
            return s.split(/--|,|;|\s+/).map(x => x.trim()).filter(x => x !== '').map(x => parseInt(x)).filter(n => !isNaN(n));
        };

        return {
            missing: parseNumList(missingStr),
            doubles: parseNumList(doublesStr)
        };
    }

    window.compareListsUpdate = function() {
        const textA = document.getElementById('pasteListA')?.value || '';
        const textB = document.getElementById('pasteListB')?.value || '';

        if (!textA.trim() || !textB.trim()) {
            alert('Incolla entrambe le liste per fare il confronto.');
            return;
        }

        const parsedA = parseSections(textA);
        const parsedB = parseSections(textB);

        const doublesA = parsedA.doubles;
        const doublesB = parsedB.doubles;

        // Use Sets to find unique cards, then check presence
        const uniqueCardsA = new Set(doublesA);
        const uniqueCardsB = new Set(doublesB);

        // Find unique cards from A that are NOT in B
        const inAnotB = [];
        uniqueCardsA.forEach(card => {
            if (!uniqueCardsB.has(card)) {
                inAnotB.push(card);
            }
        });
        inAnotB.sort((a, b) => a - b); // sort for consistent output

        // Find unique cards from B that are NOT in A
        const inBnotA = [];
        uniqueCardsB.forEach(card => {
            if (!uniqueCardsA.has(card)) {
                inBnotA.push(card);
            }
        });
        inBnotA.sort((a, b) => a - b); // sort for consistent output

        // Format output
        const inAnotBStr = inAnotB.length ? inAnotB.join(' -- ') : '(nessuna)';
        const inBnotAStr = inBnotA.length ? inBnotA.join(' -- ') : '(nessuna)';

        const output = `Doppie in A ma non in B:\n${inAnotBStr}\n\nDoppie in B ma non in A:\n${inBnotAStr}`;

        const outEl = document.getElementById('comparisonOutput');
        if (outEl) {
            outEl.value = output;
        }

        const outputSection = document.getElementById('output');
        if (outputSection) outputSection.style.display = 'block';
    };

    window.copyComparisonToClipboard = function() {
        const textarea = document.getElementById('comparisonOutput');
        if (!textarea) return;
        textarea.select();
        try {
            document.execCommand('copy');
            alert('Confronto copiato negli appunti!');
        } catch (e) {
            alert('Impossibile copiare automaticamente. Seleziona e copia manualmente.');
        }
    };
})();
