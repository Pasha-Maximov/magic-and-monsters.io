const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 20,
    color: 'blue',
    speed: 5,
    isAlive: true,
    direction: 0 // Direction the player is facing, in radians
};

let monsters = [];
let projectiles = [];
let arrow = {
    length: 40, // Length of the arrow from the edge of the circle
    angle: 0 // Angle of the arrow relative to the player
};

let keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    arrowLeft: false,
    arrowRight: false,
    space: false
};

let selectedSlot = 0; // The currently selected hotbar slot
let spawnInterval;
let spawnSpeed = 15000; // Initial spawn speed in milliseconds
let speedIncrement = 0.1; // Speed increase factor for monsters
let spawnDecrement = 500; // Decrease in spawn interval in milliseconds

let cooldown = {
    active: false,
    timeLeft: 0,
    interval: null
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'w') keys.w = true;
    if (e.key === 'a') keys.a = true;
    if (e.key === 's') keys.s = true;
    if (e.key === 'd') keys.d = true;
    if (e.key === 'ArrowLeft') keys.arrowLeft = true;
    if (e.key === 'ArrowRight') keys.arrowRight = true;
    if (e.key === ' ') keys.space = true;
    if (e.key === '1') selectSlot(0);
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'w') keys.w = false;
    if (e.key === 'a') keys.a = false;
    if (e.key === 's') keys.s = false;
    if (e.key === 'd') keys.d = false;
    if (e.key === 'ArrowLeft') keys.arrowLeft = false;
    if (e.key === 'ArrowRight') keys.arrowRight = false;
    if (e.key === ' ') keys.space = false;
});

document.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on hotbar slot
    const hotbarSlots = document.querySelectorAll('.slot');
    hotbarSlots.forEach((slot, index) => {
        const slotRect = slot.getBoundingClientRect();
        if (x >= slotRect.left && x <= slotRect.right && y >= slotRect.top && y <= slotRect.bottom) {
            selectSlot(index);
        }
    });
});

function selectSlot(index) {
    selectedSlot = index;
    const hotbarSlots = document.querySelectorAll('.slot');
    hotbarSlots.forEach(s => s.classList.remove('selected'));
    hotbarSlots[index].classList.add('selected');
}

function detectCollision(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < a.size + b.size;
}

function preventOverlap(monster) {
    monsters.forEach(other => {
        if (other !== monster) {
            const dx = monster.x - other.x;
            const dy = monster.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDist = monster.size;

            if (distance < minDist) {
                const angle = Math.atan2(dy, dx);
                const overlap = minDist - distance;
                monster.x += Math.cos(angle) * overlap / 2;
                monster.y += Math.sin(angle) * overlap / 2;
                other.x -= Math.cos(angle) * overlap / 2;
                other.y -= Math.sin(angle) * overlap / 2;
            }
        }
    });
}

function resetGame() {
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.isAlive = true;
    player.direction = 0;
    arrow.angle = 0;
    monsters = [];
    projectiles = [];
    document.getElementById('retryButton').style.display = 'none';
    document.getElementById('hotbar').style.display = 'flex';
    clearInterval(spawnInterval);
    clearInterval(cooldown.interval);
    spawnSpeed = 15000; // Reset spawn speed
    cooldown.active = false;
    cooldown.timeLeft = 0;
    document.querySelector('.slot:nth-child(1) .cooldown').style.display = 'none';
    startSpawning();
}

function update() {
    if (!player.isAlive) return;

    if (keys.w && player.y - player.speed > 0) player.y -= player.speed;
    if (keys.s && player.y + player.size + player.speed < canvas.height) player.y += player.speed;
    if (keys.a && player.x - player.speed > 0) player.x -= player.speed;
    if (keys.d && player.x + player.size + player.speed < canvas.width) player.x += player.speed;

    if (keys.arrowLeft) arrow.angle -= 0.1; // Increased rotation speed
    if (keys.arrowRight) arrow.angle += 0.1; // Increased rotation speed

    if (keys.space && selectedSlot === 0 && !cooldown.active) {
        shootProjectile();
        keys.space = false; // Prevent continuous shooting on holding space
    }

    monsters.forEach(monster => {
        let dx = player.x - monster.x;
        let dy = player.y - monster.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            monster.x += (dx / distance) * monster.speed;
            monster.y += (dy / distance) * monster.speed;
        }

        preventOverlap(monster);

        if (detectCollision(monster, player)) {
            player.isAlive = false;
        }
    });

    projectiles.forEach((projectile, index) => {
        projectile.x += projectile.speedX;
        projectile.y += projectile.speedY;
        projectile.angle += 0.1; // Spin the projectile

        monsters.forEach((monster, mIndex) => {
            if (detectCollision(projectile, monster)) {
                monsters.splice(mIndex, 1); // Remove the monster
                projectiles.splice(index, 1); // Remove the projectile
            }
        });

        if (projectile.x < 0 || projectile.x > canvas.width || projectile.y < 0 || projectile.y > canvas.height) {
            projectiles.splice(index, 1); // Remove projectile if it goes out of bounds
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player
    ctx.beginPath();
    ctx.arc(player.x + (player.size) / 2, player.y + (player.size) / 2, player.size, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.closePath();

    // Draw arrow
    const arrowBaseX = (player.x + (player.size) / 2) + Math.cos(arrow.angle) * player.size;
    const arrowBaseY = (player.y + (player.size) / 2) + Math.sin(arrow.angle) * player.size;
    const arrowTipX = arrowBaseX + Math.cos(arrow.angle) * arrow.length;
    const arrowTipY = arrowBaseY + Math.sin(arrow.angle) * arrow.length;
    const arrowLeftX = arrowBaseX + Math.cos(arrow.angle + Math.PI / 2) * 5;
    const arrowLeftY = arrowBaseY + Math.sin(arrow.angle + Math.PI / 2) * 5;
    const arrowRightX = arrowBaseX + Math.cos(arrow.angle - Math.PI / 2) * 5;
    const arrowRightY = arrowBaseY + Math.sin(arrow.angle - Math.PI / 2) * 5;

    ctx.beginPath();
    ctx.moveTo(arrowLeftX, arrowLeftY);
    ctx.lineTo(arrowTipX, arrowTipY);
    ctx.lineTo(arrowRightX, arrowRightY);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.closePath();

    // Draw projectiles
    projectiles.forEach(projectile => {
        ctx.save();
        ctx.translate(projectile.x, projectile.y);
        ctx.rotate(projectile.angle);
        ctx.translate(-projectile.x, -projectile.y);

        ctx.beginPath();
        ctx.moveTo(projectile.x, projectile.y - projectile.size);
        ctx.lineTo(projectile.x + projectile.size / 2, projectile.y + projectile.size);
        ctx.lineTo(projectile.x - projectile.size / 2, projectile.y + projectile.size);
        ctx.closePath();
        ctx.fillStyle = projectile.color;
        ctx.fill();

        ctx.restore();
    });

    // Draw monsters
    monsters.forEach(monster => {
        ctx.fillStyle = monster.color;
        ctx.fillRect(monster.x, monster.y, monster.size, monster.size);
    });

    if (!player.isAlive) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('You failed', canvas.width / 2, canvas.height / 2);

        // Show retry button
        const retryButton = document.getElementById('retryButton');
        if (!retryButton) {
            const button = document.createElement('button');
            button.id = 'retryButton';
            button.textContent = 'Retry';
            button.addEventListener('click', resetGame);
            document.body.appendChild(button);
        } else {
            retryButton.style.display = 'block';
        }

        // Hide the hotbar when game is over
        document.getElementById('hotbar').style.display = 'none';
    }
}

function shootProjectile() {
    const projectile = {
        x: player.x + Math.cos(arrow.angle) * (player.size + 20),
        y: player.y + Math.sin(arrow.angle) * (player.size + 20),
        size: 10,
        color: 'green',
        speedX: Math.cos(arrow.angle) * 5,
        speedY: Math.sin(arrow.angle) * 5,
        angle: 0
    };
    projectiles.push(projectile);

    activateCooldown(); // Activate cooldown when a projectile is shot
}

function activateCooldown() {
    cooldown.active = true;
    cooldown.timeLeft = 10; // 10-second cooldown
    const cooldownOverlay = document.querySelector('.slot:nth-child(1) .cooldown');
    cooldownOverlay.style.display = 'flex';
    cooldownOverlay.textContent = cooldown.timeLeft;

    cooldown.interval = setInterval(() => {
        cooldown.timeLeft--;
        cooldownOverlay.textContent = cooldown.timeLeft;

        if (cooldown.timeLeft <= 0) {
            clearInterval(cooldown.interval);
            cooldown.active = false;
            cooldownOverlay.style.display = 'none';
        }
    }, 1000);
}

function spawnMonster() {
    if (monsters.length >= 20) return; // Prevent spawning if there are 20 monsters

    let x, y;
    do {
        x = Math.random() * canvas.width;
        y = Math.random() * canvas.height;
    } while (Math.abs(x - player.x) < 200 && Math.abs(y - player.y) < 200);

    const speed = 2 + (monsters.length * speedIncrement); // Increase speed over time
    const monster = { x: x, y: y, size: 20, color: 'red', speed: speed };
    monsters.push(monster);
}

function startSpawning() {
    spawnMonster();
    spawnSpeed = 15000; // Reset spawn speed when starting spawning
    spawnInterval = setInterval(() => {
        if (player.isAlive && monsters.length < 20) { // Ensuring only one red square spawns at a time
            spawnMonster();
        }
        spawnSpeed = Math.max(spawnSpeed - spawnDecrement, 2000); // Decrease spawn speed, min 2000ms
        clearInterval(spawnInterval);
        if (player.isAlive) {
            startSpawning();
        }
    }, Math.random() * 5000 + spawnSpeed); // Random time based on decreasing spawn speed
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Create hotbar
const hotbar = document.createElement('div');
hotbar.id = 'hotbar';
hotbar.classList.add('hotbar');
for (let i = 0; i < 2; i++) {
    const slot = document.createElement('div');
    slot.classList.add('slot');
    if (i === 0) {
        const item = document.createElement('div');
        item.classList.add('item', 'green-star');
        slot.appendChild(item);

        // Add cooldown overlay
        const cooldownOverlay = document.createElement('div');
        cooldownOverlay.classList.add('cooldown');
        cooldownOverlay.style.display = 'none';
        slot.appendChild(cooldownOverlay);
    }
    const number = document.createElement('div');
    number.classList.add('number');
    number.textContent = i + 1;
    slot.appendChild(number);
    hotbar.appendChild(slot);
}
document.body.appendChild(hotbar);

selectSlot(0); // Select the first slot by default

startSpawning();
gameLoop();
