package eu.forestmanager.app;

import android.content.Intent;
import android.net.Uri;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
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
