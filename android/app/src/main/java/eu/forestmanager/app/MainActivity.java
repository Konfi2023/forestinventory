package eu.forestmanager.app;

import android.content.Intent;
import android.net.Uri;
import android.webkit.GeolocationPermissions;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onPostCreate(Bundle savedInstanceState) {
        super.onPostCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // Custom User-Agent damit Keycloak-Theme die App erkennt
        String ua = settings.getUserAgentString();
        settings.setUserAgentString(ua + " CapacitorApp/ForestManager");

        // Geolocation in WebView erlauben
        settings.setGeolocationEnabled(true);

        // JavaScript-Interface fuer externen Browser-Aufruf
        webView.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public void openInBrowser(String url) {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(intent);
            }
        }, "NativeBridge");
    }
}
