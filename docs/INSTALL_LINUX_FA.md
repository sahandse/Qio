# Qio برای Linux — وضعیت و راهنمای توسعه

**وضعیت:** پروژه با Tauri 2 توسعه یافته اما Workflow فعلی فقط Windows و macOS را می‌سازد. هیچ فایل نصب Linux در این مخزن در حال حاضر تأیید نشده است. مراحل زیر برای توسعه‌دهندگان و اجرای سورس است، نه وعدهٔ نسخه آماده.

## مراحل روی توزیع‌های Debian/Ubuntu
1. ابزارهای ساخت سیستم، GTK و WebKitGTK مورد نیاز Tauri 2 را مطابق [راهنمای رسمی پیش‌نیازهای Tauri](https://v2.tauri.app/start/prerequisites/) نصب کنید. نام بسته‌ها بسته به نسخه توزیع تغییر می‌کند.
2. Node.js 22 و Rust را نصب کنید.
3. کد را دریافت کنید:
   ```bash
   git clone https://github.com/sahandse/Qio.git
   cd Qio
   ```
4. تست فرانت‌اند و اسکریپت‌ها:
   ```bash
   npm install
   npm test
   npm run build
   ```
5. اجرا در حالت توسعه:
   ```bash
   npm run tauri dev
   ```
6. اگر پیش‌نیازهای GTK/WebKitGTK و وابستگی‌های پروژه درست نصب‌اند، برای بررسی امکان Build:
   ```bash
   npm run tauri build
   ```
7. بسته‌های احتمالی AppImage/Deb/RPM را فقط پس از Build موفق و تست روی توزیع هدف منتشر کنید.

**توجه:** قابلیت‌های System Tray، شفافیت پنجره و Always-on-Top در محیط‌های دسکتاپ Linux ممکن است با Windows/macOS متفاوت باشد. این پلتفرم هنوز در CI اصلی تست نمی‌شود.

[صفحه اصلی Qio](../README.md) · [راهنمای رسمی Tauri](https://v2.tauri.app/)
