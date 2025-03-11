# ZPL Print Server

A simple web server built with Hono.js that handles ZPL print requests.

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Start the server:

   ```
   npm start
   ```

   For development with auto-restart:

   ```
   npm run dev
   ```

3. Expose via ngrok

  ```
  ngrok http 4321
  ```

## API Endpoints

### `POST /print`

Accepts a print request with ZPL callback URL and optional work center ID.

**Request Body:**

```json
{
  "url": "https://example.com/zpl-data",
  "workCenterId": "WC123" // Optional
}
```

You can also send raw ZPL:

```json
{
  "zpl": "^XA^FX Top section with logo, name and address.^CF0,60^FO50,50^GB100,100,100^FS^FO75,75^FR^GB100,100,100^FS^FO93,93^GB40,40,40^FS^FO220,50^FDIntershipping, Inc.^FS^CF0,30^FO220,115^FD1000 Shipping Lane^FS^FO220,155^FDShelbyville TN 38102^FS^FO220,195^FDUnited States (USA)^FS^FO50,250^GB700,3,3^FS^XZ"
}
```

## Example Usage

Using curl:

```bash
curl -X POST http://localhost:4321/print \
  -H "Content-Type: application/json" \
  -d '{"url": "https://localhost:3000/file/receipt/cv7ms3i2i0l4uedgh390/labels.zpl", "workCenterId": "1"}'
````
