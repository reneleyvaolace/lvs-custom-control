import os

def patch_index_html():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Extraer y colocar el botón de subir imagen al lado de Scan QR
    target_button = "id=\"btnQrUploadIntiface\""
    qr_upload_button = """          <input type="file" id="qrFileInput" accept="image/*" style="display:none;" onchange="handleQrImageUpload(event)">
          <button class="btn-intiface-primary" style="background:#2d2d3d; border:1px solid #eb3b5a;" id="btnQrUploadIntiface" onclick="document.getElementById('qrFileInput').click()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Subir QR
          </button>"""
    
    if target_button not in content:
        replace_anchor = '<button class="btn-intiface-primary" onclick="handleAddDeviceIntiface()">'
        content = content.replace(replace_anchor, f'{qr_upload_button}\n          {replace_anchor}')

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)

def patch_app_js():
    with open('app.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'function handleQrImageUpload' in content: return

    # JS logic for reading image file directly
    upload_logic = """
function handleQrImageUpload(event) {
    if (event.target.files.length === 0) return;
    const file = event.target.files[0];
    
    document.getElementById('qrModal').classList.remove('hidden');
    document.getElementById('qr-result').innerText = 'Procesando imagen... espere';
    
    const html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.scanFile(file, true)
        .then(decodedText => {
            html5QrCode.clear();
            onScanSuccess(decodedText, null);
        })
        .catch(err => {
            document.getElementById('qr-result').innerText = `Error: No se detectó un QR válido en la imagen.`;
            log('Error escaseando QR desde imagen: ' + err, 'error');
            setTimeout(() => {
                closeQrScanner();
                html5QrCode.clear();
            }, 3000);
        });
    
    // Resetear valor para que dispare de nuevo si sube el mismo archivo
    event.target.value = '';
}
"""
    content = content.replace('function onScanFailure', f'{upload_logic}\nfunction onScanFailure')
    
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    patch_index_html()
    patch_app_js()
    with open('activity.log', 'a', encoding='utf-8') as f:
        f.write("[v1.8.1] Added QR Image Upload as a fourth connection option.\\n")
