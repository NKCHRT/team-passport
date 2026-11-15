# Интеграция «Паспорт команды» с сайтом ПГФВ на WordPress

Практическая инструкция для администратора сайта и разработчика темы.

Версия: 1.0 · ноябрь 2026

---

## 1. Что получится

На странице команды появляется кнопка **«Создать паспорт команды»**. Она открывает приложение, приложение само читает страницу этой команды, забирает фамилии, даты рождения, фотографии и логотип, после чего сотрудник проверяет состав и скачивает Excel или PDF.

```
Страница команды
      │  кнопка «Создать паспорт»
      ▼
/team-passport/?teamUrl=https://perm-volley.ru/teams/.../trinix-group/
      │  приложение и сайт на одном домене
      ▼
Чтение HTML страницы + WP REST API (логотип)
      │
      ▼
Редактор → Excel / PDF
```

Важно: приложение должно быть размещено **на том же домене**, что и сайт (`https://perm-volley.ru/...`). Тогда браузер не блокирует чтение страницы команды, фотографий и REST API. Локальный Python-сервер и файл `.bat` для production **не нужны**.

### Три варианта интеграции

| Вариант | Что делает | Сложность | Рекомендация |
|---|---|---|---|
| A. Кнопка + новая вкладка | Открывает приложение с `?teamUrl=` | Низкая, 15–30 минут | **Начать с этого** |
| B. Iframe или модальное окно | Приложение открывается внутри страницы команды | Средняя, 1–2 часа | Если нельзя уводить пользователя со страницы |
| C. `postMessage` / JSON | Сайт сам передаёт состав в приложение | Высокая, нужен разработчик | Если данные уже собраны в PHP/JSON |

Для WordPress-сайта с текущим шаблоном команды `tpl-team-item.php` рекомендуется **вариант A**: он не требует менять данные, плагины или базу и работает с текущей разметкой `.playerCard__item`.

---

## 2. Что нужно перед началом

- Доступ к файлам сайта по SFTP/FTP (или файловый менеджер хостинга).
- Доступ к дочерней теме WordPress или возможность добавить небольшой MU-плагин.
- Команды на сайте должны открываться по постоянным ссылкам вида `https://perm-volley.ru/teams/...`.
- У каждой команды желательно заполнить **«Изображение записи»** (featured image) — из него приложение берёт логотип.
- Браузер для проверки: Chrome, Edge или Яндекс Браузер. Редактировать паспорт удобнее на компьютере.

Не требуется:

- устанавливать Python, Node.js или базу данных;
- создавать отдельный API;
- менять записи команд;
- давать приложению доступ к админке WordPress.

---

## 3. Как это работает внутри

Приложение — это статический сайт: HTML, CSS, JavaScript и картинки. Оно не пишет данные на сервер и не требует PHP.

При открытии ссылки:

1. Приложение получает параметр `teamUrl` — постоянную ссылку команды.
2. Загружает HTML этой страницы как обычный файл (same-origin).
3. Разбирает карточки `.playerCard__item`: имя, дату рождения, фото.
4. Запрашивает у WordPress REST API запись команды и её featured image — так получается логотип.
5. Показывает предпросмотр паспорта.
6. Пользователь скачивает Excel или PDF; данные проекта хранятся в `localStorage` его браузера.

Приложение не изменяет страницу команды, не публикует паспорт и не отправляет состав на сторонние сервисы.

### Что импортируется автоматически

- название команды — из `<h1>`;
- игроки — из `.playerCard__item`;
- имя — `.playerCard__name`;
- дата рождения — `.playerCard__bday`;
- фото — `.playerCard__img img`;
- логотип — featured image записи `teams` через REST API.

Номера и амплуа на странице команды не опубликованы. После импорта их можно заполнить вручную. Сезон определяется по названию команды (например, «2027» → «СЕЗОН 26/27») и тоже редактируется.

---

## 4. Загрузка приложения на сайт

### 4.1. Куда положить файлы

Распакуйте архив `Паспорт команды — приложение.zip`. На сервере создайте папку, например:

```
public_html/
└── team-passport/
    ├── index.html
    ├── css/
    ├── js/
    ├── assets/
    └── vendor/
```

Итоговый адрес приложения:

```
https://perm-volley.ru/team-passport/
```

Папку можно назвать иначе, например `/passport/`. Тогда во всех ссылках ниже замените `/team-passport/` на свой путь.

### 4.2. Что не нужно загружать на сервер

Из архива на сервер **не загружайте**:

- `Открыть паспорт команды.bat`;
- `server.py`;
- `README.md`, `SITE-INTEGRATION.md`, `WORDPRESS-INTEGRATION.md`;
- `preview.png` — необязательно.

`.bat` и `server.py` нужны только для локального запуска на компьютере. На сайте они не используются. Если они уже попали в папку, удалите их.

### 4.3. Как загрузить

Лучший способ — SFTP/FTP:

1. Подключитесь к хостингу.
2. Откройте корень сайта (там, где лежит `wp-config.php`).
3. Создайте папку `team-passport`.
4. Загрузите содержимое архива внутрь неё, сохранив структуру папок.
5. Права: папки — `755`, файлы — `644`.

Не используйте «Медиафайлы» WordPress для загрузки HTML/JS: WordPress может запретить такие файлы или отдать их с неверным MIME-типом. Загрузка по SFTP в отдельную папку надёжнее.

### 4.4. Проверка после загрузки

Откройте в браузере:

```
https://perm-volley.ru/team-passport/
```

Должен открыться интерфейс «Паспорт команды». Если открылась 404 или белая страница — смотрите раздел «Если что-то не работает».

### 4.5. Защита папки и кэш

В папке `team-passport` можно создать `.htaccess`:

```apache
Options -Indexes

<FilesMatch "\.(php|phtml|phar)$">
  Require all denied
</FilesMatch>

<IfModule mod_expires.c>
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType text/css "access plus 7 days"
  ExpiresByType application/javascript "access plus 7 days"
  ExpiresByType image/png "access plus 30 days"
  ExpiresByType image/jpeg "access plus 30 days"
  ExpiresByType font/woff2 "access plus 30 days"
</IfModule>
```

Для Nginx аналогично запретите выполнение PHP в этой папке и настройте кэш статики.

После обновления приложения:

1. замените файлы в папке;
2. очистите кэш WordPress, CDN и браузера;
3. проверьте приложение в режиме инкогнито.

Если на сайте включена минификация HTML/JS или объединение файлов, исключите `/team-passport/` из этих правил.

---

## 5. Вариант A. Кнопка на странице команды

Это основной и самый надёжный вариант.

### 5.1. Где находится шаблон

Судя по классу страницы `teams-template-tpl-team-item` и REST-шаблону `tpl-team-item.php`, команда выводится шаблоном темы:

```
wp-content/themes/ВАША_ТЕМА/tpl-team-item.php
```

Файл может лежать в корне темы или в подпапке шаблонов. Найдите его по имени.

**Не редактируйте родительскую тему напрямую.** Создайте дочернюю тему или перенесите файл в неё, иначе обновление темы удалит кнопку.

### 5.2. PHP-код кнопки

В шаблоне команды, рядом с существующей кнопкой печати или после заголовка команды, добавьте:

```php
<?php
$passport_url = add_query_arg(
    'teamUrl',
    get_permalink(get_the_ID()),
    home_url('/team-passport/')
);
?>
<a class="uk-button uk-button-primary team-passport-link"
   href="<?php echo esc_url($passport_url); ?>"
   target="_blank" rel="noopener">
    Создать паспорт команды
</a>
```

Что здесь важно:

- `get_permalink(get_the_ID())` возвращает постоянную ссылку текущей команды, а не списка групп.
- `home_url('/team-passport/')` — адрес приложения; замените путь, если папка называется иначе.
- `add_query_arg()` сам кодирует URL команды — вручную `urlencode` не нужен.
- `esc_url()` обязателен для вывода ссылки.
- `target="_blank"` открывает приложение в новой вкладке. Если хотите открывать в текущей, уберите `target` и `rel`.

### 5.3. Если в теме нет UIkit

Классы `uk-button uk-button-primary` относятся к UIkit. Если тема их не использует, замените на свои классы или добавьте CSS в дочернюю тему:

```css
.team-passport-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 6px;
  background: #c8102e;
  color: #fff;
  font: 600 14px/1.2 "Montserrat", system-ui, sans-serif;
  text-decoration: none;
}
.team-passport-link:hover {
  background: #a90d26;
  color: #fff;
}
```

### 5.4. Проверка

1. Откройте страницу любой команды на сайте.
2. Нажмите «Создать паспорт команды».
3. Должна открыться новая вкладка `/team-passport/?teamUrl=...`.
4. Приложение само загрузит состав; кнопка «Импорт с сайта ПГФВ» откроется с уже заполненной ссылкой.
5. Проверьте логотип, фотографии и экспорт.

Если кнопка не появилась — очистите кэш страницы и проверьте, что шаблон взят из дочерней темы.

---

## 6. Если нельзя править шаблон: мини-плагин

Подходит, когда нет доступа к теме или не хочется трогать `tpl-team-item.php`. Кнопка будет плавающей в правом нижнем углу страниц команд.

### 6.1. Вариант через Code Snippets

Установите плагин **Code Snippets** (или аналог), создайте сниппет «Паспорт команды — кнопка», включите выполнение на фронтенде:

```php
add_action('wp_footer', function () {
    if (!is_singular('teams')) {
        return;
    }

    $url = add_query_arg(
        'teamUrl',
        get_permalink(get_the_ID()),
        home_url('/team-passport/')
    );
    ?>
    <style>
      .team-passport-fab {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 9999;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 18px;
        border-radius: 6px;
        background: #c8102e;
        color: #fff;
        font: 600 14px/1.2 "Montserrat", system-ui, sans-serif;
        text-decoration: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, .18);
      }
      .team-passport-fab:hover { background: #a90d26; color: #fff; }
      @media (max-width: 600px) {
        .team-passport-fab {
          right: 16px;
          bottom: 16px;
          left: 16px;
        }
      }
    </style>
    <a class="team-passport-fab"
       href="<?php echo esc_url($url); ?>"
       target="_blank" rel="noopener">
        Создать паспорт
    </a>
    <?php
});
```

Плюс: не нужно менять тему. Минус: плавающая кнопка может перекрывать элементы на мобильных. Для аккуратного вида лучше вариант A.

### 6.2. Вариант через MU-плагин

Создайте файл:

```
wp-content/mu-plugins/team-passport-button.php
```

С кодом:

```php
<?php
if (!defined('ABSPATH')) {
    exit;
}

add_action('wp_footer', function () {
    if (!is_singular('teams')) {
        return;
    }

    $url = add_query_arg(
        'teamUrl',
        get_permalink(get_the_ID()),
        home_url('/team-passport/')
    );
    ?>
    <a class="team-passport-fab"
       href="<?php echo esc_url($url); ?>"
       target="_blank" rel="noopener">
        Создать паспорт
    </a>
    <?php
});
```

CSS добавьте в дочернюю тему или в тот же сниппет. MU-плагин активен всегда и не отключается через админку.

---

## 7. Вариант B. Iframe на странице команды

Нужен, если пользователь не должен уходить со страницы. Приложение занимает всю ширину и высоту контейнера.

### 7.1. Простой iframe

В шаблоне команды:

```php
<?php
$passport_url = add_query_arg(
    'teamUrl',
    get_permalink(get_the_ID()),
    home_url('/team-passport/')
);
?>
<div class="team-passport-embed">
    <iframe
        src="<?php echo esc_url($passport_url); ?>"
        title="Паспорт команды"
        loading="lazy"
        allow="clipboard-write; downloads; modals"
        allowfullscreen>
    </iframe>
</div>
```

CSS:

```css
.team-passport-embed {
    width: 100%;
    height: calc(100vh - 120px);
    min-height: 720px;
    background: #111316;
}
.team-passport-embed iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
}
```

Рекомендации:

- Лучше размещать iframe на **пустом шаблоне страницы** без шапки и подвала сайта, иначе интерфейс приложения будет дублировать навигацию.
- На мобильных удобнее открывать приложение в новой вкладке.
- Не ставьте iframe на страницу списка команд — только на страницу конкретной команды.

### 7.2. Модальное окно с iframe

Более аккуратный вариант: кнопка открывает приложение поверх страницы.

```php
<?php
$passport_url = add_query_arg(
    'teamUrl',
    get_permalink(get_the_ID()),
    home_url('/team-passport/')
);
?>
<button type="button"
        class="uk-button uk-button-primary"
        data-passport-open
        data-passport-url="<?php echo esc_url($passport_url); ?>">
    Создать паспорт команды
</button>

<div class="passport-modal" data-passport-modal hidden>
    <div class="passport-modal__dialog">
        <button type="button" class="passport-modal__close"
                data-passport-close aria-label="Закрыть">×</button>
        <iframe data-passport-frame
                title="Паспорт команды"
                allow="clipboard-write; downloads; modals"
                allowfullscreen></iframe>
    </div>
</div>
```

CSS:

```css
.passport-modal[hidden] { display: none; }

.passport-modal {
    position: fixed;
    inset: 0;
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(0, 0, 0, .55);
}

.passport-modal__dialog {
    position: relative;
    width: min(1200px, 96vw);
    height: min(900px, 90vh);
    overflow: hidden;
    border-radius: 8px;
    background: #111316;
}

.passport-modal iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
}

.passport-modal__close {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 4px;
    background: rgba(0, 0, 0, .55);
    color: #fff;
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
}

@media (max-width: 700px) {
    .passport-modal { padding: 0; }
    .passport-modal__dialog {
        width: 100vw;
        height: 100vh;
        border-radius: 0;
    }
}
```

JavaScript:

```html
<script>
(function () {
  var modal = document.querySelector('[data-passport-modal]');
  var open = document.querySelector('[data-passport-open]');
  if (!modal || !open) return;

  var frame = modal.querySelector('[data-passport-frame]');
  var close = modal.querySelector('[data-passport-close]');
  var lastFocus = null;

  function openModal() {
    lastFocus = document.activeElement;
    frame.src = open.getAttribute('data-passport-url');
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    close.focus();
  }

  function closeModal() {
    modal.hidden = true;
    frame.src = 'about:blank';
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  open.addEventListener('click', openModal);
  close.addEventListener('click', closeModal);
  modal.addEventListener('click', function (event) {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });
})();
</script>
```

Проверьте, что тема не блокирует `position: fixed` и `z-index` для модального окна.

---

## 8. Вариант C. Передача данных через postMessage

Нужен, если:

- приложение открыто в iframe без `?teamUrl=`;
- данные состава уже есть в PHP/JSON;
- нужно передать номера, амплуа или готовый логотип.

### 8.1. iframe без teamUrl

```html
<iframe id="passport-frame"
        src="/team-passport/"
        title="Паспорт команды"
        style="width:100%;height:900px;border:0"
        allow="clipboard-write; downloads; modals">
</iframe>
```

### 8.2. Передача состава

```html
<script>
  var frame = document.getElementById('passport-frame');

  frame.addEventListener('load', function () {
    frame.contentWindow.postMessage({
      type: 'teampass:import',
      payload: {
        team: {
          name: 'ДЕМО-КОМАНДА 2027',
          season: 'СЕЗОН 26/27',
          accent: '#D9251C'
        },
        players: [
          {
            name: 'Иванов Иван',
            birth: '12.03.2001',
            number: '1',
            position: 'Либеро',
            captain: true,
            photo: 'https://perm-volley.ru/wp-content/uploads/.../photo.jpg'
          }
        ]
      }
    }, location.origin);
  });
</script>
```

Приложение принимает сообщения:

- с того же origin;
- с домена `perm-volley.ru` и его поддоменов.

Тип сообщения — строго `teampass:import`.

### 8.3. Формат payload

```js
{
  team: {
    name: 'ДЕМО-КОМАНДА 2027',        // или teamName на верхнем уровне
    season: 'СЕЗОН 26/27',            // необязательно
    accent: '#D9251C',                // необязательно
    logo: 'data:image/png;base64,…'   // необязательно, только data URL
  },
  players: [
    {
      name: 'Иванов Иван',            // обязательно
      birth: '12.03.2001',            // необязательно
      number: '1',                    // необязательно
      position: 'Либеро',             // необязательно
      captain: true,                  // необязательно
      photo: 'https://…/photo.jpg'    // URL или data:image/…
    }
  ]
}
```

Ограничения:

- максимум 60 игроков;
- 18 игроков на лист A4, остальные уходят на следующие листы;
- `team.logo` принимается **только как data URL** (`data:image/png;base64,...`). Ссылку на файл в это поле передавать нельзя;
- если `photo` — URL, приложение загрузит его напрямую (same-origin), иначе попробует резервный CORS-прокси;
- если `number`/`position` не переданы, поля останутся пустыми.

### 8.4. Логотип в data URL

Если нужно передать логотип вручную:

```js
async function imageToDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const logo = await imageToDataUrl(
  'https://perm-volley.ru/wp-content/uploads/2025/08/Triniks.png'
);
```

Проще не передавать логотип вручную, а использовать `?teamUrl=`: приложение само возьмёт featured image.

### 8.5. Прямой вызов API

Если iframe и родительская страница same-origin, можно вызвать метод напрямую:

```js
var frame = document.getElementById('passport-frame');
frame.contentWindow.TeamPass.importTeamData(payload, { photos: true })
  .then(function (result) {
    console.log('Игроков:', result.players);
  })
  .catch(console.error);
```

Публичный API:

```js
TeamPass.importTeamData(payload, { photos: true });
TeamPass.importTeam(payload);        // то же самое
TeamPass.openSiteImport();           // открыть окно импорта
TeamPass.state;                     // текущее состояние
TeamPass.render();                  // перерисовать лист
```

### 8.6. Данные в ссылке

Для небольших составов можно передать JSON в base64:

```php
<?php
$payload = [
    'teamName' => get_the_title(),
    'players'  => $players, // name / birth / photo
];
$encoded = rtrim(strtr(base64_encode(json_encode($payload, JSON_UNESCAPED_UNICODE)), '+/', '-_'), '=');
?>
<a href="/team-passport/?teamData=<?php echo urlencode($encoded); ?>">Создать паспорт</a>
```

Для составов с фотографиями ссылка получится очень длинной. Для WordPress-сайта предпочтительнее `?teamUrl=` или `postMessage`.

---

## 9. WordPress: что проверить и настроить

### 9.1. Логотип команды

Приложение берёт логотип из **«Изображения записи»** (featured image) команды.

В админке:

1. «Команды» → откройте команду.
2. Найдите блок «Изображение записи» / «Featured image».
3. Загрузите PNG с прозрачным фоном.
4. Обновите команду.

Если изображение не задано, в паспорте останется монограмма-заглушка. Это не ошибка.

### 9.2. REST API

Приложение обращается к публичным адресам:

```
/wp-json/wp/v2/teams?slug=<slug>&_fields=id,featured_media
/wp-json/wp/v2/media/<id>?_fields=source_url
```

Если плагин безопасности закрывает REST API для незалогиненных пользователей, состав загрузится, а логотип — нет. Разрешите публичное чтение `teams` и `media` или отключите ограничение для этих маршрутов.

Проверка в браузере:

```
https://perm-volley.ru/wp-json/wp/v2/teams?slug=trinix-group&_fields=id,featured_media
```

Должен вернуться JSON с `featured_media`.

### 9.3. Постоянные ссылки

Не хардкодьте URL команды. Используйте `get_permalink()`, иначе при смене slug или структуры ссылок кнопка сломается.

### 9.4. Кэш и CDN

После загрузки новой версии приложения:

- очистите кэш страниц WordPress;
- очистите кэш CDN;
- проверьте в инкогнито;
- при необходимости добавьте к ссылке на приложение версию: `/team-passport/?v=2026-11`.

Не кэшируйте HTML приложения надолго: в нём указаны пути к JS/CSS.

### 9.5. Плагины безопасности и WAF

Проверьте, что не блокируются:

- `/team-passport/index.html`;
- `/team-passport/js/*.js`;
- `/team-passport/css/*.css`;
- `/wp-json/wp/v2/teams` и `/wp-json/wp/v2/media`;
- фотографии `wp-content/uploads/*`.

Если Wordfence/iThemes/Cloudflare показывает 403 для статики, добавьте папку в исключения.

### 9.6. CSP и iframe

Если на сайте включена строгая Content-Security-Policy:

- `script-src 'self'` — приложение не использует inline-скрипты; инициализация темы вынесена в `js/theme-init.js`;
- `style-src 'self' 'unsafe-inline'` — в интерфейсе есть inline-стили цветовых образцов;
- `img-src 'self' data: https://perm-volley.ru`;
- `connect-src 'self'`;
- `font-src 'self' data:`;
- для iframe — `frame-src 'self'`.

Если приложение и сайт на одном домене, `X-Frame-Options: SAMEORIGIN` не мешает iframe. Для поддомена может понадобиться `frame-ancestors`.

### 9.7. MIME-типы

Если приложение открывается, но интерфейс не работает, проверьте в DevTools → Network:

- `js/app.js` должен отдаваться как `application/javascript` или `text/javascript`;
- `css/styles.css` — `text/css`;
- `font/woff2` — `font/woff2` или `application/octet-stream`.

Неверный MIME обычно означает, что файлы попали в «Медиафайлы» или сервер не настроен. Перезагрузите папку статикой.

---

## 10. Чек-лист приёмки

- [ ] `/team-passport/` открывается по HTTPS и не отдаёт 404.
- [ ] В консоли браузера нет ошибок 404/403 по JS, CSS, шрифтам.
- [ ] Кнопка «Создать паспорт» видна на странице команды без авторизации.
- [ ] Ссылка открывает приложение с `?teamUrl=...`.
- [ ] Импорт подтягивает название команды, игроков, даты рождения, фото.
- [ ] Логотип подтягивается из featured image; если его нет — заглушка.
- [ ] Номера и амплуа можно заполнить вручную.
- [ ] Excel скачивается и открывается в Excel/LibreOffice.
- [ ] PDF печатается без лишних страниц; 18 игроков — один лист.
- [ ] 24–60 игроков разбиваются на несколько листов и вкладок Excel.
- [ ] Тёмная/светлая тема меняет только интерфейс; паспорт остаётся белым.
- [ ] На мобильном кнопка и страница не ломают вёрстку.
- [ ] Проверено в инкогнито и после очистки кэша.
- [ ] На сервере нет `.bat` и `server.py`.
- [ ] Кнопка добавлена в дочернюю тему или плагин, а не в родительскую тему.

---

## 11. Если что-то не работает

| Симптом | Причина | Что сделать |
|---|---|---|
| 404 на `/team-passport/` | Папка не создана или лежит не в корне | Проверьте путь, регистр букв, права 755 |
| Белая страница | Неверный MIME JS или CSP | DevTools → Console/Network; проверьте `app.js` |
| Кнопка есть, импорт не идёт | Приложение на другом домене | Разместите на `perm-volley.ru` или используйте `postMessage` |
| Импорт идёт, но нет логотипа | Не задан featured image или закрыт REST | Заполните «Изображение записи»; проверьте `/wp-json/...` |
| Нет фотографий | Закрыт доступ к `uploads` или CORS | Проверьте прямые URL фото в браузере |
| Кнопка не появилась | Не тот шаблон / кэш | Проверьте `tpl-team-item.php` в дочерней теме, очистите кэш |
| iframe обрезан | Фиксированная высота | Увеличьте `height/min-height` или откройте в новой вкладке |
| В PDF лишняя страница | Старая версия приложения или масштаб печати | Обновите приложение, печатайте из Chrome/Edge |
| Excel без фото | Ограничения просмотрщика | Откройте в Excel/LibreOffice; проверьте встроенные изображения |
| После обновления старая версия | Кэш/CDN | Очистите кэш, добавьте `?v=` |
| Тема не меняется | Кнопка темы скрыта/не нажата | Иконка солнца/луны справа вверху; настройка хранится в браузере |
| Паспорт стал тёмным | Такого не должно быть | Тема применяется только к оболочке; проверьте, что не переопределены стили `.sheet` |

---

## 12. Безопасность и данные

- Приложение статическое: на сервере не выполняется PHP, Python или Node.
- В папку приложения не нужно загружать `.bat` и `server.py`.
- Приложение только читает публичную страницу команды и публичные REST-данные.
- Состав и фотографии не сохраняются на сервере: проект хранится в `localStorage` браузера пользователя.
- На сайте не используются сторонние CORS-прокси. `wsrv.nl` — только резервный режим локального запуска.
- Не передавайте в `teamUrl` произвольные домены. Ссылку формируйте через `get_permalink()` и `esc_url()`.
- Если нужен серверный прокси, ограничьте его доменом `perm-volley.ru`.
- Для доступа к приложению не нужна авторизация WordPress; не добавляйте в папку секреты и бэкапы.

---

## 13. Порядок внедрения

1. Сделайте бэкап сайта и дочерней темы.
2. Загрузите приложение в `/team-passport/` на staging-копию сайта.
3. Проверьте импорт на тестовой команде.
4. Добавьте кнопку в дочернюю тему на staging.
5. Проверьте под незалогиненным пользователем и на мобильном.
6. Перенесите папку и кнопку на production.
7. Очистите кэш/CDN.
8. Проверьте одну команду, затем ещё две с логотипом и без.
9. Передайте редакторам инструкцию: заполнять featured image и проверять номера/амплуа.

### Обновление приложения

1. Скачайте новую версию архива.
2. Замените содержимое `/team-passport/`, сохранив путь.
3. Удалите из папки `.bat` и `server.py`, если они попали.
4. Очистите кэш.
5. Проверьте импорт и экспорт.

База данных и записи команд при обновлении не меняются.

---

## 14. Что передать разработчику

- Адрес сайта и папки приложения.
- Название темы и файл `tpl-team-item.php`.
- Скриншот страницы команды с местом для кнопки.
- Список команд, у которых не задан featured image.
- Доступ к staging (через защищённый канал, не в этом документе).
- Требования по стилю кнопки: классы темы, цвет, размер.

---

## Приложение A. Минимальный payload

```json
{
  "team": {
    "name": "ДЕМО-КОМАНДА 2027",
    "season": "СЕЗОН 26/27",
    "accent": "#D9251C"
  },
  "players": [
    {
      "name": "Иванов Иван",
      "birth": "12.03.2001",
      "number": "1",
      "position": "Либеро",
      "captain": true,
      "photo": "https://perm-volley.ru/wp-content/uploads/.../photo.jpg"
    }
  ]
}
```

---

## Приложение B. Проверка REST для логотипа

```bash
curl -s "https://perm-volley.ru/wp-json/wp/v2/teams?slug=trinix-group&_fields=id,featured_media"
```

Ожидаемый ответ:

```json
[
  {
    "id": 11462,
    "featured_media": 13090
  }
]
```

Затем:

```bash
curl -s "https://perm-volley.ru/wp-json/wp/v2/media/13090?_fields=source_url"
```

Ожидаемый ответ:

```json
{
  "source_url": "https://perm-volley.ru/wp-content/uploads/2025/08/Triniks.png"
}
```

Если `featured_media` равно `0`, логотип у команды не задан.

---

## Приложение C. Состав файлов приложения

```
team-passport/
├── index.html
├── css/
│   ├── fonts.css
│   ├── ui-fonts.css
│   ├── styles.css
│   ├── theme.css
│   └── shell.css
├── js/
│   ├── app.js
│   ├── brand.js
│   ├── demo-data.js
│   ├── exporter.js
│   ├── site-import.js
│   └── theme-init.js
├── assets/
│   ├── brand/
│   │   ├── fed-logo.png
│   │   └── fed-mark.png
│   └── fonts/
│       ├── OFL.txt
│       ├── GOLOS-OFL.txt
│       ├── golos-text-cyrillic.woff2
│       └── golos-text-latin.woff2
├── vendor/
│   ├── exceljs.min.js
│   └── EXCELJS-LICENSE.txt
└── preview.png (необязательно)
```

На сервер не загружаются:

```
Открыть паспорт команды.bat
server.py
README.md
SITE-INTEGRATION.md
WORDPRESS-INTEGRATION.md
```
