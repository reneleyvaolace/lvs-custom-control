import os
import re
import logging
from datetime import datetime

# Logging setup
log_path = os.path.join("c:\\", "Projects", "lvs-custom-control", "activity.log")
logging.basicConfig(filename=log_path, level=logging.INFO, format='%(asctime)s - %(message)s')

def patch_app_js():
    js_path = os.path.join("c:\\", "Projects", "lvs-custom-control", "app.js")
    with open(js_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add new commands to CMD 
    cmd_addition = """  HIGH: new Uint8Array([0xE6, 0x8E, 0x4F]),   // Classic 3 / Alta
  // Channel 1
  CH1_STOP: new Uint8Array([0xD5, 0x96, 0x4C]),
  CH1_LOW: new Uint8Array([0xD4, 0x1F, 0x5D]),
  CH1_MED: new Uint8Array([0xD7, 0x84, 0x6F]),
  CH1_HIGH: new Uint8Array([0xD6, 0x0D, 0x7E]),
  // Channel 2
  CH2_STOP: new Uint8Array([0xA5, 0x11, 0x3F]),
  CH2_LOW: new Uint8Array([0xA4, 0x98, 0x2E]),
  CH2_MED: new Uint8Array([0xA7, 0x03, 0x1C]),
  CH2_HIGH: new Uint8Array([0xA6, 0x8A, 0x0D]),"""
    content = content.replace("  HIGH: new Uint8Array([0xE6, 0x8E, 0x4F]),   // Classic 3 / Alta", cmd_addition)

    # 2. Add functions for dual control modal
    dual_functions = """
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
"""
    if "MODO DUAL (MODAL)" not in content:
        content += dual_functions

    # Register variables to disable them when disconnected
    if "el.btnDual =" not in content:
        content = content.replace("  btnDeepScanMain: $('btnDeepScanMain'),", "  btnDeepScanMain: $('btnDeepScanMain'),\n  btnDual: $('btnDual'),\n  btnDualClose: $('btnDualClose'),")
    
    if "el.btnDual.disabled = true;" not in content:
        content = content.replace("el.btnShake.disabled = true;", "el.btnShake.disabled = true; if(el.btnDual) el.btnDual.disabled = true;")
        
    if "if(el.btnDual) el.btnDual.disabled = false;" not in content:
         # Need to find the place where connect happens: \n    $('dbBtnSweepStart').disabled = false;
         content = content.replace("$('dbBtnSweepStart').disabled = false;", "$('dbBtnSweepStart').disabled = false;\n    if(el.btnDual) el.btnDual.disabled = false;")

    with open(js_path, "w", encoding="utf-8") as f:
        f.write(content)
    logging.info("Patched app.js con nuevos comandos (Canal 1 y Canal 2) y funciones de modal Dual.")

def patch_index_html():
    html_path = os.path.join("c:\\", "Projects", "lvs-custom-control", "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add Dual control button next to Emergency Stop or Speed Row
    dual_btn_html = """
        <button class="btn btn-speed" style="grid-column: span 3; margin-top: 10px; background: var(--pink)" id="btnDual" onclick="openDualModal()" disabled>
          <span>Abrir Control Dual (Canal 1 y 2)</span>
        </button>"""
    if "Abrir Control Dual" not in content:
        # Using string insert after emergency stop
        content = content.replace("</button>\n    </section>", "</button>\n" + dual_btn_html + "\n    </section>")

    # 2. Add Modal
    modal_html = """
    <!-- Dual Control Modal -->
    <div id="dualModal" class="hidden" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;">
      <div class="card" style="width: 100%; max-width: 400px; position: relative; border: 1px solid var(--border);">
        <button id="btnDualClose" onclick="closeDualModal()" style="position: absolute; right: 15px; top: 15px; background: none; border: none; color: white; cursor: pointer; font-size: 20px;">&times;</button>
        <h2 class="section-title" style="margin-bottom: 20px;">Control Dual</h2>
        
        <!-- Canal 1 -->
        <h3 style="color: var(--pink); font-size: 14px; margin-bottom: 10px;">Canal 1</h3>
        <div class="speed-row" style="margin-bottom: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
           <button class="btn ch1-btn" id="b1_low" onclick="selectDualSpeed('CH1_LOW', 'b1_low', 1)">Baja</button>
           <button class="btn ch1-btn" id="b1_med" onclick="selectDualSpeed('CH1_MED', 'b1_med', 1)">Media</button>
           <button class="btn ch1-btn" id="b1_hi" onclick="selectDualSpeed('CH1_HIGH', 'b1_hi', 1)">Alta</button>
           <button class="btn ch1-btn stop-btn" id="b1_stop" onclick="selectDualSpeed('CH1_STOP', 'b1_stop', 1)">Stop</button>
        </div>

        <!-- Canal 2 -->
        <h3 style="color: var(--pink); font-size: 14px; margin-bottom: 10px;">Canal 2</h3>
        <div class="speed-row" style="margin-bottom: 10px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
           <button class="btn ch2-btn" id="b2_low" onclick="selectDualSpeed('CH2_LOW', 'b2_low', 2)">Baja</button>
           <button class="btn ch2-btn" id="b2_med" onclick="selectDualSpeed('CH2_MED', 'b2_med', 2)">Media</button>
           <button class="btn ch2-btn" id="b2_hi" onclick="selectDualSpeed('CH2_HIGH', 'b2_hi', 2)">Alta</button>
           <button class="btn ch2-btn stop-btn" id="b2_stop" onclick="selectDualSpeed('CH2_STOP', 'b2_stop', 2)">Stop</button>
        </div>
      </div>
    </div>
    """
    if 'id="dualModal"' not in content:
        content = content.replace("</main>", modal_html + "\n  </main>")

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(content)
    logging.info("Patched index.html con modal de Control Dual (UI).")

if __name__ == "__main__":
    logging.info("Iniciando script v1.5.0_patch.py para integrar patrones adicionales...")
    try:
        patch_app_js()
        patch_index_html()
        logging.info("Script completado con exito.")
        print("Success")
    except Exception as e:
        logging.error("Fallo durante el patching: " + str(e))
        print("Error: " + str(e))
