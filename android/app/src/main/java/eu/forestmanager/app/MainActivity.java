package eu.forestmanager.app;

import android.webkit.WebSettings;
import android.webkit.WebView;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Custom User-Agent damit Keycloak-Theme die App erkennt
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        String ua = settings.getUserAgentString();
        settings.setUserAgentString(ua + " CapacitorApp/ForestManager");
    }
}
