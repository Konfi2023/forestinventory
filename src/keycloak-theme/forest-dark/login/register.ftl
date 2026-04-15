<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <meta name="robots" content="noindex, nofollow">
    <title>${msg("registerTitle")}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    <link href="${url.resourcesPath}/css/styles.css?v=${.now?long}" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
    <canvas id="forest-net-bg"></canvas>
    <!-- TOP NAVIGATION -->
    <div class="np-top-nav">
        <a href="https://forest-manager.eu" title="${msg('backToHome')}" style="text-decoration: none; display: flex; align-items: center;">
            <svg height="30" viewBox="0 0 285 47" fill="none" xmlns="http://www.w3.org/2000/svg" style="height: 30px; width: auto;">
                <g>
                    <mask id="mask0_kc_reg" style="mask-type: alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="47" height="47">
                        <rect width="47" height="47" fill="#D9D9D9"/>
                    </mask>
                    <g mask="url(#mask0_kc_reg)">
                        <path d="M23.5116 43.4812C20.42 43.0973 17.6472 42.3101 15.1931 41.1194C12.7386 39.9287 10.6533 38.3753 8.93716 36.4591C7.22134 34.5425 5.90322 32.3142 4.9828 29.7743C4.06271 27.2347 3.587 24.4197 3.55566 21.3295C7.20828 21.6653 10.2886 22.2987 12.7965 23.2295C15.3045 24.1604 17.3453 25.4966 18.9188 27.2382C20.4926 28.9799 21.636 31.1753 22.3488 33.8246C23.0616 36.4742 23.4492 39.6931 23.5116 43.4812ZM23.4998 25.9639C22.7256 24.7902 21.6608 23.6485 20.3053 22.5387C18.9498 21.429 17.4078 20.4523 15.6792 19.6086C15.8829 18.2691 16.221 16.8708 16.6936 15.4138C17.1662 13.9568 17.7405 12.5126 18.4165 11.081C19.0928 9.64947 19.8627 8.26134 20.7263 6.91662C21.5896 5.57222 22.5102 4.33407 23.4881 3.20215C24.4738 4.34941 25.3983 5.59344 26.2616 6.93424C27.1252 8.27505 27.8971 9.66122 28.5773 11.0928C29.2572 12.524 29.8334 13.9663 30.306 15.4197C30.7786 16.8728 31.1168 18.2691 31.3204 19.6086C29.6075 20.4197 28.0773 21.3761 26.7296 22.478C25.3816 23.5799 24.305 24.7419 23.4998 25.9639ZM27.885 42.5573C27.7962 40.0852 27.5994 37.847 27.2946 35.8427C26.9897 33.8383 26.5359 31.975 25.9331 30.2526C27.5138 27.5779 29.7012 25.4335 32.4954 23.8195C35.2896 22.2058 38.9352 21.3758 43.4322 21.3295C43.3869 26.5647 41.9883 31.049 39.2365 34.7822C36.485 38.5155 32.7012 41.1072 27.885 42.5573Z" fill="#15803d"/>
                    </g>
                </g>
                <text x="58" y="33" fill="#0f172a" font-family="sans-serif" font-weight="700" font-size="26" letter-spacing="-0.5">Forest</text>
                <text x="138" y="33" fill="#16a34a" font-family="sans-serif" font-weight="700" font-size="26" letter-spacing="-0.5">Manager</text>
            </svg>
        </a>

        <a href="https://forest-manager.eu" class="np-back-link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            ${msg("backToHome")}
        </a>
    </div>

    <div class="np-auth-page">
        <div class="np-auth-container">
            <div class="np-auth-left" style="overflow-y: auto; max-height: calc(100vh - 100px);">
                <div class="app-logo-section">
                    <img src="${url.resourcesPath}/img/medeina-logo.svg" alt="ForestManager">
                    <div class="app-brand">Forest<span>Manager</span></div>
                </div>

                <div class="np-auth-heading">
                    <h1 class="np-auth-signup-title">${msg("registerTitle")}</h1>
                    <p class="np-auth-subtitle">${msg("registerSubtitle")}</p>
                </div>

                <#if message?has_content && (message.type != 'warning') && (message.type != 'info')>
                    <div class="np-error-msg">
                        ${message.summary}
                    </div>
                </#if>

                <#assign fd = (register.formData)!{}>
                <form id="kc-register-form" class="np-auth-form" action="${url.registrationAction}" method="post">

                    <div style="display: flex; gap: 12px;">
                        <div class="np-input-group" style="flex: 1;">
                            <div class="np-input-label-pill-wrapper"><span class="np-input-label-pill">${msg("firstName")}</span></div>
                            <input type="text" id="firstName" class="np-input" name="firstName" value="${(fd.firstName)!''}" autocomplete="given-name" />
                        </div>
                        <div class="np-input-group" style="flex: 1;">
                            <div class="np-input-label-pill-wrapper"><span class="np-input-label-pill">${msg("lastName")}</span></div>
                            <input type="text" id="lastName" class="np-input" name="lastName" value="${(fd.lastName)!''}" autocomplete="family-name" />
                        </div>
                    </div>

                    <div class="np-input-group">
                        <div class="np-input-label-pill-wrapper"><span class="np-input-label-pill">${msg("email")}</span></div>
                        <input type="text" id="email" class="np-input" name="email" value="${(fd.email)!''}" autocomplete="email" />
                    </div>

                    <div class="np-input-group">
                        <div class="np-input-label-pill-wrapper"><span class="np-input-label-pill">${msg("passwordLabel")}</span></div>
                        <input type="password" id="password" class="np-input" name="password" autocomplete="new-password" />
                    </div>

                    <div class="np-input-group">
                        <div class="np-input-label-pill-wrapper"><span class="np-input-label-pill">${msg("passwordConfirm")}</span></div>
                        <input type="password" id="password-confirm" class="np-input" name="password-confirm" autocomplete="new-password" />
                    </div>

                    <input type="hidden" name="user.attributes.locale" value="${locale.currentLanguageTag!'de'}" />
                    <button class="np-primary-button" type="submit">${msg("doRegisterBtn")}</button>
                </form>

                <div class="np-auth-footer-text" style="margin-bottom: 8px;">
                    ${msg("alreadyAccount")} <a href="${url.loginUrl}" class="np-link">${msg("doLogin")}</a>
                </div>
            </div>

            <div class="np-auth-right">
                <div class="np-image-bg"></div>
                <div class="np-image-overlay"></div>
                <div class="np-image-content">
                    <div class="np-image-title">${msg("registerPromoTitle")}</div>
                    <p class="np-image-text">${msg("registerPromoText")}</p>
                </div>
            </div>
        </div>
    </div>
    <script>
    (function() {
      var isApp = navigator.userAgent.indexOf('CapacitorApp') > -1
        || window.Capacitor
        || document.URL.indexOf('capacitor://') === 0
        || document.URL.indexOf('https://localhost') === 0;
      if (isApp) {
        document.body.classList.add('is-native-app');

        // Registrierungsformular durch Hinweis-Seite ersetzen
        var authLeft = document.querySelector('.np-auth-left');
        if (authLeft) {
          authLeft.innerHTML = ''
            + '<div class="app-logo-section" style="display:flex;flex-direction:column;align-items:center;margin-bottom:40px;">'
            + '  <img src="' + document.querySelector('.app-logo-section img').src + '" style="height:72px;margin-bottom:12px;" alt="ForestManager">'
            + '  <div class="app-brand" style="font-size:26px;font-weight:700;">Forest<span style="color:#2b5741;">Manager</span></div>'
            + '</div>'
            + '<div style="text-align:center;padding:0 20px;">'
            + '  <h1 style="font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:16px;font-family:Nunito,sans-serif;">Willkommen bei ForestManager</h1>'
            + '  <p style="font-size:15px;color:#4a4a44;line-height:1.7;margin-bottom:32px;">'
            + '    Diese App ist die mobile Erweiterung der ForestManager Plattform.<br><br>'
            + '    Um ein Konto zu erstellen, registrieren Sie sich bitte auf unserer Webseite.'
            + '  </p>'
            + '  <a href="https://forest-manager.eu/signin" target="_blank" rel="noopener"'
            + '     style="display:inline-block;padding:14px 36px;background:#2b5741;color:white;border-radius:14px;font-size:15px;font-weight:700;text-decoration:none;font-family:Nunito,sans-serif;">'
            + '    Auf forest-manager.eu registrieren'
            + '  </a>'
            + '  <div style="margin-top:24px;">'
            + '    <a href="' + document.querySelector('a.np-link[href*="login"]')?.href + '" style="font-size:14px;color:#2b5741;text-decoration:none;font-weight:600;">'
            + '      Zurück zum Login'
            + '    </a>'
            + '  </div>'
            + '</div>';
        }

        var canvas = document.getElementById('forest-net-bg');
        if (canvas) {
          canvas.style.display = 'block';
          var ctx = canvas.getContext('2d');
          var w, h, nodes = [];
          function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
          window.addEventListener('resize', resize); resize();
          var count = Math.min(80, Math.floor(w * h / 12000));
          for (var i = 0; i < count; i++) {
            nodes.push({ x: Math.random()*w, y: Math.random()*h, vx: (Math.random()-0.5)*0.25, vy: (Math.random()-0.5)*0.25, r: Math.random()*2+1.5, pulse: Math.random()*Math.PI*2 });
          }
          function draw() {
            ctx.clearRect(0,0,w,h); var t=Date.now()*0.001;
            for(var i=0;i<nodes.length;i++) for(var j=i+1;j<nodes.length;j++) {
              var dx=nodes[i].x-nodes[j].x,dy=nodes[i].y-nodes[j].y,dist=Math.sqrt(dx*dx+dy*dy);
              if(dist<200){ctx.strokeStyle='rgba(43,87,65,'+(1-dist/200)*0.25+')';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(nodes[i].x,nodes[i].y);ctx.lineTo(nodes[j].x,nodes[j].y);ctx.stroke();}
            }
            for(var k=0;k<nodes.length;k++){var n=nodes[k],p=Math.sin(t+n.pulse)*0.4+0.6;ctx.fillStyle='rgba(43,87,65,'+(p*0.5)+')';ctx.beginPath();ctx.arc(n.x,n.y,n.r*(0.8+p*0.4),0,Math.PI*2);ctx.fill();n.x+=n.vx;n.y+=n.vy;if(n.x<0||n.x>w)n.vx*=-1;if(n.y<0||n.y>h)n.vy*=-1;}
            requestAnimationFrame(draw);
          }
          draw();
        }
      }
    })();
    </script>
</body>
</html>
