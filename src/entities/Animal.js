import { BaseEntity } from './BaseEntity.js';

export class Animal extends BaseEntity {
    constructor(x, y, genes, type) {
        super(x, y, genes);
        this.type = type; // 'Herbivore' or 'Carnivore'
        
        // Genes: { speed, metabolism, insulation, attackPower, ... }
        this.hunger = 100;
        this.vx = (Math.random() - 0.5) * this.genes.speed;
        this.vy = (Math.random() - 0.5) * this.genes.speed;
        
        this.isPoisoned = false;
        this.poisonTimer = 0;
        this.lastUpdateTime = 0;
        
        this.target = null;
        this.state = 'WANDER'; // 'WANDER', 'FORAGE', 'REPRODUCE'
    }

    update(deltaTime, worldWidth, worldHeight, ambientTemp) {
        if (this.isDead) return;

        // Metabolism and Hunger
        this.hunger -= this.genes.metabolism * (deltaTime / 1000);
        if (this.hunger <= 0) {
            this.hp -= 10 * (deltaTime / 1000);
        }

        // Temperature Effects
        const feltTemp = ambientTemp + this.genes.insulation;
        let speedMult = 1;
        if (feltTemp <= 0) speedMult = 0.5; // Frostbite
        if (feltTemp >= 40) speedMult = 0.5; // Heatstroke

        // Move
        this.x += this.vx * speedMult * (deltaTime / 16);
        this.y += this.vy * speedMult * (deltaTime / 16);

        // Wall Bounce Logic
        if (this.x <= 0 || this.x >= worldWidth) this.vx *= -1;
        if (this.y <= 0 || this.y >= worldHeight) this.vy *= -1;

        // Poison Logic
        if (this.isPoisoned) {
            this.hp -= 5 * (deltaTime / 1000); // 5 HP/sec
            this.poisonTimer -= deltaTime;
            if (this.poisonTimer <= 0) this.isPoisoned = false;
        }

        super.update(deltaTime, worldWidth, worldHeight);
    }

    drawUITags(ctx) {
        super.drawUITags(ctx);
        const barWidth = 20;
        const barHeight = 3;
        const yOffset = -15;

        // Hunger Bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.x - barWidth/2, this.y + yOffset, barWidth, barHeight);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(this.x - barWidth/2, this.y + yOffset, (this.hunger / 100) * barWidth, barHeight);

        // State indicator
        if (this.state) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.state, this.x, this.y - 20);
        }
    }

    setTarget(entity) {
        this.target = entity;
        if (entity) {
            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                this.vx = (dx / dist) * this.genes.speed;
                this.vy = (dy / dist) * this.genes.speed;
            }
        }
    }
}
