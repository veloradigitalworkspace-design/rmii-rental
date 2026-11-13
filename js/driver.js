(function () {
  'use strict';
  var R = window.RMI, S = R.load(), esc = R.esc, rp = R.rp, I = R.icon;
  var screen = document.getElementById('screen'), tabs = document.getElementById('tabs');
  var me = null, tab = 'home', flow = null, timer = null;
  var photos = {}, handType = 'Ambil unit', hand = { km: '', bbm: '1/2' };
  var AV = ['#e0232a', '#2a64d6', '#16884a', '#b26a00', '#7c3aed', '#0e7490', '#be185d', '#4d7c0f', '#c2410c', '#334155'];
  var HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  function $(s, r) { return (r || document).querySelector(s); }
  function toast(m) { var t = $('#toast'); t.innerHTML = I('check') + '<span>' + esc(m) + '</span>'; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2400); }
  function avatar(name, cls) { var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return '<div class="avatar ' + (cls || '') + '" style="background:' + AV[h % AV.length] + '">' + esc(name.split(' ').map(function (x) { return x[0]; }).slice(0, 2).join('')) + '</div>'; }
  function getSession() { try { return localStorage.getItem('rmi-driver'); } catch (e) { return null; } }
  function setSession(id) { try { if (id) localStorage.setItem('rmi-driver', id); else localStorage.removeItem('rmi-driver'); } catch (e) {} }
  function digits(s) { return String(s).replace(/\D/g, ''); }

  var METHODS = {
    QRIS: { bg: '#111', t: 'QRIS', name: 'QRIS', sub: 'GoPay, OVO, DANA, ShopeePay, m-banking' },
    'VA BCA': { bg: '#0060af', t: 'BCA', name: 'BCA Virtual Account', sub: 'm-BCA, KlikBCA, ATM' },
    'VA Mandiri': { bg: '#003d79', t: 'MDR', name: 'Mandiri Virtual Account', sub: "Livin' by Mandiri, ATM" },
    'VA BRI': { bg: '#00529c', t: 'BRI', name: 'BRI Virtual Account', sub: 'BRImo, ATM' }
  };

  /* ---------- QR ---------- */
  function drawQR(cv, seed) {
    var n = 33, ctx = cv.getContext('2d'), s = 8; cv.width = cv.height = n * s;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#111';
    var x = seed;
    function rnd() { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; }
    function finder(cx, cy) {
      for (var i = 0; i < 7; i++) for (var j = 0; j < 7; j++) {
        var edge = i === 0 || j === 0 || i === 6 || j === 6, core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        if (edge || core) ctx.fillRect((cx + i) * s, (cy + j) * s, s, s);
      }
    }
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
      var inF = (i < 8 && j < 8) || (i > n - 9 && j < 8) || (i < 8 && j > n - 9);
      if (!inF && rnd() > 0.5) ctx.fillRect(i * s, j * s, s, s);
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  }

  /* ---------- LOGIN ---------- */
  function login() {
    var drivers = S.drivers.filter(function (d) { return d.unitId; });
    var pick = ['d11', 'd7', 'd1'].map(function (id) { return R.driver(S, id); }).filter(Boolean);
    var saved = pick.map(function (d) {
      var st = R.driverStatus(S, d);
      return '<button type="button" data-acc="' + d.id + '">' + avatar(d.name) + '<span style="flex:1"><b>' + esc(d.name) + '</b><br><span class="small muted">' + esc(d.phone) + '</span></span>' +
        (st.late ? '<span class="chip ' + (st.late >= 3 ? 'chip-bad' : 'chip-warn') + '">' + st.late + ' hari</span>' : '<span class="chip chip-good">Lunas</span>') + '</button>';
    }).join('');
    var def = R.driver(S, 'd7') || drivers[0];
    return '<div class="login"><div class="hero"><img src="assets/logo-rmi.jpg" alt="RMI"><h2>Masuk</h2><p>Aplikasi setoran driver RMI</p></div>' +
      '<form id="login-form" novalidate><div class="field"><label for="l-phone">Nomor WhatsApp</label><div class="tel"><span>+62</span><input id="l-phone" inputmode="tel" autocomplete="tel" value="' + esc(digits(def.phone).replace(/^0/, '')) + '"></div></div>' +
      '<div class="field"><label>PIN</label><div class="pin-row">' + [1, 2, 3, 4].map(function (i) { return '<input type="password" inputmode="numeric" maxlength="1" aria-label="PIN digit ' + i + '" value="' + i + '" data-pin>'; }).join('') + '</div></div>' +
      '<button class="pay-btn" type="submit" style="margin-top:4px">Masuk ' + I('arrow', 18) + '</button>' +
      '<p class="small muted" style="margin:0;text-align:center">Lupa PIN? Hubungi admin RMI.</p>' +
      '<div class="label" style="margin-top:6px">Akun di perangkat ini</div><div class="saved">' + saved + '</div></form></div>';
  }

  /* ---------- BERANDA ---------- */
  function home() {
    var u = R.unit(S, me.unitId), st = R.driverStatus(S, me), first = me.name.split(' ')[0];
    var cls = st.late ? 'late' : st.unpaid.length ? '' : 'ok', dueHtml;
    if (!st.unpaid.length) {
      dueHtml = '<div class="label">Setoran hari ini</div><div class="amt">Lunas</div><div class="muted small">Terima kasih, ' + esc(first) + '. Setoran besok ' + rp(u.tarif) + '.</div>';
    } else {
      dueHtml = '<div style="display:flex;justify-content:space-between;align-items:center"><span class="label">' + (st.late ? 'Total tagihan' : 'Setoran hari ini') + '</span>' +
        (st.late ? '<span class="chip" style="background:rgba(255,255,255,.18);color:#fff">Telat ' + st.late + ' hari</span>' : '<span class="small muted">jatuh tempo 23:59</span>') + '</div>' +
        '<div class="amt">' + rp(st.due) + '</div><div class="muted small">' + (st.late ? st.late + ' hari tunggakan + hari ini · ' + rp(u.tarif) + '/hari' : u.short + ' · ' + rp(u.tarif) + '/hari') + '</div>' +
        '<button class="pay-btn" id="pay">' + I('wallet', 18) + 'Bayar sekarang</button>';
    }
    var week = '';
    for (var i = 6; i >= 0; i--) {
      var k = R.addDays(R.todayKey(), -i), p = R.paidOn(S, me.id, k), d = new Date(k + 'T00:00');
      var c = p ? 'ok' : i === 0 ? 'td' : k < me.joined ? '' : 'no';
      week += '<div class="' + c + '"><i>' + (p ? '✓' : i === 0 ? '•' : k < me.joined ? '' : '!') + '</i>' + HARI[d.getDay()] + '</div>';
    }
    var banner = st.late >= 3 ? '<div class="info-box" style="background:var(--bad-soft);color:var(--bad)">' + I('alert') + '<span><b>Peringatan:</b> setoran telat ' + st.late + ' hari. Segera lunasi agar unit tetap bisa digunakan.</span></div>' : '';
    return '<div class="p-head"><div class="top"><img src="assets/logo-rmi.jpg" alt="RMI"><button class="bell" aria-label="Notifikasi" data-tab="riwayat">' + I('bell') + (st.late ? '<i></i>' : '') + '</button></div>' +
      '<div class="hi">Halo,<b>' + esc(me.name) + '</b></div></div>' +
      '<div class="p-body"><div class="due ' + cls + '">' + dueHtml + '</div>' + banner +
      '<div class="quick"><button data-q="pay"><span class="q">' + I('wallet') + '</span>Bayar</button><button data-tab="riwayat"><span class="q">' + I('history') + '</span>Riwayat</button>' +
      '<button data-tab="serah"><span class="q">' + I('camera') + '</span>Serah terima</button><a target="_blank" rel="noopener" href="' + R.waLink('Halo admin RMI, saya ' + me.name + ' (' + u.short + ' ' + u.plat + ').') + '"><span class="q">' + I('whatsapp') + '</span>Admin</a></div>' +
      '<div class="tile"><div class="tile-h"><b>7 hari terakhir</b><span class="small muted">' + rp(u.tarif) + '/hari</span></div><div class="week">' + week + '</div></div>' +
      '<div class="tile"><div class="tile-h"><b>Unit saya</b><span class="chip chip-good">GPS aktif</span></div><div class="unit-big"><span class="carpic">' + R.carSvg(u.kind, 'var(--red)') + '</span><div><b>' + esc(u.model) + '</b><div style="margin-top:4px">' + R.plate(u.plat) + '</div></div></div></div>' +
      '</div>';
  }

  /* ---------- BAYAR ---------- */
  function payChoose() {
    var u = R.unit(S, me.unitId);
    var list = Object.keys(METHODS).map(function (m, i) {
      var x = METHODS[m];
      return '<button class="method" data-method="' + m + '"><span class="logo" style="background:' + x.bg + '">' + x.t + '</span><span class="grow"><b>' + x.name + '</b><br><span class="small muted">' + x.sub + '</span></span>' + (i === 0 ? '<span class="rec">Tercepat</span>' : I('arrow', 16)) + '</button>';
    }).join('');
    return '<div class="sub-head"><button class="back" data-back aria-label="Kembali">' + I('back') + '</button><h2>Bayar setoran</h2></div><div class="pad">' +
      '<div class="tile"><div class="label">Total dibayar</div><div style="font-family:var(--display);font-size:40px;font-weight:800;line-height:1.1" class="num">' + rp(flow.days.length * u.tarif) + '</div><div class="small muted">' + flow.days.length + ' hari · ' + flow.days.map(R.tgl).join(', ') + '</div></div>' +
      '<div class="label" style="margin-top:4px">Pilih metode pembayaran</div>' + list +
      '<div class="info-box">' + I('shield') + '<span>Pembayaran terverifikasi otomatis. Tidak perlu kirim bukti transfer ke admin.</span></div></div>';
  }

  function payScreen() {
    var u = R.unit(S, me.unitId), total = flow.days.length * u.tarif, isQR = flow.method === 'QRIS', x = METHODS[flow.method];
    var va = { 'VA BCA': '39358', 'VA Mandiri': '88608', 'VA BRI': '12698' }[flow.method] + digits(me.phone).slice(-8);
    return '<div class="sub-head"><button class="back" data-back aria-label="Kembali">' + I('back') + '</button><h2>' + (isQR ? 'Scan QRIS' : 'Virtual Account') + '</h2></div><div class="pad">' +
      '<div class="pay-card"><div class="waiting"><i></i>Menunggu pembayaran</div><div style="text-align:center"><div class="label">Total</div><div class="va" style="font-size:38px">' + rp(total) + '</div></div>' +
      (isQR ? '<div class="qris-mark">QRIS</div><div class="qr-box"><canvas id="qr" aria-label="Kode QRIS"></canvas><span class="mid"><img src="assets/logo-rmi.jpg" alt=""></span></div><div class="small muted" style="text-align:center">RMI RENTAL MOBIL INDONESIA<br>NMID ID1026' + digits(me.phone).slice(-8) + '</div>'
        : '<span class="logo" style="background:' + x.bg + ';color:#fff;font-weight:800;padding:6px 12px;border-radius:8px">' + x.t + '</span><div class="label">Nomor Virtual Account</div><div class="va">' + va.replace(/(\d{4})/g, '$1 ').trim() + '</div><button class="btn" id="copy-va" data-va="' + va + '">' + I('copy', 16) + 'Salin nomor</button>') +
      '<div class="small muted">Selesaikan dalam <span class="timer" id="timer">15:00</span></div></div>' +
      '<button class="pay-btn" id="check">' + I('refresh', 18) + 'Cek status pembayaran</button></div>';
  }

  function paySuccess() {
    var u = R.unit(S, me.unitId), total = flow.paid.length * u.tarif, p = flow.paid[0];
    return '<div class="success"><div class="big-check">' + I('check', 46) + '</div><h2 style="font-size:32px;font-weight:800;margin-top:14px">Pembayaran berhasil</h2><p class="muted" style="margin:0 0 8px">Setoran sudah tercatat di admin RMI.</p>' +
      '<div class="receipt"><div><span class="muted">Jumlah</span><b class="num">' + rp(total) + '</b></div><div><span class="muted">Untuk tanggal</span><span>' + flow.paid.map(function (x) { return R.tgl(x.date); }).join(', ') + '</span></div>' +
      '<div><span class="muted">Metode</span><span>' + esc(METHODS[p.method] ? METHODS[p.method].name : p.method) + '</span></div><div><span class="muted">Waktu</span><span class="num">' + R.tglPanjang(R.todayKey()).split(', ')[1] + ' ' + R.jam(p.paidAt) + '</span></div><div><span class="muted">Unit</span>' + R.plate(u.plat) + '</div>' +
      '<div><span class="muted">No. transaksi</span><span class="num">RMI' + Date.now().toString().slice(-9) + '</span></div></div>' +
      '<button class="pay-btn" id="done">Kembali ke beranda</button></div>';
  }

  /* ---------- RIWAYAT ---------- */
  function riwayat() {
    var st = R.driverStatus(S, me), u = R.unit(S, me.unitId), rows = '', total = 0;
    for (var i = 0; i < 21; i++) {
      var k = R.addDays(R.todayKey(), -i); if (k < me.joined) break;
      var p = R.paidOn(S, me.id, k); if (p && k.slice(0, 7) === R.todayKey().slice(0, 7)) total += p.amount;
      rows += '<div class="hist"><div><b>' + R.tglPanjang(k).split(',')[0] + ', ' + R.tgl(k) + '</b><div class="small muted">' + (p ? esc(p.method) + ' · ' + R.jam(p.paidAt) : i === 0 ? 'Jatuh tempo hari ini' : 'Belum dibayar') + '</div></div>' +
        (p ? '<span class="chip chip-good">' + rp(p.amount) + '</span>' : '<span class="chip ' + (i === 0 ? 'chip-neutral' : 'chip-bad') + '">' + rp(u.tarif) + '</span>') + '</div>';
    }
    return '<div class="sub-head"><h2>Riwayat setoran</h2></div><div class="pad">' +
      '<div class="tile" style="display:flex;justify-content:space-between;align-items:center"><div><div class="label">Dibayar bulan ini</div><b style="font-family:var(--display);font-size:28px" class="num">' + rp(total) + '</b></div>' +
      (st.late ? '<span class="chip chip-bad">Tunggakan ' + rp(st.lateAmount) + '</span>' : '<span class="chip chip-good">Tidak ada tunggakan</span>') + '</div>' + rows + '</div>';
  }

  /* ---------- SERAH TERIMA ---------- */
  var SLOTS = ['Depan', 'Belakang', 'Kiri', 'Kanan', 'Odometer', 'BBM'];
  function serah() {
    var u = R.unit(S, me.unitId), n = Object.keys(photos).length;
    var slots = SLOTS.map(function (l) {
      return '<label class="slot' + (photos[l] ? ' done' : '') + '" for="ph-' + l + '">' + (photos[l] ? '<img src="' + photos[l] + '" alt="' + l + '">' : I('camera', 22) + '<span>' + l + '</span>') + '<input type="file" accept="image/*" capture="environment" id="ph-' + l + '" data-slot="' + l + '"></label>';
    }).join('');
    return '<div class="sub-head"><h2>Serah terima unit</h2></div><div class="pad">' +
      '<div class="seg" role="group" style="align-self:flex-start"><button data-ht="Ambil unit" aria-pressed="' + (handType === 'Ambil unit') + '">Ambil unit</button><button data-ht="Kembalikan unit" aria-pressed="' + (handType === 'Kembalikan unit') + '">Kembalikan</button></div>' +
      '<div class="tile unit-big"><span class="carpic">' + R.carSvg(u.kind, 'var(--red)') + '</span><div><b>' + esc(u.short) + '</b><div style="margin-top:4px">' + R.plate(u.plat) + '</div></div></div>' +
      '<div style="display:flex;justify-content:space-between"><span class="label">Foto kondisi unit</span><span class="small muted">' + n + '/6</span></div><div class="slots">' + slots + '</div>' +
      '<div class="form-grid" style="grid-template-columns:1fr 1fr"><div class="field"><label for="km">Kilometer</label><input id="km" inputmode="numeric" placeholder="mis. 84520" value="' + esc(hand.km) + '"></div>' +
      '<div class="field"><label for="bbm">BBM</label><select id="bbm">' + ['Penuh', '3/4', '1/2', '1/4', 'Hampir habis'].map(function (o) { return '<option' + (o === hand.bbm ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="info-box">' + I('pin') + '<span>Lokasi tercatat otomatis dari GPS unit: <span class="num">' + u.lat.toFixed(4) + ', ' + u.lng.toFixed(4) + '</span></span></div>' +
      '<button class="pay-btn" id="save-hand">Simpan serah terima</button></div>';
  }

  /* ---------- PROFIL ---------- */
  function profil() {
    var u = R.unit(S, me.unitId), d = new Date(me.joined + 'T00:00');
    return '<div class="profile-top">' + avatar(me.name) + '<h2 style="font-size:26px;font-weight:800">' + esc(me.name) + '</h2><div class="small muted">' + esc(me.phone) + ' · driver sejak ' + R.tgl(me.joined) + ' ' + d.getFullYear() + '</div></div>' +
      '<div class="pad"><div class="menu-list"><div>' + I('car') + '<span>Unit</span><span class="r">' + esc(u.short) + ' ' + R.plate(u.plat) + '</span></div><div>' + I('wallet') + '<span>Setoran harian</span><span class="r num">' + rp(u.tarif) + '</span></div>' +
      '<div>' + I('user') + '<span>KTP &amp; SIM</span><span class="r">' + (me.ktp && me.sim ? 'Terverifikasi' : 'Belum lengkap') + '</span></div><div>' + I('bell') + '<span>Pengingat setoran</span><span class="r">Pukul ' + S.settings.jam.h0 + '</span></div></div>' +
      '<div class="menu-list"><a target="_blank" rel="noopener" href="' + R.waLink('Halo admin RMI, saya ' + me.name + '.') + '">' + I('whatsapp') + '<span>Hubungi admin RMI</span></a><button id="logout" type="button">' + I('logout') + '<span>Keluar</span></button></div></div>';
  }

  /* ---------- render ---------- */
  function renderTabs() {
    var T = [['home', 'Beranda', 'home'], ['riwayat', 'Riwayat', 'history'], ['serah', 'Serah terima', 'camera'], ['profil', 'Profil', 'user']];
    tabs.innerHTML = T.map(function (t) { return '<button data-tab="' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + I(t[2], 20) + t[1] + '</button>'; }).join('');
  }
  function render() {
    S = R.load(true); clearInterval(timer);
    me = R.driver(S, getSession());
    if (!me || !me.unitId) { me = null; screen.innerHTML = login(); tabs.hidden = true; screen.scrollTop = 0; return; }
    var html;
    if (flow) html = flow.step === 'choose' ? payChoose() : flow.step === 'pay' ? payScreen() : paySuccess();
    else html = tab === 'home' ? home() : tab === 'riwayat' ? riwayat() : tab === 'serah' ? serah() : profil();
    screen.innerHTML = html; screen.scrollTop = 0;
    tabs.hidden = !!flow; if (!flow) renderTabs();
    var qr = $('#qr'); if (qr) drawQR(qr, me.id.length * 97 + flow.days.length * 13 + 7);
    var tm = $('#timer');
    if (tm) {
      var end = flow.until || (flow.until = Date.now() + 15 * 60000);
      var tick = function () { var s = Math.max(0, Math.round((end - Date.now()) / 1000)); tm.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
      tick(); timer = setInterval(tick, 1000);
    }
  }
  function startPay() { flow = { step: 'choose', days: R.driverStatus(S, me).unpaid }; if (!flow.days.length) { flow = null; toast('Setoran hari ini sudah lunas'); return; } render(); }

  tabs.addEventListener('click', function (e) { var b = e.target.closest('button[data-tab]'); if (b) { tab = b.dataset.tab; render(); } });
  screen.addEventListener('submit', function (e) {
    if (e.target.id !== 'login-form') return;
    e.preventDefault();
    var ph = digits($('#l-phone').value).replace(/^62/, '').replace(/^0/, '');
    var d = S.drivers.filter(function (x) { return x.unitId && digits(x.phone).replace(/^0/, '') === ph; })[0];
    if (!d) { toast('Nomor belum terdaftar. Hubungi admin RMI.'); return; }
    setSession(d.id); tab = 'home'; render();
  });
  screen.addEventListener('click', function (e) {
    var t = e.target.closest('button, [data-back]'); if (!t) return;
    if (t.dataset.acc) { setSession(t.dataset.acc); tab = 'home'; render(); }
    else if (t.dataset.tab) { tab = t.dataset.tab; render(); }
    else if (t.id === 'pay' || t.dataset.q === 'pay') startPay();
    else if (t.dataset.method) { flow.method = t.dataset.method; flow.step = 'pay'; flow.until = null; render(); }
    else if (t.hasAttribute('data-back')) { if (flow.step === 'pay') flow.step = 'choose'; else flow = null; render(); }
    else if (t.id === 'check') {
      t.disabled = true; t.innerHTML = '<span class="spin"></span>Memeriksa pembayaran…';
      setTimeout(function () { flow.paid = R.pay(S, me, flow.days, flow.method); flow.step = 'done'; render(); }, 1400);
    }
    else if (t.id === 'done') { flow = null; tab = 'home'; render(); }
    else if (t.id === 'copy-va') {
      var v = t.dataset.va;
      if (navigator.clipboard) navigator.clipboard.writeText(v).then(function () { toast('Nomor VA disalin'); }, function () { toast(v); }); else toast(v);
    }
    else if (t.dataset.ht) { handType = t.dataset.ht; render(); }
    else if (t.id === 'logout') { setSession(null); flow = null; render(); }
    else if (t.id === 'save-hand') {
      if (Object.keys(photos).length < 4) { toast('Ambil minimal 4 foto kondisi unit'); return; }
      var u = R.unit(S, me.unitId), now = new Date();
      u.handovers.unshift({ type: handType, at: R.tgl(R.todayKey()) + ' ' + now.toTimeString().slice(0, 5), km: hand.km || '–', bbm: hand.bbm, by: me.id,
        photos: SLOTS.map(function (l) { return { label: l, src: photos[l] || null }; }) });
      u.handovers = u.handovers.slice(0, 3);
      R.save(S); photos = {}; hand = { km: '', bbm: '1/2' }; toast('Serah terima tersimpan'); tab = 'home'; render();
    }
  });
  screen.addEventListener('input', function (e) {
    if (e.target.id === 'km') hand.km = e.target.value;
    if (e.target.hasAttribute('data-pin') && e.target.value) { var n = e.target.nextElementSibling; if (n) n.focus(); }
  });
  screen.addEventListener('focusin', function (e) { if (e.target.hasAttribute('data-pin')) e.target.select(); });
  screen.addEventListener('change', function (e) {
    if (e.target.id === 'bbm') hand.bbm = e.target.value;
    var inp = e.target; if (!inp.dataset.slot || !inp.files[0]) return;
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'), s = Math.min(1, 320 / img.width);
        c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        photos[inp.dataset.slot] = c.toDataURL('image/jpeg', 0.55); render();
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(inp.files[0]);
  });
  window.addEventListener('storage', function (e) { if (e.key === 'rmi-proto-v1' && !flow) render(); });

  render();
})();
