<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <meta name="robots" content="noindex, nofollow">
    <title>${msg("loginTitle",(realm.displayName!'ForestInventory'))}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    <link href="${url.resourcesPath}/css/styles.css?v=${.now?long}" rel="stylesheet" />
</head>
<body>
   <!-- TOP NAVIGATION -->
    <div class="np-top-nav">
        <!-- LOGO START -->
        <a href="https://forest-inventory.eu" title="${msg('backToHome')}" style="text-decoration: none; display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; background: #059669; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 14l-5-10-5 10"/>
                    <path d="M13 18l-1-4-1 4"/>
                    <path d="M7 14l-3 6h16l-3-6"/>
                    <line x1="12" y1="18" x2="12" y2="21"/>
                    <line x1="9" y1="21" x2="15" y2="21"/>
                </svg>
            </div>
            <span style="font-weight: 700; font-size: 18px; color: #ffffff; letter-spacing: -0.02em;">Forest<span style="color: #34d399;">Inventory</span></span>
        </a>
        <!-- LOGO END -->

        <a href="https://forest-inventory.eu" class="np-back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            ${msg("backToHome")}
        </a>
    </div>
    <div class="np-auth-page">
        <div class="np-auth-container">
            <div class="np-auth-left">
                <div class="np-auth-heading">
                    <h1 class="np-auth-signup-title">${msg("loginWelcome")}</h1>
                    <p class="np-auth-subtitle">${msg("loginSubtitle")}</p>
                </div>
                <#if message?has_content && (message.type != 'warning') && (message.type != 'info')>
                    <div class="np-error-msg" style="margin-bottom: 20px; border: 1px solid #f87171; padding: 12px 16px; border-radius: 10px; background: rgba(248, 113, 113, 0.08); color: #f87171; font-size: 14px;">
                        ${message.summary}
                    </div>
                </#if>
                <form id="kc-form-login" class="np-auth-form" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                    <div class="np-input-group">
                        <div class="np-input-label-pill-wrapper"><span class="np-input-label-pill">${msg("emailUsernameLabel")}</span></div>
                        <input id="username" class="np-input" name="username" value="${(login.username!'')}" type="text" autofocus autocomplete="off" />
                    </div>
                    <div class="np-input-group">
                        <div class="np-input-label-pill-wrapper"><span class="np-input-label-pill">${msg("passwordLabel")}</span></div>
                        <input id="password" class="np-input" name="password" type="password" autocomplete="off" />
                    </div>
                    <button class="np-primary-button" name="login" id="kc-login" type="submit">${msg("loginBtn")}</button>
                </form>
                <div class="np-auth-footer-text">
                    <#if realm.password && realm.registrationAllowed && !(registrationDisabled??)>
                        ${msg("noAccount")} <a href="${url.registrationUrl}" class="np-link">${msg("doRegister")}</a>
                    </#if>
                </div>
            </div>
            <div class="np-auth-right">
                <div class="np-image-bg"></div>
                <div class="np-image-overlay"></div>
                <div class="np-image-content">
                    <div class="np-quote-icon">"</div>
                    <div class="np-image-title">${msg("loginPromoTitle")}</div>
                    <p class="np-image-text">${msg("loginPromoText")}</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
