# Webhook Sender

A Chrome extension for managing and sending webhooks.

## Features

- Create and manage webhooks
- Support for multiple HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Custom request headers and request body
- Support for multiple content types
- Test webhook functionality

## TODO List

- Sync extension settings using Google account
- Support selecting webpage content with mouse as fields to send to webhook

## Usage

1. Click the extension icon in the Chrome toolbar to open the extension
2. Create a new webhook in the "Create Webhook" tab
3. Fill in the necessary information (name, URL, etc.)
4. Click the "Save" button to save the webhook
5. Manage and send webhooks in the "My Webhooks" tab

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

## Webhook Data Structure

Each webhook contains the following fields:

- `name`: Name of the webhook
- `url`: Target URL of the webhook
- `method`: HTTP method (GET, POST, PUT, DELETE, PATCH)
- `contentType`: Content type (JSON, Form URL Encoded, Text)
- `headers`: Request headers (in JSON format)
- `body`: Request body

## License

MIT 
