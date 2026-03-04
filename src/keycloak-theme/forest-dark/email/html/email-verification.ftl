<#import "template.ftl" as layout>
<@layout.emailLayout>
    <h2 style="margin-top: 0; color: #111; font-size: 22px; font-weight: 700;">${msg("welcomeTitle")}</h2>
    
    <p>${msg("greeting")}</p>
    
    <p>${msg("emailVerificationBody")}</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="${link}" class="button">${msg("verifyButton")}</a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; text-align: center;">
        ${msg("linkExpirationText", linkExpiration!5)}
    </p>
    
    <br>
    <p>${msg("signOff")?no_esc}</p>
</@layout.emailLayout>