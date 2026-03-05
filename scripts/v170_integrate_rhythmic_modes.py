import sys
import os

APP_JS_PATH = 'app.js'

def patch_app_js():
    with open(APP_JS_PATH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    out_lines = []
    
    # Flags for ensuring we don't double patch
    added_patterns = False
    added_function = False
    added_buttons = False

    for i, line in enumerate(lines):
        # 1. Add patterns to CMD object
        if 'CH2_HIGH:' in line and not added_patterns:
            out_lines.append(line)
            out_lines.append("  // Rhythmic Patterns (ALL, Modes 4 to 9)\n")
            out_lines.append("  ALL_PAT_1: new Uint8Array([0xE1, 0x31, 0x3B]),\n")
            out_lines.append("  ALL_PAT_2: new Uint8Array([0xE0, 0xB8, 0x2A]),\n")
            out_lines.append("  ALL_PAT_3: new Uint8Array([0xE3, 0x23, 0x18]),\n")
            out_lines.append("  ALL_PAT_4: new Uint8Array([0xE2, 0xAA, 0x09]),\n")
            out_lines.append("  ALL_PAT_5: new Uint8Array([0xED, 0x5D, 0xF1]),\n")
            out_lines.append("  ALL_PAT_6: new Uint8Array([0xEC, 0xD4, 0xE0]),\n")
            added_patterns = True
            continue

        # 2. Add sendDevicePattern function
        if 'function renderIntifaceDeviceList()' in line and not added_function:
            func_block = """
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
    } catch(err) {
        log('Failed pattern: ' + err.message, 'error');
    }
}
"""
            out_lines.append(func_block + "\n")
            out_lines.append(line)
            added_function = True
            continue

        # 3. Add rhythm buttons inside the DOM template
        if '<!-- Dual Control (Optional) -->' in line and not added_buttons:
            # We will grab this and the next 4 lines to insert after them
            # but it is easier to inject right before the closing </div> of the card.
            pass
        if '</svg>' in line and '<!-- Dual Control' not in line: # wait, device card ends at </div>`
            pass

        if '</div>`' in line.replace(' ','') and i > 1200 and not added_buttons and '`' in line:
            # Injecting right before the card ends
            buttons_html = """
            <div style="font-size:14px; color:#aaaab3; padding-left:5px; margin-top:15px;">Rhythmic Modes (Pulse/Wave)</div>
            <div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:5px;">
                <button class="btn-intiface-primary" style="flex:1 1 30%; background:#2d2d3d; font-size:12px; justify-content:center; padding:8px 0;" onclick="sendDevicePattern('${dev.id}', 'ALL_PAT_1')">P1</button>
                <button class="btn-intiface-primary" style="flex:1 1 30%; background:#2d2d3d; font-size:12px; justify-content:center; padding:8px 0;" onclick="sendDevicePattern('${dev.id}', 'ALL_PAT_2')">P2 (Fast)</button>
                <button class="btn-intiface-primary" style="flex:1 1 30%; background:#2d2d3d; font-size:12px; justify-content:center; padding:8px 0;" onclick="sendDevicePattern('${dev.id}', 'ALL_PAT_3')">P3</button>
                <button class="btn-intiface-primary" style="flex:1 1 30%; background:#2d2d3d; font-size:12px; justify-content:center; padding:8px 0;" onclick="sendDevicePattern('${dev.id}', 'ALL_PAT_4')">P4</button>
                <button class="btn-intiface-primary" style="flex:1 1 30%; background:#2d2d3d; font-size:12px; justify-content:center; padding:8px 0;" onclick="sendDevicePattern('${dev.id}', 'ALL_PAT_5')">P5</button>
                <button class="btn-intiface-primary" style="flex:1 1 30%; background:#2d2d3d; font-size:12px; justify-content:center; padding:8px 0;" onclick="sendDevicePattern('${dev.id}', 'ALL_PAT_6')">P6</button>
            </div>
"""
            out_lines.append(buttons_html)
            out_lines.append(line)
            added_buttons = True
            continue

        out_lines.append(line)

    with open(APP_JS_PATH, 'w', encoding='utf-8') as f:
        f.writelines(out_lines)
    
    # Also log execution
    with open('activity.log', 'a', encoding='utf-8') as f:
        f.write("[v1.7.0] Injected rhythm pattern hex codes from docs.buttplug.io into app.js\\n")

if __name__ == '__main__':
    patch_app_js()
