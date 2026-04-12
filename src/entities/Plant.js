import { BaseEntity } from './BaseEntity.js';

export class Plant extends BaseEntity {
    constructor(x, y, genes, isPoison = false) {
        super(x, y, genes);
        this.isPoison = isPoison;
        this.genes.color = isPoison ? { r: 168, g: 85, b: 247 } : { r: 74, g: 222, b: 128 };
    }

    update(deltaTime, worldWidth, worldHeight) {
        super.update(deltaTime, worldWidth, worldHeight);
        // Plants don't move, just exist or reproduce (handled by SurvivalSystem)
    }
}

export class Animal extends AnimalBase {
    // Logic split below to keep file manageable
}
