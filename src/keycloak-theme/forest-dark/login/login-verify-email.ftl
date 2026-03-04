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
        <a href="https://forest-inventory.eu" title="${msg('backToHome')}" style="text-decoration: none; color: white; font-weight: bold; font-size: 1.5rem;">
             Forest<span style="color: #59FF85;">DB</span>
        </a>
    </div>
    <div class="np-auth-page">
        <div class="np-auth-container" style="justify-content: center; gap: 0;">
            
            <div class="np-auth-left" style="text-align: center; align-items: center; max-width: 600px;">
                
                <div style="background: rgba(89, 255, 133, 0.1); padding: 20px; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px auto;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#59FF85" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>

                <h1 class="np-auth-signup-title">${msg("emailVerifyTitle")}</h1>
                
                <p class="np-auth-subtitle" style="margin-bottom: 30px; line-height: 1.6;">
                    ${msg("emailVerifySent", (user.email!''))}<br>
                    ${msg("emailVerifyInstruction")}
                </p>

                <p class="np-auth-subtitle" style="font-size: 14px; color: #6b7280;">
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