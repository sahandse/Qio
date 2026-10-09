# 🍎 کیو رو روی مک هم بیاریم!

> نسخهٔ macOS هنوز از نظر امضا و notarization برای انتشار عمومی تأیید نشده است.

[مشاهده Workflow ساخت مک](https://github.com/sahandse/Qio/actions/workflows/ui-check.yml)

## روش اول: دریافت نسخه ساخته‌شده از GitHub
1. لینک بالا رو باز کن و یک Build **موفق** مربوط به `main` انتخاب کن.
2. توی قسمت **Artifacts**، اگه `Qio-macos-latest` وجود داشت، دانلودش کن.
3. ZIP رو باز کن و بعد روی فایل DMG بزن.
4. اگه برنامه Qio داخل DMG بود، بکش و بندازش توی پوشه **Applications**.
5. برنامه را از Applications اجرا کنید. در صورت نمایش محدودیت Gatekeeper، تنظیمات Privacy & Security و اعتبار منشأ فایل را بررسی کنید. نسخه‌های بدون امضا ممکن است نیازمند ساخت محلی یا امضای رسمی باشند؛ کاهش تنظیمات امنیتی سیستم توصیه نمی‌شود.
6. از منوی بالا (menu bar)، وضعیت آیکون Qio و گزینه‌های نمایش/پنهان‌سازی/خروج را بررسی کنید.

## روش دوم: خودت روی مک بسازش
1. Node.js 22 و ابزارهای توسعه Xcode Command Line Tools را نصب کنید:
   ```bash
   xcode-select --install
   ```
2. Rust را با راهنمای رسمی rustup نصب کنید.
3. مخزن را دانلود و وارد پوشه شوید:
   ```bash
   git clone https://github.com/sahandse/Qio.git
   cd Qio
   ```
4. این دستورها را اجرا کنید:
   ```bash
   npm install
   npm test
   npm run tauri dev
   ```
5. ساخت فایل نصب:
   ```bash
   npm run tauri build
   ```
6. خروجی‌های موجود را در `src-tauri/target/release/bundle/dmg` یا `macos` بررسی کنید.

## مک با چیپ M یا Intel داری؟
بسته‌ای که روی runner ساخته می‌شود لزوماً برای هر دو معماری Universal نیست؛ معماری فایل را قبل از نصب بررسی کنید. ساخت Universal، signing و notarization مراحل جداگانه‌ای هستند و در پروژه هنوز تأیید نشده‌اند.

## وصل‌کردن Agentها به کیو
- Qio تاریخچه محلی Codex و Claude Code را می‌خواند؛ این به‌معنای نظارت زنده کامل نیست.
- برای راه‌اندازی Hook اختیاری Claude Code بعد از بررسی فایل تنظیمات: `npm run setup:claude`.
- قبل از تأیید هر دستور در پنل Qio، مشخصات ابزار و درخواست را بررسی کنید.

[بازگشت به معرفی کیو](../README.md) · [پشتیبانی تلگرام](https://t.me/sahandse)
