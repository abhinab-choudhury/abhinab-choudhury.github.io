let scene, camera, renderer, composer;
let particles = [];
let geometries = [];
let clock = new THREE.Clock();
let mouseX = 0, mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let currentEffect = 'particles';
let frameCount = 0;
let lastTime = 0;
let audioContext, analyser, frequencyData;
let isAudioEnabled = false;

let particleSystem, geometryGroup, matrixEffect, galaxyEffect;

function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 1, 2000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 1000;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    document.getElementById('scene-container').appendChild(renderer.domElement);

    initParticleSystem();
    initGeometryEffect();
    initMatrixEffect();
    initGalaxyEffect();

    addLights();

    addEventListeners();

    animate();

    hideLoadingScreen();
}

function showLoadingProgress() {
    let progress = 0;
    const progressBar = document.querySelector('.progress-bar');
    const progressPercent = document.querySelector('.loading-percent');

    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;

        progressBar.style.width = progress + '%';
        progressPercent.textContent = Math.round(progress) + '%';

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                init();
            }, 500);
        }
    }, 100);
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 1000);
}

function initParticleSystem() {
    const particleCount = 15000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        positions[i3] = (Math.random() - 0.5) * 4000;
        positions[i3 + 1] = (Math.random() - 0.5) * 4000;
        positions[i3 + 2] = (Math.random() - 0.5) * 4000;

        const hue = Math.random();
        const color = new THREE.Color().setHSL(hue, 1, 0.5);
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;

        sizes[i] = Math.random() * 4 + 1;

        velocities[i3] = (Math.random() - 0.5) * 2;
        velocities[i3 + 1] = (Math.random() - 0.5) * 2;
        velocities[i3 + 2] = (Math.random() - 0.5) * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            mouse: { value: new THREE.Vector2() },
            pointTexture: { value: new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==') }
        },
        vertexShader: `
            uniform float time;
            uniform vec2 mouse;
            attribute float size;
            attribute vec3 velocity;
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                vColor = color;
                
                vec3 pos = position;
                pos += velocity * time * 0.1;
                
                vec3 mousePos = vec3(mouse * 1000.0, 0.0);
                float dist = distance(pos, mousePos);
                if (dist < 200.0) {
                    vec3 force = normalize(pos - mousePos) * (200.0 - dist) * 0.5;
                    pos += force;
                }
                
                pos.y += sin(pos.x * 0.01 + time) * 30.0;
                pos.z += cos(pos.x * 0.01 + time) * 30.0;
                
                vAlpha = 1.0 - (dist / 2000.0);
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                if (dist > 0.5) discard;
                
                float alpha = (1.0 - dist * 2.0) * vAlpha;
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        vertexColors: true
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
}

function initGeometryEffect() {
    geometryGroup = new THREE.Group();

    const geometries = [
        new THREE.IcosahedronGeometry(50, 1),
        new THREE.OctahedronGeometry(50),
        new THREE.TetrahedronGeometry(50),
        new THREE.DodecahedronGeometry(50),
    ];

    const materials = [
        new THREE.MeshPhongMaterial({ 
            color: 0x00ffff, 
            wireframe: true,
            transparent: true,
            opacity: 0.8
        }),
        new THREE.MeshPhongMaterial({ 
            color: 0xff00ff, 
            wireframe: true,
            transparent: true,
            opacity: 0.8
        }),
        new THREE.MeshPhongMaterial({ 
            color: 0xffff00, 
            wireframe: true,
            transparent: true,
            opacity: 0.8
        }),
        new THREE.MeshPhongMaterial({ 
            color: 0x00ff00, 
            wireframe: true,
            transparent: true,
            opacity: 0.8
        })
    ];

    for (let i = 0; i < 20; i++) {
        const geometry = geometries[i % geometries.length];
        const material = materials[i % materials.length];
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(
            (Math.random() - 0.5) * 2000,
            (Math.random() - 0.5) * 2000,
            (Math.random() - 0.5) * 2000
        );

        mesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        mesh.userData = {
            rotationSpeed: {
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02
            }
        };

        geometryGroup.add(mesh);
    }

    geometryGroup.visible = false;
    scene.add(geometryGroup);
}

function initMatrixEffect() {
    matrixEffect = new THREE.Group();

    const textGeometry = new THREE.TextGeometry('HELLO WORLD', {
        font: null,
        size: 50,
        height: 10,
    });

    for (let i = 0; i < 100; i++) {
        const geometry = new THREE.BoxGeometry(2, 20, 2);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: Math.random()
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            (Math.random() - 0.5) * 1000,
            (Math.random() - 0.5) * 1000,
            (Math.random() - 0.5) * 1000
        );

        mesh.userData = {
            originalOpacity: material.opacity,
            speed: Math.random() * 0.02 + 0.01
        };

        matrixEffect.add(mesh);
    }

    matrixEffect.visible = false;
    scene.add(matrixEffect);
}

function initGalaxyEffect() {
    galaxyEffect = new THREE.Group();

    const starCount = 10000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        
        const radius = Math.random() * 800 + 200;
        const angle = Math.random() * Math.PI * 2;
        const spiral = angle + radius * 0.01;
        
        positions[i3] = Math.cos(spiral) * radius;
        positions[i3 + 1] = (Math.random() - 0.5) * 100;
        positions[i3 + 2] = Math.sin(spiral) * radius;

        const distance = Math.sqrt(positions[i3] ** 2 + positions[i3 + 2] ** 2);
        const hue = (distance / 800) * 0.6; 
        const color = new THREE.Color().setHSL(hue, 1, 0.8);
        
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true
    });

    const galaxy = new THREE.Points(geometry, material);
    galaxyEffect.add(galaxy);

    galaxyEffect.visible = false;
    scene.add(galaxyEffect);
}

function addLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x00ffff, 1);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0xff00ff, 1, 1000);
    pointLight1.position.set(-200, -200, 100);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffff00, 1, 1000);
    pointLight2.position.set(200, 200, -100);
    scene.add(pointLight2);
}

function addEventListeners() {
    window.addEventListener('resize', onWindowResize);

    document.addEventListener('mousemove', onMouseMove);

    document.querySelectorAll('.element-card').forEach(card => {
        card.addEventListener('click', () => {
            const action = card.getAttribute('data-action');
            switchEffect(action);
        });
    });

    document.getElementById('audio-toggle').addEventListener('click', toggleAudio);

    document.getElementById('fullscreen-toggle').addEventListener('click', toggleFullscreen);

    document.querySelectorAll('.letter').forEach(letter => {
        letter.addEventListener('mouseenter', () => {
            createLetterExplosion(letter);
        });
    });

    document.addEventListener('keydown', onKeyDown);
}

function switchEffect(effect) {
    currentEffect = effect;

    particleSystem.visible = false;
    geometryGroup.visible = false;
    matrixEffect.visible = false;
    galaxyEffect.visible = false;

    switch(effect) {
        case 'particles':
            particleSystem.visible = true;
            break;
        case 'geometry':
            geometryGroup.visible = true;
            break;
        case 'matrix':
            matrixEffect.visible = true;
            break;
        case 'galaxy':
            galaxyEffect.visible = true;
            break;
    }

    document.querySelectorAll('.element-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`[data-action="${effect}"]`).classList.add('active');
}

function createLetterExplosion(letterElement) {
    const rect = letterElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.background = '#00ffff';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '10001';
        particle.style.boxShadow = '0 0 10px #00ffff';
        
        document.body.appendChild(particle);

        const angle = (i / 20) * Math.PI * 2;
        const velocity = 100 + Math.random() * 100;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;

        gsap.to(particle, {
            x: vx,
            y: vy,
            opacity: 0,
            scale: 0,
            duration: 1,
            ease: "power2.out",
            onComplete: () => {
                document.body.removeChild(particle);
            }
        });
    }
}

function onMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) / windowHalfX;
    mouseY = -(event.clientY - windowHalfY) / windowHalfY;

    if (particleSystem && particleSystem.material.uniforms) {
        particleSystem.material.uniforms.mouse.value.set(mouseX, mouseY);
    }
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    switch(event.code) {
        case 'Digit1':
            switchEffect('particles');
            break;
        case 'Digit2':
            switchEffect('geometry');
            break;
        case 'Digit3':
            switchEffect('matrix');
            break;
        case 'Digit4':
            switchEffect('galaxy');
            break;
        case 'Space':
            event.preventDefault();
            toggleAudio();
            break;
    }
}

function toggleAudio() {
    if (!isAudioEnabled) {
        initAudio();
    } else {
        stopAudio();
    }
}

function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        oscillator.start();
        
        isAudioEnabled = true;
        document.querySelector('.audio-icon').textContent = '🔊';
    } catch (e) {
        console.log('Audio not supported');
    }
}

function stopAudio() {
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    isAudioEnabled = false;
    document.querySelector('.audio-icon').textContent = '🔇';
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        document.querySelector('.fullscreen-icon').textContent = '⛶';
    } else {
        document.exitFullscreen();
        document.querySelector('.fullscreen-icon').textContent = '⛶';
    }
}

function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();
    frameCount++;

    const currentTime = performance.now();
    if (currentTime >= lastTime + 1000) {
        document.getElementById('fps').textContent = frameCount;
        frameCount = 0;
        lastTime = currentTime;
    }

    camera.position.x += (mouseX * 100 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 100 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    updateCurrentEffect(time);

    updateStats();

    renderer.render(scene, camera);
}

function updateCurrentEffect(time) {
    switch(currentEffect) {
        case 'particles':
            updateParticles(time);
            break;
        case 'geometry':
            updateGeometry(time);
            break;
        case 'matrix':
            updateMatrix(time);
            break;
        case 'galaxy':
            updateGalaxy(time);
            break;
    }
}

function updateParticles(time) {
    if (particleSystem && particleSystem.material.uniforms) {
        particleSystem.material.uniforms.time.value = time;
        particleSystem.rotation.y = time * 0.1;
    }
}

function updateGeometry(time) {
    geometryGroup.children.forEach(mesh => {
        mesh.rotation.x += mesh.userData.rotationSpeed.x;
        mesh.rotation.y += mesh.userData.rotationSpeed.y;
        mesh.rotation.z += mesh.userData.rotationSpeed.z;
        
        mesh.position.y += Math.sin(time + mesh.position.x * 0.001) * 0.5;
    });
}

function updateMatrix(time) {
    matrixEffect.children.forEach((mesh, index) => {
        mesh.material.opacity = mesh.userData.originalOpacity * 
            (0.5 + 0.5 * Math.sin(time * mesh.userData.speed + index));
        mesh.position.y += mesh.userData.speed * 10;
        
        if (mesh.position.y > 500) {
            mesh.position.y = -500;
        }
    });
}

function updateGalaxy(time) {
    galaxyEffect.rotation.y = time * 0.1;
    galaxyEffect.children[0].rotation.z = time * 0.05;
}

function updateStats() {
    let triangles = 0;
    let particles = 0;

    scene.traverse(object => {
        if (object.geometry) {
            if (object.geometry.attributes.position) {
                if (object.type === 'Points') {
                    particles += object.geometry.attributes.position.count;
                } else {
                    triangles += object.geometry.attributes.position.count / 3;
                }
            }
        }
    });

    document.getElementById('triangles').textContent = Math.round(triangles);
    document.getElementById('particles').textContent = Math.round(particles);
}

document.addEventListener('DOMContentLoaded', () => {
    showLoadingProgress();
});