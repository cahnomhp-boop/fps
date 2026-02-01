import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class LootManager {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.items = [];
    }

    spawnLoot(x, y, z) {
        const type = Math.random() > 0.5 ? 'weapon' : 'medkit';
        const item = new LootItem(this.scene, x, y, z, type);
        this.items.push(item);
    }

    update(dt) {
        this.items.forEach(item => item.update(dt));
        this.items = this.items.filter(item => !item.pickedUp);
    }
}

class LootItem {
    constructor(scene, x, y, z, type) {
        this.scene = scene;
        this.type = type; // 'weapon', 'medkit'
        this.pickedUp = false;

        const color = type === 'weapon' ? 0xff0000 : 0x00ff00;
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        this.scene.add(this.mesh);

        // Simple floating animation
        this.initialY = y;
        this.time = Math.random() * 100;
    }

    update(dt) {
        this.time += dt * 2;
        this.mesh.position.y = this.initialY + Math.sin(this.time) * 0.2;
        this.mesh.rotation.y += dt;
    }

    pickup(player) {
        this.pickedUp = true;
        this.scene.remove(this.mesh);

        // Add to player
        if (this.type === 'weapon') {
            player.inventory.ammo += 30;
            updateHUD(player);
            showMsg("Picked up Ammo!");
        } else {
            player.health = Math.min(100, player.health + 50);
            updateHUD(player);
            showMsg("Used Medkit!");
        }
    }
}

function updateHUD(player) {
    document.getElementById('ammo-display').innerText = `Ammo: ${player.inventory.ammo}`;
    document.getElementById('health-text').innerText = `${Math.ceil(player.health)} HP`;
    document.getElementById('health-bar-fill').style.width = `${Math.max(0, player.health)}%`;
}

function showMsg(text) {
    const el = document.getElementById('message-area');
    el.innerText = text;
    el.style.opacity = 1;
    setTimeout(() => {
        el.style.opacity = 0;
    }, 2000);
}
