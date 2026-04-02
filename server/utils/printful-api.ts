import { config } from "../config";
import { logger } from "./logger";

export const TRUNK_PREFIX_COUNTRIES = new Set([
  'KR', 'JP', 'CN', 'TW', 'HK', 'TH', 'VN', 'PH', 'IN', 'ID', 'MY', 'SG',
  'GB', 'DE', 'FR', 'AU', 'IT', 'ES', 'NL', 'SE', 'BR', 'MX', 'RU', 'TR',
  'ZA', 'NZ', 'IE', 'PT', 'AT', 'CH', 'BE', 'DK', 'NO', 'FI', 'PL', 'CZ',
  'NG', 'EG', 'KE', 'GH', 'TZ', 'UG', 'ET', 'CM', 'CI', 'SN', 'MA', 'TN',
  'SA', 'AE', 'IL', 'JO', 'LB', 'IQ', 'PK', 'BD', 'LK', 'NP', 'MM',
  'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY',
  'HU', 'RO', 'BG', 'HR', 'RS', 'SK', 'SI', 'LT', 'LV', 'EE', 'GR',
]);

export function normalizePhoneForPrintful(rawPhone: string, countryCode: string): string {
  if (!rawPhone) return '';
  const parts = rawPhone.trim().split(/\s+/);
  if (parts.length < 2) return rawPhone.trim();

  const dialCode = parts[0];
  let localPart = parts.slice(1).join(' ');
  localPart = localPart.replace(/[-().]/g, ' ').replace(/\s+/g, ' ').trim();

  if (TRUNK_PREFIX_COUNTRIES.has(countryCode) && localPart.startsWith('0')) {
    localPart = localPart.substring(1).trim();
  }

  return `${dialCode} ${localPart}`;
}

export const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY || "";
export const PRINTFUL_BASE_URL = "https://api.printful.com";
export const STICKER_PRODUCT_ID = config.PRINTFUL.STICKER_PRODUCT_ID;

export const STICKER_VARIANT_MAP: Record<string, number> = {
  '3"×3"': 10163,
  '4"×4"': 10164,
  '5.5"×5.5"': 10165,
  '15"×3.75"': 16362,
};

export const STICKER_PRINTFILE_SIZE: Record<number, { width: number; height: number }> = {
  10163: { width: 900, height: 900 },
  10164: { width: 1200, height: 1200 },
  10165: { width: 1650, height: 1650 },
  16362: { width: 4500, height: 1125 },
};

function getPrintfulHeaders() {
  return {
    "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
    "X-PF-Store-Id": config.PRINTFUL.STORE_ID,
    "Content-Type": "application/json",
  };
}

export async function printfulRequest(method: string, path: string, body?: any) {
  const url = `${PRINTFUL_BASE_URL}${path}`;
  const options: RequestInit = { method, headers: getPrintfulHeaders() };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Printful API error: ${data.error?.message || data.message || JSON.stringify(data)}`);
  }
  return data;
}

export async function getPrintfulCatalogPrice(variantId: number): Promise<number | null> {
  if (!PRINTFUL_API_KEY) return null;
  try {
    const data = await printfulRequest("GET", `/products/${STICKER_PRODUCT_ID}`);
    const variants = data.result?.variants || [];
    const variant = variants.find((v: any) => v.id === variantId);
    if (variant?.price) return parseFloat(variant.price);
  } catch (err: any) {
    logger.error("Printful catalog price fetch failed:", err.message);
  }
  return null;
}

export async function getPrintfulProductCost(
  item: any,
  shippingAddress?: any,
): Promise<{ productCost: number; shippingCost: number; totalCost: number }> {
  if (!PRINTFUL_API_KEY) {
    const fallbackCost = item.basePrice || item.retailPrice * 0.6;
    return { productCost: fallbackCost, shippingCost: 4.99, totalCost: fallbackCost + 4.99 };
  }

  try {
    const firstSize = item.sizes?.[0] || '3"×3"';
    const variantId = STICKER_VARIANT_MAP[firstSize] || 10163;

    const estimatePayload: any = {
      items: [{ variant_id: variantId, quantity: 1, files: [{ url: item.imageUrl }] }],
    };

    if (shippingAddress) {
      estimatePayload.recipient = {
        address1: shippingAddress.address1,
        city: shippingAddress.city,
        country_code: shippingAddress.country_code,
        state_code: shippingAddress.state_code || undefined,
        zip: shippingAddress.zip,
      };
    }

    const data = await printfulRequest("POST", "/orders/estimate-costs", estimatePayload);
    const costs = data.result?.costs;
    logger.debug("[Printful estimate-costs] Full costs response:", JSON.stringify(costs));
    if (costs) {
      const productCost = parseFloat(costs.subtotal) || (item.basePrice || item.retailPrice * 0.6);
      const shippingCost = parseFloat(costs.shipping) || 4.99;
      const totalCost = parseFloat(costs.total) || (productCost + shippingCost);
      logger.info(`[Printful estimate-costs] productCost=${productCost}, shippingCost=${shippingCost}, totalCost(from API)=${totalCost}, manual total=${productCost + shippingCost}`);
      return { productCost, shippingCost, totalCost };
    }
  } catch (err: any) {
    logger.error("Printful cost estimate failed, using fallback:", err.message);
  }

  const fallbackCost = item.basePrice || item.retailPrice * 0.6;
  return { productCost: fallbackCost, shippingCost: 4.99, totalCost: fallbackCost + 4.99 };
}
