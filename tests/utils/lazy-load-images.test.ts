import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LazyImageLoader } from '@utils/lazy-load-images';

class TestIntersectionObserver {
  static instance: TestIntersectionObserver;
  callback: IntersectionObserverCallback;
  observed: Element[] = [];
  unobserved: Element[] = [];
  disconnected = false;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    TestIntersectionObserver.instance = this;
  }
  observe(target: Element) {
    this.observed.push(target);
  }

  unobserve(target: Element) {
    this.unobserved.push(target);
  }

  disconnect() {
    this.disconnected = true;
  }

  takeRecords() {
    return [];
  }

  trigger(target: Element) {
    this.callback(
      [{ target, isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
}

function imageWithSource(src: string): HTMLImageElement {
  const image = document.createElement('img');
  image.setAttribute('data-src', src);
  Object.defineProperty(image, 'src', {
    configurable: true,
    get: () => image.getAttribute('src') || '',
    set: value => {
      image.setAttribute('src', value);
      queueMicrotask(() => image.onload?.(new Event('load')));
    },
  });
  return image;
}

describe('LazyImageLoader', () => {
  let loader: LazyImageLoader;
  const originalObserver = window.IntersectionObserver;
  const contentTypeDescriptor = Object.getOwnPropertyDescriptor(document, 'contentType');

  beforeEach(() => {
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: TestIntersectionObserver,
    });
    vi.mocked(chrome.runtime.sendMessage).mockClear();
    loader = new LazyImageLoader();
  });

  afterEach(() => {
    loader.destroy();
    Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: originalObserver });
    document.body.innerHTML = '';
    if (contentTypeDescriptor) {
      Object.defineProperty(document, 'contentType', contentTypeDescriptor);
    } else {
      delete (document as unknown as { contentType?: string }).contentType;
    }
  });

  it('loads text/plain images directly without messaging and cleans up after load', async () => {
    Object.defineProperty(document, 'contentType', { configurable: true, value: 'text/plain' });
    const image = imageWithSource('https://images.example.test/photo.png');
    document.body.append(image);
    loader.applyToContainer(document.body);
    expect(image.hasAttribute('src')).toBe(false);

    TestIntersectionObserver.instance.trigger(image);
    await vi.waitFor(() => expect(image.classList.contains('lazy-loaded')).toBe(true));

    expect(image.src).toBe('https://images.example.test/photo.png');
    expect(image.hasAttribute('data-src')).toBe(false);
    expect(TestIntersectionObserver.instance.unobserved).toContain(image);
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('converts Git blob URLs before direct loading', async () => {
    const image = imageWithSource('https://github.com/user/repo/blob/main/photo.png');
    const completion = loader.loadImageNow(image);
    await completion;
    expect(image.src).toBe('https://raw.githubusercontent.com/user/repo/main/photo.png');
    expect(image.hasAttribute('data-src')).toBe(false);
    expect(image.classList.contains('lazy-loaded')).toBe(true);
  });

  it('settles and cleans up after image errors', async () => {
    const image = document.createElement('img');
    image.setAttribute('data-src', '/missing.png');
    Object.defineProperty(image, 'src', {
      configurable: true,
      set: value => {
        image.setAttribute('src', value);
        queueMicrotask(() => image.onerror?.(new Event('error')));
      },
      get: () => image.getAttribute('src') || '',
    });
    document.body.append(image);
    loader.applyToContainer(document.body);
    TestIntersectionObserver.instance.trigger(image);
    await vi.waitFor(() => expect(image.classList.contains('lazy-loaded')).toBe(true));
    expect(image.hasAttribute('data-src')).toBe(false);
    expect(TestIntersectionObserver.instance.unobserved).toContain(image);
  });

  it('preserves inline data images', () => {
    const image = document.createElement('img');
    image.src = 'data:image/png;base64,AAAA';
    document.body.append(image);
    loader.applyToContainer(document.body);
    expect(image.getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(TestIntersectionObserver.instance.observed).not.toContain(image);
  });

  it('loads images through loadImageNow and loadAll', async () => {
    const direct = imageWithSource('/direct.png');
    const bulk = imageWithSource('/bulk.png');
    document.body.append(direct, bulk);
    loader.applyToContainer(document.body);
    await loader.loadImageNow(direct);
    await loader.loadAll();
    expect(direct.src).toBe('/direct.png');
    expect(bulk.src).toBe('/bulk.png');
    expect(TestIntersectionObserver.instance.unobserved).toContain(direct);
    expect(TestIntersectionObserver.instance.unobserved).toContain(bulk);
  });

  it('loads normally when IntersectionObserver is unavailable', () => {
    delete (window as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
    const noObserverLoader = new LazyImageLoader();
    const image = document.createElement('img');
    image.src = '/already-loaded.png';
    document.body.append(image);
    noObserverLoader.applyToContainer(document.body);
    expect(image.getAttribute('src')).toBe('/already-loaded.png');
    noObserverLoader.destroy();
  });
});
