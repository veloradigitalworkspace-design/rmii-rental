/* RMI prototype — data contoh & penyimpanan di browser.
   Semua nama driver, plat, dan transaksi adalah DATA CONTOH (fiktif). */
(function () {
  'use strict';

  // Nomor WhatsApp RMI untuk tombol booking & pengingat. Kosongkan = WhatsApp akan meminta pilih kontak.
  var WA_NUMBER = '';

  var KEY = 'rmi-proto-v1';

  /* ---------- tanggal ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dkey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(k, n) { var d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); }
  function todayKey() { return dkey(new Date()); }
  function daysBetween(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 864e5); }

  /* ---------- angka acak dengan seed (data selalu sama) ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- armada (dari chat klien) ---------- */
  var FLEET = [
    { model: 'Toyota Hiace Premio', short: 'Hiace Premio', n: 1, tarif: 950000, kind: 'van' },
    { model: 'Toyota Hiace Commuter', short: 'Hiace Commuter', n: 2, tarif: 700000, kind: 'van' },
    { model: 'Toyota Innova Reborn', short: 'Innova Reborn', n: 1, tarif: 400000, kind: 'mpv' },
    { model: 'Suzuki Ertiga XL7', short: 'Ertiga XL7', n: 3, tarif: 190000, kind: 'mpv' },
    { model: 'Honda New BR-V', short: 'BR-V', n: 1, tarif: 190000, kind: 'mpv' },
    { model: 'Toyota Calya', short: 'Calya', n: 6, tarif: 160000, kind: 'city' },
    { model: 'Wuling', short: 'Wuling', n: 3, tarif: 150000, kind: 'mpv' },
    { model: 'Daihatsu Sigra', short: 'Sigra', n: 2, tarif: 140000, kind: 'city' }
  ];

  var DRIVER_NAMES = ['Andi Saputra', 'Budi Santoso', 'Dedi Kurniawan', 'Eko Prasetyo', 'Fajar Hidayat',
    'Gilang Ramadhan', 'Hendra Wijaya', 'Irfan Maulana', 'Joko Susilo', 'Rizky Pratama',
    'Agus Setiawan', 'Bayu Nugroho', 'Dimas Arya', 'Yusuf Hakim'];

  var METHODS = ['QRIS', 'QRIS', 'QRIS', 'QRIS', 'VA BCA', 'VA BRI', 'Transfer', 'Tunai'];

  function generate() {
    var R = rng(20261113);
    var today = todayKey();
    var monthStart = today.slice(0, 8) + '01';
    var histStart = addDays(monthStart, -35) < addDays(today, -45) ? addDays(monthStart, -35) : addDays(today, -45);

    // unit
    var units = [], uid = 0;
    var letters = ['AB', 'BK', 'CD', 'DF', 'EG', 'FH', 'GJ', 'HK', 'JL', 'KM', 'LN', 'MP', 'NR', 'PS', 'RT', 'ST', 'TU', 'UV', 'VW'];
    FLEET.forEach(function (f) {
      for (var i = 0; i < f.n; i++) {
        units.push({
          id: 'u' + (++uid), model: f.model, short: f.short, kind: f.kind, tarif: f.tarif,
          plat: 'L ' + (1100 + Math.floor(R() * 8800)) + ' ' + letters[uid - 1],
          status: 'tersedia', driverId: null,
          lat: -7.2575 + (R() - 0.5) * 0.14, lng: 112.7521 + (R() - 0.5) * 0.16,
          gpsAt: new Date(Date.now() - Math.floor(R() * 9) * 60000).toISOString(),
          handovers: []
        });
      }
    });

    // driver online memegang mobil kecil & MPV (bukan Hiace / Innova)
    var drivers = [];
    var driverUnits = units.filter(function (u) { return u.kind !== 'van' && u.short !== 'Innova Reborn'; });
    // satu Calya sedang servis
    var servis = driverUnits.filter(function (u) { return u.short === 'Calya'; })[5];
    servis.status = 'servis';
    driverUnits = driverUnits.filter(function (u) { return u !== servis; });

    driverUnits.forEach(function (u, i) {
      var d = {
        id: 'd' + (i + 1), name: DRIVER_NAMES[i],
        phone: '0812-' + (3000 + Math.floor(R() * 6000)) + '-' + (1000 + Math.floor(R() * 8000)),
        unitId: u.id,
        joined: i === driverUnits.length - 1 ? addDays(today, -5) : addDays(today, -90 - Math.floor(R() * 200)),
        ktp: true, sim: true
      };
      drivers.push(d);
      u.status = 'driver'; u.driverId = d.id;
    });

    // tunggakan: 1, 2, dan 3 hari
    var arrears = { d3: 1, d7: 2, d11: 3 };
    // sudah bayar hari ini (jam bayar)
    var paidToday = { d1: '06:42', d2: '07:15', d4: '07:58', d5: '08:31', d6: '09:04', d9: '10:12', d12: '11:47', d14: '12:20' };

    var payments = [], pid = 0;
    drivers.forEach(function (d) {
      var start = d.joined > histStart ? d.joined : histStart;
      var u = units.filter(function (x) { return x.id === d.unitId; })[0];
      for (var k = start; k < today; k = addDays(k, 1)) {
        var lateBy = arrears[d.id] || 0;
        if (daysBetween(k, today) <= lateBy) continue; // belum dibayar
        var h = 6 + Math.floor(R() * 15), m = Math.floor(R() * 60);
        payments.push({ id: 'p' + (++pid), driverId: d.id, unitId: u.id, date: k, amount: u.tarif,
          method: METHODS[Math.floor(R() * METHODS.length)], paidAt: k + 'T' + pad(h) + ':' + pad(m) });
      }
      if (paidToday[d.id]) {
        payments.push({ id: 'p' + (++pid), driverId: d.id, unitId: u.id, date: today, amount: u.tarif,
          method: R() < 0.75 ? 'QRIS' : 'VA BCA', paidAt: today + 'T' + paidToday[d.id] });
      }
    });

    // sewa wisata
    var byShort = function (s, n) { return units.filter(function (u) { return u.short === s; })[n || 0]; };
    var premio = byShort('Hiace Premio'), commuter = byShort('Hiace Commuter'), commuter2 = byShort('Hiace Commuter', 1), innova = byShort('Innova Reborn');
    var wisata = [
      { id: 'w1', unitId: premio.id, tamu: 'Rombongan kantor (12 orang)', start: addDays(today, -1), end: addDays(today, 1), mode: 'Dengan driver', perHari: 1250000 },
      { id: 'w2', unitId: commuter.id, tamu: 'Keluarga wisatawan Malaysia', start: today, end: addDays(today, 2), mode: 'Dengan driver', perHari: 950000 },
      { id: 'w3', unitId: commuter2.id, tamu: 'Tamu Belanda (6 orang)', start: addDays(today, -8), end: addDays(today, -6), mode: 'Lepas kunci', perHari: 700000 },
      { id: 'w4', unitId: innova.id, tamu: 'Ziarah Wali (keluarga)', start: addDays(today, -5), end: addDays(today, -3), mode: 'Lepas kunci', perHari: 400000 }
    ];
    premio.status = 'wisata'; premio.lat = -8.2236; premio.lng = 112.9174; // sedang di Pronojiwo, Lumajang
    commuter.status = 'wisata';

    // open trip tour bulan ini
    var tours = [
      { id: 't1', paket: '2D1N Lava Tour + Tumpak Sewu', date: addDays(today, -7) < monthStart ? monthStart : addDays(today, -7), pax: 8, perPax: 1150000 },
      { id: 't2', paket: 'Lava Tour Pronojiwo (1 hari)', date: addDays(today, -2) < monthStart ? monthStart : addDays(today, -2), pax: 6, perPax: 625000 }
    ];

    // biaya bulan ini (contoh)
    var cm = function (n) { var k = addDays(monthStart, n); return k > today ? today : k; };
    var costs = [
      { id: 'c1', date: cm(1), unitId: servis.id, kategori: 'Servis', ket: 'Servis besar + kampas rem', amount: 1850000 },
      { id: 'c2', date: cm(3), unitId: units[3].id, kategori: 'Servis', ket: 'Ganti oli & filter', amount: 420000 },
      { id: 'c3', date: cm(4), unitId: units[8].id, kategori: 'Ban', ket: 'Ganti 2 ban', amount: 1300000 },
      { id: 'c4', date: cm(5), unitId: null, kategori: 'Operasional', ket: 'Biaya trip 2D1N (cottage, tiket, fotografer, makan)', amount: 5600000 },
      { id: 'c5', date: cm(6), unitId: premio.id, kategori: 'BBM & tol', ket: 'BBM + tol sewa wisata', amount: 780000 },
      { id: 'c6', date: cm(8), unitId: null, kategori: 'Operasional', ket: 'Biaya trip Lava Tour 1 hari', amount: 2250000 },
      { id: 'c7', date: cm(9), unitId: null, kategori: 'Gaji', ket: 'Gaji admin (setengah bulan)', amount: 1750000 },
      { id: 'c8', date: cm(10), unitId: units[12].id, kategori: 'Servis', ket: 'Ganti aki', amount: 950000 }
    ];

    return {
      v: 1, generatedFor: today, units: units, drivers: drivers, payments: payments,
      wisata: wisata, tours: tours, costs: costs, reminders: [],
      settings: {
        jam: { h0: '20:00', h1: '08:00', h3: '08:00' },
        tpl: {
          h0: 'Halo {nama}, setoran sewa {unit} hari ini Rp{jumlah} belum masuk. Bayar mudah lewat aplikasi RMI (QRIS/VA). Terima kasih 🙏',
          h1: 'Halo {nama}, setoran sewa {unit} sudah telat {hari} hari, total Rp{jumlah}. Mohon dibayar hari ini lewat aplikasi RMI ya.',
          h3: 'PERINGATAN: {nama}, setoran {unit} telat {hari} hari (Rp{jumlah}). Mohon segera dilunasi hari ini. Jika belum, admin RMI akan menghubungi Anda terkait unit.'
        }
      }
    };
  }

  /* ---------- simpan / muat ---------- */
  var mem = null;
  function load(force) {
    if (!force && mem && mem.generatedFor === todayKey()) return mem;
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    if (!s || s.v !== 1 || s.generatedFor !== todayKey()) { s = generate(); save(s); }
    mem = s; return s;
  }
  function save(s) {
    mem = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* penyimpanan tidak tersedia: tetap jalan di memori */ }
  }
  function reset() { var s = generate(); save(s); return s; }

  /* ---------- turunan ---------- */
  function unit(s, id) { for (var i = 0; i < s.units.length; i++) if (s.units[i].id === id) return s.units[i]; return null; }
  function driver(s, id) { for (var i = 0; i < s.drivers.length; i++) if (s.drivers[i].id === id) return s.drivers[i]; return null; }
  function paidOn(s, driverId, date) {
    for (var i = 0; i < s.payments.length; i++) { var p = s.payments[i]; if (p.driverId === driverId && p.date === date) return p; }
    return null;
  }
  // hari yang belum dibayar (termasuk hari ini), lama ke baru
  function unpaidDays(s, d) {
    var today = todayKey(), out = [];
    var start = addDays(today, -14) > d.joined ? addDays(today, -14) : d.joined;
    for (var k = start; k <= today; k = addDays(k, 1)) if (!paidOn(s, d.id, k)) out.push(k);
    return out;
  }
  function driverStatus(s, d) {
    var u = unit(s, d.unitId), days = unpaidDays(s, d), today = todayKey();
    var late = days.filter(function (k) { return k < today; });
    return {
      unpaid: days, late: late.length, todayPaid: days.indexOf(today) === -1,
      due: days.length * (u ? u.tarif : 0), lateAmount: late.length * (u ? u.tarif : 0),
      level: late.length >= 3 ? 'h3' : late.length >= 1 ? 'h1' : days.length ? 'h0' : null
    };
  }
  function pay(s, d, days, method) {
    var u = unit(s, d.unitId), now = new Date(), out = [];
    var t = todayKey() + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes());
    days.forEach(function (k) {
      if (paidOn(s, d.id, k)) return;
      var p = { id: 'p' + Date.now() + k, driverId: d.id, unitId: u.id, date: k, amount: u.tarif, method: method, paidAt: t, fresh: true };
      s.payments.push(p); out.push(p);
    });
    save(s); return out;
  }
  function inMonth(s, k) { return k.slice(0, 7) === todayKey().slice(0, 7) && k <= todayKey(); }
  function wisataDays(w) { return daysBetween(w.start, w.end) + 1; }
  function wisataDaysInMonth(w) {
    var n = 0; for (var k = w.start; k <= w.end; k = addDays(k, 1)) if (k.slice(0, 7) === todayKey().slice(0, 7) && k <= todayKey()) n++;
    return n;
  }
  function monthReport(s) {
    var setoran = 0, wis = 0, tour = 0, cost = 0, byDay = {}, byUnit = {}, byCat = {};
    s.units.forEach(function (u) { byUnit[u.id] = { rev: 0, cost: 0 }; });
    s.payments.forEach(function (p) {
      if (!inMonth(s, p.date)) return;
      setoran += p.amount; byDay[p.date] = (byDay[p.date] || 0) + p.amount;
      if (byUnit[p.unitId]) byUnit[p.unitId].rev += p.amount;
    });
    s.wisata.forEach(function (w) {
      for (var k = w.start; k <= w.end; k = addDays(k, 1)) {
        if (!inMonth(s, k)) continue;
        wis += w.perHari; byDay[k] = (byDay[k] || 0) + w.perHari;
        if (byUnit[w.unitId]) byUnit[w.unitId].rev += w.perHari;
      }
    });
    s.tours.forEach(function (t) {
      if (!inMonth(s, t.date)) return;
      var a = t.pax * t.perPax; tour += a; byDay[t.date] = (byDay[t.date] || 0) + a;
    });
    s.costs.forEach(function (c) {
      if (!inMonth(s, c.date)) return;
      cost += c.amount; byCat[c.kategori] = (byCat[c.kategori] || 0) + c.amount;
      if (c.unitId && byUnit[c.unitId]) byUnit[c.unitId].cost += c.amount;
    });
    var rev = setoran + wis + tour;
    return { setoran: setoran, wisata: wis, tour: tour, revenue: rev, cost: cost, margin: rev - cost, byDay: byDay, byUnit: byUnit, byCat: byCat };
  }

  /* ---------- format ---------- */
  function rp(n) { return 'Rp' + Math.round(n).toLocaleString('id-ID'); }
  function num(n) { return Math.round(n).toLocaleString('id-ID'); }
  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function tgl(k) { var d = parseKey(k); return d.getDate() + ' ' + BULAN[d.getMonth()]; }
  function tglPanjang(k) { var d = parseKey(k); return HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear(); }
  function jam(iso) { return iso ? iso.slice(11, 16) : ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function waLink(text) { return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text); }
  function fillTpl(tpl, d, u, st) {
    return tpl.replace('{nama}', d.name.split(' ')[0]).replace('{unit}', u.short + ' ' + u.plat)
      .replace('{jumlah}', num(st.level === 'h0' ? u.tarif : st.lateAmount || st.due)).replace('{hari}', st.late);
  }

  // ilustrasi mobil tampak samping (SVG) per jenis
  var CAR = {
    van: { body: 'M6 39V18c0-5 3-8 8-8h78c4 0 7 2 9 5l11 13c3 2 4 4 4 7v4c0 2-1 3-3 3H9c-2 0-3-1-3-3z',
      win: '<rect x="14" y="14" width="17" height="11" rx="2"/><rect x="34" y="14" width="17" height="11" rx="2"/><rect x="54" y="14" width="17" height="11" rx="2"/><rect x="74" y="14" width="11" height="11" rx="2"/><path d="M88 14h8c1 0 2 1 3 2l8 10H88z"/>', w: [28, 96] },
    mpv: { body: 'M6 39v-9c0-3 2-5 5-5l17-3 14-10c2-1 4-2 7-2h35c4 0 6 1 8 3l10 9 10 3c3 1 4 3 4 6v8c0 2-1 3-3 3H9c-2 0-3-1-3-3z',
      win: '<path d="M44 14c1-1 2-1 3-1h13v10H32z"/><rect x="63" y="13" width="18" height="10" rx="1.5"/><path d="M84 13h4c2 0 3 1 4 2l7 8H84z"/>', w: [28, 96] },
    city: { body: 'M8 39v-9c0-3 2-5 5-5l16-3 14-10c2-1 4-2 7-2h34c4 0 6 1 8 4l8 10c3 1 5 3 5 6v9c0 2-1 3-3 3H11c-2 0-3-1-3-3z',
      win: '<path d="M45 14c1-1 2-1 3-1h13v10H33z"/><rect x="64" y="13" width="16" height="10" rx="1.5"/><path d="M83 13h3c2 0 3 1 4 2l6 8H83z"/>', w: [28, 90] }
  };
  function carSvg(kind, color) {
    var c = CAR[kind] || CAR.mpv; color = color || 'currentColor';
    var wheel = function (x) { return '<circle cx="' + x + '" cy="42" r="9" fill="#141110"/><circle cx="' + x + '" cy="42" r="5" fill="#a7a09c"/><circle cx="' + x + '" cy="42" r="1.6" fill="#141110"/>'; };
    return '<svg viewBox="0 0 124 54" aria-hidden="true"><ellipse cx="62" cy="51" rx="54" ry="2.5" fill="#000" opacity=".12"/><path d="' + c.body + '" fill="' + color + '"/>' +
      '<g fill="#1d2731" opacity=".82">' + c.win + '</g><path d="M10 31h100" stroke="#fff" stroke-opacity=".22" stroke-width="1.5"/>' +
      '<rect x="110" y="29" width="5" height="3" rx="1" fill="#ffd27a"/>' + wheel(c.w[0]) + wheel(c.w[1]) + '</svg>';
  }

  // ikon garis (24px)
  var ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1.2"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    pin: '<path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
    route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    car: '<path d="M5 17h14M3 13l2-6a2 2 0 0 1 2-1.5h10A2 2 0 0 1 19 7l2 6v4a1 1 0 0 1-1 1h-1M3 13v4a1 1 0 0 0 1 1h1M3 13h18"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    signal: '<path d="M5 12.5a9.9 9.9 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/><path d="M2 9a14 14 0 0 1 20 0"/>',
    alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.5"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    home: '<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10"/>',
    send: '<path d="m22 2-9.5 9.5M22 2l-7 20-3.5-9.5L2 9z"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7L20 8.5M20 3v5.5h-5.5"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    gauge: '<path d="M4 18a9 9 0 1 1 16 0"/><path d="m12 14 4-5"/><circle cx="12" cy="14" r="1.3"/>',
    phone: '<path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 12l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    whatsapp: '<path d="M4 20l1.3-4A8.5 8.5 0 1 1 8.6 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>'
  };
  function icon(name, size) {
    return '<svg class="ic" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }
  function plate(p) {
    var x = String(p).split(' ');
    return '<span class="plate"><b>' + esc(x[0]) + '</b> ' + esc(x[1] || '') + ' <b>' + esc(x[2] || '') + '</b></span>';
  }
  // grafik garis kecil
  function spark(vals, color) {
    var W = 120, H = 34, mx = Math.max.apply(null, vals.concat([1])), mn = Math.min.apply(null, vals);
    var pts = vals.map(function (v, i) { return [i * (W / (vals.length - 1)), H - 4 - ((v - mn) / ((mx - mn) || 1)) * (H - 8)]; });
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('');
    var last = pts[pts.length - 1];
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + 'L' + W + ' ' + H + 'L0 ' + H + 'Z" fill="' + color + '" opacity=".12"/>' +
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="3" fill="' + color + '"/></svg>';
  }
  // speedometer (0–1)
  function gauge(frac) {
    frac = Math.max(0, Math.min(1, frac));
    var cx = 110, cy = 110, r = 88, a0 = Math.PI * 0.85, a1 = Math.PI * 2.15, ticks = '';
    function pt(a, rr) { return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; }
    function arc(f0, f1, rr) {
      var s = pt(a0 + (a1 - a0) * f0, rr), e = pt(a0 + (a1 - a0) * f1, rr), large = (f1 - f0) * (a1 - a0) > Math.PI ? 1 : 0;
      return 'M' + s[0].toFixed(1) + ' ' + s[1].toFixed(1) + 'A' + rr + ' ' + rr + ' 0 ' + large + ' 1 ' + e[0].toFixed(1) + ' ' + e[1].toFixed(1);
    }
    for (var i = 0; i <= 20; i++) {
      var a = a0 + (a1 - a0) * i / 20, big = i % 5 === 0, p1 = pt(a, r - 16), p2 = pt(a, r - (big ? 28 : 22));
      ticks += '<line x1="' + p1[0].toFixed(1) + '" y1="' + p1[1].toFixed(1) + '" x2="' + p2[0].toFixed(1) + '" y2="' + p2[1].toFixed(1) + '" stroke="currentColor" stroke-opacity="' + (big ? .55 : .25) + '" stroke-width="' + (big ? 2.2 : 1.4) + '"/>';
    }
    var na = a0 + (a1 - a0) * frac, np = pt(na, r - 34);
    return '<svg class="gauge" viewBox="0 0 220 190" aria-hidden="true"><path d="' + arc(0, 1, r) + '" fill="none" stroke="currentColor" stroke-opacity=".12" stroke-width="12" stroke-linecap="round"/>' +
      '<path d="' + arc(0, Math.max(frac, 0.001), r) + '" fill="none" stroke="var(--red)" stroke-width="12" stroke-linecap="round"/>' + ticks +
      '<line x1="' + cx + '" y1="' + cy + '" x2="' + np[0].toFixed(1) + '" y2="' + np[1].toFixed(1) + '" stroke="var(--red)" stroke-width="4" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + cy + '" r="9" fill="var(--ink)"/><circle cx="' + cx + '" cy="' + cy + '" r="3.5" fill="var(--red)"/></svg>';
  }

  window.RMI = {
    WA_NUMBER: WA_NUMBER, load: load, save: save, reset: reset, todayKey: todayKey, addDays: addDays, daysBetween: daysBetween,
    unit: unit, driver: driver, paidOn: paidOn, unpaidDays: unpaidDays, driverStatus: driverStatus, pay: pay,
    monthReport: monthReport, wisataDays: wisataDays, wisataDaysInMonth: wisataDaysInMonth,
    rp: rp, num: num, tgl: tgl, tglPanjang: tglPanjang, jam: jam, esc: esc, waLink: waLink, fillTpl: fillTpl, carSvg: carSvg,
    icon: icon, plate: plate, spark: spark, gauge: gauge,
    FLEET: FLEET
  };
})();
