export class GeneticEngine {
    static mutate(val, rate = 0.1) {
        return val + (Math.random() - 0.5) * rate * 2;
    }

    static inheritValue(parentA, parentB, mutationRate = 0.05) {
        const avg = (parentA + parentB) / 2;
        return avg + (Math.random() - 0.5) * mutationRate * 2;
    }

    static inheritColor(colorA, colorB) {
        return {
            r: Math.round((colorA.r + colorB.r) / 2),
            g: Math.round((colorA.g + colorB.g) / 2),
            b: Math.round((colorA.b + colorB.b) / 2)
        };
    }

    static inheritShape(verticesA, verticesB) {
        // 부모 소수점 위치 데이터를 반반 섞어서 생성
        const newVertices = [];
        const count = 3 + Math.floor(Math.random() * 5); // 3~7각형
        
        for (let i = 0; i < count; i++) {
            const parent = Math.random() > 0.5 ? verticesA : verticesB;
            // 부활된 모양을 위해 랜덤하게 부모의 꼭짓점 하나를 가져오거나 보간
            const idx = i % parent.length;
            newVertices.push({
                x: parent[idx].x + (Math.random() - 0.5) * 0.1,
                y: parent[idx].y + (Math.random() - 0.5) * 0.1
            });
        }

        // Sort vertices to maintain a clean polygon shape (convex-ish)
        const center = newVertices.reduce((acc, v) => ({ x: acc.x + v.x / count, y: acc.y + v.y / count }), { x: 0, y: 0 });
        newVertices.sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x));

        return newVertices;
    }

    static generateRandomShape(vertexCount) {
        const vertices = [];
        for (let i = 0; i < vertexCount; i++) {
            const angle = (i / vertexCount) * Math.PI * 2;
            const dist = 0.5 + Math.random() * 0.5;
            vertices.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist
            });
        }
        return vertices;
    }
}

export class LearningSystem {
    constructor() {
        this.memoryKey = 'ecosystem_species_memory';
        this.memory = this.loadMemory();
    }

    loadMemory() {
        const data = localStorage.getItem(this.memoryKey);
        if (data) return JSON.parse(data);
        return {
            'Herbivore': { survivalBias: 1, foodPreference: 1 },
            'Carnivore': { survivalBias: 1, foodPreference: 1 }
        };
    }

    saveMemory(species, lifespan) {
        // 간단한 학습 로직: 수명이 길수록 해당 종의 survivalBias 증가
        const weight = lifespan / 100; // 100개월 기준
        this.memory[species].survivalBias = (this.memory[species].survivalBias * 0.9) + (weight * 0.1);
        localStorage.setItem(this.memoryKey, JSON.stringify(this.memory));
    }

    getWeights(species) {
        return this.memory[species] || { survivalBias: 1, foodPreference: 1 };
    }

    clear() {
        localStorage.removeItem(this.memoryKey);
        this.memory = this.loadMemory();
    }
}
