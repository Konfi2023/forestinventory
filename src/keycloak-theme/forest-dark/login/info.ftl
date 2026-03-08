<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>${msg("loginTitle",(realm.displayName!'ForestInventory'))}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    <link href="${url.resourcesPath}/css/styles.css?v=${.now?long}" rel="stylesheet" />
</head>

<body>
    <!-- TOP NAV -->
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

    <!-- PAGE CONTAINER -->
    <div class="np-auth-page">
        <div class="np-auth-container" style="justify-content: center; gap: 0;">

            <div class="np-auth-left" style="text-align: center; align-items: center; max-width: 600px;">

                <#if message.type = 'warning' || message.type = 'error'>
                    <div style="background: rgba(248, 113, 113, 0.08); padding: 20px; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px auto;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    </div>
                    <h1 class="np-auth-signup-title" style="color: #f87171;">${msg("noticeTitle")}</h1>
                <#else>
                    <div style="background: rgba(16, 185, 129, 0.08); padding: 20px; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px auto;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <h1 class="np-auth-signup-title">${msg("successTitle")}</h1>
                </#if>

                <p class="np-auth-subtitle" style="font-size: 18px; line-height: 1.6; margin-bottom: 40px; color: #cbd5e1;">
                    ${message.summary}
                </p>

                <#if pageRedirectUri?has_content>
                    <a href="${pageRedirectUri}" class="np-primary-button" style="text-decoration: none; display: flex; align-items: center; justify-content: center;">
                        ${msg("continueToLogin")}
                    </a>
                <#elseif actionUri?has_content>
                    <a href="${actionUri}" class="np-primary-button" style="text-decoration: none; display: flex; align-items: center; justify-content: center;">
                        ${msg("continue")}
                    </a>
                <#else>
                    <a href="https://forest-inventory.eu" class="np-primary-button" style="text-decoration: none; display: flex; align-items: center; justify-content: center;">
                        ${msg("continueToLogin")}
                    </a>
                </#if>

            </div>

        </div>
    </div>
</body>
</html>
