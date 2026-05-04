import './style.css'
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Basic Setup
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020611, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 45;
camera.position.x = 12;

const canvas = document.querySelector('#bg-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Post-Processing (Bloom)
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.1;
bloomPass.strength = 1.2;
bloomPass.radius = 0.5;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0x00e5ff, 2000, 200);
pointLight.position.set(20, 20, 20);
scene.add(pointLight);

const pointLight2 = new THREE.PointLight(0x0077ff, 1500, 200);
pointLight2.position.set(-20, -20, 20);
scene.add(pointLight2);

// DNA Group
const dnaGroup = new THREE.Group();
scene.add(dnaGroup);

// Materials
const strandMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x00e5ff,
    emissive: 0x004455,
    emissiveIntensity: 0.5,
    metalness: 0.5,
    roughness: 0.1,
    transmission: 0.8,
    thickness: 1.5,
    clearcoat: 1.0
});

const pairMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x111111,
    metalness: 0.8,
    roughness: 0.2
});

// Build DNA
const numBasePairs = 45;
const heightPerPair = 1.4;
const radius = 7;
const twist = 0.25;

for (let i = -numBasePairs/2; i < numBasePairs/2; i++) {
    const y = i * heightPerPair;
    const angle = i * twist;

    const x1 = Math.cos(angle) * radius;
    const z1 = Math.sin(angle) * radius;
    
    const x2 = Math.cos(angle + Math.PI) * radius;
    const z2 = Math.sin(angle + Math.PI) * radius;

    const sphereGeo = new THREE.SphereGeometry(1.4, 32, 32);
    
    const node1 = new THREE.Mesh(sphereGeo, strandMaterial);
    node1.position.set(x1, y, z1);
    dnaGroup.add(node1);

    const node2 = new THREE.Mesh(sphereGeo, strandMaterial);
    node2.position.set(x2, y, z2);
    dnaGroup.add(node2);

    if (i % 2 === 0) {
        const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
        const cylGeo = new THREE.CylinderGeometry(0.35, 0.35, dist, 16);
        const pair = new THREE.Mesh(cylGeo, pairMaterial);
        
        pair.position.set((x1 + x2)/2, y, (z1 + z2)/2);
        
        const start = new THREE.Vector3(x1, y, z1);
        const end = new THREE.Vector3(x2, y, z2);
        
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const axis = new THREE.Vector3(0, 1, 0);
        pair.quaternion.setFromUnitVectors(axis, direction);
        
        dnaGroup.add(pair);
    }
}

dnaGroup.position.set(18, 0, -5);
dnaGroup.rotation.z = Math.PI / 10;

// Cellular Particles
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 400;
const posArray = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 150;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMaterial = new THREE.PointsMaterial({
    size: 0.6,
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// Smooth Mouse Interaction
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX);
    mouseY = (event.clientY - windowHalfY);
});

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    dnaGroup.rotation.y = elapsedTime * 0.15;
    dnaGroup.position.y = Math.sin(elapsedTime * 0.8) * 1.5;

    particlesMesh.rotation.y = elapsedTime * 0.02;
    particlesMesh.rotation.x = elapsedTime * 0.01;

    targetX = mouseX * 0.015;
    targetY = mouseY * 0.015;
    
    camera.position.x += (targetX + 12 - camera.position.x) * 0.02;
    camera.position.y += (-targetY - camera.position.y) * 0.02;
    camera.lookAt(scene.position);

    composer.render();
}

animate();

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Theme Toggle Logic
const themeToggle = document.getElementById('theme-toggle');
let isLightMode = false;

if (localStorage.getItem('theme') === 'light') {
    enableLightMode();
}

themeToggle.addEventListener('click', () => {
    if (isLightMode) {
        disableLightMode();
    } else {
        enableLightMode();
    }
});

function enableLightMode() {
    document.body.classList.add('light-mode');
    themeToggle.textContent = '🌙';
    isLightMode = true;
    localStorage.setItem('theme', 'light');
    
    // Update ThreeJS Scene for Light Mode
    scene.fog.color.setHex(0xf0f4f8);
    bloomPass.strength = 0.4;
    strandMaterial.emissive.setHex(0x002233);
    particlesMaterial.color.setHex(0x0088cc);
    particlesMaterial.blending = THREE.NormalBlending;
}

function disableLightMode() {
    document.body.classList.remove('light-mode');
    themeToggle.textContent = '☀️';
    isLightMode = false;
    localStorage.setItem('theme', 'dark');
    
    // Restore ThreeJS Scene for Dark Mode
    scene.fog.color.setHex(0x020611);
    bloomPass.strength = 1.2;
    strandMaterial.emissive.setHex(0x004455);
    particlesMaterial.color.setHex(0x00e5ff);
    particlesMaterial.blending = THREE.AdditiveBlending;
}

// Auth Logic
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authMessage = document.getElementById('auth-message');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');

// Tab Switching
tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    authMessage.textContent = '';
});

tabSignup.addEventListener('click', () => {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    authMessage.textContent = '';
});

// API Base URL
const API_URL = ''; // Uses relative path for Vercel deployment

// Handle Signup
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;

    authMessage.textContent = 'Creating account...';
    authMessage.style.color = 'var(--primary-color)';

    try {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            authMessage.textContent = '✅ ' + data.message;
            authMessage.style.color = '#00ff88';
            signupForm.reset();
            // Automatically switch to login after 2s
            setTimeout(() => tabLogin.click(), 2000);
        } else {
            authMessage.textContent = '❌ ' + (data.message || 'Signup failed');
            authMessage.style.color = '#ff4444';
        }
    } catch (error) {
        authMessage.textContent = '❌ Server error';
        authMessage.style.color = '#ff4444';
    }
});

// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    authMessage.textContent = 'Authenticating...';
    authMessage.style.color = 'var(--primary-color)';

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            authMessage.textContent = '✅ ' + data.message;
            authMessage.style.color = '#00ff88';
            loginForm.reset();
            // You could redirect here
            console.log('Logged in as:', data.username);
        } else {
            authMessage.textContent = '❌ ' + (data.message || 'Login failed');
            authMessage.style.color = '#ff4444';
        }
    } catch (error) {
        authMessage.textContent = '❌ Server error';
        authMessage.style.color = '#ff4444';
    }
});
