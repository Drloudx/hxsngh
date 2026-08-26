package com.hxsngh.assistant;

import android.app.Application;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.util.Log;

import com.umeng.analytics.MobclickAgent;
import com.umeng.commonsdk.UMConfigure;
import com.umeng.umcrash.UMCrash;

import java.util.concurrent.atomic.AtomicBoolean;

public class UmengApplication extends Application {
    private static final String TAG = "UmengInit";
    private static final String APP_KEY = "6a8ec1a8934d206f58656f93";
    private static final String CHANNEL = "官网";
    private static final String PREFS_NAME = "privacy_prefs";
    private static final String PREF_PRIVACY_ACCEPTED = "privacy_accepted";
    private static final String PREF_TEST_EVENT_SENT = "umeng_onboarding_test_sent";
    private static final String TEST_EVENT = "umeng_onboarding_test";
    private static final AtomicBoolean INITIALIZED = new AtomicBoolean(false);

    @Override
    public void onCreate() {
        super.onCreate();
        SharedPreferences preferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        if (preferences.getBoolean(PREF_PRIVACY_ACCEPTED, false)) {
            initializeAfterPrivacyConsent(this);
        } else {
            Log.i(TAG, "等待用户同意隐私政策，友盟 SDK 暂不初始化");
        }
    }

    public static void initializeAfterPrivacyConsent(Context context) {
        Context appContext = context.getApplicationContext();
        SharedPreferences preferences = appContext.getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        preferences.edit().putBoolean(PREF_PRIVACY_ACCEPTED, true).apply();

        if (!INITIALIZED.compareAndSet(false, true)) {
            return;
        }

        try {
            Bundle config = new Bundle();
            config.putBoolean(UMCrash.KEY_ENABLE_CRASH_JAVA, true);
            config.putBoolean(UMCrash.KEY_ENABLE_CRASH_NATIVE, true);
            config.putBoolean(UMCrash.KEY_ENABLE_ANR, true);
            config.putBoolean(UMCrash.KEY_ENABLE_PA, true);
            config.putBoolean(UMCrash.KEY_ENABLE_LAUNCH, true);
            config.putBoolean(UMCrash.KEY_ENABLE_MEM, true);
            config.putBoolean(UMCrash.KEY_ENABLE_NET, true);
            config.putBoolean(UMCrash.KEY_ENABLE_PAGE, true);
            config.putBoolean(UMCrash.KEY_ENABLE_POWER, true);
            config.putBoolean(UMCrash.KEY_ENABLE_CODE_LOG, true);
            config.putBoolean(UMCrash.KEY_ENABLE_MEMLEAK, true);
            config.putLong(UMCrash.KEY_PA_TIMEOUT_TIME, 2000L);
            UMCrash.initConfig(config);

            boolean debugBuild = (appContext.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            UMConfigure.setLogEnabled(debugBuild);
            UMConfigure.preInit(appContext, APP_KEY, CHANNEL);
            UMConfigure.submitPolicyGrantResult(appContext, true);
            UMConfigure.init(
                    appContext,
                    APP_KEY,
                    CHANNEL,
                    UMConfigure.DEVICE_TYPE_PHONE,
                    null
            );

            if (!preferences.getBoolean(PREF_TEST_EVENT_SENT, false)) {
                MobclickAgent.onEvent(appContext, TEST_EVENT);
                preferences.edit().putBoolean(PREF_TEST_EVENT_SENT, true).apply();
                Log.i(TAG, "已发送测试事件: " + TEST_EVENT);
            }
            Log.i(TAG, "U-App 与 U-APM 已在隐私同意后初始化");
        } catch (RuntimeException error) {
            INITIALIZED.set(false);
            Log.e(TAG, "友盟 SDK 初始化失败", error);
        }
    }
}
