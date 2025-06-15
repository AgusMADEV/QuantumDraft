/**
 * Pruebas unitarias para el módulo de física
 */

suite('Módulo de Física', function() {
    
    // Prueba de constantes físicas
    test('Constantes físicas están definidas correctamente', function() {
        assertNotNull(PHYSICS, 'El objeto PHYSICS debe estar definido');
        assertNotNull(PHYSICS.electronMass, 'La masa del electrón debe estar definida');
        assertNotNull(PHYSICS.electronCharge, 'La carga del electrón debe estar definida');
        assertNotNull(PHYSICS.eVtoJoules, 'La conversión eV a Joules debe estar definida');
        assertNotNull(PHYSICS.coulomb, 'La constante de Coulomb debe estar definida');
        assertNotNull(PHYSICS.speedOfLight, 'La velocidad de la luz debe estar definida');
        assertNotNull(PHYSICS.MATERIALS, 'Los materiales deben estar definidos');
    });
    
    // Prueba del cálculo SEY (Secondary Electron Yield)
    test('La función calculateSEY calcula correctamente', function() {
        // Valores de prueba para materiales conocidos
        const energy = 1000; // eV
        const angle = 0.3; // radianes
        const material = 'CuBeO';
        
        const sey = calculateSEY(energy, angle, material);
        
        // Verificar que el resultado es un número positivo razonable
        assertNotNull(sey, 'SEY no debe ser null');
        assertTrue(sey > 0, 'SEY debe ser positivo');
        assertTrue(sey < 10, 'SEY debe ser menor que 10 para valores normales');
        
        // Comprobar que diferentes materiales dan diferentes SEY
        const sey2 = calculateSEY(energy, angle, 'Cs3Sb');
        assertTrue(sey !== sey2, 'Diferentes materiales deben dar diferentes SEY');
    });
    
    // Prueba de la energía de los electrones secundarios
    test('La función calculateDepartureEnergy genera energías válidas', function() {
        // Probar con el valor por defecto
        const energy1 = calculateDepartureEnergy();
        assertTrue(energy1 > 0, 'Energía de salida debe ser positiva');
        
        // Probar con un valor específico
        const sigma_E = 3.0;
        const energy2 = calculateDepartureEnergy(sigma_E);
        assertTrue(energy2 > 0, 'Energía de salida debe ser positiva con sigma_E personalizado');
        
        // Verificar que generamos diferentes valores (naturaleza aleatoria)
        const energies = [];
        for (let i = 0; i < 10; i++) {
            energies.push(calculateDepartureEnergy());
        }
        
        // Al menos algunos valores deben ser diferentes (naturaleza probabilística)
        let allSame = true;
        for (let i = 1; i < energies.length; i++) {
            if (Math.abs(energies[i] - energies[0]) > 0.001) {
                allSame = false;
                break;
            }
        }
        
        assertFalse(allSame, 'Las energías generadas deben variar debido a su naturaleza aleatoria');
    });
    
    // Prueba de dirección de emisión
    test('La función calculateEmissionDirection genera direcciones unitarias', function() {
        const normal = {x: 0, y: -1}; // Normal apuntando hacia arriba
        
        const dir = calculateEmissionDirection(normal);
        
        // Verificar que es un vector unitario (magnitud ≈ 1)
        const magnitude = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        assertApprox(1.0, magnitude, 0.0001, 'El vector dirección debe ser unitario');
        
        // Verificar que la dirección es opuesta a la normal (producto escalar negativo)
        const dotProduct = dir.x * normal.x + dir.y * normal.y;
        assertTrue(dotProduct <= 0, 'La dirección debe ser opuesta a la normal');
    });
    
    // Prueba del algoritmo Boris
    test('La función borisUpdate actualiza correctamente la posición y velocidad', function() {
        // Crear un fotón de prueba
        const photon = {
            position: {x: 100, y: 100},
            velocity: {x: 10, y: 0},
            acceleration: {x: 0, y: 0},
            isActive: true,
            mass: 9.1093837e-31,
            charge: -1.602176634e-19,
            energy: 1.5,
            trail: []
        };
        
        // Campo eléctrico uniforme hacia abajo
        const electricField = {Ex: 0, Ey: 100};
        
        // Paso de tiempo
        const dt = 0.01;
        
        // Guardar posición y velocidad iniciales
        const initialPosition = {...photon.position};
        const initialVelocity = {...photon.velocity};
        
        // Aplicar actualización Boris
        borisUpdate(photon, dt, electricField);
        
        // Verificar que la posición ha cambiado
        assertTrue(
            photon.position.x !== initialPosition.x || 
            photon.position.y !== initialPosition.y,
            'La posición debe cambiar tras la actualización'
        );
        
        // Verificar que la velocidad ha cambiado en y (debido al campo eléctrico)
        assertTrue(
            photon.velocity.y !== initialVelocity.y,
            'La velocidad en y debe cambiar debido al campo eléctrico vertical'
        );
        
        // En campo eléctrico uniforme, la velocidad en x no debería cambiar mucho
        assertApprox(
            initialVelocity.x, 
            photon.velocity.x, 
            0.1, 
            'La velocidad en x no debería cambiar mucho'
        );
    });
    
    // Prueba de colisiones
    test('La función checkElementCollision detecta colisiones correctamente', function() {
        // Caso 1: Colisión con rectángulo
        const photon1 = {
            position: {x: 150, y: 150},
            isActive: true
        };
        
        const rectangle = {
            shape: {
                type: 'rectangle',
                x: 100,
                y: 100,
                w: 100,
                h: 100
            }
        };
        
        assertTrue(
            checkElementCollision(photon1, rectangle),
            'Debe detectar colisión cuando el fotón está dentro del rectángulo'
        );
        
        // Caso 2: No hay colisión con rectángulo
        const photon2 = {
            position: {x: 50, y: 50},
            isActive: true
        };
        
        assertFalse(
            checkElementCollision(photon2, rectangle),
            'No debe detectar colisión cuando el fotón está fuera del rectángulo'
        );
        
        // Caso 3: Colisión con elipse
        const photon3 = {
            position: {x: 150, y: 150},
            isActive: true
        };
        
        const ellipse = {
            shape: {
                type: 'ellipse',
                x: 100,
                y: 100,
                w: 100,
                h: 100
            }
        };
        
        assertTrue(
            checkElementCollision(photon3, ellipse),
            'Debe detectar colisión cuando el fotón está dentro de la elipse'
        );
    });
    
    // Prueba de generación de electrones secundarios
    test('La función generateSecondaryElectrons crea nuevos electrones', function() {
        // Crear un fotón fuente y un dinodo para la prueba
        const sourcePhoton = {
            position: {x: 200, y: 200},
            velocity: {x: 0, y: -10},
            isActive: true,
            energy: 100,
            hitCount: 0,
            amplification: 1,
            trail: []
        };
        
        const dynode = {
            shape: {
                x: 150,
                y: 250,
                w: 100,
                h: 20
            },
            voltage: 200,
            index: 2
        };
        
        // Limpiar fotones existentes
        const originalPhotons = [...simulationState.photons];
        simulationState.photons = [];
        
        // Generar electrones secundarios
        generateSecondaryElectrons(sourcePhoton, dynode);
        
        // Verificar que se generaron nuevos electrones
        assertTrue(
            simulationState.photons.length > 0,
            'Se deben generar nuevos electrones secundarios'
        );
        
        // Verificar que el fotón original está inactivo
        assertFalse(
            sourcePhoton.isActive,
            'El fotón original debe quedar inactivo'
        );
        
        // Restaurar estado
        simulationState.photons = originalPhotons;
    });
});