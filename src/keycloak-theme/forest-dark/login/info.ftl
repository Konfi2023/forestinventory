<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>${msg("loginTitle",(realm.displayName!'ForestDB'))}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    <link href="${url.resourcesPath}/css/styles.css?v=${.now?long}" rel="stylesheet" />
</head>

<body>
    <!-- TOP NAV -->
    <div class="np-top-nav">
        <a href="https://forest-inventory.eu" title="${msg('backToHome')}" style="text-decoration: none; color: white; font-weight: bold; font-size: 1.5rem;">
             Forest<span style="color: #59FF85;">DB</span>
        </a>
    </div>

    <!-- PAGE CONTAINER -->
    <div class="np-auth-page">
        <div class="np-auth-container" style="justify-content: center; gap: 0;">
            
            <div class="np-auth-left" style="text-align: center; align-items: center; max-width: 600px;">
                
                <!-- ICON LOGIK: Rot bei Fehler, Grün bei Erfolg -->
                <#if message.type = 'warning' || message.type = 'error'>
                    <!-- Roter Kreis mit Ausrufezeichen -->
                    <div style="background: rgba(255, 77, 79, 0.1); padding: 20px; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px auto;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    </div>
                    <h1 class="np-auth-signup-title" style="color: #ff4d4f;">${msg("noticeTitle")}</h1>
                <#else>
                    <!-- Grüner Kreis mit Haken -->
                    <div style="background: rgba(89, 255, 133, 0.1); padding: 20px; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px auto;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#59FF85" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <h1 class="np-auth-signup-title">${msg("successTitle")}</h1>
                </#if>

                <!-- DIE NACHRICHT -->
                <p class="np-auth-subtitle" style="font-size: 18px; line-height: 1.6; margin-bottom: 40px; color: #e4e4e7;">
                    ${message.summary}
                </p>

                <!-- EINZIGER ACTION BUTTON -->
                <#if pageRedirectUri?has_content>
                    <!-- Wenn Keycloak eine Ziel-URL hat (z.B. "Klick hier um fortzufahren") -->
                    <a href="${pageRedirectUri}" class="np-primary-button" style="text-decoration: none; display: flex; align-items: center; justify-content: center;">
                        ${msg("continueToLogin")}
                    </a>
                <#elseif actionUri?has_content>
                    <!-- Wenn eine Aktion erforderlich ist -->
                    <a href="${actionUri}" class="np-primary-button" style="text-decoration: none; display: flex; align-items: center; justify-content: center;">
                        ${msg("continue")}
                    </a>
                <#else>
                    <!-- Standard Fallback: Zurück zur App -->
                    <a href="https://forest-inventory.eu" class="np-primary-button" style="text-decoration: none; display: flex; align-items: center; justify-content: center;">
                        ${msg("continueToLogin")}
                    </a>
                </#if>

            </div>

        </div>
    </div>
</body>
</html>