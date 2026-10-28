import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { DocsPage, DocsNotFound } from './docs-page';
import { findPage } from './lib/manifest';
const root = document.getElementById('docs-root');
const page = findPage(root?.dataset.slug ?? '');
if (root) hydrateRoot(root, page ? <DocsPage page={page} /> : <DocsNotFound />);
