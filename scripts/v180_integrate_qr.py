import os

def patch_index_html():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add html5-qrcode script
    target_script = '<script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>'
    if target_script not in content:
        content = content.replace('</head>', f'    {target_script}\n</head>')

    # 2. Add Scan QR button to intiface header
    target_button = "id=\"btnQrScanIntiface\""
    qr_button = """          <button class="btn-intiface-primary" style="background:#2d2d3d; border:1px solid #eb3b5a;" id="btnQrScanIntiface" onclick="openQrScanner()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"></path><path d="M14 14v6M17 14v6M20 14h-6"></path></svg>
            Scan QR
          </button>"""
    if target_button not in content:
        replace_anchor = '<button class="btn-intiface-primary" onclick="handleAddDeviceIntiface()">'
        content = content.replace(replace_anchor, f'{qr_button}\n          {replace_anchor}')

    # 3. Add QR Modal
    target_modal = 'id="qrModal"'
    qr_modal = """
    <!-- QR Scanner Modal -->
    <div id="qrModal" class="hidden" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;">
      <div class="card" style="width: 100%; max-width: 400px; position: relative; border: 1px solid var(--border); background: var(--card-bg);">
        <button onclick="closeQrScanner()" style="position: absolute; right: 15px; top: 15px; background: none; border: none; color: white; cursor: pointer; font-size: 20px; z-index: 1001;">&times;</button>
        <h2 class="section-title" style="margin-bottom: 20px;">Escáner QR</h2>
        <div id="qr-reader" style="width:100%; background:white;"></div>
        <div id="qr-result" style="margin-top: 15px; color: #aaaab3; font-size: 14px; text-align: center;">Apunta al código QR del juguete/manual.</div>
      </div>
    </div>
"""
    if target_modal not in content:
        content = content.replace('<!-- Dual Control Modal -->', f'{qr_modal}\n    <!-- Dual Control Modal -->')

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)

def patch_app_js():
    with open('app.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if patched
    if 'let html5QrcodeScanner =' in content: return

    # JS logic
    qr_logic = """
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
            { fps: 10, qrbox: {width: 250, height: 250} },
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
    document.getElementById('qr-result').innerText = `ID Detectado: ${decodedText}`;
    log(`QR Scaneado exitosamente: ${decodedText}`, 'success');
    
    // Asignar prefijo global extraído del QR (ej. "8154")
    gScannedId = decodedText;
    
    setTimeout(() => {
        closeQrScanner();
        // Disparar conexión automáticamente con filtro inyectado
        handleAddDeviceIntiface();
    }, 1000);
}

function onScanFailure(error) {
    // Ignorar frames vacíos
}

"""
    # Append logic before handleAddDeviceIntiface
    content = content.replace('async function handleAddDeviceIntiface() {', f'{qr_logic}async function handleAddDeviceIntiface() {{')
    
    # Inject gScannedId logic to filters
    target_filter = "{ namePrefix: 'wb' }, { namePrefix: 'LVS' }, { namePrefix: 'Love' },"
    replacement_filter = """{ namePrefix: 'wb' }, { namePrefix: 'LVS' }, { namePrefix: 'Love' },
          ...(gScannedId ? [{ namePrefix: gScannedId }] : []),"""
    content = content.replace(target_filter, replacement_filter)
    
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    patch_index_html()
    patch_app_js()
    with open('activity.log', 'a', encoding='utf-8') as f:
        f.write("[v1.8.0] Added html5-qrcode scanner as a third connection option.\\n")
