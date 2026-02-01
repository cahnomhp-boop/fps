import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { LootManager } from './Loot.js';
import { BotManager } from './Bot.js';

export class World {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.lootManager = new LootManager(scene, physicsWorld);
        this.botManager = new BotManager(scene, physicsWorld); // Spawn bots
        this.lootItems = this.lootManager.items;

        this.createTerrain();
        this.createBuildings();
        this.createTrees();
    }

    createTrees() {
        const treeCount = 50;
        for (let i = 0; i < treeCount; i++) {
            const x = (Math.random() - 0.5) * 800;
            const z = (Math.random() - 0.5) * 800;

            // Log
            const logGeo = new THREE.CylinderGeometry(1, 1, 6);
            const logMat = new THREE.MeshStandardMaterial({ color: 0x4d2926 });
            const log = new THREE.Mesh(logGeo, logMat);
            log.position.set(x, 3, z);
            log.castShadow = true;
            this.scene.add(log);

            // Leaves
            const leavesGeo = new THREE.ConeGeometry(5, 10, 8);
            const leavesMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
            const leaves = new THREE.Mesh(leavesGeo, leavesMat);
            leaves.position.set(x, 8, z);
            leaves.castShadow = true;
            this.scene.add(leaves);

            // Valid collision
            const shape = new CANNON.Cylinder(1, 1, 6, 8);
            const body = new CANNON.Body({ mass: 0 });
            body.addShape(shape);
            body.position.set(x, 3, z);
            this.physicsWorld.addBody(body);
        }
    }

    createTerrain() {
        // Ground visual
        const size = 1000;
        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshStandardMaterial({ color: 0x3a7e3a });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Ground physics
        const shape = new CANNON.Plane();
        const body = new CANNON.Body({ mass: 0, material: new CANNON.Material() });
        body.addShape(shape);
        body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.physicsWorld.addBody(body);
    }

    createBuildings() {
        // Create random simple houses
        for (let i = 0; i < 15; i++) {
            const x = (Math.random() - 0.5) * 400;
            const z = (Math.random() - 0.5) * 400;
            this.createHouse(x, z);
        }
    }

    createHouse(x, z) {
        // Simple Cube House
        const width = 10;
        const height = 6;
        const depth = 10;
        const wallThickness = 0.5;

        const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

        // Visuals (Walls) - Simplified as one block for now, but hollow would be better. 
        // For prototype, let's make 4 walls.

        this.createWall(x, 3, z - 5, 10, 6, 0.5); // Back
        this.createWall(x - 5, 3, z, 0.5, 6, 10); // Left
        this.createWall(x + 5, 3, z, 0.5, 6, 10); // Right

        // Front with door hole
        this.createWall(x - 3, 3, z + 5, 4, 6, 0.5);
        this.createWall(x + 3, 3, z + 5, 4, 6, 0.5);
        this.createWall(x, 5, z + 5, 2, 2, 0.5); // Top of door

        // Roof
        const roofGeo = new THREE.ConeGeometry(9, 4, 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x552200 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(x, 8, z);
        roof.rotation.y = Math.PI / 4;
        this.scene.add(roof);

        // Spawn Loot inside
        this.lootManager.spawnLoot(x, 1, z);
    }

    createWall(x, y, z, w, h, d) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2));
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.set(x, y, z);
        this.physicsWorld.addBody(body);
    }

    update(dt, playerBody) {
        this.lootManager.update(dt);
        this.botManager.update(dt, playerBody);

        // Win Condition
        const aliveBots = this.botManager.bots.filter(b => b.health > 0).length;
        const aliveEl = document.getElementById('alive-count');
        if (aliveEl) aliveEl.innerText = aliveBots;

        if (aliveBots === 0 && !this.gameOver) {
            this.gameOver = true;
            document.getElementById('game-msg-text').innerText = "BOOYAH! YOU WIN!";
            document.getElementById('game-msg-text').style.color = "#ffcc00";
            document.getElementById('message-area').style.opacity = 1;
            document.getElementById('message-area').style.pointerEvents = "auto";
            document.getElementById('restart-btn').style.display = "block";
        }
    }
}
