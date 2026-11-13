(function () {
  'use strict';
  var R = window.RMI, S = R.load();
  var main = document.getElementById('main'), header = document.getElementById('header'), dlg = document.getElementById('dlg'), dlgForm = document.getElementById('dlg-form');
  var esc = R.esc, rp = R.rp, I = R.icon, today = R.todayKey();
  var view = 'dashboard', unitFilter = 'semua', setoranDate = today, map = null, markers = {}, gpsTimer = null;

  var NAV = [
    ['dashboard', 'Dashboard', 'grid'], ['setoran', 'Setoran', 'wallet'], ['pengingat', 'Pengingat', 'bell'], ['unit', 'Unit & GPS', 'pin'],
    ['driver', 'Driver', 'users'], ['wisata', 'Sewa Wisata', 'route'], ['laporan', 'Laporan Margin', 'chart']
  ];
  var STATUS = {
    driver: { label: 'Disewa driver', color: 'var(--blue)', hex: '#2a64d6', chip: 'chip-blue' },
    wisata: { label: 'Sewa wisata', color: 'var(--red)', hex: '#e0232a', chip: 'chip-bad' },
    tersedia: { label: 'Tersedia', color: 'var(--good)', hex: '#16884a', chip: 'chip-good' },
    servis: { label: 'Servis', color: 'var(--ink-3)', hex: '#7a716b', chip: 'chip-neutral' }
  };
  var AV = ['#e0232a', '#2a64d6', '#16884a', '#b26a00', '#7c3aed', '#0e7490', '#be185d', '#4d7c0f', '#c2410c', '#334155'];

  /* ---------- util ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function initials(n) { return n.split(' ').map(function (x) { return x[0]; }).slice(0, 2).join(''); }
  function avatar(name) { var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return '<div class="avatar" style="background:' + AV[h % AV.length] + '">' + esc(initials(name)) + '</div>'; }
  function toast(msg) { var t = $('#toast'); t.innerHTML = I('check') + '<span>' + esc(msg) + '</span>'; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function greet() { var h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; }
  function statusChip(st) {
    if (st.late >= 3) return '<span class="chip chip-bad">Telat ' + st.late + ' hari</span>';
    if (st.late >= 1) return '<span class="chip chip-warn">Telat ' + st.late + ' hari</span>';
    if (!st.todayPaid) return '<span class="chip chip-neutral">Belum setor</span>';
    return '<span class="chip chip-good">Lunas</span>';
  }
  function head(title, sub, actions) {
    return '<div class="page-head"><div><h1>' + title + '</h1>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div><div class="actions">' + (actions || '') + '</div></div>';
  }
  function activeDrivers() { return S.drivers.filter(function (d) { return d.unitId; }); }
  function lateList() {
    return activeDrivers().map(function (d) { return { d: d, u: R.unit(S, d.unitId), st: R.driverStatus(S, d) }; })
      .filter(function (x) { return x.st.late > 0; }).sort(function (a, b) { return b.st.late - a.st.late; });
  }
  function daySum(k) { var v = 0; S.payments.forEach(function (p) { if (p.date === k) v += p.amount; }); return v; }
  function readImage(file, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'), s = Math.min(1, 360 / img.width);
        c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', 0.6));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  /* ---------- grafik batang ---------- */
  function barChart(data, opts) {
    opts = opts || {};
    var W = opts.w || 640, H = opts.h || 230, L = 50, B = 28, T = 12, max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([1]));
    var step = Math.pow(10, Math.floor(Math.log10(max))), nice = Math.ceil(max / step) * step;
    if (nice / step <= 2) step = step / 2;
    var bw = (W - L - 6) / data.length, out = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label || 'grafik') + '">';
    for (var v = 0; v <= nice + 1; v += step) {
      var y = H - B - (v / nice) * (H - B - T);
      out += '<line x1="' + L + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)" ' + (v ? 'stroke-dasharray="3 4"' : '') + '/>';
      out += '<text x="' + (L - 10) + '" y="' + (y + 4) + '" text-anchor="end">' + (v >= 1e6 ? (v / 1e6).toLocaleString('id-ID') + ' jt' : v >= 1e3 ? (v / 1e3) + ' rb' : v) + '</text>';
    }
    data.forEach(function (d, i) {
      var h = (d.value / nice) * (H - B - T), x = L + 3 + i * bw, w = Math.min(bw * 0.62, 34), bx = x + (bw - w) / 2;
      out += '<rect x="' + bx + '" y="' + (H - B - h) + '" width="' + w + '" height="' + Math.max(h, 0) + '" rx="5" fill="' + (d.hi ? 'var(--red)' : 'color-mix(in srgb, var(--ink) 16%, var(--card))') + '"><title>' + esc(d.label + ': ' + rp(d.value)) + '</title></rect>';
      if (d.hi && h > 0) out += '<text x="' + (bx + w / 2) + '" y="' + (H - B - h - 7) + '" text-anchor="middle" style="fill:var(--ink);font-weight:700">' + (d.value >= 1e6 ? (d.value / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : Math.round(d.value / 1e3) + ' rb') + '</text>';
      if (data.length <= 16 || i % 2 === 0) out += '<text x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle"' + (d.hi ? ' style="fill:var(--ink);font-weight:700"' : '') + '>' + esc(d.short || d.label) + '</text>';
    });
    return '<div class="chart">' + out + '</svg></div>';
  }

  /* ---------- dialog ---------- */
  function openDialog(title, body, foot, onReady) {
    dlgForm.innerHTML = '<div class="dlg-head"><h2>' + title + '</h2><button class="btn btn-ghost btn-sm" value="cancel" aria-label="Tutup">' + I('x') + '</button></div>' +
      '<div class="dlg-body">' + body + '</div><div class="dlg-foot">' + (foot || '<button class="btn" value="cancel">Tutup</button>') + '</div>';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    if (onReady) onReady(dlgForm);
  }
  function closeDialog() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }

  /* ---------- DASHBOARD ---------- */
  function vDashboard() {
    var drivers = activeDrivers(), paid = 0, target = 0, nPaid = 0, nAuto = 0, late = lateList(), lateAmt = 0, rep = R.monthReport(S);
    drivers.forEach(function (d) {
      var u = R.unit(S, d.unitId); target += u.tarif;
      var p = R.paidOn(S, d.id, today); if (p) { paid += p.amount; nPaid++; if (/QRIS|VA/.test(p.method)) nAuto++; }
    });
    late.forEach(function (x) { lateAmt += x.st.lateAmount; });
    var unpaidToday = drivers.length - nPaid;
    var last7 = [], last14 = [];
    for (var i = 13; i >= 0; i--) { var k = R.addDays(today, -i); var v = daySum(k); last14.push({ label: R.tgl(k), short: String(+k.slice(8)), value: v, hi: k === today }); if (i < 7) last7.push(v); }
    var marg = [], acc = 0, mStart = today.slice(0, 8) + '01';
    for (var kk = mStart; kk <= today; kk = R.addDays(kk, 1)) { acc += rep.byDay[kk] || 0; marg.push(acc); }

    var counts = { driver: 0, wisata: 0, tersedia: 0, servis: 0 };
    S.units.forEach(function (u) { counts[u.status]++; });
    var stack = Object.keys(counts).map(function (k) { return counts[k] ? '<i style="flex:' + counts[k] + ';background:' + STATUS[k].color + '"></i>' : ''; }).join('');
    var legend = Object.keys(counts).map(function (k) { return '<span><i style="background:' + STATUS[k].color + '"></i>' + STATUS[k].label + '<b>' + counts[k] + '</b></span>'; }).join('');

    var todays = S.payments.filter(function (p) { return p.date === today; }).sort(function (a, b) { return b.paidAt < a.paidAt ? -1 : 1; });
    var feed = todays.slice(0, 6).map(function (p) {
      var d = R.driver(S, p.driverId), u = R.unit(S, p.unitId);
      return '<div class="row">' + avatar(d.name) + '<div class="grow"><div class="name">' + esc(d.name) + '</div><div class="meta">' + R.plate(u.plat) + ' ' + esc(u.short) + '</div></div>' +
        '<div style="text-align:right"><div class="num" style="font-weight:700">' + rp(p.amount) + '</div><div class="small muted">' + esc(p.method) + ' · ' + R.jam(p.paidAt) + (p.fresh ? ' · <b style="color:var(--good)">baru</b>' : '') + '</div></div></div>';
    }).join('') || '<div class="empty">Belum ada setoran hari ini.</div>';

    var lateRows = late.map(function (x) {
      var l = Math.min(x.st.late, 3);
      return '<div class="row late-row l' + l + '"><div class="days num">' + x.st.late + '<small>hari</small></div><div class="grow"><div class="name">' + esc(x.d.name) + '</div><div class="meta">' + R.plate(x.u.plat) + ' ' + esc(x.u.short) + '</div></div>' +
        '<div style="text-align:right"><div class="num" style="font-weight:700">' + rp(x.st.lateAmount) + '</div><button class="btn btn-sm' + (l >= 3 ? ' btn-red' : '') + '" style="margin-top:6px" data-remind="' + x.d.id + '">' + I('send', 14) + (l >= 3 ? 'Kirim peringatan' : 'Ingatkan') + '</button></div></div>';
    }).join('');

    var wis = S.wisata.filter(function (w) { return w.start <= today && w.end >= today; }).map(function (w) {
      var u = R.unit(S, w.unitId);
      return '<div class="row"><span class="carpic">' + R.carSvg(u.kind, 'var(--red)') + '</span><div class="grow"><div class="name">' + esc(u.short) + ' ' + R.plate(u.plat) + '</div><div class="meta">' + esc(w.tamu) + ' · s/d ' + R.tgl(w.end) + '</div></div></div>';
    }).join('');

    var pct = target ? paid / target : 0;
    return head(greet() + ', Pak', R.tglPanjang(today) + ' · ' + drivers.length + ' driver aktif, 19 unit terpantau GPS') +
      '<div class="cluster">' +
      '<div class="instrument"><div class="gauge-wrap">' + R.gauge(pct) + '<div class="gauge-num"><b class="num">' + Math.round(pct * 100) + '%</b><span>terkumpul</span></div></div>' +
      '<div><div class="label">Setoran masuk hari ini</div><div class="big">' + rp(paid) + '</div><div class="of">dari target ' + rp(target) + '</div>' +
      '<div class="split"><div><b class="num">' + nPaid + '/' + drivers.length + '</b><span>driver sudah setor</span></div><div><b class="num">' + nAuto + '</b><span>otomatis via QRIS/VA</span></div><div><b class="num" style="color:#ff6b70">' + unpaidToday + '</b><span>belum setor</span></div></div></div></div>' +
      '<div class="side-kpis">' +
      '<div class="card kpi' + (late.length ? ' alert' : '') + '"><div class="top"><span class="label">Tunggakan</span><span class="ic-wrap">' + I('alert') + '</span></div><div class="v">' + rp(lateAmt) + '</div><div class="s">' + late.length + ' driver telat bayar · <a href="#" data-go="pengingat">kirim pengingat</a></div>' +
      (late.length ? '<div class="av-group">' + late.map(function (x) { return avatar(x.d.name).replace('class="avatar"', 'class="avatar" title="' + esc(x.d.name + ' · telat ' + x.st.late + ' hari') + '"'); }).join('') + '<span class="small muted">terlama: ' + esc(late[0].d.name.split(' ')[0]) + ', ' + late[0].st.late + ' hari</span></div>' : '') + '</div>' +
      '<div class="card kpi good"><div class="top"><span class="label">Margin bulan ini</span><span class="ic-wrap">' + I('chart') + '</span></div><div class="v" style="color:var(--good)">' + rp(rep.margin) + '</div><div class="s">Pendapatan ' + rp(rep.revenue) + ' − biaya ' + rp(rep.cost) + '</div>' + R.spark(marg, '#16884a') + '</div>' +
      '</div></div>' +
      '<div class="grid two">' +
      '<div class="card"><div class="card-h"><h2>Perlu ditindak</h2><span class="chip ' + (late.length ? 'chip-bad' : 'chip-good') + '">' + late.length + ' driver telat</span></div><div class="list">' + (lateRows || '<div class="empty">' + I('check', 28) + 'Semua driver lancar bayar.</div>') + '</div>' +
      '<div class="info-box" style="margin-top:6px">' + I('bell') + '<span>Pengingat otomatis terkirim pukul <b>' + S.settings.jam.h0 + '</b> ke driver yang belum setor. Telat 3 hari → peringatan ke driver dan notifikasi ke Anda.</span></div></div>' +
      '<div class="card"><div class="card-h"><h2>Status armada</h2><button class="btn btn-sm" data-go="unit">' + I('pin', 14) + 'Peta</button></div><div class="stack">' + stack + '</div><div class="legend">' + legend + '</div>' +
      '<div class="label" style="margin:18px 0 4px">Sedang sewa wisata</div><div class="list">' + (wis || '<div class="empty">Tidak ada.</div>') + '</div></div>' +
      '</div>' +
      '<div class="grid two" style="margin-top:16px">' +
      '<div class="card"><div class="card-h"><h2>Setoran 14 hari terakhir</h2><span class="small muted">rata-rata ' + rp(last7.reduce(function (a, b) { return a + b; }, 0) / 7) + '/hari</span></div>' + barChart(last14, { label: 'Setoran 14 hari terakhir' }) + '</div>' +
      '<div class="card"><div class="card-h"><h2>Masuk hari ini</h2><button class="btn btn-sm btn-ghost" data-go="setoran">Semua ' + I('arrow', 14) + '</button></div><div class="list">' + feed + '</div></div>' +
      '</div>';
  }

  /* ---------- SETORAN ---------- */
  function vSetoran() {
    var rows = '', got = 0, miss = 0, nMiss = 0, nGot = 0;
    S.drivers.forEach(function (d) {
      if (d.joined > setoranDate) return;
      var u = R.unit(S, d.unitId); if (!u) return;
      var p = R.paidOn(S, d.id, setoranDate), st;
      if (p) { got += p.amount; nGot++; st = '<span class="chip chip-good">Lunas</span>'; }
      else {
        miss += u.tarif; nMiss++;
        st = R.daysBetween(setoranDate, today) > 0 ? '<span class="chip chip-bad">Belum dibayar</span>' : '<span class="chip chip-neutral">Belum setor</span>';
      }
      rows += '<tr class="' + (p && p.fresh ? 'fresh' : '') + '"><td><div class="who">' + avatar(d.name) + '<div><b>' + esc(d.name) + '</b><span class="small muted">' + esc(d.phone) + '</span></div></div></td><td>' + R.plate(u.plat) + '<div class="small muted" style="margin-top:3px">' + esc(u.short) + '</div></td>' +
        '<td class="r num"><b>' + rp(u.tarif) + '</b></td><td>' + st + '</td><td>' + (p ? esc(p.method) : '<span class="muted">–</span>') + '</td><td class="num">' + (p ? R.jam(p.paidAt) : '<span class="muted">–</span>') + '</td>' +
        '<td class="r">' + (p ? '' : '<button class="btn btn-sm" data-manual="' + d.id + '">' + I('plus', 14) + 'Catat manual</button>') + '</td></tr>';
    });
    var pct = got + miss ? got / (got + miss) : 0;
    return head('Setoran harian', 'Pembayaran QRIS & Virtual Account tercatat otomatis. Tunai atau transfer biasa cukup dicatat sekali klik.') +
      '<div class="toolbar"><div class="seg"><button id="prev-day" aria-label="Hari sebelumnya">' + I('back', 16) + '</button><button aria-pressed="true" style="min-width:190px">' + R.tglPanjang(setoranDate) + '</button><button id="next-day" aria-label="Hari berikutnya"' + (setoranDate >= today ? ' disabled' : '') + '>' + I('arrow', 16) + '</button></div>' +
      (setoranDate !== today ? '<button class="btn btn-sm btn-ghost" id="to-today">Kembali ke hari ini</button>' : '') + '</div>' +
      '<div class="grid kpis" style="margin-bottom:16px"><div class="card kpi good"><div class="top"><span class="label">Sudah masuk</span><span class="ic-wrap">' + I('check') + '</span></div><div class="v">' + rp(got) + '</div><div class="s">' + nGot + ' driver</div><div class="bar-mini"><i style="width:' + Math.round(pct * 100) + '%;background:var(--good)"></i></div></div>' +
      '<div class="card kpi' + (nMiss && setoranDate < today ? ' alert' : '') + '"><div class="top"><span class="label">Belum masuk</span><span class="ic-wrap">' + I('wallet') + '</span></div><div class="v">' + rp(miss) + '</div><div class="s">' + nMiss + ' driver</div></div></div>' +
      '<div class="card"><div class="table-wrap"><table><thead><tr><th>Driver</th><th>Unit</th><th class="r">Setoran</th><th>Status</th><th>Metode</th><th>Jam</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  function manualDialog(id) {
    var d = R.driver(S, id), u = R.unit(S, d.unitId), bukti = null;
    openDialog('Catat setoran manual',
      '<div class="row" style="padding:0">' + avatar(d.name) + '<div class="grow"><div class="name">' + esc(d.name) + '</div><div class="meta">' + R.plate(u.plat) + ' ' + esc(u.short) + ' · ' + R.tglPanjang(setoranDate) + '</div></div><b class="num" style="font-size:18px">' + rp(u.tarif) + '</b></div>' +
      '<div class="field"><label for="m-method">Metode</label><select id="m-method"><option>Tunai</option><option>Transfer</option></select></div>' +
      '<label class="upload" for="m-bukti"><span class="thumb" id="m-prev">' + I('camera', 20) + '</span><span><b>Foto bukti</b> (opsional)<br><span class="small muted">Struk atau screenshot transfer</span></span><input type="file" id="m-bukti" accept="image/*"></label>',
      '<button class="btn" value="cancel">Batal</button><button class="btn btn-red" type="button" id="m-save">Simpan setoran</button>',
      function (f) {
        $('#m-bukti', f).onchange = function (e) { if (e.target.files[0]) readImage(e.target.files[0], function (src) { bukti = src; $('#m-prev', f).innerHTML = '<img src="' + src + '" alt="Bukti">'; }); };
        $('#m-save', f).onclick = function () {
          S.payments.push({ id: 'p' + Date.now(), driverId: d.id, unitId: u.id, date: setoranDate, amount: u.tarif, method: $('#m-method', f).value,
            paidAt: today + 'T' + new Date().toTimeString().slice(0, 5), fresh: true, bukti: !!bukti });
          R.save(S); closeDialog(); toast('Setoran ' + d.name.split(' ')[0] + ' tercatat'); render();
        };
      });
  }

  /* ---------- PENGINGAT ---------- */
  function remindDialog(id) {
    var d = R.driver(S, id), u = R.unit(S, d.unitId), st = R.driverStatus(S, d);
    var lvl = st.level || 'h0', msg = R.fillTpl(S.settings.tpl[lvl], d, u, st);
    openDialog(lvl === 'h3' ? 'Kirim peringatan' : 'Kirim pengingat',
      '<div class="row" style="padding:0">' + avatar(d.name) + '<div class="grow"><div class="name">' + esc(d.name) + '</div><div class="meta">' + esc(d.phone) + '</div></div>' + statusChip(st) + '</div>' +
      '<div class="wa-wrap"><div class="wa-bubble">' + esc(msg) + '<time>' + new Date().toTimeString().slice(0, 5) + '</time></div></div>',
      '<button class="btn" value="cancel">Batal</button><a class="btn" id="r-wa" target="_blank" rel="noopener" href="' + R.waLink(msg) + '">' + I('whatsapp', 16) + 'Buka WhatsApp</a><button class="btn btn-red" type="button" id="r-done">' + I('send', 16) + 'Kirim sekarang</button>',
      function (f) {
        var log = function () { S.reminders.unshift({ driverId: d.id, at: new Date().toISOString(), level: lvl, msg: msg }); R.save(S); };
        $('#r-wa', f).onclick = function () { log(); setTimeout(function () { closeDialog(); render(); }, 300); };
        $('#r-done', f).onclick = function () { log(); closeDialog(); toast('Pesan terkirim ke ' + d.name.split(' ')[0]); render(); };
      });
  }

  function vPengingat() {
    var levels = [
      { k: 'h0', t: 'Hari H', d: 'Ke driver yang belum setor hari ini', c: 'var(--ink-2)', bg: 'var(--bg)', tag: 'H' },
      { k: 'h1', t: 'Telat 1–2 hari', d: 'Pengingat berisi total tunggakan', c: 'var(--warn)', bg: 'var(--warn-soft)', tag: '+1' },
      { k: 'h3', t: 'Telat 3 hari atau lebih', d: 'Peringatan ke driver + notifikasi ke admin', c: 'var(--bad)', bg: 'var(--bad-soft)', tag: '+3' }
    ];
    var rules = levels.map(function (l) {
      return '<div class="row" style="align-items:flex-start;flex-wrap:wrap;padding:16px 0"><div class="avatar" style="background:' + l.bg + ';color:' + l.c + ';font-family:var(--display);font-size:16px">' + l.tag + '</div>' +
        '<div class="grow" style="min-width:220px"><div class="name">' + l.t + '</div><div class="small muted">' + l.d + '</div>' +
        '<div class="field" style="margin-top:10px"><label for="tpl-' + l.k + '">Isi pesan</label><textarea id="tpl-' + l.k + '" data-tpl="' + l.k + '">' + esc(S.settings.tpl[l.k]) + '</textarea></div></div>' +
        '<div class="field" style="width:120px"><label for="jam-' + l.k + '">Jam kirim</label><input type="time" id="jam-' + l.k + '" data-jam="' + l.k + '" value="' + S.settings.jam[l.k] + '"></div></div>';
    }).join('');

    var queue = activeDrivers().map(function (d) { return { d: d, u: R.unit(S, d.unitId), st: R.driverStatus(S, d) }; })
      .filter(function (x) { return x.st.level; }).sort(function (a, b) { return b.st.late - a.st.late; });
    var nowDay = new Date().toISOString().slice(0, 10);
    var qRows = queue.map(function (x) {
      var sent = S.reminders.filter(function (r) { return r.driverId === x.d.id && r.at.slice(0, 10) === nowDay; }).length;
      return '<div class="row">' + avatar(x.d.name) + '<div class="grow"><div class="name">' + esc(x.d.name) + '</div><div class="meta">' + R.plate(x.u.plat) + ' ' + rp(x.st.late ? x.st.lateAmount : x.u.tarif) + '</div></div>' +
        statusChip(x.st) + (sent ? '<span class="chip chip-good">Terkirim</span>' : '<button class="btn btn-sm" data-remind="' + x.d.id + '">' + I('send', 14) + 'Kirim</button>') + '</div>';
    }).join('');

    var logRows = S.reminders.slice(0, 8).map(function (r) {
      var d = R.driver(S, r.driverId);
      return '<div class="row" style="align-items:flex-start"><span class="ic-wrap" style="color:var(--good)">' + I('check') + '</span><div class="grow"><div class="name">' + esc(d ? d.name : '-') + ' <span class="small muted num">· ' + new Date(r.at).toTimeString().slice(0, 5) + '</span></div><div class="small muted" style="white-space:normal">' + esc(r.msg) + '</div></div></div>';
    }).join('');

    return head('Pengingat otomatis', 'Atur sekali, sistem mengingatkan driver setiap hari lewat WhatsApp.') +
      '<div class="grid two"><div class="card"><div class="card-h"><h2>Aturan pengingat</h2><span class="chip chip-good">Aktif</span></div><div class="list">' + rules + '</div>' +
      '<div class="info-box">' + I('shield') + '<span>Kata dalam kurung kurawal terisi otomatis: <b>{nama}</b>, <b>{unit}</b>, <b>{jumlah}</b>, <b>{hari}</b>.</span></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:16px;min-width:0"><div class="card"><div class="card-h"><h2>Antrean hari ini</h2><span class="small muted">' + queue.length + ' driver</span></div><div class="list">' + (qRows || '<div class="empty">' + I('check', 28) + 'Semua sudah setor.</div>') + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Terkirim hari ini</h2></div><div class="list">' + (logRows || '<div class="empty">Belum ada pesan terkirim hari ini.</div>') + '</div></div></div></div>';
  }

  /* ---------- UNIT ---------- */
  function vUnit() {
    var list = S.units.filter(function (u) { return unitFilter === 'semua' || u.status === unitFilter; });
    var seg = [['semua', 'Semua'], ['driver', 'Driver'], ['wisata', 'Wisata'], ['tersedia', 'Tersedia'], ['servis', 'Servis']].map(function (s) {
      var n = s[0] === 'semua' ? S.units.length : S.units.filter(function (u) { return u.status === s[0]; }).length;
      return '<button data-filter="' + s[0] + '" aria-pressed="' + (unitFilter === s[0]) + '">' + s[1] + '<span>' + n + '</span></button>';
    }).join('');
    var rows = list.map(function (u) {
      var d = u.driverId ? R.driver(S, u.driverId) : null, w = S.wisata.filter(function (x) { return x.unitId === u.id && x.start <= today && x.end >= today; })[0];
      var mins = Math.max(0, Math.round((Date.now() - new Date(u.gpsAt)) / 60000));
      return '<tr data-unit="' + u.id + '" style="cursor:pointer"><td><div class="who"><span class="carpic">' + R.carSvg(u.kind, STATUS[u.status].color) + '</span><div><b>' + esc(u.short) + '</b>' + R.plate(u.plat) + '</div></div></td>' +
        '<td class="r num"><b>' + rp(u.tarif) + '</b></td><td><span class="chip ' + STATUS[u.status].chip + '">' + STATUS[u.status].label + '</span></td>' +
        '<td>' + (d ? esc(d.name) : w ? esc(w.tamu) : '<span class="muted">–</span>') + '</td><td class="small muted num hide-sm">' + I('signal', 14).replace('class="ic"', 'class="ic" style="display:inline;vertical-align:-2px;color:var(--good)"') + ' ' + (mins < 1 ? 'baru saja' : mins + ' mnt lalu') + '</td></tr>';
    }).join('');
    return head('Unit &amp; GPS', 'Posisi real-time dari GPS tracker di setiap unit.') +
      '<div class="toolbar"><div class="seg" role="group" aria-label="Filter status">' + seg + '</div></div>' +
      '<div class="card map-card"><div id="map" aria-label="Peta posisi unit"></div><div class="map-foot" id="far"></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="table-wrap"><table><thead><tr><th>Unit</th><th class="r">Tarif/hari</th><th>Status</th><th>Pemakai</th><th class="hide-sm">Sinyal GPS</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  function initMap() {
    if (!window.L || !$('#map')) return;
    if (map) { map.remove(); map = null; }
    map = L.map('map', { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd', attribution: '&copy; OpenStreetMap &copy; CARTO' }).addTo(map);
    markers = {};
    var near = [], far = [];
    S.units.forEach(function (u) {
      if (unitFilter !== 'semua' && u.status !== unitFilter) return;
      var icon = L.divIcon({ className: '', html: '<div class="pin" style="background:' + STATUS[u.status].hex + '"><span>' + esc(u.short.slice(0, 2).toUpperCase()) + '</span></div>', iconSize: [34, 34], iconAnchor: [17, 34] });
      var m = L.marker([u.lat, u.lng], { icon: icon }).addTo(map).on('click', function () { unitDialog(u.id); });
      m.bindTooltip(u.short + ' · ' + u.plat, { direction: 'top', offset: [0, -30] });
      markers[u.id] = m;
      (Math.abs(u.lat + 7.2575) < 0.3 && Math.abs(u.lng - 112.7521) < 0.3 ? near : far).push(u);
    });
    if (near.length) map.fitBounds(near.map(function (u) { return [u.lat, u.lng]; }), { padding: [40, 40], maxZoom: 13 });
    else if (far.length) map.fitBounds(far.map(function (u) { return [u.lat, u.lng]; }), { padding: [40, 40], maxZoom: 12 });
    else map.setView([-7.2575, 112.7521], 12);
    $('#far').innerHTML = '<span class="small muted" style="display:flex;gap:14px;flex-wrap:wrap;margin-right:auto">' + Object.keys(STATUS).map(function (k) { return '<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:10px;height:10px;border-radius:50%;background:' + STATUS[k].hex + ';display:inline-block"></i>' + STATUS[k].label + '</span>'; }).join('') + '</span>' +
      far.map(function (u) { return '<button class="btn btn-sm" data-fly="' + u.id + '">' + I('pin', 14) + esc(u.short) + ' · di luar Surabaya</button>'; }).join('') +
      (far.length && near.length ? '<button class="btn btn-sm btn-ghost" data-fly="home">Surabaya</button>' : '');
    clearInterval(gpsTimer);
    gpsTimer = setInterval(function () {
      if (view !== 'unit') return clearInterval(gpsTimer);
      S.units.forEach(function (u) {
        if (u.status !== 'driver' && u.status !== 'wisata') return;
        u.lat += (Math.random() - 0.5) * 0.002; u.lng += (Math.random() - 0.5) * 0.002; u.gpsAt = new Date().toISOString();
        if (markers[u.id]) markers[u.id].setLatLng([u.lat, u.lng]);
      });
    }, 4000);
  }

  function unitDialog(id) {
    var u = R.unit(S, id), d = u.driverId ? R.driver(S, u.driverId) : null, rep = R.monthReport(S), ur = rep.byUnit[u.id];
    var h = u.handovers[0];
    var photos = h ? h.photos.map(function (p) { return '<figure>' + (p.src ? '<img src="' + p.src + '" alt="' + esc(p.label) + '">' : '<span class="muted small">–</span>') + '<figcaption>' + esc(p.label) + '</figcaption></figure>'; }).join('')
      : ['Depan', 'Belakang', 'Kiri', 'Kanan', 'Odometer', 'BBM'].map(function (l) { return '<figure><span class="carpic" style="opacity:.3">' + R.carSvg(u.kind) + '</span><figcaption>' + l + '</figcaption></figure>'; }).join('');
    openDialog(esc(u.short) + ' ' + R.plate(u.plat),
      '<div style="display:flex;align-items:center;gap:16px"><span class="carpic" style="width:140px;height:62px">' + R.carSvg(u.kind, STATUS[u.status].color) + '</span><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip ' + STATUS[u.status].chip + '">' + STATUS[u.status].label + '</span><span class="chip chip-neutral">' + rp(u.tarif) + '/hari</span></div></div>' +
      '<div class="kv"><div><div class="label">Pemakai</div><b>' + (d ? esc(d.name) : '–') + '</b>' + (d ? '<div class="small muted">' + esc(d.phone) + '</div>' : '') + '</div>' +
      '<div><div class="label">Posisi GPS</div><div class="num small">' + u.lat.toFixed(5) + ', ' + u.lng.toFixed(5) + '</div><a class="small" target="_blank" rel="noopener" href="https://maps.google.com/?q=' + u.lat + ',' + u.lng + '">Buka di Google Maps</a></div>' +
      '<div><div class="label">Pendapatan bulan ini</div><b class="num">' + rp(ur.rev) + '</b></div><div><div class="label">Biaya bulan ini</div><span class="num">' + rp(ur.cost) + '</span></div></div>' +
      '<div><div class="label" style="margin-bottom:8px">Serah terima terakhir' + (h ? ' · ' + esc(h.type) + ' ' + esc(h.at) + ' · KM ' + esc(h.km) + ' · BBM ' + esc(h.bbm) : '') + '</div><div class="photos">' + photos + '</div>' +
      (h ? '' : '<p class="small muted" style="margin:8px 0 0">Foto kondisi unit akan muncul di sini setelah driver melakukan serah terima dari aplikasi.</p>') + '</div>');
  }

  /* ---------- DRIVER ---------- */
  function vDriver() {
    var rep = {};
    S.payments.forEach(function (p) { if (p.date.slice(0, 7) === today.slice(0, 7)) rep[p.driverId] = (rep[p.driverId] || 0) + p.amount; });
    var rows = activeDrivers().map(function (d) {
      var u = R.unit(S, d.unitId), st = R.driverStatus(S, d), isNew = R.daysBetween(d.joined, today) <= 7;
      return '<tr><td><div class="who">' + avatar(d.name) + '<div><b>' + esc(d.name) + (isNew ? ' <span class="chip chip-blue" style="margin-left:4px">Baru</span>' : '') + '</b><span class="small muted">' + esc(d.phone) + '</span></div></div></td>' +
        '<td>' + R.plate(u.plat) + '<div class="small muted" style="margin-top:3px">' + esc(u.short) + '</div></td><td class="r num">' + rp(u.tarif) + '</td><td class="r num"><b>' + rp(rep[d.id] || 0) + '</b></td><td>' + statusChip(st) + '</td>' +
        '<td class="small hide-sm">' + (d.ktp ? '<span class="chip chip-good">KTP</span> ' : '<span class="chip chip-neutral">KTP</span> ') + (d.sim ? '<span class="chip chip-good">SIM</span>' : '<span class="chip chip-neutral">SIM</span>') + '</td></tr>';
    }).join('');
    return head('Driver', activeDrivers().length + ' driver aktif memegang unit', '<button class="btn btn-red" id="add-driver">' + I('plus', 16) + 'Tambah driver</button>') +
      '<div class="card"><div class="table-wrap"><table><thead><tr><th>Driver</th><th>Unit</th><th class="r">Setoran/hari</th><th class="r">Bulan ini</th><th>Status</th><th class="hide-sm">Dokumen</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  function addDriverDialog() {
    var free = S.units.filter(function (u) { return u.status === 'tersedia'; });
    var opts = free.map(function (u) { return '<option value="' + u.id + '">' + esc(u.short + ' · ' + u.plat + ' · ' + rp(u.tarif) + '/hari') + '</option>'; }).join('');
    var docs = { ktp: null, sim: null };
    openDialog('Tambah driver baru',
      '<div class="form-grid"><div class="field"><label for="n-name">Nama lengkap</label><input id="n-name" autocomplete="off" placeholder="mis. Slamet Riyadi"></div>' +
      '<div class="field"><label for="n-phone">No. WhatsApp</label><input id="n-phone" inputmode="tel" placeholder="08xx-xxxx-xxxx"></div>' +
      '<label class="upload" for="n-ktp"><span class="thumb" id="p-ktp">' + I('user', 20) + '</span><span><b>Foto KTP</b><br><span class="small muted">Kamera atau galeri</span></span><input type="file" id="n-ktp" accept="image/*" capture="environment"></label>' +
      '<label class="upload" for="n-sim"><span class="thumb" id="p-sim">' + I('car', 20) + '</span><span><b>Foto SIM</b><br><span class="small muted">Kamera atau galeri</span></span><input type="file" id="n-sim" accept="image/*" capture="environment"></label>' +
      '<div class="field full"><label for="n-unit">Unit yang dipegang</label><select id="n-unit">' + (opts || '<option value="">Tidak ada unit tersedia</option>') + '</select></div></div>' +
      '<div class="info-box" id="n-sum"></div><p class="small" id="n-err" style="color:var(--bad);margin:0" hidden></p>',
      '<button class="btn" value="cancel">Batal</button><button class="btn btn-red" type="button" id="n-save">Simpan driver</button>',
      function (f) {
        var sum = function () { var u = R.unit(S, $('#n-unit', f).value); $('#n-sum', f).innerHTML = I('wallet') + '<span>' + (u ? 'Setoran harian otomatis <b class="num">' + rp(u.tarif) + '</b>. Driver langsung bisa masuk aplikasi dengan nomor WhatsApp-nya.' : 'Tidak ada unit tersedia.') + '</span>'; };
        $('#n-unit', f).onchange = sum; sum();
        ['ktp', 'sim'].forEach(function (k) {
          $('#n-' + k, f).onchange = function (e) { if (e.target.files[0]) readImage(e.target.files[0], function (src) { docs[k] = src; $('#p-' + k, f).innerHTML = '<img src="' + src + '" alt="' + k.toUpperCase() + '">'; }); };
        });
        $('#n-save', f).onclick = function () {
          var name = $('#n-name', f).value.trim(), phone = $('#n-phone', f).value.trim(), uid = $('#n-unit', f).value, err = $('#n-err', f);
          if (!name || !phone || !uid) { err.hidden = false; err.textContent = 'Isi nama, nomor WhatsApp, dan pilih unit.'; return; }
          var id = 'd' + (S.drivers.length + 1) + '-' + Date.now().toString(36);
          S.drivers.push({ id: id, name: name, phone: phone, unitId: uid, joined: today, ktp: !!docs.ktp, sim: !!docs.sim });
          var u = R.unit(S, uid); u.status = 'driver'; u.driverId = id;
          R.save(S); closeDialog(); toast(name + ' ditambahkan · setoran ' + rp(u.tarif) + '/hari'); render();
        };
      });
  }

  /* ---------- SEWA WISATA ---------- */
  function vWisata() {
    var total = 0;
    var rows = S.wisata.slice().sort(function (a, b) { return a.start < b.start ? 1 : -1; }).map(function (w) {
      var u = R.unit(S, w.unitId), n = R.wisataDays(w); total += w.perHari * n;
      var st = w.end < today ? '<span class="chip chip-neutral">Selesai</span>' : w.start > today ? '<span class="chip chip-blue">Akan datang</span>' : '<span class="chip chip-bad">Berjalan</span>';
      return '<tr><td><div class="who"><span class="carpic">' + R.carSvg(u.kind, 'var(--red)') + '</span><div><b>' + esc(u.short) + '</b>' + R.plate(u.plat) + '</div></div></td><td>' + esc(w.tamu) + '</td><td class="num">' + R.tgl(w.start) + ' – ' + R.tgl(w.end) + '<div class="small muted">' + n + ' hari</div></td>' +
        '<td>' + esc(w.mode) + '</td><td class="r num">' + rp(w.perHari) + '</td><td class="r num"><b>' + rp(w.perHari * n) + '</b></td><td>' + st + '</td></tr>';
    }).join('');
    return head('Sewa wisata', 'Hiace & Innova untuk tamu wisata, lepas kunci atau dengan driver.', '<button class="btn btn-red" id="add-wisata">' + I('plus', 16) + 'Catat sewa</button>') +
      '<div class="card"><div class="table-wrap"><table><thead><tr><th>Unit</th><th>Tamu</th><th>Tanggal</th><th>Jenis</th><th class="r">Per hari</th><th class="r">Total</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  function addWisataDialog() {
    var cand = S.units.filter(function (u) { return u.status === 'tersedia' || u.kind === 'van' || u.short === 'Innova Reborn'; });
    var opts = cand.map(function (u) { return '<option value="' + u.id + '">' + esc(u.short + ' · ' + u.plat + (u.status !== 'tersedia' ? ' (sedang ' + STATUS[u.status].label.toLowerCase() + ')' : '')) + '</option>'; }).join('');
    openDialog('Catat sewa wisata',
      '<div class="form-grid"><div class="field full"><label for="w-unit">Unit</label><select id="w-unit">' + opts + '</select></div>' +
      '<div class="field full"><label for="w-tamu">Nama tamu / rombongan</label><input id="w-tamu" placeholder="mis. Rombongan dari Singapura (8 orang)"></div>' +
      '<div class="field"><label for="w-start">Mulai</label><input type="date" id="w-start" value="' + R.addDays(today, 1) + '"></div>' +
      '<div class="field"><label for="w-end">Selesai</label><input type="date" id="w-end" value="' + R.addDays(today, 2) + '"></div>' +
      '<div class="field"><label for="w-mode">Jenis</label><select id="w-mode"><option>Lepas kunci</option><option>Dengan driver</option></select></div>' +
      '<div class="field"><label for="w-price">Harga per hari (Rp)</label><input id="w-price" inputmode="numeric"></div></div>' +
      '<div class="info-box" id="w-sum"></div>',
      '<button class="btn" value="cancel">Batal</button><button class="btn btn-red" type="button" id="w-save">Simpan</button>',
      function (f) {
        var setPrice = function () { var u = R.unit(S, $('#w-unit', f).value); if ($('#w-mode', f).value === 'Lepas kunci' || !$('#w-price', f).dataset.touched) $('#w-price', f).value = u.tarif; sum(); };
        var sum = function () {
          var s = $('#w-start', f).value, e = $('#w-end', f).value, p = +String($('#w-price', f).value).replace(/\D/g, '');
          var n = s && e && e >= s ? R.daysBetween(s, e) + 1 : 0;
          $('#w-sum', f).innerHTML = I('wallet') + '<span>' + (n ? n + ' hari × ' + rp(p) + ' = <b class="num">' + rp(n * p) + '</b>' + ($('#w-mode', f).value === 'Dengan driver' ? ' · isi harga hasil negosiasi' : '') : 'Tanggal selesai harus setelah tanggal mulai.') + '</span>';
        };
        $('#w-unit', f).onchange = setPrice; $('#w-mode', f).onchange = setPrice;
        $('#w-price', f).oninput = function () { this.dataset.touched = '1'; sum(); };
        $('#w-start', f).onchange = sum; $('#w-end', f).onchange = sum; setPrice();
        $('#w-save', f).onclick = function () {
          var s = $('#w-start', f).value, e = $('#w-end', f).value, p = +String($('#w-price', f).value).replace(/\D/g, ''), t = $('#w-tamu', f).value.trim() || 'Tamu wisata';
          if (!s || !e || e < s || !p) { toast('Periksa tanggal dan harga'); return; }
          var w = { id: 'w' + Date.now(), unitId: $('#w-unit', f).value, tamu: t, start: s, end: e, mode: $('#w-mode', f).value, perHari: p };
          S.wisata.push(w);
          if (s <= today && e >= today) { var u = R.unit(S, w.unitId); if (u.status === 'tersedia') u.status = 'wisata'; }
          R.save(S); closeDialog(); toast('Sewa wisata tercatat'); render();
        };
      });
  }

  /* ---------- LAPORAN ---------- */
  function vLaporan() {
    var rep = R.monthReport(S), mStart = today.slice(0, 8) + '01', days = [], marg = [], acc = 0;
    for (var k = mStart; k <= today; k = R.addDays(k, 1)) { days.push({ label: R.tgl(k), short: String(+k.slice(8)), value: rep.byDay[k] || 0, hi: k === today }); acc += rep.byDay[k] || 0; marg.push(acc); }
    var src = [['Setoran driver', rep.setoran, 'var(--blue)'], ['Sewa wisata', rep.wisata, 'var(--red)'], ['Open trip tour', rep.tour, 'var(--warn)']];
    var srcHtml = '<div class="stack" style="height:14px">' + src.map(function (s) { return s[1] ? '<i style="flex:' + s[1] + ';background:' + s[2] + '"></i>' : ''; }).join('') + '</div>' + src.map(function (s) {
      return '<div class="row"><i style="width:10px;height:10px;border-radius:3px;background:' + s[2] + '"></i><div class="grow">' + s[0] + '</div><span class="small muted num">' + (rep.revenue ? Math.round(s[1] / rep.revenue * 100) : 0) + '%</span><b class="num" style="min-width:120px;text-align:right">' + rp(s[1]) + '</b></div>';
    }).join('');
    var maxCat = Math.max.apply(null, Object.keys(rep.byCat).map(function (c) { return rep.byCat[c]; }).concat([1]));
    var cats = Object.keys(rep.byCat).sort(function (a, b) { return rep.byCat[b] - rep.byCat[a]; }).map(function (c) {
      return '<div class="row" style="display:block"><div style="display:flex;justify-content:space-between"><span>' + esc(c) + '</span><b class="num">' + rp(rep.byCat[c]) + '</b></div><div class="bar-mini"><i style="width:' + (rep.byCat[c] / maxCat * 100) + '%;background:var(--ink-2)"></i></div></div>';
    }).join('');
    var units = S.units.map(function (u) { var x = rep.byUnit[u.id]; return { u: u, rev: x.rev, cost: x.cost, m: x.rev - x.cost }; }).sort(function (a, b) { return b.m - a.m; });
    var uRows = units.map(function (x, i) {
      return '<tr><td><div class="who"><span class="rank">' + (i + 1) + '</span><div><b>' + esc(x.u.short) + '</b>' + R.plate(x.u.plat) + '</div></div></td><td class="r num">' + rp(x.rev) + '</td><td class="r num muted">' + rp(x.cost) + '</td><td class="r num" style="color:' + (x.m < 0 ? 'var(--bad)' : i < 3 ? 'var(--good)' : 'inherit') + '"><b>' + rp(x.m) + '</b></td></tr>';
    }).join('');
    var costRows = S.costs.filter(function (c) { return c.date.slice(0, 7) === today.slice(0, 7); }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }).map(function (c) {
      var u = c.unitId ? R.unit(S, c.unitId) : null;
      return '<tr><td class="num">' + R.tgl(c.date) + '</td><td><span class="chip chip-neutral">' + esc(c.kategori) + '</span></td><td>' + esc(c.ket) + (u ? '<div style="margin-top:3px">' + R.plate(u.plat) + ' <span class="small muted">' + esc(u.short) + '</span></div>' : '') + '</td><td class="r num"><b>' + rp(c.amount) + '</b></td></tr>';
    }).join('');
    var bulan = R.tglPanjang(today).split(' ').slice(2).join(' ');
    return head('Laporan margin', bulan + ' · 1–' + (+today.slice(8)) + ' ' + R.tgl(today).split(' ')[1], '<button class="btn btn-red" id="add-cost">' + I('plus', 16) + 'Catat biaya</button>') +
      '<div class="grid kpis"><div class="card kpi"><div class="top"><span class="label">Pendapatan</span><span class="ic-wrap">' + I('wallet') + '</span></div><div class="v">' + rp(rep.revenue) + '</div>' + R.spark(marg, '#2a64d6') + '</div>' +
      '<div class="card kpi"><div class="top"><span class="label">Biaya</span><span class="ic-wrap">' + I('car') + '</span></div><div class="v">' + rp(rep.cost) + '</div><div class="s">' + Object.keys(rep.byCat).length + ' kategori</div></div>' +
      '<div class="card kpi good"><div class="top"><span class="label">Margin</span><span class="ic-wrap">' + I('chart') + '</span></div><div class="v" style="color:var(--good)">' + rp(rep.margin) + '</div><div class="s">Pendapatan − biaya</div></div>' +
      '<div class="card kpi"><div class="top"><span class="label">Margin %</span><span class="ic-wrap">' + I('gauge') + '</span></div><div class="v">' + (rep.revenue ? Math.round(rep.margin / rep.revenue * 100) : 0) + '%</div><div class="s">dari pendapatan</div></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-h"><h2>Pendapatan per hari</h2><span class="small muted">setoran + sewa wisata + tour</span></div>' + barChart(days, { label: 'Pendapatan per hari bulan ini', w: 1100, h: 250 }) + '</div>' +
      '<div class="grid two" style="margin-top:16px"><div class="card"><div class="card-h"><h2>Margin per unit</h2><span class="small muted">terbaik ke terendah</span></div><div class="table-wrap"><table><thead><tr><th>Unit</th><th class="r">Pendapatan</th><th class="r">Biaya</th><th class="r">Margin</th></tr></thead><tbody>' + uRows + '</tbody></table></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:16px;min-width:0"><div class="card"><div class="card-h"><h2>Sumber pendapatan</h2></div>' + srcHtml + '</div><div class="card"><div class="card-h"><h2>Biaya per kategori</h2></div><div class="list">' + cats + '</div></div></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-h"><h2>Daftar biaya bulan ini</h2></div><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th class="r">Jumlah</th></tr></thead><tbody>' + costRows + '</tbody></table></div></div>';
  }

  function addCostDialog() {
    var opts = '<option value="">Umum (bukan per unit)</option>' + S.units.map(function (u) { return '<option value="' + u.id + '">' + esc(u.short + ' · ' + u.plat) + '</option>'; }).join('');
    openDialog('Catat biaya',
      '<div class="form-grid"><div class="field"><label for="c-date">Tanggal</label><input type="date" id="c-date" value="' + today + '" max="' + today + '"></div>' +
      '<div class="field"><label for="c-cat">Kategori</label><select id="c-cat"><option>Servis</option><option>Ban</option><option>BBM &amp; tol</option><option>Operasional</option><option>Gaji</option><option>Cicilan unit</option><option>Asuransi</option><option>Lainnya</option></select></div>' +
      '<div class="field full"><label for="c-unit">Unit</label><select id="c-unit">' + opts + '</select></div>' +
      '<div class="field full"><label for="c-ket">Keterangan</label><input id="c-ket" placeholder="mis. Ganti oli Calya"></div>' +
      '<div class="field full"><label for="c-amt">Jumlah (Rp)</label><input id="c-amt" inputmode="numeric" placeholder="350000"></div></div>',
      '<button class="btn" value="cancel">Batal</button><button class="btn btn-red" type="button" id="c-save">Simpan biaya</button>',
      function (f) {
        $('#c-save', f).onclick = function () {
          var amt = +String($('#c-amt', f).value).replace(/\D/g, '');
          if (!amt) { toast('Isi jumlah biaya'); return; }
          S.costs.push({ id: 'c' + Date.now(), date: $('#c-date', f).value || today, unitId: $('#c-unit', f).value || null, kategori: $('#c-cat', f).value, ket: $('#c-ket', f).value.trim() || $('#c-cat', f).value, amount: amt });
          R.save(S); closeDialog(); toast('Biaya tercatat · margin diperbarui'); render();
        };
      });
  }

  /* ---------- render & event ---------- */
  var VIEWS = { dashboard: vDashboard, setoran: vSetoran, pengingat: vPengingat, unit: vUnit, driver: vDriver, wisata: vWisata, laporan: vLaporan };
  function renderChrome() {
    var n = lateList().length;
    $('#nav').innerHTML = NAV.map(function (x) {
      return '<button data-view="' + x[0] + '"' + (x[0] === view ? ' aria-current="page"' : '') + '>' + I(x[2], 18) + '<span>' + x[1] + '</span>' + (x[0] === 'pengingat' && n ? '<span class="badge">' + n + '</span>' : '') + '</button>';
    }).join('');
    var title = NAV.filter(function (x) { return x[0] === view; })[0][1];
    header.innerHTML = '<div class="crumb"><span>RMI Fleet /</span> ' + esc(title) + '</div><div class="tools"><span class="live"><i></i>GPS ' + S.units.length + '/' + S.units.length + ' online</span>' +
      '<span class="live hide-sm">' + R.tglPanjang(today) + '</span><button class="icon-btn" data-go="pengingat" aria-label="Notifikasi">' + I('bell') + (n ? '<span class="dot"></span>' : '') + '</button></div>';
  }
  function render() {
    S = R.load(true);
    if (map && view !== 'unit') { map.remove(); map = null; }
    renderChrome();
    main.innerHTML = VIEWS[view]();
    if (view === 'unit') initMap();
  }
  function go(v) { view = v; if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v); render(); window.scrollTo(0, 0); }

  $('#logout-ic').innerHTML = I('logout');
  $('#nav').addEventListener('click', function (e) { var b = e.target.closest('button[data-view]'); if (b) go(b.dataset.view); });
  header.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
  main.addEventListener('click', function (e) {
    var fly = e.target.closest('[data-fly]');
    if (fly && map) {
      if (fly.dataset.fly === 'home') map.setView([-7.2575, 112.7521], 12);
      else { var fu = R.unit(S, fly.dataset.fly); map.setView([fu.lat, fu.lng], 13); }
      return;
    }
    var t = e.target.closest('[data-go],[data-remind],[data-manual],[data-filter],[data-unit],#prev-day,#next-day,#to-today,#add-driver,#add-wisata,#add-cost');
    if (!t) return;
    if (t.dataset.go) { e.preventDefault(); go(t.dataset.go); }
    else if (t.dataset.remind) remindDialog(t.dataset.remind);
    else if (t.dataset.manual) manualDialog(t.dataset.manual);
    else if (t.dataset.filter) { unitFilter = t.dataset.filter; render(); }
    else if (t.dataset.unit) unitDialog(t.dataset.unit);
    else if (t.id === 'prev-day') { setoranDate = R.addDays(setoranDate, -1); render(); }
    else if (t.id === 'next-day') { if (setoranDate < today) setoranDate = R.addDays(setoranDate, 1); render(); }
    else if (t.id === 'to-today') { setoranDate = today; render(); }
    else if (t.id === 'add-driver') addDriverDialog();
    else if (t.id === 'add-wisata') addWisataDialog();
    else if (t.id === 'add-cost') addCostDialog();
  });
  main.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.tpl) { S.settings.tpl[t.dataset.tpl] = t.value; R.save(S); toast('Isi pesan disimpan'); }
    if (t.dataset.jam) { S.settings.jam[t.dataset.jam] = t.value; R.save(S); toast('Jam kirim disimpan'); }
  });
  window.addEventListener('storage', function (e) { if (e.key === 'rmi-proto-v1' && !dlg.open) render(); });
  window.addEventListener('focus', function () { if (!dlg.open && view !== 'unit') render(); });

  window.addEventListener('hashchange', function () { var x = location.hash.slice(1); if (VIEWS[x] && x !== view) go(x); });
  var h = location.hash.slice(1); if (VIEWS[h]) view = h;
  render();
})();
