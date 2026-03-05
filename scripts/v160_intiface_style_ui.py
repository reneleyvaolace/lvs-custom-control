import os
import re
import logging

log_path = os.path.join("c:\\", "Projects", "lvs-custom-control", "activity.log")
logging.basicConfig(filename=log_path, level=logging.INFO, format='%(asctime)s - %(message)s')

def migrate_to_intiface_ui():
    html_path = os.path.join("c:\\", "Projects", "lvs-custom-control", "index.html")
    css_path = os.path.join("c:\\", "Projects", "lvs-custom-control", "style.css")
    js_path = os.path.join("c:\\", "Projects", "lvs-custom-control", "app.js")
    
    # 1. Update CSS for Intiface Look
    with open(css_path, "a", encoding="utf-8") as f:
        f.write("\n/* --- INTIFACE CENTRAL STYLE OVERRIDES --- */\n")
        f.write(".app { display: flex; flex-direction: row; height: 100vh; max-width: 100%; border-radius: 0; padding: 0; background: #0f0f13; border: none; overflow: hidden; }\n")
        f.write(".app-header { display: none; } /* Hide old header */\n")
        f.write("body { background: #0f0f13; margin: 0; color: #e1e1e6; }\n")
        f.write(".intiface-sidebar { width: 280px; background: #1a1a24; border-right: 1px solid #2d2d3d; display: flex; flex-direction: column; padding: 20px 0; }\n")
        f.write(".intiface-sidebar-brand { padding: 0 20px 20px 20px; font-weight: 700; font-size: 20px; border-bottom: 1px solid #2d2d3d; color: #4b7bec; display:flex; align-items:center; gap:10px; }\n")
        f.write(".intiface-sidebar-menu { list-style: none; padding: 20px 0; margin: 0; }\n")
        f.write(".intiface-sidebar-menu li { padding: 12px 20px; color: #aaaab3; cursor: pointer; transition: 0.2s; display:flex; align-items:center; gap:12px; }\n")
        f.write(".intiface-sidebar-menu li:hover { background: #2d2d3d; color: #fff; }\n")
        f.write(".intiface-sidebar-menu li.active { background: #4b7bec20; color: #4b7bec; border-right: 3px solid #4b7bec; }\n")
        f.write(".intiface-main { flex: 1; padding: 30px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }\n")
        f.write(".intiface-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }\n")
        f.write(".intiface-header h1 { margin: 0; font-size: 24px; font-weight: 600; }\n")
        f.write(".device-list-container { display: flex; flex-direction: column; gap: 15px; }\n")
        f.write(".device-card-intiface { background: #20202c; border: 1px solid #2d2d3d; border-radius: 8px; padding: 20px; display:flex; flex-direction:column; gap:15px; }\n")
        f.write(".device-card-header { display: flex; justify-content: space-between; align-items: center; }\n")
        f.write(".device-card-title { font-weight: 600; font-size: 16px; display: flex; align-items: center; gap: 10px; }\n")
        f.write(".device-slider-row { display: flex; align-items: center; gap: 15px; padding: 10px; background: #1a1a24; border-radius: 6px; }\n")
        f.write(".device-slider-row input[type=range] { flex: 1; }\n")
        f.write(".btn-intiface-primary { background: #4b7bec; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; display:flex; align-items:center; gap:8px; transition: 0.2s; }\n")
        f.write(".btn-intiface-primary:hover { background: #3867d6; }\n")
        f.write(".btn-intiface-stop { background: #eb3b5a; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; }\n")
        f.write(".btn-intiface-stop:hover { background: #fc5c65; }\n")
        f.write(".old-cards-wrapper { display: none; } /* Hide old UI blocks, but keep them in DOM for logic */\n")

    # 2. Update HTML
    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    
    # Render the old app transparently or hidden
    html_content = html_content.replace('<section class="card connect-card"', '<div class="old-cards-wrapper">\n    <section class="card connect-card"')
    html_content = html_content.replace('</section>\n\n    <!-- Activity Log -->', '</section>\n    </div>\n\n    <!-- Activity Log -->')
    
    intiface_layout = """
    <div class="intiface-sidebar">
      <div class="intiface-sidebar-brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        Intiface Control
      </div>
      <ul class="intiface-sidebar-menu">
        <li class="active">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/></svg>
          Devices
        </li>
        <li onclick="toggleSettings()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Settings
        </li>
      </ul>
    </div>
    
    <div class="intiface-main">
      <div class="intiface-header">
        <h1>Devices</h1>
        <button class="btn-intiface-primary" onclick="handleAddDeviceIntiface()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Device
        </button>
      </div>
      
      <div id="intifaceDeviceList" class="device-list-container">
        <!-- Devices will be generated here -->
      </div>
      
      <!-- Keep the Activity Log visible below -->
      <section class="card log-card" aria-label="Activity Log" style="margin-top:auto;">
    """
    
    # We replace the <main class="app"> inner start and fix the Activity Log section
    html_content = html_content.replace('<main class="app">\n\n    <!-- Header -->', '<main class="app">\n' + intiface_layout)
    html_content = html_content.replace('<section class="card log-card" aria-label="Activity Log">\n      <div class="log-header">', '<div class="log-header">')
    html_content = html_content.replace('</main>', '</div></section>\n</div> <!-- end intiface-main -->\n</main>')
    
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    # 3. Update JS Logic
    with open(js_path, "r", encoding="utf-8") as f:
        js_content = f.read()

    js_patch = """
/* ══════════════════════════════════════════════════════════
   INTIFACE MULTI-DEVICE SUPPORT
   ══════════════════════════════════════════════════════════ */
let gMultiDevices = {}; // Store all connected devices

async function handleAddDeviceIntiface() {
    // Escaneo normal
    if (!navigator.bluetooth) {
        alert('Web Bluetooth no soportado.');
        return;
    }
    try {
        const options = {
            filters: [
                { namePrefix: 'wbMSE' },
                { namePrefix: 'LVS' },
                { namePrefix: '8154' },
                { namePrefix: '7043' },
                { manufacturerData: [{ companyIdentifier: 0xFFF0 }] }
            ],
            optionalServices: [COMPANY_ID, '0000fff0-0000-1000-8000-00805f9b34fb', 'battery_service']
        };
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
        const service = await server.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb');
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
                    <span style="font-size:12px; color:#aaaab3; font-weight:normal;">(${dev.id.substring(0,8)}...)</span>
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
        `;
        container.appendChild(card);
    });
    
    if (Object.keys(gMultiDevices).length === 0) {
        container.innerHTML = '<div style="color:#aaaab3; font-style:italic; padding:20px 0;">No devices connected. Click "Add Device" to start.</div>';
    }
}

// Initial render fix for empty state
document.addEventListener('DOMContentLoaded', () => { setTimeout(renderIntifaceDeviceList, 500); });
"""
    if "INTIFACE MULTI-DEVICE SUPPORT" not in js_content:
        with open(js_path, "a", encoding="utf-8") as f:
            f.write(js_patch)

    logging.info("Parche aplicado: Interfaz Intiface Central (Multi-Dispositivo) incrustada en HTML, JS, CSS.")

if __name__ == "__main__":
    logging.info("Iniciando parcheo a Interfaz Intiface Central...")
    try:
        migrate_to_intiface_ui()
        logging.info("Exito en el parcheo v1.6.0")
        print("Success")
    except Exception as e:
        logging.error("Fallo aplicando parche Intiface: " + str(e))
        print("Error: " + str(e))

