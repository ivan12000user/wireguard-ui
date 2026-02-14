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

// WGUI_THEME_TOGGLE_V2
(function () {
  const KEY = "wgui_theme"; // dark|light

  function getMode(){ try{return localStorage.getItem(KEY)||"light"}catch(e){return"light"} }
  function isDark(){ return getMode()==="dark"; }
  function setMode(m){ try{localStorage.setItem(KEY,m)}catch(e){} apply(); }
  function toggle(){ setMode(isDark()?"light":"dark"); }

  function ensureStyle(){
    if (document.getElementById("wgui-theme-style")) return;
    const st=document.createElement("style");
    st.id="wgui-theme-style";
    st.textContent=`
      #wgui-theme-fab{
        position:fixed; right:14px; bottom:14px; z-index:1060;
        border:0; border-radius:999px; padding:10px 12px;
        box-shadow:0 6px 18px rgba(0,0,0,.25);
        cursor:pointer; background:rgba(120,120,120,.85); color:#fff;
        backdrop-filter: blur(6px);
      }
      body.dark-mode #wgui-theme-fab{ background:rgba(40,40,40,.85); }
    `;
    document.head.appendChild(st);
  }

  function ensureButtons(){
    ensureStyle();

    // navbar справа (если есть)
    const nav=document.querySelector(".main-header.navbar");
    if(nav && !document.getElementById("wgui-theme-toggle")){
      const slot = nav.querySelector(".navbar-nav.ml-auto") || nav.querySelector(".navbar-nav");
      if(slot){
        const li=document.createElement("li");
        li.className="nav-item";
        li.innerHTML =
          '<a class="nav-link" href="#" id="wgui-theme-toggle" title="Тема" aria-label="Переключить тему">' +
          '<i id="wgui-theme-icon" class="fas fa-moon"></i>' +
          '</a>';
        if(slot.classList.contains("ml-auto")) slot.prepend(li); else slot.appendChild(li);
        li.querySelector("#wgui-theme-toggle").addEventListener("click", function(ev){ ev.preventDefault(); toggle(); });
      }
    }

    // fallback: плавающая кнопка
    if(!document.getElementById("wgui-theme-toggle") && !document.getElementById("wgui-theme-fab")){
      const b=document.createElement("button");
      b.id="wgui-theme-fab";
      b.type="button";
      b.setAttribute("aria-label","Переключить тему");
      b.innerHTML='<i id="wgui-theme-fab-icon" class="fas fa-moon"></i>';
      b.addEventListener("click", toggle);
      document.body.appendChild(b);
    }
  }

  function apply(){
    const dark=isDark();
    document.body.classList.toggle("dark-mode", dark);

    const nav=document.querySelector(".main-header.navbar");
    if(nav){
      nav.classList.toggle("navbar-dark", dark);
      nav.classList.toggle("navbar-gray-dark", dark);
      nav.classList.toggle("navbar-light", !dark);
      nav.classList.toggle("navbar-white", !dark);
    }

    const i1=document.getElementById("wgui-theme-icon");
    if(i1){ i1.classList.toggle("fa-moon", !dark); i1.classList.toggle("fa-sun", dark); }
    const i2=document.getElementById("wgui-theme-fab-icon");
    if(i2){ i2.classList.toggle("fa-moon", !dark); i2.classList.toggle("fa-sun", dark); }
  }

  function init(){ ensureButtons(); apply(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
