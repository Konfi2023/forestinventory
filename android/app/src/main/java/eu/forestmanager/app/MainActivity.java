package eu.forestmanager.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int LOCATION_PERMISSION_REQUEST = 1001;
    private static final String BASE_URL = "https://forest-manager.eu";

    @Override
    public void onPostCreate(Bundle savedInstanceState) {
        super.onPostCreate(savedInstanceState);

        // Standort-Berechtigung zur Laufzeit anfragen
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                },
                LOCATION_PERMISSION_REQUEST);
        }

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // Kein aggressives Caching — immer frisch vom Server laden
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);

        // Custom User-Agent damit Keycloak-Theme die App erkennt
        String ua = settings.getUserAgentString();
        settings.setUserAgentString(ua + " CapacitorApp/ForestManager");

        // Geolocation in WebView erlauben
        settings.setGeolocationEnabled(true);

        // WebViewClient: Landingpage abfangen und auf /signin umleiten
        final WebViewClient originalWebClient = webView.getWebViewClient();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                // Landingpage abfangen: exakt "/" oder nur die Domain
                if (url.equals(BASE_URL) || url.equals(BASE_URL + "/") ||
                    url.equals(BASE_URL + "/de") || url.equals(BASE_URL + "/en") ||
                    url.equals(BASE_URL + "/es") || url.equals(BASE_URL + "/fr")) {
                    view.loadUrl(BASE_URL + "/signin?callbackUrl=/app");
                    return true;
                }

                // Marketing-Seiten abfangen (Pricing, About, etc.)
                if (url.startsWith(BASE_URL + "/pricing") ||
                    url.startsWith(BASE_URL + "/about") ||
                    url.startsWith(BASE_URL + "/legal") ||
                    url.startsWith(BASE_URL + "/features")) {
                    view.loadUrl(BASE_URL + "/app");
                    return true;
                }

                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (originalWebClient != null) {
                    originalWebClient.onPageFinished(view, url);
                }
                // Nochmal pruefen nach Redirect-Ketten
                if (url.equals(BASE_URL) || url.equals(BASE_URL + "/") ||
                    url.equals(BASE_URL + "/de") || url.equals(BASE_URL + "/en")) {
                    view.loadUrl(BASE_URL + "/signin?callbackUrl=/app");
                }
            }
        });

        // Den bestehenden Capacitor ChromeClient wrappen
        final WebChromeClient originalClient = webView.getWebChromeClient();
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, true);
            }

            @Override
            public boolean onShowFileChooser(WebView view, android.webkit.ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (originalClient != null) {
                    return originalClient.onShowFileChooser(view, filePathCallback, fileChooserParams);
                }
                return super.onShowFileChooser(view, filePathCallback, fileChooserParams);
            }

            @Override
            public void onPermissionRequest(android.webkit.PermissionRequest request) {
                if (originalClient != null) {
                    originalClient.onPermissionRequest(request);
                } else {
                    super.onPermissionRequest(request);
                }
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                if (originalClient != null) {
                    return originalClient.onCreateWindow(view, isDialog, isUserGesture, resultMsg);
                }
                return super.onCreateWindow(view, isDialog, isUserGesture, resultMsg);
            }

            @Override
            public boolean onConsoleMessage(android.webkit.ConsoleMessage consoleMessage) {
                if (originalClient != null) {
                    return originalClient.onConsoleMessage(consoleMessage);
                }
                return super.onConsoleMessage(consoleMessage);
            }

            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (originalClient != null) {
                    originalClient.onProgressChanged(view, newProgress);
                } else {
                    super.onProgressChanged(view, newProgress);
                }
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
