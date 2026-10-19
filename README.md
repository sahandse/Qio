<div align="center">

<img src="public/qio-guide-hero.svg" alt="Qio — همراه هوشمند دسکتاپ با کاراکتر اختصاصی" width="100%" />

# Qio / کیو

### یک همراه هوشمند؛ همیشه کنار دستت.

رابطی جمع‌وجور برای کار با ابزارهای هوش مصنوعی و Agentهای برنامه‌نویسی؛ با کاراکتر اختصاصی Canvas، پنجرهٔ شناور و تجربهٔ فارسی و انگلیسی.

<p>
  <a href="https://github.com/sahandse/Qio/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/sahandse/Qio?style=flat-square&label=نسخهٔ منتشرشده&color=8B5CF6"></a>
  <a href="https://github.com/sahandse/Qio/actions"><img alt="GitHub Actions" src="https://img.shields.io/github/actions/workflow/status/sahandse/Qio/ui-check.yml?style=flat-square&label=Build%20%26%20Tests"></a>
  <a href="https://github.com/sahandse/Qio/actions/workflows/macos-release.yml"><img alt="macOS build" src="https://img.shields.io/github/actions/workflow/status/sahandse/Qio/macos-release.yml?style=flat-square&label=macOS"></a>
  <img alt="Windows" src="https://img.shields.io/badge/Windows-10%2F11-22C55E?style=flat-square&logo=windows&logoColor=white">
  <img alt="Persian + English" src="https://img.shields.io/badge/FA-EN-06B6D4?style=flat-square">
  <img alt="Tauri 2" src="https://img.shields.io/badge/Tauri-2-24C8DB?style=flat-square&logo=tauri&logoColor=white">
</p>

[دانلود آخرین نسخه](https://github.com/sahandse/Qio/releases/latest) · [وضعیت ساخت و Deploy](https://github.com/sahandse/Qio/actions) · [راهنمای فارسی](docs/DESKTOP_SETUP_FA.md) · [راهنمای AI](docs/AI_PROVIDERS_FA.md) · [گزارش مشکل](https://github.com/sahandse/Qio/issues)

</div>

---

## ✦ دربارهٔ Qio

Qio یک همراه دسکتاپ با هویت بصری اختصاصی است؛ کاراکتر آن با **Canvas** رسم می‌شود و از فایل تصویر آماده استفاده نمی‌کند. رابط در حالت جمع‌شده روی کاراکتر تمرکز دارد و میان‌برهای چت و تنظیمات در دسترس‌اند.

هدف Qio این است که وضعیت فعالیت‌های پشتیبانی‌شده را روشن و قابل‌فهم نشان دهد، بدون اینکه وجود تاریخچه را با اتصال زنده اشتباه بگیرد.

## ✨ امکانات اصلی

| قابلیت | توضیح |
|---|---|
| **کاراکتر زنده** | کاراکتر اختصاصی با حال‌وهوای سبز نئونی و بنفش، حالت‌های واکنشی و پشتیبانی از کاهش حرکت |
| **پنجرهٔ شناور** | رابط جمع‌وجور، حالت بزرگ و کوچک و دسترسی از System Tray |
| **فارسی و انگلیسی** | پشتیبانی از راست‌چین و چپ‌چین |
| **وضعیت GitHub Actions** | نمایش اجراهای اخیر، وضعیت موفق/درحال‌اجرا/خطا و لینک مستقیم هر اجرا در بخش تنظیمات |
| **Agentها و Hookها** | نمایش رویدادهای محلی و راهنمای راه‌اندازی ابزارهای پشتیبانی‌شده |
| **گفت‌وگوی AI** | اتصال به ارائه‌دهندگان تعریف‌شده در برنامه، با کلید API و مدل معتبر |
| **اعلان‌های اختیاری** | کنترل اعلان‌ها از داخل برنامه |
| **حریم خصوصی** | امکان خاموش‌کردن ثبت فرادادهٔ رویدادهای محلی |

> **شفافیت وضعیت:** پیدا شدن پوشه، وجود تاریخچه، تنظیم‌شدن Hook و اتصال واقعی به سرویس، چهار وضعیت متفاوت‌اند. Qio نباید یکی را به‌جای دیگری گزارش کند.

## 📥 دانلود و نصب

از [صفحهٔ آخرین انتشار](https://github.com/sahandse/Qio/releases/latest) فایل‌های موجود در بخش **Assets** را دریافت کن.

| سیستم‌عامل | بسته | نکته |
|---|---|---|
| Windows 10/11 | EXE یا MSI، در صورت وجود در Release | هش فایل‌ها را با `SHA256SUMS.txt` مقایسه کن |
| macOS Intel | DMG، در صورت انتشار | امضا و notarization را در یادداشت همان نسخه بررسی کن |
| macOS Apple Silicon | DMG، در صورت انتشار | فقط فایل‌های موجود در Release رسمی را دریافت کن |
| Linux | [راهنمای نصب از سورس](docs/INSTALL_LINUX_FA.md) | آزمایشی |
| Android / iOS | فعلاً بستهٔ قابل‌نصب منتشر نشده | — |

**وضعیت انتشار را حدس نزن:** نسخه و فایل‌های نصب فقط وقتی منتشرشده محسوب می‌شوند که در صفحهٔ Release واقعاً موجود باشند. برای دیدن اجرای ساخت، [GitHub Actions](https://github.com/sahandse/Qio/actions) را باز کن.

## 🔌 ابزارها و ارائه‌دهندگان

### Agentها
راهنماها و اسکریپت‌های راه‌اندازی موجود در مخزن برای ابزارهایی مثل **Claude Code، Cursor و Qoder** هستند:

- Claude Code: `npm run setup:claude`
- Cursor: `npm run setup:cursor`
- Qoder: `npm run setup:qoder`

این دستورها را از پوشهٔ پروژه اجرا کن و راهنمای [راه‌اندازی دسکتاپ](docs/DESKTOP_SETUP_FA.md) را بخوان. امکانات هر ابزار به نسخه و تنظیمات محلی آن بستگی دارد.

### گفت‌وگوی مستقیم با مدل‌ها
سورس Qio شامل تنظیمات ارائه‌دهندگان ابری و محلی از جمله OpenAI، Gemini، OpenRouter، DeepSeek، Groq، Mistral، xAI، GitHub Models، Ollama و LM Studio است. دسترسی واقعی نیازمند کلید معتبر یا سرور محلی فعال و مدل در دسترس است.

- [راهنمای ارائه‌دهندگان AI](docs/AI_PROVIDERS_FA.md)
- [راهنمای دسکتاپ](docs/DESKTOP_SETUP_FA.md)
- [راهنمای انگلیسی](docs/DESKTOP_SETUP_EN.md)

## 🧪 اجرا از سورس

### پیش‌نیازها
- Node.js 22
- Rust toolchain
- پیش‌نیازهای سیستم‌عامل برای [Tauri 2](https://v2.tauri.app/start/prerequisites/)

### راه‌اندازی

```bash
git clone https://github.com/sahandse/Qio.git
cd Qio
npm install
npm test
npm run tauri dev
```

ساخت نسخهٔ دسکتاپ روی سیستم سازگار:

```bash
npm run build
npm run tauri build
```

## 🛡️ امنیت و حریم خصوصی

- کلیدهای API را در سورس، README، Issue یا اسکرین‌شات قرار نده.
- برای رویدادهای Hook، تاریخچه و اتصال زنده را جداگانه بررسی کن.
- درخواست‌های Permission نباید بدون تصمیم کاربر تأیید شوند.
- قبل از اجرای اسکریپت‌ها، محتوای آن‌ها را مرور کن و از راهنمای ابزار مربوط پیروی کن.
- داده‌های محلی و سازگاری هر Agent ممکن است بر اساس محیط و نسخه متفاوت باشند.

## 🗺️ نقشهٔ راه و مشارکت

- [نقشهٔ راه فارسی](docs/ROADMAP_FA.md)
- [Roadmap in English](docs/ROADMAP_EN.md)
- [وضعیت پروژه](docs/STATUS.md)
- [ثبت باگ یا پیشنهاد](https://github.com/sahandse/Qio/issues)
- [پشتیبانی](https://t.me/sahandse)

برای گزارش باگ، نسخهٔ Qio، سیستم‌عامل، مراحل بازتولید و لاگ مرتبط را اضافه کن؛ اطلاعات محرمانه و کلید API را منتشر نکن.

---

<div align="center">

### کوچولو، هوشمند و همیشه کنار دستت. 💜🟩

**TypeScript · Rust · Tauri 2 · Canvas**

<sub>وضعیت ساخت و فایل‌های انتشار را در GitHub Actions و صفحهٔ Releases بررسی کن.</sub>

</div>

---

## English

**Qio is a compact desktop AI companion** with an original Canvas-drawn character, a floating window, Persian/English UI, optional notifications, local agent-event views, and a GitHub Actions status panel.

- **Download:** [Latest release and available assets](https://github.com/sahandse/Qio/releases/latest)
- **Build & deploy status:** [GitHub Actions](https://github.com/sahandse/Qio/actions)
- **AI providers:** [Provider guide](docs/AI_PROVIDERS_FA.md)
- **Agent setup:** [Desktop setup guide](docs/DESKTOP_SETUP_EN.md)
- **Roadmap:** [English roadmap](docs/ROADMAP_EN.md)
- **Issues:** [Report a bug or request a feature](https://github.com/sahandse/Qio/issues)

Qio distinguishes local history, hook configuration, and live service connectivity. A detected folder or a listed provider does not by itself mean that an agent or API is currently connected. Only assets actually attached to a GitHub Release should be considered downloadable release builds.
