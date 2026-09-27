/**
 * Deelafbeeldingen (1200 × 630) voor nieuwsberichten, zodat een gedeeld bericht op LinkedIn en
 * andere sociale media er meteen verzorgd uitziet: de titel in League Spartan op marineblauw, met
 * de omslagfoto achter een gordijn. Ze worden tijdens de build gemaakt door
 * src/pages/og/[...slug].jpg.ts.
 *
 * Satori zet de tekst om in vormen (met regelafbreking); sharp legt foto, gordijnen, tekst en logo
 * over elkaar en maakt er een JPEG van.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import type { ImageMetadata } from 'astro';
import satori from 'satori';
import sharp, { type OverlayOptions } from 'sharp';
import logoWhite from '@/assets/brand/logo-white.png';
import { formatDate, t } from '@/i18n/ui';
import type { Post } from '@/lib/content';
import { curtainPath, curtainViewBox } from '@/lib/curtain';

const WIDTH = 1200;
const HEIGHT = 630;
const NAVY = '#042d64';
const PADDING = 64;
/** Verhoog dit na een wijziging in het ontwerp, zodat LinkedIn de nieuwe afbeeldingen ophaalt. */
const DESIGN_VERSION = 1;

/** Het bronbestand van een afbeelding uit een contentcollectie of import. */
function sourcePath(image: ImageMetadata): string {
  const path = (image as ImageMetadata & { fsPath?: string }).fsPath;
  if (!path) throw new Error(`Bronbestand van afbeelding ${image.src} niet gevonden`);
  return path;
}

/**
 * Adres van de deelafbeelding van een bericht. Er zit een hash van de inhoud in, zodat een
 * gewijzigde titel of foto een nieuw adres krijgt en LinkedIn geen oude versie blijft tonen.
 */
export function shareImagePath(post: Post): string {
  const { title, date, cover } = post.entry.data;
  const hash = createHash('sha256')
    .update(
      JSON.stringify([
        DESIGN_VERSION,
        post.locale,
        title,
        date.toISOString(),
        cover && [relative(process.cwd(), sourcePath(cover)), cover.width, cover.height],
      ]),
    )
    .digest('hex')
    .slice(0, 10);
  return `/og${post.url.replace(/\/$/, '')}-${hash}.jpg`;
}

type Font = { name: string; data: Buffer; weight: 600 | 700; style: 'normal' };
let fonts: Promise<Font[]> | undefined;

/**
 * League Spartan als TTF. Satori leest geen WOFF2, en zijn WOFF-ondersteuning werkt niet met de
 * nieuwere fflate die package.json afdwingt (zie "overrides").
 */
function loadFonts(): Promise<Font[]> {
  const files = {
    600: '600SemiBold/LeagueSpartan_600SemiBold.ttf',
    700: '700Bold/LeagueSpartan_700Bold.ttf',
  };
  fonts ??= Promise.all(
    ([600, 700] as const).map(async (weight) => ({
      name: 'League Spartan',
      weight,
      style: 'normal' as const,
      data: await readFile(resolve('node_modules/@expo-google-fonts/league-spartan', files[weight])),
    })),
  );
  return fonts;
}

type Node = { type: string; props: { style: Record<string, unknown>; children?: unknown } };

function h(type: string, style: Record<string, unknown>, ...children: unknown[]): Node {
  return { type, props: { style, children: children.length === 1 ? children[0] : children } };
}

/** Lange titels krijgen een kleinere letter, zodat ze in het vlak passen. */
function titleSize(title: string, wide: boolean): number {
  const steps = wide ? [72, 64, 56, 48] : [66, 58, 50, 44];
  const index = [28, 48, 72].findIndex((max) => title.length <= max);
  return steps[index === -1 ? steps.length - 1 : index];
}

/** Gordijnen als SVG: `x` is de linkerrand, `side` bepaalt aan welke kant de rechte rand zit. */
function curtainsSvg(
  curtains: { x: number; width: number; side: 'left' | 'right'; color: string }[],
): Buffer {
  const shapes = curtains.map(({ x, width, side, color }) => {
    const scale = `scale(${width / curtainViewBox.width} ${HEIGHT / curtainViewBox.height})`;
    const mirror = side === 'right' ? ` transform="matrix(-1 0 0 1 ${curtainViewBox.width} 0)"` : '';
    return `<g transform="translate(${x} 0) ${scale}"><path fill="${color}" d="${curtainPath}"${mirror}/></g>`;
  });
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">${shapes.join('')}</svg>`,
  );
}

export async function renderShareImage(post: Post): Promise<Buffer> {
  const { title, date, cover } = post.entry.data;
  const wide = !cover;
  const logoHeight = 72;
  const logoWidth = Math.round((logoWhite.width / logoWhite.height) * logoHeight);
  const logoTop = HEIGHT - PADDING + 8 - logoHeight;

  // Met foto: tekst links, foto rechts tussen twee marineblauwe gordijnen.
  // Zonder foto: tekst in het midden tussen twee witte gordijnen, zoals op de 404-pagina.
  const photoLeft = 520;
  const curtainWidth = wide ? 150 : 96;
  const columnWidth = wide ? WIDTH - 2 * (curtainWidth + 70) : photoLeft - PADDING - 40;

  const text = h(
    'div',
    {
      display: 'flex',
      width: WIDTH,
      height: HEIGHT,
      padding: `${PADDING - 6}px ${wide ? curtainWidth + 70 : PADDING}px 0`,
      fontFamily: 'League Spartan',
      color: 'white',
    },
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        alignItems: wide ? 'center' : 'flex-start',
        width: columnWidth,
        height: logoTop - PADDING - 24,
        textAlign: wide ? 'center' : 'left',
      },
      h(
        'div',
        { fontSize: 22, fontWeight: 600, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.8 },
        t(post.locale, 'nav.nieuws'),
      ),
      h(
        'div',
        {
          display: 'block',
          marginTop: 20,
          fontSize: titleSize(title, wide),
          fontWeight: 700,
          lineHeight: 1.02,
          lineClamp: 5,
        },
        title,
      ),
      h('div', { marginTop: 24, fontSize: 24, fontWeight: 600, opacity: 0.8 }, formatDate(date, post.locale)),
    ),
  );
  const textSvg = await satori(text as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: await loadFonts(),
  });

  const layers: OverlayOptions[] = [];
  if (cover) {
    const photo = await sharp(await readFile(sourcePath(cover)))
      .resize(WIDTH - photoLeft, HEIGHT, { fit: 'cover', position: sharp.strategy.attention })
      .toBuffer();
    layers.push({ input: photo, left: photoLeft, top: 0 });
    layers.push({
      input: curtainsSvg([
        { x: photoLeft, width: curtainWidth, side: 'left', color: NAVY },
        { x: WIDTH - curtainWidth, width: curtainWidth, side: 'right', color: NAVY },
      ]),
      left: 0,
      top: 0,
    });
  } else {
    layers.push({
      input: curtainsSvg([
        { x: 0, width: curtainWidth, side: 'left', color: 'white' },
        { x: WIDTH - curtainWidth, width: curtainWidth, side: 'right', color: 'white' },
      ]),
      left: 0,
      top: 0,
    });
  }
  layers.push({ input: Buffer.from(textSvg), left: 0, top: 0 });
  layers.push({
    input: await sharp(await readFile(sourcePath(logoWhite)))
      .resize({ height: logoHeight })
      .toBuffer(),
    left: wide ? Math.round((WIDTH - logoWidth) / 2) : PADDING,
    top: logoTop,
  });

  return sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: NAVY } })
    .composite(layers)
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}
