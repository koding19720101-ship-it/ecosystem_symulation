import { World } from './systems/World.js';
import { GeneticEngine, LearningSystem } from './systems/GeneticEngine.js';
import { Plant } from './entities/Plant.js';
import { Animal } from './entities/Animal.js';
import { SurvivalSystem } from './systems/SurvivalSystem.js';
import { CommandProcessor } from './systems/CommandProcessor.js';

class Simulation {
    constructor() {
        this.canvas = document.getElementById('simCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.entities = [];
        
        this.world = new World();
        this.learning = new LearningSystem();
        this.survival = new SurvivalSystem(this.world, this.learning);
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.commandProcessor = new CommandProcessor(this.world, this.entities, () => this.reset());
        
        this.initEntities();
        this.lastTime = 0;
        requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initEntities() {
        this.entities = [];
        // 식물 5개
        for (let i = 0; i < 5; i++) {
            this.spawnPlant();
        }
        // 초식 2마리
        for (let i = 0; i < 2; i++) {
            this.spawnAnimal('Herbivore');
        }
        // 육식 2마리
        for (let i = 0; i < 2; i++) {
            this.spawnAnimal('Carnivore');
        }
    }

    spawnPlant() {
        const genes = {
            size: 1 + Math.random() * 2,
            maxLifespan: 1000,
            vertices: GeneticEngine.generateRandomShape(3 + Math.floor(Math.random() * 5)),
            color: { r: 74, g: 222, b: 128 }
        };
        const plant = new Plant(Math.random() * this.canvas.width, Math.random() * this.canvas.height, genes, Math.random() < 0.1);
        this.entities.push(plant);
    }

    spawnAnimal(type) {
        const genes = {
            size: 2 + Math.random() * 2,
            maxLifespan: 60 + Math.random() * 60, // 60~120 months
            gender: Math.random() > 0.5 ? 'M' : 'F',
            vertices: GeneticEngine.generateRandomShape(4 + Math.floor(Math.random() * 4)),
            color: type === 'Herbivore' ? { r: 52, g: 211, b: 153 } : { r: 251, g: 113, b: 133 },
            speed: type === 'Herbivore' ? 1.5 : 2.5,
            metabolism: 2 + Math.random() * 2,
            insulation: (Math.random() - 0.5) * 10,
            attackPower: type === 'Carnivore' ? 10 : 0
        };
        const animal = new Animal(Math.random() * this.canvas.width, Math.random() * this.canvas.height, genes, type);
        this.entities.push(animal);
    }

    reset() {
        this.initEntities();
    }

    loop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(deltaTime, currentTime);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(deltaTime, currentTime) {
        this.world.update(currentTime);
        
        for (const entity of this.entities) {
            if (entity instanceof Animal) {
                entity.update(deltaTime, this.canvas.width, this.canvas.height, this.world.currentTemp);
            } else {
                entity.update(deltaTime, this.canvas.width, this.canvas.height);
            }
        }
        
        this.survival.update(this.entities, this.canvas.width, this.canvas.height);
        this.updateUII();
    }

    updateUII() {
        const herbivores = this.entities.filter(e => e instanceof Animal && e.type === 'Herbivore' && !e.isDead).length;
        const carnivores = this.entities.filter(e => e instanceof Animal && e.type === 'Carnivore' && !e.isDead).length;
        const plants = this.entities.filter(e => e instanceof Plant && !e.isDead).length;
        
        document.getElementById('herbivoreCount').textContent = herbivores;
        document.getElementById('carnivoreCount').textContent = carnivores;
        document.getElementById('plantCount').textContent = plants;
    }

    draw() {
        this.ctx.fillStyle = '#0d0d12'; // Clean background
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid for depth
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.canvas.width; i += 50) {
            this.ctx.beginPath(); this.ctx.moveTo(i, 0); this.ctx.lineTo(i, this.canvas.height); this.ctx.stroke();
        }
        for (let j = 0; j < this.canvas.height; j += 50) {
            this.ctx.beginPath(); this.ctx.moveTo(0, j); this.ctx.lineTo(this.canvas.width, j); this.ctx.stroke();
        }

        for (const entity of this.entities) {
            entity.draw(this.ctx);
        }
    }
}

new Simulation();
