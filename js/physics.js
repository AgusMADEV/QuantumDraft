// ===================================================================
// PHYSICS - Simulador Fotomultiplicador 2D
// ===================================================================

// Object Pooling para gestión optimizada de partículas
class ObjectPool {
    constructor(objectFactory, initialSize = 100) {
        this.objectFactory = objectFactory;
        this.pool = [];
        
        // Pre-crear objetos iniciales
        this.expandPool(initialSize);
    }
    
    expandPool(count) {
        for (let i = 0; i < count; i++) {
            const obj = this.objectFactory();
            obj.isActive = false;
            this.pool.push(obj);
        }
    }
    
    get() {
        // Buscar un objeto disponible
        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].isActive) {
                this.pool[i].isActive = true;
                return this.pool[i];
            }
        }
        
        // Si no hay objetos disponibles, expandir pool
        console.log('Expandiendo pool de objetos');
        this.expandPool(Math.ceil(this.pool.length * 0.5)); // Expandir 50%
        return this.get();
    }
    
    release(object) {
        object.isActive = false;
        // Restablecer propiedades críticas
        if (object.reset && typeof object.reset === 'function') {
            object.reset();
        }
    }
}

// Clase Photon - Representación de partícula física
class Photon {
    constructor(x, y) {
        this.reset();
        this.position = { x, y };
        this.velocity = { x: 0, y: 0 };
        this.acceleration = { x: 0, y: 0 };
        this.isActive = true;
    }
    
    reset() {
        this.position = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.acceleration = { x: 0, y: 0 };
        this.mass = 9.1093837e-31; // kg (masa del electrón)
        this.charge = -1.602176634e-19; // C (carga del electrón)
        this.energy = 1.5; // eV (energía inicial, ajustable)
        this.trail = [];
        this.trailMaxSize = 20;
        this.isActive = false;
        this.lifetime = 0; // tiempo de vida en segundos
        this.color = '#ffffff';
        this.amplification = 1;
        this.hitCount = 0;
    }
    
    // Métodos para dibujar
    static draw(ctx) {
        if (!this.isActive) return;
        
        // Dibujar trail
        if (this.trail.length > 1) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            
            ctx.stroke();
        }
        
        // Dibujar partícula
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Actualización física
    static update(photon, dt) {
        if (!photon.isActive) return;
        
        // Incrementar tiempo de vida
        photon.lifetime += dt;
        
        // Añadir posición actual al trail
        if (photon.trail.length >= photon.trailMaxSize) {
            photon.trail.shift(); // Eliminar punto más antiguo
        }
        photon.trail.push({ x: photon.position.x, y: photon.position.y });
        
        // Calcular fuerza eléctrica
        const electricField = ElectricFieldCalculator.getFieldAt(photon.position.x, photon.position.y);
        const electricForce = {
            x: electricField.Ex * photon.charge,
            y: electricField.Ey * photon.charge
        };
        
        // F = m·a => a = F/m
        photon.acceleration.x = electricForce.x / photon.mass;
        photon.acceleration.y = electricForce.y / photon.mass;
        
        // Actualizar velocidad (V = Vo + a·t)
        photon.velocity.x += photon.acceleration.x * dt;
        photon.velocity.y += photon.acceleration.y * dt;
        
        // Actualizar posición (P = Po + V·t + 0.5·a·t²)
        photon.position.x += photon.velocity.x * dt + 0.5 * photon.acceleration.x * dt * dt;
        photon.position.y += photon.velocity.y * dt + 0.5 * photon.acceleration.y * dt * dt;
        
        // Comprobar colisiones con elementos
        checkCollisions(photon);
        
        // Verificar si está fuera del canvas o ha vivido demasiado
        const canvas = document.getElementById('pmt-canvas');
        if (!canvas) return;
        
        if (
            photon.position.x < -10 || 
            photon.position.x > canvas.width + 10 ||
            photon.position.y < -10 || 
            photon.position.y > canvas.height + 10 ||
            photon.lifetime > 1 // máximo 1 segundo de vida
        ) {
            photon.isActive = false;
        }
    }
}

// Crear la pool global de fotones
const photonPool = new ObjectPool(() => new Photon(0, 0), 200);

// Calcular ganancia de un dinodo según modelo
function calculateDynodeGain(dynode, index) {
    const amplificationModel = pmtConfig.amplificationModel;
    let gain = 1;
    
    // Si el índice es 0 (primer dinodo), usar QE del fotocátodo
    if (index === 0) {
        gain = 0.25; // QE típica 25%
    }
    // Si no, calcular según modelo
    else if (amplificationModel === 'simple') {
        const params = pmtConfig.simpleParams;
        const r = params.r || 2;
        const beta = params.beta || 0.7;
        
        // Diferencia de voltaje con el dinodo anterior
        let voltageDiff = 0;
        if (index > 0 && pmtConfig.dynodes[index-1]) {
            voltageDiff = Math.abs(dynode.voltage - pmtConfig.dynodes[index-1].voltage);
        } else {
            voltageDiff = Math.abs(dynode.voltage - pmtConfig.photocathode.voltage);
        }
        
        // Fórmula simple: G = r * (ΔV)^β
        gain = r * Math.pow(voltageDiff, beta);
        gain = Math.max(1, Math.min(gain, 10)); // Limitar entre 1-10
    }
    else if (amplificationModel === 'advanced') {
        const params = pmtConfig.advancedParams;
        
        // Parámetros del modelo avanzado
        const sigma_E = params.sigma_E || 2.2;
        const E_max = params.E_max || 1500;
        const sigma_max = params.sigma_max || 2.5;
        const s = params.s || 1.35;
        const alpha = params.alpha || 0.9;
        const delta_0 = params.delta_0 || 2.4;
        const E_0 = params.E_0 || 400;
        const theta_m = params.theta_m || 0.8;
        
        // Campo eléctrico aproximado (V/m)
        let voltage = 0;
        if (index > 0 && pmtConfig.dynodes[index-1]) {
            voltage = Math.abs(dynode.voltage - pmtConfig.dynodes[index-1].voltage);
        } else {
            voltage = Math.abs(dynode.voltage - pmtConfig.photocathode.voltage);
        }
        
        // Conversión a campo eléctrico (V/m)
        const distance = 0.01; // 1cm entre dinodos (aproximado)
        const E = voltage / distance;
        
        // Modelo avanzado de ganancia
        // δ(E) = δ_max * (E/E_max)^s * exp[s * (1 - E/E_max)]
        const exponent = s * (1 - E/E_max);
        const base = Math.pow(E/E_max, s);
        
        // Factores adicionales del paper
        const angularFactor = 1 + alpha * Math.pow(Math.cos(theta_m), 2);
        const energyFactor = delta_0 * Math.pow(E/E_0, 0.5);
        
        gain = sigma_max * base * Math.exp(exponent) * angularFactor * energyFactor;
        gain = Math.max(1, Math.min(gain, 15)); // Limitar entre 1-15
    }
    
    return gain;
}

// Comprobar colisiones de una partícula con elementos
function checkCollisions(photon) {
    if (!photon.isActive) return;
    
    // Comprobar colisión con fotocátodo
    if (checkElementCollision(photon, pmtConfig.photocathode)) {
        // Absorción o reflexión
        if (Math.random() < 0.1) { // 10% de probabilidad de reflexión
            reflectParticle(photon);
        } else {
            // Absorción - inactivar partícula
            photon.isActive = false;
        }
        return;
    }
    
    // Comprobar colisión con dinodos
    for (let i = 0; i < pmtConfig.dynodes.length; i++) {
        const dynode = pmtConfig.dynodes[i];
        if (checkElementCollision(photon, dynode)) {
            dynode.hit = true;
            setTimeout(() => { dynode.hit = false; }, 50);
            
            // Calcular ganancia para este dinodo
            const gain = calculateDynodeGain(dynode, i);
            
            // Generar electrones secundarios
            generateSecondaryElectrons(photon, dynode, gain);
            
            // Desactivar partícula original
            photon.isActive = false;
            return;
        }
    }
    
    // Comprobar colisión con ánodo
    if (checkElementCollision(photon, pmtConfig.anode)) {
        // Partícula detectada
        simulationState.statistics.detectedPhotons++;
        
        // Marcar ánodo como golpeado
        pmtConfig.anode.hit = true;
        setTimeout(() => { pmtConfig.anode.hit = false; }, 50);
        
        // Desactivar partícula
        photon.isActive = false;
        return;
    }
    
    // Elementos opcionales
    if (pmtConfig.accelerator.enabled && 
        checkElementCollision(photon, pmtConfig.accelerator)) {
        // Aceleración adicional
        const accelFactor = 1.5;
        photon.velocity.x *= accelFactor;
        photon.velocity.y *= accelFactor;
        return;
    }
    
    if (pmtConfig.grid.enabled && 
        checkElementCollision(photon, pmtConfig.grid)) {
        // Enfoque de haz de electrones
        normalizeVelocityTowardsAnode(photon);
        return;
    }
}

// Comprobar colisión con un elemento
function checkElementCollision(photon, element) {
    if (!element || !element.shape) return false;
    
    const shape = element.shape;
    
    // Colisión con rectángulo
    if (shape.type === 'rectangle') {
        return (
            photon.position.x >= shape.x &&
            photon.position.x <= shape.x + shape.w &&
            photon.position.y >= shape.y &&
            photon.position.y <= shape.y + shape.h
        );
    }
    // Colisión con elipse
    else if (shape.type === 'ellipse') {
        const rx = shape.w / 2;
        const ry = shape.h / 2;
        const cx = shape.x + rx;
        const cy = shape.y + ry;
        
        // Normalizar posición relativa al centro
        const nx = (photon.position.x - cx) / rx;
        const ny = (photon.position.y - cy) / ry;
        
        // Distancia normalizada
        return (nx*nx + ny*ny <= 1);
    }
    // Colisión con polígono
    else if (shape.type === 'polygon' && shape.points) {
        return isPointInPolygon(photon.position, shape.points);
    }
    
    return false;
}

// Verificar si un punto está dentro de un polígono
function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        
        const intersect = ((yi > point.y) != (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
}

// Reflejar partícula tras colisión
function reflectParticle(photon) {
    // Invertir componente y de la velocidad (reflexión simple)
    photon.velocity.y = -photon.velocity.y;
    
    // Reducir energía
    photon.energy *= 0.8;
}

// Normalizar velocidad hacia el ánodo
function normalizeVelocityTowardsAnode(photon) {
    if (!pmtConfig.anode.position) return;
    
    // Vector dirección hacia el ánodo
    const dx = pmtConfig.anode.position.x - photon.position.x;
    const dy = pmtConfig.anode.position.y + (pmtConfig.anode.shape?.h || 0) / 2 - photon.position.y;
    
    // Normalizar
    const len = Math.sqrt(dx*dx + dy*dy);
    const dirX = dx / len;
    const dirY = dy / len;
    
    // Conservar magnitud pero cambiar dirección
    const speed = Math.sqrt(photon.velocity.x*photon.velocity.x + photon.velocity.y*photon.velocity.y);
    
    // Ajustar velocidad 
    photon.velocity.x = dirX * speed;
    photon.velocity.y = dirY * speed;
}

// Generar electrones secundarios tras impacto
function generateSecondaryElectrons(sourcePhoton, element, gain) {
    // Redondear ganancia para determinar número de electrones a generar
    const electronCount = Math.round(gain);
    
    // Energía para electrones secundarios
    const secondaryEnergy = pmtConfig.advancedParams?.sigma_E || 1.0; // eV
    
    // Generar electrones secundarios
    for (let i = 0; i < electronCount; i++) {
        // Obtener un fotón del pool
        const electron = photonPool.get();
        
        // Posición inicial: en el punto de impacto con ligera variación
        electron.position.x = sourcePhoton.position.x + (Math.random() - 0.5) * 2;
        electron.position.y = sourcePhoton.position.y + (Math.random() - 0.5) * 2;
        
        // Heredar propiedades importantes
        electron.hitCount = sourcePhoton.hitCount + 1;
        
        // Dirección: desde el elemento hacia el ánodo con dispersión
        if (pmtConfig.anode.position) {
            const dx = pmtConfig.anode.position.x - electron.position.x;
            const dy = pmtConfig.anode.position.y + (pmtConfig.anode.shape?.h || 0) / 2 - electron.position.y;
            
            // Normalizar
            const len = Math.sqrt(dx*dx + dy*dy);
            const dirX = dx / len;
            const dirY = dy / len;
            
            // Añadir dispersión aleatoria
            const dispersion = 0.2; // 20% de dispersión angular
            const angle = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * dispersion;
            
            // Velocidad inicial
            const speed = Math.sqrt(2 * secondaryEnergy * PHYSICS.eVtoJoules / electron.mass);
            electron.velocity.x = Math.cos(angle) * speed;
            electron.velocity.y = Math.sin(angle) * speed;
        } else {
            // Velocidad aleatoria si no hay ánodo definido
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.sqrt(2 * secondaryEnergy * PHYSICS.eVtoJoules / electron.mass);
            electron.velocity.x = Math.cos(angle) * speed;
            electron.velocity.y = Math.sin(angle) * speed;
        }
        
        // Agregar a la simulación
        simulationState.photons.push(electron);
    }
}

// Calculador de campo eléctrico
const ElectricFieldCalculator = {
    resolution: 20, // resolución de la cuadrícula de campo
    showField: false, // mostrar campo eléctrico
    colorIntensity: 0.5, // intensidad de color para visualizar campo (0-1)
    cachedField: null, // caché del campo para optimización
    
    // Calcular campo en un punto
    getFieldAt(x, y) {
        let Ex = 0, Ey = 0;
        let k = 8.9875e9; // Constante de Coulomb
        
        // Simplificación para mejorar rendimiento
        k = 100; // Factor arbitrario para simulación visual
        
        // Contribución de cada elemento al campo
        const elements = [
            pmtConfig.photocathode,
            pmtConfig.anode,
            ...(pmtConfig.dynodes || [])
        ];
        
        // Añadir elementos opcionales si están habilitados
        if (pmtConfig.accelerator?.enabled) elements.push(pmtConfig.accelerator);
        if (pmtConfig.grid?.enabled) elements.push(pmtConfig.grid);
        
        // Sumar contribuciones
        for (const element of elements) {
            if (!element || !element.shape || typeof element.voltage !== 'number') continue;
            
            // Centro del elemento
            let cx, cy;
            if (element.shape.type === 'rectangle') {
                cx = element.shape.x + element.shape.w / 2;
                cy = element.shape.y + element.shape.h / 2;
            } else if (element.shape.type === 'ellipse') {
                cx = element.shape.x + element.shape.w / 2;
                cy = element.shape.y + element.shape.h / 2;
            } else if (element.shape.type === 'polygon' && element.shape.points?.length > 0) {
                cx = element.shape.points.reduce((sum, p) => sum + p.x, 0) / element.shape.points.length;
                cy = element.shape.points.reduce((sum, p) => sum + p.y, 0) / element.shape.points.length;
            } else {
                continue;
            }
            
            // Distancia al elemento
            const dx = x - cx;
            const dy = y - cy;
            const distSq = dx*dx + dy*dy;
            const dist = Math.sqrt(distSq) || 0.1; // evitar división por cero
            
            // Fuerza eléctrica (proporcional al voltaje)
            const force = k * element.voltage / distSq;
            
            // Componentes del campo
            Ex += force * dx / dist;
            Ey += force * dy / dist;
        }
        
        return { Ex, Ey };
    },
    
    // Actualizar campo cuando cambian voltajes o configuración
    // Esta función debe llamarse cuando se modifica un voltaje o configuración
    updateField() {
        // Invalidar cualquier caché
        this.cachedField = null;
        
        // Notificar cambio
        if (simulationState.running) {
            // Mostrar efecto visual temporal si el campo está visible
            if (this.showField) {
                const fieldIndicator = document.getElementById('field-indicator');
                if (fieldIndicator) {
                    fieldIndicator.classList.add('field-updated');
                    setTimeout(() => fieldIndicator.classList.remove('field-updated'), 300);
                }
            }
        }
        
        return true;
    },
    
    // Ajustar densidad de visualización del campo
    setResolution(value) {
        this.resolution = Math.max(5, Math.min(50, value));
        return this.resolution;
    },
    
    // Ajustar intensidad de color del campo
    setColorIntensity(value) {
        this.colorIntensity = Math.max(0.1, Math.min(1.0, value));
        return this.colorIntensity;
    },
    
    // Dibujar campo eléctrico en canvas
    drawField(ctx) {
        if (!this.showField) return;
        
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // Dibujar cuadrícula de vectores
        const step = width / this.resolution;
        
        for (let x = step / 2; x < width; x += step) {
            for (let y = step / 2; y < height; y += step) {
                const field = this.getFieldAt(x, y);
                this.drawFieldVector(ctx, x, y, field.Ex, field.Ey);
            }
        }
    },
    
    // Dibujar un vector de campo
    drawFieldVector(ctx, x, y, Ex, Ey) {
        // Magnitud del campo
        const magnitude = Math.sqrt(Ex*Ex + Ey*Ey);
        if (magnitude < 1) return; // Ignorar campos muy débiles
        
        // Normalizar y escalar para visualización
        const scale = 10 / (1 + Math.log10(magnitude));
        const dx = Ex / magnitude * scale;
        const dy = Ey / magnitude * scale;
        
        // Color según intensidad
        const intensity = Math.min(1, magnitude / 1000) * this.colorIntensity;
        const r = Math.floor(255 * intensity);
        const g = Math.floor(100 * intensity);
        const b = Math.floor(100 + 155 * intensity);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
        
        // Dibujar vector
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
        
        // Punta de flecha
        const arrowSize = 3;
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy);
        ctx.lineTo(
            x + dx - arrowSize * Math.cos(angle - Math.PI/6),
            y + dy - arrowSize * Math.sin(angle - Math.PI/6)
        );
        ctx.lineTo(
            x + dx - arrowSize * Math.cos(angle + Math.PI/6),
            y + dy - arrowSize * Math.sin(angle + Math.PI/6)
        );
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
    },
    
    // Alternar visualización del campo
    toggleField() {
        this.showField = !this.showField;
        return this.showField;
    }
};