<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>${msg("registerTitle")}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    <link href="${url.resourcesPath}/css/styles.css?v=${.now?long}" rel="stylesheet" />
</head>
<body>
    <div class="np-top-nav">
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
    </div>
    <div class="np-auth-page">
        <div class="np-auth-container">
            <div class="np-auth-left" style="overflow-y: auto; max-height: 100%; padding-right: 10px; display: block;">
                <div class="np-auth-heading" style="margin-top: 20px;">
                    <h1 class="np-auth-signup-title">${msg("registerTitle")}</h1>
                    <p class="np-auth-subtitle">${msg("registerSubtitle")}</p>
                </div>

                <#if message?has_content && (message.type != 'warning') && (message.type != 'info')>
                    <div style="margin-bottom: 20px; border: 1px solid #f87171; padding: 12px 16px; border-radius: 10px; background: rgba(248, 113, 113, 0.08); color: #f87171; font-size: 14px;">
                        ${message.summary}
                    </div>
                </#if>

                <#assign fd = (register.formData)!{}>
                <form id="kc-register-form" class="np-auth-form" action="${url.registrationAction}" method="post">

                    <div style="display: flex; gap: 15px;">
                        <div class="np-input-group" style="flex: 1;">
                            <div class="np-input-label-pill-wrapper"><span class="np-input-label-pill">${msg("firstName")}</span></div>
                            <input type="text" id="firstName" class="np-input" name="firstName" value="${(fd.firstName)!''}" />
                        </div>
                        <div class="np-input-group" style="flex: 1;">
                            <div class="np-input-label-pill-wrapper"><span class="np-input-label-pill">${msg("lastName")}</span></div>
                            <input type="text" id="lastName" class="np-input" name="lastName" value="${(fd.lastName)!''}" />
                        </div>
                    </div>

                    <div class="np-input-group">
                        <div class="np-input-label-pill-wrapper"><span class="np-input-label-pill">${msg("email")}</span></div>
                        <input type="text" id="email" class="np-input" name="email" value="${(fd.email)!''}" autocomplete="email" />
                    </div>

                    <div class="np-input-group">
                        <div class="np-input-label-pill-wrapper"><span class="np-input-label-pill">${msg("passwordLabel")}</span></div>
                        <input type="password" id="password" class="np-input" name="password" autocomplete="new-password"/>
                    </div>

                    <div class="np-input-group">
                        <div class="np-input-label-pill-wrapper"><span class="np-input-label-pill">${msg("passwordConfirm")}</span></div>
                        <input type="password" id="password-confirm" class="np-input" name="password-confirm" />
                    </div>

                    <button class="np-primary-button" type="submit">${msg("doRegisterBtn")}</button>
                </form>

                <div class="np-auth-footer-text" style="margin-bottom: 20px;">
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
</body>
</html>
