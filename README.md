# Request Sender

A Chrome extension for managing and sending HTTP requests.

[中文文档](./README_zh.md)

## Features

- Create and manage HTTP requests
- Support for multiple HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Custom request headers and request body
- Support for multiple content types (JSON, Form URL Encoded, Text)
- Dynamic fields in requests with placeholders
- Request history and logs
- Multi-language support (English, Chinese)

## Usage

1. Click the extension icon in the Chrome toolbar to open the extension
2. Create a new request in the "Create Request" tab:
   - Give your request a name
   - Enter the target URL
   - Select the HTTP method
   - Add custom headers if needed
   - Configure the request body for POST/PUT/PATCH methods
   - Add dynamic fields with `{{field_name}}` syntax if needed
3. Click the "Save" button to save your request
4. Manage and send requests from the "My Requests" tab
5. View request history and results in the "Logs" tab

## Dynamic Fields

You can create requests with dynamic fields that are filled in at runtime:

1. Use the syntax `{{field_name}}` in your URL, headers, or body
2. When sending the request, you'll be prompted to fill in these fields
3. This allows you to reuse the same request with different parameters

## Context Menu Integration

Right-click on any text in a webpage to:
- Send the selected text to an existing request
- Create a new request with the selected text

## Development

To develop this extension locally:

1. Clone the repository
2. Open Chrome browser, go to the extensions management page (`chrome://extensions`)
3. Enable developer mode
4. Click "Load unpacked extension" and select the project folder

## Installation

1. Download the latest version of the extension
2. Open Chrome browser, go to the extensions management page (`chrome://extensions`)
3. Enable developer mode
4. Click "Load unpacked extension" and select the project folder

## Project Structure

- `manifest.json`: Extension configuration
- `popup.html`: Main extension UI
- `background.js`: Background service worker
- `js/main.js`: Main application entry point
- `js/modules/`: Modular JavaScript components
  - `request.js`: Request operations
  - `requestForm.js`: Form handling
  - `ui.js`: UI interactions
  - `logs.js`: Logging functionality
  - `i18n.js`: Internationalization
- `_locales/`: Language files
  - `en/`: English translations
  - `zh_CN/`: Chinese translations
- `css/`: Stylesheets
- `icons/`: Extension icons

## Request Data Structure

Each request contains the following fields:

- `name`: Name of the request
- `url`: Target URL of the request
- `method`: HTTP method (GET, POST, PUT, DELETE, PATCH)
- `contentType`: Content type (JSON, Form URL Encoded, Text)
- `headers`: Request headers (in JSON format)
- `body`: Request body

## TODO List

- Sync extension settings using Google account
- Add more content types and authentication methods
- Export/import request collections
