<#macro emailLayout>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background-color: #050505; padding: 30px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; color: #ffffff; text-decoration: none; letter-spacing: 1px; }
        .logo span { color: #59FF85; }
        .content { padding: 40px 30px; color: #333333; line-height: 1.6; font-size: 16px; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        
        /* Button Style global verfügbar machen */
        .button { display: inline-block; background-color: #59FF85; color: #000000; padding: 12px 30px; border-radius: 99px; text-decoration: none; font-weight: bold; margin-top: 20px; font-size: 16px; }
        .button:hover { background-color: #4ade80; }
    </style>
</head>
<body>
    <div style="padding: 40px 0;">
        <div class="container">
            <!-- HEADER / LOGO -->
            <div class="header">
                <div class="logo">
                    Forest<span>-Inventory</span>
                </div>
            </div>

            <!-- CONTENT BEREICH -->
            <div class="content">
                <#nested>
            </div>

            <!-- FOOTER -->
            <div class="footer">
                <p>&copy; ${.now?string('yyyy')} Forest-Inventory. ${msg("copyright")}</p>
                <p>${msg("emailReason")}</p>
            </div>
        </div>
    </div>
</body>
</html>
</#macro>