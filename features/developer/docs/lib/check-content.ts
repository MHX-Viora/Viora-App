import {pages} from './manifest';
import {validateDocuments} from './content-schema';
import {apiInventory,validateInventory} from '../reference/api-inventory';
validateDocuments(pages); validateInventory(apiInventory);
for (const slug of ['', 'introduction', 'getting-started', 'environment-setup', 'auth-bridge', 'sdk', 'sandbox', 'review', 'publishing', 'api-reference'])
  if (!pages.some(page=>page.slug===slug)) throw Error('Missing page: '+slug);
if (/connect\/authorize|connect\/token|OIDC|OAuth|openid-client|ClientSecretBasic/.test(JSON.stringify(pages))) throw Error('Retired authentication content');
console.log(`Verified ${pages.length} public pages and ${apiInventory.length} public API operations.`);
