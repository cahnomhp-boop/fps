import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import nipplejs from 'nipplejs';
import { SoundManager } from './Audio.js';

export class Player {
    constructor(scene, physicsWorld, domElement) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.domElement = domElement;
        this.sound = new SoundManager();

        this.isLocked = false;
        this.onGround = false;
        this.inventory = {
            medkit: 0,
            ammo: 30
        };
        this.health = 100;

        // Input State
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;

        this.initCamera();
        this.initPhysics();
        this.initInputs();
        this.initMobileControls();

        // Start high for parachute
        this.body.position.set(0, 200, 0);
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.pitchObject = new THREE.Object3D();
        this.pitchObject.add(this.camera);
        this.yawObject = new THREE.Object3D();
        this.yawObject.position.y = 1.6; // Eyes height
        this.yawObject.add(this.pitchObject);
        this.scene.add(this.yawObject);
    }

    initPhysics() {
        // Player Body (Sphere for simple movement)
        const radius = 1;
        this.shape = new CANNON.Sphere(radius);
        this.body = new CANNON.Body({ mass: 70 });
        this.body.addShape(this.shape);
        this.body.position.set(0, 10, 0);
        this.body.linearDamping = 0.9;
        this.body.angularFactor.set(0, 0, 0); // No rotation physics
        this.body.userData = { player: this };
        this.physicsWorld.addBody(this.body);
    }

    initInputs() {
        // Pointer Lock
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyW': this.moveForward = true; break;
                case 'KeyA': this.moveLeft = true; break;
                case 'KeyS': this.moveBackward = true; break;
                case 'KeyD': this.moveRight = true; break;
                case 'Space':
                    if (this.onGround) this.jump();
                    break;
                case 'KeyF': this.tryInteract(); break;
            }
        });

        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyW': this.moveForward = false; break;
                case 'KeyA': this.moveLeft = false; break;
                case 'KeyS': this.moveBackward = false; break;
                case 'KeyD': this.moveRight = false; break;
            }
        });

        // Mouse Look
        document.addEventListener('mousemove', (event) => {
            if (this.isLocked) {
                const movementX = event.movementX || 0;
                const movementY = event.movementY || 0;
                this.yawObject.rotation.y -= movementX * 0.002;
                this.pitchObject.rotation.x -= movementY * 0.002;
                this.pitchObject.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitchObject.rotation.x));
            }
        });

        document.addEventListener('click', () => {
            if (!this.isLocked && !this.isMobile()) {
                this.domElement.requestPointerLock();
            } else {
                this.shoot();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === this.domElement;
        });
    }

    isMobile() {
        return window.innerWidth < 1024;
    }

    initMobileControls() {
        if (!this.isMobile()) return;

        // Joystick
        const manager = nipplejs.create({
            zone: document.getElementById('joystick-zone'),
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'white'
        });

        manager.on('move', (evt, data) => {
            const forward = Math.sin(data.angle.radian);
            const right = Math.cos(data.angle.radian);

            this.moveForward = forward > 0.5;
            this.moveBackward = forward < -0.5;
            this.moveRight = right > 0.5;
            this.moveLeft = right < -0.5;
        });

        manager.on('end', () => {
            this.moveForward = false;
            this.moveBackward = false;
            this.moveLeft = false;
            this.moveRight = false;
        });

        // Touch Look
        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('touchstart', (e) => {
            if (e.target.closest('.mobile-control')) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('.mobile-control')) return;
            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;

            this.yawObject.rotation.y -= deltaX * 0.005;
            this.pitchObject.rotation.x -= deltaY * 0.005;
            this.pitchObject.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitchObject.rotation.x));
        });

        // Buttons
        document.getElementById('shoot-btn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.shoot();
        });
        document.getElementById('jump-btn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.onGround) this.jump();
        });
        document.getElementById('interact-btn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.tryInteract();
        });
    }

    jump() {
        this.body.velocity.y = 8;
        this.onGround = false;
        this.sound.playJump();
    }

    shoot() {
        if (this.inventory.ammo > 0) {
            this.inventory.ammo--;
            this.sound.playShoot();
            const ammoDisplay = document.getElementById('ammo-display');
            if (ammoDisplay) ammoDisplay.innerText = `Ammo: ${this.inventory.ammo}`;

            // Raycast Shoot
            // Create ray from camera center
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

            // Visual Trail
            const trailGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3().copy(this.body.position).add(new THREE.Vector3(0, 0.6, 0)), // Eye pos approximate
                new THREE.Vector3().copy(this.body.position).add(new THREE.Vector3(0, 0.6, 0)).add(raycaster.ray.direction.clone().multiplyScalar(100))
            ]);
            const trailMat = new THREE.LineBasicMaterial({ color: 0xffff00 });
            const trail = new THREE.Line(trailGeo, trailMat);
            this.scene.add(trail);
            setTimeout(() => { this.scene.remove(trail); }, 100);

            // Check hit against bots
            // We need a list of bot meshes. This is a bit tricky since Player doesn't know about World directly, 
            // but we can pass it or query scene.
            // For prototype, let's just query scene children or assume we get bots passed in update, 
            // but shoot() is event driven.
            // Better: Perform raycast in main loop or passed down? 
            // Let's simple query all meshes in scene for now, filter for bots
            const intersects = raycaster.intersectObjects(this.scene.children);

            for (let i = 0; i < intersects.length; i++) {
                const obj = intersects[i].object;
                // Traverse up to find if it belongs to a Bot?
                // Or easier: Bot meshes have specific property we added?
                // We didn't add reference. 
                // Let's verify hit visual first. logic for damage needs bot reference.

                // Hacky way: Check if object geometry is CapsuleGeometry (Bot)
                if (obj.geometry.type === 'CapsuleGeometry') {
                    // Hit a bot
                    // We need to access the Bot instance from the mesh. 
                    // Ideally we attach it to userData.
                    if (obj.userData && obj.userData.bot) {
                        obj.userData.bot.takeDamage(20);
                        showMsg("Hit Enemy!");
                    }
                }
            }
        }
    }

    tryInteract() {
        if (this.nearbyLoot) {
            this.nearbyLoot.pickup(this);
            this.sound.playPickup();
            this.nearbyLoot = null;
            document.getElementById('interact-btn').style.display = 'none';
        }
    }

    update(dt, lootItems) {
        // Sync Camera
        this.yawObject.position.copy(this.body.position);
        this.yawObject.position.y += 0.6; // Eye offset

        // Movement Logic
        const speed = 15;
        const velocity = new THREE.Vector3();

        if (this.moveForward) velocity.z -= speed;
        if (this.moveBackward) velocity.z += speed;
        if (this.moveLeft) velocity.x -= speed;
        if (this.moveRight) velocity.x += speed;

        // Rotate velocity by camera yaw
        velocity.applyEuler(new THREE.Euler(0, this.yawObject.rotation.y, 0));

        this.body.velocity.x = velocity.x;
        this.body.velocity.z = velocity.z;

        // Ground Check
        const raycaster = new CANNON.Ray(this.body.position, new CANNON.Vec3(0, -1, 0));
        // Simple ground check approximation
        if (this.body.position.y < 1.1) {
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // Parachute Logic
        if (!this.onGround && this.body.position.y > 5) {
            // Apply drag if SPACE is held or just falling fast
            // For this game, let's make it auto-deploy if falling too fast or toggle?
            // Let's make Spacebar toggle "Slow Fall"
            // In initInputs, Space handles Jump. Let's reuse Space for "Gliding" if in air.
        }

        // Custom Air Drag for Parachute effect (if Space held)
        if (!this.onGround && this.canJump) { // reusing canJump flag from spacebar listener?
            // Wait, initInputs sets 'jump' immediately. We need a 'holdingJump' state.
        }

        // Let's refactor input handling slightly in a separate edit,
        // for now let's just add the drag if velocity.y is very negative and we are high up
        // Auto-parachute if falling fast?

        if (this.body.velocity.y < -10 && this.body.position.y > 10) {
            // Limiting terminal velocity
            this.body.velocity.y += 20 * dt; // Upward damping
            // showMsg("Parachute Active"); // Assuming showMsg is defined elsewhere or will be added
        }

        // Loot Check
        let foundLoot = null;
        for (const loot of lootItems) {
            const dist = this.body.position.distanceTo(new CANNON.Vec3(loot.mesh.position.x, loot.mesh.position.y, loot.mesh.position.z));
            if (dist < 3) {
                foundLoot = loot;
                break;
            }
        }

        this.nearbyLoot = foundLoot;
        const interactBtn = document.getElementById('interact-btn');
        if (this.nearbyLoot) {
            // Show prompt
            if (this.isMobile()) interactBtn.style.display = 'flex';
            // On PC maybe show text?
        } else {
            if (this.isMobile()) interactBtn.style.display = 'none';
        }
    }

    takeDamage(amount) {
        this.health -= amount;

        // Damage Flash
        const overlay = document.getElementById('damage-overlay');
        overlay.style.opacity = 0.5;
        setTimeout(() => { overlay.style.opacity = 0; }, 200);

        if (this.health <= 0) {
            this.health = 0;
            showEndGame("GAME OVER", "red");
            this.isLocked = false;
            document.exitPointerLock();
        }
        document.getElementById('health-text').innerText = `${Math.ceil(this.health)} HP`;
        document.getElementById('health-bar-fill').style.width = `${Math.max(0, this.health)}%`;
    }
}

function showMsg(text) {
    const el = document.getElementById('game-msg-text');
    const container = document.getElementById('message-area');
    if (el) {
        el.innerText = text;
        container.style.opacity = 1;
        setTimeout(() => {
            container.style.opacity = 0;
        }, 2000);
    }
}

function showEndGame(text, color) {
    const el = document.getElementById('game-msg-text');
    const container = document.getElementById('message-area');
    const btn = document.getElementById('restart-btn');

    if (el) {
        el.innerText = text;
        el.style.color = color || "white";
        container.style.opacity = 1;
        container.style.pointerEvents = "auto";
        btn.style.display = "block";
    }
}
