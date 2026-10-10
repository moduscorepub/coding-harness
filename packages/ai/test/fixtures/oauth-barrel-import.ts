import {
	getOAuthProviders as rootGetOAuthProviders,
	refreshOAuthToken as rootRefreshOAuthToken,
} from "@coding-harness/ai";
import {
	getOAuthProviders as oauthGetOAuthProviders,
	refreshOAuthToken as oauthRefreshOAuthToken,
} from "@coding-harness/ai/registry/oauth";
import "@coding-harness/ai/providers/anthropic";
import "@coding-harness/ai/auth-storage";

const publicExports = [rootGetOAuthProviders, rootRefreshOAuthToken, oauthGetOAuthProviders, oauthRefreshOAuthToken];

if (publicExports.some(value => !value)) {
	throw new Error("OAuth registry exports are unavailable");
}
