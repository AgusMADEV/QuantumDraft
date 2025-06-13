// ===================================================================
// CONFIGURACIÓN Y CONSTANTES - Simulador Fotomultiplicador 2D
// ===================================================================

// Estado global de la simulación
let simulationState = {
    isRunning: false,
    isPaused: false,
    time: 0,
    speed: 1,
    photons: [],
    statistics: {
        totalPhotons: 0,
        detectedPhotons: 0,
        averageGain: 0,
        quantumEfficiency: 0,
        transitTime: 0
    }
};

// Configuración PMT
var pmtConfig = {
    photocathode: { enabled: true, voltage: 0, position: null, amplification: 1 },
    accelerator: { enabled: false, voltage: -50, position: null, amplification: 1 },
    grid: { enabled: false, voltage: -20, position: null, amplification: 1 },
    anode: { enabled: true, voltage: 1000, position: null, amplification: 1 },
    dynodes: [],
    amplificationModel: 'simple',
    simpleParams: { r: 2, beta: 0.7 },
    advancedParams: {
        sigma_E: 2.2,        // Desviación estándar en eV
        E_max: 1500,         // Energía máxima en eV
        sigma_max: 2.5,      // Coeficiente máximo de emisión secundaria
        s: 1.35,             // Parámetro de dependencia angular
        
        // Parámetros adicionales según el paper
        alpha: 0.9,          // Factor de forma superficial
        delta_0: 2.4,        // Rendimiento máximo para incidencia normal
        E_0: 400,            // Energía del máximo rendimiento en eV
        theta_m: 0.8,        // Ángulo óptimo de incidencia en radianes
    }
};

// Constantes físicas
const PHYSICS = {
    electronCharge: -1.6021892e-19, // Coulombs
    electronMass: 9.10953e-31,      // kg
    speedOfLight: 299792458,        // m/s
    eVtoJoules: 1.602176634e-19,    // Conversión eV a Joules
    pixelToMeter: 1e-4,             // Conversión píxel a metros
    Wsec: 2,                        // Energía secundarios en eV
    deltat: 1e-12                   // Paso de tiempo en segundos
};

// Límite de partículas para rendimiento
const MAX_PARTICLES = 200;