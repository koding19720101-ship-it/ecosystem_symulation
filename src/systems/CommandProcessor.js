export class CommandProcessor {
    constructor(world, entities, resetCallback) {
        this.world = world;
        this.entities = entities;
        this.resetCallback = resetCallback;
        
        this.chatOverlay = document.getElementById('chatOverlay');
        this.chatInput = document.getElementById('chatInput');
        this.chatHistory = document.getElementById('chatHistory');
        
        this.initListeners();
    }

    initListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.key === '/') {
                if (this.chatOverlay.classList.contains('hidden')) {
                    e.preventDefault();
                    this.openChat();
                }
            } else if (e.key === 'Escape') {
                this.closeChat();
            }
        });

        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.processCommand(this.chatInput.value);
                this.chatInput.value = '';
                this.closeChat();
            }
        });
    }

    openChat() {
        this.chatOverlay.classList.remove('hidden');
        this.chatInput.focus();
    }

    closeChat() {
        this.chatOverlay.classList.add('hidden');
        this.chatInput.blur();
    }

    processCommand(input) {
        this.logMessage(`> ${input}`);
        
        if (input.trim() === '/meteo') {
            this.world.triggerMeteor(() => {
                this.resetCallback();
                this.logMessage('System reset complete.');
            });
        } else {
            this.logMessage('Unknown command.');
        }
    }

    logMessage(msg) {
        const div = document.createElement('div');
        div.textContent = msg;
        this.chatHistory.appendChild(div);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }
}
