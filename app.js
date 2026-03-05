/**
 * LVS Control · app.js · v1.4.0
 * Controlador Web Bluetooth para dispositivo Love Spouse (8154 / 7043)
 * Autor: Antigravity Agent · 2026-03-04
 *
 * Modelo objetivo  : Love Spouse 8154 (BLE name prefix: wbMSE)
 * Protocolo fuente : simondankelmann/Bluetooth-LE-Spam (re-ing. @mandomat)
 *
 * Novedades v1.2.0:
 *  - Filtro de escaneo priorizado por nombre 'wbMSE'
 *  - Burst mode: envía el comando activo cada N ms (default 250ms)
 *  - Modo Shake: DeviceMotionEvent → intensidad → comando BLE
 *  - Modo dual de paquete: 11B (PREFIX+CMD) o 18B (HEADER+PREFIX+CMD+APPENDIX)
 *  - Configuración dinámica de intervalo y modo de paquete
 *
 * ─── Protocolo BLE ──────────────────────────────────────────
 * Empresa (Company ID Manufacturer): 0xFFF0
 * Nombre de advertising del dispositivo: wbMSE (77 62 4D 53 45)
 *
 * Paquete modo 11B (spec usuario):
 *   [PREFIX 8B: 6D B6 43 CE 97 FE 42 7C] + [CMD 3B]
 *
 * Paquete modo 18B (advertising manufacturer data completo):
 *   [FF FF 00] + [6D B6 43 CE 97 FE 42 7C] + [CMD 3B] + [03 03 8F AE]
 *
 * Comandos verificados:
 *   Stop : E5 15 7D
 *   Baja : E4 9C 6C
 *   Media: E7 07 5E
 *   Alta : E6 8E 4F
 * ────────────────────────────────────────────────────────────
 */

const MODELS = {
  '8154': { id: '8154', name: 'Knight No. 3', blePrefix: 'wbMSE' },
  '7043': { id: '7043', name: 'ZBTD015', blePrefix: 'wbMSE' }
};

'use strict';

/* ══════════════════════════════════════════════════════════
   CONSTANTES DEL PROTOCOLO
   ══════════════════════════════════════════════════════════ */
const COMPANY_ID = 0xFFF0;
const SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const CHAR_UUIDS = [
  '0000fff2-0000-1000-8000-00805f9b34fb',
  '0000fff1-0000-1000-8000-00805f9b34fb',
  '0000fff3-0000-1000-8000-00805f9b34fb',
];

// Segmentos del paquete (modo 18B)
const PKT_HEADER = new Uint8Array([0xFF, 0xFF, 0x00]);
const PKT_PREFIX = new Uint8Array([0x6D, 0xB6, 0x43, 0xCE, 0x97, 0xFE, 0x42, 0x7C]);
const PKT_APPENDIX = new Uint8Array([0x03, 0x03, 0x8F, 0xAE]);

// Comandos verificados
const CMD = {
  STOP: new Uint8Array([0xE5, 0x15, 0x7D]),   // Classic Stop
  LOW: new Uint8Array([0xE4, 0x9C, 0x6C]),   // Classic 1 / Baja
  MED: new Uint8Array([0xE7, 0x07, 0x5E]),   // Classic 2 / Media
  HIGH: new Uint8Array([0xE6, 0x8E, 0x4F]),   // Classic 3 / Alta
  // Channel 1
  CH1_STOP: new Uint8Array([0xD5, 0x96, 0x4C]),
  CH1_LOW: new Uint8Array([0xD4, 0x1F, 0x5D]),
  CH1_MED: new Uint8Array([0xD7, 0x84, 0x6F]),
  CH1_HIGH: new Uint8Array([0xD6, 0x0D, 0x7E]),
  // Channel 2
  CH2_STOP: new Uint8Array([0xA5, 0x11, 0x3F]),
  CH2_LOW: new Uint8Array([0xA4, 0x98, 0x2E]),
  CH2_MED: new Uint8Array([0xA7, 0x03, 0x1C]),
  CH2_HIGH: new Uint8Array([0xA6, 0x8A, 0x0D]),
  // Modos Rítmicos Extraídos
  ALL_PAT_1: new Uint8Array([0xE1, 0x31, 0x3B]),
  ALL_PAT_2: new Uint8Array([0xE0, 0xB8, 0x2A]), // Fast pulse
  ALL_PAT_3: new Uint8Array([0xE3, 0x23, 0x18]),
  ALL_PAT_4: new Uint8Array([0xE2, 0xAA, 0x09]),
  ALL_PAT_5: new Uint8Array([0xED, 0x5D, 0xF1]),
  ALL_PAT_6: new Uint8Array([0xEC, 0xD4, 0xE0]),
};

/* ══════════════════════════════════════════════════════════
   ESTADO GLOBAL
   ══════════════════════════════════════════════════════════ */
let gDevice = null;
let gServer = null;
let gChar = null;
let gActiveSpeed = null;   // 'LOW' | 'MED' | 'HIGH' | null
let gPacketMode = 11;     // 11 o 18 bytes
let gBurstInterval = null;   // handle del setInterval de ráfaga
let gBurstMs = 250;    // ms entre ráfagas
let gShakeMode = false;  // estado del modo shake
let gShakeThrottle = null;   // para throttle del acelerómetro
let gShakeLastCmd = null;   // último comando enviado por shake
let gMainIntensity = 0;     // Intensidad del slider principal (0-100)
let gActiveModel = '8154';  // Model por defecto
let gDeepScan = false;      // Modo de escaneo sin filtros

/* ══════════════════════════════════════════════════════════
   REFERENCIAS DOM
   ══════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

const el = {
  // Header
  statusBadge: $('statusBadge'),
  statusText: $('statusText'),
  // Connect
  btIconWrapper: $('btIconWrapper'),
  connectSubtitle: $('connectSubtitle'),
  deviceInfo: $('deviceInfo'),
  deviceName: $('deviceName'),
  btnConnect: $('btnConnect'),
  btnDisconnect: $('btnDisconnect'),
  // Control
  btnLow: $('btnLow'),
  btnMed: $('btnMed'),
  btnHigh: $('btnHigh'),
  btnStop: $('btnStop'),
  burstIndicator: $('burstIndicator'),
  // Shake
  btnShake: $('btnShake'),
  axisX: $('axisX'), axisXVal: $('axisXVal'),
  axisY: $('axisY'), axisYVal: $('axisYVal'),
  axisZ: $('axisZ'), axisZVal: $('axisZVal'),
  intensityFill: $('intensityFill'),
  intensityLevel: $('intensityLevel'),
  // Settings
  settingsChevron: $('settingsChevron'),
  settingsBody: $('settingsBody'),
  modeBtn11: $('modeBtn11'),
  modeBtn18: $('modeBtn18'),
  intervalSlider: $('intervalSlider'),
  intervalDesc: $('intervalDesc'),
  ppHex: $('ppHex'),
  // Log
  logBody: $('logBody'),
  // Battery
  batteryBadge: $('batteryBadge'),
  batteryPct: $('batteryPct'),
  // Intensity
  mainIntensitySlider: $('mainIntensitySlider'),
  mainIntensityVal: $('mainIntensityVal'),
  mainIntensityHex: $('mainIntensityHex'),
  activeModelTitle: $('activeModelTitle'),
  targetNamePrefix: $('targetNamePrefix'),
  btnDeepScanMain: $('btnDeepScanMain'),
  btnDual: $('btnDual'),
  btnDualClose: $('btnDualClose'),
};

/* ══════════════════════════════════════════════════════════
   LOGGER
   ══════════════════════════════════════════════════════════ */
function log(msg, type = 'info') {
  const t = new Date().toLocaleTimeString('es-MX', { hour12: false });
  const row = document.createElement('div');
  row.className = `log-entry log-${type}`;
  row.innerHTML = `<span class="log-time">${t}</span><span class="log-msg">${msg}</span>`;
  el.logBody.appendChild(row);
  el.logBody.scrollTop = el.logBody.scrollHeight;
  // Limitar histórico a 120 entradas
  while (el.logBody.children.length > 120) el.logBody.removeChild(el.logBody.firstChild);
}

function clearLog() {
  el.logBody.innerHTML = '';
  log('Log limpiado.', 'info');
}

/* ══════════════════════════════════════════════════════════
   UTILIDADES DE PAQUETE
   ══════════════════════════════════════════════════════════ */
function buildPacket(cmdBytes) {
  if (gPacketMode === 11) {
    // Modo 11B: PREFIX(8) + CMD(3)
    const p = new Uint8Array(11);
    p.set(PKT_PREFIX, 0);
    p.set(cmdBytes, 8);
    return p;
  } else {
    // Modo 18B: HEADER(3) + PREFIX(8) + CMD(3) + APPENDIX(4)
    const p = new Uint8Array(18);
    p.set(PKT_HEADER, 0);
    p.set(PKT_PREFIX, 3);
    p.set(cmdBytes, 11);
    p.set(PKT_APPENDIX, 14);
    return p;
  }
}

function bytesToHex(b) {
  return Array.from(b).map(v => v.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

function updatePacketPreview(cmdKey) {
  if (!cmdKey || !CMD[cmdKey]) {
    el.ppHex.textContent = '— sin velocidad seleccionada —';
    return;
  }
  const pkt = buildPacket(CMD[cmdKey]);
  el.ppHex.textContent = bytesToHex(pkt);
}

/* ══════════════════════════════════════════════════════════
   ESTADO DE LA UI
   ══════════════════════════════════════════════════════════ */
function setStatus(state) {
  const map = {
    scanning: { text: 'Escaneando…', cls: 'scanning' },
    connecting: { text: 'Conectando…', cls: 'scanning' },
    connected: { text: 'Conectado', cls: 'connected' },
    disconnected: { text: 'Desconectado', cls: '' },
  };
  const s = map[state] || { text: 'Desconectado', cls: '' };
  el.statusText.textContent = s.text;
  el.statusBadge.className = `status-badge ${s.cls}`;
}

function setConnectedUI(connected, name = '') {
  el.btnConnect.classList.toggle('hidden', connected);
  el.btnDisconnect.classList.toggle('hidden', !connected);
  el.deviceInfo.classList.toggle('hidden', !connected);
  el.btIconWrapper.className = `card-icon${connected ? ' ok' : ''}`;

  if (connected) {
    el.deviceName.textContent = name || 'wbMSE';
    el.connectSubtitle.innerHTML = 'Dispositivo listo. Selecciona velocidad.';
    setStatus('connected');
    enableSpeedBtns(true);
    $('dbBtnMark').disabled = false;
    $('dbBtnSweepStart').disabled = false;
    if (el.btnDual) el.btnDual.disabled = false;
    el.mainIntensitySlider.disabled = false;
    dbStopBurst();
    // Bloquear selector de modelo mientras está conectado
    $$('.ms-tab').forEach(b => b.disabled = true);
  } else {
    el.connectSubtitle.innerHTML = `Buscando dispositivo <code id="targetNamePrefix">wbMSE${gActiveModel}</code> via Web Bluetooth`;
    setStatus('disconnected');
    enableSpeedBtns(false);
    el.btnShake.disabled = true; if (el.btnDual) el.btnDual.disabled = true;
    el.mainIntensitySlider.disabled = true;
    el.batteryBadge.classList.add('hidden');
    stopShakeMode();
    stopBurst();
    clearActiveUI();
    // Deshabilitar controles de debug
    $('dbBtnSend').disabled = true;
    $('dbBtnBurst').disabled = true;
    $('dbBtnMark').disabled = true;
    $('dbBtnSweepStart').disabled = true;
    dbStopSweep();
    dbStopBurst();
    // Habilitar selector de modelo
    $$('.ms-tab').forEach(b => b.disabled = false);
  }
}

const $$ = sel => document.querySelectorAll(sel);

function enableSpeedBtns(on) {
  [el.btnLow, el.btnMed, el.btnHigh, el.btnStop].forEach(b => {
    b.disabled = !on;
  });
}

function clearActiveUI() {
  [el.btnLow, el.btnMed, el.btnHigh].forEach(b => b.classList.remove('active-btn'));
  gActiveSpeed = null;
}

function setActiveSpeed(key) {
  clearActiveUI();
  gActiveSpeed = key;
  const btnMap = { LOW: el.btnLow, MED: el.btnMed, HIGH: el.btnHigh };
  if (key && btnMap[key]) btnMap[key].classList.add('active-btn');
  updatePacketPreview(key);
}

/* ══════════════════════════════════════════════════════════
   ESCRITURA BLE + RÁFAGA (BURST MODE)
   ══════════════════════════════════════════════════════════ */
async function writeCommand(cmdBytes, label, silent = false) {
  if (!gChar) {
    if (!silent) log('Sin característica. Reconecta.', 'error');
    return false;
  }
  try {
    const pkt = buildPacket(cmdBytes);
    if (!silent) log(`→ [${label}] ${bytesToHex(pkt)}`, 'cmd');
    if (typeof gChar.writeValueWithoutResponse === 'function') {
      await gChar.writeValueWithoutResponse(pkt);
    } else {
      await gChar.writeValue(pkt);
    }
    return true;
  } catch (err) {
    if (!silent) log(`✗ Error: ${err.message}`, 'error');
    console.error('[LVS]', err);
    return false;
  }
}

function startBurst(cmdKey) {
  stopBurst();
  const cmdBytes = CMD[cmdKey];
  if (!cmdBytes) return;

  // Envío inmediato
  writeCommand(cmdBytes, `${cmdKey} burst`, false);

  // Luego en intervalo
  gBurstInterval = setInterval(() => {
    writeCommand(cmdBytes, `${cmdKey} ♻`, true);  // silencioso en log
  }, gBurstMs);

  el.burstIndicator.classList.add('active');
  log(`Ráfaga activa: ${cmdKey} cada ${gBurstMs}ms`, 'success');
}

function stopBurst() {
  if (gBurstInterval) {
    clearInterval(gBurstInterval);
    gBurstInterval = null;
  }
  el.burstIndicator.classList.remove('active');
}

function selectSpeed(key) {
  if (!gChar) { log('No conectado.', 'warn'); return; }
  if (gShakeMode) { log('Desactiva Shake Mode primero.', 'warn'); return; }
  setActiveSpeed(key);
  startBurst(key);
  log(`Velocidad seleccionada: ${key}`, 'info');
}

async function emergencyStop() {
  stopBurst();
  clearActiveUI();
  const ok = await writeCommand(CMD.STOP, '⛔ STOP', false);
  if (ok) {
    el.btnStop.style.animation = 'none';
    void el.btnStop.offsetHeight;
    el.btnStop.style.animation = '';
    log('✅ STOP enviado', 'success');
  }
  updatePacketPreview(null);
}

/* ══════════════════════════════════════════════════════════
   CONEXIÓN BLUETOOTH
   ══════════════════════════════════════════════════════════ */
async function handleConnect() {
  if (!navigator.bluetooth) {
    log('❌ Web Bluetooth no soportado. Usa Chrome o Edge.', 'error');
    alert('Web Bluetooth no disponible.\nUsa Google Chrome o Edge en HTTPS o localhost.');
    return;
  }
  try {
    const isLocal = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.') ||
      window.location.hostname.startsWith('172.');

    if (window.location.protocol !== 'https:' && !isLocal) {
      log('❌ Error de seguridad: Web Bluetooth requiere HTTPS o IP Local.', 'error');
      alert('¡Atención! Web Bluetooth requiere una conexión segura.\nUsa HTTPS o asegúrate de estar en una IP local/localhost.');
      return;
    }
    setStatus('scanning');
    el.btIconWrapper.className = 'card-icon spinning';
    el.btnConnect.disabled = true;

    const m = MODELS[gActiveModel];
    const targetFullName = `${m.blePrefix}${m.id}`;

    log(gDeepScan ? 'Escaneando TODOS los dispositivos (Modo Profundo)…' : `Escaneando dispositivos (Filtro amplio: ${targetFullName}, wb, LVS)…`, 'info');

    // Construir opciones
    let options = {};
    const commonServices = [
      SERVICE_UUID,
      '0000180a-0000-1000-8000-00805f9b34fb',
      'battery_service',
      '0000fff1-0000-1000-8000-00805f9b34fb',
      '0000fff2-0000-1000-8000-00805f9b34fb',
      '0000fff5-0000-1000-8000-00805f9b34fb',
      '0000fee9-0000-1000-8000-00805f9b34fb'
    ];

    if (gDeepScan) {
      options = {
        acceptAllDevices: true,
        optionalServices: commonServices
      };
    } else {
      options = {
        filters: [
          { namePrefix: 'wb' },
          { namePrefix: 'LVS' },
          { namePrefix: 'Love' },
          { namePrefix: m.id },
          { services: [SERVICE_UUID] },
          { manufacturerData: [{ companyIdentifier: COMPANY_ID }] },
          { manufacturerData: [{ companyIdentifier: 0xFFF1 }] }
        ],
        optionalServices: commonServices
      };
    }

    gDevice = await navigator.bluetooth.requestDevice(options);

    log(`✓ Encontrado: "${gDevice.name || '(sin nombre)'}"`, 'success');
    setStatus('connecting');
    gDevice.addEventListener('gattserverdisconnected', onDeviceDisconnected);

    gServer = await gDevice.gatt.connect();
    log('GATT conectado. Buscando servicio 0xFFF0…', 'info');

    let service;
    try {
      // Intentar el estándar FFF0
      service = await gServer.getPrimaryService(SERVICE_UUID);
      log('Servicio 0xFFF0 encontrado ✓', 'success');
    } catch {
      log('⚠️ FFF0 no hallado — buscando servicios alternativos…', 'warn');
      const svcs = await gServer.getPrimaryServices();
      // Buscar cualquier cosa que se parezca a FFF0 o FFE0
      service = svcs.find(s => s.uuid.includes('fff0') || s.uuid.includes('ffe0') || s.uuid.includes('fff1'));

      if (!service && svcs.length > 0) {
        service = svcs[0]; // Fuerza bruta: usar el primero
        log(`Usando servicio por defecto: ${service.uuid}`, 'warn');
      }

      if (!service) throw new Error('El dispositivo no expone servicios compatibles.');
    }

    gChar = await findWriteChar(service);
    if (!gChar) throw new Error('Sin característica de escritura disponible.');

    el.btIconWrapper.className = 'card-icon ok';
    el.btnConnect.disabled = false;
    setConnectedUI(true, gDevice.name);

    // Suscribirse a servicios adicionales
    subscribeBatteryLevel(gServer);

    log(`✅ Listo. Ráfagas a ${gBurstMs}ms · Paquete ${gPacketMode}B`, 'success');

  } catch (err) {
    el.btIconWrapper.className = 'card-icon';
    el.btnConnect.disabled = false;
    setStatus('disconnected');
    if (err.name === 'NotFoundError') {
      log('Escaneo cancelado por el usuario.', 'warn');
    } else if (err.name === 'SecurityError') {
      log('Permiso denegado. Verifica HTTPS/localhost.', 'error');
    } else {
      log(`Error: ${err.message}`, 'error');
    }
    gDevice = null;
  }
}

async function findWriteChar(service) {
  try {
    const chars = await service.getCharacteristics();
    // Prioridad 1: FFF2 (estándar de Love Spouse)
    let ch = chars.find(c => c.uuid.includes('fff2'));
    // Prioridad 2: Cualquier característica que permita escritura
    if (!ch) ch = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);

    if (ch) log(`Característica de escritura: ${ch.uuid.slice(0, 8)}… ✓`, 'success');
    return ch;
  } catch (e) {
    log('Error buscando características: ' + e.message, 'error');
    return null;
  }
}

async function handleDisconnect() {
  if (gDevice?.gatt.connected) gDevice.gatt.disconnect();
  log('Desconexión solicitada.', 'info');
  cleanupState();
}

function onDeviceDisconnected() {
  log('⚠️ Dispositivo desconectado.', 'warn');
  cleanupState();
}

function cleanupState() {
  gDevice = null;
  gServer = null;
  gChar = null;
  stopShakeMode();
  stopBurst();
  updateUIState(false);
}
/* ══════════════════════════════════════════════════════════
   SERVICIO DE BATERÍA
   ══════════════════════════════════════════════════════════ */
async function subscribeBatteryLevel(server) {
  try {
    const service = await server.getPrimaryService('battery_service');
    const characteristic = await service.getCharacteristic('battery_level');

    characteristic.addEventListener('characteristicvaluechanged', (event) => {
      const value = event.target.value.getUint8(0);
      updateBatteryUI(value);
    });

    await characteristic.startNotifications();
    const initialValue = await characteristic.readValue();
    updateBatteryUI(initialValue.getUint8(0));

    log(`🔋 Suscrito a nivel de batería: ${initialValue.getUint8(0)}%`, 'success');
  } catch (err) {
    log(`⚠️ Servicio de batería no disponible: ${err.message}`, 'warn');
  }
}

function updateBatteryUI(percent) {
  el.batteryPct.textContent = `${percent}%`;
  el.batteryBadge.classList.remove('hidden');

  // Cambiar color según nivel
  if (percent > 60) el.batteryBadge.style.color = 'var(--green)';
  else if (percent > 20) el.batteryBadge.style.color = 'var(--amber)';
  else el.batteryBadge.style.color = 'var(--red)';
}

/* ══════════════════════════════════════════════════════════
   COMTROL DE INTENSIDAD PROPORCIONAL
   ══════════════════════════════════════════════════════════ */
function updateMainIntensity(value) {
  gMainIntensity = parseInt(value, 10);
  el.mainIntensityVal.textContent = `${gMainIntensity}%`;

  const intensityByte = Math.round(gMainIntensity * 2.55);
  const hex = intensityByte.toString(16).padStart(2, '0').toUpperCase();
  el.mainIntensityHex.textContent = hex;

  // Actualizar slider visual
  el.mainIntensitySlider.style.background =
    `linear-gradient(90deg, var(--pink) ${gMainIntensity}%, rgba(255,255,255,.1) ${gMainIntensity}%)`;

  if (gShakeMode) {
    log('Desactiva Shake Mode para usar el slider.', 'warn');
    return;
  }

  // Usar base de HIGH para el comando proporcional
  const cmd = new Uint8Array([0xE6, 0x8E, intensityByte]);

  // Si es 0, enviamos STOP literal para mayor seguridad
  if (gMainIntensity === 0) {
    emergencyStop();
    return;
  }

  // Actualizar UI activa
  clearActiveUI();
  setActiveSpeed(null); // No mostrar ninguna velocidad fija como activa

  // Envío vía ráfaga (reutilizando lógica de burst)
  stopBurst();

  // Crear un comando temporal en CMD para que startBurst lo use si quisiéramos, 
  // pero mejor inyectamos un envío directo y un intervalo manual suave.
  writeCommand(cmd, `SLIDER:${gMainIntensity}%`, false);

  gBurstInterval = setInterval(() => {
    writeCommand(cmd, `SLIDER ♻`, true);
  }, gBurstMs);

  el.burstIndicator.classList.add('active');
}

/* ══════════════════════════════════════════════════════════
   MODO SHAKE — Acelerómetro
   ══════════════════════════════════════════════════════════ */
async function toggleShakeMode() {
  if (gShakeMode) {
    stopShakeMode();
  } else {
    await startShakeMode();
  }
}

async function startShakeMode() {
  // iOS 13+ necesita permiso explícito
  if (typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const result = await DeviceMotionEvent.requestPermission();
      if (result !== 'granted') {
        log('Permiso de acelerómetro denegado.', 'error');
        return;
      }
    } catch (e) {
      log('Error pidiendo permiso acelerómetro: ' + e.message, 'error');
      return;
    }
  }

  // Verifica soporte
  if (typeof DeviceMotionEvent === 'undefined') {
    log('❌ Acelerómetro no disponible en este dispositivo.', 'error');
    alert('DeviceMotionEvent no soportado.\nUsa un dispositivo móvil con Chrome.');
    return;
  }

  gShakeMode = true;
  stopBurst();          // Shake toma control del burst
  clearActiveUI();

  el.btnShake.classList.add('on');
  log('🤳 Shake Mode activado. Mueve el dispositivo.', 'shake');

  window.addEventListener('devicemotion', handleMotion, { passive: true });
}

function stopShakeMode() {
  if (!gShakeMode) return;
  gShakeMode = false;
  window.removeEventListener('devicemotion', handleMotion);
  el.btnShake.classList.remove('on');

  // Limpiar UI del acelerómetro
  el.axisX.style.width = '0'; el.axisXVal.textContent = '0.0';
  el.axisY.style.width = '0'; el.axisYVal.textContent = '0.0';
  el.axisZ.style.width = '0'; el.axisZVal.textContent = '0.0';
  el.intensityFill.style.width = '0';
  el.intensityLevel.textContent = '—';

  stopBurst();
  log('Shake Mode desactivado.', 'info');
}

function handleMotion(event) {
  const acc = event.accelerationIncludingGravity || event.acceleration;
  if (!acc) return;

  const x = acc.x || 0;
  const y = acc.y || 0;
  const z = acc.z || 0;

  // Magnitud total de aceleración
  const magnitude = Math.sqrt(x * x + y * y + z * z);
  // Aceleración neta (restando gravedad ~9.8)
  const netAccel = Math.max(0, magnitude - 9.8);

  // Actualizar visualizador (clamped a 0..20 m/s² para display)
  const clamp = (v, max) => Math.min(Math.abs(v) / max * 100, 100).toFixed(0) + '%';
  el.axisX.style.width = clamp(x, 20); el.axisXVal.textContent = x.toFixed(1);
  el.axisY.style.width = clamp(y, 20); el.axisYVal.textContent = y.toFixed(1);
  el.axisZ.style.width = clamp(z, 20); el.axisZVal.textContent = z.toFixed(1);

  const intensityPct = Math.min(netAccel / 12 * 100, 100).toFixed(0);
  el.intensityFill.style.width = intensityPct + '%';

  // Mapeo a nivel de velocidad
  let targetCmd, levelLabel;
  if (netAccel < 2) { targetCmd = CMD.STOP; levelLabel = 'STOP'; }
  else if (netAccel < 5) { targetCmd = CMD.LOW; levelLabel = 'BAJA'; }
  else if (netAccel < 10) { targetCmd = CMD.MED; levelLabel = 'MEDIA'; }
  else { targetCmd = CMD.HIGH; levelLabel = 'ALTA'; }

  el.intensityLevel.textContent = levelLabel;

  // Throttle: no enviar más de 1 cmd cada gBurstMs
  const now = Date.now();
  if (gShakeThrottle && (now - gShakeThrottle) < gBurstMs) return;
  gShakeThrottle = now;

  // Solo si el comando cambió
  const cmdStr = bytesToHex(targetCmd);
  if (gShakeLastCmd !== cmdStr && gChar) {
    gShakeLastCmd = cmdStr;
    writeCommand(targetCmd, `SHAKE:${levelLabel}`, false);
  }
}

/* ══════════════════════════════════════════════════════════
   CONFIGURACIÓN
   ══════════════════════════════════════════════════════════ */
function setPacketMode(mode) {
  gPacketMode = mode;
  el.modeBtn11.classList.toggle('mode-active', mode === 11);
  el.modeBtn18.classList.toggle('mode-active', mode === 18);
  log(`Modo de paquete: ${mode}B`, 'info');

  // Si hay burst activo, reiniciarlo con el nuevo paquete
  if (gBurstInterval && gActiveSpeed) {
    stopBurst();
    startBurst(gActiveSpeed);
  }
  updatePacketPreview(gActiveSpeed);
}

function updateInterval(value) {
  gBurstMs = parseInt(value, 10);
  el.intervalDesc.textContent = `${gBurstMs} ms`;
  // Actualizar slider gradient
  const pct = ((gBurstMs - 100) / 900 * 100).toFixed(0);
  el.intervalSlider.style.background =
    `linear-gradient(90deg, var(--pink) ${pct}%, rgba(255,255,255,.12) ${pct}%)`;

  // Reiniciar burst si está activo
  if (gBurstInterval && gActiveSpeed) {
    stopBurst();
    startBurst(gActiveSpeed);
    log(`Intervalo actualizado: ${gBurstMs}ms`, 'info');
  }
}

function toggleSettings() {
  const isHidden = el.settingsBody.classList.contains('hidden');
  el.settingsBody.classList.toggle('hidden', !isHidden);
  el.settingsChevron.classList.toggle('open', isHidden);
}

/* ══════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  log('LVS Control v1.3.0 — Objetivo: wbMSE / 8154', 'info');
  log(`Modo paquete: ${gPacketMode}B · Ráfaga: ${gBurstMs}ms`, 'info');

  if (!navigator.bluetooth) {
    log('❌ Web Bluetooth no soportado. Usa Chrome o Edge.', 'error');
  } else {
    log(`✓ Navegador OK. Listo para escanear.`, 'success');
  }

  // Cargar modelo guardado
  const saved = localStorage.getItem('lvs_active_model');
  if (saved && MODELS[saved]) selectModel(saved);
  else updateInterval(gBurstMs);

  // Init debug
  dbInit();
});

/* ══════════════════════════════════════════════════════════
   SELECCIÓN DE MODELO
   ══════════════════════════════════════════════════════════ */
function selectModel(id) {
  if (gDevice && gDevice.gatt.connected) return; // No cambiar mientras está conectado

  gActiveModel = id;
  localStorage.setItem('lvs_active_model', id);

  const m = MODELS[id];

  // Actualizar UI
  $$('.ms-tab').forEach(b => b.classList.remove('active'));
  $(`tab-${id}`).classList.add('active');

  el.activeModelTitle.innerHTML = `Love Spouse <span class="model-tag">${m.id}</span>`;
  el.targetNamePrefix.textContent = `${m.blePrefix}${m.id}`;

  log(`Modelo seleccionado: ${m.name} (${m.id})`, 'info');
}

function toggleDeepScan() {
  gDeepScan = !gDeepScan;
  if (el.btnDeepScan) el.btnDeepScan.classList.toggle('on', gDeepScan);
  if (el.btnDeepScanMain) el.btnDeepScanMain.classList.toggle('active', gDeepScan);

  const intifaceBtn = document.getElementById('btnDeepScanIntiface');
  if (intifaceBtn) {
    if (gDeepScan) {
      intifaceBtn.style.background = '#eb3b5a';
      intifaceBtn.innerText = 'Deep Scan (ON)';
    } else {
      intifaceBtn.style.background = '#2d2d3d';
      intifaceBtn.innerText = 'Deep Scan';
    }
  }

  log(`Modo de escaneo profundo: ${gDeepScan ? 'ACTIVADO' : 'DESACTIVADO'}`, gDeepScan ? 'warn' : 'info');
}

/* ════════════════════════════════════════════════════════
   MODO DEBUG — v1.3.0
   Barrido manual/automático del Byte 2 del comando
   para descubrimiento de patrones de vibración ocultos.
   ════════════════════════════════════════════════════════ */

// Presets: bytes 0 y 1 conocidos por comando base
const DB_PRESETS = {
  STOP: { b0: 0xE5, b1: 0x15, b2Known: 0x7D },
  LOW: { b0: 0xE4, b1: 0x9C, b2Known: 0x6C },
  MED: { b0: 0xE7, b1: 0x07, b2Known: 0x5E },
  HIGH: { b0: 0xE6, b1: 0x8E, b2Known: 0x4F },
  CUSTOM: null,
};

// Estado del modo debug
let gDbPreset = 'HIGH';  // preset activo
let gDbB2 = 0x4F;   // valor actual del byte 2 (0x00 – 0xFF)
let gDbBurstTimer = null;   // burst del debug (independiente del burst principal)
let gDbSweepTimer = null;   // setInterval del auto-barrido
let gDbSweepMs = 1000;   // pausa entre pasos del barrido (default 1s)
let gDbMarks = [];     // [ { b0, b1, b2, b2hex, note } ]

/* ── Inicializar ──────────────────────────────── */
function dbInit() {
  dbSetPreset('HIGH');
  dbRefreshUI();
}

/* ── Toggle apertura/cierre del panel ───────── */
function toggleDebug() {
  const body = $('debugBody');
  const chevron = $('debugChevron');
  const isHidden = body.classList.contains('hidden');
  body.classList.toggle('hidden', !isHidden);
  chevron.classList.toggle('open', isHidden);
}

/* ── Preset: carga bytes 0 y 1 del comando base ─ */
function dbSetPreset(key) {
  gDbPreset = key;
  // Quitar active de todos los presets
  ['dbpStop', 'dbpLow', 'dbpMed', 'dbpHigh', 'dbpCustom'].forEach(id => $(id).classList.remove('db-active'));
  const map = { STOP: 'dbpStop', LOW: 'dbpLow', MED: 'dbpMed', HIGH: 'dbpHigh', CUSTOM: 'dbpCustom' };
  $(map[key])?.classList.add('db-active');

  const p = DB_PRESETS[key];
  if (p) {
    dbSetByte(0, p.b0);
    dbSetByte(1, p.b1);
    // Inicializar byte 2 al valor conocido del preset
    dbSetByte2(p.b2Known);
  }
  dbRefreshUI();
}

/* ── Actualizar byte 2 desde el slider ─────── */
function dbOnSlider(rawVal) {
  const v = parseInt(rawVal, 10);
  gDbB2 = v;
  $('dbHexDirect').value = v.toString(16).padStart(2, '0').toUpperCase();
  $('dbB2Hex').textContent = v.toString(16).padStart(2, '0').toUpperCase();
  $('dbB2Dec').textContent = `(${v})`;
  // Actualizar gradiente del slider
  const pct = (v / 255 * 100).toFixed(1);
  $('dbSlider').style.background =
    `linear-gradient(90deg, var(--amber) ${pct}%, rgba(255,255,255,.08) ${pct}%)`;
  $('dbPct').textContent = pct + '%';
  dbRefreshPacket();

  // Si el burst debug está activo, cambia el payload en caliente
  if (gDbBurstTimer) {
    dbRestartBurst();
  }
}

/* ── Actualizar byte 2 desde el input hex directo ─ */
function dbOnHexDirect(val) {
  const v = parseInt(val, 16);
  if (isNaN(v) || val.length < 2) return;   // esperar 2 dígitos
  const clamped = Math.max(0, Math.min(255, v));
  gDbB2 = clamped;
  $('dbSlider').value = clamped;
  dbOnSlider(clamped);
}

/* ── Actualizar bytes 0/1 desde inputs de texto ─ */
function dbOnByteInput() {
  // No forzamos nada, solo refrescamos el preview del paquete
  dbRefreshPacket();
}

/* ── Helpers ─────────────────────────── */
function dbSetByte(idx, val) {
  const id = ['dbB0', 'dbB1'][idx];
  if (id) $(id).value = val.toString(16).padStart(2, '0').toUpperCase();
}

function dbSetByte2(val) {
  gDbB2 = val;
  $('dbSlider').value = val;
  $('dbHexDirect').value = val.toString(16).padStart(2, '0').toUpperCase();
  $('dbB2Hex').textContent = val.toString(16).padStart(2, '0').toUpperCase();
  $('dbB2Dec').textContent = `(${val})`;
  const pct = (val / 255 * 100).toFixed(1);
  $('dbSlider').style.background =
    `linear-gradient(90deg, var(--amber) ${pct}%, rgba(255,255,255,.08) ${pct}%)`;
  $('dbPct').textContent = pct + '%';
}

function dbGetCurrentCmd() {
  const b0 = parseInt($('dbB0').value, 16) || 0;
  const b1 = parseInt($('dbB1').value, 16) || 0;
  return new Uint8Array([b0, b1, gDbB2]);
}

function dbRefreshPacket() {
  const cmd = dbGetCurrentCmd();
  const pkt = buildPacket(cmd);
  $('dbPktHex').textContent = bytesToHex(pkt);
}

function dbRefreshUI() {
  dbSetByte2(gDbB2);
  dbRefreshPacket();
}

/* ── Enviar una vez ───────────────────── */
function dbSendOnce() {
  const cmd = dbGetCurrentCmd();
  const hex = bytesToHex(cmd);
  writeCommand(cmd, `🔬 DBG [${hex}]`, false);
}

/* ── Burst del debug ─────────────────── */
function dbToggleBurst() {
  if (gDbBurstTimer) {
    dbStopBurst();
  } else {
    dbStartBurst();
  }
}

function dbStartBurst() {
  dbStopBurst();
  const btn = $('dbBtnBurst');
  btn.classList.add('db-burst-on');
  // Primer envío inmediato
  writeCommand(dbGetCurrentCmd(), `🔬 DBG burst`, false);
  gDbBurstTimer = setInterval(() => {
    writeCommand(dbGetCurrentCmd(), `🔬 DBG ♻`, true);
  }, gBurstMs);
  log(`🔬 Burst debug activo: ${bytesToHex(dbGetCurrentCmd())} cada ${gBurstMs}ms`, 'info');
}

function dbStopBurst() {
  if (gDbBurstTimer) {
    clearInterval(gDbBurstTimer);
    gDbBurstTimer = null;
  }
  $('dbBtnBurst').classList.remove('db-burst-on');
}

function dbRestartBurst() {
  if (!gDbBurstTimer) return;
  dbStopBurst();
  dbStartBurst();
}

/* ── Auto-barrido ──────────────────── */
function dbUpdateSweepDelay(ms) {
  gDbSweepMs = parseInt(ms, 10);
  $('dbSwDelayLabel').textContent = `Pausa: ${(gDbSweepMs / 1000).toFixed(1)}s`;
}

function dbStartSweep() {
  dbStopSweep();
  const fromHex = $('dbSwFrom').value;
  const toHex = $('dbSwTo').value;
  let fromVal = parseInt(fromHex, 16);
  let toVal = parseInt(toHex, 16);
  if (isNaN(fromVal)) fromVal = 0;
  if (isNaN(toVal)) toVal = 255;
  fromVal = Math.max(0, Math.min(255, fromVal));
  toVal = Math.max(0, Math.min(255, toVal));

  let current = fromVal;
  const total = Math.abs(toVal - fromVal) + 1;
  const step = toVal >= fromVal ? 1 : -1;

  log(`▶ Barrido: ${fromHex.toUpperCase()} → ${toHex.toUpperCase()} · ${gDbSweepMs}ms/paso`, 'info');

  $('dbBtnSweepStart').disabled = true;
  $('dbBtnSweepStop').disabled = false;

  const advance = () => {
    // Actualizar byte 2
    dbSetByte2(current);
    dbRefreshPacket();

    // Enviar
    const cmd = dbGetCurrentCmd();
    writeCommand(cmd, `↓ SWEEP ${current.toString(16).padStart(2, '0').toUpperCase()}`, false);

    // Barra de progreso
    const done = Math.abs(current - fromVal) + 1;
    const pct = (done / total * 100).toFixed(0);
    $('dbSwFill').style.width = pct + '%';
    $('dbSwVal').textContent = current.toString(16).padStart(2, '0').toUpperCase();

    if (current === toVal) {
      dbStopSweep();
      log(`⏹ Barrido completo.`, 'success');
      return;
    }
    current += step;
  };

  advance();  // ejecutar inmediatamente el primer paso
  gDbSweepTimer = setInterval(advance, gDbSweepMs);
}

function dbStopSweep() {
  if (gDbSweepTimer) {
    clearInterval(gDbSweepTimer);
    gDbSweepTimer = null;
  }
  $('dbBtnSweepStart').disabled = !gChar;  // solo habilitado si hay conexión
  $('dbBtnSweepStop').disabled = true;
}

/* ── Marcadores ─────────────────────── */
function dbBookmark() {
  const b0 = parseInt($('dbB0').value, 16) || 0;
  const b1 = parseInt($('dbB1').value, 16) || 0;
  const b2 = gDbB2;
  const h2 = b2.toString(16).padStart(2, '0').toUpperCase();

  // Evitar duplicados del byte 2 con misma base
  const key = `${b0.toString(16)}-${b1.toString(16)}-${b2}`;
  if (gDbMarks.find(m => m.key === key)) {
    log(`Ya marcado: ${h2}`, 'warn');
    return;
  }

  // Pedir nota opcional (corta)
  const note = '';
  gDbMarks.push({ key, b0, b1, b2, b2hex: h2, note });
  dbRenderMarks();
  log(`⭐ Marcador: ${$('dbB0').value.toUpperCase()} ${$('dbB1').value.toUpperCase()} ${h2}`, 'success');
}

function dbDeleteMark(key) {
  gDbMarks = gDbMarks.filter(m => m.key !== key);
  dbRenderMarks();
}

function dbLoadMark(key) {
  // Carga el marcador en el debug para volver a probarlo
  const m = gDbMarks.find(m => m.key === key);
  if (!m) return;
  dbSetByte(0, m.b0);
  dbSetByte(1, m.b1);
  dbSetByte2(m.b2);
  dbRefreshPacket();
  log(`🔄 Recargado: ${m.b0.toString(16).toUpperCase()} ${m.b1.toString(16).toUpperCase()} ${m.b2hex}`, 'info');
}

function dbRenderMarks() {
  const list = $('dbMarksList');
  list.innerHTML = '';
  if (!gDbMarks.length) {
    list.innerHTML = '<span class="db-no-marks">Ningún patrón marcado aún.<\/span>';
    return;
  }
  gDbMarks.forEach(m => {
    const chip = document.createElement('div');
    chip.className = 'db-mark-chip';
    chip.innerHTML = `
      <span class="mc-hex" title="${m.b0.toString(16).toUpperCase()} ${m.b1.toString(16).toUpperCase()} ${m.b2hex}"
        onclick="dbLoadMark('${m.key}')">${m.b2hex}<\/span>
      ${m.note ? `<span class="mc-note">${m.note}<\/span>` : ''}
      <span class="mc-del" onclick="event.stopPropagation();dbDeleteMark('${m.key}')">×<\/span>
    `;
    list.appendChild(chip);
  });
}

function dbCopyMarks() {
  if (!gDbMarks.length) { log('No hay marcadores para copiar.', 'warn'); return; }
  const lines = gDbMarks.map(m =>
    `${m.b0.toString(16).padStart(2, '0').toUpperCase()} ${m.b1.toString(16).padStart(2, '0').toUpperCase()} ${m.b2hex}`
  );
  const txt = '// Patrones DEBUG — LVS 8154\n' + lines.join('\n');
  navigator.clipboard.writeText(txt)
    .then(() => log('📋 Marcadores copiados al portapapeles.', 'success'))
    .catch(() => log('Error al copiar. Revisa permisos de clipboard.', 'error'));
}


/* ══════════════════════════════════════════════════════════
   MODO DUAL (MODAL)
   ══════════════════════════════════════════════════════════ */
function openDualModal() {
  const modal = document.getElementById('dualModal');
  if (modal) modal.classList.remove('hidden');
}

function closeDualModal() {
  const modal = document.getElementById('dualModal');
  if (modal) modal.classList.add('hidden');
}

function selectDualSpeed(cmdKey, btnId, channel) {
  if (!gChar) { log('No conectado para enviar a canal ' + channel, 'warn'); return; }

  // Update active UI for this channel
  document.querySelectorAll('.ch' + channel + '-btn').forEach(b => b.classList.remove('active-btn'));
  if (btnId) {
    document.getElementById(btnId).classList.add('active-btn');
  }

  startBurst(cmdKey);
  log('Canal ' + channel + ' comando: ' + cmdKey, 'info');
}

/* ══════════════════════════════════════════════════════════
   INTIFACE MULTI-DEVICE SUPPORT
   ══════════════════════════════════════════════════════════ */
let gMultiDevices = {}; // Store all connected devices


/* ══════════════════════════════════════════════════════════
   QR SCANNER INTEGRATION
   ══════════════════════════════════════════════════════════ */
let html5QrcodeScanner = null;
let gScannedId = null;

function openQrScanner() {
  document.getElementById('qrModal').classList.remove('hidden');
  document.getElementById('qr-result').innerText = 'Apunta al código QR del juguete/manual.';
  if (!html5QrcodeScanner) {
    html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false);
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
  }
}

function closeQrScanner() {
  document.getElementById('qrModal').classList.add('hidden');
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear().catch(e => console.error(e));
    html5QrcodeScanner = null;
  }
}

function onScanSuccess(decodedText, decodedResult) {
  log(`QR Scaneado exitosamente: ${decodedText}`, 'success');

  // Asignar prefijo global extraído del QR (ej. "8154")
  gScannedId = decodedText;

  // Mostrar botón para que el usuario inicie explícitamente la conexión
  document.getElementById('qr-result').innerHTML = `
        <div style="margin-bottom: 10px; color: #4b7bec;">ID Detectado: <strong>${decodedText}</strong></div>
        <button class="btn-intiface-primary" style="width:100%; justify-content:center; background:#4b7bec; margin-top:10px;" onclick="closeQrScanner(); handleAddDeviceIntiface();">
            Lanzar vinculación Bluetooth
        </button>
    `;

  if (html5QrcodeScanner) {
    // Pausar el escáner para que no siga leyendo intermitentemente
    html5QrcodeScanner.pause();
  }
}


function handleQrImageUpload(event) {
  if (event.target.files.length === 0) return;
  const file = event.target.files[0];

  document.getElementById('qrModal').classList.remove('hidden');
  document.getElementById('qr-result').innerHTML = 'Procesando imagen... espere';

  const html5QrCode = new Html5Qrcode("qr-reader");
  html5QrCode.scanFile(file, true)
    .then(decodedText => {
      html5QrCode.clear();
      onScanSuccess(decodedText, null);
    })
    .catch(err => {
      document.getElementById('qr-result').innerHTML = `<span style="color:#eb3b5a">Error: No se detectó un QR válido en la imagen.</span>`;
      log('Error escaseando QR desde imagen: ' + err, 'error');
      setTimeout(() => {
        closeQrScanner();
        html5QrCode.clear();
      }, 3000);
    });

  // Resetear valor para que dispare de nuevo si sube el mismo archivo
  event.target.value = '';
}

function onScanFailure(error) {
  // Ignorar frames vacíos
}

async function handleAddDeviceIntiface() {
  // Escaneo normal
  const isLocal = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.');

  if (!navigator.bluetooth && !isLocal) {
    alert('Web Bluetooth no soportado o no disponible en esta conexión.');
    return;
  }

  // Si navigator.bluetooth es nulo en IP local, es casi seguro por HTTP
  if (!navigator.bluetooth && isLocal && window.location.protocol !== 'https:') {
    alert('Web Bluetooth bloqueado por el navegador.\\n\\nDebes habilitar la "flag" en Chrome de tu celular para esta IP:\\nchrome://flags/#unsafely-treat-insecure-origin-as-secure');
    return;
  }
  try {
    const commonServices = [
      COMPANY_ID, '0000ffe0-0000-1000-8000-00805f9b34fb', '0000fff0-0000-1000-8000-00805f9b34fb',
      'battery_service', '0000fff1-0000-1000-8000-00805f9b34fb', '0000fff2-0000-1000-8000-00805f9b34fb',
      '0000fff5-0000-1000-8000-00805f9b34fb', '0000fee9-0000-1000-8000-00805f9b34fb',
      '0000180a-0000-1000-8000-00805f9b34fb'
    ];
    let options;
    if (gDeepScan) {
      options = {
        acceptAllDevices: true,
        optionalServices: commonServices
      };
    } else {
      options = {
        filters: [
          { namePrefix: 'wb' }, { namePrefix: 'LVS' }, { namePrefix: 'Love' },
          ...(gScannedId ? [{ namePrefix: gScannedId }] : []),
          { namePrefix: '8154' }, { namePrefix: '7043' },
          // Filtro por servicio (permitirá ver dispositivos sin nombre que lo anuncien)
          { services: ['0000fff0-0000-1000-8000-00805f9b34fb'] },
          { services: ['0000fee9-0000-1000-8000-00805f9b34fb'] }
        ],
        optionalServices: commonServices
      };
    }
    const device = await navigator.bluetooth.requestDevice(options);
    log(`✓ Multi: Encontrado: "${device.name}"`, 'success');

    device.addEventListener('gattserverdisconnected', () => {
      log(`⚠️ Dispositivo desconectado: ${device.name}`, 'warn');
      if (gMultiDevices[device.id] && gMultiDevices[device.id].burstInterval) {
        clearInterval(gMultiDevices[device.id].burstInterval);
      }
      delete gMultiDevices[device.id];
      renderIntifaceDeviceList();
    });

    const server = await device.gatt.connect();
    let service;
    try {
      service = await server.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb');
    } catch {
      const svcs = await server.getPrimaryServices();
      service = svcs.find(s => s.uuid.includes('fff0') || s.uuid.includes('ffe0') || s.uuid.includes('fff1')) || svcs[0];
    }
    if (!service) throw new Error('Servicio primario no encontrado');
    const chars = await service.getCharacteristics();
    let ch = chars.find(c => c.uuid.includes('fff2')) || chars.find(c => c.properties.writeWithoutResponse || c.properties.write);

    if (!ch) throw new Error('No write char found');

    // Add to map
    gMultiDevices[device.id] = {
      id: device.id,
      name: device.name || 'wbMSE',
      device,
      server,
      char: ch,
      intensity: 0,
      burstInterval: null
    };

    log(`✅ Conectado y añadido al Dashboard: ${device.name}`, 'success');
    renderIntifaceDeviceList();

  } catch (err) {
    log(`Multi Error: ${err.message}`, 'error');
  }
}

function updateDeviceIntensity(devId, value) {
  const dev = gMultiDevices[devId];
  if (!dev) return;

  dev.intensity = parseInt(value, 10);
  document.getElementById('lbl_int_' + devId).innerText = dev.intensity + '%';

  const intensityByte = Math.round(dev.intensity * 2.55);
  const cmd = new Uint8Array([0xE6, 0x8E, intensityByte]);

  if (dev.burstInterval) clearInterval(dev.burstInterval);

  if (dev.intensity === 0) {
    // Stop command
    dev.char.writeValueWithoutResponse(buildPacket(CMD.STOP)).catch(e => console.error(e));
    return;
  }

  // Send immediately then burst
  dev.char.writeValueWithoutResponse(buildPacket(cmd)).catch(e => console.error(e));
  dev.burstInterval = setInterval(() => {
    dev.char.writeValueWithoutResponse(buildPacket(cmd)).catch(e => console.error(e));
  }, gBurstMs);
}

function stopDeviceIntiface(devId) {
  const dev = gMultiDevices[devId];
  if (!dev) return;
  document.getElementById('slider_' + devId).value = 0;
  updateDeviceIntensity(devId, 0);
}

function disconnectDeviceIntiface(devId) {
  const dev = gMultiDevices[devId];
  if (dev && dev.device.gatt.connected) {
    dev.device.gatt.disconnect();
  }
}


function sendDevicePattern(devId, patKey) {
  const dev = gMultiDevices[devId];
  if (!dev || !dev.char) return;
  const cmd = CMD[patKey];
  if (!cmd) return;

  try {
    let value = new Uint8Array(11);
    value.set(PKT_PREFIX, 0);
    value.set(cmd, 8);
    dev.char.writeValueWithoutResponse(value).catch(e => log('Pattern write err: ' + e.message, 'error'));
    log(`Pattern ${patKey} sent to ${dev.name}`, 'success');

    // Reset slider purely visually to avoid confusion since pattern overrides intensity
    const s = document.getElementById('slider_' + devId);
    if (s) { s.value = 0; document.getElementById('lbl_int_' + devId).innerText = 'Rhythmic Mode'; }
  } catch (err) {
    log('Failed pattern: ' + err.message, 'error');
  }
}


function sendDevicePattern(devId, patKey) {
  const dev = gMultiDevices[devId];
  if (!dev || !dev.device.gatt.connected || !dev.char) return;
  const cmd = CMD[patKey];
  if (!cmd) return;

  try {
    let value = new Uint8Array(11);
    value.set(PKT_PREFIX, 0);
    value.set(cmd, 8);
    dev.char.writeValueWithoutResponse(value).catch(e => log('Pattern write err: ' + e.message, 'error'));
    log(`Pattern ${patKey} sent to ` + dev.name, 'success');

    // Reset slider purely visually to avoid confusion since pattern overrides intensity
    const s = document.getElementById('slider_' + devId);
    if (s) {
      s.value = 0;
      const lbl = document.getElementById('lbl_int_' + devId);
      if (lbl) lbl.innerText = 'Rhythmic';
    }
  } catch (err) {
    log('Failed pattern: ' + err.message, 'error');
  }
}

function sendDevicePattern(devId, patKey) {
  const dev = gMultiDevices[devId];
  if (!dev || !dev.device.gatt.connected || !dev.char) return;
  const cmd = CMD[patKey];
  if (!cmd) return;

  try {
    let value = new Uint8Array(11);
    value.set(PKT_PREFIX, 0);
    value.set(cmd, 8);
    dev.char.writeValueWithoutResponse(value).catch(e => log('Pattern write err: ' + e.message, 'error'));
    log(`Pattern ${patKey} sent to ` + dev.name, 'success');

    const s = document.getElementById('slider_' + devId);
    if (s) {
      s.value = 0;
      const lbl = document.getElementById('lbl_int_' + devId);
      if (lbl) lbl.innerText = 'MODE';
    }
  } catch (err) {
    log('Failed pattern: ' + err.message, 'error');
  }
}

function renderIntifaceDeviceList() {
  const container = document.getElementById('intifaceDeviceList');
  if (!container) return;

  container.innerHTML = '';

  Object.values(gMultiDevices).forEach(dev => {
    const card = document.createElement('div');
    card.className = 'device-card-intiface';

    card.innerHTML = `
            <div class="device-card-header">
                <div class="device-card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b7bec" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                    ${dev.name}
                    <span style="font-size:12px; color:#aaaab3; font-weight:normal;">(${dev.id.substring(0, 8)}...)</span>
                </div>
                <button class="btn-intiface-stop" style="background:transparent; border:1px solid #eb3b5a; color:#eb3b5a;" onclick="disconnectDeviceIntiface('${dev.id}')">Disconnect</button>
            </div>
            
            <div style="font-size:14px; color:#aaaab3; padding-left:5px;">Vibrate</div>
            <div class="device-slider-row">
                <input type="range" id="slider_${dev.id}" min="0" max="100" value="${dev.intensity}" oninput="updateDeviceIntensity('${dev.id}', this.value)" />
                <span id="lbl_int_${dev.id}" style="width:40px; text-align:right; font-family:monospace;">${dev.intensity}%</span>
                <button class="btn-intiface-stop" onclick="stopDeviceIntiface('${dev.id}')">Stop</button>
            </div>
            
            <!-- Dual Control (Optional) -->
            <div style="margin-top:10px; display:flex; gap:10px;">
               <button class="btn-intiface-primary" style="flex:1; background:#2d2d3d; font-size:12px; justify-content:center;" onclick="document.getElementById('slider_${dev.id}').value=50; updateDeviceIntensity('${dev.id}', 50)">Vibrate 50%</button>
               <button class="btn-intiface-primary" style="flex:1; background:#2d2d3d; font-size:12px; justify-content:center;" onclick="document.getElementById('slider_${dev.id}').value=100; updateDeviceIntensity('${dev.id}', 100)">Vibrate 100%</button>
            </div>
            <div style="font-size:14px; color:#aaaab3; padding-left:5px; margin-top:15px;">Rhythmic Modes</div>
            <div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:5px;">
                <button class="btn-intiface-primary" style="flex:1 1 30%; background:#2d2d3d; font-size:12px; justify-content:center; padding:8px 0;" onclick="sendDevicePattern('${dev.id}', 'ALL_PAT_1')">P1</button>
                <button class="btn-intiface-primary" style="flex:1 1 30%; background:#2d2d3d; font-size:12px; justify-content:center; padding:8px 0;" onclick="sendDevicePattern('${dev.id}', 'ALL_PAT_2')">Pulse</button>
                <button class="btn-intiface-primary" style="flex:1 1 30%; background:#2d2d3d; font-size:12px; justify-content:center; padding:8px 0;" onclick="sendDevicePattern('${dev.id}', 'ALL_PAT_3')">P3</button>
                <button class="btn-intiface-primary" style="flex:1 1 30%; background:#2d2d3d; font-size:12px; justify-content:center; padding:8px 0;" onclick="sendDevicePattern('${dev.id}', 'ALL_PAT_4')">P4</button>
                <button class="btn-intiface-primary" style="flex:1 1 30%; background:#2d2d3d; font-size:12px; justify-content:center; padding:8px 0;" onclick="sendDevicePattern('${dev.id}', 'ALL_PAT_5')">P5</button>
                <button class="btn-intiface-primary" style="flex:1 1 30%; background:#2d2d3d; font-size:12px; justify-content:center; padding:8px 0;" onclick="sendDevicePattern('${dev.id}', 'ALL_PAT_6')">P6</button>
            </div>
        `;
    container.appendChild(card);
  });

  if (Object.keys(gMultiDevices).length === 0) {
    container.innerHTML = '<div style="color:#aaaab3; font-style:italic; padding:20px 0;">No devices connected. Click "Add Device" to start.</div>';
  }
}

// Initial render fix for empty state
document.addEventListener('DOMContentLoaded', () => { setTimeout(renderIntifaceDeviceList, 500); });
