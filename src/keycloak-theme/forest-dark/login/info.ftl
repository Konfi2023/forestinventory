<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>${msg("loginTitle",(realm.displayName!'Forest Manager'))}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    <link href="${url.resourcesPath}/css/styles.css?v=${.now?long}" rel="stylesheet" />
</head>

<body>
    <!-- TOP NAV -->
    <div class="np-top-nav">
        <a href="https://forest-manager.eu" title="${msg('backToHome')}" style="text-decoration: none; display: flex; align-items: center;">
            <svg height="30" viewBox="0 0 285 47" fill="none" xmlns="http://www.w3.org/2000/svg" style="height: 30px; width: auto;">
                <g>
                    <mask id="mask0_kc_info" style="mask-type: alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="47" height="47">
                        <rect width="47" height="47" fill="#D9D9D9"/>
                    </mask>
                    <g mask="url(#mask0_kc_info)">
                        <path d="M23.5116 43.4812C20.42 43.0973 17.6472 42.3101 15.1931 41.1194C12.7386 39.9287 10.6533 38.3753 8.93716 36.4591C7.22134 34.5425 5.90322 32.3142 4.9828 29.7743C4.06271 27.2347 3.587 24.4197 3.55566 21.3295C7.20828 21.6653 10.2886 22.2987 12.7965 23.2295C15.3045 24.1604 17.3453 25.4966 18.9188 27.2382C20.4926 28.9799 21.636 31.1753 22.3488 33.8246C23.0616 36.4742 23.4492 39.6931 23.5116 43.4812ZM23.4998 25.9639C22.7256 24.7902 21.6608 23.6485 20.3053 22.5387C18.9498 21.429 17.4078 20.4523 15.6792 19.6086C15.8829 18.2691 16.221 16.8708 16.6936 15.4138C17.1662 13.9568 17.7405 12.5126 18.4165 11.081C19.0928 9.64947 19.8627 8.26134 20.7263 6.91662C21.5896 5.57222 22.5102 4.33407 23.4881 3.20215C24.4738 4.34941 25.3983 5.59344 26.2616 6.93424C27.1252 8.27505 27.8971 9.66122 28.5773 11.0928C29.2572 12.524 29.8334 13.9663 30.306 15.4197C30.7786 16.8728 31.1168 18.2691 31.3204 19.6086C29.6075 20.4197 28.0773 21.3761 26.7296 22.478C25.3816 23.5799 24.305 24.7419 23.4998 25.9639ZM27.885 42.5573C27.7962 40.0852 27.5994 37.847 27.2946 35.8427C26.9897 33.8383 26.5359 31.975 25.9331 30.2526C27.5138 27.5779 29.7012 25.4335 32.4954 23.8195C35.2896 22.2058 38.9352 21.3758 43.4322 21.3295C43.3869 26.5647 41.9883 31.049 39.2365 34.7822C36.485 38.5155 32.7012 41.1072 27.885 42.5573Z" fill="#15803d"/>
                    </g>
                </g>
                <text x="58" y="33" fill="#0f172a" font-family="sans-serif" font-weight="bold" font-size="26" letter-spacing="-0.5">Forest</text>
                <rect x="141" y="20" width="9" height="4" rx="1" fill="#15803d" />
                <text x="154" y="33" fill="#15803d" font-family="sans-serif" font-weight="bold" font-size="26" letter-spacing="-0.5">Manager</text>
            </svg>
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

                <p class="np-auth-subtitle" style="font-size: 18px; line-height: 1.6; margin-bottom: 40px;">
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
                    <a href="https://forest-manager.eu" class="np-primary-button" style="text-decoration: none; display: flex; align-items: center; justify-content: center;">
                        ${msg("continueToLogin")}
                    </a>
                </#if>

            </div>

        </div>
    </div>
</body>
</html>
