(() => {
    function initDesign() {
        const page = location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('[data-page-link]').forEach(link => {
            link.toggleAttribute('data-current-page', link.dataset.pageLink === page);
            if (link.dataset.pageLink === page) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });

        const localLinks = [...document.querySelectorAll('.page-section-nav a')];
        const sections = localLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
        if ('IntersectionObserver' in window && sections.length) {
            const sectionObserver = new IntersectionObserver(entries => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    localLinks.forEach(link => {
                        if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
                        else link.removeAttribute('aria-current');
                    });
                }
            }, { rootMargin: '-15% 0px -60% 0px', threshold: 0 });
            sections.forEach(section => sectionObserver.observe(section));
        }

        const reduced = matchMedia('(prefers-reduced-motion: reduce)');
        document.querySelectorAll('.filter-tab-btn').forEach(button => {
            button.setAttribute('aria-pressed', String(button.classList.contains('active')));
        });
        if ('IntersectionObserver' in window) {
            const artObserver = new IntersectionObserver(entries => entries.forEach(entry => {
                entry.target.toggleAttribute('data-offscreen', !entry.isIntersecting);
            }));
            document.querySelectorAll('.service-art').forEach(art => artObserver.observe(art));
        }
        if (!('IntersectionObserver' in window) || reduced.matches) return;
        const selector = 'main > section:not(.driving-hero):not(.service-hero):not(#services-grid), .hub-directory-card, [data-reveal]';
        const observed = new WeakSet();
        const revealObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.remove('reveal-pending');
                entry.target.classList.add('reveal-visible');
                revealObserver.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -32px 0px', threshold: 0 });

        function enhance(root) {
            const elements = root.matches?.(selector) ? [root] : [];
            elements.push(...root.querySelectorAll(selector));
            elements.forEach(element => {
                if (observed.has(element)) return;
                observed.add(element);
                element.setAttribute('data-reveal', '');
                if (element.classList.contains('hub-directory-card')) {
                    const index = [...element.parentElement.children].indexOf(element);
                    element.style.setProperty('--reveal-delay', `${Math.min(index, 3) * 65}ms`);
                }
                // Above-the-fold content is immediately readable.
                if (element.getBoundingClientRect().top < innerHeight - 32) return;
                element.classList.add('reveal-pending');
                revealObserver.observe(element);
            });
        }
        enhance(document);
        // New sections receive the same treatment when added later.
        const additions = new MutationObserver(records => {
            records.forEach(record => record.addedNodes.forEach(node => {
                if (node.nodeType === 1) enhance(node);
            }));
        });
        additions.observe(document.querySelector('main'), { childList: true, subtree: true });
        reduced.addEventListener('change', event => {
            if (!event.matches) return;
            revealObserver.disconnect();
            additions.disconnect();
            document.querySelectorAll('.reveal-pending').forEach(el => el.classList.remove('reveal-pending'));
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDesign);
    else initDesign();
})();
