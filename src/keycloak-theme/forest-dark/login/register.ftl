<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>${msg("registerTitle")}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    <link href="${url.resourcesPath}/css/styles.css" rel="stylesheet" />
</head>
<body>
    <div class="np-top-nav">
        <a href="/" title="${msg('backToHome')}" style="text-decoration: none; display: flex; align-items: center;">
            <span style="color: white; font-weight: bold; font-size: 1.5rem;">Forest<span style="color: #59FF85;">DB</span></span>
        </a>
    </div>
    <div class="np-auth-page">
        <div class="np-auth-container">
            <div class="np-auth-left" style="overflow-y: auto; max-height: 100%; padding-right: 10px; display: block;">
                <div class="np-auth-heading" style="margin-top: 20px;">
                    <h1 class="np-auth-signup-title">${msg("registerTitle")}</h1>
                </div>
                
                <#if message?has_content && (message.type != 'warning') && (message.type != 'info')>
                    <div class="np-error-msg" style="margin-bottom: 20px; border: 1px solid #ff4d4f; padding: 10px; border-radius: 8px; background: rgba(255, 77, 79, 0.1); color: #ff4d4f;">
                        ${message.summary}
                    </div>
                </#if>

                <form id="kc-register-form" class="np-auth-form" action="${url.registrationAction}" method="post">
                    
                    <div style="display: flex; gap: 15px;">
                        <div class="np-input-group" style="flex: 1;">
                            <div class="np-input-label-pill-wrapper"><span class="np-input-label-pill">${msg("firstName")}</span></div>
                            <input type="text" id="firstName" class="np-input" name="firstName" value="${(register.formData.firstName!'')}" />
                        </div>
                        <div class="np-input-group" style="flex: 1;">
                            <div class="np-input-label-pill-wrapper"><span class="np-input-label-pill">${msg("lastName")}</span></div>
                            <input type="text" id="lastName" class="np-input" name="lastName" value="${(register.formData.lastName!'')}" />
                        </div>
                    </div>
                    
                    <div class="np-input-group">
                        <div class="np-input-label-pill-wrapper"><span class="np-input-label-pill">${msg("email")}</span></div>
                        <input type="text" id="email" class="np-input" name="email" value="${(register.formData.email!'')}" autocomplete="email" />
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