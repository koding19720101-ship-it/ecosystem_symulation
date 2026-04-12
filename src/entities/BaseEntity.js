export class BaseEntity {
    constructor(x, y, genes) {
        this.x = x;
        this.y = y;
        this.genes = genes; // { size, maxLifespan, gender, vertices, color }
        
        this.hp = 100;
        this.age = 0; // Months
        this.isDead = false;
        this.isCorpse = false;
        this.deathTime = 0;
    }

    update(deltaTime, worldWidth, worldHeight) {
        if (this.isDead) return;

        // Wall collision (Clamping)
        this.x = Math.max(0, Math.min(worldWidth, this.x));
        this.y = Math.max(0, Math.min(worldHeight, this.y));

        this.age += deltaTime / 1000; // 1s = 1 month
        
        if (this.age >= this.genes.maxLifespan || this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.isCorpse = true;
        this.deathTime = Date.now();
    }

    draw(ctx) {
        const { vertices, size, color } = this.genes;
        const renderColor = this.isCorpse ? { r: 128, g: 128, b: 128 } : color;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(size * 10, size * 10);
        
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();

        ctx.fillStyle = `rgb(${renderColor.r}, ${renderColor.g}, ${renderColor.b})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 0.1;
        ctx.stroke();

        ctx.restore();

        // Draw UI Tags if not corpse
        if (!this.isCorpse) {
            this.drawUITags(ctx);
        }
    }

    drawUITags(ctx) {
        const barWidth = 20;
        const barHeight = 3;
        const yOffset = -20;

        // HP Bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.x - barWidth/2, this.y + yOffset, barWidth, barHeight);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(this.x - barWidth/2, this.y + yOffset, (this.hp / 100) * barWidth, barHeight);
    }
}
