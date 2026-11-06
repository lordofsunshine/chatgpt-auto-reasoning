// ==UserScript==
// @name         ChatGPT Auto Reasoning
// @namespace    https://greasyfork.org/ru/scripts/604103-chatgpt-auto-reasoning
// @version      1.0.0
// @description  Automatically turns on Reasoning for every new message in any ChatGPT chat. Tested on ChatGPT GO.
// @author       lordofsunshine
// @homepageURL  https://github.com/lordofsunshine/chatgpt-auto-reasoning
// @supportURL   https://github.com/lordofsunshine/chatgpt-auto-reasoning/issues
// @downloadURL  https://update.greasyfork.org/scripts/604103/ChatGPT%20Auto%20Reasoning.user.js
// @updateURL    https://update.greasyfork.org/scripts/604103/ChatGPT%20Auto%20Reasoning.meta.js
// @license      MIT
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const LOG = '[AutoReasoning]';
    const TICK_MS = 1200;
    const OBSERVER_DELAY_MS = 70;
    const CLICK_VERIFY_MS = 200;
    const MENU_WAIT_MS = 1600;
    const SEND_AFTER_TOGGLE_MS = 180;

    // Toggle labels in different locales.
    const REASONING_WORDS = [
        'размышление', 'рассуждение',
        'reasoning', 'thinking',
        'raisonnement', 'reflexion',
        'denken', 'schlussfolgern', 'uberlegung',
        'razonamiento', 'pensamiento',
        'ragionamento', 'pensiero',
        'raciocinio', 'pensamento',
        'redeneren', 'denken',
        'resonemang', 'tankande',
        'rozumowanie', 'myslenie',
        'mirkuvannya', 'rozdumi',
        'dusunme', 'akil yurutme',
        '思考', '推論', '推理',
        '추론', '사고',
        'تفكير', 'استدلال'
    ];

    // Localized "selected" labels in the + menu.
    const SELECTED_WORDS = [
        'выбрано', 'вибрано',
        'selected',
        'ausgewahlt',
        'selectionne',
        'seleccionado',
        'selezionato',
        'selecionado',
        'geselecteerd',
        'secildi',
        'wybrano',
        '已选择', '選択済み', '선택됨', 'تم التحديد'
    ];

    let observerTimer = null;
    let ensureTimer = null;
    let isEnsuring = false;
    let menuBusy = false;
    let menuFallbackNextAt = 0;
    let lastUrl = location.href;
    let lastLogState = null;

    // Helpers
    function norm(value) {
        return String(value == null ? '' : value)
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{M}/gu, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    const NORM_WORDS = REASONING_WORDS.map(norm);
    const NORM_SELECTED = SELECTED_WORDS.map(norm);

    function isVisible(el) {
        if (!el || !el.isConnected) return false;
        if (!(el.getBoundingClientRect().width || el.getBoundingClientRect().height)) return false;
        const style = getComputedStyle(el);
        return style.visibility !== 'hidden' && style.display !== 'none';
    }

    function isReasoningText(text) {
        const t = norm(text);
        if (!t) return false;
        return NORM_WORDS.some((word) => t === word || t.includes(word));
    }

    function isSelectedText(text) {
        const t = norm(text);
        if (!t) return false;
        return NORM_SELECTED.some((word) => t === word || t.includes(word));
    }

    function debug(...args) {
        try {
            console.debug(LOG, ...args);
        } catch (_) { /* ignore */ }
    }

    function logState(message) {
        if (lastLogState === message) return;
        lastLogState = message;
        debug(message);
    }

    // DOM lookup
    function findAddButton() {
        const exact = document.querySelector(
            '[data-composer-navigation-target="add-context"]'
        );
        if (exact && isVisible(exact)) return exact;

        return Array.from(document.querySelectorAll('button')).find((button) => {
            if (!isVisible(button)) return false;
            const label = norm(button.getAttribute('aria-label') || '');
            return (
                label.includes('добавить файлы') ||
                label.includes('добавить фото') ||
                label.includes('add files') ||
                label.includes('add photos') ||
                label.includes('attachments')
            );
        }) || null;
    }

    function getVisibleComposers() {
        return Array.from(document.querySelectorAll('[data-composer-body]')).filter(isVisible);
    }

    function hasComposer() {
        return getVisibleComposers().length > 0;
    }

    function getToggleState(element) {
        if (!element) return null;

        const pressed = element.getAttribute('aria-pressed');
        if (pressed === 'true' || pressed === 'false') return pressed;

        const checked = element.getAttribute('aria-checked');
        if (checked === 'true' || checked === 'false') return checked;

        const state = element.getAttribute('data-state');
        if (state === 'on' || state === 'checked' || state === 'open') return 'true';
        if (state === 'off' || state === 'unchecked' || state === 'closed') return 'false';

        return null;
    }

    function findReasoningPill() {
        // Only look inside the composer so we don't hit settings or old messages.
        const composers = getVisibleComposers();
        if (!composers.length) return null;

        for (const scope of composers) {
            const buttons = Array.from(scope.querySelectorAll(
                'button[aria-pressed], button[role="switch"][aria-checked], [role="switch"][aria-checked]'
            ));
            for (const button of buttons) {
                if (!isVisible(button)) continue;
                if (getToggleState(button) === null) continue;

                const iconHrefs = Array.from(button.querySelectorAll('use'))
                    .map((use) => use.getAttribute('href') || use.getAttribute('xlink:href') || '')
                    .join(' ');
                const text = button.innerText || button.textContent || '';
                const aria = button.getAttribute('aria-label') || '';

                if (/brain/i.test(iconHrefs) || isReasoningText(text) || isReasoningText(aria)) {
                    return button;
                }
            }
        }

        return null;
    }

    function isAddMenuOpen() {
        const addButton = findAddButton();
        if (addButton && addButton.getAttribute('aria-expanded') === 'true') return true;

        return !!Array.from(document.querySelectorAll('[data-mention-list-scroll-area]'))
            .find(isVisible);
    }

    function findReasoningMenuItem() {
        const menus = Array.from(document.querySelectorAll('[data-mention-list-scroll-area]'))
            .filter(isVisible);
        const scope = menus.length ? menus[menus.length - 1] : document;

        const items = Array.from(scope.querySelectorAll('button[data-list-navigation-item="true"]'));
        for (const item of items) {
            const firstLine = (item.innerText || '').split('\n')[0];
            if (!isVisible(item)) continue;

            const iconHrefs = Array.from(item.querySelectorAll('use'))
                .map((use) => use.getAttribute('href') || use.getAttribute('xlink:href') || '')
                .join(' ');

            if (isReasoningText(firstLine) || /brain/i.test(iconHrefs)) {
                return item;
            }
        }
        return null;
    }

    function isMenuItemSelected(item) {
        if (!item) return false;

        if (item.getAttribute('aria-selected') === 'true') return true;
        if (item.getAttribute('aria-pressed') === 'true') return true;

        const control = item.matches('[aria-checked], [role="switch"], input[type="checkbox"]')
            ? item
            : item.querySelector('[aria-checked], [role="switch"], input[type="checkbox"]');

        if (control) {
            if (control.getAttribute('aria-checked') === 'true') return true;
            if (control.getAttribute('data-state') === 'checked' || control.getAttribute('data-state') === 'on') return true;
            if (control instanceof HTMLInputElement && control.checked) return true;
        }

        const lines = (item.innerText || '').split('\n').slice(1);
        return lines.some(isSelectedText);
    }

    function findSendButton() {
        const scopes = getVisibleComposers();
        if (!scopes.length) return null;

        for (const scope of scopes) {
            const direct = scope.querySelector(
                '[data-testid="send-button"], button[data-composer-send], button[type="submit"]'
            );
            if (direct && isVisible(direct) && !direct.disabled) return direct;

            const byLabel = Array.from(scope.querySelectorAll('button')).find((button) => {
                if (!isVisible(button) || button.disabled) return false;
                const label = norm(button.getAttribute('aria-label') || '');
                return (
                    label === 'отправить' ||
                    label === 'send' ||
                    label === 'senden' ||
                    label === 'envoyer' ||
                    label === 'enviar' ||
                    label === 'invia'
                );
            });
            if (byLabel) return byLabel;
        }

        return null;
    }

    // Toggle it on
    function clickElement(element) {
        try {
            element.click();
            return true;
        } catch (error) {
            debug('click failed', error);
            return false;
        }
    }

    function ensureReasoning(source) {
        if (isEnsuring || menuBusy) return false;
        if (document.visibilityState === 'hidden') return false;
        if (!hasComposer()) return false;

        const pill = findReasoningPill();
        if (!pill) {
            // No pill? Try the + menu, but don't spam it on unsupported models.
            if (!isAddMenuOpen() && Date.now() >= menuFallbackNextAt) {
                scheduleMenuFallback(source);
            }
            return false;
        }

        if (getToggleState(pill) === 'true') {
            logState(`Reasoning is already on (${source})`);
            return true;
        }

        // Don't fight the user while the + menu is open.
        if (isAddMenuOpen()) return false;

        isEnsuring = true;
        clickElement(pill);
        logState(`Turning reasoning on (${source})`);

        setTimeout(() => {
            const current = findReasoningPill();
            const ok = !current || getToggleState(current) === 'true';
            isEnsuring = false;

            if (!ok) {
                debug('Pill did not toggle, trying the menu');
                menuFallbackNextAt = Date.now() + 30000;
                scheduleMenuFallback(source);
            }
        }, CLICK_VERIFY_MS);

        return true;
    }

    function scheduleMenuFallback(source) {
        if (ensureTimer || menuBusy) return;
        ensureTimer = setTimeout(() => {
            ensureTimer = null;
            ensureReasoningViaMenu(source);
        }, 300);
    }

    function waitFor(predicate, timeoutMs) {
        return new Promise((resolve) => {
            const started = Date.now();
            const timer = setInterval(() => {
                const value = predicate();
                if (value || Date.now() - started >= timeoutMs) {
                    clearInterval(timer);
                    resolve(value || null);
                }
            }, 50);
        });
    }

    async function ensureReasoningViaMenu(source) {
        if (menuBusy || !hasComposer()) return false;

        const addButton = findAddButton();
        if (!addButton) return false;

        menuFallbackNextAt = Date.now() + 30000;
        menuBusy = true;
        try {
            const wasOpen = isAddMenuOpen();
            if (!wasOpen) {
                clickElement(addButton);
            }

            const item = await waitFor(findReasoningMenuItem, MENU_WAIT_MS);
            if (!item) {
                // Probably an unsupported model. Back off for a while.
                menuFallbackNextAt = Date.now() + 120000;
                if (!wasOpen) closeMenu(addButton);
                return false;
            }

            if (isMenuItemSelected(item)) {
                logState(`Reasoning is already selected in the menu (${source})`);
                if (!wasOpen) closeMenu(addButton);
                return true;
            }

            // Sometimes the switch is a separate element inside the row.
            const control = item.matches('[aria-checked], [role="switch"], input[type="checkbox"]')
                ? item
                : item.querySelector('[aria-checked], [role="switch"], input[type="checkbox"]');

            clickElement(control || item);
            logState(`Turning reasoning on via the menu (${source})`);

            setTimeout(() => {
                if (isAddMenuOpen()) closeMenu(findAddButton());
            }, 150);

            return true;
        } finally {
            menuBusy = false;
        }
    }

    function closeMenu(addButton) {
        const button = addButton || findAddButton();
        if (button && button.getAttribute('aria-expanded') === 'true') {
            clickElement(button);
            return;
        }

        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            bubbles: true,
            cancelable: true
        }));
    }

    // If the user hits Enter while reasoning is off, turn it on first.
    function isInsideComposer(target) {
        if (!(target instanceof Element)) return false;
        return !!target.closest('[data-composer-body]') ||
            !!target.closest('[contenteditable="true"][role="textbox"]');
    }

    function sendMessageAfterToggle() {
        const sendButton = findSendButton();
        if (sendButton) {
            clickElement(sendButton);
            return;
        }

        // No send button? Replay Enter after React has updated.
        const editor = document.querySelector('[data-composer-body] [contenteditable="true"][role="textbox"]');
        if (editor) {
            editor.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            }));
        }
    }

    function onKeyDown(event) {
        if (event.key !== 'Enter' || event.isComposing) return;
        if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
        if (!isInsideComposer(event.target)) return;

        const pill = findReasoningPill();
        if (!pill || getToggleState(pill) === 'true') return;

        // Block the send, flip reasoning on, then send.
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        ensureReasoning('Enter');

        setTimeout(() => {
            const current = findReasoningPill();
            if (!current || getToggleState(current) === 'true') {
                sendMessageAfterToggle();
            } else {
                ensureReasoningViaMenu('Enter fallback').then((ok) => {
                    if (ok) sendMessageAfterToggle();
                });
            }
        }, SEND_AFTER_TOGGLE_MS);
    }

    // Page watching
    function scheduleEnsure(source, delay) {
        if (observerTimer) clearTimeout(observerTimer);
        observerTimer = setTimeout(() => {
            observerTimer = null;
            ensureReasoning(source);
        }, delay == null ? OBSERVER_DELAY_MS : delay);
    }

    function onUrlMaybeChanged() {
        if (location.href === lastUrl) return;
        lastUrl = location.href;
        lastLogState = null;
        menuFallbackNextAt = 0;
        debug('New chat:', location.href);
        scheduleEnsure('navigation', 350);
    }

    function start() {
        // Cheap watchdog: also fixes resets after sending or switching chats.
        setInterval(() => ensureReasoning('watchdog'), TICK_MS);

        const observer = new MutationObserver(() => {
            onUrlMaybeChanged();
            scheduleEnsure('DOM');
        });

        observer.observe(document.documentElement, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['aria-pressed', 'aria-expanded', 'data-state']
        });

        document.addEventListener('keydown', onKeyDown, true);

        // ChatGPT is an SPA, so patch history.
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function () {
            const result = originalPushState.apply(this, arguments);
            window.dispatchEvent(new Event('auto-reasoning:location'));
            return result;
        };
        history.replaceState = function () {
            const result = originalReplaceState.apply(this, arguments);
            window.dispatchEvent(new Event('auto-reasoning:location'));
            return result;
        };

        window.addEventListener('popstate', onUrlMaybeChanged);
        window.addEventListener('auto-reasoning:location', onUrlMaybeChanged);

        scheduleEnsure('startup', 250);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }

    // Console helpers: __autoReasoning.now() / __autoReasoning.isOn()
    window.__autoReasoning = {
        now: () => ensureReasoning('manual'),
        isOn: () => {
            const pill = findReasoningPill();
            return !!pill && getToggleState(pill) === 'true';
        }
    };
})();
