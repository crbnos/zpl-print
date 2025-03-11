import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { z } from "zod";
import fetch from "node-fetch";
import 'dotenv/config';
import config from './config.js';

const CARBON_API_KEY = process.env.CARBON_API_KEY;

const app = new Hono();

const printRequestSchema = z
  .object({
    url: z.string().url().optional(),
    zpl: z.string().optional(),
    workCenterId: z.string().optional(),
  })
  .refine((data) => data.url || data.zpl, {
    message: "Either url or zpl must be provided",
  });

app.post("/print", async (c) => {
  const body = await c.req.json();
  console.log("Received print request:", body);

  const result = printRequestSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues }, 400);
  }

  let zplContent = result.data.zpl;
  
  // If URL is provided, download the ZPL content
  if (!zplContent && result.data.url) {
    // Check if URL contains 'carbon' and validate CARBON_API_KEY
    if (result.data.url.includes('carbon') && !CARBON_API_KEY) {
      return c.json({ error: "CARBON_API_KEY environment variable is required for Carbon API requests" }, 400);
    }

    try {
      const response = await fetch(result.data.url, {
        headers: {
          ...(CARBON_API_KEY && { "carbon-key": CARBON_API_KEY }),
        },
      });
      if (!response.ok) {
        return c.json({ error: `Failed to download ZPL from URL: ${response.statusText}` }, 500);
      }
      const responseText = await response.text();
      
      if (responseText.trim().startsWith('<!DOCTYPE')) {
        return c.json({ error: "Invalid ZPL content received: HTML response instead of ZPL. Make sure you have a valid Carbon API key" }, 500);
      }

      zplContent = responseText;
    } catch (error) {
      console.error("Error downloading ZPL:", error);
      return c.json({ error: "Failed to download ZPL from URL" }, 500);
    }
  }

  if(zplContent?.includes('^XA')) {
    let printer = config.printers[0];

    if(!printer) {
      return c.json({ error: "No printer found" }, 500);
    }

    if(result.data.workCenterId) {
      let workCenterSpecificPrinter = config.printers.find((p) => p.workCenters?.includes(result.data.workCenterId ?? ''));

      if(workCenterSpecificPrinter) {
        printer = workCenterSpecificPrinter;
      }
    }
    if(!printer) {
      return c.json({ error: "No printer found" }, 500);
    }

    const contentLength = zplContent.length;
    try {
      console.log(`Sending print job to ${printer.host}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(`http://${printer.host}/pstprnt`, {
          method: 'POST',
          headers: {
            'Content-Length': contentLength.toString(),
          },
          body: zplContent,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error(`Printer error: ${response.status} ${response.statusText}`);
          return c.json({ error: `Printer error: ${response.status} ${response.statusText}` }, 500);
        }
      } catch (fetchError: unknown) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error(`Print request timed out after 5 seconds`);
          return c.json({ error: "Print request timed out after 5 seconds" }, 500);
        }
        throw fetchError;
      } finally {
        clearTimeout(timeoutId);
      }
      console.log(`Print job sent successfully to ${printer.host}`);
    } catch (error) {
      console.error(`Error sending print job to ${printer.host}:`, error);
      return c.json({ error: `Failed to send print job: ${error}` }, 500);
    }


    return c.json({ 
      message: "Print request sent successfully", 
      data: { ...result.data, zplContent } 
    });
  } else {
    return c.json({ error: "Invalid ZPL content received" }, 400);
  }
});

app.get("/", (c) => {
  return c.text("POST to /print to print a label");
});

serve(
  {
    fetch: app.fetch,
    port: 4321,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
