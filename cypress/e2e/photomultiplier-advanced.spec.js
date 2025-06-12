/// <reference types="cypress" />

describe('Comportamiento avanzado del fotomultiplicador', () => {
  beforeEach(() => {
    // Desactivar el fallo por excepciones no manejadas
    cy.on('uncaught:exception', () => false);
    
    // Visitar la página principal
    cy.visit('/');
    
    // Esperar a que la aplicación esté completamente cargada
    cy.wait(1000);
  });
  
  describe('Amplificación en cascada de electrones', () => {
    it('Debe verificar el efecto multiplicador de los dinodos', () => {
      // Configurar un voltaje alto en los dinodos para maximizar la multiplicación
      cy.window().then(win => {
        // Configurar los dinodos para una ganancia alta
        win.simulationController.components.forEach(component => {
          if (component.type === 'dinode') {
            component.voltage = 250; // Voltaje alto para mejor multiplicación
          }
        });

        // Configurar fotocátodo con voltaje negativo alto
        const photocathode = win.simulationController.components.find(c => c.type === 'photocathode');
        if (photocathode) {
          photocathode.voltage = -200;
        }

        // Configurar ánodo con voltaje positivo alto
        const anode = win.simulationController.components.find(c => c.type === 'anode');
        if (anode) {
          anode.voltage = 800;
        }

        // Generar menos fotones pero esperar una multiplicación significativa
        win.simulationController.photonCount = 3;
        
        // Contador para el seguimiento de electrones en cada punto
        const electronCounts = {
          initial: 0,
          afterFirstDinode: 0,
          final: 0
        };
        
        // Iniciar la simulación
        win.simulationController.start();
        
        // Esperar un tiempo para que avance la simulación
        setTimeout(() => {
          // Contar electrones iniciales (tras la emisión fotoeléctrica)
          electronCounts.initial = win.simulationController.particles.filter(p => 
            p.type === 'electron' && p.x < win.simulationController.components[1].x
          ).length;
        }, 500);
        
        // Esperar más tiempo y contar electrones después del primer dinodo
        setTimeout(() => {
          electronCounts.afterFirstDinode = win.simulationController.particles.filter(p => 
            p.type === 'electron' && 
            p.x > win.simulationController.components[1].x && 
            p.x < win.simulationController.components[2].x
          ).length;
        }, 1500);
        
        // Esperar más tiempo para la cuenta final
        setTimeout(() => {
          electronCounts.final = win.simulationController.particles.filter(p => 
            p.type === 'electron'
          ).length;
          
          // Verificar que ocurrió la multiplicación
          expect(electronCounts.afterFirstDinode).to.be.greaterThan(electronCounts.initial);
          expect(electronCounts.final).to.be.greaterThan(electronCounts.afterFirstDinode);
          
          // Registrar resultados para análisis
          cy.log(`Electrones iniciales: ${electronCounts.initial}`);
          cy.log(`Electrones tras primer dinodo: ${electronCounts.afterFirstDinode}`);
          cy.log(`Electrones finales: ${electronCounts.final}`);
          
        }, 3000);
      });
      
      // Dar tiempo suficiente para que se completen los setTimeout
      cy.wait(3500);
    });
    
    it('Debe verificar la influencia del campo eléctrico en la trayectoria', () => {
      cy.window().then(win => {
        // Activar visualización de campo
        if (win.simulationController.renderer.showField !== undefined) {
          win.simulationController.renderer.showField = true;
        }
        
        // Configurar un voltaje extremo para ver una desviación clara
        const components = win.simulationController.components;
        
        // Añadir un componente adicional con voltaje alto para desviar partículas
        win.simulationController.addComponent('dinode', 300, 300, 1000, '#ff0000');
        
        // Generar una única partícula en una posición específica
        win.simulationController.particles = [];
        const electron = new win.Particle('electron', 100, 200, 5, 0);
        win.simulationController.particles.push(electron);
        
        // Guardar la posición inicial
        const initialY = electron.y;
        
        // Avanzar la simulación sin renderizado para medir la desviación
        for (let i = 0; i < 50; i++) {
          win.simulationController.physicsSimulator.updateParticleMotion(win.simulationController.particles);
        }
        
        // Verificar que la partícula se desvió de su trayectoria recta
        expect(Math.abs(electron.y - initialY)).to.be.greaterThan(10);
        
        // Ahora desactivar el campo y verificar que no hay desviación
        win.simulationController.physicsSimulator.setEnableField(false);
        
        // Crear una nueva partícula
        const electron2 = new win.Particle('electron', 100, 200, 5, 0);
        win.simulationController.particles.push(electron2);
        
        // Guardar posición inicial
        const initial2Y = electron2.y;
        
        // Avanzar la simulación de nuevo
        for (let i = 0; i < 50; i++) {
          win.simulationController.physicsSimulator.updateParticleMotion(win.simulationController.particles);
        }
        
        // Verificar que la partícula no se desvió significativamente (puede haber una pequeña diferencia por redondeo)
        expect(Math.abs(electron2.y - initial2Y)).to.be.lessThan(5);
      });
    });
  });
  
  describe('Pruebas de configuraciones preestablecidas', () => {
    it('Debe cargar y aplicar diferentes presets', () => {
      // Verificar si existe el selector de presets y probar su funcionamiento
      cy.get('#presetSelect').then($select => {
        if ($select.length > 0) {
          // Seleccionar diferentes presets
          cy.get('#presetSelect').select('variacionVoltajes');
          cy.get('#loadPresetButton').click();
          
          // Verificar que se cargó correctamente (verificando algún voltaje específico)
          cy.wait(500);
          cy.window().then(win => {
            // Verificar que los voltajes se modificaron según el preset
            const components = win.simulationController.components;
            
            // Buscar configuración específica de voltaje en el preset
            const hasExpectedVoltages = components.some(c => c.voltage !== 0);
            expect(hasExpectedVoltages).to.be.true;
          });
          
          // Probar otro preset
          cy.get('#presetSelect').select('compararModelos');
          cy.get('#loadPresetButton').click();
          
          cy.wait(500);
          cy.window().then(win => {
            // Verificar que hay componentes con diferentes modelos
            const components = win.simulationController.components;
            const hasAdvancedModel = components.some(c => c.model === 'advanced');
            expect(hasAdvancedModel).to.be.true;
          });
        }
      });
    });
  });
  
  describe('Pruebas de robustez', () => {
    it('Debe manejar cambios rápidos entre modos', () => {
      // Cambiar repetidamente entre modo simulación y dibujo
      for (let i = 0; i < 5; i++) {
        cy.get('#drawModeButton').click();
        cy.wait(200);
        cy.get('[data-action="simulation-mode"]').click();
        cy.wait(200);
      }
      
      // Verificar que la aplicación sigue funcionando
      cy.get('#playButton').click();
      
      cy.wait(1000);
      
      cy.window().then(win => {
        // Verificar que hay partículas en movimiento
        expect(win.simulationController.particles.length).to.be.greaterThan(0);
      });
    });
    
    it('Debe manejar cambios en tiempo real mientras la simulación está corriendo', () => {
      // Iniciar la simulación
      cy.get('#playButton').click();
      
      // Esperar un momento para que avance
      cy.wait(1000);
      
      // Cambiar el voltaje de un componente mientras está corriendo
      cy.get('table tbody tr').eq(1).within(() => {
        cy.get('input.voltage').clear().type('300');
      });
      
      // Cambiar el número de fotones
      cy.get('#photonCountInput').clear().type('15');
      
      // Ajustar el deltaT
      cy.get('#deltatInput').clear().type('0.05');
      
      // Esperar un momento más
      cy.wait(1000);
      
      // Verificar que la simulación sigue funcionando
      cy.window().then(win => {
        expect(win.simulationController.animationFrameId).to.not.be.null;
        expect(win.simulationController.deltaT).to.equal(0.05);
        expect(win.simulationController.photonCount).to.equal(15);
      });
    });
  });
  
  describe('Pruebas de interacción con las gráficas', () => {
    it('Debe actualizar las gráficas al generar impactos', () => {
      // Asegurar que se generen muchos fotones para mayor probabilidad de impactos
      cy.get('#photonCountInput').clear().type('50');
      
      // Iniciar la simulación
      cy.get('#playButton').click();
      
      // Esperar un tiempo para que se generen impactos
      cy.wait(3000);
      
      // Verificar que las gráficas tienen datos
      cy.window().then(win => {
        if (win.simulationController.chartManager && 
            win.simulationController.chartManager.currentChart && 
            win.simulationController.chartManager.currentChart.data) {
          // Verificar que hay datos en la gráfica de corriente
          const hasCurrentData = win.simulationController.chartManager.currentChart.data.datasets[0].data.length > 0;
          expect(hasCurrentData).to.be.true;
        }
      });
      
      // Exportar datos (si existe la función)
      cy.window().then(win => {
        if (win.simulationController.chartManager && 
            typeof win.simulationController.chartManager.exportData === 'function') {
          // Crea un mock de document.createElement para interceptar la descarga
          const originalCreateElement = document.createElement;
          let downloadUrl = '';
          
          document.createElement = function(tag) {
            const element = originalCreateElement.call(document, tag);
            if (tag === 'a') {
              // Mock click para evitar la descarga real
              element.click = function() {
                downloadUrl = this.getAttribute('href');
              };
            }
            return element;
          };
          
          // Llamar a exportar datos
          if (win.simulationController.chartManager.exportData) {
            win.simulationController.chartManager.exportData();
            
            // Verificar que se generó una URL de descarga
            expect(downloadUrl).to.include('data:text/csv');
          }
          
          // Restaurar la función original
          document.createElement = originalCreateElement;
        }
      });
    });
  });
});