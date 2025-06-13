// ===================================================================
// SIMULADOR FOTOMULTIPLICADOR 2D - QuantumDraft
// Implementación completa con física realista y modelos de amplificación
// ===================================================================

// Referencias del DOM
const canvas = document.getElementById('pmt-canvas');
const ctx = canvas.getContext('2d');

// Estado global de la simulación
let simulationState = {
    isRunning: false,
    isPaused: false,
    time: 0,
    speed: 1,
    photons: [],
    pmtElements: [],
    dynodes: [],
    statistics: {
        totalPhotons: 0,
        detectedPhotons: 0,
        averageGain: 0,
        quantumEfficiency: 0,
        transitTime: 0
    }
};

// Configuración PMT
let pmtConfig = {
    photocathode: { enabled: true, voltage: 0, position: null, amplification: 1 },
    accelerator: { enabled: false, voltage: -50, position: null, amplification: 1 },
    grid: { enabled: false, voltage: -20, position: null, amplification: 1 },
    anode: { enabled: true, voltage: 1000, position: null, amplification: 1 },
    dynodes: [],
    amplificationModel: 'simple',
    simpleParams: { r: 2, beta: 0.7 },
    advancedParams: { sigma_E: 2.2, E_max: 1500, sigma_max: 2.5, s: 1.35 }
};

// Constantes físicas actualizadas según ramas.m
const PHYSICS = {
    electronCharge: -1.6021892e-19, // Coulombs
    electronMass: 9.10953e-31,      // kg
    speedOfLight: 299792458,        // m/s
    eVtoJoules: 1.602176634e-19,    // eV to Joules conversion
    pixelToMeter: 1e-4,            // Conversión píxel a metros
    Wsec: 2,                       // Energía secundarios en eV
    deltat: 1e-12                  // Paso de tiempo en segundos
};

// Límite de partículas activas para performance
const MAX_PARTICLES = 200;

// ===================================================================
// CLASES PRINCIPALES
// ===================================================================

class Photon {
    constructor(x, y, energy = 2.5) { // Energía en eV
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.energy = energy; // eV
        this.startTime = simulationState.time;
        this.path = [{ x, y, t: simulationState.time }];
        this.isActive = true;
        this.generation = 0; // Para tracking de generaciones
        this.parentId = null;
        this.id = Math.random().toString(36).substr(2, 9);
    }

    update(dt) {
        if (!this.isActive) return;

        // Usar el nuevo método de actualización relativista
        this.updatePositionRelativistic(dt);
        
        // Limitar longitud de trayectoria para performance
        if (this.path.length > 200) {
            this.path = this.path.slice(-100);
        }
   }

    updatePositionRelativistic(dt) {
        // Aceleración base hacia la derecha (simula atracción general)
        this.vx += 2 * dt * 60;

        // Integrar fuerzas eléctricas para desviar hacia dinodos
        const E = this.calculateElectricForces();
        this.vx += E.fx * dt * 60;
        this.vy += E.fy * dt * 60;

        // Calcular el factor gamma de Lorentz
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const gamma = 1 / Math.sqrt(1 - (speed * speed) / (PHYSICS.speedOfLight * PHYSICS.speedOfLight));

        // Actualizar posición considerando la relatividad
        this.x += this.vx * dt * gamma;
        this.y += this.vy * dt * gamma;

        // Registrar trayectoria cada pocos píxeles
        if (!this.path.length ||
            Math.hypot(this.x - this.path[this.path.length-1].x, this.y - this.path[this.path.length-1].y) > 5) {
            this.path.push({ x: this.x, y: this.y, t: simulationState.time });
        }

        // Verificar límites y colisiones tras actualizar posición
        this.checkBounds();
        this.checkCollisions();
    }

    calculateElectricForces() {
        let fx = 0, fy = 0;
        
        pmtConfig.dynodes.forEach(dynode => {
            if (!dynode.shape) return;
            
            const center = this.getShapeCenter(dynode.shape);
            const dx = center.x - this.x;
            const dy = center.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 1) return; // Evitar división por cero
            
            // Ley de Coulomb simplificada
            const force = (dynode.voltage * 1e-6) / (distance * distance);
            fx += force * (dx / distance);
            fy += force * (dy / distance);
        });
        
        return { fx, fy };
    }

    checkBounds() {
        // Límites muy amplios para electrones secundarios
        const margin = this.generation > 0 ? -50 : -20; // Más margen para secundarios
        if (this.x < margin || this.x > canvas.width - margin ||
            this.y < margin || this.y > canvas.height - margin) {
            this.isActive = false;
        }
    }

    checkCollisions() {
        pmtConfig.dynodes.forEach((dynode, index) => {
            if (!dynode.shape) return;
            const inside = this.isInsideShape(dynode.shape);
            console.log(`Checking collision Photon ${this.id} @ (${this.x.toFixed(1)},${this.y.toFixed(1)}) inside dynode ${index}? ${inside}`);
            if (inside && this.isActive) {
                this.handleDynodeCollision(dynode, index);
            }
        });
        
        // Verificar colisión con ánodo
        if (pmtConfig.anode.position && this.isInsideShape(pmtConfig.anode.position)) {
            this.handleAnodeCollision();
        }
    }

    handleDynodeCollision(dynode, index) {
        console.log(`Fotón colisionó con dynodo ${index}`);
        // Calcular ángulo de impacto
        const surfaceNormal = this.calculateSurfaceNormal(dynode.shape);
        const velocityVector = { x: this.vx, y: this.vy };
        const theta = Math.acos(
            Math.abs(
                (surfaceNormal.x * velocityVector.x + surfaceNormal.y * velocityVector.y) /
                (Math.sqrt(surfaceNormal.x * surfaceNormal.x + surfaceNormal.y * surfaceNormal.y) *
                 Math.sqrt(velocityVector.x * velocityVector.x + velocityVector.y * velocityVector.y))
            )
        );
        
        // Calcular energía de impacto
        const impactEnergy = this.calculateKineticEnergy();
        
        // Calcular SEY
        const sey = SEYCalculator.calculateSEY(impactEnergy, theta, index);
        const secondaryCount = Math.floor(sey);
        
        // Crear electrones secundarios
        this.createSecondaryElectrons(secondaryCount, dynode, surfaceNormal);
        
        // Actualizar estadísticas
        simulationState.statistics.totalPhotons += secondaryCount;
        
        // Desactivar fotón original
        this.isActive = false;
        
        // Animación visual
        this.animateCollision(index);

        // Marcar dinodo como impactado para animación en canvas
        dynode.hit = true;
        setTimeout(() => dynode.hit = false, 300);
    }

    handleAnodeCollision() {
        // Fotón detectado
        simulationState.statistics.detectedPhotons++;
        
        // Calcular tiempo de tránsito
        const transitTime = (simulationState.time - this.startTime) * 1e9; // nanosegundos
        simulationState.statistics.transitTime = 
            (simulationState.statistics.transitTime + transitTime) / 2;
        
        this.isActive = false;
    }

    calculateGain(dynode) {
        const voltageDiff = Math.abs(dynode.voltage);
        
        if (pmtConfig.amplificationModel === 'simple') {
            const { r, beta } = pmtConfig.simpleParams;
            return Math.max(1, Math.floor(r * Math.pow(voltageDiff / 100, beta)));
        } else {
            return this.calculateAdvancedGain(voltageDiff);
        }
    }

    calculateAdvancedGain(voltage) {
        const { sigma_E, E_max, sigma_max, s } = pmtConfig.advancedParams;
        
        // Modelo avanzado basado en el paper
        const impactEnergy = this.energy + (voltage * PHYSICS.eVtoJoules / PHYSICS.eVtoJoules);
        const sigma = sigma_max * (1 - Math.exp(-impactEnergy / sigma_E));
        const gain = Math.max(1, Math.floor(sigma * Math.pow(impactEnergy / E_max, s)));
        
        return gain;
    }

    createSecondaryElectrons(count, dynode, surfaceNormal) {
        const center = this.getShapeCenter(dynode.shape);
        const current = simulationState.photons.length + engine.newPhotons.length;
        const available = Math.max(0, MAX_PARTICLES - current);
        if (available <= 0) return;
        
        const actualCount = Math.min(count, available);
        
        for (let i = 0; i < actualCount; i++) {
            const energy = SEYCalculator.calculateSecondaryEnergy();
            const direction = SEYCalculator.calculateSecondaryDirection(surfaceNormal, true);
            
            const secondary = new Photon(
                center.x + (Math.random() - 0.5) * 2,
                center.y + (Math.random() - 0.5) * 2,
                energy
            );
            
            const speed = Math.sqrt(2 * energy * PHYSICS.eVtoJoules / PHYSICS.electronMass);
            secondary.vx = direction.vx * speed;
            secondary.vy = direction.vy * speed;
            secondary.generation = this.generation + 1;
            secondary.parentId = this.id;
            secondary.isActive = true;
            
            engine.newPhotons.push(secondary);
        }
    }

    calculateSurfaceNormal(shape) {
        if (shape.type === 'rectangle') {
            // Para simplificar, asumimos que la normal apunta hacia el centro del rectángulo
            const center = this.getShapeCenter(shape);
            const dx = this.x - center.x;
            const dy = this.y - center.y;
            const magnitude = Math.sqrt(dx * dx + dy * dy);
            return { 
                x: -dx / magnitude,
                y: -dy / magnitude
            };
        } else if (shape.type === 'polygon' && shape.points) {
            // Calcular normal desde los vértices más cercanos
            // ... (implementación existente) ...
        }
        // Default
        return { x: 1, y: 0 };
    }

    // Detección de colisión en formas (rectángulo, elipse, polígono)
    isInsideShape(shape) {
        if (!shape) return false;
        const margin = 10; // Tolerancia para detección
        if (shape.type === 'rectangle') {
            return this.x >= (shape.x - margin) && this.x <= (shape.x + shape.w + margin) &&
                   this.y >= (shape.y - margin) && this.y <= (shape.y + shape.h + margin);
        } else if (shape.type === 'ellipse') {
            const cx = shape.x + shape.w/2;
            const cy = shape.y + shape.h/2;
            const rx = Math.abs(shape.w)/2 + margin;
            const ry = Math.abs(shape.h)/2 + margin;
            const dx = this.x - cx;
            const dy = this.y - cy;
            return (dx*dx)/(rx*rx) + (dy*dy)/(ry*ry) <= 1;
        } else if (shape.points) {
            return this.pointInPolygon(shape.points);
        }
        return false;
    }

    // Algoritmo punto en polígono
    pointInPolygon(points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            const intersect = ((yi > this.y) !== (yj > this.y)) &&
                              (this.x < (xj - xi) * (this.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // Centroide de la forma
    getShapeCenter(shape) {
        if (shape.type === 'rectangle' || shape.type === 'ellipse') {
            return { x: shape.x + shape.w/2, y: shape.y + shape.h/2 };
        } else if (shape.points) {
            const sum = shape.points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {x:0,y:0});
            const n = shape.points.length;
            return { x: sum.x/n, y: sum.y/n };
        }
        return { x: 0, y: 0 };
    }

    draw(ctx) {
        if (!this.isActive && this.path.length === 0) return;
        
        // QUITAR el debug que está llenando la consola
        // Solo mostrar cuando se crea o cuando cambia de generación
        if (this.isActive && this.generation > 0) {
            // console.log(`DIBUJANDO SECUNDARIO gen-${this.generation} en (${Math.round(this.x)}, ${Math.round(this.y)})`);
        }
        
        // Dibujar trayectoria
        if (document.getElementById('show-trails') && document.getElementById('show-trails').checked && this.path.length > 1) {
            ctx.save();
            ctx.strokeStyle = `hsl(${this.generation * 60}, 70%, 60%)`;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.7;
            
            ctx.beginPath();
            ctx.moveTo(this.path[0].x, this.path[0].y);
            this.path.forEach(point => ctx.lineTo(point.x, point.y));
            ctx.stroke();
            ctx.restore();
        }
        
        // Dibujar fotón activo con colores más visibles
        if (this.isActive) {
            ctx.save();
            
            // Colores diferentes por generación
            const colors = ['#00ff00', '#ff4444', '#4444ff', '#ffff00', '#ff00ff'];
            ctx.fillStyle = colors[this.generation % colors.length];
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 15;
            
            // Tamaño más grande para ser más visible
            const radius = 5 + this.generation * 3;
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Borde para mayor visibilidad
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
        }
    }

    calculateGammaFactor() {
        const v = Math.sqrt(this.vx * this.vx + this.vy * this.vy) * PHYSICS.pixelToMeter;
        const beta2 = (v * v) / (PHYSICS.speedOfLight * PHYSICS.speedOfLight);
        return 1 / Math.sqrt(1 - beta2);
    }

    calculateKineticEnergy() {
        const gamma = this.calculateGammaFactor();
        const restEnergy = PHYSICS.electronMass * PHYSICS.speedOfLight * PHYSICS.speedOfLight;
        const kineticJoules = (gamma - 1) * restEnergy;
        return kineticJoules / PHYSICS.eVtoJoules;
    }

    animateCollision(index) {
        const row = document.querySelector(`#dynode-row-${index}`);
        if (row) {
            row.classList.add('dynode-collision');
            setTimeout(() => row.classList.remove('dynode-collision'), 300);
        }
    }
}

class ElectricFieldCalculator {
    static calculateField(x, y) {
        let Ex = 0, Ey = 0;
        
        pmtConfig.dynodes.forEach(dynode => {
            if (!dynode.shape) return;
            
            const center = this.getShapeCenter(dynode.shape);
            const dx = x - center.x;
            const dy = y - center.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 1) return;
            
            const field = dynode.voltage / (distance * distance);
            Ex += field * (dx / distance);
            Ey += field * (dy / distance);
        });
        
        return { Ex, Ey };
    }
    
    static getShapeCenter(shape) {
        if (shape.type === 'rectangle' || shape.type === 'ellipse') {
            return { x: shape.x + shape.w / 2, y: shape.y + shape.h / 2 };
        } else if (shape.points) {
            const sumX = shape.points.reduce((sum, p) => sum + p.x, 0);
            const sumY = shape.points.reduce((sum, p) => sum + p.y, 0);
            return { x: sumX / shape.points.length, y: sumY / shape.points.length };
        }
        return { x: 0, y: 0 };
    }
    
    static drawField(ctx) {
        if (!document.getElementById('show-electric-field').checked) return;
        
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        
        const step = 30;
        for (let x = step; x < canvas.width; x += step) {
            for (let y = step; y < canvas.height; y += step) {
                const field = this.calculateField(x, y);
                const magnitude = Math.sqrt(field.Ex * field.Ex + field.Ey * field.Ey);
                
                if (magnitude > 0.1) {
                    const scale = Math.min(20, magnitude * 1000);
                    const endX = x + (field.Ex / magnitude) * scale;
                    const endY = y + (field.Ey / magnitude) * scale;
                    
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                    
                    // Punta de flecha
                    const angle = Math.atan2(endY - y, endX - x);
                    ctx.beginPath();
                    ctx.moveTo(endX, endY);
                    ctx.lineTo(endX - 5 * Math.cos(angle - 0.3), endY - 5 * Math.sin(angle - 0.3));
                    ctx.moveTo(endX, endY);
                    ctx.lineTo(endX - 5 * Math.cos(angle + 0.3), endY - 5 * Math.sin(angle + 0.3));
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }
}

class SEYCalculator {
    static calculateSEY(impactEnergy, theta, dynodeIndex) {
        // Implementación basada en el modelo de Sternglass
        const delta0 = 2.4; // Rendimiento máximo para incidencia normal
        const Em = 400;    // Energía del máximo rendimiento (eV)
        
        // Dependencia angular según Bronshtein & Fraiman
        const angularFactor = Math.pow(1/Math.cos(theta), 1.35);
        
        // Dependencia de la energía según Sternglass
        const x = impactEnergy/Em;
        const delta = delta0 * x * Math.exp(1-x) * angularFactor;
        
        // Factor de corrección por número de dinodo
        const dynodeFactor = 1.0 + (dynodeIndex * 0.1);
        
        return Math.max(0, delta * dynodeFactor);
    }
    
    static calculateSecondaryEnergy() {
        // Distribución de energía de electrones secundarios
        // Basado en la distribución de Chung & Everhart
        const E = PHYSICS.Wsec * (1 + 0.5 * (Math.random() - 0.5));
        return E; // en eV
    }
    
    static calculateSecondaryDirection(surfaceNormal, randangle = true) {
        if (randangle) {
            // Distribución angular coseno según el paper
            const rr = Math.random();
            const theta = Math.asin(Math.sqrt(rr));
            const phi = 2 * Math.PI * Math.random();
            
            // Calcular componentes de velocidad
            const vx = Math.cos(theta);
            const vy = Math.sin(theta) * Math.cos(phi);
            const vz = Math.sin(theta) * Math.sin(phi);
            
            // Rotar según la normal de la superficie
            const alpha = Math.atan2(surfaceNormal.y, surfaceNormal.x);
            const rotMatrix = [
                [Math.cos(alpha), -Math.sin(alpha)],
                [Math.sin(alpha), Math.cos(alpha)]
            ];
            
            const vxRotated = rotMatrix[0][0] * vx + rotMatrix[0][1] * vy;
            const vyRotated = rotMatrix[1][0] * vx + rotMatrix[1][1] * vy;
            
            return { vx: vxRotated, vy: vyRotated };
        } else {
            // Emisión perpendicular a la superficie
            return { 
                vx: surfaceNormal.x,
                vy: surfaceNormal.y
            };
        }
    }
}

// ===================================================================
// MOTOR DE SIMULACIÓN
// ===================================================================

class SimulationEngine {
    constructor() {
        this.lastTime = 0;
        this.animationId = null;
        this.newPhotons = [];  // Acumular secundarios
    }
    
    start() {
        if (simulationState.isRunning) return;
        
        simulationState.isRunning = true;
        simulationState.isPaused = false;
        document.body.classList.add('simulation-running');
        
        this.lastTime = performance.now();
        this.animate();
    }
    
    pause() {
        simulationState.isPaused = !simulationState.isPaused;
        document.body.classList.toggle('simulation-paused', simulationState.isPaused);
    }
    
    stop() {
        simulationState.isRunning = false;
        simulationState.isPaused = false;
        simulationState.time = 0;
        simulationState.photons = [];
        
        document.body.classList.remove('simulation-running', 'simulation-paused');
        document.body.classList.add('simulation-stopped');
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.resetStatistics();
        this.render();
    }
    
    animate() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // segundos
        this.lastTime = currentTime;
        
        if (simulationState.isRunning && !simulationState.isPaused) {
            this.update(deltaTime * simulationState.speed);
            simulationState.time += deltaTime * simulationState.speed;
        }
        
        this.render();
        this.updateUI();
        
        if (simulationState.isRunning) {
            this.animationId = requestAnimationFrame(() => this.animate());
        }
    }
    
    update(dt) {
        // Actualizar fotones existentes
        const updated = [];
        simulationState.photons.forEach(photon => {
            photon.update(dt);
            if (photon.isActive || photon.path.length > 0) {
                updated.push(photon);
            }
        });
        // Agregar fotones secundarios creados durante las actualizaciones
        if (this.newPhotons.length > 0) {
            // console.log(`Agregando ${this.newPhotons.length} fotones secundarios al array principal`);
            updated.push(...this.newPhotons);
            this.newPhotons = [];
        }
        simulationState.photons = updated;
        
        // Calcular estadísticas
        this.updateStatistics();
    }
    
    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // DEBUG mejorado: Mostrar detalles de todos los fotones
        const activePhotons = simulationState.photons.filter(p => p.isActive);
        const allPhotons = simulationState.photons;
        
        if (activePhotons.length > 0) {
            // console.log(`Renderizando ${activePhotons.length} fotones activos de ${allPhotons.length} totales:`);
            activePhotons.forEach(p => {
                // console.log(`  - gen-${p.generation} en (${Math.round(p.x)}, ${Math.round(p.y)}) - isActive: ${p.isActive}`);
            });
            
            // Mostrar también los inactivos recién creados
            const recentInactive = allPhotons.filter(p => !p.isActive && p.generation > 0);
            if (recentInactive.length > 0) {
                // console.log(`ELECTRONES SECUNDARIOS INACTIVOS:`, recentInactive.map(p => 
                //     `gen-${p.generation} en (${Math.round(p.x)}, ${Math.round(p.y)}) - isActive: ${p.isActive}`
                // ));
            }
        }
        
        // Dibujar campo eléctrico
        ElectricFieldCalculator.drawField(ctx);
        
        // Dibujar elementos PMT
        this.drawPMTElements();
        
        // Dibujar fotones
        simulationState.photons.forEach(photon => photon.draw(ctx));
    }
    
    drawPMTElements() {
        pmtConfig.dynodes.forEach((dynode, index) => {
            if (!dynode.shape) return;

            ctx.save();

            // Si el dinodo fue impactado, escalar visualmente
            let shape = dynode.shape;
            if (dynode.hit) {
                const scale = 1.4;
                const cx = shape.x + shape.w/2;
                const cy = shape.y + shape.h/2;
                ctx.translate(cx, cy);
                ctx.scale(scale, scale);
                ctx.translate(-cx, -cy);
            }

            // Color según tipo de elemento
            ctx.fillStyle = this.getElementColor(dynode.type || 'dynode');
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;

            this.drawShape(shape);
            ctx.restore();

            // Etiqueta
            const center = this.getShapeCenter(dynode.shape);
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`D${index + 1}`, center.x, center.y + 4);
        });
    }
    
    drawShape(shape) {
        if (shape.type === 'rectangle') {
            ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
            ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
        } else if (shape.type === 'ellipse') {
            ctx.beginPath();
            ctx.ellipse(
                shape.x + shape.w / 2,
                shape.y + shape.h / 2,
                Math.abs(shape.w) / 2,
                Math.abs(shape.h) / 2,
                0, 0, Math.PI * 2
            );
            ctx.fill();
            ctx.stroke();
        } else if (shape.type === 'polygon' && shape.points) {
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            shape.points.forEach(point => ctx.lineTo(point.x, point.y));
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }
    
    getElementColor(type) {
        const colors = {
            photocathode: '#3b82f6',
            dynode: '#ef4444',
            anode: '#10b981',
            accelerator: '#f59e0b',
            grid: '#8b5cf6'
        };
        return colors[type] || '#6b7280';
    }
    
    getShapeCenter(shape) {
        if (shape.type === 'rectangle' || shape.type === 'ellipse') {
            return { x: shape.x + shape.w / 2, y: shape.y + shape.h / 2 };
        } else if (shape.points) {
            const sumX = shape.points.reduce((sum, p) => sum + p.x, 0);
            const sumY = shape.points.reduce((sum, p) => sum + p.y, 0);
            return { x: sumX / shape.points.length, y: sumY / shape.points.length };
        }
        return { x: 0, y: 0 };
    }
    
    updateStatistics() {
        const stats = simulationState.statistics;
        const activePhotons = simulationState.photons.filter(p => p.isActive).length;
        
        // Eficiencia cuántica
        if (stats.totalPhotons > 0) {
            stats.quantumEfficiency = (stats.detectedPhotons / stats.totalPhotons) * 100;
        }
        
        // Ganancia promedio
        if (stats.detectedPhotons > 0) {
            stats.averageGain = stats.totalPhotons / stats.detectedPhotons;
        }
    }
    
    resetStatistics() {
        simulationState.statistics = {
            totalPhotons: 0,
            detectedPhotons: 0,
            averageGain: 0,
            quantumEfficiency: 0,
            transitTime: 0
        };
    }
    
    updateUI() {
        const activePhotons = simulationState.photons.filter(p => p.isActive).length;
        
        document.getElementById('active-photons').textContent = activePhotons;
        document.getElementById('total-gain').textContent = 
            simulationState.statistics.averageGain.toFixed(1);
        document.getElementById('simulation-time').textContent = 
            (simulationState.time * 1000).toFixed(2) + 'ms';
        document.getElementById('detected-photons').textContent = 
            simulationState.statistics.detectedPhotons;
        document.getElementById('quantum-efficiency').textContent = 
            simulationState.statistics.quantumEfficiency.toFixed(1) + '%';
        document.getElementById('average-gain').textContent = 
            simulationState.statistics.averageGain.toFixed(1);
        document.getElementById('transit-time').textContent = 
            simulationState.statistics.transitTime.toFixed(1) + ' ns';
        
        // Añadir diagnósticos físicos
        if (simulationState.photons.length > 0) {
            const diagnostics = this.calculatePhysicsDiagnostics();
            document.getElementById('average-energy').textContent = 
                diagnostics.averageEnergy.toFixed(2) + ' eV';
            document.getElementById('average-velocity').textContent = 
                diagnostics.averageVelocity.toFixed(2) + ' m/s';
            // Calcular gamma máximo
            const maxGamma = Math.max(...simulationState.photons.map(p => {
                return p.isActive ? p.calculateGammaFactor().toFixed(2) : 1.0;
            }));
            document.getElementById('max-gamma').textContent = maxGamma;
        }
    }
    
    calculatePhysicsDiagnostics() {
        const activePhotons = simulationState.photons.filter(p => p.isActive);
        if (activePhotons.length === 0) {
            return { averageEnergy: 0, averageVelocity: 0 };
        }
        
        let totalEnergy = 0;
        let totalVelocity = 0;
        
        activePhotons.forEach(photon => {
            totalEnergy += photon.calculateKineticEnergy();
            const velocity = Math.sqrt(photon.vx * photon.vx + photon.vy * photon.vy);
            totalVelocity += velocity * PHYSICS.pixelToMeter; // Convertir a m/s
        });
        
        return {
            averageEnergy: totalEnergy / activePhotons.length,
            averageVelocity: totalVelocity / activePhotons.length
        };
    }
    
    generatePhotons(count) {
        // Evitar overflow de partículas
        const current = simulationState.photons.length;
        if (current >= MAX_PARTICLES) {
            console.warn(`Se alcanzó el límite máximo de partículas: ${MAX_PARTICLES}`);
            return;
        }
        const available = MAX_PARTICLES - current;
        if (count > available) count = available;

        // Buscar fotocátodo para generar fotones
        const photocathode = pmtConfig.dynodes.find(d => d.type === 'photocathode');
        
        for (let i = 0; i < count; i++) {
            let x, y;
            if (photocathode && photocathode.shape) {
                const center = this.getShapeCenter(photocathode.shape);
                x = center.x;
                y = center.y;
            } else if (pmtConfig.dynodes.length > 0) {
                const d0 = pmtConfig.dynodes[0].shape;
                const center = this.getShapeCenter(d0);
                x = center.x - 50;  // empezar 50px a la izquierda
                y = center.y;       // alineado verticalmente
            } else {
                x = canvas.width * 0.1;
                y = canvas.height / 2;
            }
            const photon = new Photon(x, y);
            
            // Velocidad inicial: solo horizontal para asegurar trayectoria recta
            photon.vx = 100; // píxeles/frame
            photon.vy = 0;

            simulationState.photons.push(photon);
            simulationState.statistics.totalPhotons++;
        }
    }
}

// ===================================================================
// INICIALIZACIÓN Y EVENTOS
// ===================================================================

// Instancia del motor de simulación
const engine = new SimulationEngine();

// Configurar canvas
function setupCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = 500;
    
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    setupCanvas();
    setupEventListeners();
    generateDefaultDynodes();
    updateDynodeTable();
    // Renderizado inicial para mostrar los dinodos
    engine.render();
});

function setupEventListeners() {
    // Controles de simulación
    document.getElementById('play-simulation').addEventListener('click', () => {
        const photonCount = parseInt(document.getElementById('photon-count').value) || 5;
        
        // Generar dinodos si no existen
        if (pmtConfig.dynodes.length === 0) {
            generateDefaultDynodes();
        }
        
        engine.generatePhotons(photonCount);
        engine.start();
    });
    
    document.getElementById('pause-simulation').addEventListener('click', () => {
        engine.pause();
    });
    
    document.getElementById('stop-simulation').addEventListener('click', () => {
        engine.stop();
    });
    
    // Velocidad de simulación
    document.getElementById('sim-speed').addEventListener('input', (e) => {
        simulationState.speed = parseFloat(e.target.value);
        document.getElementById('speed-value').textContent = e.target.value + 'x';
    });
    
    // Modelo de amplificación
    document.getElementById('amplification-model').addEventListener('change', (e) => {
        pmtConfig.amplificationModel = e.target.value;
        document.getElementById('simple-model-params').style.display = 
            e.target.value === 'simple' ? 'block' : 'none';
        document.getElementById('advanced-model-params').style.display = 
            e.target.value === 'advanced' ? 'block' : 'none';
    });
    
    // Elementos principales (fotocátodo, acelerador, grid, ánodo)
    document.getElementById('photocathode-voltage').addEventListener('input', (e) => {
        pmtConfig.photocathode.voltage = parseInt(e.target.value);
        updateElementConfiguration('photocathode');
    });
    
    document.getElementById('accelerator-enabled').addEventListener('change', (e) => {
        pmtConfig.accelerator.enabled = e.target.checked;
        updateElementConfiguration('accelerator');
    });
    
    document.getElementById('accelerator-voltage').addEventListener('input', (e) => {
        pmtConfig.accelerator.voltage = parseInt(e.target.value);
        updateElementConfiguration('accelerator');
    });
    
    document.getElementById('grid-enabled').addEventListener('change', (e) => {
        pmtConfig.grid.enabled = e.target.checked;
        updateElementConfiguration('grid');
    });
    
    document.getElementById('grid-voltage').addEventListener('input', (e) => {
        pmtConfig.grid.voltage = parseInt(e.target.value);
        updateElementConfiguration('grid');
    });
    
    document.getElementById('anode-voltage').addEventListener('input', (e) => {
        pmtConfig.anode.voltage = parseInt(e.target.value);
        updateElementConfiguration('anode');
    });
    
    // Generación de dinodos
    document.getElementById('generate-dynodes').addEventListener('click', generateDefaultDynodes);
    
    // Limpiar canvas
    document.getElementById('clear-canvas').addEventListener('click', () => {
        engine.stop();
        pmtConfig.dynodes = [];
        updateDynodeTable();
    });
    
    // Parámetros del modelo simple
    ['simple-r', 'simple-beta'].forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            const param = id.split('-')[1];
            pmtConfig.simpleParams[param] = parseFloat(e.target.value);
        });
    });
    
    // Parámetros del modelo avanzado
    ['advanced-sigma-e', 'advanced-e-max', 'advanced-sigma-max', 'advanced-s'].forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            const param = id.replace('advanced-', '').replace('-', '_');
            pmtConfig.advancedParams[param] = parseFloat(e.target.value);
        });
    });
    
    // Configuración de archivo
    document.getElementById('save-config').addEventListener('click', saveConfiguration);
    document.getElementById('load-config').addEventListener('click', loadConfiguration);
    document.getElementById('export-results').addEventListener('click', exportResults);
}

// Función para actualizar la configuración de elementos principales
function updateElementConfiguration(elementType) {
    // Verificar si el elemento existe en la configuración
    if (!pmtConfig[elementType]) {
        console.warn(`El elemento ${elementType} no existe en la configuración`);
        return;
    }
    
    // Actualizar voltaje y estado según inputs del usuario
    const config = pmtConfig[elementType];
    const enabledElement = document.getElementById(`${elementType}-enabled`);
    const voltageElement = document.getElementById(`${elementType}-voltage`);
    
    // Actualizar el estado habilitado/deshabilitado si hay un checkbox
    if (enabledElement) {
        config.enabled = enabledElement.checked;
        // Si está deshabilitado, deshabilitar también el campo de voltaje
        if (voltageElement) {
            voltageElement.disabled = !config.enabled;
        }
    }
    
    // Actualizar el voltaje si hay un campo
    if (voltageElement) {
        config.voltage = parseInt(voltageElement.value) || 0;
    }
    
    // Si no existe la posición del elemento, crear una por defecto según su tipo
    if (!config.position) {
        createDefaultPositionForElement(elementType);
    }
    
    // Actualizar la representación visual del elemento
    updateElementShape(elementType);
    
    // Si estamos en simulación, actualizar campos eléctricos
    if (simulationState.isRunning) {
        engine.render();
    }
    
    console.log(`Configuración actualizada para ${elementType}:`, config);
}

// Crear posiciones por defecto para elementos principales
function createDefaultPositionForElement(elementType) {
    const config = pmtConfig[elementType];
    switch (elementType) {
        case 'photocathode':
            config.position = { x: 30, y: canvas.height/2 - 50 };
            config.shape = {
                type: 'rectangle',
                x: 30,
                y: canvas.height/2 - 50,
                w: 10,
                h: 100
            };
            break;
        case 'accelerator':
            config.position = { x: 50, y: canvas.height/2 - 40 };
            config.shape = {
                type: 'rectangle',
                x: 50,
                y: canvas.height/2 - 40,
                w: 5,
                h: 80
            };
            break;
        case 'grid':
            config.position = { x: 70, y: canvas.height/2 - 60 };
            config.shape = {
                type: 'rectangle',
                x: 70,
                y: canvas.height/2 - 60,
                w: 2,
                h: 120
            };
            break;
        case 'anode':
            const lastDynodeX = pmtConfig.dynodes.length > 0 ? 
                pmtConfig.dynodes[pmtConfig.dynodes.length-1].shape.x + 100 :
                canvas.width - 50;
            
            config.position = { x: lastDynodeX, y: canvas.height/2 - 50 };
            config.shape = {
                type: 'rectangle',
                x: lastDynodeX,
                y: canvas.height/2 - 50,
                w: 15,
                h: 100
            };
            break;
    }
}

// Actualiza la representación visual de un elemento
function updateElementShape(elementType) {
    const config = pmtConfig[elementType];
    
    // Si el elemento no está habilitado, no actualizar su forma
    if (config.hasOwnProperty('enabled') && !config.enabled) {
        return;
    }
    
    // Si no tiene shape pero sí posición, crear shape básica
    if (config.position && !config.shape) {
        config.shape = {
            type: 'rectangle',
            x: config.position.x,
            y: config.position.y,
            w: elementType === 'photocathode' ? 10 : 5,
            h: 100
        };
    }
    
    // Si es un elemento principal, asegurarse de que esté representado en la simulación
    if (['photocathode', 'accelerator', 'grid', 'anode'].includes(elementType)) {
        const existingElementIndex = pmtConfig.dynodes.findIndex(d => d.type === elementType);
        
        if (existingElementIndex >= 0) {
            // Actualizar el elemento existente
            pmtConfig.dynodes[existingElementIndex] = {
                ...pmtConfig.dynodes[existingElementIndex],
                voltage: config.voltage,
                shape: config.shape,
                position: config.position,
                type: elementType
            };
        } else if (config.enabled !== false) {
            // Añadir el elemento a dynodes si no existe y está habilitado
            pmtConfig.dynodes.push({
                id: pmtConfig.dynodes.length,
                voltage: config.voltage,
                shape: config.shape,
                position: config.position,
                type: elementType
            });
        }
    }
    
    // Actualizar la visualización
    engine.render();
}

function generateDefaultDynodes() {
    const count = parseInt(document.getElementById('dynode-count').value) || 8;
    pmtConfig.dynodes = [];
    
    const spacing = (canvas.width - 200) / (count + 1);
    const baseVoltage = -100;
    
    for (let i = 0; i < count; i++) {
        const x = 100 + spacing * (i + 1);
        const y = 150 + Math.sin(i * 0.5) * 50;
        const voltage = baseVoltage * (i + 1);
        
        pmtConfig.dynodes.push({
            id: i,
            type: 'dynode',
            voltage: voltage,
            position: { x, y },
            shape: {
                type: 'rectangle',
                x: x - 15,
                y: y - 10,
                w: 30,
                h: 20
            }
        });
    }
    
    updateDynodeTable();
    engine.render();
}

function updateDynodeTable() {
    const tbody = document.querySelector('#dynode-table tbody');
    tbody.innerHTML = '';
    
    pmtConfig.dynodes.forEach((dynode, index) => {
        const row = document.createElement('tr');
        row.id = `dynode-row-${index}`;
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><input type="number" value="${dynode.voltage}" onchange="updateDynodeVoltage(${index}, this.value)"></td>
            <td id="gain-${index}">1.0</td>
            <td>${dynode.position ? `(${Math.round(dynode.position.x)}, ${Math.round(dynode.position.y)})` : 'N/A'}</td>
            <td><span class="status-indicator ${dynode.voltage < 0 ? 'active' : 'inactive'}"></span></td>
        `;
        
        tbody.appendChild(row);
    });
}

function updateDynodeVoltage(index, voltage) {
    pmtConfig.dynodes[index].voltage = parseFloat(voltage);
    
    // Actualizar indicador de estado
    const statusIndicator = document.querySelector(`#dynode-row-${index} .status-indicator`);
    statusIndicator.className = `status-indicator ${voltage < 0 ? 'active' : 'inactive'}`;
}

function saveConfiguration() {
    const config = {
        pmtConfig: pmtConfig,
        timestamp: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pmt-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function loadConfiguration() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const config = JSON.parse(e.target.result);
                    pmtConfig = config.pmtConfig || config;
                    updateDynodeTable();
                    engine.render();
                } catch (error) {
                    alert('Error al cargar la configuración: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function exportResults() {
    const results = {
        statistics: simulationState.statistics,
        configuration: pmtConfig,
        timestamp: new Date().toISOString(),
        photonPaths: simulationState.photons.map(p => ({
            id: p.id,
            generation: p.generation,
            path: p.path,
            energy: p.energy
        }))
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pmt-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Redimensionar canvas
window.addEventListener('resize', setupCanvas);

// Renderizado inicial
setupCanvas();

// Al cargar el DOM, inicializar elementos principales
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar los elementos principales
    function initializeMainElements() {
        // Inicializar fotocátodo
        const photocathodeVoltage = parseInt(document.getElementById('photocathode-voltage').value) || 0;
        pmtConfig.photocathode.voltage = photocathodeVoltage;
        updateElementConfiguration('photocathode');
        
        // Inicializar acelerador (si está habilitado)
        const acceleratorEnabled = document.getElementById('accelerator-enabled').checked;
        const acceleratorVoltage = parseInt(document.getElementById('accelerator-voltage').value) || -50;
        pmtConfig.accelerator.enabled = acceleratorEnabled;
        pmtConfig.accelerator.voltage = acceleratorVoltage;
        document.getElementById('accelerator-voltage').disabled = !acceleratorEnabled;
        updateElementConfiguration('accelerator');
        
        // Inicializar grid (si está habilitado)
        const gridEnabled = document.getElementById('grid-enabled').checked;
        const gridVoltage = parseInt(document.getElementById('grid-voltage').value) || -20;
        pmtConfig.grid.enabled = gridEnabled;
        pmtConfig.grid.voltage = gridVoltage;
        document.getElementById('grid-voltage').disabled = !gridEnabled;
        updateElementConfiguration('grid');
        
        // Inicializar ánodo
        const anodeVoltage = parseInt(document.getElementById('anode-voltage').value) || 1000;
        pmtConfig.anode.voltage = anodeVoltage;
        updateElementConfiguration('anode');
        
        console.log('Elementos principales inicializados:', {
            photocathode: pmtConfig.photocathode,
            accelerator: pmtConfig.accelerator,
            grid: pmtConfig.grid,
            anode: pmtConfig.anode
        });
    }

    // Llamar a la función de inicialización
    initializeMainElements();
});

// Al final de la definición de la clase Photon, asegurar métodos en su prototipo
Photon.prototype.calculateGammaFactor = function() {
    const v = Math.sqrt(this.vx * this.vx + this.vy * this.vy) * PHYSICS.pixelToMeter;
    const beta2 = (v * v) / (PHYSICS.speedOfLight * PHYSICS.speedOfLight);
    return 1 / Math.sqrt(1 - beta2);
};

Photon.prototype.calculateKineticEnergy = function() {
    const gamma = this.calculateGammaFactor();
    const restEnergy = PHYSICS.electronMass * PHYSICS.speedOfLight * PHYSICS.speedOfLight;
    const kineticJoules = (gamma - 1) * restEnergy;
    return kineticJoules / PHYSICS.eVtoJoules;
};
