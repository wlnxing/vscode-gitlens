import type { Container } from '../../container';
import { formatDate, fromNow } from '../../system/date';
import { memoize } from '../../system/decorators/-webview/memoize';
import { getLoggableName } from '../../system/logger';
import { getTagId } from '../utils/tag.utils';
import type { GitTagReference } from './reference';

export function isTag(tag: unknown): tag is GitTag {
	return tag instanceof GitTag;
}

export class GitTag implements GitTagReference {
	readonly refType = 'tag';
	readonly id: string;

	constructor(
		private readonly container: Container,
		public readonly repoPath: string,
		public readonly name: string,
		public readonly sha: string,
		public readonly message: string,
		public readonly date: Date | undefined,
		public readonly commitDate: Date | undefined,
	) {
		this.id = getTagId(repoPath, name);
	}

	toString(): string {
		return `${getLoggableName(this)}(${this.id})`;
	}

	get formattedDate(): string {
		return this.container.TagDateFormatting.dateStyle === 'absolute'
			? this.formatDate(this.container.TagDateFormatting.dateFormat)
			: this.formatDateFromNow();
	}

	get ref() {
		return this.name;
	}

	@memoize<GitTag['formatCommitDate']>(format => format ?? 'MMMM Do, YYYY h:mma')
	formatCommitDate(format?: string | null) {
		return this.commitDate != null ? formatDate(this.commitDate, format ?? 'MMMM Do, YYYY h:mma') : '';
	}

	formatCommitDateFromNow() {
		return this.commitDate != null ? fromNow(this.commitDate) : '';
	}

	@memoize<GitTag['formatDate']>(format => format ?? 'MMMM Do, YYYY h:mma')
	formatDate(format?: string | null) {
		return this.date != null ? formatDate(this.date, format ?? 'MMMM Do, YYYY h:mma') : '';
	}

	formatDateFromNow() {
		return this.date != null ? fromNow(this.date) : '';
	}

	@memoize()
	getBasename(): string {
		const index = this.name.lastIndexOf('/');
		return index !== -1 ? this.name.substring(index + 1) : this.name;
	}
}
