(() => {
    function initPhotoScenes() {
        const reduced = matchMedia('(prefers-reduced-motion: reduce)');
        const photos = [...document.querySelectorAll('.motion-photo')];
        const visible = new Set();
        let paused = false;
        let frame = 0;

        function updatePhotos() {
            frame = 0;
            if (paused || reduced.matches || document.hidden) return;
            visible.forEach(photo => {
                const rect = photo.getBoundingClientRect();
                const progress = ((rect.top + rect.height / 2) - innerHeight / 2) / innerHeight;
                photo.style.setProperty('--photo-shift', `${Math.max(-10, Math.min(10, progress * -14)).toFixed(2)}px`);
            });
        }
        function queueUpdate() { if (!frame) frame = requestAnimationFrame(updatePhotos); }
        function setPaused(value) {
            paused = value;
            document.body.classList.toggle('scene-paused', paused);
            document.querySelectorAll('.photo-motion-toggle').forEach(button => {
                button.setAttribute('aria-pressed', String(paused));
                button.setAttribute('aria-label', paused ? 'Play photo animations' : 'Pause photo animations');
                button.querySelector('[data-motion-label]').textContent = paused ? 'Play motion' : 'Pause motion';
                button.querySelector('path').setAttribute('d', paused ? 'M5 3v10l7-5Z' : 'M4 3h3v10H4zm5 0h3v10H9z');
            });
            queueUpdate();
        }
        document.querySelectorAll('.photo-motion-toggle').forEach(button => {
            button.addEventListener('click', () => setPaused(!paused));
        });
        document.getElementById('hero-motion-toggle')?.addEventListener('click', event => {
            const button = event.currentTarget;
            requestAnimationFrame(() => setPaused(button.getAttribute('aria-pressed') === 'true'));
        });
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    entry.target.dataset.inView = String(entry.isIntersecting);
                    if (entry.isIntersecting) visible.add(entry.target);
                    else visible.delete(entry.target);
                });
                queueUpdate();
            });
            photos.forEach(photo => observer.observe(photo));
        }
        addEventListener('scroll', queueUpdate, {passive: true});
        addEventListener('resize', queueUpdate, {passive: true});
        document.addEventListener('visibilitychange', () => {
            document.body.classList.toggle('scene-tab-hidden', document.hidden);
            queueUpdate();
        });
        reduced.addEventListener('change', () => {
            if (reduced.matches) photos.forEach(photo => photo.style.removeProperty('--photo-shift'));
            queueUpdate();
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPhotoScenes);
    else initPhotoScenes();
})();
