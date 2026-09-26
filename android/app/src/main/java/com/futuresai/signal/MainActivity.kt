package com.futuresai.signal

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import java.io.ByteArrayInputStream

/**
 * Futures AI — native Android shell.
 * Loads the full Futures AI web application (web/) from APK assets with a
 * proper https origin (WebViewAssetLoader) so localStorage, fetch and the
 * whole SPA work exactly as designed. Offline demo engine (api.js fallbacks)
 * keeps every screen alive without a backend server.
 */
class MainActivity : Activity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Neon dark system bars (bg #020307)
        window.statusBarColor = Color.parseColor("#020307")
        window.navigationBarColor = Color.parseColor("#020307")

        webView = WebView(this)
        webView.setBackgroundColor(Color.parseColor("#020307"))
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            mediaPlaybackRequiresUserGesture = false
            userAgentString = "$userAgentString FuturesAI/1.0.1 (Android WebView)"
        }

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .addPathHandler("/api/", OfflineApiHandler())
            .build()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }
        }
        webView.webChromeClient = WebChromeClient()

        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html?apk=1")
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }

    /**
     * /api/** is answered instantly with HTTP 503 so the web app's
     * fetch() calls fall back to the built-in offline demo engine
     * without waiting for any network timeout.
     */
    private class OfflineApiHandler : WebViewAssetLoader.PathHandler {
        override fun handle(path: String): WebResourceResponse {
            val body = """{"error":"offline","fallback":true}"""
            val headers = mapOf(
                "Access-Control-Allow-Origin" to "https://appassets.androidplatform.net",
                "Cache-Control" to "no-store"
            )
            return WebResourceResponse(
                "application/json",
                "UTF-8",
                503,
                "Service Unavailable",
                headers,
                ByteArrayInputStream(body.toByteArray(Charsets.UTF_8))
            )
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
