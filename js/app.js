/* ============================================================
   Паспорт команды — логика приложения
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'teampass.project.v1';
  var MAX_PLAYERS = 60;
  var PER_PAGE = 18;
  var TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  var SHEET_W = 297 * 96 / 25.4;
  var SHEET_H = 210 * 96 / 25.4;
  var SHEET_GAP = 8 * 96 / 25.4;
  var POSITIONS = ['Либеро', 'Центральный', 'Доигровщик', 'Диагональный', 'Связующий'];

  function $(id) { return document.getElementById(id); }

  var el = {
    sheets: $('sheets'),
    sheetStage: $('sheetStage'),
    canvas: $('canvas'),
    uiWarning: $('uiWarning'),
    teamName: $('teamName'),
    teamSeason: $('teamSeason'),
    swatches: $('swatches'),
    accentCustom: $('accentCustom'),
    teamLogoThumb: $('teamLogoThumb'),
    teamLogoPreview: $('teamLogoPreview'),
    teamLogoPlus: $('teamLogoPlus'),
    teamLogoRemove: $('teamLogoRemove'),
    logoInput: $('logoInput'),
    rosterList: $('rosterList'),
    rosterCount: $('rosterCount'),
    rosterLimit: $('rosterLimit'),
    rosterSearch: $('rosterSearch'),
    toolbarCount: $('toolbarCount'),
    toolbarTeamName: $('toolbarTeamName'),
    btnAdd: $('btnAdd'),
    btnAddBottom: $('btnAddBottom'),
    btnSort: $('btnSort'),
    btnProject: $('btnProject'),
    projectMenu: $('projectMenu'),
    btnExportMenu: $('btnExportMenu'),
    exportMenu: $('exportMenu'),
    btnXlsx: $('btnXlsx'),
    btnPdf: $('btnPdf'),
    btnSidebarToggle: $('btnSidebarToggle'),
    zoomOut: $('zoomOut'),
    zoomIn: $('zoomIn'),
    zoomFit: $('zoomFit'),
    zoomLabel: $('zoomLabel'),
    pagePrev: $('pagePrev'),
    pageNext: $('pageNext'),
    pageLabel: $('pageLabel'),
    pageStrip: $('pageStrip'),
    statusPlayers: $('statusPlayers'),
    btnCommand: $('btnCommand'),
    commandPalette: $('commandPalette'),
    commandInput: $('commandInput'),
    commandList: $('commandList'),
    cardToolbar: $('cardToolbar'),
    clubSummaryCrest: $('clubSummaryCrest'),
    clubSummaryName: $('clubSummaryName'),
    clubSummarySeason: $('clubSummarySeason'),
    saveDot: $('saveDot'),
    saveLabel: $('saveLabel'),
    modal: $('playerModal'),
    modalTitle: $('modalTitle'),
    modalSubtitle: $('modalSubtitle'),
    fName: $('fName'),
    fNumber: $('fNumber'),
    fBirth: $('fBirth'),
    fPosition: $('fPosition'),
    fPositionCustom: $('fPositionCustom'),
    fCaptain: $('fCaptain'),
    photoDrop: $('photoDrop'),
    photoPreview: $('photoPreview'),
    photoEmpty: $('photoEmpty'),
    btnRemovePhoto: $('btnRemovePhoto'),
    btnDelete: $('btnDelete'),
    btnSave: $('btnSave'),
    fileInput: $('fileInput'),
    jsonInput: $('jsonInput'),
    importModal: $('importModal'),
    importUrl: $('importUrl'),
    importStatus: $('importStatus'),
    btnImportUrl: $('btnImportUrl'),
    btnImportHtml: $('btnImportHtml'),
    siteHtmlInput: $('siteHtmlInput'),
    importPhotos: $('importPhotos'),
    importHtmlText: $('importHtmlText'),
    btnImportPaste: $('btnImportPaste'),
    btnSiteImport: $('btnSiteImport'),
    importTransportNote: $('importTransportNote'),
    toast: $('toast')
  };

  var state = null;
  var ui = {
    zoom: 0.8,
    autoFit: true,
    printColor: false,
    editing: null,
    saveTimer: null,
    toastTimer: null,
    lastFocus: null,
    dragId: null,
    suppressClickUntil: 0,
    importBusy: false,
    searchQuery: '',
    selectedId: '',
    currentPage: 1,
    sidebarCollapsed: false,
    themeMode: 'dark'
  };

  /* ------------------------------------------------------------
     Утилиты
     ------------------------------------------------------------ */

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function uid() {
    return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function plural(n, one, few, many) {
    var n10 = n % 10;
    var n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
    return many;
  }

  function playerWord(n) {
    return n + ' ' + plural(n, 'игрок', 'игрока', 'игроков');
  }

  function digits(value, max) {
    return String(value == null ? '' : value).replace(/\D+/g, '').slice(0, max || 3);
  }

  function maskDate(value) {
    var d = digits(value, 8);
    var out = d.slice(0, 2);
    if (d.length > 2) out += '.' + d.slice(2, 4);
    if (d.length > 4) out += '.' + d.slice(4, 8);
    return out;
  }

  function isValidDate(value) {
    if (!value) return true;
    var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
    if (!m) return false;
    var day = Number(m[1]);
    var month = Number(m[2]);
    var year = Number(m[3]);
    var date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  function cleanNumber(value) {
    var s = digits(value, 3);
    if (!s) return '';
    var n = parseInt(s, 10);
    return isNaN(n) ? '' : String(n);
  }

  function displayNumber(value) {
    var s = cleanNumber(value);
    return s || '—';
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(function (part) {
      return /[A-Za-zА-Яа-яЁё]/.test(part);
    });
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function nameFontSize(name) {
    var len = String(name || '').trim().length;
    if (len <= 16) return 15;
    if (len <= 19) return 13.5;
    if (len <= 23) return 12;
    if (len <= 27) return 10.5;
    return 9.5;
  }

  function normalizeHex(value) {
    var s = String(value || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : '#D9251C';
  }

  function isLightAccent(value) {
    var hex = normalizeHex(value);
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 165;
  }

  function applyAccentVars(accent) {
    accent = normalizeHex(accent);
    el.sheets.style.setProperty('--accent', accent);
    el.sheets.style.setProperty('--accent-ink', isLightAccent(accent) ? '#111111' : accent);
  }

  function normalizePlayer(raw) {
    raw = raw || {};
    var photo = typeof raw.photo === 'string' && /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(raw.photo)
      ? raw.photo
      : '';
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
      name: String(raw.name || '').trim().slice(0, 40),
      number: cleanNumber(raw.number),
      birth: maskDate(raw.birth),
      position: String(raw.position || '').trim().slice(0, 20),
      captain: raw.captain === true,
      photo: photo
    };
  }

  function ensureSingleCaptain(players) {
    var found = false;
    (players || []).forEach(function (player) {
      if (player.captain && !found) found = true;
      else player.captain = false;
    });
    return players;
  }

  function isLibero(player) {
    return /^либеро/i.test(String((player && player.position) || '').trim());
  }

  function cardBadges(player) {
    var out = '';
    if (player.captain) out += '<span class="card__badge card__badge--captain">К</span>';
    if (isLibero(player)) out += '<span class="card__badge card__badge--libero">Л</span>';
    return out;
  }

  function rowBadges(player) {
    var out = '';
    if (player.captain) out += '<span class="player-badge">К</span>';
    if (isLibero(player)) out += '<span class="player-badge player-badge--libero">Л</span>';
    return out;
  }

  function playerAge(birth) {
    var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(birth || ''));
    if (!m) return 0;
    var day = Number(m[1]);
    var month = Number(m[2]);
    var year = Number(m[3]);
    var now = new Date();
    var age = now.getFullYear() - year;
    if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age -= 1;
    return age > 0 && age < 100 ? age : 0;
  }

  function sanitizeProject(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.players)) return null;
    var team = raw.team && typeof raw.team === 'object' ? raw.team : {};
    var players = raw.players.slice(0, MAX_PLAYERS).map(normalizePlayer);
    ensureSingleCaptain(players);
    var logo = typeof team.logo === 'string' && /^data:image\/(jpeg|jpg|png);base64,/i.test(team.logo)
      ? team.logo
      : '';
    return {
      team: {
        name: String(team.name || '').trim().slice(0, 30),
        season: String(team.season || '').trim().slice(0, 18),
        accent: normalizeHex(team.accent),
        logo: logo
      },
      players: players
    };
  }

  function demoState() {
    var base = window.DEMO_PROJECT ? clone(window.DEMO_PROJECT) : {
      team: { name: 'НОВАЯ КОМАНДА', season: 'СЕЗОН 25/26', accent: '#D9251C', logo: '' },
      players: []
    };
    var clean = sanitizeProject(base) || { team: base.team, players: [] };
    clean.players.forEach(function (p) { p.id = uid(); });
    return clean;
  }

  function emptyState() {
    return {
      team: { name: 'НОВАЯ КОМАНДА', season: 'СЕЗОН 25/26', accent: '#D9251C', logo: '' },
      players: []
    };
  }

  /* ------------------------------------------------------------
     Хранилище
     ------------------------------------------------------------ */

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = sanitizeProject(JSON.parse(raw));
        if (parsed && parsed.team.accent === '#1F5BFF') {
          parsed.team.accent = '#D9251C';
        }
        if (parsed && parsed.team.name === 'ТРИНИКС ГРУПП' &&
            parsed.players.length === 18 &&
            parsed.players.every(function (player) { return !!player.photo; })) {
          return demoState();
        }
        if (parsed && parsed.players.length) return parsed;
        if (parsed) return parsed;
      }
    } catch (err) {
      console.warn('Паспорт команды: не удалось прочитать сохранение', err);
    }
    return demoState();
  }

  function saveNow() {
    clearTimeout(ui.saveTimer);
    ui.saveTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ team: state.team, players: state.players }));
      el.saveDot.classList.remove('is-saving', 'is-error');
      el.saveLabel.textContent = 'Сохранено локально';
    } catch (err) {
      console.warn('Паспорт команды: не удалось сохранить', err);
      el.saveDot.classList.remove('is-saving');
      el.saveDot.classList.add('is-error');
      el.saveLabel.textContent = 'Не сохранено';
      toast('Не хватает места в браузере. Скачайте проект в JSON, чтобы не потерять данные.', true);
    }
  }

  function scheduleSave() {
    el.saveDot.classList.remove('is-error');
    el.saveDot.classList.add('is-saving');
    el.saveLabel.textContent = 'Сохраняем…';
    clearTimeout(ui.saveTimer);
    ui.saveTimer = setTimeout(saveNow, 320);
  }

  /* ------------------------------------------------------------
     Отрисовка
     ------------------------------------------------------------ */

  function pad2(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function totalPages() {
    return Math.max(1, Math.ceil(state.players.length / PER_PAGE));
  }

  function updateHeader() {
    var t = state.team;
    var n = state.players.length;
    var pages = totalPages();
    var overlineText = 'Паспорт команды';
    applyAccentVars(t.accent);
    if (el.toolbarTeamName) {
      el.toolbarTeamName.textContent = t.name || 'Без названия';
      el.toolbarTeamName.setAttribute('title', t.name || 'Без названия');
    }

    Array.prototype.forEach.call(el.sheets.querySelectorAll('.sheet'), function (sheet) {
      var page = Number(sheet.getAttribute('data-page')) || 1;
      var name = sheet.querySelector('.sheet-head__main h1');
      var overline = sheet.querySelector('.sheet-head__top span');
      var meta = sheet.querySelector('.sheet-head__sub span:last-child');
      var monogram = sheet.querySelector('.team-logo__monogram');
      if (name) name.textContent = t.name || 'НАЗВАНИЕ КОМАНДЫ';
      if (overline) overline.textContent = overlineText;
      if (meta) {
        meta.textContent = [t.season, playerWord(n).toUpperCase(), pad2(page) + '/' + pad2(pages)]
          .filter(Boolean).join(' · ');
      }
      if (monogram) monogram.textContent = initials(t.name) || 'ТГ';
    });
  }

  function cardHtml(player) {
    var photo = player.photo
      ? '<img src="' + player.photo + '" alt="">'
      : '<div class="card__photo-empty">' + esc(initials(player.name) || '—') + '</div>';
    var name = player.name || 'Без имени';
    var position = player.position || '';
    var birth = player.birth || '';
    var selectedClass = player.id && player.id === ui.selectedId ? ' is-selected' : '';
    var captain = player.captain === true;
    var libero = isLibero(player);
    var noNumber = !player.number;
    var noPosition = !position;
    var layoutClass = (noNumber ? ' card--no-number' : '') + (noPosition ? ' card--no-position' : '');
    var label = 'Игрок ' + name + (player.number ? ', номер ' + player.number : '') +
      (captain ? ', капитан' : '') + (libero ? ', либеро' : '');
    var number = noNumber ? '' : displayNumber(player.number);
    var age = playerAge(birth);
    var subline = [];
    if (position) subline.push(position);
    if (age) subline.push(age + ' ' + plural(age, 'год', 'года', 'лет'));
    var meta = '';
    if (birth) {
      meta += '<span><i>Дата рождения</i><b>' + esc(birth) + '</b></span>';
    }
    return '' +
      '<article class="card card--club' + layoutClass + selectedClass + '" data-id="' + esc(player.id) + '" role="button" tabindex="0" title="Клик — изменить игрока" aria-label="' + esc(label) + '">' +
        '<div class="card__club-photo">' + photo + '</div>' +
        '<div class="card__club-body">' +
          (number ? '<span class="card__club-watermark">' + esc(number) + '</span><span class="card__club-number">' + esc(number) + '</span>' : '') +
          '<div class="card__club-name-row">' +
            '<span class="card__club-name">' + esc(name) + '</span>' +
            cardBadges(player) +
          '</div>' +
          '<div class="card__club-subline">' + esc(subline.join(' · ')) + '</div>' +
          '<div class="card__club-meta">' + meta + '</div>' +
        '</div>' +
      '</article>';
  }

  function emptyCardHtml() {
    return '' +
      '<article class="card card--empty" data-empty="1" role="button" tabindex="0" aria-label="Добавить игрока">' +
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
        '<span>Добавить игрока<span class="card--empty__hint">Свободное место</span></span>' +
      '</article>';
  }

  function positionCardToolbar() {
    if (!el.cardToolbar) return;
    var card = ui.selectedId
      ? el.sheets.querySelector('.card[data-id="' + ui.selectedId + '"]')
      : null;
    if (!card) {
      el.cardToolbar.hidden = true;
      return;
    }
    var workspace = document.querySelector('.workspace');
    var cardRect = card.getBoundingClientRect();
    var workRect = workspace.getBoundingClientRect();
    var toolbarWidth = el.cardToolbar.offsetWidth || 112;
    var left = cardRect.right - workRect.left - toolbarWidth;
    var top = cardRect.top - workRect.top - 38;
    left = Math.max(8, Math.min(left, workRect.width - toolbarWidth - 8));
    top = Math.max(64, top);
    el.cardToolbar.hidden = false;
    el.cardToolbar.style.left = left + 'px';
    el.cardToolbar.style.top = top + 'px';
  }

  function selectCard(id, scrollTo) {
    ui.selectedId = id || '';
    Array.prototype.forEach.call(el.sheets.querySelectorAll('.card[data-id]'), function (card) {
      card.classList.toggle('is-selected', card.getAttribute('data-id') === ui.selectedId);
    });
    renderRoster();
    positionCardToolbar();
    if (scrollTo && ui.selectedId) {
      var selected = el.sheets.querySelector('.card[data-id="' + ui.selectedId + '"]');
      if (selected) selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function clearSelection() {
    ui.selectedId = '';
    Array.prototype.forEach.call(el.sheets.querySelectorAll('.card.is-selected'), function (card) {
      card.classList.remove('is-selected');
    });
    Array.prototype.forEach.call(el.rosterList.querySelectorAll('.player-row.is-selected'), function (row) {
      row.classList.remove('is-selected');
    });
    if (el.cardToolbar) el.cardToolbar.hidden = true;
  }

  function duplicatePlayer(id) {
    var source = state.players.filter(function (p) { return p.id === id; })[0];
    if (!source) return;
    if (state.players.length >= MAX_PLAYERS) {
      toast('Достигнут лимит: ' + MAX_PLAYERS + ' игроков.', true);
      return;
    }
    var copy = clone(source);
    copy.id = uid();
    var index = state.players.indexOf(source);
    state.players.splice(index + 1, 0, copy);
    ensureSingleCaptain(state.players);
    ui.selectedId = copy.id;
    renderAll();
    saveNow();
    toast('Игрок продублирован');
  }

  function deletePlayerById(id) {
    var player = state.players.filter(function (p) { return p.id === id; })[0];
    if (!player) return;
    if (!window.confirm('Удалить игрока «' + (player.name || 'Без имени') + '» с листа?')) return;
    state.players = state.players.filter(function (p) { return p.id !== id; });
    clearSelection();
    renderAll();
    saveNow();
    toast('Игрок удалён');
  }

  function renderSheet() {
    var t = state.team;
    var n = state.players.length;
    var pages = totalPages();
    var overline = 'Паспорт команды';
    var logoInner = t.logo
      ? '<img src="' + t.logo + '" alt="Логотип команды">'
      : '<span class="team-logo__monogram">' + esc(initials(t.name) || 'ТГ') + '</span>';
    var logoOverlay = t.logo ? 'Заменить логотип' : 'Загрузить логотип';
    var html = '';

    for (var page = 0; page < pages; page++) {
      var pagePlayers = state.players.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
      var slots = pagePlayers.length === 0 ? 3 : Math.ceil(pagePlayers.length / 3) * 3;
      var cards = '';
      for (var i = 0; i < slots; i++) {
        cards += i < pagePlayers.length ? cardHtml(pagePlayers[i]) : emptyCardHtml();
      }

      var meta = [t.season, playerWord(n).toUpperCase(), pad2(page + 1) + '/' + pad2(pages)]
        .filter(Boolean).join(' · ');
      var headMeta = [playerWord(n).toUpperCase(), pad2(page + 1) + '/' + pad2(pages)]
        .filter(Boolean).join(' · ');
      var headClass = isLightAccent(t.accent) ? ' is-light' : '';

      html += '' +
        '<section class="sheet" data-page="' + (page + 1) + '">' +
          '<header class="sheet-head' + headClass + '">' +
            '<div class="sheet-head__brand">' +
              '<img class="fed-logo" src="assets/brand/fed-mark.png" alt="ПГФВ">' +
              '<div class="sheet-head__text">' +
                '<div class="sheet-head__top"><span>' + esc(overline) + '</span></div>' +
                '<div class="sheet-head__main"><h1>' + esc(t.name || 'НАЗВАНИЕ КОМАНДЫ') + '</h1></div>' +
              '</div>' +
              '<div class="sheet-head__right">' +
                '<div class="sheet-head__meta">' +
                  '<strong>' + esc(t.season || 'Сезон не указан') + '</strong>' +
                  '<span>' + esc(headMeta) + '</span>' +
                '</div>' +
                '<button class="team-logo' + (t.logo ? ' has-logo' : ' is-empty') + '" type="button" data-team-logo aria-label="' + esc(logoOverlay) + '">' +
                  logoInner +
                  '<span class="team-logo__overlay">' + esc(logoOverlay) + '</span>' +
                '</button>' +
              '</div>' +
            '</div>' +
            '<div class="sheet-head__sub">' +
              '<span>Пермская городская федерация волейбола (ПГФВ)</span>' +
              '<span>Официальная заявка</span>' +
            '</div>' +
            '<div class="sheet-head__rule"><i></i><i></i></div>' +
          '</header>' +
          '<div class="cards">' + cards + '</div>' +
        '</section>';
    }

    applyAccentVars(t.accent);
    el.sheets.innerHTML = html;
    if (ui.autoFit) fitZoom();
    else applyZoom();
    updatePageNav();
    positionCardToolbar();
  }

  function renderRoster() {
    var n = state.players.length;
    el.rosterCount.textContent = n;
    el.rosterLimit.textContent = n >= MAX_PLAYERS
      ? 'Лимит: ' + MAX_PLAYERS + ' игроков'
      : 'Можно добавить ещё ' + (MAX_PLAYERS - n) + ' · по 18 на лист';
    el.rosterLimit.classList.toggle('is-warning', n >= MAX_PLAYERS);
    el.btnAdd.disabled = n >= MAX_PLAYERS;
    if (el.btnAddBottom) el.btnAddBottom.disabled = n >= MAX_PLAYERS;

    if (!n) {
      el.rosterList.innerHTML = '<div class="roster__empty"><strong>Пока пусто.</strong><br>Добавьте первого игрока — карточка сразу появится на листе.</div>';
      return;
    }

    var query = (ui.searchQuery || '').trim().toLowerCase();
    var visible = state.players.filter(function (p) {
      if (!query) return true;
      return [p.name, p.number, p.position].join(' ').toLowerCase().indexOf(query) !== -1;
    });
    if (!visible.length) {
      el.rosterList.innerHTML = '<div class="roster__empty"><strong>Ничего не найдено.</strong><br>Попробуйте фамилию, номер или амплуа.</div>';
      return;
    }

    var html = '';
    visible.forEach(function (p) {
      var avatar = p.photo
        ? '<img class="player-row__photo" src="' + p.photo + '" alt="">'
        : '<div class="player-row__photo player-row__photo--empty">' + esc(initials(p.name) || '—') + '</div>';
      var meta = [p.position || 'Амплуа не указано', p.birth || ''].filter(Boolean).join(' · ');
      html += '' +
        '<button class="player-row' + (p.id === ui.selectedId ? ' is-selected' : '') + '" type="button" data-id="' + esc(p.id) + '" draggable="true" title="Изменить игрока">' +
          '<span class="player-row__grip" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>' +
          '<span class="player-row__num' + (p.number ? '' : ' is-empty') + (p.captain ? ' is-captain' : '') + (isLibero(p) ? ' is-libero' : '') + '">' + (p.number ? esc(displayNumber(p.number)) : '—') + '</span>' +
          avatar +
          '<span class="player-row__main">' +
            '<span class="player-row__name">' + esc(p.name || 'Без имени') + rowBadges(p) + '</span>' +
            '<span class="player-row__meta" title="' + esc(meta) + '">' + esc(meta) + '</span>' +
          '</span>' +
          '<span class="player-row__edit" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" fill="none"><path d="M4 16.5V20h3.5L19 8.5 15.5 5 4 16.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m14 6.5 3.5 3.5" stroke="currentColor" stroke-width="1.6"/></svg>' +
          '</span>' +
        '</button>';
    });
    el.rosterList.innerHTML = html;
  }

  function updateCounts() {
    var n = state.players.length;
    var pages = totalPages();
    el.rosterCount.textContent = n;
    el.toolbarCount.textContent = playerWord(n) +
      (pages > 1 ? ' · ' + pages + ' ' + plural(pages, 'лист', 'листа', 'листов') : '');
    if (el.statusPlayers) el.statusPlayers.textContent = playerWord(n);
    if (el.toolbarTeamName) el.toolbarTeamName.textContent = state.team.name || 'Без названия';
    updateUiWarning();
    updateHeader();
    updatePageNav();
  }

  function updateUiWarning() {
    if (!el.uiWarning) return;
    var missing = state.players.some(function (player) {
      return !player.number || !player.position;
    });
    var changed = el.uiWarning.hidden !== !missing;
    el.uiWarning.hidden = !missing;
    if (changed) fitZoom();
  }

  function renderTeamFields() {
    el.teamName.value = state.team.name;
    el.teamSeason.value = state.team.season;
    el.accentCustom.value = state.team.accent;
    markSwatch(state.team.accent);
    renderLogoUI();
    renderClubSummary();
  }

  function renderClubSummary() {
    if (!el.clubSummaryName) return;
    var t = state.team;
    el.clubSummaryName.textContent = t.name || 'Без названия';
    el.clubSummarySeason.textContent = t.season || 'Сезон не указан';
    if (el.clubSummaryCrest) {
      if (t.logo) {
        el.clubSummaryCrest.innerHTML = '<img alt="" src="' + t.logo + '">';
      } else {
        el.clubSummaryCrest.textContent = initials(t.name) || 'ТГ';
      }
    }
  }

  function renderLogoUI() {
    var logo = state.team.logo;
    if (logo) {
      el.teamLogoPreview.src = logo;
      el.teamLogoPreview.hidden = false;
      el.teamLogoPlus.hidden = true;
      el.teamLogoThumb.classList.add('has-logo');
      el.teamLogoRemove.hidden = false;
    } else {
      el.teamLogoPreview.src = TRANSPARENT_PIXEL;
      el.teamLogoPreview.hidden = true;
      el.teamLogoPlus.hidden = false;
      el.teamLogoThumb.classList.remove('has-logo');
      el.teamLogoRemove.hidden = true;
    }
  }

  function markSwatch(color) {
    color = normalizeHex(color);
    var found = false;
    Array.prototype.forEach.call(el.swatches.querySelectorAll('.swatch[data-color]'), function (b) {
      var active = b.getAttribute('data-color').toUpperCase() === color;
      b.classList.toggle('is-active', active);
      if (active) found = true;
    });
    var custom = el.swatches.querySelector('.swatch--custom');
    if (custom) custom.classList.toggle('is-active', !found);
  }

  function renderAll() {
    renderTeamFields();
    renderRoster();
    renderSheet();
    updateCounts();
  }

  /* ------------------------------------------------------------
     Масштаб
     ------------------------------------------------------------ */

  function applyZoom() {
    var z = ui.zoom;
    var pages = Math.max(1, el.sheets.children.length);
    var stackHeight = pages * SHEET_H + (pages - 1) * SHEET_GAP;
    el.sheetStage.style.width = (SHEET_W * z) + 'px';
    el.sheetStage.style.height = (stackHeight * z) + 'px';
    el.sheets.style.transform = 'scale(' + z + ')';
    el.zoomLabel.textContent = Math.round(z * 100) + '%';
  }

  function setZoom(value, manual) {
    ui.zoom = Math.max(0.25, Math.min(1.4, value));
    if (manual) ui.autoFit = false;
    applyZoom();
  }

  function fitZoom() {
    var rect = el.canvas.getBoundingClientRect();
    var availW = Math.max(320, rect.width - 76);
    var availH = Math.max(240, rect.height - 72);
    var pages = totalPages();
    var z = availW / SHEET_W;
    if (pages === 1) {
      z = Math.min(z, availH / SHEET_H);
    }
    z = Math.max(0.3, Math.min(1.2, z));
    ui.autoFit = true;
    ui.zoom = z;
    applyZoom();
    updatePageNav();
  }

  function setPage(page, smooth) {
    var pages = totalPages();
    var next = Math.max(1, Math.min(pages, Number(page) || 1));
    ui.currentPage = next;
    var sheet = el.sheets.querySelector('.sheet[data-page="' + next + '"]');
    if (sheet) {
      var top = sheet.offsetTop * ui.zoom;
      if (typeof el.canvas.scrollTo === 'function') {
        el.canvas.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
      } else {
        el.canvas.scrollTop = Math.max(0, top);
      }
    }
    updatePageNav();
  }

  function updatePageNav() {
    var pages = totalPages();
    if (ui.currentPage > pages) ui.currentPage = pages;
    if (ui.currentPage < 1) ui.currentPage = 1;
    if (el.pageLabel) el.pageLabel.textContent = ui.currentPage + ' / ' + pages;
    if (el.pagePrev) el.pagePrev.disabled = ui.currentPage <= 1;
    if (el.pageNext) el.pageNext.disabled = ui.currentPage >= pages;
    if (!el.pageStrip) return;

    if (pages <= 1) {
      el.pageStrip.hidden = true;
      el.pageStrip.innerHTML = '';
      return;
    }
    el.pageStrip.hidden = false;
    var html = '';
    for (var i = 1; i <= pages; i++) {
      html += '<button type="button" class="page-chip' + (i === ui.currentPage ? ' is-active' : '') + '" data-page="' + i + '" aria-label="Страница ' + i + '">' +
        '<span class="page-chip__sheet"></span><span class="page-chip__num">' + i + '</span></button>';
    }
    el.pageStrip.innerHTML = html;
  }

  function syncPageFromScroll() {
    var pages = totalPages();
    if (pages <= 1) {
      ui.currentPage = 1;
      updatePageNav();
      return;
    }
    var pageH = (SHEET_H + SHEET_GAP) * ui.zoom;
    var next = Math.max(1, Math.min(pages, Math.floor((el.canvas.scrollTop + pageH * 0.35) / pageH) + 1));
    if (next !== ui.currentPage) {
      ui.currentPage = next;
      updatePageNav();
    }
  }

  /* ------------------------------------------------------------
     Модальное окно игрока
     ------------------------------------------------------------ */

  function openEditor(id) {
    var existing = id ? state.players.filter(function (p) { return p.id === id; })[0] : null;
    if (!existing && state.players.length >= MAX_PLAYERS) {
      toast('Достигнут лимит: ' + MAX_PLAYERS + ' игроков.', true);
      return;
    }

    var draft = existing ? clone(existing) : {
      id: uid(), name: '', number: '', birth: '', position: '', photo: ''
    };

    ui.editing = { id: draft.id, isNew: !existing, draft: draft, original: existing ? clone(existing) : null };
    ui.lastFocus = document.activeElement;

    el.modalTitle.textContent = existing ? 'Игрок' : 'Новый игрок';
    el.fName.value = draft.name;
    el.fNumber.value = draft.number;
    el.fBirth.value = draft.birth;
    var presetPosition = POSITIONS.indexOf(draft.position) !== -1;
    el.fPosition.value = draft.position
      ? (presetPosition ? draft.position : '__custom')
      : '';
    el.fPositionCustom.value = presetPosition ? '' : draft.position;
    el.fCaptain.checked = draft.captain === true;
    syncCustomPosition(false);
    updateModalSubtitle();
    updatePhotoPreview(draft.photo);

    el.btnDelete.style.visibility = existing ? 'visible' : 'hidden';
    el.modal.classList.add('is-open');
    el.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    setTimeout(function () { el.fName.focus(); el.fName.select(); }, 60);
  }

  function closeEditor() {
    el.modal.classList.remove('is-open');
    el.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    ui.editing = null;
    if (ui.lastFocus && typeof ui.lastFocus.focus === 'function') {
      setTimeout(function () { ui.lastFocus.focus(); }, 40);
    }
  }

  function updatePhotoPreview(photo) {
    if (photo) {
      el.photoPreview.src = photo;
      el.photoDrop.classList.add('has-photo');
      el.btnRemovePhoto.disabled = false;
    } else {
      el.photoPreview.src = TRANSPARENT_PIXEL;
      el.photoDrop.classList.remove('has-photo');
      el.btnRemovePhoto.disabled = true;
    }
  }

  function syncCustomPosition(focus) {
    var custom = el.fPosition.value === '__custom';
    el.fPositionCustom.hidden = !custom;
    if (custom && focus) {
      el.fPositionCustom.focus();
    }
  }

  function updateModalSubtitle() {
    if (!ui.editing) return;
    if (ui.editing.isNew) {
      el.modalSubtitle.textContent = el.fCaptain.checked
        ? 'Новый игрок · капитан команды'
        : 'Заполните карточку — она сразу появится на листе';
      return;
    }
    var position = el.fPosition.value === '__custom'
      ? el.fPositionCustom.value.trim()
      : el.fPosition.value;
    var number = digits(el.fNumber.value, 3);
    var bits = [];
    if (position) bits.push(position);
    if (number) bits.push('№ ' + displayNumber(number));
    if (el.fCaptain.checked) bits.push('Капитан');
    el.modalSubtitle.textContent = bits.join(' · ') || 'Карточка на паспорте команды';
  }

  function saveEditor() {
    if (!ui.editing) return;
    var draft = ui.editing.draft;
    var name = el.fName.value.trim().replace(/\s+/g, ' ');
    if (!name) {
      toast('Впишите фамилию и имя игрока.', true);
      el.fName.focus();
      return;
    }

    var birth = maskDate(el.fBirth.value);
    if (!isValidDate(birth)) {
      toast('Проверьте дату рождения: нужен формат дд.мм.гггг.', true);
      el.fBirth.focus();
      return;
    }

    var player = normalizePlayer({
      id: draft.id,
      name: name,
      number: el.fNumber.value,
      birth: birth,
      position: el.fPosition.value === '__custom'
        ? el.fPositionCustom.value.trim()
        : el.fPosition.value,
      captain: el.fCaptain.checked,
      photo: draft.photo
    });

    if (player.captain) {
      state.players.forEach(function (other) {
        if (other.id !== player.id) other.captain = false;
      });
    }

    var wasNew = ui.editing.isNew;
    if (wasNew) {
      state.players.push(player);
    } else {
      var index = state.players.findIndex(function (p) { return p.id === player.id; });
      if (index !== -1) state.players[index] = player;
    }

    closeEditor();
    renderRoster();
    renderSheet();
    updateCounts();
    saveNow();
    toast(wasNew ? (name + ' — на листе') : 'Изменения сохранены');
  }

  function deleteEditorPlayer() {
    if (!ui.editing) return;
    if (ui.editing.isNew) { closeEditor(); return; }
    var player = ui.editing.draft;
    if (!window.confirm('Удалить игрока «' + (player.name || 'Без имени') + '» с листа?')) return;
    state.players = state.players.filter(function (p) { return p.id !== player.id; });
    closeEditor();
    renderRoster();
    renderSheet();
    updateCounts();
    saveNow();
    toast('Игрок удалён');
  }

  /* ------------------------------------------------------------
     Фотографии
     ------------------------------------------------------------ */

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('image')); };
      img.src = src;
    });
  }

  function imageFileToDataURL(file) {
    if (!file || !/^image\//.test(file.type)) {
      return Promise.reject(new Error('type'));
    }
    if (file.size > 20 * 1024 * 1024) {
      return Promise.reject(new Error('size'));
    }
    var url = URL.createObjectURL(file);
    return loadImage(url).then(function (img) {
      var target = 0.75;
      var sw = img.naturalWidth || img.width;
      var sh = img.naturalHeight || img.height;
      if (!sw || !sh) throw new Error('image');
      var cropW = sw;
      var cropH = sh;
      if (sw / sh > target) cropW = sh * target;
      else cropH = sw / target;
      var sx = (sw - cropW) / 2;
      var sy = (sh - cropH) / 2;
      var canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 640;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, 480, 640);
      return canvas.toDataURL('image/jpeg', 0.86);
    }).finally(function () {
      URL.revokeObjectURL(url);
    });
  }

  function handlePhotoFile(file) {
    if (!ui.editing) return;
    imageFileToDataURL(file).then(function (data) {
      if (!ui.editing) return;
      ui.editing.draft.photo = data;
      updatePhotoPreview(data);
    }).catch(function (err) {
      if (err && err.message === 'size') toast('Фото слишком большое — выберите файл до 20 МБ.', true);
      else if (err && err.message === 'type') toast('Это не изображение. Нужен JPG или PNG.', true);
      else toast('Не удалось прочитать фото. Попробуйте другой файл.', true);
    });
  }

  function logoFileToDataURL(file) {
    if (!file || !/^image\//.test(file.type)) {
      return Promise.reject(new Error('type'));
    }
    if (file.size > 15 * 1024 * 1024) {
      return Promise.reject(new Error('size'));
    }
    var url = URL.createObjectURL(file);
    return loadImage(url).then(function (img) {
      var sw = img.naturalWidth || img.width;
      var sh = img.naturalHeight || img.height;
      if (!sw || !sh) throw new Error('image');
      var canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      var ctx = canvas.getContext('2d');
      var padding = 28;
      var box = 600 - padding * 2;
      var scale = Math.min(box / sw, box / sh);
      var w = sw * scale;
      var h = sh * scale;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, (600 - w) / 2, (600 - h) / 2, w, h);
      return canvas.toDataURL('image/png');
    }).finally(function () {
      URL.revokeObjectURL(url);
    });
  }

  function applyTeamLogo(file) {
    logoFileToDataURL(file).then(function (data) {
      state.team.logo = data;
      renderLogoUI();
      renderSheet();
      saveNow();
      toast('Логотип команды добавлен');
    }).catch(function (err) {
      if (err && err.message === 'size') toast('Логотип слишком большой — выберите файл до 15 МБ.', true);
      else if (err && err.message === 'type') toast('Это не изображение. Нужен PNG или JPG.', true);
      else toast('Не удалось прочитать логотип. Попробуйте PNG с прозрачным фоном.', true);
    });
  }

  function removeTeamLogo() {
    if (!state.team.logo) return;
    state.team.logo = '';
    renderLogoUI();
    renderSheet();
    saveNow();
    toast('Логотип команды убран');
  }

  function makeTeamLogoPlaceholder() {
    var canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 600, 600);
    ctx.fillStyle = '#05488F';
    ctx.font = '800 230px "Montserrat", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials(state.team.name) || 'ТГ', 300, 300);
    return canvas.toDataURL('image/png');
  }

  function applyPhotoToPlayer(id, file) {
    var player = state.players.filter(function (p) { return p.id === id; })[0];
    if (!player) return;
    imageFileToDataURL(file).then(function (data) {
      player.photo = data;
      renderRoster();
      renderSheet();
      saveNow();
      toast('Фото обновлено');
    }).catch(function () {
      toast('Не удалось прочитать фото.', true);
    });
  }

  /* ------------------------------------------------------------
     Импорт со страницы команды ПГФВ
     ------------------------------------------------------------ */

  function setImportStatus(message, type) {
    el.importStatus.textContent = message || '';
    el.importStatus.classList.toggle('is-error', type === 'error');
    el.importStatus.classList.toggle('is-ok', type === 'ok');
  }

  function setImportBusy(busy) {
    ui.importBusy = busy;
    el.btnImportUrl.disabled = busy;
    el.btnImportHtml.disabled = busy;
    el.btnImportPaste.disabled = busy;
  }

  function openImportModal(prefill) {
    if (el.modal.classList.contains('is-open')) closeEditor();
    if (prefill) el.importUrl.value = prefill;
    setImportStatus('');
    if (el.importTransportNote) {
      if (location.protocol === 'file:') {
        el.importTransportNote.textContent = 'Для импорта по ссылке запустите приложение через «Открыть паспорт команды.bat» — он поднимет локальный прокси. Или загрузите сохранённый HTML.';
      } else if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
        el.importTransportNote.textContent = 'Локальный прокси активен: вставьте ссылку на страницу команды — данные и фото загрузятся автоматически.';
      } else {
        el.importTransportNote.textContent = 'При работе на сайте ПГФВ данные и фотографии загружаются напрямую.';
      }
    }
    el.importModal.classList.add('is-open');
    el.importModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(function () { el.importUrl.focus(); el.importUrl.select(); }, 60);
  }

  function closeImportModal(force) {
    if (ui.importBusy && !force) return;
    el.importModal.classList.remove('is-open');
    el.importModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function importedPlayers(list) {
    return (list || []).slice(0, MAX_PLAYERS).map(function (raw) {
      var photo = typeof raw.photo === 'string' && /^data:image\//.test(raw.photo) ? raw.photo : '';
      var photoUrl = '';
      if (!photo) {
        if (typeof raw.photoUrl === 'string') photoUrl = raw.photoUrl;
        else if (typeof raw.photo === 'string' && /^https?:\/\//i.test(raw.photo)) photoUrl = raw.photo;
      }
      return {
        id: uid(),
        name: String(raw.name || '').trim().slice(0, 40),
        number: cleanNumber(raw.number),
        birth: maskDate(raw.birth),
        position: String(raw.position || '').trim().slice(0, 20),
        captain: raw.captain === true,
        photo: photo,
        photoUrl: photoUrl,
        photoFallback: typeof raw.photoFallback === 'string' ? raw.photoFallback : ''
      };
    }).filter(function (player) { return !!player.name; });
  }

  async function attachImportedPhotos(players, useProxy, onProgress) {
    var tasks = players.filter(function (p) { return p.photoUrl && !p.photo; });
    var total = tasks.length;
    if (!total) return { total: 0, failed: 0 };

    var next = 0;
    var done = 0;
    var failed = 0;

    async function worker() {
      while (true) {
        var index = next++;
        if (index >= tasks.length) return;
        var player = tasks[index];
        try {
          var blob = await window.SiteImport.fetchPhotoBlob(player.photoUrl, player.photoFallback, useProxy);
          var file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
          player.photo = await imageFileToDataURL(file);
        } catch (err) {
          failed += 1;
        }
        done += 1;
        if (onProgress) onProgress(done, total);
      }
    }

    var workers = [];
    var count = Math.min(4, total);
    for (var i = 0; i < count; i++) workers.push(worker());
    await Promise.all(workers);
    return { total: total, failed: failed };
  }

  function splitTeamNameSeason(raw) {
    var source = String(raw || '').trim();
    if (!source) return { name: '', season: '' };
    var match = source.match(/^(.*?)(?:\s*[\(\[]\s*(20\d{2})\s*[\)\]]|\s*[-–—]?\s*(20\d{2}))\s*$/);
    if (!match) return { name: source, season: '' };
    var year = Number(match[2] || match[3]);
    if (!year) return { name: source, season: '' };
    var base = match[1].replace(/[\s\-–—·,]+$/, '').trim();
    var end = year % 100;
    var start = (end + 99) % 100;
    return {
      name: base || source,
      season: 'СЕЗОН ' + pad2(start) + '/' + pad2(end)
    };
  }

  function seasonFromTeamName(name) {
    return splitTeamNameSeason(name).season;
  }

  async function applyImportedTeam(parsed, options) {
    options = options || {};
    if (!parsed || !Array.isArray(parsed.players) || !parsed.players.length) {
      throw new Error('players');
    }
    if (state.players.length && !options.force) {
      var ok = window.confirm('Заменить текущий состав (' + state.players.length + ' игроков) данными со страницы?');
      if (!ok) return { cancelled: true };
    }

    var players = importedPlayers(parsed.players);
    if (!players.length) throw new Error('players');
    ensureSingleCaptain(players);
    if (parsed.teamName) {
      var importedName = splitTeamNameSeason(parsed.teamName);
      state.team.name = String(importedName.name || parsed.teamName).toLocaleUpperCase('ru-RU').slice(0, 30);
      if (options.deriveSeason !== false) {
        var derivedSeason = importedName.season || seasonFromTeamName(parsed.teamName);
        if (derivedSeason) state.team.season = derivedSeason;
      }
    }

    setImportBusy(true);
    var incomingLogo = options.logo || '';
    if (!incomingLogo) state.team.logo = '';
    if (!incomingLogo && parsed.logoUrl && window.SiteImport) {
      setImportStatus('Загружаю логотип команды…');
      try {
        var logoBlob = await window.SiteImport.fetchPhotoBlob(parsed.logoUrl, '', true);
        var logoFile = new File([logoBlob], 'team-logo.png', { type: logoBlob.type || 'image/png' });
        incomingLogo = await logoFileToDataURL(logoFile);
        state.team.logo = incomingLogo;
      } catch (err) {
        incomingLogo = '';
      }
    }
    if (incomingLogo) state.team.logo = incomingLogo;

    var failed = 0;
    var withPhotos = options.photos !== undefined ? options.photos : el.importPhotos.checked;
    if (withPhotos) {
      var pending = players.filter(function (p) { return p.photoUrl && !p.photo; }).length;
      if (pending) setImportStatus('Загружаю фотографии 0/' + pending + '…');
      var result = await attachImportedPhotos(players, true, function (done, total) {
        setImportStatus('Загружаю фотографии ' + done + '/' + total + '…');
      });
      failed = result.failed;
    }

    state.players = players.map(function (player) {
      delete player.photoUrl;
      delete player.photoFallback;
      return player;
    });

    renderAll();
    saveNow();
    closeImportModal(true);
    var message = 'Импортировано: ' + playerWord(players.length);
    if (failed) message += ' · ' + failed + ' фото не загрузились';
    toast(message, failed > 0);
    return { players: players.length, failed: failed };
  }

  async function loadSiteUrl(options) {
    options = options || {};
    if (ui.importBusy) return;
    var url = el.importUrl.value.trim();
    if (!/^https?:\/\//i.test(url)) {
      setImportStatus('Вставьте полную ссылку на страницу команды.', 'error');
      return;
    }

    setImportBusy(true);
    setImportStatus('Загружаю страницу…');
    try {
      if (!window.SiteImport) throw new Error('SiteImport');
      var parsed = await window.SiteImport.fetchPage(url);
      if (!parsed.players.length) throw new Error('players');
      setImportStatus('Найдено: ' + playerWord(parsed.players.length), 'ok');
      await applyImportedTeam(parsed, { photos: el.importPhotos.checked, force: !!options.force });
    } catch (err) {
      if (err && err.message === 'players') {
        setImportStatus('На странице не найдены игроки. Откройте страницу конкретной команды, а не списка групп.', 'error');
      } else if (location.protocol === 'file:') {
        setImportStatus('Для импорта по ссылке запустите «Открыть паспорт команды.bat» (локальный прокси). Либо сохраните страницу через Ctrl+S и загрузите HTML-файл ниже.', 'error');
      } else {
        setImportStatus('Не удалось получить страницу. Сохраните её через Ctrl+S и загрузите HTML-файл ниже.', 'error');
      }
    } finally {
      setImportBusy(false);
    }
  }

  async function loadSiteHtml(html, baseUrl) {
    if (!html || !html.trim()) {
      setImportStatus('HTML пуст.', 'error');
      return;
    }
    try {
      if (!window.SiteImport) throw new Error('SiteImport');
      var parsed = window.SiteImport.parseTeamHtml(html, baseUrl);
      if (!parsed.players.length) throw new Error('players');
      if (window.SiteImport.resolveTeamLogo) {
        try {
          parsed.logoUrl = await window.SiteImport.resolveTeamLogo(baseUrl, parsed.postId);
        } catch (err) { /* без логотипа */ }
      }
      el.importUrl.value = baseUrl || el.importUrl.value;
      setImportStatus('Найдено: ' + playerWord(parsed.players.length), 'ok');
      await applyImportedTeam(parsed, { photos: el.importPhotos.checked });
    } catch (err) {
      setImportStatus('В этом HTML не найдены карточки игроков. Нужна страница команды ПГФВ.', 'error');
    } finally {
      setImportBusy(false);
    }
  }

  function importedBaseUrl() {
    var value = el.importUrl.value.trim();
    return /^https?:\/\//i.test(value) ? value : 'https://perm-volley.ru/';
  }

  async function importTeamData(payload, options) {
    options = options || {};
    if (!payload || !Array.isArray(payload.players)) {
      throw new Error('payload');
    }

    var team = payload.team && typeof payload.team === 'object' ? payload.team : {};
    var name = payload.teamName || team.name;
    if (name) state.team.name = String(name).toLocaleUpperCase('ru-RU').slice(0, 30);
    if (team.season) state.team.season = String(team.season).toLocaleUpperCase('ru-RU').slice(0, 18);
    if (team.accent) state.team.accent = normalizeHex(team.accent);
    if (team.logo && /^data:image\/(jpeg|jpg|png);base64,/i.test(team.logo)) state.team.logo = team.logo;

    var result = await applyImportedTeam({
      teamName: name || state.team.name,
      players: payload.players
    }, {
      force: true,
      photos: options.photos !== false,
      deriveSeason: !team.season,
      logo: team.logo && /^data:image\/(jpeg|jpg|png);base64,/i.test(team.logo) ? team.logo : ''
    });
    return result;
  }

  function bindImport() {
    el.btnSiteImport.addEventListener('click', function () { openImportModal(); });

    el.importModal.addEventListener('click', function (event) {
      if (event.target.closest('[data-close-import]')) closeImportModal();
    });

    el.btnImportUrl.addEventListener('click', loadSiteUrl);
    el.importUrl.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        loadSiteUrl();
      }
    });

    el.btnImportHtml.addEventListener('click', function () { el.siteHtmlInput.click(); });

    el.siteHtmlInput.addEventListener('change', function () {
      var file = el.siteHtmlInput.files && el.siteHtmlInput.files[0];
      el.siteHtmlInput.value = '';
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () { loadSiteHtml(String(reader.result || ''), importedBaseUrl()); };
      reader.onerror = function () { setImportStatus('Не удалось прочитать HTML-файл.', 'error'); };
      reader.readAsText(file);
    });

    el.btnImportPaste.addEventListener('click', function () {
      var html = el.importHtmlText.value;
      loadSiteHtml(html, importedBaseUrl());
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (el.importModal.classList.contains('is-open')) closeImportModal();
    });

    window.addEventListener('message', function (event) {
      var data = event.data;
      if (!data || data.type !== 'teampass:import') return;
      var originOk = event.origin === location.origin;
      try {
        var host = new URL(event.origin).hostname;
        if (/(^|\.)perm-volley\.ru$/i.test(host)) originOk = true;
      } catch (err) { /* file:// */ }
      if (!originOk) return;
      importTeamData(data.payload, { photos: true }).catch(function () {
        toast('Не удалось импортировать данные команды.', true);
      });
    });
  }

  /* ------------------------------------------------------------
     Проект: JSON, демо, очистка
     ------------------------------------------------------------ */

  function fileBase() {
    var name = (state.team.name || 'Команда').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
    return 'Паспорт команды — ' + (name || 'Команда');
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      a.remove();
      URL.revokeObjectURL(url);
    }, 2500);
  }

  function downloadJson() {
    var payload = {
      format: 'team-passport',
      version: 1,
      savedAt: new Date().toISOString(),
      team: state.team,
      players: state.players
    };
    download(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), fileBase() + '.json');
    toast('Проект сохранён в JSON');
  }

  function importJsonFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result || ''));
        var clean = sanitizeProject(parsed);
        if (!clean) throw new Error('format');
        if (state.players.length && !window.confirm('Заменить текущий состав данными из файла?')) return;
        state = clean;
        renderAll();
        fitZoom();
        saveNow();
        toast('Проект загружен: ' + playerWord(state.players.length));
      } catch (err) {
        toast('Не получилось прочитать проект. Нужен JSON, созданный в «Паспорте команды».', true);
      }
    };
    reader.onerror = function () { toast('Не удалось открыть файл.', true); };
    reader.readAsText(file);
  }

  function loadDemo() {
    if (!window.confirm('Вернуть демо-состав из примера? Текущие изменения будут заменены.')) return;
    state = demoState();
    renderAll();
    fitZoom();
    saveNow();
    toast('Демо-состав восстановлен');
  }

  function clearRoster() {
    if (!state.players.length) { toast('Состав уже пуст'); return; }
    if (!window.confirm('Удалить всех игроков? Оформление команды останется.')) return;
    state.players = [];
    renderAll();
    saveNow();
    toast('Состав очищен');
  }

  /* ------------------------------------------------------------
     Экспорт
     ------------------------------------------------------------ */

  function exportXlsx() {
    if (!state.players.length) {
      toast('Сначала добавьте хотя бы одного игрока.', true);
      return;
    }
    if (!window.ExcelJS || !window.PassportXlsx) {
      toast('Модуль экспорта не загрузился. Перезапустите приложение.', true);
      return;
    }

    var btn = el.btnXlsx;
    var label = btn.querySelector('span');
    var old = label.textContent;
    btn.classList.add('is-busy');
    label.textContent = 'Готовим файл…';

    setTimeout(function () {
      try {
        var payload = {
          team: {
            name: state.team.name,
            season: state.team.season,
            accent: state.team.accent,
            logo: state.team.logo
          },
          printColor: ui.printColor,
          players: state.players
        };
        if (!payload.team.logo) {
          payload.team.logoPlaceholder = makeTeamLogoPlaceholder();
        }
        var wb = window.PassportXlsx.build(payload);
        wb.xlsx.writeBuffer().then(function (buffer) {
          download(
            new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            fileBase() + '.xlsx'
          );
          btn.classList.remove('is-busy');
          label.textContent = old;
          toast('Excel готов — файл скачан');
        }).catch(function (err) {
          console.error(err);
          btn.classList.remove('is-busy');
          label.textContent = old;
          toast('Не удалось собрать Excel: ' + (err && err.message ? err.message : 'ошибка'), true);
        });
      } catch (err) {
        console.error(err);
        btn.classList.remove('is-busy');
        label.textContent = old;
        toast('Не удалось собрать Excel: ' + (err && err.message ? err.message : 'ошибка'), true);
      }
    }, 40);
  }

  function printPdf() {
    if (!state.players.length) {
      toast('Сначала добавьте хотя бы одного игрока.', true);
      return;
    }
    toast('В окне печати выберите «Сохранить как PDF».', false, 3800);
    window.print();
  }

  /* ------------------------------------------------------------
     Тост
     ------------------------------------------------------------ */

  function toast(message, isError, duration) {
    clearTimeout(ui.toastTimer);
    el.toast.textContent = message;
    el.toast.classList.toggle('is-error', !!isError);
    el.toast.classList.add('is-visible');
    ui.toastTimer = setTimeout(function () {
      el.toast.classList.remove('is-visible');
    }, duration || 2600);
  }

  /* ------------------------------------------------------------
     События
     ------------------------------------------------------------ */

  function applyTheme(mode, persist) {
    var allowed = ['light', 'dark', 'system'];
    var nextMode = allowed.indexOf(mode) !== -1 ? mode : 'dark';
    var systemLight = false;
    try {
      systemLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    } catch (err) { /* noop */ }
    var next = nextMode === 'system' ? (systemLight ? 'light' : 'dark') : nextMode;
    document.documentElement.setAttribute('data-theme-mode', nextMode);
    document.documentElement.setAttribute('data-theme', next);
    ui.themeMode = nextMode;
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-set]'), function (button) {
      var active = button.getAttribute('data-theme-set') === nextMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', next === 'dark' ? '#131210' : '#FFFFFF');
    if (persist) {
      try { localStorage.setItem('passport.theme', nextMode); } catch (err) { /* noop */ }
    }
  }

  function bindTheme() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-set]'), function (button) {
      button.addEventListener('click', function () {
        applyTheme(button.getAttribute('data-theme-set'), true);
        if (el.projectMenu) el.projectMenu.classList.remove('is-open');
        if (el.btnProject) el.btnProject.setAttribute('aria-expanded', 'false');
      });
    });
    applyTheme(document.documentElement.getAttribute('data-theme-mode') || 'dark', false);
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if (ui.themeMode === 'system') applyTheme('system', false);
      });
    } catch (err) { /* noop */ }
  }

  function loadPrintColor() {
    try {
      return localStorage.getItem('passport.printColor') === '1';
    } catch (err) {
      return false;
    }
  }

  function applyPrintColor(enabled, persist) {
    ui.printColor = !!enabled;
    document.documentElement.setAttribute('data-print-color', enabled ? '1' : '0');
    Array.prototype.forEach.call(document.querySelectorAll('[data-print-mode]'), function (button) {
      var active = button.getAttribute('data-print-mode') === (ui.printColor ? 'color' : 'bw');
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (persist) {
      try { localStorage.setItem('passport.printColor', ui.printColor ? '1' : '0'); } catch (err) { /* noop */ }
    }
  }

  function bindPrintColor() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-print-mode]'), function (button) {
      button.addEventListener('click', function () {
        applyPrintColor(button.getAttribute('data-print-mode') === 'color', true);
        toast(ui.printColor ? 'Печать: цветная' : 'Печать: чёрно-белая');
      });
    });
    applyPrintColor(loadPrintColor(), false);
  }


  function applySidebar(collapsed, persist) {
    var app = document.querySelector('.app');
    if (!app) return;
    ui.sidebarCollapsed = !!collapsed;
    app.classList.toggle('is-sidebar-collapsed', ui.sidebarCollapsed);
    if (el.btnSidebarToggle) {
      var label = ui.sidebarCollapsed ? 'Развернуть панель' : 'Свернуть панель';
      el.btnSidebarToggle.setAttribute('aria-label', label);
      el.btnSidebarToggle.setAttribute('title', label);
      el.btnSidebarToggle.setAttribute('aria-expanded', ui.sidebarCollapsed ? 'false' : 'true');
    }
    if (persist) {
      try { localStorage.setItem('passport.sidebar', ui.sidebarCollapsed ? 'collapsed' : 'open'); } catch (err) { /* noop */ }
    }
    setTimeout(function () { if (ui.autoFit) fitZoom(); else applyZoom(); }, 160);
  }

  function bindSidebar() {
    if (!el.btnSidebarToggle) return;
    el.btnSidebarToggle.addEventListener('click', function () {
      applySidebar(!ui.sidebarCollapsed, true);
    });
    var saved = '';
    try { saved = localStorage.getItem('passport.sidebar') || ''; } catch (err) { /* noop */ }
    applySidebar(saved === 'collapsed', false);
  }

  function bindTeamInputs() {
    [el.teamName, el.teamSeason].forEach(function (input) {
      input.addEventListener('input', function () {
        var upper = input.value.toLocaleUpperCase('ru-RU');
        if (upper !== input.value) {
          var pos = input.selectionStart;
          input.value = upper;
          try { input.setSelectionRange(pos, pos); } catch (e) { /* noop */ }
        }
        if (input === el.teamName) state.team.name = upper.slice(0, 30);
        if (input === el.teamSeason) state.team.season = upper.slice(0, 18);
        updateHeader();
        scheduleSave();
      });
    });

    el.swatches.addEventListener('click', function (event) {
      var button = event.target.closest('.swatch[data-color]');
      if (!button) return;
      state.team.accent = normalizeHex(button.getAttribute('data-color'));
      markSwatch(state.team.accent);
      el.accentCustom.value = state.team.accent;
      renderSheet();
      scheduleSave();
    });

    el.accentCustom.addEventListener('input', function () {
      state.team.accent = normalizeHex(el.accentCustom.value);
      markSwatch(state.team.accent);
      renderSheet();
      scheduleSave();
    });
  }

  function bindLogo() {
    el.teamLogoThumb.addEventListener('click', function () { el.logoInput.click(); });

    el.teamLogoRemove.addEventListener('click', function (event) {
      event.stopPropagation();
      removeTeamLogo();
    });

    el.logoInput.addEventListener('change', function () {
      var file = el.logoInput.files && el.logoInput.files[0];
      if (file) applyTeamLogo(file);
      el.logoInput.value = '';
    });

    el.teamLogoThumb.addEventListener('dragover', function (event) {
      event.preventDefault();
      el.teamLogoThumb.classList.add('is-dragover');
    });

    el.teamLogoThumb.addEventListener('dragleave', function () {
      el.teamLogoThumb.classList.remove('is-dragover');
    });

    el.teamLogoThumb.addEventListener('drop', function (event) {
      event.preventDefault();
      el.teamLogoThumb.classList.remove('is-dragover');
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) applyTeamLogo(file);
    });

    el.sheets.addEventListener('dragover', function (event) {
      if (!event.target.closest('[data-team-logo]')) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    });

    el.sheets.addEventListener('drop', function (event) {
      if (!event.target.closest('[data-team-logo]')) return;
      event.preventDefault();
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) applyTeamLogo(file);
    });
  }

  function bindRoster() {
    el.rosterList.addEventListener('click', function (event) {
      var row = event.target.closest('.player-row');
      if (!row || ui.dragId || Date.now() < ui.suppressClickUntil) return;
      openEditor(row.getAttribute('data-id'));
    });

    el.btnAdd.addEventListener('click', function () { openEditor(null); });
    if (el.btnAddBottom) el.btnAddBottom.addEventListener('click', function () { openEditor(null); });
    if (el.rosterSearch) {
      el.rosterSearch.addEventListener('input', function () {
        ui.searchQuery = el.rosterSearch.value;
        renderRoster();
      });
    }

    el.btnSort.addEventListener('click', function () {
      state.players.sort(function (a, b) {
        var na = Number(a.number) || 999;
        var nb = Number(b.number) || 999;
        if (na !== nb) return na - nb;
        return a.name.localeCompare(b.name, 'ru');
      });
      renderRoster();
      renderSheet();
      saveNow();
      toast('Состав отсортирован по номерам');
    });

    /* Перетаскивание игроков в списке */
    el.rosterList.addEventListener('dragstart', function (event) {
      var row = event.target.closest('.player-row');
      if (!row) return;
      ui.dragId = row.getAttribute('data-id');
      ui.suppressClickUntil = Date.now() + 400;
      row.classList.add('is-dragging');
      try {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', ui.dragId);
      } catch (e) { /* noop */ }
    });

    el.rosterList.addEventListener('dragend', function () {
      ui.dragId = null;
      Array.prototype.forEach.call(el.rosterList.querySelectorAll('.player-row'), function (row) {
        row.classList.remove('is-dragging', 'is-drop-before', 'is-drop-after');
      });
    });

    el.rosterList.addEventListener('dragover', function (event) {
      if (!ui.dragId) return;
      var row = event.target.closest('.player-row');
      if (!row || row.getAttribute('data-id') === ui.dragId) return;
      event.preventDefault();
      var rect = row.getBoundingClientRect();
      var after = event.clientY > rect.top + rect.height / 2;
      Array.prototype.forEach.call(el.rosterList.querySelectorAll('.player-row'), function (r) {
        r.classList.remove('is-drop-before', 'is-drop-after');
      });
      row.classList.add(after ? 'is-drop-after' : 'is-drop-before');
    });

    el.rosterList.addEventListener('drop', function (event) {
      if (!ui.dragId) return;
      var row = event.target.closest('.player-row');
      if (!row) return;
      event.preventDefault();
      var targetId = row.getAttribute('data-id');
      if (targetId === ui.dragId) return;
      var rect = row.getBoundingClientRect();
      var after = event.clientY > rect.top + rect.height / 2;
      var from = state.players.findIndex(function (p) { return p.id === ui.dragId; });
      if (from === -1) return;
      var moved = state.players.splice(from, 1)[0];
      var to = state.players.findIndex(function (p) { return p.id === targetId; });
      if (to === -1) to = state.players.length;
      if (after) to += 1;
      state.players.splice(to, 0, moved);
      ui.dragId = null;
      renderRoster();
      renderSheet();
      saveNow();
    });
  }

  function bindSheet() {
    el.sheets.addEventListener('click', function (event) {
      var logoButton = event.target.closest('[data-team-logo]');
      if (logoButton) {
        event.preventDefault();
        el.logoInput.click();
        return;
      }
      var card = event.target.closest('.card');
      if (!card) return;
      if (card.hasAttribute('data-empty')) {
        clearSelection();
        openEditor(null);
        return;
      }
      clearSelection();
      openEditor(card.getAttribute('data-id'));
    });

    el.sheets.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      var card = event.target.closest('.card');
      if (!card) return;
      event.preventDefault();
      if (card.hasAttribute('data-empty')) {
        openEditor(null);
        return;
      }
      if (event.key === ' ') {
        selectCard(card.getAttribute('data-id'));
      } else {
        openEditor(card.getAttribute('data-id'));
      }
    });

    var dragoverCard = null;

    el.sheets.addEventListener('dragover', function (event) {
      var card = event.target.closest('.card[data-id]');
      if (!card) return;
      if (event.dataTransfer && Array.prototype.indexOf.call(event.dataTransfer.types || [], 'Files') === -1) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      if (dragoverCard !== card) {
        if (dragoverCard) dragoverCard.classList.remove('is-dragover');
        dragoverCard = card;
        card.classList.add('is-dragover');
      }
    });

    el.sheets.addEventListener('dragleave', function (event) {
      var card = event.target.closest('.card[data-id]');
      if (!card) return;
      if (card.contains(event.relatedTarget)) return;
      card.classList.remove('is-dragover');
      if (dragoverCard === card) dragoverCard = null;
    });

    el.sheets.addEventListener('drop', function (event) {
      var card = event.target.closest('.card[data-id]');
      if (!card) return;
      event.preventDefault();
      card.classList.remove('is-dragover');
      dragoverCard = null;
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (!file) return;
      applyPhotoToPlayer(card.getAttribute('data-id'), file);
    });
  }

  function bindModal() {
    el.modal.addEventListener('click', function (event) {
      if (event.target.closest('[data-close]')) closeEditor();
    });

    el.btnSave.addEventListener('click', saveEditor);
    el.btnDelete.addEventListener('click', deleteEditorPlayer);

    el.fNumber.addEventListener('input', function () {
      var pos = el.fNumber.selectionStart;
      var clean = digits(el.fNumber.value, 3);
      if (clean !== el.fNumber.value) {
        el.fNumber.value = clean;
        try { el.fNumber.setSelectionRange(pos, pos); } catch (e) { /* noop */ }
      }
      updateModalSubtitle();
    });

    el.fBirth.addEventListener('input', function () {
      var clean = maskDate(el.fBirth.value);
      if (clean !== el.fBirth.value) {
        el.fBirth.value = clean;
        try { el.fBirth.setSelectionRange(clean.length, clean.length); } catch (e) { /* noop */ }
      }
    });

    el.fPosition.addEventListener('change', function () {
      syncCustomPosition(true);
      updateModalSubtitle();
    });

    el.fPositionCustom.addEventListener('input', updateModalSubtitle);
    if (el.fCaptain) el.fCaptain.addEventListener('change', updateModalSubtitle);

    el.photoDrop.addEventListener('click', function () { el.fileInput.click(); });
    el.photoDrop.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        el.fileInput.click();
      }
    });

    el.photoDrop.addEventListener('dragover', function (event) {
      event.preventDefault();
      el.photoDrop.classList.add('is-dragover');
    });
    el.photoDrop.addEventListener('dragleave', function () {
      el.photoDrop.classList.remove('is-dragover');
    });
    el.photoDrop.addEventListener('drop', function (event) {
      event.preventDefault();
      el.photoDrop.classList.remove('is-dragover');
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) handlePhotoFile(file);
    });

    el.btnRemovePhoto.addEventListener('click', function () {
      if (!ui.editing) return;
      ui.editing.draft.photo = '';
      updatePhotoPreview('');
    });

    el.fileInput.addEventListener('change', function () {
      var file = el.fileInput.files && el.fileInput.files[0];
      if (file) handlePhotoFile(file);
      el.fileInput.value = '';
    });

    document.addEventListener('paste', function (event) {
      if (!ui.editing) return;
      var items = event.clipboardData && event.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image/') === 0) {
          var file = items[i].getAsFile();
          if (file) {
            event.preventDefault();
            handlePhotoFile(file);
            break;
          }
        }
      }
    });

    document.addEventListener('keydown', function (event) {
      if (!el.modal.classList.contains('is-open')) return;
      if (event.key === 'Escape') { event.preventDefault(); closeEditor(); }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); saveEditor(); }
    });
  }

  function bindCardToolbar() {
    if (!el.cardToolbar) return;
    el.cardToolbar.addEventListener('click', function (event) {
      var button = event.target.closest('[data-card-act]');
      if (!button || !ui.selectedId) return;
      var action = button.getAttribute('data-card-act');
      if (action === 'edit') openEditor(ui.selectedId);
      if (action === 'duplicate') duplicatePlayer(ui.selectedId);
      if (action === 'delete') deletePlayerById(ui.selectedId);
    });

    document.addEventListener('click', function (event) {
      if (!ui.selectedId) return;
      if (event.target.closest('.card') || event.target.closest('#cardToolbar') || event.target.closest('.player-row')) return;
      clearSelection();
    });

    el.canvas.addEventListener('scroll', positionCardToolbar, { passive: true });
    window.addEventListener('resize', positionCardToolbar);
  }

  function commandItems() {
    return [
      { id: 'import', label: 'Импорт с сайта ПГФВ', group: 'Данные', run: function () { openImportModal(); } },
      { id: 'add', label: 'Добавить игрока', group: 'Состав', run: function () { openEditor(null); } },
      { id: 'xlsx', label: 'Скачать Excel', group: 'Экспорт', run: exportXlsx },
      { id: 'pdf', label: 'Распечатать', group: 'Экспорт', run: printPdf },
      { id: 'theme-dark', label: 'Тёмная тема', group: 'Тема', run: function () { applyTheme('dark', true); } },
      { id: 'theme-light', label: 'Светлая тема', group: 'Тема', run: function () { applyTheme('light', true); } },
      { id: 'theme-system', label: 'Системная тема', group: 'Тема', run: function () { applyTheme('system', true); } },
      { id: 'next-page', label: 'Следующая страница', group: 'Страницы', run: function () { setPage(ui.currentPage + 1, true); } },
      { id: 'prev-page', label: 'Предыдущая страница', group: 'Страницы', run: function () { setPage(ui.currentPage - 1, true); } },
      { id: 'fit', label: 'По ширине', group: 'Масштаб', run: fitZoom },
      { id: 'sidebar', label: ui.sidebarCollapsed ? 'Развернуть панель' : 'Свернуть панель', group: 'Вид', run: function () { applySidebar(!ui.sidebarCollapsed, true); } }
    ];
  }

  function closeCommand() {
    if (!el.commandPalette) return;
    el.commandPalette.hidden = true;
    if (ui.lastFocus) ui.lastFocus.focus();
  }

  function runCommand(id) {
    var item = commandItems().filter(function (command) { return command.id === id; })[0];
    if (!item) return;
    closeCommand();
    item.run();
  }

  function renderCommands(query) {
    if (!el.commandList) return;
    var q = String(query || '').trim().toLowerCase();
    var items = commandItems().filter(function (item) {
      return !q || item.label.toLowerCase().indexOf(q) !== -1 || item.group.toLowerCase().indexOf(q) !== -1;
    });
    if (!items.length) {
      el.commandList.innerHTML = '<div class="command__empty">Ничего не найдено</div>';
      return;
    }
    var html = '';
    var lastGroup = '';
    items.forEach(function (item) {
      if (item.group !== lastGroup) {
        html += '<div class="command__group">' + esc(item.group) + '</div>';
        lastGroup = item.group;
      }
      html += '<button type="button" class="command__item" data-command="' + esc(item.id) + '">' +
        '<span>' + esc(item.label) + '</span><kbd>↵</kbd></button>';
    });
    el.commandList.innerHTML = html;
    var first = el.commandList.querySelector('[data-command]');
    if (first) first.classList.add('is-active');
  }

  function openCommand() {
    if (!el.commandPalette) return;
    ui.lastFocus = document.activeElement;
    el.commandPalette.hidden = false;
    if (el.commandInput) {
      el.commandInput.value = '';
      renderCommands('');
      el.commandInput.focus();
    }
  }

  function bindCommandPalette() {
    if (!el.commandPalette) return;
    if (el.btnCommand) el.btnCommand.addEventListener('click', openCommand);
    Array.prototype.forEach.call(el.commandPalette.querySelectorAll('[data-command-close]'), function (button) {
      button.addEventListener('click', closeCommand);
    });
    if (el.commandInput) {
      el.commandInput.addEventListener('input', function () { renderCommands(el.commandInput.value); });
      el.commandInput.addEventListener('keydown', function (event) {
        var items = el.commandList.querySelectorAll('[data-command]');
        if (!items.length) return;
        var active = el.commandList.querySelector('[data-command].is-active') || items[0];
        var index = Array.prototype.indexOf.call(items, active);
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          active.classList.remove('is-active');
          items[(index + 1) % items.length].classList.add('is-active');
          items[(index + 1) % items.length].scrollIntoView({ block: 'nearest' });
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          active.classList.remove('is-active');
          items[(index - 1 + items.length) % items.length].classList.add('is-active');
          items[(index - 1 + items.length) % items.length].scrollIntoView({ block: 'nearest' });
          return;
        }
        if (event.key === 'Enter') {
          runCommand(active.getAttribute('data-command'));
        }
      });
    }
    if (el.commandList) {
      el.commandList.addEventListener('click', function (event) {
        var item = event.target.closest('[data-command]');
        if (item) runCommand(item.getAttribute('data-command'));
      });
    }
    document.addEventListener('keydown', function (event) {
      var key = String(event.key || '').toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === 'k') {
        event.preventDefault();
        if (el.commandPalette.hidden) openCommand();
        else closeCommand();
      }
      if (event.key === 'Escape' && !el.commandPalette.hidden) closeCommand();
    });
  }

  function bindToolbar() {
    if (el.btnPdf) el.btnPdf.addEventListener('click', printPdf);

    if (el.btnExportMenu && el.exportMenu) {
      el.btnExportMenu.addEventListener('click', function (event) {
        event.stopPropagation();
        var open = el.exportMenu.classList.toggle('is-open');
        el.btnExportMenu.setAttribute('aria-expanded', String(open));
      });
      el.exportMenu.addEventListener('click', function (event) {
        var item = event.target.closest('[data-export]');
        if (!item) return;
        el.exportMenu.classList.remove('is-open');
        el.btnExportMenu.setAttribute('aria-expanded', 'false');
        var format = item.getAttribute('data-export');
        if (format === 'xlsx') exportXlsx();
      });
    }

    el.btnProject.addEventListener('click', function (event) {
      event.stopPropagation();
      var open = el.projectMenu.classList.toggle('is-open');
      el.btnProject.setAttribute('aria-expanded', String(open));
    });

    el.projectMenu.addEventListener('click', function (event) {
      var item = event.target.closest('[data-action]');
      if (!item) return;
      el.projectMenu.classList.remove('is-open');
      el.btnProject.setAttribute('aria-expanded', 'false');
      var action = item.getAttribute('data-action');
      if (action === 'site') openImportModal();
      if (action === 'save-json') downloadJson();
      if (action === 'load-json') el.jsonInput.click();
      if (action === 'demo') loadDemo();
      if (action === 'clear') clearRoster();
    });

    document.addEventListener('click', function (event) {
      if (!event.target.closest('.menu-wrap')) {
        el.projectMenu.classList.remove('is-open');
        el.btnProject.setAttribute('aria-expanded', 'false');
      }
      if (!event.target.closest('.split')) {
        if (el.exportMenu) el.exportMenu.classList.remove('is-open');
        if (el.btnExportMenu) el.btnExportMenu.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (el.projectMenu.classList.contains('is-open')) {
        el.projectMenu.classList.remove('is-open');
        el.btnProject.setAttribute('aria-expanded', 'false');
      }
      if (el.exportMenu) {
        el.exportMenu.classList.remove('is-open');
        if (el.btnExportMenu) el.btnExportMenu.setAttribute('aria-expanded', 'false');
      }
    });

    el.jsonInput.addEventListener('change', function () {
      var file = el.jsonInput.files && el.jsonInput.files[0];
      if (file) importJsonFile(file);
      el.jsonInput.value = '';
    });

    el.zoomIn.addEventListener('click', function () { setZoom(ui.zoom + 0.1, true); });
    el.zoomOut.addEventListener('click', function () { setZoom(ui.zoom - 0.1, true); });
    el.zoomFit.addEventListener('click', fitZoom);

    if (el.pagePrev) el.pagePrev.addEventListener('click', function () { setPage(ui.currentPage - 1, true); });
    if (el.pageNext) el.pageNext.addEventListener('click', function () { setPage(ui.currentPage + 1, true); });
    if (el.pageStrip) {
      el.pageStrip.addEventListener('click', function (event) {
        var button = event.target.closest('[data-page]');
        if (button) setPage(Number(button.getAttribute('data-page')), true);
      });
    }
    var pageScrollTimer = null;
    el.canvas.addEventListener('scroll', function () {
      clearTimeout(pageScrollTimer);
      pageScrollTimer = setTimeout(syncPageFromScroll, 80);
    }, { passive: true });

    el.canvas.addEventListener('wheel', function (event) {
      if (!event.ctrlKey) return;
      event.preventDefault();
      setZoom(ui.zoom - event.deltaY * 0.0012, true);
    }, { passive: false });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (ui.autoFit) fitZoom();
        else applyZoom();
      }, 120);
    });

    window.addEventListener('beforeunload', function () {
      if (ui.saveTimer) saveNow();
    });
  }

  /* ------------------------------------------------------------
     Старт
     ------------------------------------------------------------ */

  function decodeBase64Utf8(value) {
    var binary = atob(String(value).replace(/-/g, '+').replace(/_/g, '/'));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function init() {
    state = loadState();
    renderAll();
    bindTeamInputs();
    bindLogo();
    bindImport();
    bindRoster();
    bindSheet();
    bindModal();
    bindToolbar();
    bindTheme();
    bindPrintColor();
    bindSidebar();
    bindCardToolbar();
    bindCommandPalette();
    fitZoom();
    setTimeout(fitZoom, 120);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { applyZoom(); });
    }

    var params = new URLSearchParams(location.search);
    var teamData = params.get('teamData');
    var teamUrl = params.get('teamUrl');
    if (teamData) {
      try {
        var payload = teamData.trim().indexOf('{') === 0 ? JSON.parse(teamData) : JSON.parse(decodeBase64Utf8(teamData));
        importTeamData(payload, { photos: true }).catch(function () {
          toast('Не удалось импортировать данные команды.', true);
        });
      } catch (err) {
        toast('Некорректные данные команды в ссылке.', true);
      }
    } else if (teamUrl) {
      openImportModal(teamUrl);
      setTimeout(function () { loadSiteUrl({ force: true }); }, 250);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TeamPass = {
    get state() { return state; },
    render: renderAll,
    toast: toast,
    importTeamData: importTeamData,
    importTeam: importTeamData,
    openSiteImport: openImportModal
  };
})();

