class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.COLORS = ['blue', 'green', 'pink', 'purple', 'red', 'yellow'];
        this.SHAPES = ['circle', 'rhombus', 'square'];
        this.EXPRESSIONS = ['smile', 'frown', 'grimace'];
        this.FACE_MAP = {
            smile: ['closed_eye', 'open_eye', 'open_eye_2', 'open_eye_3'],
            frown: ['closed_eye', 'closed_eye_2', 'open_eye', 'open_eye_2'],
            grimace: ['open_eye']
        };

        for (const color of this.COLORS) {
            for (const shape of this.SHAPES) {
                this.load.image(`${color}_body_${shape}`, `assets/${color}_body_${shape}.png`);
            }
        }

        for (const [expr, eyes] of Object.entries(this.FACE_MAP)) {
            for (const eye of eyes) {
                this.load.image(`face_${expr}_${eye}`, `assets/face_${expr}_${eye}.png`);
            }
        }
    }

    create() {
        this.score = 0;
        this.ROUND_TIME = 15;
        this.timeLeft = this.ROUND_TIME;
        this.roundActive = false;
        this.matched = { color: false, shape: false, expression: false, eyes: false };

        this.add.text(400, 25, 'FACECLICKER', { fontSize: '32px', fontFamily: 'Arial', color: '#333', fontStyle: 'bold' }).setOrigin(0.5);
        this.scoreText = this.add.text(700, 25, 'Score: 0', { fontSize: '20px', fontFamily: 'Arial', color: '#333' }).setOrigin(0.5);

        this.add.text(200, 80, 'TARGET', { fontSize: '22px', fontFamily: 'Arial', color: '#e05050', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(600, 80, 'YOURS', { fontSize: '22px', fontFamily: 'Arial', color: '#5070e0', fontStyle: 'bold' }).setOrigin(0.5);

        this.targetBody = this.add.image(200, 250, 'purple_body_circle');
        this.targetFace = this.add.image(200, 250, 'face_smile_open_eye');
        this.playerBody = this.add.image(600, 250, 'purple_body_circle');
        this.playerFace = this.add.image(600, 250, 'face_smile_open_eye');

        this.matchIcons = {};
        const attrs = ['color', 'shape', 'expression', 'eyes'];
        const labels = ['Color', 'Shape', 'Face', 'Eyes'];
        for (let i = 0; i < attrs.length; i++) {
            this.add.text(400, 170 + i * 40, labels[i], { fontSize: '16px', fontFamily: 'Arial', color: '#666' }).setOrigin(0.5);
            this.matchIcons[attrs[i]] = this.add.text(400, 185 + i * 40, '✗', { fontSize: '22px', fontFamily: 'Arial', color: '#e05050' }).setOrigin(0.5);
        }

        this.timerBarBg = this.add.rectangle(100, 520, 600, 16, 0xdddddd).setOrigin(0, 0.5);
        this.timerBar = this.add.rectangle(100, 520, 600, 16, 0x50c050).setOrigin(0, 0.5);
        this.timerText = this.add.text(400, 520, '15s', { fontSize: '12px', fontFamily: 'Arial', color: '#333' }).setOrigin(0.5);

        const controls = [
            '[A] Color', '[S] Shape', '[D] Expression', '[F] Eyes'
        ];
        this.add.text(400, 560, controls.join('    '), { fontSize: '16px', fontFamily: 'Arial', color: '#555' }).setOrigin(0.5);

        this.add.text(400, 585, 'Match the target before time runs out!', { fontSize: '14px', fontFamily: 'Arial', color: '#999' }).setOrigin(0.5);

        this.resultText = this.add.text(400, 300, '', { fontSize: '36px', fontFamily: 'Arial', color: '#50c050', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0);

        this.player = { colorIdx: 0, shapeIdx: 0, expressionIdx: 0, eyeIdx: 0 };
        this.target = {};

        this.input.keyboard.on('keydown-A', () => { if (this.roundActive) { this.player.colorIdx = (this.player.colorIdx + 1) % this.COLORS.length; this.refreshPlayer(); } });
        this.input.keyboard.on('keydown-S', () => { if (this.roundActive) { this.player.shapeIdx = (this.player.shapeIdx + 1) % this.SHAPES.length; this.refreshPlayer(); } });
        this.input.keyboard.on('keydown-D', () => {
            if (!this.roundActive) return;
            this.player.expressionIdx = (this.player.expressionIdx + 1) % this.EXPRESSIONS.length;
            this.player.eyeIdx = 0;
            this.refreshPlayer();
        });
        this.input.keyboard.on('keydown-F', () => {
            if (!this.roundActive) return;
            const eyes = this.FACE_MAP[this.EXPRESSIONS[this.player.expressionIdx]];
            this.player.eyeIdx = (this.player.eyeIdx + 1) % eyes.length;
            this.refreshPlayer();
        });

        this.startRound();
    }

    update(_time, delta) {
        if (!this.roundActive) return;

        this.timeLeft -= delta / 1000;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.roundActive = false;
            this.showResult('TIME\'S UP!', '#e05050');
            this.time.delayedCall(2000, () => this.startRound());
        }

        const pct = Math.max(0, this.timeLeft / this.ROUND_TIME);
        this.timerBar.width = 600 * pct;
        const hue = Math.floor(pct * 120);
        this.timerBar.fillColor = Phaser.Display.Color.GetColor(
            120 + Math.floor((1 - pct) * 135),
            Math.floor(pct * 192),
            80
        );
        this.timerText.setText(Math.ceil(this.timeLeft) + 's');
    }

    startRound() {
        this.roundActive = true;
        this.timeLeft = this.ROUND_TIME;
        this.matched = { color: false, shape: false, expression: false, eyes: false };
        this.resultText.setAlpha(0);

        this.target = {
            colorIdx: Phaser.Math.Between(0, this.COLORS.length - 1),
            shapeIdx: Phaser.Math.Between(0, this.SHAPES.length - 1),
            expressionIdx: Phaser.Math.Between(0, this.EXPRESSIONS.length - 1),
            eyeIdx: 0
        };
        this.target.eyeIdx = Phaser.Math.Between(0, this.FACE_MAP[this.EXPRESSIONS[this.target.expressionIdx]].length - 1);

        const tc = this.COLORS[this.target.colorIdx];
        const ts = this.SHAPES[this.target.shapeIdx];
        const te = this.EXPRESSIONS[this.target.expressionIdx];
        const tey = this.FACE_MAP[te][this.target.eyeIdx];
        this.targetBody.setTexture(`${tc}_body_${ts}`);
        this.targetFace.setTexture(`face_${te}_${tey}`);

        this.player.colorIdx = Phaser.Math.Between(0, this.COLORS.length - 1);
        this.player.shapeIdx = Phaser.Math.Between(0, this.SHAPES.length - 1);
        this.player.expressionIdx = Phaser.Math.Between(0, this.EXPRESSIONS.length - 1);
        this.player.eyeIdx = Phaser.Math.Between(0, this.FACE_MAP[this.EXPRESSIONS[this.player.expressionIdx]].length - 1);

        while (this.playerMatchesTarget()) {
            this.player.colorIdx = (this.player.colorIdx + 1) % this.COLORS.length;
        }

        this.refreshPlayer();
    }

    playerMatchesTarget() {
        return this.player.colorIdx === this.target.colorIdx
            && this.player.shapeIdx === this.target.shapeIdx
            && this.player.expressionIdx === this.target.expressionIdx
            && this.player.eyeIdx === this.target.eyeIdx;
    }

    refreshPlayer() {
        const pc = this.COLORS[this.player.colorIdx];
        const ps = this.SHAPES[this.player.shapeIdx];
        const pe = this.EXPRESSIONS[this.player.expressionIdx];
        const pey = this.FACE_MAP[pe][this.player.eyeIdx];

        this.playerBody.setTexture(`${pc}_body_${ps}`);
        this.playerFace.setTexture(`face_${pe}_${pey}`);

        this.matched.color = this.player.colorIdx === this.target.colorIdx;
        this.matched.shape = this.player.shapeIdx === this.target.shapeIdx;
        this.matched.expression = this.player.expressionIdx === this.target.expressionIdx;
        this.matched.eyes = this.player.eyeIdx === this.target.eyeIdx;

        for (const [attr, ok] of Object.entries(this.matched)) {
            this.matchIcons[attr].setText(ok ? '✓' : '✗').setColor(ok ? '#50c050' : '#e05050');
        }

        if (this.matched.color && this.matched.shape && this.matched.expression && this.matched.eyes) {
            this.roundActive = false;
            this.score++;
            this.scoreText.setText('Score: ' + this.score);
            this.showResult('MATCHED!', '#50c050');
            this.tweens.add({ targets: this.playerBody, scaleX: 1.15, scaleY: 1.15, duration: 150, yoyo: true });
            this.tweens.add({ targets: this.playerFace, scaleX: 1.15, scaleY: 1.15, duration: 150, yoyo: true });
            this.time.delayedCall(1500, () => this.startRound());
        }
    }

    showResult(text, color) {
        this.resultText.setText(text).setColor(color).setAlpha(0);
        this.tweens.add({ targets: this.resultText, alpha: 1, duration: 300 });
    }
}
