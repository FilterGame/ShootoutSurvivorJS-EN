/*
  Battlefield Survival Game - Final Enhanced Version (includes aiming reticle and dashed line assistance)
  
  Instructions:
  1. Before the game starts, an instruction screen appears explaining the game rules and controls. Press any key to begin.
  2. The player (blue circle) moves using arrow keys / WASD.
     Shooting: Press the Spacebar or Mouse Left Click to shoot (hold down for continuous fire, depending on weapon cooldown).
  3. Bullets leave a trailing path; shooting direction is determined by the mouse position.
  4. There are two types of warnings:
     - Enemy Warning (70% chance): Bright red blocks appear on the left and right of the screen (the top and bottom areas are reserved for text); after the warning, enemies spawn from the screen edge. Each enemy warning increases the number of enemies spawned next time by one.
     - Attack Warning (30% chance): Lighter red blocks appear on the left and right; after the warning, several attack bullets will be fired at the player from off-screen.
  5. Partner Rescue: At the end of every 3 rounds (warning cycles), there is a chance for a bound partner to appear.
     The partner always appears at the center of the screen; when the player touches the partner, they are freed. After being freed, the partner will follow the player and shoot automatically,
     changing their follow target position randomly every 0.5 seconds (circling the player at a fixed radius).
  6. Weapon selection, supplies, and enhanced enemies function as before (see details below).
  7. The top-left displays survival time and kill count; the bottom-left displays the current weapon and ammo count.
  8. When using the machine gun or shotgun and ammo is insufficient, an "Out of Ammo!" warning appears above the player (for about 1 second) upon pressing the shoot button.
  9. New aiming assistance: A white aiming reticle appears at the mouse position with a dashed line connecting the player and the reticle.
  10. Press F5 to refresh and restart the game.
*/

let gameStarted = false; // Whether the game has started (instruction screen)
let player;
let bullets = [];
let enemies = [];
let attackBullets = []; // Bullets generated from attack warnings
let partners = []; // Partner array
let pickups = [];    // Supply items

// Warning related
let warningActive = false;
let warningTimer = 0;    // Warning duration in frames
let warningInterval = 200; // Interval between warnings (in frames)
let lastWarningFrame = 0;
let warningType = "enemy"; // "enemy" or "attack"
let roundCount = 0;  // Number of warning cycles

let enemySpawnCount = 1; // Number of enemies spawned per enemy warning; increases each time

// Score and start time
let score = 0;
let startTime;
let gameOver = false;

// Out of Ammo warning (display for 60 frames, about 1 second)
let ammoWarningTimer = 0;

function setup() {
  createCanvas(800, 600);
  angleMode(DEGREES);
  // Create player before game starts; initial position at canvas center
  player = new Player(width / 2, height / 2);
}

function draw() {
  background(30);
  
  // If game hasn't started, show the instruction screen
  if (!gameStarted) {
    showStartScreen();
    return;
  }
  
  if (gameOver) {
    gameOverScreen();
    return;
  }
  
  // Display survival time and kill count (adjusted to be centered horizontally)
  let survivalTime = ((millis() - startTime) / 1000).toFixed(1);
  fill(255);
  textSize(16);
  textAlign(CENTER, TOP);
  text("Survival Time: " + survivalTime + " seconds", width / 2, 20);
  text("Kills: " + score, width / 2, 40);
  
  // Display weapon info (bottom; X set to center)
  push();
  textSize(16);
  fill(255);
  let weaponName = "";
  let ammoText = "";
  if (player.weapon === 1) {
    weaponName = "Pistol";
    ammoText = "∞";
  } else if (player.weapon === 2) {
    weaponName = "Machine Gun";
    ammoText = player.ammoMachine;
  } else if (player.weapon === 3) {
    weaponName = "Shotgun";
    ammoText = player.ammoShotgun;
  }
  textAlign(CENTER, BOTTOM);
  text("Weapon: " + weaponName + "  Ammo: " + ammoText, width / 2, height - 20);
  pop();
  
  // Update and draw player
  player.update();
  player.show();
  
  // If mouse is continuously pressed (left button), keep shooting
  if (mouseIsPressed && mouseButton === LEFT) {
    player.shoot();
  }
  
  // Display Out of Ammo warning (above the player)
  if (ammoWarningTimer > 0) {
    push();
    textAlign(CENTER, BOTTOM);
    textSize(20);
    fill(255, 0, 0);
    text("Out of Ammo!", player.x, player.y - player.size - 10);
    pop();
    ammoWarningTimer--;
  }
  
  // Update partners
  for (let partner of partners) {
    partner.update();
    partner.show();
  }
  
  // Update and draw bullets (fired by player and partners)
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update();
    bullets[i].show();
    if (bullets[i].offscreen()) {
      bullets.splice(i, 1);
      continue;
    }
    // Check if bullet hits an enemy
    for (let j = enemies.length - 1; j >= 0; j--) {
      if (bullets[i].hits(enemies[j])) {
        let ex = enemies[j].x;
        let ey = enemies[j].y;
        enemies.splice(j, 1);
        score++;
        // Drop supply: 1/10 chance to drop machine gun or shotgun ammo supply
        if (random() < 0.1) {
          let dropType = random() < 0.5 ? 2 : 3;
          pickups.push(new Pickup(ex, ey, dropType));
        }
        bullets.splice(i, 1);
        break;
      }
    }
  }
  
  // Update attack bullets (from attack warnings)
  for (let i = attackBullets.length - 1; i >= 0; i--) {
    attackBullets[i].update();
    attackBullets[i].show();
    if (attackBullets[i].offscreen()) {
      attackBullets.splice(i, 1);
      continue;
    }
    if (attackBullets[i].hits(player)) {
      player.health -= 10;
      attackBullets.splice(i, 1);
    }
  }
  
  // Update enemies (normal and enhanced)
  for (let enemy of enemies) {
    enemy.update();
    enemy.show();
    if (enemy.hits(player)) {
      player.health -= 1;
    }
    for (let partner of partners) {
      if (!partner.bound && enemy.hits(partner)) {
        partner.health -= 1;
      }
    }
  }
  enemies = enemies.filter(enemy => enemy.health > 0);
  
  // Update supply pickups
  for (let i = pickups.length - 1; i >= 0; i--) {
    pickups[i].show();
    if (dist(pickups[i].x, pickups[i].y, player.x, player.y) < (player.size / 2 + pickups[i].size / 2)) {
      if (pickups[i].type === 2) {
        player.ammoMachine += 30;
      } else if (pickups[i].type === 3) {
        player.ammoShotgun += 30;
      }
      pickups.splice(i, 1);
    }
  }
  
  // Player death check
  if (player.health <= 0) {
    gameOver = true;
  }
  
  // Handle warnings
  if (!warningActive && frameCount - lastWarningFrame > warningInterval) {
    warningActive = true;
    warningTimer = 60;
    if (random() < 0.7) {
      warningType = "enemy";
    } else {
      warningType = "attack";
    }
  }
  
  if (warningActive) {
    showWarning(warningType);
    warningTimer--;
    if (warningTimer <= 0) {
      roundCount++;
      if (warningType === "enemy") {
        for (let i = 0; i < enemySpawnCount; i++) {
          spawnEnemy();
        }
        enemySpawnCount++;
      } else if (warningType === "attack") {
        spawnAttackBullets();
      }
      warningActive = false;
      lastWarningFrame = frameCount;
      
      // Every 3 rounds, spawn a partner
      if (roundCount % 3 === 0 && roundCount > 0) {
        let alreadyBound = partners.some(p => p.bound);
        if (roundCount === 3 || (!alreadyBound && random() < 0.5)) {
          spawnPartner();
        }
      }
    }
  }
  
  // --------------------------
  // New: Draw aiming assistance
  // Draw a white aiming reticle at the mouse position
  push();
  stroke(255);
  noFill();
  rectMode(CENTER);
  rect(mouseX, mouseY, 20, 20);
  pop();
  
  // Draw a dashed line connecting the player and the aiming reticle
  push();
  stroke(255);
  strokeWeight(1);
  drawingContext.setLineDash([5, 5]);  // Set dashed line: 5 pixels dash, 5 pixels gap
  line(player.x, player.y, mouseX, mouseY);
  drawingContext.setLineDash([]);      // Clear dashed line setting
  pop();
  // --------------------------
}

// ===== Instruction / Start Screen =====
function showStartScreen() {
  background(50);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(28);
  text("Battlefield Survival Game", width / 2, height / 2 - 160);
  
  textSize(16);
  let instructions =
    "Controls:\n" +
    "  Move: Arrow keys / WASD\n" +
    "  Shoot: Spacebar or Mouse Left Click (hold for continuous fire)\n" +
    "  Switch Weapons: Number keys 1 (Pistol), 2 (Machine Gun), 3 (Shotgun)\n\n" +
    "Weapon Descriptions:\n" +
    "  Pistol: 2 shots per second, unlimited ammo\n" +
    "  Machine Gun: starts with 100 rounds, approx. 10 shots per second\n" +
    "  Shotgun: fires 7 pellets per shot, consumes 7 rounds\n\n" +
    "Other:\n" +
    "  After warnings, enemies or attack bullets will appear; enemy count increases each time.\n" +
    "  Every 3 rounds, a bound partner may appear at the center, displaying 'Help Me!'.\n" +
    "  When an enemy is killed, there's a chance to drop a supply item (with a prompt) that increases ammo by 30 when picked up.\n" +
    "  The enhanced enemy moves faster, leaves a red trail, and shouts 'Die!' upon appearance.\n\n" +
    "New Aiming Assistance:\n" +
    "  A white aiming reticle appears at the mouse position, connected to the player with a dashed line.\n\n" +
    "Press any key to start the game";
    
  text(instructions, width / 2, height / 2 - 60);
}

// Press any key to start the game
function keyPressed() {
  if (!gameStarted) {
    gameStarted = true;
    startTime = millis();
    return;
  }
  if (key === ' ') {
    player.shoot();
  }
  if (key === '1') {
    player.weapon = 1;
  } else if (key === '2') {
    player.weapon = 2;
  } else if (key === '3') {
    player.weapon = 3;
  }
}

// ===== Spawn Functions =====

// Draw warning overlay
function showWarning(type) {
  push();
  noStroke();
  let textHeight = 50;
  if (type === "enemy") {
    fill(255, 0, 0, 150);
  } else if (type === "attack") {
    fill(255, 100, 100, 150);
  }
  rect(0, 0, width * 0.2, height);
  rect(width * 0.8, 0, width * 0.2, height);
  rect(0, 0, width, textHeight);
  rect(0, height - textHeight, width, textHeight);
  
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(255);
  if (type === "enemy") {
    text("Enemies are coming!", width / 2, height / 2);
  } else if (type === "attack") {
    text("Attack Warning!", width / 2, height / 2);
  }
  pop();
}

// Spawn enemy — ensure spawning from outside the screen
function spawnEnemy() {
  let side = floor(random(4));
  let x, y;
  let margin = 30;
  if (side === 0) { // Top
    x = random(0, width);
    y = -margin;
  } else if (side === 1) { // Right
    x = width + margin;
    y = random(0, height);
  } else if (side === 2) { // Bottom
    x = random(0, width);
    y = height + margin;
  } else { // Left
    x = -margin;
    y = random(0, height);
  }
  if (random() < 0.2) {
    enemies.push(new StrongEnemy(x, y));
  } else {
    enemies.push(new Enemy(x, y));
  }
}

// Spawn attack warning bullets
function spawnAttackBullets() {
  let count = 5;
  for (let i = 0; i < count; i++) {
    let side = floor(random(4));
    let x, y;
    if (side === 0) { x = random(width); y = -10; }
    else if (side === 1) { x = width + 10; y = random(height); }
    else if (side === 2) { x = random(width); y = height + 10; }
    else { x = -10; y = random(height); }
    attackBullets.push(new AttackBullet(x, y, player.x, player.y));
  }
}

// Spawn a bound partner — fixed at the screen center
function spawnPartner() {
  partners.push(new Partner(width / 2, height / 2));
}

// ===== Classes =====

// --- Player ---
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 30;
    this.speed = 3;
    this.health = 100;
    this.cooldown = 0;
    // Weapons: 1 - Pistol, 2 - Machine Gun, 3 - Shotgun
    this.weapon = 1;
    this.ammoMachine = 100;
    this.ammoShotgun = 100;
  }
  
  update() {
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { this.x -= this.speed; }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { this.x += this.speed; }
    if (keyIsDown(UP_ARROW) || keyIsDown(87)) { this.y -= this.speed; }
    if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) { this.y += this.speed; }
    this.x = constrain(this.x, this.size / 2, width - this.size / 2);
    this.y = constrain(this.y, this.size / 2, height - this.size / 2);
    if (this.cooldown > 0) this.cooldown--;
  }
  
  show() {
    push();
    translate(this.x, this.y);
    fill(0, 0, 255);
    noStroke();
    ellipse(0, 0, this.size);
    pop();
    push();
    noStroke();
    fill(0, 255, 0);
    // Health bar above the player
    rect(this.x - this.size / 2, this.y - this.size, map(this.health, 0, 100, 0, this.size), 5);
    pop();
  }
  
  shoot() {
    if (this.cooldown > 0) return;
    let angle = atan2(mouseY - this.y, mouseX - this.x);
    if (this.weapon === 1) {
      // Pistol: one shot, 30 frame cooldown
      bullets.push(new Bullet(this.x, this.y, angle));
      this.cooldown = 30;
    } else if (this.weapon === 2) {
      // Machine Gun: requires ammo, 6 frame cooldown
      if (this.ammoMachine > 0) {
        bullets.push(new Bullet(this.x, this.y, angle));
        this.cooldown = 6;
        this.ammoMachine--;
      } else {
        ammoWarningTimer = 60;
      }
    } else if (this.weapon === 3) {
      // Shotgun: fires 7 pellets, consumes 7 rounds, 20 frame cooldown
      if (this.ammoShotgun >= 7) {
        let baseAngle = angle;
        for (let i = 0; i < 7; i++) {
          let spread = map(i, 0, 6, -15, 15);
          bullets.push(new Bullet(this.x, this.y, baseAngle + spread));
        }
        this.cooldown = 20;
        this.ammoShotgun -= 7;
      } else {
        ammoWarningTimer = 60;
      }
    }
  }
}

// --- Partner ---
class Partner {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 25;
    this.speed = 2;
    this.health = 50;
    this.cooldown = 0;
    this.bound = true;
    // Follow properties: fixed distance and target angle; update every 30 frames
    this.followTimer = 0;
    this.offsetAngle = random(360);
    this.radius = 50;
  }
  
  update() {
    if (this.bound) {
      let d = dist(this.x, this.y, player.x, player.y);
      if (d < (this.size / 2 + player.size / 2)) {
        this.bound = false;
      }
    } else {
      this.followTimer--;
      if (this.followTimer <= 0) {
        this.offsetAngle = random(360);
        this.followTimer = 30;
      }
      let targetX = player.x + this.radius * cos(this.offsetAngle);
      let targetY = player.y + this.radius * sin(this.offsetAngle);
      // Move gradually toward the target
      this.x = lerp(this.x, targetX, 0.05);
      this.y = lerp(this.y, targetY, 0.05);
      
      if (this.cooldown > 0) this.cooldown--;
      else this.shoot();
    }
  }
  
  show() {
    push();
    translate(this.x, this.y);
    fill(this.bound ? 150 : 0, this.bound ? 150 : 255, this.bound ? 150 : 0);
    noStroke();
    ellipse(0, 0, this.size);
    pop();
    push();
    noStroke();
    fill(255, 255, 0);
    // Health bar above the partner
    rect(this.x - this.size / 2, this.y - this.size, map(this.health, 0, 50, 0, this.size), 4);
    pop();
    if (this.bound) {
      push();
      textAlign(CENTER, BOTTOM);
      textSize(16);
      fill(255);
      text("Help Me!", this.x, this.y - this.size / 2 - 5);
      pop();
    }
  }
  
  shoot() {
    if (enemies.length === 0) return;
    let nearest = enemies[0];
    let nearestD = dist(this.x, this.y, nearest.x, nearest.y);
    for (let enemy of enemies) {
      let d = dist(this.x, this.y, enemy.x, enemy.y);
      if (d < nearestD) {
        nearest = enemy;
        nearestD = d;
      }
    }
    let angle = atan2(nearest.y - this.y, nearest.x - this.x);
    bullets.push(new Bullet(this.x, this.y, angle));
    this.cooldown = 30;
  }
}

// --- Bullet ---
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.r = 5;
    this.speed = 7;
    this.angle = angle;
    this.trail = [];
  }
  
  update() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 10) {
      this.trail.shift();
    }
    this.x += this.speed * cos(this.angle);
    this.y += this.speed * sin(this.angle);
  }
  
  show() {
    push();
    noFill();
    stroke(255, 255, 0, 100);
    beginShape();
    for (let pos of this.trail) {
      vertex(pos.x, pos.y);
    }
    endShape();
    pop();
    push();
    fill(255, 255, 0);
    noStroke();
    ellipse(this.x, this.y, this.r * 2);
    pop();
  }
  
  offscreen() {
    return (this.x < 0 || this.x > width || this.y < 0 || this.y > height);
  }
  
  hits(target) {
    let d = dist(this.x, this.y, target.x, target.y);
    return d < this.r + target.size / 2;
  }
}

// --- Attack Warning Bullet ---
class AttackBullet {
  constructor(x, y, targetX, targetY) {
    this.x = x;
    this.y = y;
    this.r = 6;
    this.speed = 5;
    this.angle = atan2(targetY - this.y, targetX - this.x);
  }
  
  update() {
    this.x += this.speed * cos(this.angle);
    this.y += this.speed * sin(this.angle);
  }
  
  show() {
    push();
    fill(255, 150, 0);
    noStroke();
    ellipse(this.x, this.y, this.r * 2);
    pop();
  }
  
  offscreen() {
    return (this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20);
  }
  
  hits(target) {
    let d = dist(this.x, this.y, target.x, target.y);
    return d < this.r + target.size / 2;
  }
}

// --- Normal Enemy ---
class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 30;
    this.speed = 1.5;
    this.health = 1;
  }
  
  update() {
    let angle = atan2(player.y - this.y, player.x - this.x);
    this.x += this.speed * cos(angle);
    this.y += this.speed * sin(angle);
  }
  
  show() {
    push();
    translate(this.x, this.y);
    fill(255, 0, 0);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, this.size, this.size);
    pop();
  }
  
  hits(target) {
    let d = dist(this.x, this.y, target.x, target.y);
    return d < (this.size / 2 + target.size / 2);
  }
}

// --- Enhanced Enemy ---
class StrongEnemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 30;
    this.speed = 3;
    this.health = 1;
    this.speechTimer = 60; // Display dialogue for 1 second (60 frames)
    this.trail = [];
  }
  
  update() {
    let angle = atan2(player.y - this.y, player.x - this.x);
    this.x += this.speed * cos(angle);
    this.y += this.speed * sin(angle);
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 15) {
      this.trail.shift();
    }
    if (this.speechTimer > 0) this.speechTimer--;
  }
  
  show() {
    push();
    noFill();
    stroke(255, 0, 0, 100);
    beginShape();
    for (let pos of this.trail) {
      vertex(pos.x, pos.y);
    }
    endShape();
    pop();
    
    push();
    translate(this.x, this.y);
    fill(255, 0, 0);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, this.size, this.size);
    pop();
    
    if (this.speechTimer > 0) {
      push();
      textAlign(CENTER, BOTTOM);
      textSize(14);
      fill(255);
      text("Die!", this.x, this.y - this.size / 2 - 5);
      pop();
    }
  }
  
  hits(target) {
    let d = dist(this.x, this.y, target.x, target.y);
    return d < (this.size / 2 + target.size / 2);
  }
}

// --- Supply Pickup ---
class Pickup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 2: Machine Gun, 3: Shotgun
    this.size = 20;
  }
  
  show() {
    push();
    translate(this.x, this.y);
    if (this.type === 2) {
      fill(0, 255, 255);
      textAlign(CENTER, BOTTOM);
      textSize(12);
      text("Machine Gun Ammo", 0, -this.size / 2 - 2);
    } else if (this.type === 3) {
      fill(255, 0, 255);
      textAlign(CENTER, BOTTOM);
      textSize(12);
      text("Shotgun Ammo", 0, -this.size / 2 - 2);
    }
    noStroke();
    ellipse(0, 0, this.size);
    pop();
  }
}

// --- Game Over Screen ---
function gameOverScreen() {
  background(0);
  fill(255, 0, 0);
  textAlign(CENTER, CENTER);
  textSize(48);
  text("Game Over", width / 2, height / 2 - 40);
  textSize(32);
  let survivalTime = ((millis() - startTime) / 1000).toFixed(1);
  text("Survival Time: " + survivalTime + " seconds", width / 2, height / 2);
  text("Kills: " + score, width / 2, height / 2 + 40);
  textSize(20);
  text("Press F5 to Restart", width / 2, height / 2 + 80);
}
