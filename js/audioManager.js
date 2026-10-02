/**
 * Web Audio API Sound Synthesizer
 * Provides procedural sound effects for chess piece placement, constraint conflict,
 * backtracking whoosh, tactile stepper clicks, and victory fanfare.
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.volume = 0.4;
    }

    _initContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(muted) {
        this.muted = muted;
    }

    isMuted() {
        return this.muted;
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
    }

    playPiecePlace() {
        if (this.muted) return;
        this._initContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Realistic wooden chess piece click: rapid downward frequency thud
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);

        gain.gain.setValueAtTime(this.volume * 0.9, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        // Filter for warm wood resonance
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, t);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.1);
    }

    playBacktrack() {
        if (this.muted) return;
        this._initContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);

        gain.gain.setValueAtTime(this.volume * 0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.13);
    }

    playConflict() {
        if (this.muted) return;
        this._initContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        // Two slightly detuned oscillators for dissonant tension
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';

        osc1.frequency.setValueAtTime(180, t);
        osc2.frequency.setValueAtTime(192, t);

        // Lowpass to make it softer rather than harsh
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);

        gain.gain.setValueAtTime(this.volume * 0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.16);
        osc2.stop(t + 0.16);
    }

    playStep() {
        if (this.muted) return;
        this._initContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        gain.gain.setValueAtTime(this.volume * 0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.035);
    }

    playVictory() {
        if (this.muted) return;
        this._initContext();
        if (!this.ctx) return;

        const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const baseTime = this.ctx.currentTime;

        chords.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = baseTime + idx * 0.09;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(this.volume * 0.45, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.65);
        });
    }
}

export const audio = new SoundManager();
