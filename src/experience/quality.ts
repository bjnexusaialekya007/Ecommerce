export interface QualityTier {
  dpr: number;
  isTouch: boolean;
  isSoftwareGl: boolean;
  tier: 'high' | 'low' | 'fallback';
}

export function detectSoftwareGl(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  try {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (!dbg) return false;
    const renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
    return /(SwiftShader|llvmpipe|Software|Mesa OffScreen)/i.test(renderer);
  } catch {
    return false;
  }
}

export function getInitialQuality(gl: WebGL2RenderingContext): QualityTier {
  const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const maxDpr = isTouch ? 1.5 : 2;
  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, maxDpr);
  const isSoftwareGl = detectSoftwareGl(gl);
  return {
    dpr: isSoftwareGl ? 1 : dpr,
    isTouch: Boolean(isTouch),
    isSoftwareGl,
    tier: isSoftwareGl ? 'low' : 'high',
  };
}

export class FrameBudgetMonitor {
  private samples: number[] = [];
  private downgraded = false;

  recordFrame(ms: number): 'ok' | 'downgrade' | 'abort' {
    this.samples.push(ms);
    if (this.samples.length < 60) return 'ok';
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    this.samples = [];
    if (avg > 24) {
      if (!this.downgraded) {
        this.downgraded = true;
        return 'downgrade';
      }
      return 'abort';
    }
    return 'ok';
  }
}
