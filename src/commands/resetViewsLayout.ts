import type { ViewIds } from '../constants.views';
import { viewIdsByDefaultContainerId } from '../constants.views';
import type { Container } from '../container';
import { command, executeCoreCommand } from '../system/-webview/command';
import { GlCommandBase } from './commandBase';

@command()
export class ResetViewsLayoutCommand extends GlCommandBase {
	constructor(private readonly container: Container) {
		super('gitlens.resetViewsLayout');
	}

	async execute(): Promise<void> {
		// Don't use this because it will forcibly show & expand every view
		// for (const view of viewIds) {
		// 	void (await executeCoreCommand(`gitlens.views.${view}.resetViewLocation`));
		// }

		for (const [containerId, viewIds] of viewIdsByDefaultContainerId) {
			try {
				void (await executeCoreCommand('vscode.moveViews', {
					viewIds: viewIds.map<ViewIds>(v => `gitlens.views.${v}`),
					destinationId: containerId,
				}));
			} catch {}

			if (containerId.includes('gitlens')) {
				void (await executeCoreCommand(`${containerId}.resetViewContainerLocation`));
			}
		}
	}
}
