import type {
	AnyEntityIdentifierInput,
	EntityIdentifier,
	GitPullRequest,
	GitPullRequestMergeableState,
	GitPullRequestReviewState,
	GitPullRequestState,
} from '@gitkraken/provider-apis';
import { EntityIdentifierProviderType, EntityType, EntityVersion } from '@gitkraken/provider-apis';
import type { IssueOrPullRequest } from '../../../git/models/issue';
import type { PullRequestState } from '../../../git/models/pullRequest';
import {
	PullRequest,
	PullRequestMergeableState,
	PullRequestReviewDecision,
	PullRequestReviewState,
} from '../../../git/models/pullRequest';
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

	let provider = fromStringToEntityIdentifierProviderType(entity.provider.id);
	let domain = undefined;
	if (provider === EntityIdentifierProviderType.Github && !isGitHubDotCom(entity.provider.domain)) {
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
			name: pr.author?.username ?? '',
			avatarUrl: pr.author?.avatarUrl ?? '',
			url: pr.author?.url ?? '',
		},
		pr.id,
		pr.id, // What should be here as nodeId?
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
		pr.mergeableState ? fromGitPullRequestMergeableState(pr.mergeableState) : undefined,
		undefined,
		{
			base: {
				branch: pr.baseRef?.name ?? '',
				sha: pr.baseRef?.oid ?? '',
				repo: pr.repository.name,
				owner: pr.repository.owner.login,
				exists: pr.baseRef != null,
				url: pr.repository.remoteInfo?.cloneUrlHTTPS
					? pr.repository.remoteInfo.cloneUrlHTTPS.replace(/\.git$/, '')
					: '',
			},
			head: {
				branch: pr.headRef?.name ?? '',
				sha: pr.headRef?.oid ?? '',
				repo: pr.headRepository?.name ?? '',
				owner: pr.headRepository?.owner.login ?? '',
				exists: pr.headRef != null,
				url: pr.headRepository?.remoteInfo?.cloneUrlHTTPS
					? pr.headRepository.remoteInfo.cloneUrlHTTPS.replace(/\.git$/, '')
					: '',
			},
			isCrossRepository: pr.headRepository?.id !== pr.repository.id,
		},
		pr.isDraft,
		pr.additions ?? undefined,
		pr.deletions ?? undefined,
		pr.commentCount ?? undefined,
		pr.upvoteCount ?? undefined,
		pr.reviewDecision ? fromGitPullRequestReviewStateToDecision(pr.reviewDecision) : undefined,
		undefined,
		pr.reviews?.map(r => ({
			isCodeOwner:
				r.reviewer.id != null ? r.reviewer.id === pr.author?.id : r.reviewer.username === pr.author?.username,
			reviewer: {
				name: r.reviewer.username ?? '',
				avatarUrl: r.reviewer.avatarUrl ?? undefined,
				url: r.reviewer.url ?? undefined,
			},
			state: r.state ? fromGitPullRequestReviewState(r.state) : PullRequestReviewState.ReviewRequested,
		})),
		pr.assignees?.map(a => ({
			name: a.username ?? '',
			avatarUrl: a.avatarUrl ?? undefined,
			url: a.url ?? undefined,
		})),
		undefined,
	);
}

function fromGitPullRequestState(state: GitPullRequestState): PullRequestState {
	return state === 'OPEN' ? 'opened' : state === 'CLOSED' ? 'closed' : 'merged';
}

function fromGitPullRequestMergeableState(state: GitPullRequestMergeableState): PullRequestMergeableState {
	return state === 'MERGEABLE'
		? PullRequestMergeableState.Mergeable
		: state === 'CONFLICTS'
		  ? PullRequestMergeableState.Conflicting
		  : PullRequestMergeableState.Unknown;
}

function fromGitPullRequestReviewStateToDecision(state: GitPullRequestReviewState): PullRequestReviewDecision {
	return state === 'APPROVED'
		? PullRequestReviewDecision.Approved
		: state === 'CHANGES_REQUESTED'
		  ? PullRequestReviewDecision.ChangesRequested
		  : PullRequestReviewDecision.ReviewRequired;
}

function fromGitPullRequestReviewState(state: GitPullRequestReviewState): PullRequestReviewState {
	return state === 'APPROVED'
		? PullRequestReviewState.Approved
		: state === 'CHANGES_REQUESTED'
		  ? PullRequestReviewState.ChangesRequested
		  : state === 'COMMENTED'
		    ? PullRequestReviewState.Commented
		    : PullRequestReviewState.ReviewRequested;
}

function fromStringToEntityIdentifierProviderType(str: string): EntityIdentifierProviderType {
	switch (str) {
		case 'github':
			return EntityIdentifierProviderType.Github;
		case 'gitlab':
			return EntityIdentifierProviderType.Gitlab;
		default:
			throw new Error(`Unknown provider type '${str}'`);
	}
}
