import type { Container } from '../../../../container';
import type { GitCache } from '../../../../git/cache';
import { TagError } from '../../../../git/errors';
import type { GitTagsSubProvider, PagedResult, PagingOptions } from '../../../../git/gitProvider';
import { GitTag } from '../../../../git/models/tag';
import { getTagParser } from '../../../../git/parsers/refParser';
import type { TagSortOptions } from '../../../../git/utils/-webview/sorting';
import { sortTags } from '../../../../git/utils/-webview/sorting';
import { filterMap } from '../../../../system/array';
import { log } from '../../../../system/decorators/log';
import { getLogScope } from '../../../../system/logger.scope';
import { maybeStopWatch } from '../../../../system/stopwatch';
import type { Git } from '../git';

const emptyPagedResult: PagedResult<any> = Object.freeze({ values: [] });

export class TagsGitSubProvider implements GitTagsSubProvider {
	constructor(
		private readonly container: Container,
		private readonly git: Git,
		private readonly cache: GitCache,
	) {}

	@log()
	async getTag(repoPath: string, name: string): Promise<GitTag | undefined> {
		const {
			values: [tag],
		} = await this.getTags(repoPath, { filter: t => t.name === name });
		return tag;
	}

	@log({ args: { 1: false } })
	async getTags(
		repoPath: string,
		options?: {
			filter?: (t: GitTag) => boolean;
			paging?: PagingOptions;
			sort?: boolean | TagSortOptions;
		},
	): Promise<PagedResult<GitTag>> {
		if (repoPath == null) return emptyPagedResult;

		const scope = getLogScope();

		let resultsPromise = this.cache.tags?.get(repoPath);
		if (resultsPromise == null) {
			async function load(this: TagsGitSubProvider): Promise<PagedResult<GitTag>> {
				try {
					const parser = getTagParser();

					const data = await this.git.exec(
						{ cwd: repoPath },
						'for-each-ref',
						...parser.arguments,
						'refs/tags/',
					);

					if (!data?.length) return emptyPagedResult;

					using sw = maybeStopWatch(scope, { log: false, logLevel: 'debug' });

					const tags: GitTag[] = [];

					for (const entry of parser.parse(data)) {
						tags.push(
							new GitTag(
								this.container,
								repoPath,
								entry.name,
								entry.sha,
								entry.message,
								entry.date ? new Date(entry.date) : undefined,
								entry.commitDate ? new Date(entry.commitDate) : undefined,
							),
						);
					}

					sw?.stop({ suffix: ` parsed ${tags.length} tags` });

					return { values: tags };
				} catch (_ex) {
					this.cache.tags?.delete(repoPath);

					return emptyPagedResult;
				}
			}

			resultsPromise = load.call(this);

			if (options?.paging?.cursor == null) {
				this.cache.tags?.set(repoPath, resultsPromise);
			}
		}

		let result = await resultsPromise;
		if (options?.filter != null) {
			result = {
				...result,
				values: result.values.filter(options.filter),
			};
		}

		if (options?.sort) {
			sortTags(result.values, typeof options.sort === 'boolean' ? undefined : options.sort);
		}

		return result;
	}

	@log()
	async getTagsWithCommit(
		repoPath: string,
		sha: string,
		options?: { commitDate?: Date; mode?: 'contains' | 'pointsAt' },
	): Promise<string[]> {
		const data = await this.git.branchOrTag__containsOrPointsAt(repoPath, [sha], { type: 'tag', ...options });
		if (!data) return [];

		return filterMap(data.split('\n'), b => b.trim() || undefined);
	}

	@log()
	async createTag(repoPath: string, name: string, sha: string, message?: string): Promise<void> {
		try {
			await this.git.tag(repoPath, name, sha, ...(message != null && message.length > 0 ? ['-m', message] : []));
		} catch (ex) {
			if (ex instanceof TagError) {
				throw ex.withTag(name).withAction('create');
			}

			throw ex;
		}
	}

	@log()
	async deleteTag(repoPath: string, name: string): Promise<void> {
		try {
			await this.git.tag(repoPath, '-d', name);
		} catch (ex) {
			if (ex instanceof TagError) {
				throw ex.withTag(name).withAction('delete');
			}

			throw ex;
		}
	}
}
