# نصب Qio روی macOS — راهنمای مرحله‌به‌مرحله

> نسخهٔ macOS هنوز از نظر امضا و notarization برای انتشار عمومی تأیید نشده است.

[مشاهده Workflow ساخت مک](https://github.com/sahandse/Qio/actions/workflows/ui-check.yml)

## روش اول: استفاده از خروجی GitHub Actions
1. لینک بالا را باز کنید و یک Build موفق مربوط به `main` را انتخاب کنید.
2. در بخش Artifacts، در صورت موجود بودن `Qio-macos-latest` آن را دانلود کنید.
3. بسته ZIP را استخراج کنید و فایل DMG را باز کنید.
4. اگر در DMG برنامهٔ Qio وجود دارد، آن را به **Applications** منتقل کنید.
5. برنامه را از Applications اجرا کنید. در صورت نمایش محدودیت Gatekeeper، تنظیمات Privacy & Security و اعتبار منشأ فایل را بررسی کنید. نسخه‌های بدون امضا ممکن است نیازمند ساخت محلی یا امضای رسمی باشند؛ کاهش تنظیمات امنیتی سیستم توصیه نمی‌شود.
6. از منوی بالا (menu bar)، وضعیت آیکون Qio و گزینه‌های نمایش/پنهان‌سازی/خروج را بررسی کنید.

## روش دوم: ساخت محلی روی مک
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

## Apple Silicon و Intel
بسته‌ای که روی runner ساخته می‌شود لزوماً برای هر دو معماری Universal نیست؛ معماری فایل را قبل از نصب بررسی کنید. ساخت Universal، signing و notarization مراحل جداگانه‌ای هستند و در پروژه هنوز تأیید نشده‌اند.

## اتصال Agentها
- Qio تاریخچه محلی Codex و Claude Code را می‌خواند؛ این به‌معنای نظارت زنده کامل نیست.
- برای راه‌اندازی Hook اختیاری Claude Code بعد از بررسی فایل تنظیمات: `npm run setup:claude`.
- قبل از تأیید هر دستور در پنل Qio، مشخصات ابزار و درخواست را بررسی کنید.

[بازگشت به معرفی کیو](../README.md) · [پشتیبانی تلگرام](https://t.me/sahandse)
