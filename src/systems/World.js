export class World {
    constructor() {
        this.month = 1;
        this.seasonIndex = 0; // 0: 봄, 1: 여름, 2: 가을, 3: 겨울
        this.seasons = ['봄', '여름', '가을', '겨울'];
        this.timePerMonth = 5000; // 5s
        this.monthsPerSeason = 4;
        this.lastUpdateTime = 0;
        
        this.currentTemp = 20;
        this.currentWeather = '맑음';
        
        this.weatherProbabilities = {
            '봄': { '비': 0.3, '눈': 0.3, '맑음': 0.7, '폭염': 0.01 },
            '여름': { '비': 0.7, '맑음': 0.6, '폭염': 0.5 },
            '가을': { '비': 0.25, '맑음': 0.3 },
            '겨울': { '비': 0.2, '눈': 0.7, '맑음': 0.25 }
        };

        this.seasonTemps = {
            '봄': { min: 10, max: 20 },
            '여름': { min: 25, max: 35 },
            '가을': { min: 10, max: 15 },
            '겨울': { min: -10, max: 5 }
        };
    }

    update(currentTime) {
        if (!this.lastUpdateTime) this.lastUpdateTime = currentTime;
        
        if (currentTime - this.lastUpdateTime >= this.timePerMonth) {
            this.month++;
            this.lastUpdateTime = currentTime;
            this.updateAtmosphere();

            if (this.month > this.monthsPerSeason) {
                this.month = 1;
                this.seasonIndex = (this.seasonIndex + 1) % 4;
            }
        }
    }

    updateAtmosphere() {
        const season = this.seasons[this.seasonIndex];
        const probs = this.weatherProbabilities[season];
        const rand = Math.random();

        // Weather Selection
        let weather = '맑음';
        if (probs['폭염'] && rand < probs['폭염']) weather = '폭염';
        else if (probs['눈'] && rand < probs['눈']) weather = '눈';
        else if (probs['비'] && rand < probs['비']) weather = '비';
        else if (probs['맑음'] && rand < probs['맑음']) weather = '맑음';
        
        this.currentWeather = weather;

        // Temperature Calculation
        const range = this.seasonTemps[season];
        const baseTemp = range.min + Math.random() * (range.max - range.min);
        let mod = (Math.random() - 0.5) * 4; // Error ±2

        if (weather === '비') mod -= 3;
        if (weather === '눈') mod -= 5;
        if (weather === '폭염') mod += 10;

        this.currentTemp = Math.round((baseTemp + mod) * 10) / 10;
        
        this.updateUI();
    }

    updateUI() {
        document.getElementById('season').textContent = this.seasons[this.seasonIndex];
        document.getElementById('month').textContent = `${this.month}개월`;
        document.getElementById('temp').textContent = `온도: ${this.currentTemp}°C`;
        document.getElementById('weather').textContent = this.currentWeather;
    }

    triggerMeteor(callback) {
        const overlay = document.getElementById('effectOverlay');
        overlay.classList.remove('flash-active');
        void overlay.offsetWidth; // Trigger reflow
        overlay.classList.add('flash-active');
        
        setTimeout(() => {
            this.month = 1;
            this.seasonIndex = 0;
            this.currentTemp = 20;
            this.currentWeather = '맑음';
            this.updateUI();
            if (callback) callback();
        }, 300);
    }
}
