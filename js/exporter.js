/* ============================================================
   Паспорт команды — сборка Excel-файла (A4, альбомная)
   Работает в браузере (ExcelJS из vendor) и в Node для тестов.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PassportXlsx = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CARD_COLS = 5;
  var CARD_ROWS = 5;
  var BAND_ROWS = 6;
  var MAX_PLAYERS = 60;
  var PER_PAGE = 18;

  var COL_W = {
    num: 6,
    info1: 15.5,
    info2: 14.6,
    photo: 10.2,
    gap: 1.5
  };

  var ROW_H = [18, 25, 11, 15, 5];  // 74 pt
  var GAP_H = 6;
  var HEADER_ROWS = [6, 18, 38, 4, 20];
  var START_ROW = 6;

  var COLORS = {
    ink: 'FF0A1B33',
    text: 'FF3B4658',
    muted: 'FF94A3B8',
    label: 'FF8A96A9',
    line: 'FFE4E8F0',
    photoBg: 'FFF4F6FA',
    white: 'FFFFFFFF',
    fedRed: 'FFD9251C',
    fedBlue: 'FF05488F',
    logoBg: 'FFE9F2FB',
    logoBorder: 'FFA9BDD4'
  };

  function getExcelJS() {
    if (typeof ExcelJS !== 'undefined') return ExcelJS;
    if (typeof require === 'function') return require('exceljs');
    throw new Error('ExcelJS не загружен');
  }

  function argb(hex) {
    var clean = String(hex || '#D9251C').replace('#', '').toUpperCase();
    if (!/^[0-9A-F]{6}$/.test(clean)) clean = 'D9251C';
    return 'FF' + clean;
  }

  function isLightColor(hex) {
    var clean = String(hex || '').replace('#', '');
    if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return false;
    var r = parseInt(clean.slice(0, 2), 16);
    var g = parseInt(clean.slice(2, 4), 16);
    var b = parseInt(clean.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 165;
  }

  function safeText(value, limit) {
    return String(value == null ? '' : value).trim().slice(0, limit || 100);
  }

  function displayNumber(value) {
    var s = String(value == null ? '' : value).replace(/\D+/g, '').slice(0, 3);
    if (!s) return '';
    return s.replace(/^0+(?=\d)/, '');
  }

  function nameFontSize(name) {
    var len = String(name || '').trim().length;
    if (len <= 16) return 15;
    if (len <= 19) return 13.5;
    if (len <= 23) return 12;
    if (len <= 27) return 10.5;
    return 9.5;
  }

  function teamFontSize(name) {
    var len = String(name || '').trim().length;
    if (len <= 18) return 25;
    if (len <= 24) return 22;
    return 19;
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(function (part) {
      return /[A-Za-zА-Яа-яЁё]/.test(part);
    });
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function plural(n, one, few, many) {
    var n10 = n % 10;
    var n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
    return many;
  }

  function colPx(width) { return Math.round(width * 7 + 5); }
  function rowsPx(heights) {
    return heights.reduce(function (sum, h) { return sum + h * 4 / 3; }, 0);
  }

  function font(size, opts) {
    opts = opts || {};
    return {
      name: 'Montserrat',
      size: size,
      bold: !!opts.bold,
      italic: !!opts.italic,
      underline: !!opts.underline,
      color: { argb: opts.color || COLORS.ink }
    };
  }

  function solid(hex) {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb: hex } };
  }

  function border(edges) {
    var out = {};
    ['top', 'left', 'bottom', 'right'].forEach(function (side) {
      if (edges && edges[side]) out[side] = edges[side];
    });
    return out;
  }

  function lineEdge(color) {
    return { style: 'thin', color: { argb: color || COLORS.line } };
  }

  function build(project) {
    var ExcelJS = getExcelJS();
    project = project || {};
    var team = project.team || {};
    var players = (project.players || []).slice(0, MAX_PLAYERS);
    var total = players.length;
    var pages = Math.max(1, Math.ceil(total / PER_PAGE));
    var printColor = project.printColor === true;

    var wb = new ExcelJS.Workbook();
    wb.creator = 'Паспорт команды';
    wb.lastModifiedBy = 'Паспорт команды';
    wb.created = new Date();
    wb.modified = new Date();

    for (var page = 0; page < pages; page++) {
      var pagePlayers = players.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
      var sheetName = pages === 1 ? 'Паспорт команды' : 'Паспорт ' + (page + 1);
      var ws = wb.addWorksheet(sheetName, {
        views: [{ showGridLines: false, zoomScale: 100 }],
        pageSetup: {
          paperSize: 9,
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 1,
          horizontalCentered: true,
          verticalCentered: false,
          margins: { left: 0.236, right: 0.236, top: 0.236, bottom: 0.236, header: 0, footer: 0 }
        }
      });
      buildSheet(wb, ws, team, pagePlayers, total, page + 1, pages, printColor);
    }

    return wb;
  }

  function buildSheet(wb, ws, team, players, total, page, pages, printColor) {
    var accent = argb(team.accent);
    var lightAccent = isLightColor(team.accent);
    var headerInk = printColor && !lightAccent ? 'FFFFFFFF' : 'FF111111';
    var headerMuted = printColor && !lightAccent ? 'FFDDE7F1' : 'FF555555';
    var docAccent = printColor && !lightAccent ? accent : 'FF111111';
    var n = players.length;
    var bands = Math.max(1, Math.ceil(n / 3));
    var lastCol = CARD_COLS * 3;
    var lastRow = START_ROW + (bands - 1) * BAND_ROWS + CARD_ROWS - 1;

    ws.properties.pageSetUpPr = { fitToPage: true };
    ws.pageSetup.printArea = 'A1:' + colName(lastCol) + lastRow;

    /* --- ширины колонок --- */
    for (var slot = 0; slot < 3; slot++) {
      var base = 1 + slot * CARD_COLS;
      ws.getColumn(base).width = COL_W.num;
      ws.getColumn(base + 1).width = COL_W.info1;
      ws.getColumn(base + 2).width = COL_W.info2;
      ws.getColumn(base + 3).width = COL_W.photo;
      ws.getColumn(base + 4).width = COL_W.gap;
    }

    /* --- шапка --- */
    HEADER_ROWS.forEach(function (h, i) { ws.getRow(i + 1).height = h; });

    if (printColor) {
      for (var hr = 1; hr <= 3; hr++) {
        for (var hc = 1; hc <= lastCol; hc++) {
          ws.getCell(hr, hc).fill = solid(accent);
        }
      }
    }

    drawTeamLogo(ws, team, wb);
    drawFedLogo(ws, wb);

    var overline = 'ПАСПОРТ КОМАНДЫ';
    ws.mergeCells('B2:L2');
    setCell(ws, 2, 2, overline.toUpperCase(), {
      font: font(7, { bold: true, color: headerMuted }),
      alignment: { horizontal: 'left', vertical: 'bottom', indent: 1 }
    });

    ws.mergeCells('B3:L3');
    setCell(ws, 3, 2, safeText(team.name, 30) || 'НАЗВАНИЕ КОМАНДЫ', {
      font: font(teamFontSize(team.name), { bold: true, color: headerInk }),
      alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
    });

    ws.mergeCells('A4:J4');
    ws.getCell(4, 1).fill = solid(printColor ? COLORS.fedRed : 'FF111111');
    ws.mergeCells('K4:O4');
    ws.getCell(4, 11).fill = solid(printColor ? COLORS.fedBlue : 'FFAFAFAF');

    ws.mergeCells('B5:I5');
    setCell(ws, 5, 2, 'ПЕРМСКАЯ ГОРОДСКАЯ ФЕДЕРАЦИЯ ВОЛЕЙБОЛА (ПГФВ)', {
      font: font(6.8, { bold: true, color: printColor ? COLORS.fedBlue : 'FF111111' }),
      alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
    });

    ws.mergeCells('J5:O5');
    var meta = [
      safeText(team.season, 18),
      (total + ' ' + plural(total, 'ИГРОК', 'ИГРОКА', 'ИГРОКОВ')),
      pad2(page) + '/' + pad2(pages)
    ].filter(Boolean).join(' · ');
    setCell(ws, 5, 10, meta, {
      font: font(6.2, { bold: true, color: 'FF555555' }),
      alignment: { horizontal: 'right', vertical: 'center', indent: 1 }
    });

    /* --- карточки --- */
    for (var b = 0; b < bands; b++) {
      var startRow = START_ROW + b * BAND_ROWS;
      for (var r = 0; r < CARD_ROWS; r++) ws.getRow(startRow + r).height = ROW_H[r];
      ws.getRow(startRow + CARD_ROWS).height = GAP_H;

      for (var s = 0; s < 3; s++) {
        var index = b * 3 + s;
        if (index >= n) break;
        drawCard(ws, startRow, 1 + s * CARD_COLS, players[index], docAccent, wb, printColor);
      }
    }

    ws.pageSetup.printArea = 'A1:' + colName(lastCol) + lastRow;
  }

  function pad2(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function drawTeamLogo(ws, team, wb) {
    var col = 14; // N — правая колонка шапки
    var hasLogo = typeof team.logo === 'string' && /^data:image\/(jpeg|jpg|png);base64,/i.test(team.logo);
    var frame = { style: 'thin', color: { argb: COLORS.logoBorder } };

    for (var lr = 1; lr <= 3; lr++) {
      for (var lc = 13; lc <= 15; lc++) {
        ws.getCell(lr, lc).fill = solid('FFFFFFFF');
      }
    }

    [2, 3].forEach(function (row) {
      if (hasLogo) return;
      var c = ws.getCell(row, col);
      c.fill = solid(COLORS.logoBg);
      var edges = { left: frame, right: frame };
      if (row === 2) edges.top = frame;
      if (row === 3) edges.bottom = frame;
      c.border = border(edges);
      c.alignment = { horizontal: 'center', vertical: 'center' };
    });

    ws.mergeCells(2, col, 3, col);
    var cell = ws.getCell(2, col);
    if (!hasLogo) {
      cell.fill = solid(COLORS.logoBg);
      cell.border = border({ top: frame, left: frame, right: frame, bottom: frame });
      cell.alignment = { horizontal: 'center', vertical: 'center' };
    }

    var imageData = hasLogo ? team.logo : (typeof team.logoPlaceholder === 'string' ? team.logoPlaceholder : '');
    var placed = false;
    if (imageData) {
      var sizePx = 70; // 18,5 мм
      var pxW = colPx(COL_W.photo);
      var totalH = (HEADER_ROWS[1] + HEADER_ROWS[2]) * 4 / 3;
      placed = placeImage(
        ws, wb, imageData,
        13, 1,
        (pxW - sizePx) / 2,
        (totalH - sizePx) / 2,
        sizePx, sizePx,
        COL_W.photo, HEADER_ROWS[1]
      );
    }

    if (!placed) {
      cell.value = initials(team.name) || 'ТГ';
      cell.font = font(14, { bold: true, color: COLORS.fedBlue });
    }
  }

  function drawFedLogo(ws, wb) {
    var data = typeof FED_LOGO !== 'undefined' ? FED_LOGO : '';
    if (!data) return;
    var sizePx = 45; // ~12 мм
    var pxW = colPx(COL_W.num);
    var totalH = (HEADER_ROWS[1] + HEADER_ROWS[2]) * 4 / 3;
    placeImage(
      ws, wb, data,
      0, 1,
      (pxW - sizePx) / 2,
      (totalH - sizePx) / 2,
      sizePx, sizePx,
      COL_W.num, HEADER_ROWS[1]
    );
  }

  // ExcelJS хранит смещение якоря в единицах width*10000, а не в EMU,
  // поэтому переводим пиксели (1 px = 9525 EMU) вручную.
  function placeImage(ws, wb, dataUrl, col0, row0, xOff, yOff, wPx, hPx, colWidth, rowHeight) {
    var info = addImage(wb, dataUrl);
    if (!info) return false;
    var colFrac = xOff * 9525 / (colWidth * 10000);
    var rowFrac = yOff * 9525 / (rowHeight * 10000);
    ws.addImage(info.id, {
      tl: { col: col0 + colFrac, row: row0 + rowFrac },
      ext: { width: wPx, height: hPx }
    });
    return true;
  }

  function drawCard(ws, startRow, base, player, accent, wb, printColor) {
    var name = safeText(player.name, 40) || 'Без имени';
    var number = displayNumber(player.number);
    var captain = player.captain === true;
    var libero = /^либеро/i.test(String(player.position || '').trim());
    var birth = safeText(player.birth, 10);
    var position = safeText(player.position, 20);
    var photo = typeof player.photo === 'string' ? player.photo : '';
    var hasNumber = !!number;
    var hasPosition = !!position;
    var infoStart = hasNumber ? base + 1 : base;
    var infoEnd = hasPosition ? base + 1 : base + 2;

    var thin = lineEdge(COLORS.line);
    var accentEdge = { style: 'medium', color: { argb: accent } };

    if (infoEnd > infoStart) {
      for (var mr = 0; mr < CARD_ROWS; mr++) {
        ws.mergeCells(startRow + mr, infoStart, startRow + mr, infoEnd);
      }
    }

    for (var r = 0; r < CARD_ROWS; r++) {
      for (var c = 0; c < 4; c++) {
        var cell = ws.getCell(startRow + r, base + c);
        var edges = {};

        if (r === 0) edges.top = accentEdge;
        if (r === CARD_ROWS - 1) edges.bottom = thin;
        if (c === 0) edges.left = thin;
        if (c === 3) {
          edges.right = thin;
          edges.left = thin; // линия перед фото
        }
        if (hasPosition && c === 2 && (r === 2 || r === 3)) {
          edges.left = thin; // разделитель дата/амплуа
        }
        if (r === 1 && (c === infoStart || (hasPosition && c === 2))) {
          edges.bottom = thin; // линия под именем
        }

        cell.border = border(edges);
      }
    }

    // номер
    if (hasNumber) {
      setCell(ws, startRow, base, '№', {
        font: font(7, { bold: true, color: COLORS.muted }),
        alignment: { horizontal: 'center', vertical: 'bottom' }
      });
      setCell(ws, startRow + 1, base, number, {
        font: font(22, { bold: true, color: accent, underline: captain }),
        alignment: { horizontal: 'center', vertical: 'center' }
      });
    }

    // имя
    var nameLabel = 'ФАМИЛИЯ, ИМЯ';
    setCell(ws, startRow, infoStart, nameLabel, {
      font: font(6.5, { bold: true, color: COLORS.muted }),
      alignment: { horizontal: 'left', vertical: 'bottom', indent: 2 }
    });
    var nameCell = ws.getCell(startRow + 1, infoStart);
    nameCell.value = name;
    nameCell.font = font(nameFontSize(name), { bold: true, color: COLORS.ink });
    var badgeCount = (captain ? 1 : 0) + (libero ? 1 : 0);
    nameCell.alignment = { horizontal: 'left', vertical: 'center', indent: badgeCount ? 4.9 : 2 };
    if (captain) {
      addCardBadge(ws, wb, 'К', printColor ? '#C8102E' : '#111111', infoStart, startRow, 0.02, 0.16);
    }
    if (libero) {
      addCardBadge(ws, wb, 'Л', printColor ? '#0B5AA5' : '#111111', infoStart, startRow, 0.02, 0.58);
    }

    // дата и амплуа
    setCell(ws, startRow + 2, infoStart, 'ДАТА РОЖДЕНИЯ', {
      font: font(6.2, { bold: true, color: COLORS.muted }),
      alignment: { horizontal: 'left', vertical: 'bottom', indent: 2 }
    });
    if (hasPosition) {
      setCell(ws, startRow + 2, base + 2, 'АМПЛУА', {
        font: font(6.2, { bold: true, color: COLORS.muted }),
        alignment: { horizontal: 'left', vertical: 'bottom', indent: 2 }
      });
    }
    setCell(ws, startRow + 3, infoStart, birth || '—', {
      font: font(9.5, { color: COLORS.text }),
      alignment: { horizontal: 'left', vertical: 'center', indent: 2, shrinkToFit: true }
    });
    if (hasPosition) {
      setCell(ws, startRow + 3, base + 2, position, {
        font: font(8.5, { color: COLORS.text }),
        alignment: { horizontal: 'left', vertical: 'center', indent: 2, shrinkToFit: true }
      });
    }

    // фото
    var photoCol = base + 3;
    if (photo) {
      var imageInfo = addImage(wb, photo);
      if (imageInfo) {
        var pxW = colPx(COL_W.photo);
        var pxH = rowsPx(ROW_H);
        var inset = 3;
        // ExcelJS считает долю ячейки в единицах width*10000, а не в EMU,
        // поэтому переводим пиксели в EMU вручную (1 px = 9525 EMU).
        var colFrac = inset * 9525 / (COL_W.photo * 10000);
        var rowFrac = inset * 9525 / (ROW_H[0] * 10000);
        ws.addImage(imageInfo.id, {
          tl: {
            col: photoCol - 1 + colFrac,
            row: startRow - 1 + rowFrac
          },
          ext: { width: pxW - inset * 2, height: pxH - inset * 2 }
        });
      } else {
        drawPhotoPlaceholder(ws, startRow, photoCol, name);
      }
    } else {
      drawPhotoPlaceholder(ws, startRow, photoCol, name);
    }
  }

  function drawPhotoPlaceholder(ws, startRow, photoCol, name) {
    for (var r = 0; r < CARD_ROWS; r++) {
      ws.getCell(startRow + r, photoCol).fill = solid(COLORS.photoBg);
    }
    var cell = ws.getCell(startRow + 2, photoCol);
    cell.value = initials(name) || '—';
    cell.font = font(13, { bold: true, color: 'FFD3DBE8' });
    cell.alignment = { horizontal: 'center', vertical: 'center' };
  }

  var badgeCache = {};

  function badgePng(letter, color) {
    var key = letter + color;
    if (badgeCache[key]) return badgeCache[key];
    if (typeof document === 'undefined') return '';
    var canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    var ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.clearRect(0, 0, 96, 96);
    ctx.beginPath();
    ctx.arc(48, 48, 40, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = '700 52px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 48, 51);
    badgeCache[key] = canvas.toDataURL('image/png').split(',')[1];
    return badgeCache[key];
  }

  function addCardBadge(ws, wb, letter, color, col, row, offsetX, offsetY) {
    var base64 = badgePng(letter, color);
    if (!base64) return;
    wb.__badgeIds = wb.__badgeIds || {};
    var key = letter + color;
    if (!wb.__badgeIds[key]) {
      wb.__badgeIds[key] = wb.addImage({ base64: base64, extension: 'png' });
    }
    ws.addImage(wb.__badgeIds[key], {
      tl: { col: col - 1 + offsetX, row: row + offsetY },
      ext: { width: 10, height: 10 }
    });
  }

  var imageCache = new WeakMap();

  function addImage(wb, dataUrl) {
    var m = /^data:image\/(jpeg|jpg|png);base64,([\s\S]+)$/i.exec(dataUrl);
    if (!m) return null;
    var extension = m[1].toLowerCase() === 'png' ? 'png' : 'jpeg';
    var base64 = m[2].replace(/\s+/g, '');
    var cache = imageCache.get(wb);
    if (!cache) {
      cache = Object.create(null);
      imageCache.set(wb, cache);
    }
    var key = extension + ':' + base64.length + ':' + base64.slice(0, 64) + ':' + base64.slice(-32);
    if (cache[key] !== undefined) return { id: cache[key] };
    var id = wb.addImage({ base64: base64, extension: extension });
    cache[key] = id;
    return { id: id };
  }

  function setCell(ws, row, col, value, opts) {
    var cell = ws.getCell(row, col);
    if (value !== undefined && value !== null) cell.value = value;
    if (opts && opts.font) cell.font = opts.font;
    if (opts && opts.alignment) cell.alignment = opts.alignment;
    if (opts && opts.fill) cell.fill = opts.fill;
    return cell;
  }

  function colName(num) {
    var name = '';
    while (num > 0) {
      var rem = (num - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      num = Math.floor((num - 1) / 26);
    }
    return name;
  }

  return {
    build: build,
    layout: {
      COL_W: COL_W,
      ROW_H: ROW_H,
      GAP_H: GAP_H,
      HEADER_ROWS: HEADER_ROWS,
      START_ROW: START_ROW,
      CARD_ROWS: CARD_ROWS,
      BAND_ROWS: BAND_ROWS
    },
    helpers: { displayNumber: displayNumber, nameFontSize: nameFontSize, initials: initials }
  };
});
