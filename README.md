<div align="center">

<img src="public/qio-guide-hero.svg" alt="Qio — همراه هوشمند دسکتاپ" width="860" />

# ✦ Qio | کیو

### دوست کوچولوی هوشمندت؛ همیشه کنار کدت.

**یه دوست کوچولوی فارسی که موقع کدنویسی با هوش مصنوعی، روی ویندوز یا مک کنارت می‌مونه.**
چشم‌هاش دنبالت می‌کنن، با اتفاق‌های مهم واکنش نشون می‌ده و هر وقت خواستی می‌تونی با مدل‌های مختلف هوش مصنوعی حرف بزنی. همه‌چیز جمع‌وجور و بی‌دردسره! ✨

<br/>

[![Windows](https://img.shields.io/badge/Windows-Builds-1477c9?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/sahandse/Qio/actions/workflows/ui-check.yml)
[![macOS](https://img.shields.io/badge/macOS-Builds-273a58?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/sahandse/Qio/actions/workflows/ui-check.yml)
[![Linux](https://img.shields.io/badge/Linux-Experimental-f3a45c?style=for-the-badge&logo=linux&logoColor=black)](docs/INSTALL_LINUX_FA.md)
[![Support](https://img.shields.io/badge/Telegram-@sahandse-229ED9?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/sahandse)

[**⬇ مشاهده خروجی‌های ساخت**](https://github.com/sahandse/Qio/actions/workflows/ui-check.yml) · [**📖 نصب قدم‌به‌قدم**](#-راهنمای-نصب-برای-هر-سیستمعامل) · [**⚙ اتصال AI**](docs/AI_PROVIDERS_FA.md) · [**❗ راهنما و پشتیبانی**](https://t.me/sahandse)

<sub>⚠️ کیو هنوز نسخه آزمایشی 0.1.0 هست. قبل از دانلود، توی GitHub Actions چک کن فایل نصب واقعاً ساخته شده باشه؛ فعلاً نسخه نهایی و تأییدشده نداریم.</sub>

</div>

---

## 🌟 کیو چه کارای باحالی بلده؟

| ✨ چی توی کیو می‌بینی؟ | ⚙️ پشت صحنه چه خبره؟ |
|---|---|
| **جزیره شناور و دوست‌داشتنی** | پنجره بدون قاب و همیشه‌روی‌صفحه؛ حالت معمولی، باز و Mini |
| **کاراکتر با احساس** | حرکت چشم، چشمک، حالت‌های کار/فکر/خوشحالی/هشدار/استراحت؛ صداهای اختیاری |
| **رویدادهای برنامه‌نویسی** | خواندن تاریخچه‌ی محلی Codex و Claude Code؛ Hook اختیاری برای رویدادهای مستقل |
| **کنترل درخواست‌های Claude** | مشاهده و تأیید/رد دستی PermissionRequest، بدون تأیید خودکار |
| **چت مستقیم هوش مصنوعی** | اتصال کدنویسی‌شده به ۱۳ ارائه‌دهنده Cloud و Local |
| **تنظیمات شخصی** | روشن/تاریک، کاهش حرکت، اعلان‌ها، صدای اختیاری، نمایش کوچک |
| **اعلان و Tray** | اعلان بومی با اجازه‌ی کاربر؛ منوی نمایش، پنهان‌کردن و خروج |
| **راهنمای تصویری** | مراحل اتصال جداگانه برای ۱۳ ارائه‌دهنده AI |
| **پشتیبانی فارسی** | «! راهنما و رفع مشکل» و لینک مستقیم [تلگرام @sahandse](https://t.me/sahandse) |

**یه نکته مهم:** کیو الکی نمی‌گه «همه‌چی وصله»! دیدن تاریخچه یعنی یه فعالیت قبلاً ثبت شده، نه اینکه Agent همین الان آنلاینه. موفق‌شدن تست و وصل‌بودن API هم فقط با نتیجه واقعی مشخص می‌شه.

## 🪄 کیو چه شکلی کنارت می‌مونه؟

<table>
<tr>
<td width="33%" align="center"><strong>۱. جزیره جمع‌وجور</strong><br/>کیو در گوشهٔ صفحه، با وضعیت کوتاه و کاراکتر واکنش‌گرا</td>
<td width="33%" align="center"><strong>۲. Mini Companion</strong><br/>یک کاراکتر کوچک برای دسکتاپ و دسترسی سریع به پنل</td>
<td width="33%" align="center"><strong>۳. پنل کامل</strong><br/>چهار بخش گفت‌وگو، فعالیت‌ها، راهنما و تنظیمات</td>
</tr>
</table>

> 🎨 عکس بالای صفحه، تصویر اختصاصی خود کیوئه؛ اسکرین‌شات اجرای برنامه نیست. وقتی نسخه‌ها تست شدن، عکس واقعی هم می‌ذاریم.

## 💻 می‌خوای کیو رو نصب کنی؟ از اینجا شروع کن

| سیستم‌عامل | وضعیت بسته | آموزش فارسی کامل |
|---|---|---|
| 🪟 **Windows 10/11** | Workflow ساخت EXE/MSI؛ موفقیت خروجی هنوز تأیید نشده | [نصب و رفع اشکال ویندوز](docs/INSTALL_WINDOWS_FA.md) |
| 🍎 **macOS** | Workflow ساخت DMG؛ امضا و notarization تأیید نشده | [نصب و ساخت روی مک](docs/INSTALL_MACOS_FA.md) |
| 🐧 **Linux** | آزمایشی؛ Build خودکار رسمی ندارد | [راهنمای اجرای سورس لینوکس](docs/INSTALL_LINUX_FA.md) |
| 📱 **Android / iOS** | نسخهٔ قابل نصب ارائه نشده | — |

### نصب راحت از GitHub، اگه فایل آماده بود

1. وارد [Qio desktop build](https://github.com/sahandse/Qio/actions/workflows/ui-check.yml) شوید.
2. اجرای **موفق** مخصوص آخرین تغییرات شاخه `main` را انتخاب کنید.
3. فقط اگر بخش **Artifacts** شامل بستهٔ مربوط به سیستم‌عامل شما بود، آن را دریافت کنید.
4. بسته ZIP را استخراج و نصب‌کننده را طبق راهنمای سیستم‌عامل اجرا کنید.

**حواست باشه:** فایل‌های بخش Artifacts ممکنه هنوز امضای دیجیتال یا تست نهایی نداشته باشن. قبل از استفاده، مطمئن شو خروجی معتبر و مناسب سیستمت هست.

### دوست داری خودت از سورس اجراش کنی؟

به Node.js 22، Rust و پیش‌نیازهای [Tauri 2](https://v2.tauri.app/start/prerequisites/) نیاز دارید.

```bash
git clone https://github.com/sahandse/Qio.git
cd Qio
npm install
npm test
npm run tauri dev
```

ساخت فایل‌های نصب روی سیستم سازگار:

```bash
npm run tauri build
```

## 🧠 کیو با کدوم هوش مصنوعی‌ها حرف می‌زنه؟

| 🇮🇷 ایرانی | ☁️ بین‌المللی | 🖥️ محلی |
|---|---|---|
| AvalAI، Hooshgar | OpenAI، OpenRouter، DeepSeek، Groq، Together AI، Mistral AI، Grok (xAI)، Fireworks AI، Cerebras | Ollama، LM Studio |

**فعلاً اتصال ۱۳ سرویس توی کد اضافه شده.** برای سرویس‌های ابری، کلید API و مدل فعال می‌خوای؛ برای Ollama و LM Studio هم باید مدل روی کامپیوتر خودت اجرا بشه.

[📘 مستندات ارائه‌دهندگان](docs/AI_PROVIDERS_FA.md) · [📚 نصب و اتصال Agentها](docs/DESKTOP_SETUP_FA.md)

## 🔐 اطلاعاتت چی می‌شه؟

- رویدادهای Hook در `~/.qio/` ثبت می‌شوند؛ متن کامل مکالمه یا خروجی کد برای نوار فعالیت کپی نمی‌شود.
- پیش‌نمایش کوتاه درخواست مجوز می‌تواند شامل اطلاعات حساس دستور باشد و فقط برای تصمیم خود کاربر نمایش داده می‌شود.
- مجوز ابزارها به‌صورت خودکار پذیرفته نمی‌شود.
- ثبت نتیجه تست بر اساس **کد خروج فرایند** است؛ تازه‌بودن نتیجه نسبت به آخرین تغییرات کد بررسی قطعی نشده است.
- سازگاری نهایی رابط و بسته‌ها با Windows/macOS، اتصال همهٔ سرویس‌ها و هماهنگی تمامی Hookها هنوز باید در اجرای واقعی آزمایش شوند.
- کیو از تجربه کاربری [Coucou](https://github.com/Louis-CFM/coucou) الهام می‌گیرد اما کاراکتر، رنگ‌بندی و برند مستقلی دارد.

## ❓ جایی گیر کردی؟ بیا حرف بزنیم!

توی خود برنامه هم کافیه بری **تنظیمات ← ! راهنما و رفع مشکل ← تلگرام و پشتیبانی**. اونجا راحت پیدامون می‌کنی. 💬

[**✈️ تلگرام @sahandse**](https://t.me/sahandse) · [**🐛 ثبت مشکل GitHub**](https://github.com/sahandse/Qio/issues) · [**📊 وضعیت توسعه**](docs/STATUS.md)

<div align="center">

### Qio — کوچولو، باهوش و همیشه همراه. 💙

<sub>ساخته‌شده با TypeScript، Rust و Tauri 2 · نسخهٔ در حال توسعه</sub>

</div>
