<#import "template.ftl" as layout>
<@layout.emailLayout>
    <!-- Welcome icon -->
    <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:56px;height:56px;border-radius:16px;background-color:#ecfdf5;line-height:56px;text-align:center;">
            <span style="font-size:28px;">&#9993;</span>
        </div>
    </div>

    <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:700;text-align:center;">${msg("welcomeTitle")}</h2>

    <p style="color:#64748b;text-align:center;margin:0 0 24px;font-size:14px;">${msg("greeting")}</p>

    <p style="margin:0 0 28px;color:#334155;font-size:15px;line-height:1.7;">${msg("emailVerificationBody")}</p>

    <!-- CTA Button -->
    <div style="text-align:center;margin:0 0 28px;">
        <a href="${link}" style="display:inline-block;background-color:#16a34a;color:#ffffff;padding:14px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.2px;">${msg("verifyButton")}</a>
    </div>

    <p style="font-size:13px;color:#94a3b8;text-align:center;margin:0 0 24px;">
        ${msg("linkExpirationText", "24")}
    </p>

    <!-- Divider -->
    <div style="border-top:1px solid #e2e8f0;margin:0 0 20px;"></div>

    <!-- Fallback link -->
    <p style="font-size:12px;color:#94a3b8;margin:0 0 8px;">${msg("linkFallback")}</p>
    <div style="font-size:11px;word-break:break-all;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:0 0 24px;"><a href="${link}" style="color:#16a34a;text-decoration:underline;">${link}</a></div>

    <p style="margin:0;color:#475569;font-size:14px;white-space:pre-line;">${msg("signOff")?no_esc}</p>
</@layout.emailLayout>
