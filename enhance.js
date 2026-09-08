(() => {
  const style = document.createElement('style');
  style.textContent = `
    .probar{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 18px;padding:10px;background:#0b1729;border:1px solid #253b59;border-radius:12px;align-items:center}
    .probar button{border:1px solid #35506f;background:#14243a;color:#fff;padding:9px 12px;border-radius:8px;cursor:pointer;font-weight:700}
    .probar button:hover{background:#1c3b62}.pro-status{margin-left:auto;color:#91a4bf;font-size:12px}
    .pro-modal{position:fixed;inset:0;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;z-index:9999;padding:18px}
    .pro-box{width:min(520px,100%);background:#101c2e;border:1px solid #35506f;border-radius:16px;padding:22px;box-shadow:0 25px 80px #0008}
    .pro-box h3{margin:0 0 16px}.pro-box label{display:block;margin:12px 0 6px;color:#91a4bf;font-size:12px}.pro-box input{width:100%;padding:10px;border-radius:8px;border:1px solid #253b59;background:#091525;color:#fff}
    .pro-box .pro-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.pro-box .danger{background:#7f2530}
  `;
  document.head.appendChild(style);

  const main = document.querySelector('main');
  if (!main) return;
  const bar = document.createElement('div');
  bar.className='probar';
  bar.innerHTML='<button id="proSettings">⚙ Barcode Settings</button><button id="proSave">💾 Save</button><button id="proReset">↺ Reset</button><span class="pro-status" id="proStatus">SANTHOSH Ready</span>';
  main.prepend(bar);

  const status = t => { const e=document.getElementById('proStatus'); if(e) e.textContent=t; };
  const settings = ['value','format','height','lineColor','bgColor','labelText','wmText','wmColor','wmOpacity','wmToggle'];
  const read = () => Object.fromEntries(settings.filter(id=>document.getElementById(id)).map(id=>{const e=document.getElementById(id);return [id,e.type==='checkbox'?e.checked:e.value]}));
  const apply = o => { settings.forEach(id=>{const e=document.getElementById(id);if(!e||o[id]===undefined)return;e.type==='checkbox'?e.checked=!!o[id]:e.value=o[id];}); if(window.generateBarcode)generateBarcode(); if(window.updateWatermark)updateWatermark(); };
  const open = () => {
    const m=document.createElement('div');m.className='pro-modal';m.innerHTML='<div class="pro-box"><h3>⚙ SANTHOSH Barcode Settings</h3><label>Barcode Format</label><select id="proFormat" style="width:100%;padding:10px;border-radius:8px;background:#091525;color:#fff;border:1px solid #253b59"><option>CODE128</option><option>CODE39</option><option>EAN13</option><option>EAN8</option><option>UPC</option><option>ITF14</option><option>MSI</option></select><label>Watermark Text</label><input id="proWm" value="SANTHOSH"><label>Watermark Opacity</label><input id="proOp" type="number" min="0" max="1" step="0.05" value="0.10"><div class="pro-actions"><button id="proClose">Close</button><button id="proApply" style="background:#4f8cff;color:#fff;border:0;padding:10px 14px;border-radius:8px;font-weight:700">Apply</button></div></div>';
    document.body.appendChild(m);
    m.querySelector('#proFormat').value=document.getElementById('format')?.value||'CODE128';m.querySelector('#proWm').value=document.getElementById('wmText')?.value||'SANTHOSH';m.querySelector('#proOp').value=document.getElementById('wmOpacity')?.value||'0.10';
    m.querySelector('#proClose').onclick=()=>m.remove();m.onclick=e=>{if(e.target===m)m.remove()};
    m.querySelector('#proApply').onclick=()=>{const f=document.getElementById('format'),w=document.getElementById('wmText'),o=document.getElementById('wmOpacity');if(f)f.value=m.querySelector('#proFormat').value;if(w)w.value=m.querySelector('#proWm').value;if(o)o.value=m.querySelector('#proOp').value;if(window.generateBarcode)generateBarcode();if(window.updateWatermark)updateWatermark();m.remove();status('Settings applied');};
  };
  document.getElementById('proSettings').onclick=open;
  document.getElementById('proSave').onclick=()=>{localStorage.setItem('santhoshSettings',JSON.stringify(read()));status('Settings saved');};
  document.getElementById('proReset').onclick=()=>{localStorage.removeItem('santhoshSettings');location.reload();};
  const saved=localStorage.getItem('santhoshSettings'); if(saved){try{apply(JSON.parse(saved));status('Saved settings loaded');}catch{}}
})();