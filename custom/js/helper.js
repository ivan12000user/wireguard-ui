function renderClientList(data) {
    $.each(data, function(index, obj) {
        // render telegram button
        let telegramButton = ''
        if (obj.Client.telegram_userid) {
            telegramButton =    `<div class="btn-group">      
                                    <button type="button" class="btn btn-outline-primary btn-sm" data-toggle="modal"
                                        data-target="#modal_telegram_client" data-clientid="${obj.Client.id}"
                                        data-clientname="${obj.Client.name}">Telegram</button>
                                </div>`
        }

        let telegramHtml = "";
        if (obj.Client.telegram_userid && obj.Client.telegram_userid.length > 0) {
            telegramHtml = `<span class="info-box-text" style="display: none"><i class="fas fa-tguserid"></i>${obj.Client.telegram_userid}</span>`
        }

        // render client status css tag style
        let clientStatusHtml = '>'
        if (obj.Client.enabled) {
            clientStatusHtml = `style="visibility: hidden;">`
        }

        // render client allocated ip addresses
        let allocatedIpsHtml = "";
        $.each(obj.Client.allocated_ips, function(index, obj) {
            allocatedIpsHtml += `<small class="badge badge-secondary">${obj}</small>&nbsp;`;
        })

        // render client allowed ip addresses
        let allowedIpsHtml = "";
        $.each(obj.Client.allowed_ips, function(index, obj) {
            allowedIpsHtml += `<small class="badge badge-secondary">${obj}</small>&nbsp;`;
        })

        let subnetRangesString = "";
        if (obj.Client.subnet_ranges && obj.Client.subnet_ranges.length > 0) {
            subnetRangesString = obj.Client.subnet_ranges.join(',')
        }

        // render client html content
        let html = `<div class="col-sm-6 col-md-6 col-lg-4" id="client_${obj.Client.id}">
                        <div class="info-box">
                            <div class="overlay" id="paused_${obj.Client.id}"` + clientStatusHtml
                                + `<i class="paused-client fas fa-3x fa-play" onclick="resumeClient('${obj.Client.id}')"></i>
                            </div>
                            <div class="info-box-content">
                                <div class="btn-group">
                                    <a href="${window.WGUI_BASE_PATH}/download?clientid=${obj.Client.id}" class="btn btn-outline-primary btn-sm">Download</a>
                                </div>
                                <div class="btn-group">      
                                    <button type="button" class="btn btn-outline-primary btn-sm" data-toggle="modal"
                                        data-target="#modal_qr_client" data-clientid="${obj.Client.id}"
                                        data-clientname="${obj.Client.name}" ${obj.QRCode != "" ? '' : ' disabled'}>QR code</button>
                                </div>
                                <div class="btn-group">      
                                    <button type="button" class="btn btn-outline-primary btn-sm" data-toggle="modal"
                                        data-target="#modal_email_client" data-clientid="${obj.Client.id}"
                                        data-clientname="${obj.Client.name}">Email</button>
                                </div>
                                ${telegramButton}
                                <div class="btn-group">
                                    <button type="button" class="btn btn-outline-danger btn-sm">More</button>
                                    <button type="button" class="btn btn-outline-danger btn-sm dropdown-toggle dropdown-icon" 
                                        data-toggle="dropdown">
                                    </button>
                                    <div class="dropdown-menu" role="menu">
                                        <a class="dropdown-item" href="#" data-toggle="modal"
                                        data-target="#modal_edit_client" data-clientid="${obj.Client.id}"
                                        data-clientname="${obj.Client.name}">Edit</a>
                                        <a class="dropdown-item" href="#" data-toggle="modal"
                                        data-target="#modal_pause_client" data-clientid="${obj.Client.id}"
                                        data-clientname="${obj.Client.name}">Disable</a>
                                        <a class="dropdown-item" href="#" data-toggle="modal"
                                        data-target="#modal_remove_client" data-clientid="${obj.Client.id}"
                                        data-clientname="${obj.Client.name}">Delete</a>
                                    </div>
                                </div>
                                <hr>
                                <span class="info-box-text"><i class="fas fa-user"></i> ${obj.Client.name}</span>
                                <span class="info-box-text" style="display: none"><i class="fas fa-key"></i> ${obj.Client.public_key}</span>
                                <span class="info-box-text" style="display: none"><i class="fas fa-subnetrange"></i>${subnetRangesString}</span>
                                ${telegramHtml}
                                <span class="info-box-text"><i class="fas fa-envelope"></i> ${obj.Client.email}</span>
                                <span class="info-box-text"><i class="fas fa-clock"></i>
                                    ${prettyDateTime(obj.Client.created_at)}</span>
                                <span class="info-box-text"><i class="fas fa-history"></i>
                                    ${prettyDateTime(obj.Client.updated_at)}</span>
                                <span class="info-box-text"><i class="fas fa-server" style="${obj.Client.use_server_dns ? "opacity: 1.0" : "opacity: 0.5"}"></i>
                                    ${obj.Client.use_server_dns ? 'DNS enabled' : 'DNS disabled'}</span>
                                <span class="info-box-text"><strong>IP Allocation</strong></span>`
                                + allocatedIpsHtml
                                + `<span class="info-box-text"><strong>Allowed IPs</strong></span>`
                                + allowedIpsHtml
                            +`</div>
                        </div>
                    </div>`

        // add the client html elements to the list
        $('#client-list').append(html);
    });
}

function renderUserList(data) {
    $.each(data, function(index, obj) {
        let clientStatusHtml = '>'

        // render user html content
        let html = `<div class="col-sm-6 col-md-6 col-lg-4" id="user_${obj.username}">
                        <div class="info-box">
                            <div class="info-box-content">
                                <div class="btn-group">
                                     <button type="button" class="btn btn-outline-primary btn-sm" data-toggle="modal" data-target="#modal_edit_user" data-username="${obj.username}">Edit</button>
                                </div>
                                <div class="btn-group">
                                    <button type="button" class="btn btn-outline-danger btn-sm" data-toggle="modal"
                                        data-target="#modal_remove_user" data-username="${obj.username}">Delete</button>
                                </div>
                                <hr>
                                <span class="info-box-text"><i class="fas fa-user"></i> ${obj.username}</span>
                                <span class="info-box-text"><i class="fas fa-terminal"></i> ${obj.admin? 'Administrator':'Manager'}</span>
                                </div>
                        </div>
                    </div>`

        // add the user html elements to the list
        $('#users-list').append(html);
    });
}


function prettyDateTime(timeStr) {
    const dt = new Date(timeStr);
    const offsetMs = dt.getTimezoneOffset() * 60 * 1000;
    const dateLocal = new Date(dt.getTime() - offsetMs);
    return dateLocal.toISOString().slice(0, 19).replace(/-/g, "/").replace("T", " ");
}

// WGUI_THEME_TOGGLE_V6
(function () {
  const KEY = "wgui_theme"; // dark|light
  const COOKIE = "wgui_theme";

  function getCookie(name) {
    const m = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[2]) : "";
  }
  function setCookie(name, value, days) {
    const maxAge = days ? ("; Max-Age=" + (days*24*60*60)) : "";
    document.cookie = name + "=" + encodeURIComponent(value) + "; Path=/" + maxAge;
  }

  function getMode(){
    const c = getCookie(COOKIE);
    if (c === "dark" || c === "light") return c;

    try {
      const ls = localStorage.getItem(KEY);
      if (ls === "dark" || ls === "light") return ls;
    } catch(e) {}

    // если где-то уже включили класс — держим его
    if (document.documentElement.classList.contains("dark-mode") || document.body.classList.contains("dark-mode")) return "dark";
    return "light";
  }
  function isDark(){ return getMode() === "dark"; }

  function persist(mode){
    // cookie — основной источник истины (на 365 дней)
    setCookie(COOKIE, mode, 365);
    // localStorage — вторично
    try { localStorage.setItem(KEY, mode); } catch(e) {}
  }

  function setMode(mode){
    persist(mode);
    apply(mode);
  }

  function toggle(){
    setMode(isDark() ? "light" : "dark");
  }

  function apply(mode){
    const dark = (mode === "dark");
    document.documentElement.classList.toggle("dark-mode", dark);
    document.body.classList.toggle("dark-mode", dark);

    // иконки
    const e1 = document.getElementById("wgui-theme-emoji");
    if (e1) e1.textContent = dark ? "☀️" : "🌙";
    const e2 = document.getElementById("wgui-theme-fab-emoji");
    if (e2) e2.textContent = dark ? "☀️" : "🌙";
  }

  function ensureButtons(){
    // navbar справа (если есть)
    const nav = document.querySelector(".main-header.navbar");
    if (nav && !document.getElementById("wgui-theme-toggle")) {
      const slot = nav.querySelector(".navbar-nav.ml-auto") || nav.querySelector(".navbar-nav");
      if (slot) {
        const li = document.createElement("li");
        li.className = "nav-item";
        li.innerHTML =
          '<a class="nav-link" href="#" id="wgui-theme-toggle" title="Тема" aria-label="Переключить тему" style="display:flex;align-items:center;gap:6px">' +
          '<span id="wgui-theme-emoji" style="font-size:18px">🌙</span>' +
          "</a>";
        if (slot.classList.contains("ml-auto")) slot.prepend(li);
        else slot.appendChild(li);
      }
    }

    // Плавающая кнопка — ДЛЯ МОБИЛЫ (и вообще как fallback)
    if (!document.getElementById("wgui-theme-fab")) {
      const b = document.createElement("button");
      b.id = "wgui-theme-fab";
      b.type = "button";
      b.setAttribute("aria-label", "Переключить тему");
      b.innerHTML = '<span id="wgui-theme-fab-emoji" style="font-size:18px">🌙</span>';
      document.body.appendChild(b);
    }
  }

  function init(){
    ensureButtons();
    apply(getMode());

    // делегированный клик (не теряется при перерисовке)
    if (!window.__wguiThemeV6Bound) {
      window.__wguiThemeV6Bound = true;
      document.addEventListener("click", function(ev){
        const t = ev.target.closest("#wgui-theme-toggle, #wgui-theme-fab");
        if (!t) return;
        ev.preventDefault();
        toggle();
      }, true);
    }

    // только восстанавливаем кнопки (без apply по таймеру)
    setInterval(function(){
      ensureButtons();
    }, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();



// WGUI_THEME_HELPER_V2
(function(){
  const KEY = "wgui_theme";

  function setCookie(name, value){
    try{ document.cookie = name + "=" + encodeURIComponent(value) + "; Path=/; Max-Age=31536000; SameSite=Lax"; }catch(e){}
  }

  function applyTheme(t){
    const isDark = (t === "dark");
    const html = document.documentElement;
    html.classList.toggle("dark-mode", isDark);
    html.setAttribute("data-theme", isDark ? "dark" : "light");
    if (document.body){
      document.body.classList.toggle("dark-mode", isDark);
      document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    }
    // icon
    const ico = document.getElementById("wgui-theme-ico");
    if (ico) ico.textContent = isDark ? "🌙" : "☀️";
    // floating ico if any
    const fabIco = document.querySelector("#wgui-theme-fab .wgui-theme-fab-ico");
    if (fabIco) fabIco.textContent = isDark ? "🌙" : "☀️";
  }

  function getTheme(){
    try { return localStorage.getItem(KEY) || ""; } catch(e){ return ""; }
  }

  function setTheme(t){
    try { localStorage.setItem(KEY, t); } catch(e){}
    setCookie(KEY, t);
    applyTheme(t);
  }

  function toggleTheme(){
    const cur = getTheme() || (document.documentElement.classList.contains("dark-mode") ? "dark" : "light");
    setTheme(cur === "dark" ? "light" : "dark");
  }

  // optional: create floating button if you ever want it (e.g. some pages without navbar)
  function ensureFab(){
    if (document.getElementById("wgui-theme-fab")) return;
    // only if navbar button missing
    if (document.getElementById("wgui-theme-toggle")) return;

    const b = document.createElement("button");
    b.id = "wgui-theme-fab";
    b.type = "button";
    b.className = "wgui-theme-fab";
    b.innerHTML = '<span class="wgui-theme-fab-ico" aria-hidden="true">🌙</span>';
    b.title = "Тема";
    b.addEventListener("click", function(ev){ ev.preventDefault(); toggleTheme(); });
    document.body.appendChild(b);
  }

  document.addEventListener("DOMContentLoaded", function(){
    // bind navbar button
    const btn = document.getElementById("wgui-theme-toggle");
    if (btn && !btn.dataset.bound){
      btn.dataset.bound = "1";
      btn.addEventListener("click", function(ev){ ev.preventDefault(); toggleTheme(); });
    }
    ensureFab();
    // sync icon with current state
    const cur = getTheme() || (document.documentElement.classList.contains("dark-mode") ? "dark" : "light");
    applyTheme(cur === "dark" ? "dark" : "light");
  });
})();
