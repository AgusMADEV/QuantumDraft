// ===================================================================
// VALIDADOR - Simulador Fotomultiplicador 2D
// ===================================================================

/**
 * Sistema de validación para comprobar el funcionamiento correcto de los componentes
 * del simulador de fotomultiplicador.
 */

const Validator = {
    /**
     * Inicia todas las pruebas de validación
     */
    runAllTests() {
        console.log('🔍 Iniciando validación del sistema...');
        
        this.testDrawingTools();
        this.testElementCreation();
        this.testSimulationMode();
        this.testPhysicsEngine();
        this.testUIInteraction();
        
        console.log('✅ Validación completada');
    },
    
    /**
     * Comprueba las herramientas de dibujo
     */
    testDrawingTools() {
        console.log('🖌️ Comprobando herramientas de dibujo...');
        
        try {
            // Comprobar que el canvas existe
            const canvas = document.getElementById('pmt-canvas');
            console.log(`  - Canvas encontrado: ${!!canvas}`);
            
            // Verificar que las herramientas de dibujo están configuradas
            const tools = ['rectangle', 'ellipse', 'polygon', 'select'].map(tool => {
                const button = document.querySelector(`[data-tool="${tool}"]`);
                return { tool, exists: !!button };
            });
            
            tools.forEach(t => console.log(`  - Herramienta ${t.tool}: ${t.exists ? '✅' : '❌'}`));
            
            // Comprobar el modo de dibujo actual
            if (window.drawingState) {
                console.log(`  - Modo de dibujo actual: ${window.drawingState.mode || 'ninguno'}`);
            } else {
                console.warn('  - ⚠️ No se encontró el estado de dibujo');
            }
        } catch (error) {
            console.error('  - ❌ Error comprobando herramientas de dibujo:', error);
        }
    },
    
    /**
     * Comprueba la creación de elementos
     */
    testElementCreation() {
        console.log('🧪 Comprobando creación de elementos...');
        
        try {
            // Verificar la configuración PMT
            if (window.pmtConfig) {
                console.log('  - Configuración PMT encontrada');
                
                // Comprobar elementos principales
                const elements = ['photocathode', 'accelerator', 'grid', 'anode'];
                elements.forEach(elem => {
                    const exists = !!pmtConfig[elem];
                    console.log(`  - Elemento ${elem}: ${exists ? '✅' : '❌'}`);
                    
                    // Comprobar propiedades del elemento
                    if (exists) {
                        const hasPosition = !!pmtConfig[elem].position;
                        const hasShape = !!pmtConfig[elem].shape;
                        const hasVoltage = typeof pmtConfig[elem].voltage === 'number';
                        
                        console.log(`    - Posición: ${hasPosition ? '✅' : '❌'}`);
                        console.log(`    - Forma: ${hasShape ? '✅' : '❌'}`);
                        console.log(`    - Voltaje: ${hasVoltage ? '✅' : '❌'}`);
                    }
                });
                
                // Comprobar dinodos
                const dynodes = pmtConfig.dynodes || [];
                console.log(`  - Dinodos encontrados: ${dynodes.length}`);
            } else {
                console.warn('  - ⚠️ No se encontró la configuración PMT');
            }
        } catch (error) {
            console.error('  - ❌ Error comprobando creación de elementos:', error);
        }
    },
    
    /**
     * Comprueba el modo de simulación
     */
    testSimulationMode() {
        console.log('🔬 Comprobando modo de simulación...');
        
        try {
            // Verificar el estado de la simulación
            if (window.simulationState) {
                console.log(`  - Estado de simulación: ${simulationState.running ? 'Ejecutando' : 'Detenido'}`);
                console.log(`  - Tiempo de simulación: ${simulationState.time}s`);
                console.log(`  - Fotones activos: ${simulationState.photons.filter(p => p.isActive).length}`);
            } else {
                console.warn('  - ⚠️ No se encontró el estado de simulación');
            }
            
            // Verificar el motor de simulación
            if (window.engine) {
                console.log('  - Motor de simulación encontrado');
                
                // Comprobar funciones críticas
                const methods = ['start', 'pause', 'stop', 'render', 'update', 'generatePhotons'];
                methods.forEach(method => {
                    const exists = typeof engine[method] === 'function';
                    console.log(`    - Método ${method}: ${exists ? '✅' : '❌'}`);
                });
            } else {
                console.warn('  - ⚠️ No se encontró el motor de simulación');
            }
        } catch (error) {
            console.error('  - ❌ Error comprobando modo de simulación:', error);
        }
    },
    
    /**
     * Comprueba el motor físico
     */
    testPhysicsEngine() {
        console.log('⚛️ Comprobando motor físico...');
        
        try {
            // Verificar constantes físicas
            if (window.PHYSICS) {
                console.log('  - Constantes físicas encontradas');
            } else {
                console.warn('  - ⚠️ No se encontraron constantes físicas');
            }
            
            // Verificar calculador de campo eléctrico
            if (window.ElectricFieldCalculator) {
                console.log('  - Calculador de campo eléctrico encontrado');
                
                // Comprobar funciones críticas
                const methods = ['getFieldAt', 'updateField', 'drawField'];
                methods.forEach(method => {
                    const exists = typeof ElectricFieldCalculator[method] === 'function';
                    console.log(`    - Método ${method}: ${exists ? '✅' : '❌'}`);
                });
                
                // Probar cálculo de campo en un punto
                try {
                    const field = ElectricFieldCalculator.getFieldAt(100, 100);
                    console.log(`  - Prueba de campo: ${field.Ex !== undefined && field.Ey !== undefined ? '✅' : '❌'}`);
                } catch (e) {
                    console.warn('  - ⚠️ Error al calcular campo eléctrico');
                }
            } else {
                console.warn('  - ⚠️ No se encontró el calculador de campo eléctrico');
            }
            
            // Verificar pool de objetos
            if (window.photonPool) {
                console.log('  - Pool de objetos encontrada');
                
                // Comprobar funciones críticas
                const methods = ['get', 'release', 'expandPool'];
                methods.forEach(method => {
                    const exists = typeof photonPool[method] === 'function';
                    console.log(`    - Método ${method}: ${exists ? '✅' : '❌'}`);
                });
            } else {
                console.warn('  - ⚠️ No se encontró la pool de objetos');
            }
        } catch (error) {
            console.error('  - ❌ Error comprobando motor físico:', error);
        }
    },
    
    /**
     * Comprueba las interacciones de la UI
     */
    testUIInteraction() {
        console.log('🖱️ Comprobando interacciones de UI...');
        
        try {
            // Verificar event listeners
            const buttons = {
                'play-simulation': '▶ Iniciar',
                'pause-simulation': '⏸ Pausar',
                'stop-simulation': '⏹ Detener',
                'increase-dynodes': '+',
                'decrease-dynodes': '-',
                'generate-dynodes': 'Generar Voltajes',
                'clear-canvas': 'Limpiar Todo'
            };
            
            Object.entries(buttons).forEach(([id, label]) => {
                const button = document.getElementById(id);
                console.log(`  - Botón "${label}": ${button ? '✅' : '❌'}`);
            });
            
            // Verificar actualizaciones de tablas
            const dynodeTable = document.getElementById('dynode-table');
            console.log(`  - Tabla de dinodos: ${dynodeTable ? '✅' : '❌'}`);
            
            // Verificar campos de entrada
            const inputs = [
                'photocathode-voltage', 
                'accelerator-voltage', 
                'grid-voltage', 
                'anode-voltage',
                'dynode-count',
                'photon-count',
                'sim-speed'
            ];
            
            inputs.forEach(id => {
                const input = document.getElementById(id);
                console.log(`  - Input "${id}": ${input ? '✅' : '❌'}`);
            });
            
        } catch (error) {
            console.error('  - ❌ Error comprobando interacciones de UI:', error);
        }
    },
    
    /**
     * Simular acciones de usuario para probar funcionalidades
     */
    simulateUserActions() {
        console.log('👆 Simulando acciones de usuario...');
        
        try {
            // 1. Simular clic en botón de iniciar simulación
            const playButton = document.getElementById('play-simulation');
            if (playButton) {
                console.log('  - Simulando clic en Iniciar...');
                playButton.click();
                setTimeout(() => {
                    console.log(`  - Estado simulación: ${simulationState.running ? 'Ejecutando ✅' : 'Detenido ❌'}`);
                    
                    // 2. Simular clic en botón de pausar simulación
                    const pauseButton = document.getElementById('pause-simulation');
                    if (pauseButton) {
                        console.log('  - Simulando clic en Pausar...');
                        pauseButton.click();
                        
                        setTimeout(() => {
                            console.log(`  - Estado simulación: ${simulationState.running ? 'Ejecutando ❌' : 'Detenido ✅'}`);
                        }, 100);
                    }
                }, 100);
            }
            
            // 3. Simular selección de herramienta de dibujo
            const rectangleTool = document.querySelector('[data-tool="rectangle"]');
            if (rectangleTool) {
                console.log('  - Simulando selección de herramienta Rectángulo...');
                rectangleTool.click();
                
                setTimeout(() => {
                    if (window.drawingState) {
                        console.log(`  - Modo de dibujo actual: ${window.drawingState.mode === 'rectangle' ? 'Rectángulo ✅' : window.drawingState.mode + ' ❌'}`);
                    }
                }, 100);
            }
            
        } catch (error) {
            console.error('  - ❌ Error simulando acciones de usuario:', error);
        }
    },
    
    /**
     * Depurador visual para elementos
     */
    debugElements() {
        if (!window.pmtConfig) return;
        
        // Añadir etiquetas temporales en los elementos
        const elements = [
            pmtConfig.photocathode,
            pmtConfig.anode,
            ...(pmtConfig.dynodes || []),
            ...(pmtConfig.accelerator?.enabled ? [pmtConfig.accelerator] : []),
            ...(pmtConfig.grid?.enabled ? [pmtConfig.grid] : [])
        ].filter(e => e);
        
        // Guardar función de dibujo original
        const originalDrawElements = window.drawElements;
        
        // Sobreescribir temporalmente para añadir etiquetas de debug
        window.drawElements = function() {
            originalDrawElements();
            
            // Añadir etiquetas de debug
            elements.forEach(element => {
                if (!element?.shape) return;
                
                const shape = element.shape;
                let x, y;
                
                if (shape.type === 'rectangle') {
                    x = shape.x + shape.w/2;
                    y = shape.y + shape.h/2;
                } else if (shape.type === 'ellipse') {
                    x = shape.x + shape.w/2;
                    y = shape.y + shape.h/2;
                } else if (shape.type === 'polygon' && shape.points?.length) {
                    const xSum = shape.points.reduce((sum, p) => sum + p.x, 0);
                    const ySum = shape.points.reduce((sum, p) => sum + p.y, 0);
                    x = xSum / shape.points.length;
                    y = ySum / shape.points.length;
                } else {
                    return;
                }
                
                // Dibujar etiqueta
                ctx.fillStyle = '#ffff00';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                
                // Determinar tipo de elemento
                let type = element.type || 'unknown';
                ctx.fillText(`[${type}]`, x, y - 5);
            });
        };
        
        // Renderizar una vez para mostrar etiquetas
        if (window.engine?.render) {
            engine.render();
        }
        
        console.log('🔍 Modo depuración visual activado. Elementos etiquetados en el canvas.');
        console.log('   Para desactivar, recarga la página.');
    },
    
    /**
     * Prueba específica para creación de elementos mediante dibujo
     */
    testDrawElement(type = 'rectangle', elementType = 'anode') {
        console.log(`🖌️ Probando dibujo de ${type} como ${elementType}...`);
        
        try {
            // 1. Seleccionar la herramienta
            const tool = document.querySelector(`[data-tool="${type}"]`);
            if (tool) tool.click();
            
            // 2. Crear elemento virtual en el centro del canvas
            const canvas = document.getElementById('pmt-canvas');
            if (!canvas) {
                console.warn('  - ⚠️ Canvas no encontrado');
                return;
            }
            
            const x = canvas.width / 4;
            const y = canvas.height / 4;
            const w = canvas.width / 2;
            const h = canvas.height / 2;
            
            // 3. Simular creación de elemento
            if (window.drawingState) {
                drawingState.mode = type;
                drawingState.currentElement = {
                    type: elementType,
                    voltage: 100,
                    shape: {
                        type: type,
                        x: x,
                        y: y,
                        w: w,
                        h: h,
                        points: type === 'polygon' ? [
                            {x: x, y: y},
                            {x: x+w, y: y},
                            {x: x+w, y: y+h},
                            {x: x, y: y+h}
                        ] : undefined
                    }
                };
                
                // 4. Verificar o crear función para aceptar el elemento
                if (typeof window.acceptDrawnElement === 'function') {
                    console.log('  - Aceptando elemento dibujado...');
                    window.acceptDrawnElement();
                    
                    // 5. Verificar si el elemento se ha creado correctamente
                    setTimeout(() => {
                        const elements = [
                            pmtConfig.photocathode,
                            pmtConfig.anode,
                            ...(pmtConfig.dynodes || []),
                            ...(pmtConfig.accelerator?.enabled ? [pmtConfig.accelerator] : []),
                            ...(pmtConfig.grid?.enabled ? [pmtConfig.grid] : [])
                        ].filter(e => e);
                        
                        const createdElement = elements.find(e => 
                            e.shape?.type === type && 
                            e.type === elementType && 
                            e.voltage === 100
                        );
                        
                        console.log(`  - Elemento creado: ${createdElement ? '✅' : '❌'}`);
                    }, 100);
                } else {
                    console.warn('  - ⚠️ Función acceptDrawnElement no encontrada');
                }
            } else {
                console.warn('  - ⚠️ Estado de dibujo no encontrado');
            }
        } catch (error) {
            console.error('  - ❌ Error probando dibujo de elemento:', error);
        }
    }
};

// Añadir botón de validación a la interfaz
function addValidationButton() {
    const controlsSection = document.querySelector('.controls');
    if (!controlsSection) return;
    
    const validationSection = document.createElement('div');
    validationSection.className = 'validation-tools';
    validationSection.innerHTML = `
        <h4>Herramientas de Validación</h4>
        <div class="button-group">
            <button id="run-validation" style="background-color: #4CAF50; color: white;">Ejecutar Validación</button>
            <button id="debug-elements" style="background-color: #FFC107;">Modo Debug Visual</button>
            <button id="test-drawing" style="background-color: #2196F3;">Probar Dibujo</button>
        </div>
        <div id="validation-results" style="margin-top: 10px; max-height: 150px; overflow-y: auto; font-size: 12px;"></div>
    `;
    
    controlsSection.appendChild(validationSection);
    
    // Añadir event listeners
    document.getElementById('run-validation').addEventListener('click', () => {
        const resultsDiv = document.getElementById('validation-results');
        resultsDiv.innerHTML = '<p>Ejecutando validación...</p>';
        
        // Capturar logs para mostrarlos en la UI
        const oldLog = console.log;
        const logs = [];
        
        console.log = function(...args) {
            oldLog.apply(console, args);
            logs.push(args.join(' '));
        };
        
        // Ejecutar validación
        setTimeout(() => {
            Validator.runAllTests();
            
            // Restaurar console.log
            console.log = oldLog;
            
            // Mostrar resultados
            resultsDiv.innerHTML = logs.map(log => `<div>${log}</div>`).join('');
        }, 100);
    });
    
    document.getElementById('debug-elements').addEventListener('click', () => {
        Validator.debugElements();
    });
    
    document.getElementById('test-drawing').addEventListener('click', () => {
        const resultsDiv = document.getElementById('validation-results');
        resultsDiv.innerHTML = '<p>Probando dibujo de elemento...</p>';
        
        // Capturar logs
        const oldLog = console.log;
        const logs = [];
        
        console.log = function(...args) {
            oldLog.apply(console, args);
            logs.push(args.join(' '));
        };
        
        // Ejecutar prueba
        setTimeout(() => {
            Validator.testDrawElement('rectangle', 'anode');
            
            // Restaurar console.log
            console.log = oldLog;
            
            // Mostrar resultados
            resultsDiv.innerHTML = logs.map(log => `<div>${log}</div>`).join('');
        }, 100);
    });
}

// Cuando el DOM esté cargado, añadir botón de validación
document.addEventListener('DOMContentLoaded', addValidationButton);

// Exponer validador globalmente
window.Validator = Validator;