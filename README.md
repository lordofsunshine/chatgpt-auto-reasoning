<div align="center">

# 🤖 ChatGPT Auto Reasoning

**Keep ChatGPT Reasoning mode enabled automatically.**

[English](#english) · [Русский](#russian)

</div>

<a id="english"></a>

## 🇬🇧 English

A userscript that keeps Reasoning mode enabled in ChatGPT. ChatGPT resets Reasoning after sending a message, switching to another chat, and reloading the page. The script detects these changes before you press Enter and restores the toggle to its enabled state.

### What It Does

🔄 - **Monitors page changes** using `MutationObserver`, because ChatGPT works as a single-page application and switching between chats does not reload the browser tab. Additionally, it checks every 1200 ms to make sure Reasoning is still enabled.<br>
🧠 - **Detects the Reasoning button** using multiple indicators: the `aria-pressed` attribute, the brain icon, and the "Reasoning" label in more than twenty interface languages. If the button is not present in the message input area, the script opens the "+" menu and checks for it there.<br>
⚡ - **Intercepts message submission** when Reasoning is disabled: cancels the submission, enables Reasoning, and resends the text after 180 ms. Your message reaches ChatGPT with Reasoning already enabled.<br>
🔒 - **Respects your privacy:** makes no network requests, does not read conversations, and does not request additional permissions. The manifest uses `@grant none`.

### 📥 Installation

1. Install a userscript manager: [Tampermonkey](https://www.tampermonkey.net/) or Violentmonkey.
2. Open the script page on [GreasyFork](https://greasyfork.org/ru/scripts/604103-chatgpt-auto-reasoning) and click **Install**.
3. Reload the ChatGPT tab.

**Check the script status** using the browser console:

```js
__autoReasoning.isOn()
```

After an update is published on GreasyFork, the script automatically retrieves the new version because its manifest specifies `@updateURL`.

### 🌐 Compatibility

| Parameter | Support |
|:----------|:--------|
| ChatGPT plan | ChatGPT GO (tested) |
| Domains | `chatgpt.com`, `chat.openai.com` |
| Userscript managers | Tampermonkey, Violentmonkey |

The script has been tested on ChatGPT GO. On other plans, it works as long as the Reasoning toggle is available in the interface. If the button is missing, the script does nothing.

### 📄 License

MIT License. This project is not affiliated with OpenAI. The script only interacts with elements already available in the ChatGPT interface.

---

<a id="russian"></a>

<details>
<summary><strong>🇷🇺 Русская версия</strong></summary>

## 🤖 ChatGPT Auto Reasoning

Юзерскрипт, который автоматически поддерживает режим Reasoning включённым в ChatGPT. ChatGPT сбрасывает Reasoning после отправки сообщения, при переходе в другой чат и после перезагрузки страницы. Скрипт замечает это раньше, чем вы нажмёте Enter, и возвращает переключатель в рабочее положение.

### Что делает скрипт

🔄 - **Отслеживает изменения страницы** через `MutationObserver`, поскольку ChatGPT работает как одностраничное приложение и переход между чатами не перезагружает вкладку. Дополнительно раз в 1200 мс проверяет, что режим всё ещё включён.<br>
🧠 - **Находит кнопку Reasoning** по нескольким признакам сразу: атрибуту `aria-pressed`, иконке мозга и подписи «Reasoning» более чем на двадцати языках интерфейса. Если в поле ввода такой кнопки нет, скрипт открывает меню «+» и проверяет пункт там.<br>
⚡ - **Перехватывает отправку сообщения**, если режим выключен: отменяет отправку, включает Reasoning и повторно отправляет текст через 180 мс. Ваш вопрос попадает в ChatGPT уже с включённым режимом размышления.<br>
🔒 - **Соблюдает приватность:** не делает сетевых запросов, не читает переписку и не запрашивает дополнительных разрешений. В манифесте указан `@grant none`.

### 📥 Установка

1. Установите менеджер пользовательских скриптов: [Tampermonkey](https://www.tampermonkey.net/) или Violentmonkey.
2. Откройте страницу скрипта на [GreasyFork](https://greasyfork.org/ru/scripts/604103-chatgpt-auto-reasoning) и нажмите **«Установить»**.
3. Перезагрузите вкладку ChatGPT.

**Проверить состояние скрипта** можно из консоли браузера:

```js
__autoReasoning.isOn()
```

После публикации обновления на GreasyFork скрипт автоматически загружает новую версию, поскольку в манифесте указан `@updateURL`.

### 🌐 Совместимость

| Параметр | Поддержка |
|:---------|:----------|
| Домены | `chatgpt.com`, `chat.openai.com` |
| Менеджеры скриптов | Tampermonkey, Violentmonkey |

Скрипт проверен на ChatGPT GO. На остальных тарифах он работает до тех пор, пока в интерфейсе доступен переключатель Reasoning. Если кнопки нет, скрипт ничего не делает.

### 📄 Лицензия

MIT. Проект не связан с OpenAI: скрипт взаимодействует только с теми элементами, которые уже присутствуют в интерфейсе ChatGPT.

</details>
