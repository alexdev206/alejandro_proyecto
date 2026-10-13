import os from 'os';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { CAMPOS_PAI, PRESETS_PAI, OPCIONES_ADRES } from '../data/paiCatalog.ts';

export { CAMPOS_PAI, PRESETS_PAI, OPCIONES_ADRES };

export const PUERTO_CHROME = 9222;

export function buscarChrome(): string | null {
  // 1. Variable de entorno personalizada si el usuario la definió
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const osType = process.platform;
  if (osType === 'win32') {
    const candidates = [
      // Google Chrome
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google\\Chrome\\Application\\chrome.exe'),
      // Microsoft Edge (Chromium nativo preinstalado en Windows 10/11)
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
      // Brave Browser
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
    ];
    for (const c of candidates) {
      if (c && fs.existsSync(c)) return c;
    }
  } else if (osType === 'darwin') {
    const candidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      path.join(os.homedir(), 'Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'),
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
    for (const c of candidates) {
      if (c && fs.existsSync(c)) return c;
    }
  } else {
    // Linux
    const candidates = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable',
      '/usr/bin/brave-browser',
      '/usr/bin/chrome',
    ];
    for (const c of candidates) {
      if (c && fs.existsSync(c)) return c;
    }
  }
  return null;
}

export async function chromeDebugActivo(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`http://127.0.0.1:${PUERTO_CHROME}/json/version`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch (_e) {
    return false;
  }
}

export async function lanzarChromeDebug(): Promise<{ success: boolean; mensaje?: string; error?: string }> {
  if (await chromeDebugActivo()) {
    return { success: true, mensaje: 'Chrome ya está activo en modo depuración.' };
  }

  const chromePath = buscarChrome();
  if (!chromePath) {
    return {
      success: false,
      error: 'No se encontró el ejecutable de Google Chrome en las rutas estándar del sistema. Inicia Chrome con: chrome --remote-debugging-port=9222 --user-data-dir=~/.pai_perfil_chrome'
    };
  }

  const perfilDir = path.join(os.homedir(), '.pai_perfil_chrome');
  if (!fs.existsSync(perfilDir)) {
    try {
      fs.mkdirSync(perfilDir, { recursive: true });
    } catch (_e) {}
  }

  const args = [
    `--remote-debugging-port=${PUERTO_CHROME}`,
    `--user-data-dir=${perfilDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://appb.saludcapital.gov.co/pai/inicio/login.aspx'
  ];

  try {
    const child = spawn(chromePath, args, {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    // Esperar hasta que responda el puerto
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (await chromeDebugActivo()) {
        return { success: true, mensaje: 'Chrome iniciado en puerto 9222.' };
      }
    }
    return { success: true, mensaje: 'Chrome lanzado en segundo plano.' };
  } catch (err: any) {
    return { success: false, error: `Error al lanzar Chrome: ${err.message}` };
  }
}

export async function conectarPuppeteer(): Promise<Browser> {
  return await puppeteer.connect({
    browserURL: `http://127.0.0.1:${PUERTO_CHROME}`,
    defaultViewport: null,
  });
}

export async function esperarPaginaLista(page: Page, timeoutMs = 25000): Promise<void> {
  await page.waitForFunction(() => {
    const docReady = document.readyState === 'complete';
    const prm = (window as any).Sys?.WebForms?.PageRequestManager?.getInstance();
    const notInPostBack = !prm || !prm.get_isInAsyncPostBack();
    return docReady && notInPostBack;
  }, { timeout: timeoutMs });
}

export async function accionYEsperarRecarga(page: Page, accion: () => Promise<void>, timeoutMs = 25000): Promise<void> {
  await accion();
  await new Promise(r => setTimeout(r, 400));
  await esperarPaginaLista(page, timeoutMs);
}

export async function esperarValor(page: Page, selector: string, timeoutMs = 15000): Promise<string> {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel) as HTMLInputElement | HTMLSelectElement | HTMLElement;
      if (!el) return false;
      const val = (el as HTMLInputElement).value || el.innerText || '';
      return val.trim().length > 0;
    },
    { timeout: timeoutMs },
    selector
  );
  return await leerValor(page, selector);
}

export async function leerValor(page: Page, selector: string): Promise<string> {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLInputElement | HTMLSelectElement | HTMLElement;
    if (!el) return '';
    return ((el as HTMLInputElement).value || el.innerText || '').trim();
  }, selector);
}

export async function leerSelect(page: Page, selector: string): Promise<string> {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLSelectElement;
    if (!el || el.selectedIndex === -1) return '';
    const opt = el.options[el.selectedIndex];
    return (opt?.text || opt?.value || '').trim();
  }, selector);
}
