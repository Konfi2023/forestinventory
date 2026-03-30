/** Lazy-loads opencv.js via <script> tag. Returns the global cv object. */
let loadPromise: Promise<any> | null = null;

export function loadOpenCv(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if ((window as any).cv?.Mat) return Promise.resolve((window as any).cv);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/opencv/opencv.js';
    script.async = true;

    script.onload = () => {
      const cv = (window as any).cv;
      if (cv && cv.Mat) {
        resolve(cv);
      } else if (cv && typeof cv === 'function') {
        // opencv.js Module factory pattern
        cv().then((instance: any) => {
          (window as any).cv = instance;
          resolve(instance);
        });
      } else {
        // Wait for onRuntimeInitialized
        const check = setInterval(() => {
          const c = (window as any).cv;
          if (c?.Mat) { clearInterval(check); resolve(c); }
        }, 100);
        setTimeout(() => { clearInterval(check); reject(new Error('OpenCV timeout')); }, 15000);
      }
    };

    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load opencv.js'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
