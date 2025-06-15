/**
 * Pruebas unitarias para el módulo de configuración
 */

suite('Módulo de Configuración', function() {
    
    // Prueba de configuración inicial
    test('La configuración inicial se carga correctamente', function() {
        // Verificar que pmtConfig existe
        assertNotNull(pmtConfig, 'La configuración debe estar definida');
        
        // Verificar elementos principales
        assertNotNull(pmtConfig.photocathode, 'El fotocátodo debe estar definido');
        assertNotNull(pmtConfig.anode, 'El ánodo debe estar definido');
        assertNotNull(pmtConfig.dynodes, 'Los dinodos deben estar definidos');
        assertTrue(Array.isArray(pmtConfig.dynodes), 'Dinodos debe ser un array');
        
        // Verificar elementos opcionales
        assertNotNull(pmtConfig.accelerator, 'El acelerador debe estar definido');
        assertNotNull(pmtConfig.grid, 'La rejilla debe estar definida');
        
        // Verificar parámetros de los modelos
        assertNotNull(pmtConfig.simpleParams, 'Los parámetros del modelo simple deben estar definidos');
        assertNotNull(pmtConfig.advancedParams, 'Los parámetros del modelo avanzado deben estar definidos');
    });
    
    // Prueba de creación de configuración por defecto
    test('La función createDefaultConfiguration crea una configuración válida', function() {
        // Verificar que la función existe
        assertNotNull(
            window.createDefaultConfiguration || pmtConfig.createDefaultConfiguration, 
            'La función createDefaultConfiguration debe estar definida'
        );
        
        // Si la función existe, ejecutarla y verificar que no falla
        if (window.createDefaultConfiguration) {
            window.createDefaultConfiguration();
        } else if (pmtConfig.createDefaultConfiguration) {
            pmtConfig.createDefaultConfiguration();
        }
        
        // Verificar que los valores por defecto son razonables
        assertTrue(
            pmtConfig.photocathode.voltage <= 0,
            'El voltaje del fotocátodo debe ser <= 0'
        );
        
        assertTrue(
            pmtConfig.anode.voltage > 0,
            'El voltaje del ánodo debe ser > 0'
        );
        
        // Verificar que hay dinodos con voltajes entre fotocátodo y ánodo
        if (pmtConfig.dynodes.length > 0) {
            const firstDynode = pmtConfig.dynodes[0];
            const lastDynode = pmtConfig.dynodes[pmtConfig.dynodes.length - 1];
            
            assertTrue(
                firstDynode.voltage > pmtConfig.photocathode.voltage,
                'El primer dinodo debe tener más voltaje que el fotocátodo'
            );
            
            assertTrue(
                lastDynode.voltage < pmtConfig.anode.voltage,
                'El último dinodo debe tener menos voltaje que el ánodo'
            );
        }
    });
    
    // Prueba de generación de dinodos
    test('La función generateDefaultDynodes crea dinodos correctamente', function() {
        // Guardar configuración original
        const originalDynodes = [...pmtConfig.dynodes];
        
        // Verificar que la función existe
        assertNotNull(
            window.generateDefaultDynodes, 
            'La función generateDefaultDynodes debe estar definida'
        );
        
        // Probar con diferentes cantidades
        const testCounts = [4, 8, 12];
        
        for (const count of testCounts) {
            // Crear mock para el elemento 'dynode-count'
            if (!window.mockElements) window.mockElements = {};
            window.mockElements['dynode-count'] = { 
                value: count.toString() 
            };
            
            // Llamar a la función
            window.generateDefaultDynodes();
            
            // Verificar que se generaron la cantidad correcta de dinodos
            assertEquals(
                count, 
                pmtConfig.dynodes.length, 
                `Deben generarse exactamente ${count} dinodos`
            );
            
            // Verificar que los voltajes son crecientes
            let previousVoltage = pmtConfig.photocathode.voltage;
            
            for (let i = 0; i < pmtConfig.dynodes.length; i++) {
                assertTrue(
                    pmtConfig.dynodes[i].voltage > previousVoltage,
                    `El voltaje del dinodo ${i+1} debe ser mayor que el anterior`
                );
                previousVoltage = pmtConfig.dynodes[i].voltage;
            }
            
            assertTrue(
                pmtConfig.anode.voltage > previousVoltage,
                'El voltaje del ánodo debe ser mayor que el último dinodo'
            );
        }
        
        // Restaurar configuración original
        pmtConfig.dynodes = originalDynodes;
    });
    
    // Prueba de aplicación de geometría
    test('La función applyGeometryFromJson aplica correctamente una geometría', function() {
        // Verificar que la función existe
        assertNotNull(
            window.applyGeometryFromJson, 
            'La función applyGeometryFromJson debe estar definida'
        );
        
        // Guardar estado original
        const originalConfig = JSON.parse(JSON.stringify(pmtConfig));
        
        // Crear una geometría simplificada para pruebas
        const testGeometry = {
            photocathode: {
                voltage: -50,
                position: {x: 50, y: 100},
                shape: {type: 'rectangle', x: 50, y: 100, w: 10, h: 150}
            },
            anode: {
                voltage: 1200,
                position: {x: 550, y: 100},
                shape: {type: 'rectangle', x: 550, y: 100, w: 10, h: 150}
            },
            dynodes: [
                {
                    type: 'dynode',
                    voltage: 100,
                    position: {x: 150, y: 100},
                    shape: {type: 'rectangle', x: 150, y: 100, w: 5, h: 100}
                },
                {
                    type: 'dynode',
                    voltage: 300,
                    position: {x: 250, y: 100},
                    shape: {type: 'rectangle', x: 250, y: 100, w: 5, h: 100}
                },
                {
                    type: 'dynode',
                    voltage: 500,
                    position: {x: 350, y: 100},
                    shape: {type: 'rectangle', x: 350, y: 100, w: 5, h: 100}
                },
                {
                    type: 'dynode',
                    voltage: 700,
                    position: {x: 450, y: 100},
                    shape: {type: 'rectangle', x: 450, y: 100, w: 5, h: 100}
                }
            ],
            accelerator: {
                enabled: true,
                voltage: -30,
                position: {x: 100, y: 100},
                shape: {type: 'rectangle', x: 100, y: 100, w: 5, h: 100}
            },
            grid: {
                enabled: false,
                voltage: -20,
                position: {x: 500, y: 100},
                shape: {type: 'rectangle', x: 500, y: 100, w: 5, h: 100}
            }
        };
        
        // Aplicar la geometría
        const success = window.applyGeometryFromJson(testGeometry);
        
        // Verificar que la aplicación fue exitosa
        assertTrue(success, 'La función debe devolver true al aplicar la geometría');
        
        // Verificar que se aplicaron los cambios
        assertEquals(-50, pmtConfig.photocathode.voltage, 'El voltaje del fotocátodo debe actualizarse');
        assertEquals(1200, pmtConfig.anode.voltage, 'El voltaje del ánodo debe actualizarse');
        assertEquals(4, pmtConfig.dynodes.length, 'Debe haber 4 dinodos');
        assertEquals(true, pmtConfig.accelerator.enabled, 'El acelerador debe estar habilitado');
        assertEquals(false, pmtConfig.grid.enabled, 'La rejilla debe estar deshabilitada');
        
        // Restaurar configuración original
        pmtConfig = originalConfig;
    });
    
    // Prueba de guardado y carga de configuración
    test('Las funciones saveConfiguration y loadConfiguration funcionan correctamente', function() {
        // Verificar que las funciones existen
        assertNotNull(
            window.saveConfiguration, 
            'La función saveConfiguration debe estar definida'
        );
        
        assertNotNull(
            window.loadConfiguration, 
            'La función loadConfiguration debe estar definida'
        );
        
        // Guardar estado original
        const originalConfig = JSON.parse(JSON.stringify(pmtConfig));
        
        // Sobrescribir temporalmente la función updateModelDisplay para evitar errores DOM
        const originalUpdateModelDisplay = window.updateModelDisplay || function() {};
        window.updateModelDisplay = function() {};
        
        // Modificar la configuración para la prueba
        const testName = 'test_config_' + Date.now();
        pmtConfig.photocathode.voltage = -75;
        pmtConfig.anode.voltage = 1500;
        
        // Guardar la configuración
        const saveResult = window.saveConfiguration(testName);
        
        // Verificar que el guardado fue exitoso
        assertTrue(saveResult, 'La función debe devolver true al guardar la configuración');
        
        // Restaurar configuración a valores diferentes
        pmtConfig.photocathode.voltage = -100;
        pmtConfig.anode.voltage = 2000;
        
        // Cargar la configuración guardada
        const loadResult = window.loadConfiguration(testName);
        
        // Verificar que la carga fue exitosa
        assertTrue(loadResult, 'La función debe devolver true al cargar la configuración');
        
        // Verificar que se restauraron los valores
        assertEquals(-75, pmtConfig.photocathode.voltage, 'El voltaje del fotocátodo debe restaurarse');
        assertEquals(1500, pmtConfig.anode.voltage, 'El voltaje del ánodo debe restaurarse');
        
        // Limpiar la configuración de prueba
        localStorage.removeItem(`pmt_config_${testName.replace(/\s+/g, '_')}`);
        
        // Restaurar configuración original
        pmtConfig = originalConfig;
        // Restaurar función original
        window.updateModelDisplay = originalUpdateModelDisplay;
    });
});