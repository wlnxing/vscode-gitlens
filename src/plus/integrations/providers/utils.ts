import type {
	AnyEntityIdentifierInput,
	EntityIdentifier,
	GitPullRequest,
	GitPullRequestState,
} from '@gitkraken/provider-apis';
import { EntityIdentifierProviderType, EntityType, EntityVersion } from '@gitkraken/provider-apis';
import type { IssueOrPullRequest } from '../../../git/models/issue';
import type { PullRequestState } from '../../../git/models/pullRequest';
import { PullRequest } from '../../../git/models/pullRequest';
import type { Provider } from '../../../git/models/remoteProvider';
import { equalsIgnoreCase } from '../../../system/string';
import type { FocusItem } from '../../focus/focusProvider';
import type { IntegrationId } from './models';
import { HostingIntegrationId, SelfHostedIntegrationId } from './models';

function isGitHubDotCom(domain: string): boolean {
	return equalsIgnoreCase(domain, 'github.com');
}

function isFocusItem(item: IssueOrPullRequest | FocusItem): item is FocusItem {
	return (item as FocusItem).uuid !== undefined;
}

export function getEntityIdentifierInput(entity: IssueOrPullRequest | FocusItem): AnyEntityIdentifierInput {
	let entityType = EntityType.Issue;
	if (entity.type === 'pullrequest') {
		entityType = EntityType.PullRequest;
	}

	let provider = EntityIdentifierProviderType.Github;
	let domain = undefined;
	if (!isGitHubDotCom(entity.provider.domain)) {
		provider = EntityIdentifierProviderType.GithubEnterprise;
		domain = entity.provider.domain;
	}

	return {
		provider: provider,
		entityType: entityType,
		version: EntityVersion.One,
		domain: domain,
		entityId: isFocusItem(entity) ? entity.graphQLId! : entity.nodeId!,
	};
}

export function getProviderIdFromEntityIdentifier(entityIdentifier: EntityIdentifier): IntegrationId | undefined {
	switch (entityIdentifier.provider) {
		case EntityIdentifierProviderType.Github:
			return HostingIntegrationId.GitHub;
		case EntityIdentifierProviderType.GithubEnterprise:
			return SelfHostedIntegrationId.GitHubEnterprise;
		default:
			return undefined;
	}
}

export function fromGitPullRequest(pr: GitPullRequest, provider: Provider): PullRequest {
	return new PullRequest(
		provider,
		{
			name: pr.author?.name ?? 'Unknown',
			avatarUrl: pr.author?.avatarUrl ?? '',
			url: pr.author?.url ?? '',
		},
		String(pr.number),
		pr.id,
		pr.title,
		pr.url ?? '',
		{
			owner: pr.repository.owner.login,
			repo: pr.repository.name,
		},
		fromGitPullRequestState(pr.state),
		new Date(pr.createdDate),
		new Date(pr.updatedDate),
		pr.closedDate ?? undefined,
		pr.mergedDate ?? undefined,
	);
}

function fromGitPullRequestState(state: GitPullRequestState): PullRequestState {
	return state === 'OPEN' ? 'opened' : state === 'CLOSED' ? 'closed' : 'merged';
}
