package com.hxsngh.assistant;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.webkit.WebView;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.atomic.AtomicBoolean;

public class UpdateBridge {

    private static final AtomicBoolean RUNNING = new AtomicBoolean(false);
    private final WebView webView;
    private final Context context;

    public UpdateBridge(Context ctx, WebView wv) {
        this.context = ctx;
        this.webView = wv;
    }

    public void startDownload(final String apkUrl) {
        if (!RUNNING.compareAndSet(false, true)) return;

        new Thread(() -> {
            HttpURLConnection conn = null;
            File apk = null;
            try {
                File dir = new File(context.getCacheDir(), "updates");
                if (!dir.exists() && !dir.mkdirs()) throw new java.io.IOException("无法创建更新目录");
                apk = new File(dir, "update.apk");
                if (apk.exists() && !apk.delete()) throw new java.io.IOException("无法清理旧安装包");

                conn = openValidatedConnection(apkUrl);
                int total = conn.getContentLength();
                try (InputStream input = conn.getInputStream();
                     FileOutputStream output = new FileOutputStream(apk)) {
                    byte[] buffer = new byte[8192];
                    int read;
                    int done = 0;
                    long lastProgress = 0;
                    while ((read = input.read(buffer)) != -1) {
                        output.write(buffer, 0, read);
                        done += read;
                        long now = System.currentTimeMillis();
                        if (now - lastProgress > 250) {
                            lastProgress = now;
                            final int downloaded = done;
                            post(() -> webView.evaluateJavascript(
                                    "if(window.__updateProgress)window.__updateProgress(" + downloaded + "," + total + ")",
                                    null));
                        }
                    }
                    output.flush();
                }

                verifyDownloadedApk(apk);
                final File verifiedApk = apk;
                post(() -> {
                    webView.evaluateJavascript("if(window.__updateComplete)window.__updateComplete()", null);
                    installApk(verifiedApk);
                });
            } catch (Exception e) {
                if (apk != null && apk.exists() && !apk.delete()) apk.deleteOnExit();
                final String message = e.getMessage() != null ? e.getMessage() : "未知错误";
                post(() -> webView.evaluateJavascript(
                        "if(window.__updateError)window.__updateError(" + JSONObject.quote(message) + ")",
                        null));
            } finally {
                if (conn != null) conn.disconnect();
                RUNNING.set(false);
            }
        }, "apk-update-download").start();
    }

    private HttpURLConnection openValidatedConnection(String value) throws Exception {
        URL currentUrl = new URL(value);
        for (int redirects = 0; redirects <= 5; redirects++) {
            validateDownloadUrl(currentUrl);
            HttpURLConnection conn = (HttpURLConnection) currentUrl.openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "Hxsngh-Android-Updater");

            int code = conn.getResponseCode();
            if (code >= 300 && code < 400) {
                String location = conn.getHeaderField("Location");
                conn.disconnect();
                if (location == null || location.trim().isEmpty()) {
                    throw new java.io.IOException("更新地址重定向无效");
                }
                currentUrl = new URL(currentUrl, location);
                continue;
            }
            if (code != HttpURLConnection.HTTP_OK) {
                conn.disconnect();
                throw new java.io.IOException("安装包下载失败: HTTP " + code);
            }
            return conn;
        }
        throw new java.io.IOException("安装包重定向次数过多");
    }

    private void validateDownloadUrl(URL url) throws java.io.IOException {
        String host = url.getHost() != null ? url.getHost().toLowerCase(java.util.Locale.ROOT) : "";
        boolean allowedHost = "gitee.com".equals(host) || host.endsWith(".gitee.com") ||
                "giteeusercontent.com".equals(host) || host.endsWith(".giteeusercontent.com");
        if (!"https".equalsIgnoreCase(url.getProtocol()) || !allowedHost) {
            throw new java.io.IOException("安装包来源不受信任");
        }
    }

    private void verifyDownloadedApk(File apk) throws Exception {
        PackageManager packageManager = context.getPackageManager();
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? PackageManager.GET_SIGNING_CERTIFICATES
                : PackageManager.GET_SIGNATURES;
        PackageInfo downloaded = packageManager.getPackageArchiveInfo(apk.getAbsolutePath(), flags);
        PackageInfo installed = packageManager.getPackageInfo(context.getPackageName(), flags);
        if (downloaded == null || !context.getPackageName().equals(downloaded.packageName)) {
            throw new SecurityException("安装包不是当前应用的更新");
        }

        Signature[] downloadedSigners = getCurrentSigners(downloaded);
        Signature[] trustedSigners = getTrustedSigners(installed);
        if (!hasMatchingSigner(downloadedSigners, trustedSigners)) {
            throw new SecurityException("安装包签名与当前应用不一致");
        }
    }

    private Signature[] getCurrentSigners(PackageInfo info) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && info.signingInfo != null) {
            return info.signingInfo.getApkContentsSigners();
        }
        return info.signatures;
    }

    private Signature[] getTrustedSigners(PackageInfo info) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && info.signingInfo != null) {
            return info.signingInfo.hasMultipleSigners()
                    ? info.signingInfo.getApkContentsSigners()
                    : info.signingInfo.getSigningCertificateHistory();
        }
        return info.signatures;
    }

    private boolean hasMatchingSigner(Signature[] downloaded, Signature[] trusted) {
        if (downloaded == null || downloaded.length == 0 || trusted == null || trusted.length == 0) return false;
        for (Signature candidate : downloaded) {
            for (Signature expected : trusted) {
                if (candidate.equals(expected)) return true;
            }
        }
        return false;
    }

    private void installApk(File apk) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
                !context.getPackageManager().canRequestPackageInstalls()) {
            Intent permissionIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            permissionIntent.setData(Uri.parse("package:" + context.getPackageName()));
            permissionIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(permissionIntent);
            post(() -> webView.evaluateJavascript(
                    "if(window.__updateError)window.__updateError('请在设置中允许安装未知应用后重试')", null));
            return;
        }

        Uri uri = FileProvider.getUriForFile(
                context, context.getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    private void post(Runnable runnable) {
        webView.post(runnable);
    }
}
