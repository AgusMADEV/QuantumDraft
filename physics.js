// physics.js - Módulo de física traducido desde MATLAB (ramas.m)
// Función principal: simulateParticle(config) -> devuelve trayectoria y datos de simulación

(function(global) {
  // Constantes físicas (Sistema Internacional)
  const e = -1.6021892e-19;     // Carga del electrón (C)
  const q = e;                  // Alias para carga
  const m = 9.10953e-31;        // Masa del electrón (kg)
  const c = 299792458;          // Velocidad de la luz (m/s)
  const Wsec = 2;               // Energía secundaria (eV)
  const vsec = Math.sqrt(2 * Wsec * Math.abs(q) / m);
  const MAX_STEPS = 1e5;

  // Implementación completa del algoritmo de Boris (traducido desde ramas.m)
  function simulateParticleBoris({ t0, x0, v0, Ex, Ey, Ez, Bx, By, Bz, anodo, dynodos, tubo, accGrd, numdyn, traza, randangle, deltat }) {
    let y = [];
    let tt = [];
    let ne = [];
    let imp = [];
    let gain = 1;

    // Contenedores de datos
    const t = Array(MAX_STEPS).fill(NaN);
    const x = Array.from({ length: MAX_STEPS }, () => [0, 0, 0]);
    const u = Array.from({ length: MAX_STEPS }, () => [0, 0, 0]);
    const v = Array.from({ length: MAX_STEPS }, () => [0, 0, 0]);
    const nEmed = Array(MAX_STEPS).fill(0);

    // Inicialización del primer paso
    let j = 0;
    t[j] = t0;
    x[j] = [...x0];
    v[j] = [...v0];
    
    // Factor gamma inicial
    let gamman = 1 / Math.sqrt(1 - norm2(v[j]) / (c * c));
    u[j] = scale(v0, gamman);

    let coll = false;
    let Wimpacto = 0;
    j = 1;

    // Bucle principal hasta colisión
    while (!coll && j < MAX_STEPS) {
      // Posición media para evaluar campos
      const xmed = addScaled(x[j-1], u[j-1], deltat / (2 * gamman));
      
      // Verificar si la partícula se sale del tubo
      if (tubo && !tubo.isInterior(xmed[0] * 1e3, xmed[1] * 1e3)) {
        console.log('La partícula se sale');
        y = y.concat(x.slice(0, j-1));
        const tin = t.filter(val => !isNaN(val));
        tt = tt.concat(tin.slice(0, -1));
        ne = ne.concat(Array(tin.length - 1).fill(gain));
        imp.push(9);
        gain = 0;
        return { y, tt, ne, imp, gain };
      }

      // Evaluación de campos electromagnéticos en posición media
      const Bmed = [
        Bx ? Bx(xmed[0], xmed[1]) : 0,
        By ? By(xmed[0], xmed[1]) : 0,
        Bz ? Bz(xmed[0], xmed[1]) : 0
      ];
      
      const Emed = [
        Ex ? Ex(xmed[0], xmed[1]) : 0,
        Ey ? Ey(xmed[0], xmed[1]) : 0,
        Ez ? Ez(xmed[0], xmed[1]) : 0
      ];
      
      nEmed[j] = norm(Emed);

      // ============ ALGORITMO DE BORIS ============
      
      // Paso 1: Media aceleración eléctrica
      const umenos = add(u[j-1], scale(Emed, (q * deltat) / (2 * m)));
      
      // Paso 2: Preparación para rotación magnética
      const tao = scale(Bmed, (q * deltat) / (2 * m));
      const uestrella = dot(umenos, tao) / c;
      const gammamenos = Math.sqrt(1 + norm2(umenos) / (c * c));
      
      // Paso 3: Cálculo del factor gamma para la rotación
      // Corrección: asegurarnos de que sigma no sea negativo
      const sigma = Math.max(0.001, gammamenos * gammamenos - norm2(tao));
      const gammamas = Math.sqrt((sigma + Math.sqrt(sigma * sigma + 4 * (norm2(tao) + uestrella * uestrella))) / 2);
      
      // Paso 4: Vector de rotación normalizado (con protección contra división por cero)
      const tvec = norm2(tao) > 1e-10 ? scale(tao, 1 / gammamas) : [0, 0, 0];
      const s = 1 / (1 + norm2(tvec));
      
      // Paso 5: Rotación magnética (fórmula de Boris)
      const umas = scale(
        add(
          add(umenos, scale(tvec, dot(umenos, tvec))),
          cross(umenos, tvec)
        ),
        s
      );
      
      // Paso 6: Segunda media aceleración eléctrica
      u[j] = add(umas, add(scale(Emed, (q * deltat) / (2 * m)), cross(umas, tvec)));
      
      // Paso 7: Actualización de gamma y velocidad
      gamman = Math.sqrt(1 + norm2(u[j]) / (c * c));
      v[j] = scale(u[j], 1 / gamman);
      
      // Paso 8: Actualización de posición y tiempo
      x[j] = add(xmed, scale(v[j], deltat / 2));
      t[j] = t[j-1] + deltat;

      // ============ DETECCIÓN DE COLISIONES ============
      
      // Colisión con ánodo
      if (anodo && Array.isArray(anodo)) {
        for (let h = 0; h < anodo.length; h++) {
          if (anodo[h].isInterior && anodo[h].isInterior(x[j][0] * 1e3, x[j][1] * 1e3)) {
            if (traza) console.log(`Partícula llega al ánodo ${h}. Gain: ${gain}`);
            y = y.concat(x.slice(0, j-1));
            const tin = t.filter(val => !isNaN(val));
            tt = tt.concat(tin.slice(0, -1));
            ne = ne.concat(Array(tin.length - 1).fill(gain));
            imp.push(9);
            return { y, tt, ne, imp, gain };
          }
        }
      }

      // Colisión con grid acelerador
      if (accGrd && Array.isArray(accGrd)) {
        for (let h = 0; h < accGrd.length; h++) {
          if (accGrd[h].isInterior && accGrd[h].isInterior(x[j][0] * 1e3, x[j][1] * 1e3)) {
            if (traza) console.log(`Atrapado en el grid ${h}`);
            y = y.concat(x.slice(0, j-1));
            const tin = t.filter(val => !isNaN(val));
            tt = tt.concat(tin.slice(0, -1));
            ne = ne.concat(Array(tin.length - 1).fill(gain));
            imp.push(0);
            gain = 0;
            return { y, tt, ne, imp, gain };
          }
        }
      }

      // Colisión con dinodos
      let k = 0;
      while (k < dynodos.length && !coll) {
        const dynk = dynodos[k];
        coll = dynk.isInterior && dynk.isInterior(x[j][0] * 1e3, x[j][1] * 1e3);
        if (coll) {
          // ============ PROCESAMIENTO DE COLISIÓN CON DINODO ============
          
          const collisionResult = processCollisionWithDynode(
            x[j-1], x[j], dynk, v[j], m, q, randangle, traza, k
          );
          
          Wimpacto = collisionResult.Wimpacto;
          
          if (traza) {
            console.log(`Colisión con dinodo ${k}, Energía: ${Wimpacto} eV`);
          }

          // Actualizar parámetros para electrón secundario
          t0 = t[j];
          const x0 = x[j-1];
          const v0 = collisionResult.v_secondary;
          
          // Calcular ganancia usando función SEY
          gain = gain * seyfunct(Wimpacto, collisionResult.theta, k);
          imp.push(k);
          
          // Preparar datos de salida
          y = y.concat(x.slice(0, j-1));
          const tin = t.filter(val => !isNaN(val));
          tt = tt.concat(tin.slice(0, -1));
          ne = ne.concat(Array(tin.length - 1).fill(gain));
          
          break;
        }
        k++;
      }
      
      j++;
    }

    // Finalización
    if (!coll) {
      y = y.concat(x.slice(0, j-2));
      const tin = t.filter(val => !isNaN(val));
      ne = ne.concat(Array(tin.length - 1).fill(gain));
      tt = tt.concat(tin.slice(0, -1));
    }

    // Recursión para electrones secundarios (si la energía es suficiente)
    if (Wimpacto > 5) { // Umbral de energía para generar secundarios
      const recursiveResult = simulateParticleBoris({
        t0, x0, v0, Ex, Ey, Ez, Bx, By, Bz, anodo, dynodos, tubo, accGrd, numdyn, traza, randangle, deltat
      });
      
      return {
        y: y.concat(recursiveResult.y),
        tt: tt.concat(recursiveResult.tt),
        ne: ne.concat(recursiveResult.ne),
        imp: imp.concat(recursiveResult.imp),
        gain: recursiveResult.gain
      };
    } else {
      if (traza && numdyn && numdyn[k]) {
        console.log(`Atrapado en el dinodo ${numdyn[k]}`);
        console.log(`Wimpacto ${Wimpacto}`);
      }
      gain = 0;
    }

    return { y, tt, ne, imp, gain };
  }

  // ============ FUNCIONES DE PROCESAMIENTO DE COLISIONES ============
  
  function processCollisionWithDynode(x_prev, x_curr, dynk, v_curr, m, q, randangle, traza, k) {
    const vert = dynk.Vertices || dynk.vertices;
    if (!vert || vert.length === 0) {
      return { Wimpacto: 0, theta: 0, v_secondary: [vsec, 0, 0] };
    }
    
    const nvert = vert.length;
    let xi, yi, inter = false;
    let ni, nj;
    
    // Encontrar intersección con el borde del dinodo usando line-line intersection
    for (let nv = 0; nv < nvert && !inter; nv++) {
      const v1 = vert[nv];
      const v2 = vert[(nv + 1) % nvert];
      
      const intersection = lineIntersection(
        x_prev[0] * 1e3, x_prev[1] * 1e3,
        x_curr[0] * 1e3, x_curr[1] * 1e3,
        v1.x || v1[0], v1.y || v1[1],
        v2.x || v2[0], v2.y || v2[1]
      );
      
      if (intersection.intersects) {
        xi = intersection.x;
        yi = intersection.y;
        inter = true;
        ni = (nv + 1) % nvert;
        nj = nv;
      }
    }
    
    if (!inter) {
      // Fallback: usar el primer vértice
      xi = (vert[0].x || vert[0][0]);
      yi = (vert[0].y || vert[0][1]);
      ni = 1 % nvert;
      nj = 0;
    }
    
    // Calcular vector normal a la superficie
    const v_ni = vert[ni];
    const v_nj = vert[nj];
    let vnorm = [
      (v_ni.y || v_ni[1]) - (v_nj.y || v_nj[1]),
      (v_nj.x || v_nj[0]) - (v_ni.x || v_ni[0])
    ];
    
    // Normalizar y orientar correctamente el vector normal
    const dir = [x_curr[0] - x_prev[0], x_curr[1] - x_prev[1]];
    const signo = Math.sign(dot2D(vnorm, dir));
    vnorm = scale2D(vnorm, -signo / norm2D(vnorm));
    
    const nSurf = [vnorm[0], vnorm[1], 0];
    const ndir = [dir[0], dir[1], 0];
    
    // Calcular ángulo de incidencia
    let theta = Math.atan2(norm(cross(scale(ndir, -1), nSurf)), dot(scale(ndir, -1), nSurf));
    if (theta > Math.PI / 2) {
      theta = Math.PI / 2 - theta;
    }
    
    // Calcular energía de impacto
    const vimpdos = v_curr[0] * v_curr[0] + v_curr[1] * v_curr[1] + v_curr[2] * v_curr[2];
    const Wimpacto = 0.5 * (m / Math.abs(q)) * vimpdos; // Energía en eV
    
    // Generar dirección del electrón secundario
    let v_secondary;
    if (randangle) {
      // Generar ángulo aleatorio según distribución coseno
      const rr = Math.random();
      const th = Math.asin(Math.sqrt(rr));
      const fi = 2 * Math.PI * Math.random();
      const yr = Math.sin(th) * Math.sin(fi);
      const zr = Math.cos(th);
      const alpha = Math.atan2(zr, yr) - Math.PI / 2;
      
      // Matriz de rotación
      const giro = [
        [Math.cos(alpha), Math.sin(alpha), 0],
        [-Math.sin(alpha), Math.cos(alpha), 0],
        [0, 0, 1]
      ];
      
      // Aplicar rotación a la normal de superficie
      const nSurf_rotated = matrixVectorMultiply(giro, nSurf);
      v_secondary = scale(nSurf_rotated, vsec);
    } else {
      v_secondary = scale(nSurf, vsec);
    }
    
    return { Wimpacto, theta, v_secondary, xi, yi };
  }

  // ============ FUNCIÓN SEY (Secondary Electron Yield) ============
  
  function seyfunct(Wimpacto, theta, k) {
    // Parámetros típicos para dinodos (basados en literatura científica)
    const deltaMax = 4.0;      // Máximo yield secundario
    const E_max = 300;         // Energía para máximo yield (eV)
    const s = 1.35;            // Parámetro de forma
    const E_th = 10;           // Umbral de energía (eV)
    
    if (Wimpacto < E_th) return 0;
    
    // Fórmula empírica para SEY (Sternglass-type formula)
    const E_ratio = Wimpacto / E_max;
    const delta_normal = deltaMax * s * E_ratio * Math.exp(-s * E_ratio);
    
    // Corrección angular (dependencia del coseno del ángulo)
    const cos_theta = Math.cos(theta);
    const delta = delta_normal / Math.pow(cos_theta, 0.7);
    
    // Variabilidad estadística
    const variability = 0.9 + 0.2 * Math.random(); // ±10% variación
    
    return Math.max(0, delta * variability);
  }

  // ============ FUNCIONES MATEMÁTICAS AUXILIARES ============
  
  // Producto vectorial 3D
  function cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }
  
  // Producto escalar 3D
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  
  // Producto escalar 2D
  function dot2D(a, b) {
    return a[0] * b[0] + a[1] * b[1];
  }
  
  // Suma vectorial
  function add(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }
  
  // Multiplicación por escalar
  function scale(a, s) {
    return [a[0] * s, a[1] * s, a[2] * s];
  }
  
  // Multiplicación por escalar 2D
  function scale2D(a, s) {
    return [a[0] * s, a[1] * s];
  }
  
  // Suma con escalar
  function addScaled(a, b, s) {
    return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
  }
  
  // Norma al cuadrado
  function norm2(a) {
    return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
  }
  
  // Norma 2D
  function norm2D(a) {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
  }
  
  // Norma 3D
  function norm(a) {
    return Math.sqrt(norm2(a));
  }
  
  // Intersección línea-línea
  function lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) {
      return { intersects: false };
    }
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        intersects: true,
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }
    
    return { intersects: false };
  }
  
  // Multiplicación matriz-vector
  function matrixVectorMultiply(matrix, vector) {
    return [
      matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
      matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
      matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2]
    ];
  }

  // ============ FUNCIÓN SIMPLIFICADA PARA COMPATIBILIDAD ============
  
  function simulateParticle(config) {
    // Wrapper para mantener compatibilidad con el código existente
    return simulateParticleBoris({
      ...config,
      Ez: config.Ez || (() => 0),
      Bx: config.Bx || (() => 0),
      By: config.By || (() => 0),
      Bz: config.Bz || (() => 0)
    });
  }

  // Exportar funciones públicas
  global.physics = {
    simulateParticle,
    simulateParticleBoris,
    seyfunct,
    // Constantes físicas
    constants: { e, q, m, c, vsec }
  };

})(typeof window !== 'undefined' ? window : global);

// Exportar para Node.js si está disponible
if (typeof module !== 'undefined' && module.exports) {
    module.exports = (typeof window !== 'undefined' ? window.physics : global.physics);
}

/**
 * Algoritmos principales de física para la simulación de partículas cargadas
 * en campos eléctricos y magnéticos
 */

/**
 * Algoritmo de Boris para la integración de partículas cargadas en campos EM
 * @param {Object} particle - Partícula con propiedades {x, y, vx, vy, charge, mass}
 * @param {Object} E - Campo eléctrico con componentes {ex, ey}
 * @param {Object} B - Campo magnético con componentes {bx, by, bz}
 * @param {Number} dt - Incremento de tiempo
 * @returns {Object} - Partícula actualizada
 */
function borisAlgorithm(particle, E, B, dt) {
    // Si no hay campos, simplemente actualizamos la posición
    if (!E && !B) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        return particle;
    }

    // Normalizamos campos si no existen
    E = E || { ex: 0, ey: 0 };
    B = B || { bx: 0, by: 0, bz: 0 };

    // Carga y masa (nos aseguramos de que tengan valores válidos)
    const q = particle.charge || (particle.type === 'electron' ? -1 : 1);
    const m = particle.mass || 1;

    // Coeficiente para el impulso eléctrico
    const qdt_2m = (q * dt) / (2 * m);

    // Convertir a vectores 3D
    const E3D = [E.ex || 0, E.ey || 0, 0];
    const B3D = [B.bx || 0, B.by || 0, B.bz || 0];
    const v = [particle.vx || 0, particle.vy || 0, 0];

    // Paso 1: Medio impulso desde campo eléctrico
    const v_minus = [
        v[0] + E3D[0] * qdt_2m,
        v[1] + E3D[1] * qdt_2m,
        v[2] + E3D[2] * qdt_2m
    ];

    // Paso 2: Rotación por campo magnético
    const t = [
        B3D[0] * qdt_2m,
        B3D[1] * qdt_2m,
        B3D[2] * qdt_2m
    ];

    // Magnitud de t al cuadrado
    const t2 = t[0]*t[0] + t[1]*t[1] + t[2]*t[2];
    
    // Coeficiente s para la rotación
    const s = 2 / (1 + t2);
    
    // Producto vectorial v_minus × t
    const v_prime = [
        v_minus[1] * t[2] - v_minus[2] * t[1],
        v_minus[2] * t[0] - v_minus[0] * t[2],
        v_minus[0] * t[1] - v_minus[1] * t[0]
    ];
    
    // Actualización de la velocidad después de rotación
    const v_rot = [
        v_minus[0] + s * (v_prime[1] * t[2] - v_prime[2] * t[1]),
        v_minus[1] + s * (v_prime[2] * t[0] - v_prime[0] * t[2]),
        v_minus[2] + s * (v_prime[0] * t[1] - v_prime[1] * t[0])
    ];

    // Paso 3: Medio impulso final desde campo eléctrico
    const v_plus = [
        v_rot[0] + E3D[0] * qdt_2m,
        v_rot[1] + E3D[1] * qdt_2m,
        v_rot[2] + E3D[2] * qdt_2m
    ];

    // Actualizar velocidad de la partícula
    particle.vx = v_plus[0];
    particle.vy = v_plus[1];
    
    // Actualizar posición usando la velocidad actualizada
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    
    // Actualizar trayectoria si existe
    if (particle.trajectory) {
        particle.trajectory.push({x: particle.x, y: particle.y});
    }

    return particle;
}

/**
 * Calcula el campo eléctrico en un punto dado debido a una distribución de cargas
 * @param {Array} charges - Lista de objetos con propiedades {x, y, q}
 * @param {Number} x - Coordenada x del punto donde calcular el campo
 * @param {Number} y - Coordenada y del punto donde calcular el campo
 * @returns {Object} - Campo eléctrico con componentes {ex, ey}
 */
function calculateElectricField(charges, x, y) {
    // Constante de Coulomb (unidades normalizadas)
    const k = 8.9875517923e9;
    
    // Inicializar componentes del campo
    let ex = 0;
    let ey = 0;
    
    // Calcular contribución de cada carga
    for (const charge of charges) {
        // Distancia entre punto y carga
        const dx = x - charge.x;
        const dy = y - charge.y;
        const r2 = dx*dx + dy*dy;
        
        // Evitar división por cero
        if (r2 < 0.0001) continue;
        
        // Magnitud del campo según la ley de Coulomb
        const r = Math.sqrt(r2);
        const e = k * charge.q / r2;
        
        // Componentes del campo
        ex += e * dx / r;
        ey += e * dy / r;
    }
    
    return { ex, ey };
}

/**
 * Función para la fuerza de Lorentz (eléctrica y magnética)
 * @param {Object} particle - Partícula con propiedades {vx, vy, charge}
 * @param {Object} E - Campo eléctrico con componentes {ex, ey}
 * @param {Object} B - Campo magnético con componentes {bx, by, bz}
 * @returns {Object} - Fuerza resultante con componentes {fx, fy}
 */
function lorentzForce(particle, E, B) {
    const q = particle.charge || (particle.type === 'electron' ? -1 : 1);
    
    // Fuerza eléctrica F = qE
    let fx = q * E.ex;
    let fy = q * E.ey;
    
    // Fuerza magnética F = q(v × B)
    // Para componentes 2D, solo usamos Bz
    fx += q * particle.vy * B.bz;
    fy -= q * particle.vx * B.bz;
    
    return { fx, fy };
}

// Exportamos funciones para uso en simulador y pruebas
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        borisAlgorithm,
        calculateElectricField,
        lorentzForce
    };
}
