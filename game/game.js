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

const projectileImage = new Image();
projectileImage.src = 'ball_lightning.png';

const monsterImage = new Image();
monsterImage.src = 'monster.png';

const playerImage = new Image();
playerImage.src = 'player.png';


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

let cooldowns = [
    { active: false, timeLeft: 0, interval: null }, // Green star cooldown
    { active: false, timeLeft: 0, interval: null }, // Blue star cooldown
    { active: false, timeLeft: 0, interval: null }  // Yellow star cooldown
];

let bombEffect = {
    active: false,
    radius: 125,
    timeout: null
};

let trapEffect = {
    active: false,
    radius: 75,
    x: 0,
    y: 0
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
    if (e.key === '2') selectSlot(1);
    if (e.key === '3') selectSlot(2);
    if (e.key === '4') selectSlot(3);
    if (e.key === '5') selectSlot(4);
    if (e.key === '6') selectSlot(5);
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

    // Place trap if third slot is selected and not on cooldown
    if (selectedSlot === 2 && !cooldowns[2].active) {
        activateTrap(x, y);
    }
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
    cooldowns.forEach(cooldown => {
        clearInterval(cooldown.interval);
        cooldown.active = false;
        cooldown.timeLeft = 0;
    });
    spawnSpeed = 15000; // Reset spawn speed
    bombEffect.active = false;
    trapEffect.active = false;
    selectSlot(0); // Select the first slot by default
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

    if (keys.space && selectedSlot === 0 && !cooldowns[0].active) {
        shootProjectile();
        keys.space = false; // Prevent continuous shooting on holding space
    } else if (keys.space && selectedSlot === 1 && !cooldowns[1].active) {
        activateBomb();
        keys.space = false;
    }

    

    monsters.forEach(monster => {
        let dx = player.x - monster.x;
        let dy = player.y - monster.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        // Rotate the monster
        monster.rotation += 0; // Adjust the speed of rotation as desired
    

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

    // Check for monsters in the trap effect
    if (trapEffect.active) {
        monsters = monsters.filter(monster => {
            const dx = monster.x - trapEffect.x;
            const dy = monster.y - trapEffect.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance > trapEffect.radius;
        });
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player
    ctx.drawImage(playerImage, player.x - player.size * 5.5, player.y - player.size * 4.75, player.size * 12, player.size * 12);

    // Draw arrow
    const arrowBaseX = (player.x + (player.size) / 2) + Math.cos(arrow.angle) * (player.size * 2.5);
    const arrowBaseY = (player.y + (player.size) / 2) + Math.sin(arrow.angle) * (player.size * 2.5);
    const arrowTipX = arrowBaseX + Math.cos(arrow.angle) * arrow.length;
    const arrowTipY = arrowBaseY + Math.sin(arrow.angle) * arrow.length;
    const arrowLeftX = arrowBaseX + Math.cos(arrow.angle + Math.PI / 2) * 5;
    const arrowLeftY = arrowBaseY + Math.sin(arrow.angle + Math.PI / 2) * 5;
    const arrowRightX = arrowBaseX + Math.cos(arrow.angle - Math.PI / 2) * 5;
    const arrowRightY = arrowBaseY + Math.sin(arrow.angle - Math.PI / 2) * 5;

    ctx.beginPath();
    ctx.moveTo(arrowLeftX, arrowLeftY);
    ctx.lineTo(arrowRightX, arrowRightY);
    ctx.lineTo(arrowTipX, arrowTipY);
    ctx.closePath();
    ctx.fillStyle = 'white';
    ctx.fill();

    // Draw projectiles
    projectiles.forEach(projectile => {
        ctx.save();

        // Translate to the projectile's position
        ctx.translate(projectile.x, projectile.y);

        // Rotate the canvas to the projectile's angle
        ctx.rotate(projectile.angle);

        // Draw the projectile
        ctx.drawImage(projectileImage, -projectile.size * 5.5, -projectile.size * 5.5 , projectile.size * 12, projectile.size * 12,);

        ctx.restore();
    });

    // Draw bomb effect if active
    if (bombEffect.active) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, bombEffect.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fill();
        ctx.closePath();
    }

    // Draw trap effect if active
    if (trapEffect.active) {
        ctx.beginPath();
        ctx.arc(trapEffect.x, trapEffect.y, trapEffect.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 165, 0, 0.5)';
        ctx.fill();
        ctx.closePath();
    }

    // Draw monsters
    monsters.forEach(monster => {
        
    
        // Save the current canvas state
        ctx.save();

        // Move the canvas origin to the monster's position
        ctx.translate(monster.x, monster.y);

        // Rotate the canvas by the monster's rotation angle
        ctx.rotate(monster.rotation);

        // Draw the monster image centered at the origin (which is now the monster's position)
        ctx.drawImage(monsterImage, monster.size * -5.5, monster.size * -5.5, monster.size * 12, monster.size * 12);

        // Restore the canvas state to prevent the rotation from affecting other elements
        ctx.restore();
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

    activateCooldown(0); // Activate cooldown for green star
}

function activateCooldown(slotIndex) {
    const cooldown = cooldowns[slotIndex];
    cooldown.active = true;
    cooldown.timeLeft = slotIndex === 0 ? 10 : slotIndex === 1 ? 30 : 50; // 10-second cooldown for green star, 30 seconds for blue star, 50 seconds for yellow star
    const cooldownOverlay = document.querySelector(`.slot:nth-child(${slotIndex + 1}) .cooldown`);
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
    const monster = { x: x, y: y, size: 20, color: 'red', speed: speed, rotate: 0 };
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

function activateBomb() {
    bombEffect.active = true;

    // Check for monsters within the bomb radius
    monsters = monsters.filter(monster => {
        const dx = monster.x - player.x;
        const dy = monster.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance > bombEffect.radius;
    });

    activateCooldown(1); // Activate cooldown for blue star

    // Set a timeout to remove the bomb effect after 2 seconds
    bombEffect.timeout = setTimeout(() => {
        bombEffect.active = false;
    }, 2000);
}

function activateTrap(x, y) {
    trapEffect.active = true;
    trapEffect.x = x;
    trapEffect.y = y;

    activateCooldown(2); // Activate cooldown for yellow star

    // Set a timeout to remove the trap effect after 5 seconds
    trapEffect.timeout = setTimeout(() => {
        trapEffect.active = false;
    }, 8000);
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
for (let i = 0; i < 6; i++) { // Adjusted to 6 slots
    const slot = document.createElement('div');
    slot.classList.add('slot');
    if (i === 0) {
        const item = document.createElement('div');
        item.classList.add('item', 'green-star');
        item.style.marginTop = '10px'; // Lower the green star
        slot.appendChild(item);

        // Add cooldown overlay
        const cooldownOverlay = document.createElement('div');
        cooldownOverlay.classList.add('cooldown');
        cooldownOverlay.style.display = 'none';
        slot.appendChild(cooldownOverlay);
    } else if (i === 1) {
        const item = document.createElement('div');
        item.classList.add('item', 'blue-star');
        item.style.marginTop = '10px'; // Lower the blue star
        slot.appendChild(item);

        // Add cooldown overlay
        const cooldownOverlay = document.createElement('div');
        cooldownOverlay.classList.add('cooldown');
        cooldownOverlay.style.display = 'none';
        slot.appendChild(cooldownOverlay);
    } else if (i === 2) {
        const item = document.createElement('div');
        item.classList.add('item', 'yellow-star');
        item.style.marginTop = '10px'; // Lower the yellow star
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
