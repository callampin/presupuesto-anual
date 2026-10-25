import { _electron as electron, expect, test } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

test('abre la app empaquetada, carga la API y usa userData', async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'finanzas-e2e-'))

  const app = await electron.launch({
    args: ['.', '--no-sandbox', `--user-data-dir=${userDataDir}`],
    cwd: process.cwd(),
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    },
  })

  try {
    const page = await app.firstWindow()
    await expect(page).toHaveTitle(/Presupuesto Personal · v\d+\.\d+/)
    await expect(page.getByText('Plantilla Anual')).toBeVisible()

    const health = await page.evaluate(async () => {
      const response = await fetch('/api/health')
      return (await response.json()) as { status: string; path: string }
    })

    expect(health.status).toBe('ok')
    expect(path.resolve(health.path)).toContain(path.resolve(userDataDir))
    expect(fs.existsSync(path.join(userDataDir, 'finanzas.db'))).toBe(true)

    const bridgeType = await page.evaluate(() => typeof window.desktop?.saveBackup)
    expect(bridgeType).toBe('function')

    const brandLogo = page.locator('[data-brand-logo]')
    await expect(brandLogo).toBeVisible()
    expect(
      await brandLogo.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(0)
    expect(await page.evaluate(() => fetch('/favicon.png').then((response) => response.status))).toBe(200)

    const monthLabels = [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
    ]
    const currentMonthButton = page
      .locator('nav button')
      .filter({ has: page.locator('[data-current-month]') })
    await expect(currentMonthButton).toHaveCount(1)
    await expect(currentMonthButton).toHaveText(
      new RegExp(monthLabels[new Date().getMonth()]!, 'i'),
    )

    const scaleButton = page.getByRole('button', { name: /Tamaño de la interfaz/ })
    await expect(scaleButton).toHaveText(/100%/)
    await scaleButton.click()
    await page.getByRole('option', { name: '120%' }).click()
    await expect(scaleButton).toHaveText(/120%/)
    expect(
      await page.evaluate(() => document.documentElement.style.zoom),
    ).toBe('1.2')

    await page.reload()
    await expect(page.getByText('Plantilla Anual')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Tamaño de la interfaz/ }),
    ).toHaveText(/120%/)
    expect(
      await page.evaluate(() => document.documentElement.style.zoom),
    ).toBe('1.2')

    const versionBadge = page.locator('header span[title^="Versión"]')
    await expect(versionBadge).toBeVisible()
    await expect(versionBadge).toHaveText(/^v\d+\.\d+$/)

    await page.getByRole('button', { name: 'Catálogo y ajustes' }).click()
    await expect(page.getByRole('heading', { name: 'Catálogo y ajustes' })).toBeVisible()
    await expect(page.getByText('Acerca de')).toBeVisible()
    await expect(page.getByRole('link', { name: /Perfil de GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/callampin',
    )
    await expect(page.getByRole('link', { name: /Repositorio/ })).toHaveAttribute(
      'href',
      'https://github.com/callampin/presupuesto-anual',
    )
    await expect(
      page.getByRole('link', { name: /Buscar la última versión/ }),
    ).toHaveAttribute(
      'href',
      'https://github.com/callampin/presupuesto-anual/releases/latest',
    )
  } finally {
    await app.close()
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }
})
