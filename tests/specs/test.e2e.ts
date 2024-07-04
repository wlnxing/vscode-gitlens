import { browser, expect } from '@wdio/globals';
import path from 'path';
import url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

describe('VS Code Extension Testing', () => {
	let workbench: Workbench;

	before(async () => {
		workbench = await browser.getWorkbench();
	});

	it('should be able to load VSCode', async () => {
		const title = await workbench.getTitleBar().getTitle();
		expect(title).toContain('[Extension Development Host]');
		let editorView = await workbench.getEditorView();
		let currentTab = await editorView.getActiveTab();
		expect(await currentTab.getTitle()).toBe('README.md');
	});

	it('should contain GitLens & GitLens Inspect icons in activity bar', async () => {
		let activityBar = await workbench.getActivityBar();
		let viewControls = await activityBar.getViewControls();
		const controls = await Promise.all(viewControls.map(vc => vc.getTitle()));
		expect(controls).toContain('GitLens');
		expect(controls).toContain('GitLens Inspect');
	});

	it('should display GitLens Welcome page after installation', async () => {
		// TODO: Wait for the extension to load, then check if the welcome page opened
	});
});
