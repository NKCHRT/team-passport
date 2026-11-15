# Паспорт команды ПГФВ

Веб-приложение для создания паспорта волейбольной команды и выгрузки в Excel/PDF.

- A4, альбомная ориентация, 18 игроков на лист.
- Импорт состава с сайта ПГФВ: ссылка или сохранённый HTML.
- Капитан и либеро, логотип команды, акцентный цвет.
- Светлая/тёмная тема интерфейса.
- Чёрно-белая печать по умолчанию и отдельный цветной режим.
- Excel с логотипами и фотографиями, PDF через печать браузера.

## Быстрый запуск

Скачайте репозиторий и откройте `team-passport/index.html` в браузере.

Для импорта по ссылке нужен локальный сервер с прокси:

```text
Запустить локально.bat
```

В папке приложения есть подробная инструкция: [`team-passport/README.md`](team-passport/README.md).

## GitHub Pages

Сайт публикуется из ветки `gh-pages`: в её корне лежит содержимое `team-passport`.

После включения Pages адрес будет:

```text
https://nkchrt.github.io/team-passport/
```

Важно: на `github.io` импорт по ссылке с сайта ПГФВ может быть недоступен из-за CORS. В этом случае используйте загрузку сохранённой HTML-страницы команды. На домене федерации, где приложение и сайт находятся на одном origin, импорт по ссылке работает штатно.

## Примеры

- [`samples/passport-example.xlsx`](samples/passport-example.xlsx)
- [`samples/passport-example.pdf`](samples/passport-example.pdf)

## Технологии

Чистые HTML/CSS/JavaScript без сборки. ExcelJS и шрифты лежат локально, приложение работает офлайн.

## Лицензии

- ExcelJS — см. `team-passport/vendor/EXCELJS-LICENSE.txt`.
- Montserrat — `team-passport/assets/fonts/OFL.txt`.
- Golos Text — `team-passport/assets/fonts/GOLOS-OFL.txt`.
