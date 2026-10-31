(() => {
    function initMobileNav() {
        const header = document.querySelector('.site-header');
        const button = document.getElementById('mobile-menu-toggle');
        const menu = document.getElementById('mobile-navigation');
        const close = menu?.querySelector('.mobile-drawer-close');
        if (!header || !button || !menu || !close) return;
        if (button.dataset.navBound === 'true') return;
        button.dataset.navBound = 'true';

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const background = [header.querySelector('.site-header-shell'), document.querySelector('main'),
            document.querySelector('footer'), document.querySelector('.mobile-action-bar')].filter(Boolean);
        let backgroundState = [];
        let previousOverflow = '';
        let closeTimer = 0;
        let isOpen = false;

        function lockBackground() {
            previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            backgroundState = background.map(element => [element, element.inert]);
            background.forEach(element => { element.inert = true; });
        }

        function finishClose(restoreFocus) {
            menu.hidden = true;
            delete header.dataset.menuOpen;
            backgroundState.forEach(([element, wasInert]) => { element.inert = wasInert; });
            backgroundState = [];
            document.body.style.overflow = previousOverflow;
            if (restoreFocus && button.getClientRects().length) button.focus();
        }

        function setOpen(open, restoreFocus = false, immediate = false) {
            clearTimeout(closeTimer);
            isOpen = open;
            button.setAttribute('aria-expanded', String(open));
            button.querySelector('[data-menu-open-icon]')?.toggleAttribute('hidden', open);
            button.querySelector('[data-menu-close-icon]')?.toggleAttribute('hidden', !open);
            if (open) {
                if (menu.hidden) lockBackground();
                menu.hidden = false;
                menu.dataset.state = 'open';
                header.dataset.menuOpen = 'true';
                close.focus();
            } else if (!menu.hidden) {
                menu.dataset.state = 'closing';
                if (immediate || reducedMotion.matches) finishClose(restoreFocus);
                else closeTimer = window.setTimeout(() => finishClose(restoreFocus), 240);
            }
        }

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(!isOpen);
        });

        close.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false, true);
        });

        menu.querySelector('[data-menu-dismiss]')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false, true);
        });

        // Mobile drawer dropdown accordion toggles
        menu.querySelectorAll('.mobile-nav-dropdown-btn').forEach(btn => {
            btn.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                const parent = btn.closest('.mobile-nav-dropdown');
                if (!parent) return;
                const expanded = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', String(!expanded));
                parent.classList.toggle('is-open', !expanded);
            });
        });

        menu.addEventListener('click', event => {
            if (event.target.closest('a')) setOpen(false, false, true);
        });

        document.addEventListener('keydown', event => {
            if (menu.hidden) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                setOpen(false, true);
            }
            if (event.key === 'Tab') {
                const controls = [...menu.querySelectorAll('a[href], button')].filter(element => !element.disabled && element.getClientRects().length);
                const first = controls[0];
                const last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });

        window.matchMedia('(min-width: 1024px)').addEventListener('change', event => {
            if (event.matches) setOpen(false, false, true);
        });

        function updateCurrentSection() {
            const section = location.hash || '#home';
            header.querySelectorAll('nav a:not([data-page-link])').forEach(link => {
                if (link.getAttribute('href') === section) link.setAttribute('aria-current', 'location');
                else link.removeAttribute('aria-current');
            });
        }
        window.addEventListener('hashchange', updateCurrentSection);
        updateCurrentSection();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileNav);
    } else {
        initMobileNav();
    }
})();

// Short, consistent in-page scrolling for desktop and phones.
(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let scrolling = false;

    function stopScroll() {
        if (!scrolling) return;
        cancelAnimationFrame(frame);
        scrolling = false;
    }

    function headerOffset() {
        return window.innerWidth < 768 ? 88 : 112;
    }

    function moveTo(target) {
        stopScroll();
        const start = window.scrollY;
        const destination = Math.max(0, Math.min(
            document.documentElement.scrollHeight - window.innerHeight,
            target.getBoundingClientRect().top + start - headerOffset()
        ));
        const distance = destination - start;
        if (reducedMotion.matches || Math.abs(distance) < 6) {
            window.scrollTo(0, destination);
            return;
        }
        const duration = Math.min(480, Math.max(260, 260 + Math.abs(distance) * .055));
        const begun = performance.now();
        scrolling = true;
        const tick = now => {
            const progress = Math.min(1, (now - begun) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            window.scrollTo(0, start + distance * eased);
            if (progress < 1) frame = requestAnimationFrame(tick);
            else {
                scrolling = false;
                // Reveal effects may shift a section slightly while the scroll runs.
                window.scrollBy(0, target.getBoundingClientRect().top - headerOffset());
            }
        };
        frame = requestAnimationFrame(tick);
    }

    document.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a[href]');
        if (!link || link.target || link.hasAttribute('download')) return;
        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
        const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (!target) return;
        event.preventDefault();
        if (location.hash !== url.hash) {
            history.pushState(null, '', url.hash);
            window.dispatchEvent(new Event('hashchange'));
        }
        moveTo(target);
    });

    window.addEventListener('wheel', stopScroll, { passive: true });
    window.addEventListener('touchstart', stopScroll, { passive: true });
    window.addEventListener('keydown', event => {
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stopScroll();
    });
    window.addEventListener('popstate', stopScroll);
})();

// Desktop Nav Dropdown Controller (Hover, Keyboard & Touch Chevron support)
(() => {
    const desktopDropdowns = document.querySelectorAll('.site-nav-dropdown');
    if (!desktopDropdowns.length) return;

    desktopDropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('a');
        const chevron = dropdown.querySelector('.desktop-dropdown-chevron');
        let hoverTimeout;

        const show = () => {
            clearTimeout(hoverTimeout);
            desktopDropdowns.forEach(other => {
                if (other !== dropdown) {
                    other.classList.remove('is-open');
                    const otherLink = other.querySelector('a');
                    if (otherLink) otherLink.setAttribute('aria-expanded', 'false');
                }
            });
            dropdown.classList.add('is-open');
            if (link) link.setAttribute('aria-expanded', 'true');
        };

        const hide = () => {
            hoverTimeout = setTimeout(() => {
                dropdown.classList.remove('is-open');
                if (link) link.setAttribute('aria-expanded', 'false');
            }, 120);
        };

        dropdown.addEventListener('mouseenter', show);
        dropdown.addEventListener('mouseleave', hide);
        dropdown.addEventListener('focusin', show);
        dropdown.addEventListener('focusout', (e) => {
            if (!dropdown.contains(e.relatedTarget)) {
                dropdown.classList.remove('is-open');
                if (link) link.setAttribute('aria-expanded', 'false');
            }
        });

        // Click on chevron toggles dropdown without navigating
        if (chevron) {
            chevron.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isOpen = dropdown.classList.contains('is-open');
                if (isOpen) {
                    dropdown.classList.remove('is-open');
                    if (link) link.setAttribute('aria-expanded', 'false');
                } else {
                    show();
                }
            });
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.site-nav-dropdown')) {
            desktopDropdowns.forEach(dropdown => {
                dropdown.classList.remove('is-open');
                const link = dropdown.querySelector('a');
                if (link) link.setAttribute('aria-expanded', 'false');
            });
        }
    });
})();

// =====================================================================
// 4-IN-1 MULTI-SERVICE HUB INTERACTIVE CONTROLLERS
// =====================================================================

// 1. 4-Pillar Quick Switcher Bar Tabs
(() => {
    const switcher = document.getElementById('hub-pillars-bar');
    if (!switcher) return;
    const tabs = [...switcher.querySelectorAll('.hub-pillar-tab')];
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    // Update active tab based on scroll position of the 4 pillars
    const pillarIds = ['pillar-driving', 'pillar-auto', 'pillar-print', 'pillar-esevai'];
    const sections = pillarIds.map(id => document.getElementById(id)).filter(Boolean);
    
    if ('IntersectionObserver' in window && sections.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    tabs.forEach(tab => {
                        const href = tab.getAttribute('href');
                        tab.classList.toggle('active', href === `#${id}`);
                    });
                }
            });
        }, { rootMargin: '-20% 0px -60% 0px', threshold: 0.1 });

        sections.forEach(sec => observer.observe(sec));
    }
})();

// 2. Interactive Print Calculator ("WhatsApp Print Express")
(() => {
    const pageInput = document.getElementById('print-page-count');
    const liveTotal = document.getElementById('print-live-total');
    const waBtn = document.getElementById('print-whatsapp-btn');
    if (!pageInput || !liveTotal || !waBtn) return;

    let selectedType = 'bw_laser';
    let selectedBinding = 'none';

    const typeRates = {
        'bw_xerox_bulk': 0.40,
        'bw_xerox_walkin': 2.00,
        'bw_laser': 1.00,
        'bond_paper': 2.00,
        'color_print': 10.00
    };

    const typeNames = {
        'bw_xerox_bulk': 'A4 B&W Xerox (Bulk 50+)',
        'bw_xerox_walkin': 'A4 B&W Xerox (Walk-in)',
        'bw_laser': 'B&W Laser Print (₹1/pg)',
        'bond_paper': '100 GSM Bond Paper Print (₹2/pg)',
        'color_print': 'Glossy Color Print (₹10/pg)'
    };

    const bindRates = {
        'none': 0,
        'spiral': 25,
        'soft': 50,
        'hard': 100
    };

    const bindNames = {
        'none': 'No Binding (Loose Sheets)',
        'spiral': 'Spiral Binding (₹25)',
        'soft': 'Soft Card Binding (₹50)',
        'hard': 'Hard Thesis Golden Embossed (₹100)'
    };

    function calculateTotal() {
        let pages = parseInt(pageInput.value, 10);
        if (isNaN(pages) || pages < 1) pages = 1;

        let rate = typeRates[selectedType] || 1.00;
        // Bulk discount check
        if (selectedType === 'bw_xerox_bulk' && pages < 50) {
            rate = 2.00; // Walk-in price if under 50
        }

        const printCost = Math.round(pages * rate * 100) / 100;
        const bindCost = bindRates[selectedBinding] || 0;
        const total = Math.ceil(printCost + bindCost);

        liveTotal.textContent = `₹${total}`;

        const msg = encodeURIComponent(
            `Hello Ashok Student Xerox Hub (Perambakkam Bus Stop)!\n` +
            `I want to print my document:\n` +
            `• Page Count: ${pages} Pages\n` +
            `• Print Type: ${typeNames[selectedType]}\n` +
            `• Binding: ${bindNames[selectedBinding]}\n` +
            `• Estimated Total: ₹${total}\n\n` +
            `Attaching PDF file now. Please keep prints ready for pickup at Perambakkam Bus Stop!`
        );

        waBtn.href = `https://wa.me/919443200000?text=${msg}`;
    }

    pageInput.addEventListener('input', calculateTotal);

    document.querySelectorAll('.print-type-btn').forEach(btn => {
        btn.setAttribute('aria-pressed', String(btn.classList.contains('is-active')));
        btn.addEventListener('click', () => {
            document.querySelectorAll('.print-type-btn').forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
            btn.classList.add('is-active');
            btn.setAttribute('aria-pressed', 'true');
            selectedType = btn.dataset.type;
            calculateTotal();
        });
    });

    document.querySelectorAll('.print-bind-btn').forEach(btn => {
        btn.setAttribute('aria-pressed', String(btn.classList.contains('is-active')));
        btn.addEventListener('click', () => {
            document.querySelectorAll('.print-bind-btn').forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
            btn.classList.add('is-active');
            btn.setAttribute('aria-pressed', 'true');
            selectedBinding = btn.dataset.bind;
            calculateTotal();
        });
    });

    calculateTotal();
})();

// 3. Aadhaar & e-Sevai Interactive Document Checklist
(() => {
    const docSelect = document.getElementById('esevai-doc-select');
    const docContainer = document.getElementById('esevai-doc-checklist');
    const docWaBtn = document.getElementById('esevai-doc-wa-btn');
    if (!docSelect || !docContainer) return;

    const documentMap = {
        'community': {
            title: 'Community / Nativity Certificate (TNeGA ₹60)',
            fee: 'Govt Statutory Fee: ₹60',
            docs: [
                'Applicant Original Aadhaar Card',
                'Father / Mother / Sibling Community Certificate copy',
                'School Transfer Certificate (TC) or 10th / 12th Marksheet',
                'Smart Family Ration Card or Gas Bill for local address proof',
                '1 Recent Passport Size Photo'
            ]
        },
        'income': {
            title: 'Income Certificate (TNeGA ₹60)',
            fee: 'Govt Statutory Fee: ₹60',
            docs: [
                'Applicant Aadhaar Card',
                'Smart Family Ration Card',
                'Recent Salary Slip / Form 16 / Bank Statement (or Self-Declaration for daily wage / farming)',
                '1 Passport Size Photograph'
            ]
        },
        'first_graduate': {
            title: 'First Graduate Certificate (TNeGA ₹60)',
            fee: 'Govt Statutory Fee: ₹60',
            docs: [
                'Applicant 12th Mark Sheet & College Allotment Order',
                'Parents & Grandparents Non-Graduate Joint Declaration (format provided at our desk)',
                'Siblings School / College TC or ID',
                'Smart Ration Card & Aadhaar Card'
            ]
        },
        'aadhaar_mobile': {
            title: 'Aadhaar Mobile Link / Demographic Update (UIDAI ₹75)',
            fee: 'UIDAI Official Fee: ₹75',
            docs: [
                'Original Aadhaar Card (no photocopies needed!)',
                'Working mobile phone with SIM card to receive instant OTP verification',
                'No additional proof needed for mobile number or email linkage'
            ]
        },
        'pan_card': {
            title: 'New PAN Card / Correction (NSDL / UTI ₹107)',
            fee: 'Official Fee: ₹107',
            docs: [
                'Aadhaar Card with full Date of Birth',
                '2 Passport Size Color Photos with white background',
                'Mobile number linked to Aadhaar (for instant digital e-PAN in 2 hours!)'
            ]
        },
        'patta_transfer': {
            title: 'Online Patta Transfer & Chitta Extract (₹60)',
            fee: 'Govt Fee: ₹60',
            docs: [
                'Registered Sale Deed / Settlement Deed copy',
                'Parent Document & Previous Patta / Chitta copy',
                'Encumbrance Certificate (EC) from Sub-Registrar Office',
                'Aadhaar Card & Phone Number of Buyer'
            ]
        },
        'smart_ration': {
            title: 'New Smart Ration Card / Member Add (TN PDS ₹30–₹60)',
            fee: 'TN PDS Service Fee: ₹30 – ₹60',
            docs: [
                'Aadhaar cards of all family members',
                'Gas Consumer Book / Cylinder connection slip',
                'Rental Agreement or EB Card for Perambakkam address proof',
                'Name removal certificate / surrender certificate (if transferring from parents card)'
            ]
        }
    };

    function renderChecklist(key) {
        const item = documentMap[key] || documentMap['community'];
        let html = `
            <div class="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <span class="font-bold text-xs text-navy">${item.title}</span>
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">${item.fee}</span>
            </div>
            <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Original Proofs to Bring:</p>
            <ul class="space-y-1.5 text-xs text-slate-700">
        `;

        item.docs.forEach(doc => {
            html += `
                <li class="flex items-start gap-2">
                    <span class="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">✓</span>
                    <span class="font-medium">${doc}</span>
                </li>
            `;
        });

        html += `</ul>`;
        docContainer.innerHTML = html;

        if (docWaBtn) {
            const msg = encodeURIComponent(`Hi Ashok e-Sevai Desk (RTE Complex Perambakkam)! I want to apply for: ${item.title}. Please verify my slot and timings.`);
            docWaBtn.href = `https://wa.me/919443200000?text=${msg}`;
        }
    }

    docSelect.addEventListener('change', (e) => {
        renderChecklist(e.target.value);
    });

    renderChecklist(docSelect.value || 'community');
})();

