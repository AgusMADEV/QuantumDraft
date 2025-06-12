const assert = require('assert');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Cargar el archivo HTML y JS para simular el entorno del navegador
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const script = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');

// Configurar JSDOM
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' }); // Fin de las pruebas
const { window } = dom;
global.window = window;
global.document = window.document;

// Inyectar el script de la aplicación
// Inicializar componentes y partículas predeterminados
window.particles = [];
window.components = [];
window.addComponent = function(type, x, y, voltage, color, model = 'simple', vertices = null) {
    const newComponent = { type, x, y, voltage, color, model, params: {}, vertices };
    window.components.push(newComponent);
};
window.addComponent('photocathode', 50, 50, -100, '#0000ff');
window.addComponent('anode', 450, 50, 500, '#ff0000');
window.addComponent('dinode', 250, 50, 100, '#808080');

const scriptElement = document.createElement('script');
scriptElement.textContent = script;
document.body.appendChild(scriptElement);

// Asegurar que el script se cargue completamente antes de ejecutar las pruebas
scriptElement.onload = () => {
    describe('Simulación básica', () => {
        it('Debería generar un electrón al interactuar un fotón con el photocathode', () => {
            // Configurar el photocathode
            const photocathode = window.components.find(c => c.type === 'photocathode');
            assert(photocathode, 'El photocathode no está configurado correctamente.');

            // Emitir un fotón
            window.particles.push({
                type: 'photon',
                x: photocathode.x,
                y: photocathode.y,
                vx: 0,
                vy: 0
            });

            // Ejecutar la simulación
            window.updateParticleMotion();

            // Verificar que se haya generado un electrón
            const electron = window.particles.find(p => p.type === 'electron');
            assert(electron, 'No se generó un electrón al interactuar el fotón con el photocathode.');
        });

        it('Debería amplificar electrones al interactuar con los dinodos', () => {
            // Configurar un dinodo con voltaje positivo
            const dinode = window.components.find(c => c.type === 'dinode');
            assert(dinode, 'No se encontró un dinodo en la configuración.');
            dinode.voltage = 100;

            // Agregar un electrón cerca del dinodo
            window.particles.push({
                type: 'electron',
                x: dinode.x,
                y: dinode.y - 5,
                vx: 0,
                vy: 1
            });

            // Ejecutar la simulación
            window.updateParticleMotion();

            // Verificar que se hayan generado más electrones
            const electronCount = window.particles.filter(p => p.type === 'electron').length;
            assert(electronCount > 1, 'El dinodo no amplificó los electrones correctamente.');
        });

        it('Debería registrar impactos en el ánodo', () => {
            // Configurar el ánodo
            const anode = window.components.find(c => c.type === 'anode');
            assert(anode, 'El ánodo no está configurado correctamente.');

            // Agregar un electrón cerca del ánodo
            window.particles.push({
                type: 'electron',
                x: anode.x - 5,
                y: anode.y,
                vx: 1,
                vy: 0
            });

            // Ejecutar la simulación
            const hits = window.updateParticleMotion();

            // Verificar que se haya registrado un impacto
            assert(hits.length > 0, 'No se registró un impacto en el ánodo.');
        });
    });
};