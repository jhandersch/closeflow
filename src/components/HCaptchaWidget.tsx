"use client";

import { useEffect, useRef, useState } from "react";

type HCaptchaApi = {
    render: (
        container: HTMLElement,
        options: {
            sitekey: string;
            callback: (token: string) => void;
            "expired-callback": () => void;
            "error-callback": (code: string) => void;
        }
    ) => number;
    reset: (widgetId?: number) => void;
};

declare global {
    interface Window {
        hcaptcha?: HCaptchaApi;
        __closeflowHcaptchaOnLoad?: () => void;
    }
}

type HCaptchaWidgetProps = {
    onToken: (token: string | null) => void;
    resetKey: number;
};

const scriptId = "hcaptcha-api";
const siteKey = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY?.trim() || "";

const errorMessages: Record<string, string> = {
    "network-error":
        "hCaptcha could not reach its service. Check your network, VPN, or browser content blockers and retry.",
    "invalid-data":
        "hCaptcha rejected its configuration. Check the sitekey and allowed hostnames.",
    "challenge-error":
        "hCaptcha could not initialize the challenge. Retry and check the site configuration if it continues.",
    "rate-limited":
        "hCaptcha temporarily rate-limited requests. Wait briefly, then retry.",
    "internal-error":
        "hCaptcha encountered an internal error. Retry or check its service status.",
    "script-error":
        "The hCaptcha script could not load. Check your network or browser content blockers.",
};

export default function HCaptchaWidget({
    onToken,
    resetKey,
}: HCaptchaWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<number | null>(null);
    const renderAttemptedRef = useRef(false);
    const onTokenRef = useRef(onToken);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        onTokenRef.current = onToken;
    }, [onToken]);

    useEffect(() => {
        if (!siteKey || !containerRef.current) {
            onTokenRef.current(null);
            return;
        }

        let cancelled = false;

        const renderWidget = () => {
            if (
                cancelled ||
                renderAttemptedRef.current ||
                widgetIdRef.current !== null ||
                !containerRef.current ||
                !window.hcaptcha
            ) {
                return;
            }

            renderAttemptedRef.current = true;
            try {
                widgetIdRef.current = window.hcaptcha.render(
                    containerRef.current,
                    {
                        sitekey: siteKey,
                        callback: (token) => onTokenRef.current(token),
                        "expired-callback": () => onTokenRef.current(null),
                        "error-callback": (code) => {
                            onTokenRef.current(null);
                            setErrorMessage(
                                errorMessages[code] ??
                                    "hCaptcha encountered an error. Retry and check your network connection.",
                            );
                        },
                    }
                );
            } catch (error) {
                onTokenRef.current(null);
                console.error("hCaptcha widget failed to render.", error);
                setErrorMessage(
                    "hCaptcha could not initialize the challenge. Reload the page and retry.",
                );
            }
        };

        const existingScript = document.getElementById(scriptId);
        if (window.hcaptcha) {
            renderWidget();
        } else {
            window.__closeflowHcaptchaOnLoad = renderWidget;

            if (!existingScript) {
                const script = document.createElement("script");
                script.id = scriptId;
                script.src =
                    "https://js.hcaptcha.com/1/api.js?onload=__closeflowHcaptchaOnLoad&render=explicit";
                script.async = true;
                script.defer = true;
                script.addEventListener(
                    "error",
                    () => {
                        if (!cancelled) {
                            setErrorMessage(errorMessages["script-error"]);
                        }
                    },
                    { once: true }
                );
                document.head.appendChild(script);
            }
        }

        return () => {
            cancelled = true;
            delete window.__closeflowHcaptchaOnLoad;
            if (
                widgetIdRef.current !== null &&
                window.hcaptcha
            ) {
                window.hcaptcha.reset(widgetIdRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (
            resetKey > 0 &&
            widgetIdRef.current !== null &&
            window.hcaptcha
        ) {
            window.hcaptcha.reset(widgetIdRef.current);
            onTokenRef.current(null);
        }
    }, [resetKey]);

    if (!siteKey) {
        return (
            <p className="text-sm text-rose-300">
                CAPTCHA is not configured for this deployment.
            </p>
        );
    }

    return (
        <div className="space-y-2" aria-label="CAPTCHA verification">
            <div ref={containerRef} />
            {errorMessage ? (
                <p className="text-sm text-rose-300">
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}
