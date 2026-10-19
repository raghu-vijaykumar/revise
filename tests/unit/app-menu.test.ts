import { beforeEach, describe, expect, it, vi } from 'vitest';

type Item = { id?: string; label?: string; role?: string; click?: () => void; submenu?: Item[] };
const mocks = vi.hoisted(() => ({
  buildFromTemplate: vi.fn((items: Item[]) => ({ items })),
  setApplicationMenu: vi.fn(),
  showMessageBox: vi.fn(async () => ({ response: 0 })),
  getVersion: vi.fn(() => '0.1.0'),
}));
vi.mock('electron', () => ({
  app: { getVersion: mocks.getVersion },
  dialog: { showMessageBox: mocks.showMessageBox },
  Menu: {
    buildFromTemplate: mocks.buildFromTemplate,
    setApplicationMenu: mocks.setApplicationMenu,
  },
}));

import { installApplicationMenu } from '../../apps/desktop/src/main/appMenu';

beforeEach(() => vi.clearAllMocks());

describe('native application menu', () => {
  it('keeps every command in one menu row and dispatches workspace actions', () => {
    const dispatch = vi.fn();
    installApplicationMenu(dispatch);
    const template = mocks.buildFromTemplate.mock.calls[0]![0];
    expect(template.map((item) => item.label)).toEqual([
      'File',
      'Edit',
      'View',
      'Workspace',
      'Window',
      'Help',
    ]);
    expect(mocks.setApplicationMenu).toHaveBeenCalledOnce();
    const file = template[0]!.submenu!;
    file.find((item) => item.id === 'file.new-section')?.click?.();
    file.find((item) => item.id === 'file.choose-content-folder')?.click?.();
    const workspace = template[3]!.submenu!;
    workspace.find((item) => item.id === 'workspace.new')?.click?.();
    workspace.find((item) => item.id === 'workspace.switch')?.click?.();
    expect(dispatch.mock.calls.map((call) => call[0])).toEqual([
      'new-section',
      'choose-content-folder',
      'new-workspace',
      'switch-workspace',
    ]);
    expect(template[1]!.submenu?.map((item) => item.role).filter(Boolean)).toEqual([
      'undo',
      'redo',
      'cut',
      'copy',
      'paste',
      'selectAll',
    ]);
  });

  it('shows version information through the native Help menu', () => {
    installApplicationMenu(vi.fn());
    mocks.buildFromTemplate.mock.calls[0]![0][5]!.submenu![0]!.click?.();
    expect(mocks.showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'About Revise',
        detail: expect.stringContaining('Version 0.1.0'),
      }),
    );
  });
});
