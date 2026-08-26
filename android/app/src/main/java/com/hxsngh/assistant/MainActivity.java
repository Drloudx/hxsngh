package com.hxsngh.assistant;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Environment;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.content.pm.ApplicationInfo;
import android.webkit.WebViewClient;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;
import org.json.JSONTokener;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "HotUpdate";
    private String pendingDownloadPath = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 让系统管理状态栏间距，网页不参与计算
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            );
        }

        // 仅在首次安装或 APK 版本升级时才从 assets 拷贝基础包
        prepareHotUpdateDir();

        // 冷启动拦截：检测沙盒内是否有热更新文件
        File sandboxIndex = new File(getFilesDir(), "www/index.html");
        if (sandboxIndex.exists()) {
            Log.d(TAG, "【冷启动拦截】发现沙盒 www/index.html，将从此加载");
        } else {
            Log.d(TAG, "【冷启动】未发现热更新文件");
        }

        setupBridge();
    }

    /**
     * 首次安装或 APK 被重新安装后，从 assets/public/ 刷新 files/www/。
     * lastUpdateTime 可识别版本号不变的测试包，同时避免普通冷启动覆盖热更新。
     */
    private void prepareHotUpdateDir() {
        try {
            PackageInfo pkg = getPackageManager().getPackageInfo(getPackageName(), 0);
            int currentVersionCode = pkg.versionCode;
            String currentVersionName = pkg.versionName != null ? pkg.versionName : "";
            long currentLastUpdateTime = pkg.lastUpdateTime;
            SharedPreferences sp = getSharedPreferences("hotupdate_prefs", Context.MODE_PRIVATE);
            int savedVersionCode = sp.getInt("apk_version_code", 0);
            String savedVersionName = sp.getString("apk_version_name", "");
            long savedLastUpdateTime = sp.getLong("apk_last_update_time", 0L);

            File wwwDir = new File(getFilesDir(), "www");
            boolean needCopy = !wwwDir.exists() ||
                               currentVersionCode != savedVersionCode ||
                               !currentVersionName.equals(savedVersionName) ||
                               currentLastUpdateTime != savedLastUpdateTime;
            Log.d(TAG, "prepareHotUpdateDir: wwwDir.exists=" + wwwDir.exists() +
                  " curVC=" + currentVersionCode + " savedVC=" + savedVersionCode +
                  " curVN=" + currentVersionName + " savedVN=" + savedVersionName +
                  " curUpdated=" + currentLastUpdateTime + " savedUpdated=" + savedLastUpdateTime +
                  " needCopy=" + needCopy);
            if (needCopy) {
                Log.d(TAG, "需要从 assets 拷贝到 www 目录");
                File stagingDir = new File(getFilesDir(), "www_apk_staging");
                File backupDir = new File(getFilesDir(), "www_apk_backup");
                deleteDirectory(stagingDir);
                deleteDirectory(backupDir);
                if (!stagingDir.mkdirs()) throw new java.io.IOException("无法创建基础网页临时目录");
                copyAssetFolder("public", stagingDir.getAbsolutePath());
                if (!new File(stagingDir, "index.html").isFile()) {
                    throw new java.io.IOException("APK 基础网页缺少 index.html");
                }

                boolean hadCurrent = wwwDir.exists();
                if (hadCurrent && !wwwDir.renameTo(backupDir)) {
                    throw new java.io.IOException("无法备份当前网页资源");
                }
                if (!stagingDir.renameTo(wwwDir)) {
                    if (hadCurrent && backupDir.exists() && !backupDir.renameTo(wwwDir)) {
                        Log.e(TAG, "APK 基础网页替换失败且旧版本回滚失败");
                    }
                    throw new java.io.IOException("无法启用 APK 基础网页资源");
                }
                try {
                    deleteDirectory(backupDir);
                } catch (Exception cleanupError) {
                    Log.w(TAG, "APK 旧网页资源将在下次启动时继续清理", cleanupError);
                }
                sp.edit().putInt("apk_version_code", currentVersionCode)
                  .putString("apk_version_name", currentVersionName)
                  .putLong("apk_last_update_time", currentLastUpdateTime).apply();
                Log.d(TAG, "已从 assets 拷贝基础包到 files/www/ (versionCode=" + currentVersionCode + " versionName=" + currentVersionName + ")");
            }
        } catch (Exception e) {
            Log.e(TAG, "prepareHotUpdateDir failed", e);
        }
    }

    private void copyAssetFolder(String assetPath, String targetPath) throws java.io.IOException {
        String[] list = getAssets().list(assetPath);
        if (list != null && list.length > 0) {
            File targetDir = new File(targetPath);
            if (!targetDir.exists() && !targetDir.mkdirs()) {
                throw new java.io.IOException("无法创建基础网页目录: " + targetPath);
            }
            for (String item : list) {
                copyAssetFolder(assetPath + "/" + item, targetPath + "/" + item);
            }
        } else {
            try (InputStream in = getAssets().open(assetPath);
                 OutputStream out = new FileOutputStream(targetPath)) {
                byte[] buf = new byte[8192];
                int len;
                while ((len = in.read(buf)) > 0) {
                    out.write(buf, 0, len);
                }
            }
        }
    }

    private void setupBridge() {
        getWindow().getDecorView().postOnAnimation(() -> {
            WebView wv = (bridge != null) ? bridge.getWebView() : null;
            if (wv == null) {
                new android.os.Handler(Looper.getMainLooper()).postDelayed(
                        this::setupBridge, 200);
                return;
            }

            WebSettings settings = wv.getSettings();
            settings.setAllowFileAccess(false);
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
            settings.setTextZoom(100);
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowContentAccess(false);
            // 某些 Android WebView（尤其是厂商定制 WebView）会把页面当成 980px 宽的桌面页面。
            // 明确关闭 wide viewport，确保 viewport meta 使用真实设备宽度。
            settings.setUseWideViewPort(false);
            settings.setLoadWithOverviewMode(false);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                // 页面通过 https://hxsngh.app + WebViewClient 拦截本地资源，不需要放开 file:// 跨域访问。
                settings.setAllowUniversalAccessFromFileURLs(false);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                if (0 != (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE)) {
                    WebView.setWebContentsDebuggingEnabled(true);
                }
            }
            wv.setOverScrollMode(View.OVER_SCROLL_NEVER);

            // 安装热更拦截器（优先从 files/www/ 提供文件）
            installHotUpdateInterceptor(wv);

            // 注入 App 标识与版本号
            String ver = "0.0.0";
            try { ver = getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception ignored) {}
            String quotedVersion = JSONObject.quote(ver);
            wv.evaluateJavascript(
                    "document.documentElement.setAttribute('data-app-shell','true');" +
                            "window.__APK_VERSION__=" + quotedVersion + ";" +
                            "window.__APP_VERSION__=window.localStorage.getItem('local_web_version')||" + quotedVersion + ";",
                    null
            );

            // 注册文件下载接口（GuideView 调用，直接把 www/misc/ 的文件复制到公共 Downloads）
            final java.io.File wwwDir = new File(getFilesDir(), "www");
            wv.addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void downloadFile(String relativePath) {
                    wv.post(() -> shareBundledFile(wv, wwwDir, relativePath));
                }
            }, "NativeDownload");

            // 仅本地 App 页面可在用户确认隐私政策后启动友盟统计。
            wv.addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void acceptPrivacyAndInitialize() {
                    wv.post(() -> {
                        if (isAppUrl(wv.getUrl())) {
                            UmengApplication.initializeAfterPrivacyConsent(getApplicationContext());
                        }
                    });
                }
            }, "NativeAnalytics");

            // 注入真实沙盒路径给 JS 使用（解决 Capacitor 路径不一致问题）
            String wwwRealPath = wwwDir.getAbsolutePath();
            wv.evaluateJavascript("window.__WWW_PATH=" + JSONObject.quote(wwwRealPath), null);

            // 永远从 files/www/index.html 加载
            switchToWwwDir(wv);

            // 延迟启动轮询，等新页面加载完再 poll，防止 callback 跑在旧 JS 上下文上
            new android.os.Handler(Looper.getMainLooper()).postDelayed(() -> {
                pollDownload(wv);
                pollHotUpdateReady(wv);
                pollExportReady(wv);
            }, 1500);

            wv.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
                try {
                    android.app.DownloadManager.Request req = new android.app.DownloadManager.Request(android.net.Uri.parse(url));
                    if (mimeType != null) req.setMimeType(mimeType);
                    req.allowScanningByMediaScanner();
                    req.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    String fileName = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType);
                    req.setTitle(fileName);
                    req.setDescription("正在下载...");
                    req.setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, fileName);
                    android.app.DownloadManager dm = (android.app.DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                    dm.enqueue(req);
                    Log.d(TAG, "下载已加入队列: " + fileName);
                } catch (Exception e) {
                    Log.e(TAG, "下载失败: " + e.getMessage());
                }
            });
        });
    }

    private void shareBundledFile(WebView webView, File wwwDir, String relativePath) {
        if (!isAppUrl(webView.getUrl())) {
            Log.w(TAG, "拒绝非应用页面调用原生下载接口");
            return;
        }
        try {
            File source = resolveSafeChild(wwwDir, relativePath, "misc");
            if (source == null || !source.exists() || !source.isFile()) {
                Log.e(TAG, "拒绝读取非法下载路径: " + relativePath);
                return;
            }
            File outDir = new File(getFilesDir(), "exports");
            if (!outDir.exists() && !outDir.mkdirs()) throw new java.io.IOException("无法创建导出目录");
            File outFile = resolveSafeChild(outDir, source.getName(), null);
            if (outFile == null) throw new java.io.IOException("非法导出文件名");
            try (InputStream input = new FileInputStream(source);
                 OutputStream output = new FileOutputStream(outFile)) {
                byte[] buffer = new byte[8192];
                int length;
                while ((length = input.read(buffer)) > 0) output.write(buffer, 0, length);
            }

            Uri contentUri = FileProvider.getUriForFile(
                    this, getPackageName() + ".fileprovider", outFile);
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("*/*");
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(Intent.createChooser(shareIntent, "保存/分享文件"));
        } catch (Exception e) {
            Log.e(TAG, "文件处理失败", e);
        }
    }

    /** Resolve a path below root and reject absolute paths and traversal. */
    private File resolveSafeChild(File root, String relativePath, String requiredTopDirectory) {
        if (root == null || relativePath == null || relativePath.trim().isEmpty()) return null;
        try {
            String normalized = relativePath.replace('\\', '/');
            while (normalized.startsWith("/")) normalized = normalized.substring(1);
            if (normalized.isEmpty() || normalized.contains("\0")) return null;
            for (String segment : normalized.split("/")) {
                if (segment.isEmpty() || ".".equals(segment) || "..".equals(segment)) return null;
            }
            if (requiredTopDirectory != null &&
                    !(normalized.equals(requiredTopDirectory) || normalized.startsWith(requiredTopDirectory + "/"))) {
                return null;
            }

            File rootCanonical = root.getCanonicalFile();
            File candidate = new File(rootCanonical, normalized).getCanonicalFile();
            String rootPath = rootCanonical.getPath();
            String candidatePath = candidate.getPath();
            if (!candidatePath.equals(rootPath) && !candidatePath.startsWith(rootPath + File.separator)) {
                return null;
            }
            return candidate;
        } catch (Exception e) {
            Log.w(TAG, "路径规范化失败: " + relativePath, e);
            return null;
        }
    }

    private boolean isAppUrl(String value) {
        if (value == null) return false;
        try {
            Uri uri = Uri.parse(value);
            return "https".equalsIgnoreCase(uri.getScheme()) &&
                    "hxsngh.app".equalsIgnoreCase(uri.getHost());
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isAllowedGiteeHost(String url) {
        try {
            if (!url.startsWith("https://")) return false;
            String host = new URL(url).getHost().toLowerCase(java.util.Locale.ROOT);
            return "gitee.com".equals(host) || host.endsWith(".gitee.com") ||
                    "giteeusercontent.com".equals(host) || host.endsWith(".giteeusercontent.com");
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 通过 JS 读取 Capacitor 写入的 index.html，确保路径一致
     */
    private void switchToWwwDir(WebView wv) {
        wv.loadUrl("https://hxsngh.app/index.html?nocache=" + System.currentTimeMillis());
    }

    /**
     * 轮询检测 JS 侧热更完成标志，清缓存后重载
     */
        private void pollHotUpdateReady(WebView wv) {
        wv.evaluateJavascript("(window.__hotZipReady||window.__hotUpdateReady||false)", value -> {
            if ("true".equals(value)) {
                wv.evaluateJavascript("window.__hotUpdateReady=false", null);
                wv.evaluateJavascript("(window.__hotZipData||'')", zipB64 -> {
                    if (zipB64 != null && zipB64.length() > 100) {
                        wv.evaluateJavascript("window.__hotZipReady=false", null);
                        Log.d(TAG, "检测到 zip 数据，开始解压...");
                        String b64 = zipB64;
                        new Thread(() -> {
                            try {
                                String cleanB64 = b64.substring(1, b64.length() - 1);
                                byte[] zipBytes = android.util.Base64.decode(cleanB64, android.util.Base64.DEFAULT);
                                installHotUpdateZip(zipBytes);
                                wv.post(() -> {
                                    wv.evaluateJavascript("window.__hotInstallState='success'", null);
                                    pollHotUpdateReady(wv);
                                });
                            } catch (Exception e) {
                                Log.e(TAG, "热更新安装失败", e);
                                String message = e.getMessage() != null ? e.getMessage() : "未知错误";
                                wv.post(() -> {
                                    wv.evaluateJavascript(
                                            "window.__hotInstallError=" + JSONObject.quote(message) + ";window.__hotInstallState='error'",
                                            null);
                                    pollHotUpdateReady(wv);
                                });
                            }
                        }, "hot-update-install").start();
                    } else {
                        Log.d(TAG, "热更完成，清除 WebView 缓存并重新加载");
                        wv.clearCache(true);
                        wv.clearHistory();
                        switchToWwwDir(wv);
                    }
                });
                return;
            }
            wv.postDelayed(() -> pollHotUpdateReady(wv), 1000);
        });
    }

    /**
     * 拦截器：所有资源优先从 files/www/ 提供，其次代理 Gitee 请求，最后交回 Capacitor
     */
    private void installHotUpdateInterceptor(WebView wv) {
        // 从 Capacitor Bridge 获取原客户端，API 24+ 均可用，并保留框架的导航与错误处理。
        final WebViewClient previousClient = bridge.getWebViewClient();
        final File wwwDir = new File(getFilesDir(), "www");

        wv.setWebViewClient(new WebViewClient() {

            private WebResourceResponse serveFromLocal(String url, File wwwDir) {
                if (url == null || wwwDir == null) return null;
                try {
                    if (!isAppUrl(url)) return null;
                    Uri uri = Uri.parse(url);
                    String encodedPath = uri.getEncodedPath();
                    if (encodedPath != null && encodedPath.startsWith("/_capacitor_")) return null;

                    // 提取相对路径
                    String relativePath = encodedPath == null ? "" : encodedPath;
                    while (relativePath.startsWith("/")) relativePath = relativePath.substring(1);
                    // 根路径或无路径 → 返回 index.html（SPA 入口）
                    if (relativePath.isEmpty()) relativePath = "index.html";
                    // URL 解码
                    String decodedPath = java.net.URLDecoder.decode(relativePath, "UTF-8");

                    // 路径穿越防护：规范化路径，确保最终路径在合法目录内
                    File resolvedFile = new File(wwwDir, decodedPath);
                    String canonicalPath = resolvedFile.getCanonicalPath();
                    String wwwCanonical = wwwDir.getCanonicalPath();
                    if (!canonicalPath.startsWith(wwwCanonical + File.separator)) {
                        Log.w(TAG, "路径穿越被拒绝: " + decodedPath);
                        return null;
                    }

                    // App 壳只提供本地网页资源，下载文件走受控的原生接口。
                    String fileName = new File(decodedPath).getName();
                    if (isDownloadFile(fileName)) return notFoundResponse();

                    // 优先从 files/www/ 读取
                    File hotFile = new File(wwwDir, decodedPath);
                    if (hotFile.exists() && hotFile.isFile()) {
                        Log.d(TAG, "热更目录命中: " + decodedPath);
                        String mime = getMimeType(hotFile.getName());
                        String charset = isTextMime(mime) ? "UTF-8" : null;
                        Map<String, String> headers = buildCacheHeaders(mime);
                        return new WebResourceResponse(mime, charset, 200, "OK", headers, new FileInputStream(hotFile));
                    }

                    // assets 回退
                    try {
                        InputStream assetStream = getAssets().open("www/" + decodedPath);
                        Log.d(TAG, "assets 回退: " + decodedPath);
                        String mime = getMimeType(decodedPath);
                        String charset = isTextMime(mime) ? "UTF-8" : null;
                        Map<String, String> headers = buildCacheHeaders(mime);
                        return new WebResourceResponse(mime, charset, 200, "OK", headers, assetStream);
                    } catch (Exception e) {
                        Log.d(TAG, "文件不存在: " + decodedPath);
                        return notFoundResponse();
                    }
                } catch (Exception e) {
                    Log.e(TAG, "serveFromLocal 异常: " + url, e);
                }
                return null;
            }

            private WebResourceResponse notFoundResponse() {
                return new WebResourceResponse(
                        "text/plain",
                        "UTF-8",
                        404,
                        "Not Found",
                        new HashMap<>(),
                        new ByteArrayInputStream(new byte[0]));
            }

            private Map<String, String> buildCacheHeaders(String mime) {
                Map<String, String> headers = new HashMap<>();
                if ("text/html".equals(mime)) {
                    headers.put("Cache-Control", "no-cache");
                } else {
                    headers.put("Cache-Control", "public, max-age=31536000, immutable");
                }
                return headers;
            }

            // Gitee 代理：https://hxsngh.app 跨域请求 Gitee 会被 CORS 拦截，通过 Java 原生 HTTP 中转
            private WebResourceResponse proxyGiteeRequest(String url, String requestMethod) {
                if (url == null) return null;
                if (!isAllowedGiteeHost(url)) return null;
                try {
                    HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(30000);
                    String method = "HEAD".equalsIgnoreCase(requestMethod) ? "HEAD" : "GET";
                    conn.setRequestMethod(method);
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0");
                    conn.connect();
                    int code = conn.getResponseCode();
                    String mime = conn.getContentType();
                    if (mime == null || mime.isEmpty()) mime = "application/octet-stream";
                    int s = mime.indexOf(';');
                    if (s > 0) mime = mime.substring(0, s).trim();
                    InputStream body = "HEAD".equals(method)
                            ? new ByteArrayInputStream(new byte[0])
                            : ((code >= 400) ? conn.getErrorStream() : conn.getInputStream());
                    Map<String, String> headers = new HashMap<>();
                    headers.put("Access-Control-Allow-Origin", "*");
                    headers.put("Access-Control-Expose-Headers", "Content-Length, Location");
                    String contentLength = conn.getHeaderField("Content-Length");
                    String location = conn.getHeaderField("Location");
                    if (contentLength != null) headers.put("Content-Length", contentLength);
                    if (location != null) headers.put("Location", location);
                    String reason = conn.getResponseMessage();
                    return new WebResourceResponse(mime, "UTF-8", code,
                            reason != null ? reason : "OK", headers, body);
                } catch (Exception ignored) { return null; }
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                WebResourceResponse gitee = proxyGiteeRequest(url, request.getMethod());
                if (gitee != null) return gitee;
                WebResourceResponse local = serveFromLocal(url, wwwDir);
                if (local != null) return local;
                if (previousClient != null) {
                    try { return previousClient.shouldInterceptRequest(view, request); } catch (Exception ignored) {}
                }
                return null;
            }

            @Override
            @SuppressWarnings("deprecation")
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                WebResourceResponse gitee = proxyGiteeRequest(url, "GET");
                if (gitee != null) return gitee;
                WebResourceResponse local = serveFromLocal(url, wwwDir);
                if (local != null) return local;
                if (previousClient != null) {
                    try { return previousClient.shouldInterceptRequest(view, url); } catch (Exception ignored) {}
                }
                return null;
            }

            @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
                if (previousClient != null) previousClient.onPageStarted(view, url, favicon);
                else super.onPageStarted(view, url, favicon);
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (isAppUrl(url)) {
                    String sv = "0.0.0";
                    try { sv = getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception ignored) {}
                    String quotedVersion = JSONObject.quote(sv);
                    view.evaluateJavascript(
                        "document.documentElement.setAttribute('data-app-shell','true');" +
                        "(function(){var m=document.querySelector('meta[name=viewport]');" +
                        "if(!m){m=document.createElement('meta');m.name='viewport';document.head.appendChild(m);}" +
                        "m.content='width=device-width, initial-scale=1.0, viewport-fit=cover';" +
                        "})();" +
                        "window.__APK_VERSION__=" + quotedVersion + ";" +
                        "if(!window.__APP_VERSION__) window.__APP_VERSION__=window.localStorage.getItem('local_web_version')||" + quotedVersion + ";" +
                        "console.log('[AppShell] viewport=' + window.innerWidth + ' screen=' + window.screen.width);",
                        null
                    );
                }
                if (previousClient != null) previousClient.onPageFinished(view, url);
                else super.onPageFinished(view, url);
            }
            @Override public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                if (previousClient != null) previousClient.doUpdateVisitedHistory(view, url, isReload);
                else super.doUpdateVisitedHistory(view, url, isReload);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (previousClient != null) previousClient.onReceivedError(view, request, error);
                else super.onReceivedError(view, request, error);
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                if (previousClient != null) previousClient.onReceivedHttpError(view, request, errorResponse);
                else super.onReceivedHttpError(view, request, errorResponse);
            }
            @Override public void onScaleChanged(WebView view, float oldScale, float newScale) {
                if (previousClient != null) previousClient.onScaleChanged(view, oldScale, newScale);
                else super.onScaleChanged(view, oldScale, newScale);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request.isForMainFrame() && !isAppUrl(request.getUrl().toString())) {
                    return openExternalUrl(request.getUrl());
                }
                if (previousClient != null) return previousClient.shouldOverrideUrlLoading(view, request);
                return super.shouldOverrideUrlLoading(view, request);
            }
            @Override @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (!isAppUrl(url)) return openExternalUrl(Uri.parse(url));
                if (previousClient != null) return previousClient.shouldOverrideUrlLoading(view, url);
                return super.shouldOverrideUrlLoading(view, url);
            }
            @Override public void onLoadResource(WebView view, String url) {
                if (previousClient != null) previousClient.onLoadResource(view, url);
                else super.onLoadResource(view, url);
            }
        });
    }

    private boolean openExternalUrl(Uri uri) {
        try {
            String scheme = uri != null ? uri.getScheme() : null;
            if (!"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme)) {
                Log.w(TAG, "拒绝打开非 HTTP(S) 外部链接: " + uri);
                return true;
            }
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);
            return true;
        } catch (Exception e) {
            Log.w(TAG, "无法打开外部链接: " + uri, e);
            return true;
        }
    }

    private void installHotUpdateZip(byte[] zipBytes) throws Exception {
        File currentDir = new File(getFilesDir(), "www");
        File stagingDir = new File(getFilesDir(), "www_update_staging");
        File backupDir = new File(getFilesDir(), "www_update_backup");
        deleteDirectory(stagingDir);
        deleteDirectory(backupDir);
        if (!stagingDir.mkdirs()) throw new java.io.IOException("无法创建热更新临时目录");

        boolean hasIndex = false;
        boolean hasJavaScriptAsset = false;
        int count = 0;
        try (ZipInputStream zipInput = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
            ZipEntry entry;
            while ((entry = zipInput.getNextEntry()) != null) {
                String name = entry.getName();
                File outFile = resolveSafeChild(stagingDir, name, null);
                if (outFile == null) throw new SecurityException("热更新 ZIP 路径非法: " + name);
                if (entry.isDirectory()) {
                    zipInput.closeEntry();
                    continue;
                }
                if (name.endsWith("opencv.js")) {
                    zipInput.closeEntry();
                    continue;
                }

                String normalizedName = name.replace('\\', '/');
                File parent = outFile.getParentFile();
                if (parent == null || !parent.exists() && !parent.mkdirs()) {
                    throw new java.io.IOException("无法创建热更新目录: " + parent);
                }
                try (FileOutputStream output = new FileOutputStream(outFile)) {
                    byte[] buffer = new byte[8192];
                    int length;
                    while ((length = zipInput.read(buffer)) > 0) output.write(buffer, 0, length);
                }
                zipInput.closeEntry();
                if ("index.html".equals(normalizedName)) hasIndex = true;
                if (normalizedName.startsWith("assets/") && normalizedName.endsWith(".js")) {
                    hasJavaScriptAsset = true;
                }
                count++;
            }
        }

        if (!hasIndex || !hasJavaScriptAsset) {
            throw new java.io.IOException("热更新包缺少 index.html 或 JS 资源");
        }

        // 热更包可只包含变化文件；保留现有静态资源，但不复制旧 assets，避免 hash 文件累积。
        copyMissingStaticFiles(currentDir, stagingDir);

        boolean hadCurrent = currentDir.exists();
        if (hadCurrent && !currentDir.renameTo(backupDir)) {
            throw new java.io.IOException("无法备份当前网页资源");
        }
        if (!stagingDir.renameTo(currentDir)) {
            if (hadCurrent && backupDir.exists() && !backupDir.renameTo(currentDir)) {
                Log.e(TAG, "热更新替换失败且旧版本回滚失败");
            }
            throw new java.io.IOException("无法启用新的网页资源");
        }
        try {
            deleteDirectory(backupDir);
        } catch (Exception cleanupError) {
            Log.w(TAG, "旧网页资源将在下次更新时继续清理", cleanupError);
        }
        Log.d(TAG, "热更新原子替换完成，共写入 " + count + " 个文件");
    }

    private void copyMissingStaticFiles(File sourceDir, File targetDir) throws java.io.IOException {
        if (!sourceDir.exists() || !sourceDir.isDirectory()) return;
        File[] children = sourceDir.listFiles();
        if (children == null) return;
        for (File source : children) {
            if ("assets".equals(source.getName()) || "index.html".equals(source.getName())) continue;
            File target = new File(targetDir, source.getName());
            copyMissingTree(source, target);
        }
    }

    private void copyMissingTree(File source, File target) throws java.io.IOException {
        if (source.isDirectory()) {
            if (!target.exists() && !target.mkdirs()) throw new java.io.IOException("无法创建目录: " + target);
            File[] children = source.listFiles();
            if (children != null) {
                for (File child : children) copyMissingTree(child, new File(target, child.getName()));
            }
            return;
        }
        if (target.exists()) return;
        File parent = target.getParentFile();
        if (parent == null || !parent.exists() && !parent.mkdirs()) {
            throw new java.io.IOException("无法创建目录: " + parent);
        }
        try (InputStream input = new FileInputStream(source);
             OutputStream output = new FileOutputStream(target)) {
            byte[] buffer = new byte[8192];
            int length;
            while ((length = input.read(buffer)) > 0) output.write(buffer, 0, length);
        }
    }

    private void deleteDirectory(File target) throws java.io.IOException {
        if (target == null || !target.exists()) return;
        File filesRoot = getFilesDir().getCanonicalFile();
        File canonicalTarget = target.getCanonicalFile();
        if (!canonicalTarget.getPath().startsWith(filesRoot.getPath() + File.separator)) {
            throw new SecurityException("拒绝删除应用目录外的文件");
        }
        if (canonicalTarget.isDirectory()) {
            File[] children = canonicalTarget.listFiles();
            if (children != null) {
                for (File child : children) deleteDirectory(child);
            }
        }
        if (!canonicalTarget.delete()) throw new java.io.IOException("无法删除: " + canonicalTarget);
    }

    private String getMimeType(String name) {
        if (name.endsWith(".js")) return "application/javascript";
        if (name.endsWith(".css")) return "text/css";
        if (name.endsWith(".html")) return "text/html";
        if (name.endsWith(".json")) return "application/json";
        if (name.endsWith(".svg")) return "image/svg+xml";
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
        if (name.endsWith(".gif")) return "image/gif";
        if (name.endsWith(".webp")) return "image/webp";
        if (name.endsWith(".ico")) return "image/x-icon";
        if (name.endsWith(".woff")) return "font/woff";
        if (name.endsWith(".woff2")) return "font/woff2";
        if (name.endsWith(".ttf")) return "font/ttf";
        return "text/plain";
    }

    /** 判断 MIME 类型是否为文本类（需 UTF-8 编码） */
    private boolean isTextMime(String mime) {
        return mime != null && (mime.startsWith("text/") ||
               "application/javascript".equals(mime) ||
               "application/json".equals(mime) ||
               "application/xml".equals(mime) ||
               "image/svg+xml".equals(mime));
    }

    /** 判断是否是应该下载而非渲染的文件类型 */
    private boolean isDownloadFile(String name) {
        String lower = name.toLowerCase(java.util.Locale.ROOT);
        return lower.endsWith(".apk") || lower.endsWith(".zip") ||
               lower.endsWith(".xlsx") || lower.endsWith(".xls") ||
               lower.endsWith(".docx") || lower.endsWith(".pdf") ||
               lower.endsWith(".rar") || lower.endsWith(".7z");
    }

    /**
     * 导出数据：Java 写文件 + 系统分享（独立于热更逻辑）
     */
    private void pollExportReady(WebView wv) {
        try {
            wv.evaluateJavascript("(window.__exportReady||false)", value -> {
                if ("true".equals(value)) {
                    wv.evaluateJavascript("window.__exportReady=false", null);
                    wv.evaluateJavascript("(window.__exportData||'')", dataVal -> {
                        wv.evaluateJavascript("(window.__exportFileName||'export.json')", nameVal -> {
                            if (dataVal != null && dataVal.length() > 5) {
                                String json = decodeJavascriptString(dataVal, "");
                                String fileName = decodeJavascriptString(nameVal, "export.json");
                                try {
                                    File outDir = new File(getFilesDir(), "exports");
                                    outDir.mkdirs();
                                    if (fileName.contains("/") || fileName.contains("\\")) {
                                        throw new java.io.IOException("非法导出文件名");
                                    }
                                    File outFile = resolveSafeChild(outDir, fileName, null);
                                    if (outFile == null) throw new java.io.IOException("非法导出文件名");
                                    java.io.FileWriter fw = new java.io.FileWriter(outFile);
                                    fw.write(json);
                                    fw.close();
                                    android.net.Uri contentUri = androidx.core.content.FileProvider.getUriForFile(
                                        MainActivity.this, getPackageName() + ".fileprovider", outFile);
                                    android.content.Intent shareIntent = new android.content.Intent(android.content.Intent.ACTION_SEND);
                                    shareIntent.setType("application/json");
                                    shareIntent.putExtra(android.content.Intent.EXTRA_STREAM, contentUri);
                                    shareIntent.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                    startActivity(android.content.Intent.createChooser(shareIntent, "导出莱姆数据"));
                                    Log.d(TAG, "导出成功");
                                } catch (Exception e) {
                                    Log.e(TAG, "导出失败: " + e.getMessage());
                                }
                            }
                        });
                    });
                    // 继续轮询，等待下次导出
                    wv.postDelayed(() -> pollExportReady(wv), 1000);
                    return;
                }
                wv.postDelayed(() -> pollExportReady(wv), 1000);
            });
        } catch (Exception e) {
            Log.e(TAG, "pollExportReady 异常，继续轮询: " + e.getMessage());
            wv.postDelayed(() -> pollExportReady(wv), 1000);
        }
    }

    private String decodeJavascriptString(String value, String fallback) {
        if (value == null || value.isEmpty() || "null".equals(value)) return fallback;
        try {
            Object parsed = new JSONTokener(value).nextValue();
            return parsed instanceof String ? (String) parsed : fallback;
        } catch (Exception e) {
            Log.w(TAG, "JavaScript 字符串解析失败", e);
            return fallback;
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == 1001 && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            // 存储权限已授予，重试下载
            if (pendingDownloadPath != null) {
                String path = pendingDownloadPath;
                pendingDownloadPath = null;
                // 重新调用 saveToDownloads（通过 JS eval，因为接口在 WebView 上）
                WebView wv = (bridge != null) ? bridge.getWebView() : null;
                if (wv != null) {
                    wv.evaluateJavascript(
                            "if(window.NativeDownload)window.NativeDownload.downloadFile(" + JSONObject.quote(path) + ")",
                            null);
                }
            }
        }
    }

    private void pollDownload(WebView wv) {
        wv.evaluateJavascript("(window.__downloadUrl||'')", value -> {
            if (value != null && value.length() > 2) {
                String url = decodeJavascriptString(value, "");
                if (!url.isEmpty()) {
                    wv.evaluateJavascript("window.__downloadUrl=''", null);
                    new UpdateBridge(this, wv).startDownload(url);
                }
            }
            wv.postDelayed(() -> pollDownload(wv), 2000);
        });
    }

    @Override
    public void onBackPressed() {
        WebView wv = (bridge != null) ? bridge.getWebView() : null;
        if (wv != null) {
            wv.evaluateJavascript("window.onAndroidBack()", new android.webkit.ValueCallback<String>() {
                @Override
                public void onReceiveValue(String value) {
                    if ("true".equals(value)) {
                        return;
                    }
                    String url = wv.getUrl();
                    if (url != null && url.contains("/recruit")) {
                        moveTaskToBack(true);
                    } else {
                        if (wv.canGoBack()) {
                            wv.goBack();
                        } else {
                            MainActivity.super.onBackPressed();
                        }
                    }
                }
            });
        } else {
            super.onBackPressed();
        }
    }

}
