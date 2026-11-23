import * as THREE from 'three';
import { PROJECT_CONTENT_BY_ID } from '../../data/projectContentData';
import type {
  LivingBookId,
  ProjectBookPage,
  ProjectContentRecord,
} from '../../types/universe';

const _camForward = new THREE.Vector3();
const _camUp = new THREE.Vector3();
const _targetWorldPos = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();
const _tiltQuat = new THREE.Quaternion();
const _eulerTilt = new THREE.Euler(-0.18, 0, 0);

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

/**
 * Draws either a lazily loaded real Garad Foundation photograph OR an honest,
 * clean archival "Photograph awaiting upload" frame — never generating fake documentary photos.
 */
function drawArchivalPhotoSlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  caption: string,
  placeholderLabel: string,
  accentHex: string,
  loadedImage: HTMLImageElement | null,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.clip();

  if (loadedImage && loadedImage.complete && loadedImage.naturalWidth > 0) {
    // Cover-crop actual verified Garad Foundation photograph cleanly
    const imgRatio = loadedImage.naturalWidth / loadedImage.naturalHeight;
    const boxRatio = w / h;
    let drawW = w;
    let drawH = h;
    let drawX = x;
    let drawY = y;
    if (imgRatio > boxRatio) {
      drawW = h * imgRatio;
      drawX = x - (drawW - w) * 0.5;
    } else {
      drawH = w / imgRatio;
      drawY = y - (drawH - h) * 0.5;
    }
    ctx.drawImage(loadedImage, drawX, drawY, drawW, drawH);

    // Crisp caption footer band
    ctx.fillStyle = 'rgba(24, 33, 44, 0.78)';
    ctx.fillRect(x, y + h - 28, w, 28);
    ctx.fillStyle = accentHex;
    ctx.fillRect(x, y + h - 28, 4, 28);
    ctx.fillStyle = '#FFF8E8';
    ctx.font = 'bold 11.5px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(caption, x + 12, y + h - 10, w - 22);
  } else {
    // Clean, honest archival placeholder — NO invented documentary scenes or fake children
    ctx.fillStyle = '#F2E7D2';
    ctx.fillRect(x, y, w, h);

    // Subtle archival photo corner brackets
    ctx.strokeStyle = 'rgba(116, 86, 56, 0.45)';
    ctx.lineWidth = 2;
    const m = 14;
    const b = 18;
    ctx.beginPath();
    // Top-left
    ctx.moveTo(x + m, y + m + b);
    ctx.lineTo(x + m, y + m);
    ctx.lineTo(x + m + b, y + m);
    // Top-right
    ctx.moveTo(x + w - m - b, y + m);
    ctx.lineTo(x + w - m, y + m);
    ctx.lineTo(x + w - m, y + m + b);
    // Bottom-left
    ctx.moveTo(x + m, y + h - 34 - b);
    ctx.lineTo(x + m, y + h - 34);
    ctx.lineTo(x + m + b, y + h - 34);
    // Bottom-right
    ctx.moveTo(x + w - m - b, y + h - 34);
    ctx.lineTo(x + w - m, y + h - 34);
    ctx.lineTo(x + w - m, y + h - 34 - b);
    ctx.stroke();

    // Minimal camera-frame outline emblem
    const cx = x + w * 0.5;
    const cy = y + (h - 28) * 0.46;
    ctx.strokeStyle = 'rgba(110, 82, 54, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 24, cy - 16, 48, 32);
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.stroke();

    // Clear honest status label
    ctx.fillStyle = '#523C28';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(placeholderLabel, cx, cy + 36);

    // Footer caption band
    ctx.fillStyle = 'rgba(42, 34, 26, 0.84)';
    ctx.fillRect(x, y + h - 28, w, 28);
    ctx.fillStyle = accentHex;
    ctx.fillRect(x, y + h - 28, 4, 28);
    ctx.fillStyle = '#FFF6E4';
    ctx.font = 'bold 11.5px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(caption, x + 12, y + h - 10, w - 22);
  }

  ctx.restore();

  ctx.strokeStyle = 'rgba(120, 86, 52, 0.36)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.stroke();
}

function renderBookPageCanvas(
  canvas: HTMLCanvasElement,
  page: ProjectBookPage,
  book: ProjectContentRecord,
  side: 'left' | 'right',
  imageCache: Map<string, HTMLImageElement>,
): void {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;

  // Warm cream archival paper with soft inner-gutter shadow
  ctx.fillStyle = '#FCF5E5';
  ctx.fillRect(0, 0, w, h);

  const gutterGrad =
    side === 'left'
      ? ctx.createLinearGradient(w - 48, 0, w, 0)
      : ctx.createLinearGradient(0, 0, 48, 0);
  if (side === 'left') {
    gutterGrad.addColorStop(0, 'rgba(92, 62, 34, 0)');
    gutterGrad.addColorStop(1, 'rgba(72, 46, 22, 0.22)');
  } else {
    gutterGrad.addColorStop(0, 'rgba(72, 46, 22, 0.22)');
    gutterGrad.addColorStop(1, 'rgba(92, 62, 34, 0)');
  }
  ctx.fillStyle = gutterGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle decorative hairline border
  ctx.strokeStyle = 'rgba(138, 102, 64, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  const padX = 36;
  const contentW = w - padX * 2;

  if (page.kind === 'cover') {
    // Dedicated rich inner-cover title plate layout
    ctx.fillStyle = book.coverColor;
    ctx.beginPath();
    ctx.roundRect(padX, 42, contentW, 210, 12);
    ctx.fill();

    ctx.strokeStyle = book.accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(padX + 10, 52, contentW - 20, 190, 8);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = book.accentColor;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(page.kicker, w * 0.5, 86);

    ctx.fillStyle = '#FFF9EE';
    ctx.font = 'bold 31px Georgia, serif';
    const titleLines = wrapTextLines(ctx, page.title, contentW - 44, 2);
    titleLines.forEach((line, idx) => {
      ctx.fillText(line, w * 0.5, 134 + idx * 36);
    });

    if (page.dateLocation) {
      ctx.fillStyle = '#F7E7C8';
      ctx.font = 'italic 14px sans-serif';
      const subLines = wrapTextLines(ctx, page.dateLocation, contentW - 44, 2);
      subLines.forEach((line, idx) => {
        ctx.fillText(line, w * 0.5, 204 + idx * 18);
      });
    }

    // Overview sentence
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2B3642';
    ctx.font = '16px Georgia, serif';
    let cursorY = 290;
    for (const para of page.bodyParagraphs) {
      const lines = wrapTextLines(ctx, para, contentW, 4);
      for (const line of lines) {
        ctx.fillText(line, padX, cursorY);
        cursorY += 23;
      }
      cursorY += 8;
    }

    // Key documented highlights
    if (page.highlights && page.highlights.length > 0) {
      cursorY += 6;
      for (const hl of page.highlights.slice(0, 4)) {
        ctx.fillStyle = 'rgba(229, 198, 146, 0.28)';
        ctx.beginPath();
        ctx.roundRect(padX, cursorY - 16, contentW, 30, 6);
        ctx.fill();
        ctx.fillStyle = book.accentColor;
        ctx.fillRect(padX, cursorY - 16, 4, 30);

        ctx.fillStyle = '#25313D';
        ctx.font = 'bold 13.5px sans-serif';
        ctx.fillText(hl, padX + 14, cursorY + 3, contentW - 24);
        cursorY += 38;
      }
    }
  } else {
    // Crisp Content Page layout
    ctx.fillStyle = book.coverColor;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(page.kicker, padX, 50);

    ctx.fillStyle = book.accentColor;
    ctx.fillRect(padX, 60, 56, 3);

    ctx.fillStyle = '#1E2D3D';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText(page.title, padX, 96, contentW);

    let cursorY = 120;
    if (page.dateLocation) {
      ctx.fillStyle = '#6B5642';
      ctx.font = 'italic 13px sans-serif';
      const dateLines = wrapTextLines(ctx, page.dateLocation, contentW, 2);
      dateLines.forEach((line) => {
        ctx.fillText(line, padX, cursorY);
        cursorY += 17;
      });
      cursorY += 8;
    }

    // Optional real photo OR honest archival "Photograph awaiting upload" slot
    if (page.photo) {
      const frameH = 164;
      const loadedImg = page.photo.imageUrl ? (imageCache.get(page.photo.imageUrl) ?? null) : null;
      drawArchivalPhotoSlot(
        ctx,
        padX,
        cursorY,
        contentW,
        frameH,
        page.photo.caption,
        page.photo.placeholderLabel,
        book.accentColor,
        loadedImg,
      );
      cursorY += frameH + 24;
    }

    // Short readable body paragraphs
    ctx.fillStyle = '#2B3642';
    ctx.font = '15.5px Georgia, serif';
    for (const para of page.bodyParagraphs) {
      const lines = wrapTextLines(ctx, para, contentW, 5);
      for (const line of lines) {
        if (cursorY > h - 140) break;
        ctx.fillText(line, padX, cursorY);
        cursorY += 22;
      }
      cursorY += 8;
    }

    // Optional highlights bullets
    if (page.highlights && page.highlights.length > 0 && cursorY < h - 140) {
      for (const hl of page.highlights) {
        if (cursorY > h - 125) break;
        ctx.fillStyle = book.coverColor;
        ctx.font = 'bold 13.5px sans-serif';
        ctx.fillText(`• ${hl}`, padX + 4, cursorY, contentW - 8);
        cursorY += 21;
      }
    }
  }

  // Verification status box pinned cleanly above footer
  if (page.verificationNote) {
    const boxH = 52;
    const boxY = h - 104;
    ctx.fillStyle = 'rgba(229, 198, 146, 0.24)';
    ctx.beginPath();
    ctx.roundRect(padX, boxY, contentW, boxH, 7);
    ctx.fill();
    ctx.fillStyle = book.accentColor;
    ctx.fillRect(padX, boxY + 5, 4, boxH - 10);

    ctx.fillStyle = '#5B4530';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    const noteLines = wrapTextLines(ctx, page.verificationNote, contentW - 22, 2);
    noteLines.forEach((line, idx) => {
      ctx.fillText(line, padX + 13, boxY + 21 + idx * 16);
    });
  }

  // Page footer & page number
  ctx.fillStyle = '#8A735C';
  ctx.font = '12px sans-serif';
  ctx.textAlign = side === 'left' ? 'left' : 'right';
  ctx.fillText(
    side === 'left'
      ? `Page ${page.pageNumber}  ·  ${book.title}`
      : `${book.bookNumber}  ·  Page ${page.pageNumber}`,
    side === 'left' ? padX : w - padX,
    h - 32,
  );
}

/**
 * Interactive 3D Living Book System (Reused & Upgraded for Milestone 5).
 *
 * Displays any of the 5 physical Garad Foundation Project Books smoothly anchored
 * in front of the camera with crisp CanvasTexture spreads, lazy photograph loading,
 * honest "Photograph awaiting upload" slots, and real 3D animated page turning.
 */
export class LivingBook3D {
  public readonly group = new THREE.Group();

  private readonly bookPivot = new THREE.Group();
  private readonly coverMat: THREE.MeshStandardMaterial;
  private readonly leftPageMat: THREE.MeshStandardMaterial;
  private readonly rightPageMat: THREE.MeshStandardMaterial;
  private readonly turnLeafPivot = new THREE.Group();
  private readonly turnLeafFrontMat: THREE.MeshStandardMaterial;
  private readonly turnLeafBackMat: THREE.MeshStandardMaterial;
  private readonly bookLight: THREE.PointLight;

  private readonly leftCanvas: HTMLCanvasElement;
  private readonly rightCanvas: HTMLCanvasElement;
  private readonly turnFrontCanvas: HTMLCanvasElement;
  private readonly turnBackCanvas: HTMLCanvasElement;
  private readonly leftTex: THREE.CanvasTexture;
  private readonly rightTex: THREE.CanvasTexture;
  private readonly turnFrontTex: THREE.CanvasTexture;
  private readonly turnBackTex: THREE.CanvasTexture;

  private readonly imageCache = new Map<string, HTMLImageElement>();
  private readonly disposables: Array<{ dispose: () => void }> = [];

  private currentBook: ProjectContentRecord | null = null;
  private spreadIndex = 0;
  private openAmount = 0;
  private isOpen = false;

  // 3D Page turn animation state
  private turning = false;
  private turnDirection: -1 | 1 = 1;
  private turnProgress = 0;
  private pendingSpreadIndex = 0;

  constructor(maxAnisotropy: number) {
    this.group.name = 'LivingBook3DViewer';
    this.group.visible = false;
    this.group.add(this.bookPivot);

    const track = <T extends { dispose: () => void }>(item: T): T => {
      this.disposables.push(item);
      return item;
    };

    const makeCanvas = () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 640;
      return c;
    };
    const makeTex = (c: HTMLCanvasElement) => {
      const t = track(new THREE.CanvasTexture(c));
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(maxAnisotropy, 8);
      return t;
    };

    this.leftCanvas = makeCanvas();
    this.rightCanvas = makeCanvas();
    this.turnFrontCanvas = makeCanvas();
    this.turnBackCanvas = makeCanvas();

    this.leftTex = makeTex(this.leftCanvas);
    this.rightTex = makeTex(this.rightCanvas);
    this.turnFrontTex = makeTex(this.turnFrontCanvas);
    this.turnBackTex = makeTex(this.turnBackCanvas);

    const pageW = 0.39;
    const pageH = 0.49;

    this.coverMat = track(
      new THREE.MeshStandardMaterial({
        color: '#1E5E84',
        roughness: 0.62,
        metalness: 0.08,
      }),
    );
    const pageEdgeMat = track(
      new THREE.MeshStandardMaterial({
        color: '#EBD9B7',
        roughness: 0.88,
      }),
    );
    const spineTrimMat = track(
      new THREE.MeshStandardMaterial({
        color: '#E5A942',
        roughness: 0.42,
        metalness: 0.25,
      }),
    );

    this.leftPageMat = track(
      new THREE.MeshStandardMaterial({
        map: this.leftTex,
        roughness: 0.84,
        metalness: 0.0,
      }),
    );
    this.rightPageMat = track(
      new THREE.MeshStandardMaterial({
        map: this.rightTex,
        roughness: 0.84,
        metalness: 0.0,
      }),
    );
    this.turnLeafFrontMat = track(
      new THREE.MeshStandardMaterial({
        map: this.turnFrontTex,
        roughness: 0.84,
      }),
    );
    this.turnLeafBackMat = track(
      new THREE.MeshStandardMaterial({
        map: this.turnBackTex,
        roughness: 0.84,
      }),
    );

    const spine = new THREE.Mesh(
      track(
        new THREE.CylinderGeometry(0.022, 0.022, pageH + 0.036, 12, 1, false, Math.PI, Math.PI),
      ),
      this.coverMat,
    );
    spine.position.set(0, 0, -0.024);
    this.bookPivot.add(spine);

    const goldBand = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.012, pageH + 0.01, 0.008)),
      spineTrimMat,
    );
    goldBand.position.set(0, 0, 0.006);
    this.bookPivot.add(goldBand);

    const leftWing = new THREE.Group();
    leftWing.rotation.y = 0.14;
    this.bookPivot.add(leftWing);

    const leftCover = new THREE.Mesh(
      track(new THREE.BoxGeometry(pageW + 0.028, pageH + 0.032, 0.014)),
      this.coverMat,
    );
    leftCover.position.set(-(pageW * 0.5 + 0.012), 0, -0.024);
    leftWing.add(leftCover);

    const leftBlock = new THREE.Mesh(
      track(new THREE.BoxGeometry(pageW, pageH, 0.022)),
      pageEdgeMat,
    );
    leftBlock.position.set(-pageW * 0.5 - 0.004, 0, -0.006);
    leftWing.add(leftBlock);

    const leftPageMesh = new THREE.Mesh(
      track(new THREE.PlaneGeometry(pageW, pageH)),
      this.leftPageMat,
    );
    leftPageMesh.position.set(-pageW * 0.5 - 0.004, 0, 0.006);
    leftWing.add(leftPageMesh);

    const rightWing = new THREE.Group();
    rightWing.rotation.y = -0.14;
    this.bookPivot.add(rightWing);

    const rightCover = new THREE.Mesh(
      track(new THREE.BoxGeometry(pageW + 0.028, pageH + 0.032, 0.014)),
      this.coverMat,
    );
    rightCover.position.set(pageW * 0.5 + 0.012, 0, -0.024);
    rightWing.add(rightCover);

    const rightBlock = new THREE.Mesh(
      track(new THREE.BoxGeometry(pageW, pageH, 0.022)),
      pageEdgeMat,
    );
    rightBlock.position.set(pageW * 0.5 + 0.004, 0, -0.006);
    rightWing.add(rightBlock);

    const rightPageMesh = new THREE.Mesh(
      track(new THREE.PlaneGeometry(pageW, pageH)),
      this.rightPageMat,
    );
    rightPageMesh.position.set(pageW * 0.5 + 0.004, 0, 0.006);
    rightWing.add(rightPageMesh);

    this.turnLeafPivot.position.set(0, 0, 0.011);
    this.turnLeafPivot.visible = false;
    this.bookPivot.add(this.turnLeafPivot);

    const leafFront = new THREE.Mesh(
      track(new THREE.PlaneGeometry(pageW, pageH)),
      this.turnLeafFrontMat,
    );
    leafFront.position.set(pageW * 0.5 + 0.004, 0, 0.001);
    this.turnLeafPivot.add(leafFront);

    const leafBack = new THREE.Mesh(
      track(new THREE.PlaneGeometry(pageW, pageH)),
      this.turnLeafBackMat,
    );
    leafBack.position.set(pageW * 0.5 + 0.004, 0, -0.001);
    leafBack.rotation.y = Math.PI;
    this.turnLeafPivot.add(leafBack);

    // Warm local reading fill light (non-shadow-casting) so book is crisp in Day/Sunset/Night
    this.bookLight = new THREE.PointLight('#FFF5DE', 1.4, 3.2, 1.5);
    this.bookLight.position.set(0, 0.25, 0.65);
    this.bookPivot.add(this.bookLight);
  }

  private getTotalSpreads(book: ProjectContentRecord): number {
    return Math.ceil(book.pages.length / 2);
  }

  private getSpreadPages(
    book: ProjectContentRecord,
    idx: number,
  ): { leftPage: ProjectBookPage; rightPage: ProjectBookPage } | null {
    const leftPage = book.pages[idx * 2];
    const rightPage = book.pages[idx * 2 + 1] ?? leftPage;
    if (!leftPage) return null;
    return { leftPage, rightPage };
  }

  /**
   * Lazily loads any populated real photograph URLs only when a book is opened.
   */
  private lazyLoadBookPhotos(book: ProjectContentRecord): void {
    for (const page of book.pages) {
      const url = page.photo?.imageUrl;
      if (!url || this.imageCache.has(url)) continue;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (this.currentBook && this.currentBook.id === book.id && !this.turning) {
          this.renderSpread(this.currentBook, this.spreadIndex);
        }
      };
      img.src = url;
      this.imageCache.set(url, img);
    }
  }

  public openBook(bookId: LivingBookId): void {
    const book = PROJECT_CONTENT_BY_ID[bookId];
    if (!book) return;
    this.currentBook = book;
    this.spreadIndex = 0;
    this.pendingSpreadIndex = 0;
    this.turning = false;
    this.turnLeafPivot.visible = false;
    this.coverMat.color.set(book.coverColor);

    this.lazyLoadBookPhotos(book);
    this.renderSpread(book, 0);
    this.isOpen = true;
    this.group.visible = true;
  }

  public closeBook(): void {
    this.isOpen = false;
    this.turning = false;
    this.turnLeafPivot.visible = false;
  }

  public isBookOpen(): boolean {
    return this.isOpen;
  }

  public getOpenBookId(): LivingBookId | null {
    return this.isOpen && this.currentBook ? this.currentBook.id : null;
  }

  public getSpreadInfo(): { index: number; total: number } {
    return {
      index: this.turning ? this.pendingSpreadIndex : this.spreadIndex,
      total: this.currentBook ? this.getTotalSpreads(this.currentBook) : 0,
    };
  }

  public turnPage(direction: -1 | 1): boolean {
    if (!this.isOpen || !this.currentBook || this.turning) return false;
    const total = this.getTotalSpreads(this.currentBook);
    const nextIdx = this.spreadIndex + direction;
    if (nextIdx < 0 || nextIdx >= total) return false;

    const book = this.currentBook;
    const currentSpread = this.getSpreadPages(book, this.spreadIndex);
    const nextSpread = this.getSpreadPages(book, nextIdx);
    if (!currentSpread || !nextSpread) return false;

    if (direction === 1) {
      renderBookPageCanvas(
        this.turnFrontCanvas,
        currentSpread.rightPage,
        book,
        'right',
        this.imageCache,
      );
      renderBookPageCanvas(
        this.turnBackCanvas,
        nextSpread.leftPage,
        book,
        'left',
        this.imageCache,
      );
      renderBookPageCanvas(
        this.rightCanvas,
        nextSpread.rightPage,
        book,
        'right',
        this.imageCache,
      );
      this.rightTex.needsUpdate = true;
    } else {
      renderBookPageCanvas(
        this.turnFrontCanvas,
        nextSpread.rightPage,
        book,
        'right',
        this.imageCache,
      );
      renderBookPageCanvas(
        this.turnBackCanvas,
        currentSpread.leftPage,
        book,
        'left',
        this.imageCache,
      );
      renderBookPageCanvas(
        this.leftCanvas,
        nextSpread.leftPage,
        book,
        'left',
        this.imageCache,
      );
      this.leftTex.needsUpdate = true;
    }

    this.turnFrontTex.needsUpdate = true;
    this.turnBackTex.needsUpdate = true;

    this.turning = true;
    this.turnDirection = direction;
    this.turnProgress = 0;
    this.pendingSpreadIndex = nextIdx;
    this.turnLeafPivot.visible = true;
    return true;
  }

  private renderSpread(book: ProjectContentRecord, idx: number): void {
    const spread = this.getSpreadPages(book, idx);
    if (!spread) return;
    renderBookPageCanvas(this.leftCanvas, spread.leftPage, book, 'left', this.imageCache);
    renderBookPageCanvas(this.rightCanvas, spread.rightPage, book, 'right', this.imageCache);
    this.leftTex.needsUpdate = true;
    this.rightTex.needsUpdate = true;
  }

  public update(delta: number, elapsed: number, camera: THREE.PerspectiveCamera): void {
    const dt = Math.min(delta, 0.05);
    const targetOpen = this.isOpen ? 1 : 0;
    this.openAmount = THREE.MathUtils.damp(this.openAmount, targetOpen, 9.5, dt);

    if (this.openAmount < 0.01 && !this.isOpen) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    camera.getWorldDirection(_camForward);
    _camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);

    const aspect = camera.aspect || 1.6;
    const dist = aspect < 1.0 ? 1.18 : 0.86;
    const yOffset = aspect < 1.0 ? 0.03 : 0.025;

    _targetWorldPos
      .copy(camera.position)
      .addScaledVector(_camForward, dist)
      .addScaledVector(_camUp, yOffset);

    this.group.position.copy(_targetWorldPos);
    _targetQuat.copy(camera.quaternion);
    _tiltQuat.setFromEuler(_eulerTilt);
    this.group.quaternion.copy(_targetQuat).multiply(_tiltQuat);

    const s = 0.45 + 0.55 * this.openAmount;
    this.bookPivot.scale.setScalar(s);
    this.bookPivot.position.y = Math.sin(elapsed * 2.1) * 0.008 * this.openAmount;
    this.bookLight.intensity = 1.55 * this.openAmount;

    if (this.turning && this.currentBook) {
      this.turnProgress = Math.min(1, this.turnProgress + dt * 2.25);
      const eased =
        this.turnProgress < 0.5
          ? 2 * this.turnProgress * this.turnProgress
          : 1 - Math.pow(-2 * this.turnProgress + 2, 2) / 2;

      const startAngle = this.turnDirection === 1 ? -0.14 : -Math.PI + 0.14;
      const endAngle = this.turnDirection === 1 ? -Math.PI + 0.14 : -0.14;
      this.turnLeafPivot.rotation.y = THREE.MathUtils.lerp(startAngle, endAngle, eased);

      if (this.turnProgress >= 1) {
        this.turning = false;
        this.spreadIndex = this.pendingSpreadIndex;
        this.turnLeafPivot.visible = false;
        this.renderSpread(this.currentBook, this.spreadIndex);
      }
    }
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
