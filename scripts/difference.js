(() => {
    const section = document.querySelector('.difference-section');
    if (!section) return;

    const route = section.querySelector('#difference-route');
    const car = section.querySelector('#difference-route-car');
    const progress = section.querySelector('#difference-route-progress');
    const buttons = [...section.querySelectorAll('[data-difference-step]')];
    const waypoints = [...section.querySelectorAll('.difference-waypoint')];
    const toggle = section.querySelector('.difference-drive-toggle');
    const status = section.querySelector('#difference-route-status');
    const stepCount = section.querySelector('#difference-route-step');
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!route || !car || !progress || !toggle || buttons.length !== 4) return;

    const legLengths = [...section.querySelectorAll('[data-route-leg]')].map(leg => leg.getTotalLength());
    const total = route.getTotalLength();
    const stops = [0, legLengths[0], legLengths[0] + legLengths[1], total];
    let active = 0;
    let distance = 0;
    let direction = 1;
    let autoDrive = true;
    let visible = false;
    let frame = 0;
    let timer = 0;
    progress.style.strokeDasharray = String(total);
    section.dataset.routeReady = 'true';

    function drawCar(at, heading = direction) {
        distance = Math.max(0, Math.min(total, at));
        const point = route.getPointAtLength(distance);
        const before = route.getPointAtLength(Math.max(0, distance - 1));
        const after = route.getPointAtLength(Math.min(total, distance + 1));
        const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI + (heading < 0 ? 180 : 0);
        car.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle})`);
        progress.style.strokeDashoffset = String(total - distance);
    }

    function cancelMotion() {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
        frame = 0;
        timer = 0;
    }

    function canDrive() { return visible && !document.hidden && !motionPreference.matches; }

    function selectStop(index) {
        active = index;
        buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
        waypoints.forEach((waypoint, i) => waypoint.classList.toggle('is-active', i === index));
        status.textContent = buttons[index].querySelector('.difference-feature-title').textContent;
        section.querySelector('.difference-status-icon use').setAttribute('href',
            buttons[index].querySelector('.difference-feature-icon use').getAttribute('href'));
        stepCount.textContent = `Stop 0${index + 1} / 04`;
    }

    function scheduleDrive() {
        if (!autoDrive || !canDrive()) return;
        timer = window.setTimeout(() => {
            if (active === stops.length - 1) direction = -1;
            if (active === 0) direction = 1;
            moveTo(active + direction);
        }, 4800);
    }

    function moveTo(index) {
        cancelMotion();
        selectStop(index);
        const from = distance;
        const to = stops[index];
        const heading = to >= from ? 1 : -1;
        if (!canDrive() || Math.abs(to - from) < .5) {
            drawCar(to, heading);
            scheduleDrive();
            return;
        }
        const duration = Math.max(1000, Math.min(2400, Math.abs(to - from) * 6));
        let started = null;
        function travel(now) {
            if (started === null) started = now;
            const elapsed = Math.min(1, (now - started) / duration);
            const eased = elapsed < .5 ? 4 * elapsed ** 3 : 1 - (-2 * elapsed + 2) ** 3 / 2;
            drawCar(from + (to - from) * eased, heading);
            if (elapsed < 1) frame = requestAnimationFrame(travel);
            else { frame = 0; scheduleDrive(); }
        }
        frame = requestAnimationFrame(travel);
    }

    function setAutoDrive(enabled) {
        autoDrive = enabled;
        toggle.setAttribute('aria-pressed', String(!enabled));
        toggle.setAttribute('aria-label', enabled ? 'Pause journey animation' : 'Play journey animation');
        toggle.querySelector('[data-drive-label]').textContent = enabled ? 'Pause drive' : 'Play drive';
        toggle.querySelector('[data-pause-icon]').toggleAttribute('hidden', !enabled);
        toggle.querySelector('[data-play-icon]').toggleAttribute('hidden', enabled);
        cancelMotion();
        if (enabled && canDrive()) moveTo(active);
    }

    buttons.forEach((button, index) => button.addEventListener('click', () => {
        setAutoDrive(false);
        moveTo(index);
    }));
    toggle.addEventListener('click', () => setAutoDrive(!autoDrive));

    function resumeMotion() {
        cancelMotion();
        if (motionPreference.matches) drawCar(stops[active]);
        else if (autoDrive && canDrive()) moveTo(active);
        else if (visible) drawCar(stops[active]);
    }
    document.addEventListener('visibilitychange', resumeMotion);
    motionPreference.addEventListener('change', resumeMotion);
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            resumeMotion();
        }, { threshold: .15 }).observe(section.querySelector('.difference-map'));
    } else { visible = true; }

    selectStop(0);
    drawCar(0);
    if (visible) scheduleDrive();
})();
