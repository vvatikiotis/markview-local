/**
 * Component Manager
 * Manages all UI component instances and their lifecycle
 */

import { ActionButtons } from '@components/action-buttons';
import { CenteredToggle } from '@components/centered-toggle';
import { CodeCopy } from '@components/code-copy';
import { RawToggle } from '@components/raw-toggle';
import { ScrollTopButton } from '@components/scroll-top';
import { ThemeToggle } from '@components/theme-toggle';
import { createTocSidebar, TocSidebar } from '@components/toc-sidebar';
import { TocToggleButton } from '@components/toc-toggle';
import { getSettings } from '@core/storage';
import { logger } from '@utils/logger';

/**
 * Component instances container
 */
export interface ComponentInstances {
  tocSidebar: TocSidebar | null;
  tocToggleButton: TocToggleButton | null;
  themeToggle: ThemeToggle | null;
  centeredToggle: CenteredToggle | null;
  rawToggle: RawToggle | null;
  scrollTopButton: ScrollTopButton | null;
  codeCopy: CodeCopy | null;
  actionButtons: ActionButtons | null;
}

/**
 * Create a new component instances container
 */
export function createComponentInstances(): ComponentInstances {
  return {
    tocSidebar: null,
    tocToggleButton: null,
    themeToggle: null,
    centeredToggle: null,
    rawToggle: null,
    scrollTopButton: null,
    codeCopy: null,
    actionButtons: null,
  };
}

/**
 * Initialize all UI components
 */
export async function initializeComponents(components: ComponentInstances): Promise<void> {
  const settings = await getSettings();

  // Initialize all components in parallel for performance
  await Promise.all([
    // Initialize TOC sidebar
    (async () => {
      // Initialize TOC toggle button first (so event listeners are always active)
      components.tocToggleButton = new TocToggleButton(() => {
        if (components.tocSidebar) {
          components.tocSidebar.show();
        } else {
          createTocSidebar({
            position: settings.tocPosition,
            width: settings.tocWidth,
            collapsible: true,
          }).then(toc => {
            components.tocSidebar = toc;
          });
        }
      });

      try {
        components.tocSidebar = await createTocSidebar({
          position: settings.tocPosition,
          width: settings.tocWidth,
          collapsible: true,
        });
        logger.log('MarkView: TOC sidebar initialized');
      } catch (err) {
        logger.error('MarkView: Failed to initialize TOC sidebar', err);
        components.tocToggleButton.show();
      }
    })(),

    // Initialize simple toggle buttons (fast, synchronous)
    Promise.resolve().then(() => {
      components.themeToggle = new ThemeToggle();
      logger.log('MarkView: Theme toggle initialized');

      components.centeredToggle = new CenteredToggle();
      logger.log('MarkView: Centered layout toggle initialized');

      components.scrollTopButton = new ScrollTopButton();
      logger.log('MarkView: Scroll to top button initialized');

      components.actionButtons = new ActionButtons();
      logger.log('MarkView: Action buttons initialized (Print & Settings)');

      components.rawToggle = new RawToggle();
      logger.log('MarkView: Raw view toggle initialized - menu item in action buttons');

      components.codeCopy = new CodeCopy();
      logger.log('MarkView: Code copy buttons initialized');

      logger.log('MarkView: Image viewer initialized (click images to view)');
      logger.log('MarkView: Lazy image loading initialized');
    }),
  ]);

  logger.log('MarkView: All UI components initialized');
}

/**
 * Destroy all components
 */
export function destroyAllComponents(components: ComponentInstances): void {
  if (components.tocSidebar) {
    components.tocSidebar.hide();
    components.tocSidebar.destroy();
    components.tocSidebar = null;
  }
  if (components.tocToggleButton) {
    components.tocToggleButton.destroy();
    components.tocToggleButton = null;
  }
  if (components.themeToggle) {
    components.themeToggle.destroy();
    components.themeToggle = null;
  }
  if (components.centeredToggle) {
    components.centeredToggle.destroy();
    components.centeredToggle = null;
  }
  if (components.rawToggle) {
    components.rawToggle = null;
  }
  if (components.scrollTopButton) {
    components.scrollTopButton.destroy();
    components.scrollTopButton = null;
  }
  if (components.codeCopy) {
    components.codeCopy.destroy();
    components.codeCopy = null;
  }
  if (components.actionButtons) {
    components.actionButtons.destroy();
    components.actionButtons = null;
  }
}
