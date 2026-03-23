<#macro emailLayout>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.08); }
        .header { background-color: #0f172a; padding: 28px 30px; text-align: center; }
        .logo { font-size: 22px; font-weight: bold; color: #ffffff; text-decoration: none; letter-spacing: -0.02em; }
        .logo span { color: #34d399; }
        .content { padding: 40px 30px; color: #1e293b; line-height: 1.6; font-size: 16px; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .button { display: inline-block; background-color: #059669; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 20px; font-size: 15px; }
    </style>
</head>
<body>
    <div style="padding: 40px 0;">
        <div class="container">
            <!-- HEADER / LOGO -->
            <div class="header">
                <div class="logo">
                    Forest<span>Inventory</span>
                </div>
            </div>

            <!-- CONTENT BEREICH -->
            <div class="content">
                <#nested>
            </div>

            <!-- FOOTER -->
            <div class="footer">
                <p>&copy; ${.now?string('yyyy')} Forest Manager. ${msg("copyright")}</p>
                <p>${msg("emailReason")}</p>
            </div>
        </div>
    </div>
</body>
</html>
</#macro>
