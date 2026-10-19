# اتصال مستقل هوش مصنوعی در کیو

کیو برای **گفت‌وگو** مستقیماً از هسته Rust به API سرویس انتخابی درخواست می‌فرستد. برای پاسخ کاملاً آفلاین، باید Ollama یا LM Studio و یک مدل دانلودشده از قبل روی کامپیوتر نصب و اجرا شده باشد. خود کیو موتور مدل داخلی ندارد.

## ارائه‌دهندگان
| ارائه‌دهنده | شناسه | متغیر محیطی API |
|---|---|---|
| Claude / Anthropic | anthropic | ANTHROPIC_API_KEY |
| اول‌ای‌آی، ایرانی | avalai | AVALAI_API_KEY |
| هوشگر، ایرانی | hooshgar | HOOSHGAR_API_KEY |
| OpenAI | openai | OPENAI_API_KEY |
| Google Gemini | gemini | GEMINI_API_KEY |
| OpenRouter | openrouter | OPENROUTER_API_KEY |
| DeepSeek | deepseek | DEEPSEEK_API_KEY |
| Groq | groq | GROQ_API_KEY |
| Together AI | together | TOGETHER_API_KEY |
| Mistral AI | mistral | MISTRAL_API_KEY |
| xAI Grok | xai | XAI_API_KEY |
| Fireworks AI | fireworks | FIREWORKS_API_KEY |
| Cerebras | cerebras | CEREBRAS_API_KEY |
| Perplexity AI | perplexity | PERPLEXITY_API_KEY |
| SambaNova | sambanova | SAMBANOVA_API_KEY |
| NVIDIA NIM | nvidia | NVIDIA_API_KEY |
| SiliconFlow | siliconflow | SILICONFLOW_API_KEY |
| Hugging Face | huggingface | HF_TOKEN |
| GitHub Models | githubmodels | GITHUB_TOKEN |
| Cohere | cohere | COHERE_API_KEY |
| Novita AI | novita | NOVITA_API_KEY |
| Ollama محلی | ollama | بدون کلید |
| LM Studio محلی | lmstudio | بدون کلید |

بیشتر ارائه‌دهنده‌های فهرست از endpointهای سازگار با OpenAI استفاده می‌کنند؛ Claude از مسیر رسمی Anthropic Messages API استفاده می‌کند. **مدل‌های در دسترس، تعرفه و سازگاری هر مدل به حساب و ارائه‌دهنده بستگی دارند.** کیو شناسه مدل را از کاربر می‌گیرد تا نام مدل اشتباه یا ساختگی نمایش ندهد.

آدرس‌های API در سورس Rust ثابت‌اند. کلیدها داخل GitHub، localStorage یا تنظیمات متنی کیو ذخیره نمی‌شوند؛ پیش از اجرای برنامه باید متغیر محیطی موردنیاز روی سیستم تنظیم شده باشد و برنامه مجدد اجرا شود. هیچ کلیدی نباید در Issues یا Screenshots منتشر شود.

## آنچه هنوز مستقل نشده
نظارت زنده کامل بر ابزارهای CLI، تأیید/رد مجوزها و شناسایی اثبات‌پذیر نتایج تست‌ها نیازمند ساخت آداپتور اختصاصی برای هر Agent است. نمایش تاریخچه Codex و Claude فقط شناسایی نشست است. اتصال‌های ابری به کلید معتبر و مدل پشتیبانی‌شده نیاز دارند؛ اتصال‌های محلی هم فقط وقتی کار می‌کنند که سرور محلی اجرا شده باشد.

## امنیت

در تنظیمات کیو می‌توان ثبت فرادادهٔ رویدادهای Hook را خاموش کرد. در حالت خاموش، Hookهای Qio رویداد جدید ذخیره نمی‌کنند؛ تاریخچهٔ قبلی تا زمان پاک‌کردن دستی باقی می‌ماند.

تنها ارائه‌دهنده‌های ثابت و شناخته‌شده یا آدرس لوپ‌بک محلی پذیرفته می‌شوند؛ URL دلخواه اجرا نمی‌شود و redirect غیرفعال است. درخواست‌ها محدودیت حجم متن و زمان پاسخ دارند. متن پیام با انتخاب کاربر فقط به ارائه‌دهنده همان انتخاب ارسال می‌شود.

منابع:
- https://docs.avalai.org/en/api-reference/introduction
- https://github.com/ollama/ollama/blob/main/docs/api/openai-compatibility.mdx

## ارائه‌دهندهٔ ایرانی هوشگر
آدرس مستندشدهٔ رسمی: https://api.hooshgar.ir/v1/chat/completions
راهنما: https://hooshgar.ir/docs/chat-completions
