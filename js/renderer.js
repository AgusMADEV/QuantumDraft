// ===================================================================
// MOTOR DE SIMULACIÓN Y RENDERIZADO - Simulador Fotomultiplicador 2D
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
        
        // Agregar fotones secundarios
        if (this.newPhotons.length > 0) {
            updated.push(...this.newPhotons);
            this.newPhotons = [];
        }
        simulationState.photons = updated;
        
        // Calcular estadísticas
        this.updateStatistics();
    }
    
    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
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
            ctx.fillStyle = shape.style?.fill || this.getElementColor(dynode.type || 'dynode');
            ctx.strokeStyle = shape.style?.border || '#333';
            ctx.lineWidth = 2;

            // Aplicar estilo específico si existe
            if (shape.selected) {
                ctx.shadowColor = '#3b82f6';
                ctx.shadowBlur = 10;
                ctx.lineWidth = 3;
            }

            this.drawShape(shape);
            ctx.restore();

            // Etiqueta
            const center = this.getShapeCenter(dynode.shape);
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            
            // Etiqueta según tipo
            let label = dynode.type === 'dynode' ? `D${index + 1}` : this.getElementLabel(dynode.type);
            ctx.fillText(label, center.x, center.y + 4);
        });
        
        // Dibujar previsualización de polígono si existe
        if (window.drawingState && drawingState.polygonPoints && drawingState.polygonPoints.length > 1) {
            this.drawPreviewPolygon();
        }
    }
    
    getElementLabel(type) {
        const labels = {
            'photocathode': 'PC',
            'accelerator': 'ACC',
            'grid': 'GR',
            'anode': 'AN'
        };
        return labels[type] || type.substring(0, 2).toUpperCase();
    }
    
    drawPreviewPolygon() {
        if (!drawingState || drawingState.polygonPoints.length < 2) return;
        
        ctx.save();
        
        ctx.strokeStyle = drawingState.shapeProps.border;
        ctx.fillStyle = drawingState.shapeProps.fill;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(drawingState.polygonPoints[0].x, drawingState.polygonPoints[0].y);
        
        for (let i = 1; i < drawingState.polygonPoints.length; i++) {
            ctx.lineTo(drawingState.polygonPoints[i].x, drawingState.polygonPoints[i].y);
        }
        
        ctx.closePath();
        ctx.globalAlpha = 0.7;  // Semitransparente
        ctx.fill();
        ctx.stroke();
        
        // Dibujar puntos de control
        drawingState.polygonPoints.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.stroke();
        });
        
        ctx.restore();
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
        document.getElementById('total-gain').textContent = simulationState.statistics.averageGain.toFixed(1);
        document.getElementById('simulation-time').textContent = (simulationState.time * 1000).toFixed(2) + 'ms';
        document.getElementById('detected-photons').textContent = simulationState.statistics.detectedPhotons;
        document.getElementById('quantum-efficiency').textContent = simulationState.statistics.quantumEfficiency.toFixed(1) + '%';
        document.getElementById('average-gain').textContent = simulationState.statistics.averageGain.toFixed(1);
        document.getElementById('transit-time').textContent = simulationState.statistics.transitTime.toFixed(1) + ' ns';
        
        // Diagnósticos físicos
        if (simulationState.photons.length > 0) {
            const diagnostics = this.calculatePhysicsDiagnostics();
            document.getElementById('average-energy').textContent = diagnostics.averageEnergy.toFixed(2) + ' eV';
            document.getElementById('average-velocity').textContent = diagnostics.averageVelocity.toFixed(2) + ' m/s';
            
            // Calcular gamma máximo
            const maxGamma = Math.max(...simulationState.photons.map(p => {
                return p.isActive ? p.calculateGammaFactor().toFixed(2) : 1.0;
            }));
            document.getElementById('max-gamma').textContent = maxGamma;
        }
    }
    
    calculatePhysicsDiagnostics() {
        const activePhotons = simulationState.photons.filter(p => p.isActive);
        if (activePhotons.length === 0) return { averageEnergy: 0, averageVelocity: 0 };
        
        let totalEnergy = 0, totalVelocity = 0;
        
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
        if (current >= MAX_PARTICLES) return;
        
        const available = MAX_PARTICLES - current;
        count = Math.min(count, available);

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
                x = center.x - 50;
                y = center.y;
            } else {
                x = canvas.width * 0.1;
                y = canvas.height / 2;
            }
            
            const photon = new Photon(x, y);
            photon.vx = 100; // píxeles/frame
            photon.vy = 0;

            simulationState.photons.push(photon);
            simulationState.statistics.totalPhotons++;
        }
    }
}

// Instanciar motor de simulación
const engine = new SimulationEngine();

// Configuración del canvas
function setupCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = 500;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}