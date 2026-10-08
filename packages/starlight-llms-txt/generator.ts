import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import micromatch from 'micromatch';
import { starlightLllmsTxtContext } from 'virtual:starlight-llms-txt/context';
import { sortDocsByPriority } from './docsEntries';
import { entryToSimpleMarkdown } from './entryToSimpleMarkdown';
import { isDefaultLocale } from './utils';

/**
 * Generates a single plaintext Markdown document from the full website content.
 */
export async function generateLlmsTxt(
	context: APIContext,
	{
		minify,
		description,
		exclude,
		include,
	}: {
		/** Generate a smaller file to fit within smaller context windows. */
		minify: boolean;
		/** Description of the document being generated. Prepended to output inside `<SYSTEM>` tags. */
		description: string | undefined;
		exclude?: string[] | undefined;
		include?: string[] | undefined;
	}
): Promise<string> {
	let docs = await getCollection('docs', (doc) => isDefaultLocale(doc) && !doc.data.draft);
	if (include) {
		docs = docs.filter((doc) => micromatch.isMatch(doc.id, include));
	}
	if (exclude) {
		docs = docs.filter((doc) => !micromatch.isMatch(doc.id, exclude));
	}
	sortDocsByPriority(docs);
	const { pageSeparator } = starlightLllmsTxtContext;
	const segments: string[] = [];
	for (const doc of docs) {
		const docSegments = [`# ${doc.data.hero?.title || doc.data.title}`];
		const description = doc.data.hero?.tagline || doc.data.description;
		if (description) docSegments.push(`> ${description}`);
		docSegments.push(await entryToSimpleMarkdown(doc, context, minify));
		segments.push(docSegments.join('\n\n'));
	}
	if (description) {
		segments.unshift(`<SYSTEM>${description}</SYSTEM>`);
	}
	return segments.join(pageSeparator);
}
