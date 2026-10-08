import { getCollection, type CollectionEntry } from 'astro:content';
import micromatch from 'micromatch';
import { starlightLllmsTxtContext } from 'virtual:starlight-llms-txt/context';
import { defaultLang, isDefaultLocale } from './utils';

/** Collator to compare two strings in the default language. */
const collator = new Intl.Collator(defaultLang);

export async function getDocsEntries(): Promise<Array<CollectionEntry<'docs'>>> {
	let docs = await getCollection('docs', (doc) => isDefaultLocale(doc) && !doc.data.draft);
	if (starlightLllmsTxtContext.exclude.length > 0) {
		docs = docs.filter((doc) => !micromatch.isMatch(doc.id, starlightLllmsTxtContext.exclude));
	}
	return docs;
}

/** Processes page IDs by prepending underscores to influence the sorting order. */
function prioritizePage(id: string): string {
	const { promote, demote } = starlightLllmsTxtContext;
	// Match the page ID against the patterns listed in the `promote` and `demote`
	// config options and return the index of the first match. If a page matches
	// a `demote` pattern, we don't check `promote` as demotions take precedence.
	const demoted = demote.findIndex((expr) => micromatch.isMatch(id, expr));
	const promoted = demoted > -1 ? -1 : promote.findIndex((expr) => micromatch.isMatch(id, expr));
	// Calculate the number of underscores to prefix the page ID with
	// to influence the sorting order. The more underscores, the earlier
	// the page will appear in the list. The amount of underscores added by
	// a pattern is determined by the respective array length and the match index.
	const prefixLength =
		(promoted > -1 ? promote.length - promoted : 0) + demote.length - demoted - 1;
	return '_'.repeat(prefixLength) + id;
}

/** Sorts docs entries in place by the `promote` and `demote` config options, then by ID. */
export function sortDocsByPriority(
	docs: Array<CollectionEntry<'docs'>>
): Array<CollectionEntry<'docs'>> {
	return docs.sort((a, b) => collator.compare(prioritizePage(a.id), prioritizePage(b.id)));
}
