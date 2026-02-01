import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class BotManager {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.bots = [];
        this.spawnBots(5);
    }

    spawnBots(count) {
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 100;
            const z = (Math.random() - 0.5) * 100;
            this.bots.push(new Bot(this.scene, this.physicsWorld, x, z));
        }
    }

    update(dt, playerBody) {
        this.bots.forEach(bot => bot.update(dt, playerBody));
        // Remove dead bots logic could go here
    }
}

class Bot {
    constructor(scene, physicsWorld, x, z) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.health = 100;
        this.timer = 0;
        this.moveDir = new THREE.Vector3(1, 0, 0);

        // Visual
        const geo = new THREE.CapsuleGeometry(1, 2, 4, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(x, 2, z);
        this.mesh.castShadow = true;
        this.mesh.userData.bot = this; // Link for raycast
        scene.add(this.mesh);

        // Physics
        const shape = new CANNON.Cylinder(1, 1, 2, 8);
        this.body = new CANNON.Body({ mass: 50 });
        // Cannon cylinder is oriented along Z, need to rotate? No, usually Y. 
        // Actually Cannon cylinder orientation matches Three Cylinder if parameters are right.
        // But Three Capsule is Y-up.

        this.body.addShape(shape);
        this.body.position.set(x, 2, z);
        this.body.fixedRotation = true;
        this.body.updateMassProperties();
        physicsWorld.addBody(this.body);
    }

    update(dt, playerBody) {
        // Sync visual
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        // Simple AI: Move random, move towards player if close
        this.timer += dt;
        if (this.timer > 2) {
            this.timer = 0;
            const angle = Math.random() * Math.PI * 2;
            this.moveDir.set(Math.sin(angle), 0, Math.cos(angle));
        }

        // Distance to player
        const dist = this.body.position.distanceTo(playerBody.position);
        if (dist < 20) {
            // Chase player
            const dx = playerBody.position.x - this.body.position.x;
            const dz = playerBody.position.z - this.body.position.z;
            this.moveDir.set(dx, 0, dz).normalize();

            // Attack if very close
            if (dist < 2) {
                // Simple cooldown or assumes player passed in? 
                // We need access to player instance to call takeDamage.
                // WE received playerBody, not player instance...
                // Quick fix: attach player instance to body?
                if (playerBody.userData && playerBody.userData.player) {
                    if (Math.random() < 0.05) { // Random chance to hit per frame (dirty but works for prototype)
                        playerBody.userData.player.takeDamage(10);
                    }
                }
            }
        }

        // Move
        const speed = 5;
        this.body.velocity.x = this.moveDir.x * speed;
        this.body.velocity.z = this.moveDir.z * speed;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.die();
        } else {
            // Flash white
            this.mesh.material.emissive.setHex(0xffffff);
            setTimeout(() => { this.mesh.material.emissive.setHex(0x000000); }, 100);
        }
    }

    die() {
        // Simple respawn for prototype or remove
        this.body.position.set((Math.random() - 0.5) * 100, 10, (Math.random() - 0.5) * 100);
        this.health = 100;
    }
}
