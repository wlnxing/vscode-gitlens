import url from 'url';
import { browser, expect } from '@wdio/globals';
import { EditorView, sleep, Workbench } from 'wdio-vscode-service';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

describe('VS Code Extension Testing', () => {
	let workbench: Workbench, editorView: EditorView;

	before(async () => {
		workbench = await browser.getWorkbench();
		editorView = workbench.getEditorView();
	});

	it('should be able to load gitlens extension', async () => {
		await browser.waitUntil(
			async () => {
				const currentTab = await editorView.getActiveTab();
				return (await currentTab?.getTitle()) === 'Welcome to GitLens';
			},
			{
				timeout: 4000,
				timeoutMsg: 'Cannot wait for welcome page',
			},
		);
		const currentTab = await editorView.getActiveTab();
		const currentTabTitle = await currentTab?.getTitle();
		expect(currentTabTitle).toBe('Welcome to GitLens');
		await editorView.closeAllEditors();
	});

	it('should be to open commit graph VSCode', async () => {
		await workbench.executeCommand('GitLens: Show Commit graph');

		browser.$('.graph-app__container');
		// TODO: check if element exists with selectors
		// const graphElement = await $('.graph-app__container');
		// await graphElement.waitForExist();
		// await bottomBarElement.waitForDisplayed(graphElement)
		await sleep(1000);
	});
});
