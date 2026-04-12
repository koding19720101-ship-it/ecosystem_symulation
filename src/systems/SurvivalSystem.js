import { Plant } from '../entities/Plant.js';
import { Animal } from '../entities/Animal.js';
import { GeneticEngine } from './GeneticEngine.js';

export class SurvivalSystem {
    constructor(world, learningSystem) {
        this.world = world;
        this.learningSystem = learningSystem;
    }

    update(entities, canvasWidth, canvasHeight) {
        const plants = entities.filter(e => e instanceof Plant && !e.isDead);
        const animals = entities.filter(e => e instanceof Animal && !e.isDead);
        const corpses = entities.filter(e => e.isCorpse);

        // 1. Decomposition (3s = 3000ms)
        const now = Date.now();
        for (let i = entities.length - 1; i >= 0; i--) {
            const e = entities[i];
            if (e.isCorpse && now - e.deathTime > 3000) {
                if (e instanceof Animal) {
                    this.learningSystem.saveMemory(e.type, e.age);
                }
                entities.splice(i, 1);
            }
        }

        // 2. Interaction Loop
        for (const animal of animals) {
            // Find targets based on hunger
            if (animal.hunger <= 30) {
                if (animal.type === 'Herbivore') {
                    const nearestPlant = this.findNearest(animal, plants);
                    if (nearestPlant) {
                        animal.setTarget(nearestPlant);
                        if (this.getDist(animal, nearestPlant) < 10) {
                            this.eatPlant(animal, nearestPlant);
                        }
                    }
                } else if (animal.type === 'Carnivore') {
                    const target = this.findNearest(animal, [...animals.filter(a => a.type === 'Herbivore'), ...corpses]);
                    if (target) {
                        animal.setTarget(target);
                        if (this.getDist(animal, target) < 15) {
                            this.eatAnimal(animal, target);
                        }
                    }
                }
            } else {
                // Search for reproduction
                const potentialMates = animals.filter(a => a.type === animal.type && a.genes.gender !== animal.genes.gender && a.age >= 48);
                const mate = this.findNearest(animal, potentialMates);
                
                if (mate) {
                    animal.setTarget(mate);
                    animal.state = 'REPRODUCE';
                    if (this.getDist(animal, mate) < 15) {
                        const baby = this.reproduceAnimal(animal, mate);
                        if (baby) entities.push(baby);
                        animal.hunger -= 20;
                        mate.hunger -= 20;
                        animal.state = '💕 LOVE! 💕';
                        mate.state = '💕 LOVE! 💕';
                    }
                } else {
                    animal.state = 'WANDER';
                }
            }
        }

        // 3. Plant Reproduction
        if (Math.random() < 0.01 && plants.length < 50) {
            const p1 = plants[Math.floor(Math.random() * plants.length)];
            const p2 = plants[Math.floor(Math.random() * plants.length)];
            if (p1 && p2 && this.getDist(p1, p2) < 100) {
                const baby = this.reproducePlant(p1, p2, canvasWidth, canvasHeight);
                entities.push(baby);
            }
        }
    }

    findNearest(origin, targets) {
        let minDist = Infinity;
        let nearest = null;
        for (const target of targets) {
            if (origin === target) continue;
            const d = this.getDist(origin, target);
            if (d < minDist) {
                minDist = d;
                nearest = target;
            }
        }
        return nearest;
    }

    getDist(a, b) {
        return Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2);
    }

    eatPlant(animal, plant) {
        animal.hunger = Math.min(100, animal.hunger + 40);
        plant.die();
        if (plant.isPoison) {
            animal.isPoisoned = true;
            animal.poisonTimer = 10000; // 10s
        }
    }

    eatAnimal(carnivore, prey) {
        carnivore.hunger = Math.min(100, carnivore.hunger + (prey.isCorpse ? 30 : 60));
        if (prey.isPoisoned) carnivore.isPoisoned = true;
        prey.die();
        prey.isCorpse = false; // Destroy immediately when eaten or make it disappear
    }

    reproduceAnimal(a, b) {
        const x = (a.x + b.x) / 2;
        const y = (a.y + b.y) / 2;
        const weights = this.learningSystem.getWeights(a.type);
        
        const genes = {
            size: GeneticEngine.inheritValue(a.genes.size, b.genes.size),
            maxLifespan: GeneticEngine.inheritValue(a.genes.maxLifespan, b.genes.maxLifespan),
            gender: Math.random() > 0.5 ? 'F' : 'M',
            vertices: GeneticEngine.inheritShape(a.genes.vertices, b.genes.vertices),
            color: GeneticEngine.inheritColor(a.genes.color, b.genes.color),
            speed: GeneticEngine.inheritValue(a.genes.speed, b.genes.speed) * weights.survivalBias,
            metabolism: GeneticEngine.inheritValue(a.genes.metabolism, b.genes.metabolism),
            insulation: GeneticEngine.inheritValue(a.genes.insulation, b.genes.insulation),
            attackPower: GeneticEngine.inheritValue(a.genes.attackPower, b.genes.attackPower)
        };
        
        return new Animal(x, y, genes, a.type);
    }

    reproducePlant(a, b, w, h) {
        const x = a.x + (Math.random() - 0.5) * 50;
        const y = a.y + (Math.random() - 0.5) * 50;
        const isPoison = Math.random() < 0.1;
        const genes = {
            size: GeneticEngine.inheritValue(a.genes.size, b.genes.size),
            maxLifespan: 100000, // Plants practically live long until eaten
            gender: 'N',
            vertices: GeneticEngine.inheritShape(a.genes.vertices, b.genes.vertices),
            color: { r: 74, g: 222, b: 128 }
        };
        return new Plant(Math.max(0, Math.min(w, x)), Math.max(0, Math.min(h, y)), genes, isPoison);
    }
}
