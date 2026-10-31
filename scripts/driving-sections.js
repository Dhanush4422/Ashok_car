(() => {
    function initDrivingSections() {
        const journeyRoot = document.getElementById('curriculum');
        const pickupRoot = document.getElementById('pickup');
        if (!journeyRoot || !pickupRoot) return;
        const reduced = matchMedia('(prefers-reduced-motion: reduce)');
        const stages = [
            {tag:'STAGE 01 · DAY 1–3', title:'Cockpit Drill & A-B-C Pedal Control', description:'Get comfortable behind the wheel. Learn your mirrors, seating position, gears and pedals with patient support.', outcomes:['Mirror & seat setup','Gear changes without looking down','Dual-control safety support'], status:'Getting comfortable behind the wheel'},
            {tag:'STAGE 02 · DAY 4–7', title:'Clutch Biting Point & Slope Control', description:'Find the biting point and practise a calm start on an incline. Build smooth coordination, one repeat at a time.', outcomes:['Half-clutch coordination','Controlled hill starts','Smooth starts and stops'], status:'Building clutch confidence'},
            {tag:'STAGE 03 · DAY 8–12', title:'S-Bend & Reverse Parallel Parking', description:'Use your mirrors and reference points to guide the car through bends and into a parking space.', outcomes:['Three-mirror reference points','S-bend steering practice','Reverse parking control'], status:'Making room for precision'},
            {tag:'STAGE 04 · DAY 13–17', title:'SH-50B Highway & Night Beam Judgment', description:'Progress to open-road driving, safe observation and night-time beam control with your instructor beside you.', outcomes:['4th/5th gear cruising','Safe overtaking judgment','Night dipper etiquette'], status:'Growing confidence on open roads'},
            {tag:'STAGE 05 · LICENCE DAY', title:'RTO Track Trial & Licence Preparation', description:'Bring your skills together with track practice and guidance through the driving licence process.', outcomes:['Figure-8 & H-track practice','Inspector trial preparation','Guidance through the licence process'], status:'Ready for your next driving milestone'}
        ];
        let selectedStage = 0;
        let selectedVillage = 'Perambakkam Hub';
        let frame = 0;
        let lastTime = 0;

        function makeScene(kind, root) {
            const path = document.getElementById(kind + '-route');
            return {kind, root, path, car:document.getElementById(kind + '-car'), length:path.getTotalLength(), progress:0, angle:null, paused:false, visible:false, animation:null, dwell:0};
        }
        const journey = makeScene('journey', journeyRoot.querySelector('[data-road-scene]'));
        const pickup = makeScene('pickup', pickupRoot.querySelector('[data-road-scene]'));
        const scenes = [journey, pickup];
        const stops = [...journeyRoot.querySelectorAll('[data-road-stop]')];
        const buttons = [...journeyRoot.querySelectorAll('[data-stage]')];
        const progressPath = document.getElementById('journey-route-progress');
        progressPath.style.strokeDasharray = String(journey.length);
        journey.root.dataset.roadReady = 'true';
        stops.forEach((stop, index) => {
            const point = journey.path.getPointAtLength(journey.length * index / 4);
            stop.setAttribute('transform', `translate(${point.x} ${point.y})`);
        });

        function drawCar(scene, progress, direction = 1, immediate = false) {
            scene.progress = Math.max(0, Math.min(1, progress));
            const distance = scene.progress * scene.length;
            const position = scene.path.getPointAtLength(distance);
            const ahead = scene.path.getPointAtLength(Math.min(scene.length, distance + 2));
            const behind = scene.path.getPointAtLength(Math.max(0, distance - 2));
            const desired = Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180 / Math.PI + (direction < 0 ? 180 : 0);
            if (scene.angle === null || immediate) scene.angle = desired;
            else {
                const change = ((desired - scene.angle + 540) % 360) - 180;
                scene.angle += change * .18;
            }
            scene.car.setAttribute('transform', `translate(${position.x.toFixed(2)} ${position.y.toFixed(2)}) rotate(${scene.angle.toFixed(2)})`);
            if (scene === journey) progressPath.style.strokeDashoffset = String(scene.length * (1 - scene.progress));
        }
        function updateToggle(scene) {
            scene.root.dataset.drivePaused = String(scene.paused);
            const button = document.querySelector(`[data-drive-toggle="${scene.kind}"]`);
            button.setAttribute('aria-pressed', String(scene.paused));
            button.setAttribute('aria-label', `${scene.paused ? 'Play' : 'Pause'} ${scene.kind === 'journey' ? 'learning journey' : 'pickup route'} animation`);
            button.querySelector('span').textContent = scene.paused ? 'Play drive' : 'Pause drive';
            button.querySelector('path').setAttribute('d', scene.paused ? 'M5 3v10l7-5Z' : 'M4 3h3v10H4zm5 0h3v10H9z');
        }
        function animateTo(scene, destination, duration, manual = false) {
            scene.dwell = 0;
            if (reduced.matches) {
                drawCar(scene, destination, destination >= scene.progress ? 1 : -1, true);
                scene.animation = null;
                return;
            }
            scene.animation = {from:scene.progress, to:destination, duration, elapsed:0, manual};
            startLoop();
        }
        function selectStage(index, manual) {
            if (!stages[index]) return;
            selectedStage = index;
            const stage = stages[index];
            buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
            stops.forEach((stop, i) => stop.classList.toggle('is-active', i === index));
            document.getElementById('step-card-tag').textContent = stage.tag;
            document.getElementById('step-card-title').textContent = stage.title;
            document.getElementById('journey-stage-description').textContent = stage.description;
            document.getElementById('journey-stage-count').textContent = `0${index + 1} / 05`;
            document.getElementById('journey-drive-status').textContent = stage.status;
            document.getElementById('journey-progress-fill').style.width = `${(index + 1) * 20}%`;
            const outcomes = document.getElementById('step-card-chips');
            outcomes.replaceChildren(...stage.outcomes.map(text => {
                const item = document.createElement('li'); item.textContent = text; return item;
            }));
            if (manual) { journey.paused = true; updateToggle(journey); }
            animateTo(journey, index / 4, 1450 + Math.abs(index / 4 - journey.progress) * 1700, manual);
        }
        buttons.forEach((button, index) => {
            button.addEventListener('click', () => selectStage(index, true));
            button.addEventListener('keydown', event => {
                const next = event.key === 'ArrowRight' ? (index + 1) % 5 : event.key === 'ArrowLeft' ? (index + 4) % 5 : event.key === 'Home' ? 0 : event.key === 'End' ? 4 : null;
                if (next === null) return;
                event.preventDefault(); buttons[next].focus({preventScroll:true}); selectStage(next, true);
            });
        });
        pickupRoot.querySelectorAll('[data-village]').forEach(button => {
            button.addEventListener('click', () => {
                selectedVillage = button.dataset.village;
                pickupRoot.querySelectorAll('[data-village]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
                document.getElementById('selected-village-name').textContent = selectedVillage;
                document.getElementById('pickup-map-village').textContent = selectedVillage;
                document.getElementById('pickup-drive-status').textContent = 'Pickup route to ' + selectedVillage;
                document.getElementById('pickup-whatsapp-btn').href = 'https://wa.me/919443200000?text=' + encodeURIComponent('Please confirm free doorstep pickup at ' + selectedVillage);
                drawCar(pickup, 0, 1, true);
                animateTo(pickup, 1, 7000, true);
            });
        });
        scenes.forEach(scene => {
            document.querySelector(`[data-drive-toggle="${scene.kind}"]`).addEventListener('click', () => {
                scene.paused = !scene.paused;
                if (scene.paused && scene.animation) scene.animation.manual = false;
                if (!scene.paused && scene === journey && selectedStage === 4 && !scene.animation) {
                    drawCar(journey, 0, 1, true); selectStage(0, false);
                }
                updateToggle(scene); startLoop();
            });
        });

        function tick(time) {
            frame = 0;
            const delta = lastTime ? Math.min(64, time - lastTime) : 0;
            lastTime = time;
            let running = false;
            scenes.forEach(scene => {
                const active = scene.visible && !document.hidden && !reduced.matches && !document.body.classList.contains('scene-paused') && (!scene.paused || scene.animation?.manual);
                if (!active) { scene.root.dataset.isDriving = 'false'; return; }
                running = true;
                if (scene.animation) {
                    const animation = scene.animation;
                    animation.elapsed += delta;
                    const t = Math.min(1, animation.elapsed / animation.duration);
                    const ease = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                    drawCar(scene, animation.from + (animation.to - animation.from) * ease, animation.to >= animation.from ? 1 : -1);
                    scene.root.dataset.isDriving = 'true';
                    if (t === 1) { scene.animation = null; scene.dwell = 0; scene.root.dataset.isDriving = 'false'; }
                } else {
                    scene.root.dataset.isDriving = 'false';
                    scene.dwell += delta;
                    if (scene === journey && scene.dwell >= 5100) {
                        if (selectedStage < 4) selectStage(selectedStage + 1, false);
                        else { journey.paused = true; updateToggle(journey); }
                    }
                    if (scene === pickup && scene.dwell >= 1800) {
                        const destination = scene.progress > .5 ? 0 : 1;
                        document.getElementById('pickup-drive-status').textContent = destination === 1 ? 'Pickup route to ' + selectedVillage : 'Return route to Ashok Hub';
                        animateTo(pickup, destination, 7200);
                    }
                }
            });
            if (running) frame = requestAnimationFrame(tick);
            else lastTime = 0;
        }
        function startLoop() { if (!frame) frame = requestAnimationFrame(tick); }
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    const scene = scenes.find(scene => scene.root === entry.target);
                    if (scene) scene.visible = entry.isIntersecting;
                });
                startLoop();
            }, {threshold: .05});
            scenes.forEach(scene => observer.observe(scene.root));
        } else scenes.forEach(scene => { scene.visible = true; });
        document.addEventListener('visibilitychange', startLoop);
        new MutationObserver(startLoop).observe(document.body, {attributes:true, attributeFilter:['class']});
        reduced.addEventListener('change', () => {
            if (reduced.matches) scenes.forEach(scene => {
                if (scene.animation) drawCar(scene, scene.animation.to, 1, true);
                scene.animation = null;
            });
            startLoop();
        });
        drawCar(journey, 0, 1, true); drawCar(pickup, 0, 1, true);
        stops[0].classList.add('is-active');
        document.getElementById('pickup-drive-status').textContent = 'Pickup route to ' + selectedVillage;
        scenes.forEach(updateToggle); startLoop();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDrivingSections);
    else initDrivingSections();
})();
