<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>${msg("emailVerifyTitle")}</title>
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
        <div class="np-auth-container" style="justify-content: center; gap: 0;">

            <div class="np-auth-left" style="text-align: center; align-items: center; max-width: 600px;">

                <div style="background: rgba(16, 185, 129, 0.08); padding: 20px; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px auto;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>

                <h1 class="np-auth-signup-title">${msg("emailVerifyTitle")}</h1>

                <p class="np-auth-subtitle" style="margin-bottom: 30px; line-height: 1.6;">
                    ${msg("emailVerifySent", (user.email!''))}<br>
                    ${msg("emailVerifyInstruction")}
                </p>

                <p class="np-auth-subtitle" style="font-size: 14px; color: #64748b;">
                    ${msg("emailNotReceived")} <a href="${url.loginAction}" class="np-link">${msg("resendEmail")}</a>
                </p>

                <div style="margin-top: 40px;">
                    <a href="https://forest-inventory.eu" class="np-back-link" style="display: inline-flex; margin: 0 auto;">${msg("backToLogin")}</a>
                </div>

            </div>

        </div>
    </div>
</body>
</html>
