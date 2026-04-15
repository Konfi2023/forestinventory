package eu.forestmanager.app;

import android.content.Intent;
import android.net.Uri;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // Custom User-Agent damit Keycloak-Theme die App erkennt
        String ua = settings.getUserAgentString();
        settings.setUserAgentString(ua + " CapacitorApp/ForestManager");

        // Geolocation in WebView erlauben
        settings.setGeolocationEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                // Automatisch erlauben — Android Permission Dialog erscheint trotzdem
                callback.invoke(origin, true, true);
            }
        });

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
