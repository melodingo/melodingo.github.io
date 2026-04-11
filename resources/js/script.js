document.addEventListener('DOMContentLoaded', function () {
    var terminal = document.getElementById('terminal');
    var trigger = document.querySelector('.easter-egg');
    var terminalInput = document.getElementById('terminalInput');
    var outputDiv = document.getElementById('terminalOutput');

    if (!terminal || !trigger || !terminalInput || !outputDiv) {
        return;
    }

    // Mount terminal at document root so it can move freely across the viewport.
    if (terminal.parentElement !== document.body) {
        document.body.appendChild(terminal);
    }
    terminal.style.position = 'fixed';

    var header = terminal.querySelector('.terminal-header');
    var redBtn = terminal.querySelector('.traffic-lights .red');
    var yellowBtn = terminal.querySelector('.traffic-lights .yellow');
    var greenBtn = terminal.querySelector('.traffic-lights .green');

    var isDragging = false;
    var isOpen = false;
    var isMaximized = false;
    var hasShownWelcome = false;
    var offsetX = 0;
    var offsetY = 0;
    var lastRect = { top: '20%', left: '20%', width: '600px', height: '400px' };
    var history = [];
    var historyIndex = -1;
    var pageBlackholeOverlay = null;
    var pageBlackholeFrame = null;
    var pageBlackholeTimers = [];
    var pageBlackholeTargets = [];
    var pageBlackholeTextWrappers = [];
    var pageBlackholeActive = false;
    var pageBlackholeRenderActive = false;

    function placeCaretAtEnd(el) {
        var range = document.createRange();
        var selection = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function focusInput() {
        terminalInput.focus();
        placeCaretAtEnd(terminalInput);
        outputDiv.scrollTop = outputDiv.scrollHeight;
    }

    function appendLine(text, className) {
        var line = document.createElement('div');
        line.className = className || 'terminal-line';
        line.textContent = text;
        outputDiv.appendChild(line);
        outputDiv.scrollTop = outputDiv.scrollHeight;
    }

    function appendNode(node) {
        outputDiv.appendChild(node);
        outputDiv.scrollTop = outputDiv.scrollHeight;
    }

    function clearInput() {
        terminalInput.textContent = '';
    }

    function closeTerminal() {
        isOpen = false;
        terminal.classList.remove('is-open');
    }

    function openTerminal() {
        isOpen = true;
        terminal.classList.add('is-open');
        if (!hasShownWelcome) {
            appendLine('Secret terminal ready. Type "help" to see commands.', 'terminal-line terminal-line-system');
            hasShownWelcome = true;
        }
        focusInput();
    }

    function clampTerminalPosition() {
        var maxLeft = Math.max(0, window.innerWidth - terminal.offsetWidth);
        var maxTop = Math.max(0, window.innerHeight - terminal.offsetHeight);
        var currentLeft = terminal.offsetLeft;
        var currentTop = terminal.offsetTop;
        terminal.style.left = Math.min(Math.max(0, currentLeft), maxLeft) + 'px';
        terminal.style.top = Math.min(Math.max(0, currentTop), maxTop) + 'px';
    }

    function toggleMaximize() {
        if (!isMaximized) {
            lastRect = {
                top: terminal.style.top || lastRect.top,
                left: terminal.style.left || lastRect.left,
                width: terminal.style.width || lastRect.width,
                height: terminal.style.height || lastRect.height
            };

            terminal.style.top = '0';
            terminal.style.left = '0';
            terminal.style.width = '100vw';
            terminal.style.height = '100vh';
            isMaximized = true;
        } else {
            terminal.style.top = lastRect.top;
            terminal.style.left = lastRect.left;
            terminal.style.width = lastRect.width;
            terminal.style.height = lastRect.height;
            isMaximized = false;
            clampTerminalPosition();
        }
    }

    function appendLines(lines, className) {
        lines.forEach(function (line) {
            appendLine(line, className || 'terminal-line');
        });
    }

    function scheduleBlackholeTimer(callback, delay) {
        var timerId = window.setTimeout(callback, delay);
        pageBlackholeTimers.push(timerId);
        return timerId;
    }

    function clearBlackholeTimers() {
        pageBlackholeRenderActive = false;

        while (pageBlackholeTimers.length) {
            window.clearTimeout(pageBlackholeTimers.pop());
        }

        if (pageBlackholeFrame !== null) {
            window.cancelAnimationFrame(pageBlackholeFrame);
            pageBlackholeFrame = null;
        }
    }

    function isBlackholeExcludedElement(element) {
        if (!element || !element.tagName) {
            return true;
        }

        return /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|SELECT|OPTION|IFRAME|CANVAS|SVG|VIDEO|AUDIO)$/.test(element.tagName);
    }

    function captureBlackholeTextNodes() {
        var letterTargets = [];
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        var textNodes = [];
        var currentNode = walker.nextNode();

        while (currentNode) {
            var parent = currentNode.parentElement;
            if (parent && !isBlackholeExcludedElement(parent) && !parent.closest('.page-blackhole-overlay')) {
                if ((currentNode.nodeValue || '').trim()) {
                    textNodes.push(currentNode);
                }
            }
            currentNode = walker.nextNode();
        }

        textNodes.forEach(function (textNode) {
            var parent = textNode.parentNode;
            if (!parent) {
                return;
            }

            var rawText = textNode.nodeValue || '';
            var wrapper = document.createElement('span');
            wrapper.className = 'page-blackhole-text-cluster';
            wrapper.setAttribute('aria-hidden', 'true');
            wrapper.style.whiteSpace = 'pre-wrap';

            for (var i = 0; i < rawText.length; i += 1) {
                var letter = document.createElement('span');
                letter.className = 'page-blackhole-letter';
                letter.textContent = rawText[i] === ' ' ? '\u00A0' : rawText[i];
                wrapper.appendChild(letter);
                letterTargets.push({
                    element: letter,
                    distance: 0,
                    x: 0,
                    y: 0,
                    activated: false,
                    kind: 'letter'
                });
            }

            pageBlackholeTextWrappers.push({
                wrapper: wrapper,
                text: rawText,
                parent: parent,
                nextSibling: textNode.nextSibling
            });

            parent.replaceChild(wrapper, textNode);
        });

        return letterTargets;
    }

    function restoreBlackholeTextNodes() {
        while (pageBlackholeTextWrappers.length) {
            var entry = pageBlackholeTextWrappers.pop();
            if (!entry || !entry.parent) {
                continue;
            }

            var textNode = document.createTextNode(entry.text);
            if (entry.wrapper && entry.wrapper.parentNode === entry.parent) {
                entry.parent.replaceChild(textNode, entry.wrapper);
            } else if (entry.nextSibling && entry.nextSibling.parentNode === entry.parent) {
                entry.parent.insertBefore(textNode, entry.nextSibling);
            } else {
                entry.parent.appendChild(textNode);
            }
        }
    }

    function runSpinnerAnimation() {
        var block = document.createElement('div');
        block.className = 'terminal-line terminal-cinematic terminal-spinner-hero';

        var title = document.createElement('div');
        title.className = 'terminal-cinematic-title';
        title.textContent = 'SPINNER CORE';

        var spinner = document.createElement('div');
        spinner.className = 'terminal-spinner terminal-spinner-large';
        spinner.textContent = '◐';

        var status = document.createElement('div');
        status.className = 'terminal-cinematic-status';
        status.textContent = 'Spinning up...';

        block.appendChild(title);
        block.appendChild(spinner);
        block.appendChild(status);
        appendNode(block);

        var frames = ['◐', '◓', '◑', '◒', '◉', '◎'];
        var frameIndex = 0;
        var ticks = 0;
        var maxTicks = 54;

        var timer = setInterval(function () {
            spinner.textContent = frames[frameIndex % frames.length];
            frameIndex += 1;
            ticks += 1;
            outputDiv.scrollTop = outputDiv.scrollHeight;

            if (ticks === 18) {
                status.textContent = 'Torque at 63%';
            }
            if (ticks === 36) {
                status.textContent = 'Entering overdrive...';
            }

            if (ticks >= maxTicks) {
                clearInterval(timer);
                spinner.textContent = '◎';
                status.textContent = 'Spin lock achieved';
                appendLine('Spinner stabilized. Maximum coolness reached.', 'terminal-line terminal-line-system');
            }
        }, 75);
    }

    function runMatrixAnimation() {
        var line = document.createElement('div');
        line.className = 'terminal-line terminal-matrix';
        appendNode(line);

        var charset = '01#$%&@*+=<>[]{}';
        var ticks = 0;
        var maxTicks = 45;

        var timer = setInterval(function () {
            var row = '';
            for (var i = 0; i < 56; i += 1) {
                row += charset[Math.floor(Math.random() * charset.length)];
            }
            line.textContent = row;
            outputDiv.scrollTop = outputDiv.scrollHeight;
            ticks += 1;

            if (ticks >= maxTicks) {
                clearInterval(timer);
                line.textContent = '[matrix stream complete]';
                appendLine('Wake up, Neo... but also maybe ship your next feature.', 'terminal-line terminal-line-system');
            }
        }, 55);
    }

    function runHyperdriveAnimation() {
        var block = document.createElement('div');
        block.className = 'terminal-line terminal-cinematic';

        var title = document.createElement('div');
        title.className = 'terminal-cinematic-title';
        title.textContent = 'HYPERDRIVE SEQUENCE';

        var status = document.createElement('div');
        status.className = 'terminal-cinematic-status';
        status.textContent = 'Booting thrusters...';

        var barWrap = document.createElement('div');
        barWrap.className = 'terminal-cinematic-bar-wrap';

        var bar = document.createElement('div');
        bar.className = 'terminal-cinematic-bar';
        bar.style.width = '0%';

        var pct = document.createElement('span');
        pct.className = 'terminal-cinematic-percent';
        pct.textContent = '0%';

        barWrap.appendChild(bar);
        block.appendChild(title);
        block.appendChild(status);
        block.appendChild(barWrap);
        block.appendChild(pct);
        appendNode(block);

        var stages = [
            'Booting thrusters...',
            'Calibrating navigation array...',
            'Charging flux capacitor...',
            'Stabilizing warp tunnel...',
            'Launch sequence armed...'
        ];

        var progress = 0;
        var timer = setInterval(function () {
            progress += Math.random() * 6 + 2;
            if (progress > 100) {
                progress = 100;
            }

            var rounded = Math.floor(progress);
            bar.style.width = rounded + '%';
            pct.textContent = rounded + '%';
            status.textContent = stages[Math.min(stages.length - 1, Math.floor((rounded / 100) * stages.length))];
            outputDiv.scrollTop = outputDiv.scrollHeight;

            if (progress >= 100) {
                clearInterval(timer);
                status.textContent = 'HYPERDRIVE ONLINE';
                appendLine('Warp jump complete. Welcome to developer speed.', 'terminal-line terminal-line-system');
            }
        }, 85);
    }

    function runBootAnimation() {
        var lines = [
            '[BOOT] Initializing secret terminal kernel...',
            '[BOOT] Loading module: render.fx',
            '[BOOT] Loading module: vibe.engine',
            '[BOOT] Mounting /dev/cool',
            '[BOOT] Checking caffeine levels... OK',
            '[BOOT] Finalizing startup sequence...'
        ];

        var i = 0;
        var timer = setInterval(function () {
            appendLine(lines[i], 'terminal-line terminal-line-system');
            i += 1;

            if (i >= lines.length) {
                clearInterval(timer);
                appendLine('[BOOT] System online. Welcome back, Samuel.', 'terminal-line terminal-line-system');
            }
        }, 180);
    }

    function runGlitchAnimation() {
        var line = document.createElement('div');
        line.className = 'terminal-line terminal-matrix';
        appendNode(line);

        var source = 'PORTFOLIO_SIGNAL_LOCKED';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@*';
        var tick = 0;

        var timer = setInterval(function () {
            var out = '';
            for (var i = 0; i < source.length; i += 1) {
                if (Math.random() < (tick / 16)) {
                    out += source[i];
                } else {
                    out += chars[Math.floor(Math.random() * chars.length)];
                }
            }
            line.textContent = out;
            tick += 1;

            if (tick > 16) {
                clearInterval(timer);
                line.textContent = source;
                appendLine('Signal stabilized.', 'terminal-line terminal-line-system');
            }
        }, 70);
    }

    function runNeonAnimation() {
        var frame = document.createElement('div');
        frame.className = 'terminal-line terminal-cinematic';
        frame.innerHTML = '<div class="terminal-cinematic-title">NEON PULSE</div><div class="terminal-neon">▁▂▃▄▅▆▇█</div>';
        appendNode(frame);

        var levels = ['▁▂▃▄▅▆▇█', '█▇▆▅▄▃▂▁', '▂▄▆█▆▄▂▁', '▁▃▅▇█▇▅▃'];
        var index = 0;
        var rounds = 0;
        var neon = frame.querySelector('.terminal-neon');

        var timer = setInterval(function () {
            neon.textContent = levels[index % levels.length];
            index += 1;
            rounds += 1;
            if (rounds > 18) {
                clearInterval(timer);
                appendLine('Neon pulse complete. Aesthetic level: maximum.', 'terminal-line terminal-line-system');
            }
        }, 90);
    }

    function runBlackholeAnimation() {
        var block = document.createElement('div');
        block.className = 'terminal-line terminal-cinematic terminal-blackhole';

        var title = document.createElement('div');
        title.className = 'terminal-cinematic-title';
        title.textContent = 'BLACKHOLE PROTOCOL';

        var scene = document.createElement('div');
        scene.className = 'terminal-blackhole-scene';

        var ringA = document.createElement('div');
        ringA.className = 'terminal-blackhole-ring ring-a';

        var ringB = document.createElement('div');
        ringB.className = 'terminal-blackhole-ring ring-b';

        var core = document.createElement('div');
        core.className = 'terminal-blackhole-core';

        var particles = document.createElement('div');
        particles.className = 'terminal-blackhole-particles';
        for (var i = 0; i < 18; i += 1) {
            var p = document.createElement('span');
            p.className = 'terminal-blackhole-particle';
            p.style.setProperty('--i', String(i));
            particles.appendChild(p);
        }

        scene.appendChild(ringA);
        scene.appendChild(ringB);
        scene.appendChild(core);
        scene.appendChild(particles);

        var status = document.createElement('div');
        status.className = 'terminal-cinematic-status';
        status.textContent = 'Bending spacetime...';

        block.appendChild(title);
        block.appendChild(scene);
        block.appendChild(status);
        appendNode(block);

        var phases = [
            'Bending spacetime...',
            'Accretion disk forming...',
            'Crossing event horizon...',
            'Singularity stabilized.'
        ];
        var idx = 0;
        var timer = setInterval(function () {
            idx += 1;
            if (idx < phases.length) {
                status.textContent = phases[idx];
            } else {
                clearInterval(timer);
                appendLine('Blackhole simulation complete. You survived the pull.', 'terminal-line terminal-line-system');
            }
        }, 900);
    }

    function getBlackholeTargets() {
        var selector = '#terminal, .terminal-window, main, section, article, header, footer, nav, .content-wrapper, .card, .container_card, h1, h2, h3, p, li, img, button, a';
        return Array.prototype.slice.call(document.querySelectorAll(selector)).filter(function (el) {
            if (!el || el === document.body || el === document.documentElement) {
                return false;
            }
            if (pageBlackholeOverlay && (el === pageBlackholeOverlay || pageBlackholeOverlay.contains(el))) {
                return false;
            }
            var rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
        });
    }

    function buildGlyphData(centerX, centerY, maxGlyphs) {
        var chunks = [];
        var candidates = Array.prototype.slice.call(document.querySelectorAll('h1, h2, h3, p, li, a, button, span, strong, em'));

        for (var i = 0; i < candidates.length; i += 1) {
            var el = candidates[i];
            if (chunks.length >= maxGlyphs) {
                break;
            }
            if (!el || (pageBlackholeOverlay && pageBlackholeOverlay.contains(el))) {
                continue;
            }

            var rect = el.getBoundingClientRect();
            if (rect.width < 8 || rect.height < 8 || rect.bottom < 0 || rect.top > window.innerHeight) {
                continue;
            }

            var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!text) {
                continue;
            }

            var step = Math.max(1, Math.floor(text.length / 4));
            for (var j = 0; j < text.length && chunks.length < maxGlyphs; j += step) {
                var ch = text[j];
                if (!ch || ch === ' ') {
                    continue;
                }
                var startX = rect.left + Math.random() * rect.width;
                var startY = rect.top + Math.random() * rect.height;
                var dx = centerX - startX;
                var dy = centerY - startY;
                var distance = Math.sqrt((dx * dx) + (dy * dy));

                chunks.push({
                    ch: ch,
                    x: startX,
                    y: startY,
                    dx: dx,
                    dy: dy,
                    distance: distance
                });
            }
        }

        return chunks;
    }

    function startBlackholeCanvasRenderer(canvas) {
        if (!canvas) {
            return;
        }

        var ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
            return;
        }

        pageBlackholeRenderActive = true;

        function syncCanvasSize() {
            var ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
            var cssWidth = Math.max(260, Math.floor(canvas.clientWidth || 420));
            var cssHeight = Math.max(260, Math.floor(canvas.clientHeight || cssWidth));
            var nextWidth = Math.floor(cssWidth * ratio);
            var nextHeight = Math.floor(cssHeight * ratio);

            if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
                canvas.width = nextWidth;
                canvas.height = nextHeight;
            }
        }

        function render(now) {
            if (!pageBlackholeRenderActive) {
                return;
            }

            syncCanvasSize();

            var w = canvas.width;
            var h = canvas.height;
            var cx = w * 0.5;
            var cy = h * 0.5;
            var t = now * 0.001;
            var baseScale = 0.22;
            if (pageBlackholeOverlay && pageBlackholeOverlay.classList.contains('hole-live')) {
                baseScale = 1;
            }
            if (pageBlackholeOverlay && pageBlackholeOverlay.classList.contains('void-live')) {
                baseScale = 1.08;
            }
            if (pageBlackholeOverlay && pageBlackholeOverlay.classList.contains('cinematic-end')) {
                baseScale = 1.24;
            }

            var outerR = Math.min(w, h) * 0.31 * baseScale;
            var ringR = Math.min(w, h) * 0.095 * baseScale;
            var coreR = Math.min(w, h) * 0.076 * baseScale;
            var endFade = 0;
            if (pageBlackholeOverlay && pageBlackholeOverlay.classList.contains('void-live')) {
                endFade = 0.55;
            }
            if (pageBlackholeOverlay && pageBlackholeOverlay.classList.contains('cinematic-end')) {
                endFade = 1;
            }

            ctx.clearRect(0, 0, w, h);

            function noise(i) {
                var n = Math.sin(i * 127.1 + 311.7) * 43758.5453123;
                return n - Math.floor(n);
            }

            function drawScribbleEllipse(centerX, centerY, radiusX, radiusY, rotation, jitter, passes, alpha, width) {
                for (var p = 0; p < passes; p += 1) {
                    var seed = p * 17.0 + t * 0.4;
                    var jx = (noise(seed + 1.3) - 0.5) * jitter;
                    var jy = (noise(seed + 5.9) - 0.5) * jitter;
                    var rx = radiusX * (1 + (noise(seed + 8.1) - 0.5) * 0.06);
                    var ry = radiusY * (1 + (noise(seed + 11.7) - 0.5) * 0.08);

                    ctx.save();
                    ctx.translate(centerX + jx, centerY + jy);
                    ctx.rotate(rotation + (noise(seed + 14.2) - 0.5) * 0.08);
                    ctx.strokeStyle = 'rgba(235,235,235,' + alpha.toFixed(3) + ')';
                    ctx.lineWidth = width * (0.85 + noise(seed + 19.2) * 0.4);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
            }

            function drawAccretionBand(frontLayer) {
                ctx.save();
                ctx.translate(cx, cy);

                // Split rendering into back (top) and front (bottom) so the hole occludes correctly.
                ctx.beginPath();
                if (frontLayer) {
                    ctx.rect(-w, 0, w * 2, h);
                } else {
                    ctx.rect(-w, -h, w * 2, h);
                }
                ctx.clip();

                // One continuous ring, split into back/front halves by clip masks above.
                var perspectiveShift = outerR * 0.012;
                var xShift = Math.cos(t * 0.24) * outerR * 0.012;
                var stretch = outerR * 1.34;
                var bandHeight = outerR * 0.052;

                var grad = ctx.createLinearGradient(-stretch, perspectiveShift, stretch, perspectiveShift);
                grad.addColorStop(0, 'rgba(255,255,255,0)');
                grad.addColorStop(0.28, 'rgba(232,232,232,0.1)');
                grad.addColorStop(0.5, 'rgba(244,244,244,0.24)');
                grad.addColorStop(0.72, 'rgba(232,232,232,0.1)');
                grad.addColorStop(1, 'rgba(255,255,255,0)');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(xShift, perspectiveShift, stretch, bandHeight, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = frontLayer ? 'rgba(246,246,246,0.22)' : 'rgba(228,228,228,0.15)';
                ctx.lineWidth = Math.max(1, outerR * 0.0016);
                ctx.beginPath();
                ctx.ellipse(xShift, perspectiveShift, stretch * 0.98, bandHeight * 0.86, 0, 0, Math.PI * 2);
                ctx.stroke();

                ctx.restore();
            }

            function drawWobbleWrap(frontLayer) {
                ctx.save();
                ctx.beginPath();
                if (frontLayer) {
                    ctx.rect(0, cy, w, h - cy);
                } else {
                    ctx.rect(0, 0, w, cy);
                }
                ctx.clip();

                // Primary wobble ring.
                drawScribbleEllipse(cx, cy + ringR * 0.06, ringR * 2.02, ringR * 0.5, 0, ringR * 0.04, 3, 0.14, Math.max(1, outerR * 0.0024));

                // Orbiting wisps around the wobble ring.
                for (var wisp = 0; wisp < 12; wisp += 1) {
                    var seedW = wisp * 13.7;
                    var angleBase = noise(seedW + 1.1) * Math.PI * 2;
                    var travel = (t * (0.06 + noise(seedW + 4.2) * 0.09));
                    var arcStart = angleBase + travel;
                    var arcLen = 0.18 + noise(seedW + 8.8) * 0.28;
                    var rx = ringR * (1.45 + noise(seedW + 2.7) * 1.6);
                    var ry = ringR * (0.58 + noise(seedW + 6.4) * 0.62);
                    var yOff = ringR * (-0.26 + noise(seedW + 9.3) * 0.84);
                    var alphaW = 0.035 + noise(seedW + 11.2) * 0.06;
                    var widthW = Math.max(1, outerR * (0.0016 + noise(seedW + 3.3) * 0.0017));

                    ctx.strokeStyle = 'rgba(232,232,232,' + alphaW.toFixed(3) + ')';
                    ctx.lineWidth = widthW;
                    ctx.beginPath();
                    ctx.ellipse(cx, cy + yOff, rx, ry, 0, arcStart, arcStart + arcLen);
                    ctx.stroke();
                }

                ctx.restore();
            }

            // Space tint (always subtle color), stronger in final phases.
            var spaceTint = ctx.createRadialGradient(cx, cy, ringR * 1.8, cx, cy, Math.max(w, h) * 0.95);
            spaceTint.addColorStop(0, 'rgba(70,88,120,' + (0.03 + endFade * 0.03).toFixed(3) + ')');
            spaceTint.addColorStop(0.5, 'rgba(56,68,96,' + (0.028 + endFade * 0.045).toFixed(3) + ')');
            spaceTint.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = spaceTint;
            ctx.fillRect(0, 0, w, h);

            // End-phase galaxy/star reveal.
            if (endFade > 0) {
                var bg = ctx.createRadialGradient(cx, cy, ringR * 2.1, cx, cy, Math.max(w, h) * 0.85);
                bg.addColorStop(0, 'rgba(135,145,170,' + (0.018 * endFade).toFixed(3) + ')');
                bg.addColorStop(0.38, 'rgba(100,115,150,' + (0.05 * endFade).toFixed(3) + ')');
                bg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = bg;
                ctx.fillRect(0, 0, w, h);

                for (var s = 0; s < 170; s += 1) {
                    var sxSeed = noise((s + 1) * 3.1);
                    var sySeed = noise((s + 1) * 7.7);
                    var sx = sxSeed * w;
                    var sy = sySeed * h;
                    var twinkle = 0.45 + 0.55 * Math.abs(Math.sin(t * 0.8 + s));
                    var sa = (0.03 + twinkle * 0.16) * endFade;
                    var ss = 0.4 + noise((s + 3) * 11.7) * 1.2;
                    var cool = 200 + Math.floor(noise((s + 5) * 17.2) * 38);
                    ctx.fillStyle = 'rgba(' + cool + ',' + (cool + 8) + ',255,' + sa.toFixed(3) + ')';
                    ctx.fillRect(sx, sy, ss, ss);
                }
            }

            // Very low glow halo, almost absent.
            var lens = ctx.createRadialGradient(cx, cy, ringR * 1.02, cx, cy, outerR * 1.04);
            lens.addColorStop(0, 'rgba(220,220,220,0.004)');
            lens.addColorStop(0.5, 'rgba(185,185,185,0.014)');
            lens.addColorStop(1, 'rgba(120,120,120,0)');
            ctx.fillStyle = lens;
            ctx.beginPath();
            ctx.arc(cx, cy, outerR * 1.04, 0, Math.PI * 2);
            ctx.fill();

            // Back half of wobble ring/wisps.
            drawWobbleWrap(false);

            // Back half of one accretion ring (hidden by core later).
            drawAccretionBand(false);

            // Thin rough photon ring.
            drawScribbleEllipse(cx, cy, ringR, ringR * 0.98, 0, ringR * 0.03, 4, 0.24, Math.max(1, outerR * 0.0028));

            // Dark event horizon core.
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
            ctx.fill();

            // Front half of wobble ring/wisps.
            drawWobbleWrap(true);

            // Front half of the same accretion ring.
            drawAccretionBand(true);

            pageBlackholeFrame = window.requestAnimationFrame(render);
        }

        pageBlackholeFrame = window.requestAnimationFrame(render);
    }

    var blackholeIntelCards = [
        {
            title: 'Event Horizon',
            body: 'A black hole is so dense that at the event horizon, escape velocity exceeds the speed of light, so light cannot escape.',
            sourceLabel: 'NASA - Black Hole Basics',
            sourceUrl: 'https://science.nasa.gov/universe/black-holes/'
        },
        {
            title: 'First Direct Image (M87*)',
            body: 'In 2019, the Event Horizon Telescope released the first black hole image: M87*, about 55 million light-years away, with a mass of about 6.5 billion Suns.',
            sourceLabel: 'EHT Press Release, Apr 10 2019',
            sourceUrl: 'https://eventhorizontelescope.org/press-release-april-10-2019-astronomers-capture-first-image-black-hole',
            imageUrl: 'https://eventhorizontelescope.org/sites/g/files/omnuum3116/files/styles/hwp_1_1__1920x1920_scale/public/eht/files/20190410-78m-800x466.png?itok=J3ZgEDyD',
            imageAlt: 'Event Horizon Telescope image of M87 star black hole shadow and bright ring'
        },
        {
            title: 'Our Galactic Black Hole (Sgr A*)',
            body: 'In 2022, EHT released the first image of Sagittarius A* at the Milky Way center. It is about 4 million solar masses and about 27,000 light-years away.',
            sourceLabel: 'ESO/EHT Press Release, May 12 2022',
            sourceUrl: 'https://www.eso.org/public/news/eso2208-eht-mw/',
            imageUrl: 'https://cdn.eso.org/images/screen/eso2208-eht-mwa.jpg',
            imageAlt: 'First image of Sagittarius A star at the center of the Milky Way'
        },
        {
            title: 'How We Detect Them',
            body: 'Black holes are inferred through effects on nearby matter: glowing accretion disks, star orbits near galactic centers, gravitational lensing, and gravitational waves.',
            sourceLabel: 'NASA - Finding Black Holes',
            sourceUrl: 'https://science.nasa.gov/universe/black-holes/'
        },
        {
            title: 'Gravitational Waves',
            body: 'LIGO reported the first direct gravitational-wave detection (GW150914) in 2015 from a binary black hole merger, opening gravitational-wave astronomy.',
            sourceLabel: 'LIGO Press Release, GW150914',
            sourceUrl: 'https://www.ligo.caltech.edu/page/press-release-gw150914'
        }
    ];

    function mountBlackholeIntelWindows(overlay) {
        if (!overlay) {
            return;
        }

        var orbit = document.createElement('div');
        orbit.className = 'bhv2-intel-orbit';

        var total = blackholeIntelCards.length;
        for (var i = 0; i < total; i += 1) {
            var card = blackholeIntelCards[i];
            var article = document.createElement('article');
            article.className = 'bhv2-intel-card';
            article.style.setProperty('--bhv2-angle', String(Math.round((360 / total) * i)) + 'deg');
            article.style.setProperty('--bhv2-stagger', String(i * 90) + 'ms');

            var heading = document.createElement('h4');
            heading.className = 'bhv2-intel-title';
            heading.textContent = card.title;

            var reveal = document.createElement('div');
            reveal.className = 'bhv2-intel-reveal';

            if (card.imageUrl) {
                var imageWrap = document.createElement('div');
                imageWrap.className = 'bhv2-intel-image-wrap';

                var image = document.createElement('img');
                image.className = 'bhv2-intel-image';
                image.src = card.imageUrl;
                image.alt = card.imageAlt || (card.title + ' reference image');
                image.loading = 'lazy';
                image.decoding = 'async';
                image.referrerPolicy = 'no-referrer';
                image.addEventListener('error', function () {
                    if (this && this.parentElement) {
                        this.parentElement.style.display = 'none';
                    }
                });

                imageWrap.appendChild(image);
                reveal.appendChild(imageWrap);
            }

            var text = document.createElement('p');
            text.className = 'bhv2-intel-body';
            text.textContent = card.body;

            var source = document.createElement('a');
            source.className = 'bhv2-intel-source';
            source.href = card.sourceUrl;
            source.target = '_blank';
            source.rel = 'noopener noreferrer';
            source.textContent = 'Source: ' + card.sourceLabel;

            article.appendChild(heading);
            reveal.appendChild(text);
            reveal.appendChild(source);
            article.appendChild(reveal);
            orbit.appendChild(article);
        }

        overlay.appendChild(orbit);
    }

    function resolveAboutPageUrl() {
        var existingAboutLink = document.querySelector('a[href*="About.html"], a[href*="about.html"]');
        if (existingAboutLink && existingAboutLink.href) {
            return existingAboutLink.href;
        }

        var path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('/pages/projects/') !== -1) {
            return '../About.html';
        }
        if (path.indexOf('/pages/') !== -1) {
            return 'About.html';
        }
        return 'pages/About.html';
    }

    function runPageBlackhole() {
        if (pageBlackholeActive || document.body.classList.contains('bhv2-active')) {
            appendLine('Blackhole already active. Use "restore" or press Escape.', 'terminal-line terminal-line-system');
            return;
        }

        pageBlackholeActive = true;
        document.body.classList.add('bhv2-active');

        var centerX = window.innerWidth / 2;
        var centerY = window.innerHeight / 2;
        var targets = getBlackholeTargets();
        var terminalNode = document.getElementById('terminal');
        if (terminalNode) {
            targets = targets.filter(function (el) {
                return el !== terminalNode;
            });
            targets.unshift(terminalNode);
        }
        targets = targets.slice(0, 46);

        pageBlackholeOverlay = document.createElement('div');
        pageBlackholeOverlay.className = 'bhv2-overlay';
        pageBlackholeOverlay.innerHTML = [
            '<div class="bhv2-noise"></div>',
            '<div class="bhv2-tear"></div>',
            '<a class="bhv2-back-btn" href="#" aria-label="Back to About page">Back to About</a>',
            '<div class="bhv2-hole">',
            '<canvas class="bhv2-canvas" aria-hidden="true"></canvas>',
            '</div>',
            '<div class="bhv2-glyph-layer"></div>'
        ].join('');
        document.body.appendChild(pageBlackholeOverlay);

        var backBtn = pageBlackholeOverlay.querySelector('.bhv2-back-btn');
        if (backBtn) {
            backBtn.href = resolveAboutPageUrl();
        }

        mountBlackholeIntelWindows(pageBlackholeOverlay);

        startBlackholeCanvasRenderer(pageBlackholeOverlay.querySelector('.bhv2-canvas'));

        var glyphLayer = pageBlackholeOverlay.querySelector('.bhv2-glyph-layer');
        var glyphs = buildGlyphData(centerX, centerY, 220);
        glyphs.forEach(function (glyph) {
            var node = document.createElement('span');
            node.className = 'bhv2-glyph';
            node.textContent = glyph.ch;
            node.style.left = glyph.x + 'px';
            node.style.top = glyph.y + 'px';
            node.style.setProperty('--bhv2-x', glyph.dx.toFixed(2) + 'px');
            node.style.setProperty('--bhv2-y', glyph.dy.toFixed(2) + 'px');
            node.style.setProperty('--bhv2-spin', (220 + Math.random() * 560).toFixed(0) + 'deg');
            node.style.setProperty('--bhv2-gdelay', (4600 + (glyph.distance * 11) + (Math.random() * 2400)).toFixed(0) + 'ms');
            node.style.setProperty('--bhv2-gdur', (9000 + (Math.random() * 8000)).toFixed(0) + 'ms');
            glyphLayer.appendChild(node);
        });

        pageBlackholeTargets = targets.map(function (el) {
            var rect = el.getBoundingClientRect();
            var x = rect.left + (rect.width / 2);
            var y = rect.top + (rect.height / 2);
            var dx = centerX - x;
            var dy = centerY - y;
            var distance = Math.sqrt((dx * dx) + (dy * dy));

            el.classList.add('bhv2-target');
            el.style.setProperty('--bhv2-x', dx.toFixed(2) + 'px');
            el.style.setProperty('--bhv2-y', dy.toFixed(2) + 'px');
            el.style.setProperty('--bhv2-delay', (6000 + (distance * 8) + (Math.random() * 2200)).toFixed(0) + 'ms');
            el.style.setProperty('--bhv2-dur', (12000 + (Math.random() * 9000)).toFixed(0) + 'ms');

            return { element: el };
        });

        requestAnimationFrame(function () {
            if (!pageBlackholeOverlay) {
                return;
            }
            pageBlackholeOverlay.classList.add('is-live');
        });

        scheduleBlackholeTimer(function () {
            if (pageBlackholeOverlay) {
                pageBlackholeOverlay.classList.add('tear-open');
                appendLine('A tear opens in the center...', 'terminal-line terminal-line-system');
            }
        }, 600);

        scheduleBlackholeTimer(function () {
            if (pageBlackholeOverlay) {
                pageBlackholeOverlay.classList.add('hole-live');
                document.body.classList.add('bhv2-suck');
                appendLine('Pull initiated. Hold your ground.', 'terminal-line terminal-line-system');
            }
        }, 4200);

        scheduleBlackholeTimer(function () {
            if (pageBlackholeOverlay) {
                pageBlackholeOverlay.classList.add('void-live');
                appendLine('Event horizon stabilized.', 'terminal-line terminal-line-system');
            }
        }, 27000);

        scheduleBlackholeTimer(function () {
            if (pageBlackholeOverlay) {
                pageBlackholeOverlay.classList.add('cinematic-end');
                pageBlackholeOverlay.classList.add('intel-live');
                appendLine('Final approach. Scientific readouts online.', 'terminal-line terminal-line-system');
            }
        }, 31800);
    }

    function restorePageFromBlackhole() {
        var hadBlackhole = pageBlackholeActive || document.body.classList.contains('bhv2-active') || document.body.classList.contains('bhv2-suck');
        if (!hadBlackhole) {
            appendLine('Nothing to restore. Spacetime is stable.', 'terminal-line terminal-line-system');
            return;
        }

        clearBlackholeTimers();

        pageBlackholeTargets.forEach(function (target) {
            var el = target.element;
            el.classList.remove('bhv2-target');
            el.style.removeProperty('--bhv2-x');
            el.style.removeProperty('--bhv2-y');
            el.style.removeProperty('--bhv2-delay');
            el.style.removeProperty('--bhv2-dur');
        });

        pageBlackholeTargets = [];
        restoreBlackholeTextNodes();

        document.body.classList.remove('bhv2-active');
        document.body.classList.remove('bhv2-suck');

        if (pageBlackholeOverlay && pageBlackholeOverlay.parentElement) {
            pageBlackholeOverlay.parentElement.removeChild(pageBlackholeOverlay);
        }
        pageBlackholeOverlay = null;
        pageBlackholeActive = false;

        appendLine('Reality restored.', 'terminal-line terminal-line-system');
    }

    var quickQuotes = [
        'The best way to learn is to build.',
        'Small commits beat big rewrites.',
        'Ship, gather feedback, iterate.',
        'Clarity first, cleverness second.',
        'Code hard, stay humble, ship often.'
    ];

    function runCommand(rawInput) {
        var input = rawInput.trim();
        if (!input) {
            return;
        }

        appendLine('~$ ' + input, 'terminal-line terminal-line-command');

        var parts = input.split(/\s+/);
        var command = (parts[0] || '').toLowerCase();
        var args = parts.slice(1);
        var response = '';

        if (command === 'clear' || command === 'cls') {
            outputDiv.textContent = '';
            return;
        }

        switch (command) {
            case 'help': {
                response = [
                    'Secret Terminal Command Pack:',
                    'Core: help, clear, history, date, time, ping, exit',
                    'Showtime: spinner, matrix, hyperdrive, boot, glitch, neon, blackhole',
                    'Extra: joke, fortune, quote, ascii, restore',
                    'Tip: start with "hyperdrive" or "boot"'
                ].join('\n');
                break;
            }
            case 'date':
                response = new Date().toLocaleDateString();
                break;
            case 'time':
                response = new Date().toLocaleTimeString();
                break;
            case 'history': {
                if (history.length === 0) {
                    response = 'No command history yet.';
                } else {
                    var recent = history.slice(-12);
                    appendLines(recent.map(function (cmd, idx) {
                        return String(history.length - recent.length + idx + 1) + '  ' + cmd;
                    }));
                    return;
                }
                break;
            }
            case 'joke':
                response = 'Why do programmers hate nature? Too many bugs.';
                break;
            case 'fortune':
                response = '"Talk is cheap. Show me the code." - Linus Torvalds';
                break;
            case 'quote':
                response = quickQuotes[Math.floor(Math.random() * quickQuotes.length)];
                break;
            case 'ascii':
                response = '   /\\_/\\\n  ( o.o )\n   > ^ <\nCyber cat online.';
                break;
            case 'ping':
                response = 'pong';
                break;
            case 'restore':
            case 'reset':
                restorePageFromBlackhole();
                return;
            case 'spinner':
                runSpinnerAnimation();
                return;
            case 'matrix':
                runMatrixAnimation();
                return;
            case 'hyperdrive':
            case 'warp':
                runHyperdriveAnimation();
                return;
            case 'boot':
                runBootAnimation();
                return;
            case 'glitch':
                runGlitchAnimation();
                return;
            case 'neon':
                runNeonAnimation();
                return;
            case 'blackhole':
            case 'bh':
                runPageBlackhole();
                return;
            case 'exit':
                closeTerminal();
                return;
            default:
                response = 'Unknown command: ' + input + '. Try "help".';
        }

        response.split('\n').forEach(function (line) {
            appendLine(line, 'terminal-line');
        });
    }

    trigger.addEventListener('click', function (event) {
        event.preventDefault();
        if (!isOpen) {
            openTerminal();
        } else {
            focusInput();
        }
    });

    if (header) {
        header.addEventListener('mousedown', function (event) {
            if (event.target.classList.contains('circle')) {
                return;
            }

            if (isMaximized) {
                return;
            }

            isDragging = true;
            offsetX = event.clientX - terminal.offsetLeft;
            offsetY = event.clientY - terminal.offsetTop;
        });
    }

    document.addEventListener('mousemove', function (event) {
        if (!isDragging) {
            return;
        }

        var nextLeft = event.clientX - offsetX;
        var nextTop = event.clientY - offsetY;
        var maxLeft = Math.max(0, window.innerWidth - terminal.offsetWidth);
        var maxTop = Math.max(0, window.innerHeight - terminal.offsetHeight);
        terminal.style.left = Math.min(Math.max(0, nextLeft), maxLeft) + 'px';
        terminal.style.top = Math.min(Math.max(0, nextTop), maxTop) + 'px';
    });

    document.addEventListener('mouseup', function () {
        isDragging = false;
    });

    window.addEventListener('resize', function () {
        if (isOpen && !isMaximized) {
            clampTerminalPosition();
        }
    });

    if (redBtn) {
        redBtn.addEventListener('click', closeTerminal);
    }

    if (yellowBtn) {
        yellowBtn.addEventListener('click', closeTerminal);
    }

    if (greenBtn) {
        greenBtn.addEventListener('click', toggleMaximize);
    }

    terminalInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            var rawInput = terminalInput.textContent || '';

            if (rawInput.trim()) {
                history.push(rawInput.trim());
            }
            historyIndex = history.length;

            runCommand(rawInput);
            clearInput();
            focusInput();
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (history.length === 0) {
                return;
            }

            historyIndex = Math.max(0, historyIndex - 1);
            terminalInput.textContent = history[historyIndex] || '';
            placeCaretAtEnd(terminalInput);
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (history.length === 0) {
                return;
            }

            historyIndex = Math.min(history.length, historyIndex + 1);
            terminalInput.textContent = history[historyIndex] || '';
            placeCaretAtEnd(terminalInput);
            return;
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && document.body.classList.contains('bhv2-active')) {
            restorePageFromBlackhole();
            return;
        }

        if (event.key === 'Escape' && isOpen) {
            closeTerminal();
        }
    });

    terminal.addEventListener('mousedown', function () {
        if (isOpen) {
            focusInput();
        }
    });
});
