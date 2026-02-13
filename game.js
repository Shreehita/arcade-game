/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('scoreVal');
const livesEl = document.getElementById('livesVal');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

// Constants
const FPS = 60;
const FRICTION = 0.7; 
const SHIP_SIZE = 20; 
const SHIP_THRUST = 5; 
const SHIP_TURN_SPEED = 360; 
const LASER_MAX = 10; 
const LASER_DIST = 0.6; 
const LASER_SPD = 500; 
const ASTEROID_NUM = 3; 
const ASTEROID_SIZE = 100; 
const ASTEROID_SPD = 50; 
const ASTEROID_VERT = 10; 
const ASTEROID_JAG = 0.4; 

// Game State
let score, lives, ship, asteroids, lasers, level;
let keys = {};

// Setup Canvas Size
function resize() {
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;
}

// Input Handling
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);
restartBtn.addEventListener('click', resetGame);

function resetGame() {
    score = 0;
    lives = 3;
    level = 0;
    gameOverEl.style.display = 'none';
    ship = newShip();
    asteroids = [];
    lasers = [];
    createAsteroidBelt();
    scoreEl.innerText = score;
    livesEl.innerText = lives;
}

function newShip() {
    return {
        x: canvas.width / 2,
        y: canvas.height / 2,
        r: SHIP_SIZE / 2,
        a: 90 / 180 * Math.PI, 
        rot: 0,
        thrusting: false,
        thrust: { x: 0, y: 0 },
        blinkTime: 30, 
        blinkNum: 5,
        dead: false
    };
}

function createAsteroidBelt() {
    asteroids = [];
    let x, y;
    for (let i = 0; i < ASTEROID_NUM + level; i++) {
        do {
            x = Math.floor(Math.random() * canvas.width);
            y = Math.floor(Math.random() * canvas.height);
        } while (distBetweenPoints(ship.x, ship.y, x, y) < ASTEROID_SIZE * 2 + ship.r);
        asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_SIZE / 2)));
    }
}

function newAsteroid(x, y, r) {
    let lvlMult = 1 + level * 0.1;
    let asteroid = {
        x: x,
        y: y,
        xv: Math.random() * ASTEROID_SPD * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1),
        yv: Math.random() * ASTEROID_SPD * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1),
        r: r,
        a: Math.random() * Math.PI * 2,
        vert: Math.floor(Math.random() * (ASTEROID_VERT + 1) + ASTEROID_VERT / 2),
        offs: []
    };
    for (let i = 0; i < asteroid.vert; i++) {
        asteroid.offs.push(Math.random() * ASTEROID_JAG * 2 + 1 - ASTEROID_JAG);
    }
    return asteroid;
}

function distBetweenPoints(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function shootLaser() {
    if (lasers.length < LASER_MAX && !ship.dead) {
        lasers.push({
            x: ship.x + 4 / 3 * ship.r * Math.cos(ship.a),
            y: ship.y - 4 / 3 * ship.r * Math.sin(ship.a),
            xv: LASER_SPD * Math.cos(ship.a) / FPS,
            yv: -LASER_SPD * Math.sin(ship.a) / FPS,
            dist: 0
        });
    }
}

function destroyAsteroid(index) {
    let x = asteroids[index].x;
    let y = asteroids[index].y;
    let r = asteroids[index].r;

    if (r == Math.ceil(ASTEROID_SIZE / 2)) {
        asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_SIZE / 4)));
        asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_SIZE / 4)));
        score += 20;
    } else if (r == Math.ceil(ASTEROID_SIZE / 4)) {
        asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_SIZE / 8)));
        asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_SIZE / 8)));
        score += 50;
    } else {
        score += 100;
    }

    asteroids.splice(index, 1);
    scoreEl.innerText = score;

    if (asteroids.length === 0) {
        level++;
        createAsteroidBelt();
    }
}

function explodeShip() {
    ship.dead = true;
    lives--;
    livesEl.innerText = lives;
    if (lives <= 0) {
        setTimeout(endGame, 1000);
    } else {
        setTimeout(() => {
            ship = newShip();
        }, 1500);
    }
}

function endGame() {
    gameOverEl.style.display = 'block';
    finalScoreEl.innerText = score;
}

function update() {
    const blinkOn = ship.blinkNum % 2 == 0;
    const exploding = ship.dead;

    // Background Clear
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Asteroids
    ctx.lineWidth = 2;
    asteroids.forEach(a => {
        ctx.strokeStyle = '#00f3ff';
        ctx.beginPath();
        ctx.moveTo(
            a.x + a.r * a.offs[0] * Math.cos(a.a),
            a.y + a.r * a.offs[0] * Math.sin(a.a)
        );
        for (let j = 1; j < a.vert; j++) {
            ctx.lineTo(
                a.x + a.r * a.offs[j] * Math.cos(a.a + j * Math.PI * 2 / a.vert),
                a.y + a.r * a.offs[j] * Math.sin(a.a + j * Math.PI * 2 / a.vert)
            );
        }
        ctx.closePath();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f3ff';
        ctx.stroke();
        ctx.shadowBlur = 0;

        a.x += a.xv;
        a.y += a.yv;

        if (a.x < 0 - a.r) a.x = canvas.width + a.r;
        else if (a.x > canvas.width + a.r) a.x = 0 - a.r;
        if (a.y < 0 - a.r) a.y = canvas.height + a.r;
        else if (a.y > canvas.height + a.r) a.y = 0 - a.r;
    });

    // Draw Ship
    if (!exploding) {
        if (blinkOn) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(
                ship.x + 4 / 3 * ship.r * Math.cos(ship.a),
                ship.y - 4 / 3 * ship.r * Math.sin(ship.a)
            );
            ctx.lineTo(
                ship.x - ship.r * (2 / 3 * Math.cos(ship.a) + Math.sin(ship.a)),
                ship.y + ship.r * (2 / 3 * Math.sin(ship.a) - Math.cos(ship.a))
            );
            ctx.lineTo(
                ship.x - ship.r * (2 / 3 * Math.cos(ship.a) - Math.sin(ship.a)),
                ship.y + ship.r * (2 / 3 * Math.sin(ship.a) + Math.cos(ship.a))
            );
            ctx.closePath();
            ctx.shadowBlur = 15;
            ctx.shadowColor = "white";
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        if (ship.blinkNum > 0) {
            ship.blinkTime--;
            if (ship.blinkTime == 0) {
                ship.blinkTime = 30;
                ship.blinkNum--;
            }
        }
    } else {
        // Explosion logic
        ctx.fillStyle = "orange";
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r * 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw Lasers
    lasers.forEach((l, i) => {
        ctx.fillStyle = "#ff00ff";
        ctx.beginPath();
        ctx.arc(l.x, l.y, 2, 0, Math.PI * 2);
        ctx.fill();

        l.x += l.xv;
        l.y += l.yv;
        l.dist += Math.sqrt(Math.pow(l.xv, 2) + Math.pow(l.yv, 2));

        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (distBetweenPoints(l.x, l.y, asteroids[j].x, asteroids[j].y) < asteroids[j].r) {
                lasers.splice(i, 1);
                destroyAsteroid(j);
                break;
            }
        }

        if (l.dist > LASER_DIST * canvas.width) {
            lasers.splice(i, 1);
        } else {
            if (l.x < 0) l.x = canvas.width; else if (l.x > canvas.width) l.x = 0;
            if (l.y < 0) l.y = canvas.height; else if (l.y > canvas.height) l.y = 0;
        }
    });

    // Ship Physics
    if (!exploding) {
        if (keys['ArrowLeft'] || keys['KeyA']) ship.a += SHIP_TURN_SPEED / 180 * Math.PI / FPS;
        if (keys['ArrowRight'] || keys['KeyD']) ship.a -= SHIP_TURN_SPEED / 180 * Math.PI / FPS;

        if (keys['ArrowUp'] || keys['KeyW']) {
            ship.thrust.x += SHIP_THRUST * Math.cos(ship.a) / FPS;
            ship.thrust.y -= SHIP_THRUST * Math.sin(ship.a) / FPS;
        } else {
            ship.thrust.x -= FRICTION * ship.thrust.x / FPS;
            ship.thrust.y -= FRICTION * ship.thrust.y / FPS;
        }

        if (keys['Space']) {
            shootLaser();
            keys['Space'] = false;
        }

        ship.x += ship.thrust.x;
        ship.y += ship.thrust.y;

        if (ship.x < 0 - ship.r) ship.x = canvas.width + ship.r;
        else if (ship.x > canvas.width + ship.r) ship.x = 0 - ship.r;
        if (ship.y < 0 - ship.r) ship.y = canvas.height + ship.r;
        else if (ship.y > canvas.height + ship.r) ship.y = 0 - ship.r;

        if (ship.blinkNum == 0) {
            for (let i = 0; i < asteroids.length; i++) {
                if (distBetweenPoints(ship.x, ship.y, asteroids[i].x, asteroids[i].y) < ship.r + asteroids[i].r) {
                    explodeShip();
                }
            }
        }
    }

    requestAnimationFrame(update);
}

// Start
window.addEventListener('resize', resize);
resize();
resetGame();
update();